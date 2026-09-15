import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, ChevronDown, Copy, Download, Eye, FileSpreadsheet, FileText, Pencil, Power, Search, Trash2, UserPlus, UsersRound } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./TimetablePage.css";

const EMPTY = {
  boardId: "",
  academicYearId: "",
  academicLevelId: "",
  groupId: "",
  programId: "",
  sectionId: "",
};
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const WORKING_DAY_OPTIONS = [0, ...DEFAULT_WORKING_DAYS].map((value) => ({
  value,
  shortLabel: DAYS[value].slice(0, 3),
}));
const list = (x) => {
  let value = x;
  // APIs in this module return both { data: [] } and { data: { data: [] } }.
  // Unwrap response envelopes until the collection is reached.
  for (let depth = 0; depth < 4 && value && !Array.isArray(value); depth += 1) {
    if (Array.isArray(value?.$values)) return value.$values;
    const next = value?.data ?? value?.Data ?? value?.items ?? value?.Items ?? value?.result ?? value?.results
      ?? value?.timetableSlots ?? value?.slots ?? value?.generatedSlots
      ?? value?.programs ?? value?.sections;
    if (next === undefined || next === value) break;
    value = next;
  }
  return Array.isArray(value) ? value : (Array.isArray(value?.$values) ? value.$values : []);
};
const pick = (x, ...keys) =>
  keys
    .map((key) => x?.[key])
    .find((value) => value !== undefined && value !== null && value !== "");
const isActiveRecord = (record) => {
  const status = pick(record, "isActive", "IsActive", "active", "Active", "status", "Status");
  if (typeof status === "string") return status.toLowerCase() === "active" || status.toLowerCase() === "true";
  return status !== false && status !== 0;
};
const timetableWorkflowStatus = (source) => {
  const entries = Array.isArray(source) ? source : [source];
  const statuses = entries.map((entry) => String(pick(entry, "status", "Status", "timetableStatus", "TimetableStatus") ?? "").toLowerCase());
  if (entries.some((entry) => pick(entry, "isPublished", "IsPublished") === true) || statuses.some((status) => status === "published")) return "published";
  if (entries.some((entry) => pick(entry, "isApproved", "IsApproved") === true) || statuses.some((status) => status === "approved")) return "approved";
  if (entries.some((entry) => pick(entry, "isValidated", "IsValidated") === true) || statuses.some((status) => status === "validated")) return "validated";
  return "draft";
};
const filePart = (value, fallback) => String(value || fallback).trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || fallback;
const periodTimeRange = (period) => {
  const source = period?.raw ?? period;
  const start = pick(source, "startTime", "StartTime", "periodStartTime", "PeriodStartTime", "fromTime", "FromTime");
  const end = pick(source, "endTime", "EndTime", "periodEndTime", "PeriodEndTime", "toTime", "ToTime");
  return start && end ? `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}` : "";
};
const responseFilename = (response, fallback) => {
  const disposition = String(response?.headers?.["content-disposition"] || "");
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
  try { return decodeURIComponent(encoded || plain || "").trim() || fallback; }
  catch { return (encoded || plain || "").trim() || fallback; }
};
const downloadResponseFile = (response, fallback) => {
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = responseFilename(response, fallback);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
const exportErrorMessage = async (error) => {
  if (error?.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const parsed = JSON.parse(text);
      return parsed?.message || parsed?.detail || parsed?.title || text;
    } catch { /* Fall through to the shared formatter. */ }
  }
  return getApiErrorMessage(error);
};
const optionize = (x, ids, labels) =>
  list(x)
    .map((raw) => ({
      id: String(pick(raw, ...ids) ?? ""),
      name: String(pick(raw, ...labels) ?? ""),
      raw,
    }))
    .filter((item) => item.id && item.name);
const facultyOptionLabel = (entry) => {
  const source = entry?.raw ?? entry;
  const identifier = pick(
    source,
    "staffCode", "StaffCode", "facultyCode", "FacultyCode", "employeeId", "EmployeeId",
    "staffId", "StaffId", "facultyId", "FacultyId", "id", "Id",
  ) ?? entry?.id;
  return identifier ? `${identifier} - ${entry?.name ?? ""}` : (entry?.name ?? "");
};
const studentOptionLabel = (entry) => {
  const admissionNumber = pick(
    entry?.raw ?? entry,
    "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo",
    "admissionId", "AdmissionId",
  );
  return admissionNumber ? `${admissionNumber} - ${entry?.name ?? ""}` : (entry?.name ?? "");
};
const allocateWeeklyPeriods = (subjects, periodsPerDay) => {
  const initialPeriods = Math.max(0, Math.floor(Number(periodsPerDay) || 0));
  return Object.fromEntries(subjects.map((subject) => [subject.id, initialPeriods]));
};
const sectionsForProgramme = (payload, program, groupId, academicLevelId) => {
  if (!program) return [];
  const programId = String(pick(program.raw, "programId", "ProgramId", "id", "Id") ?? "");
  const groupProgramId = String(pick(program.raw, "groupProgramId", "GroupProgramId") ?? "");
  return list(payload).filter((section) => {
    const sectionGroupId = pick(section, "groupId", "GroupId");
    const sectionAcademicLevelId = pick(
      section,
      "academicLevelId", "AcademicLevelId",
      "levelId", "LevelId",
      "yearOfStudyId", "YearOfStudyId",
    );
    const sectionProgramId = String(pick(section, "programId", "ProgramId") ?? "");
    const sectionGroupProgramId = String(pick(section, "groupProgramId", "GroupProgramId") ?? "");
    const groupMatches = sectionGroupId == null || String(sectionGroupId) === String(groupId);
    const academicLevelMatches = sectionAcademicLevelId == null
      || String(sectionAcademicLevelId) === String(academicLevelId);
    const hasProgramMapping = Boolean(sectionProgramId || sectionGroupProgramId);
    const programMatches = !hasProgramMapping
      || (programId && sectionProgramId === programId)
      || (groupProgramId && sectionGroupProgramId === groupProgramId);
    return academicLevelMatches && groupMatches && programMatches;
  });
};
const activeYearId = (payload) => {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.items)
        ? payload.items
        : payload
          ? [payload]
          : [];
  const active = entries.find((entry) => {
    const status = pick(entry, "isActive", "IsActive", "active", "Active", "status", "Status");
    return typeof status === "string" ? status.toLowerCase() === "active" : status !== false;
  });
  return pick(active ?? entries[0], "academicYearId", "yearId", "id", "Id");
};
const valuesOf = (value) =>
  Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
const boardMappedOptions = (options, boards, boardId, idKeys, nameKeys) => {
  if (!boardId) return [];
  const direct = options.filter((option) => String(pick(option.raw, "boardId", "BoardId") ?? "") === String(boardId));
  if (direct.length) return direct;
  const board = boards.find((option) => String(option.id) === String(boardId))?.raw;
  if (!board) return [];
  const ids = idKeys.flatMap((key) => valuesOf(board[key])).map(String).filter(Boolean);
  const names = nameKeys.flatMap((key) => valuesOf(board[key])).map(String).filter(Boolean);
  if (ids.length) {
    const optionsById = new Map(options.map((option) => [String(option.id), option]));
    return ids.map((id, index) => optionsById.get(id) ?? {
      id,
      name: names[index] ?? "",
      raw: board,
    }).filter((option) => option.name);
  }
  const normalizedNames = new Set(names.map((name) => name.toLowerCase()));
  return normalizedNames.size ? options.filter((option) => normalizedNames.has(option.name.toLowerCase())) : [];
};
const structureId = (x) => pick(x, "id", "Id", "periodStructureId");
const timetableId = (x) => pick(x, "id", "Id", "timetableId");
const slotSubjectName = (slot, subjects) =>
  pick(slot, "subjectName", "SubjectName")
  ?? pick(slot?.subject, "subjectName", "SubjectName", "name", "Name")
  ?? subjects.find((subject) => String(subject.id) === String(pick(slot, "subjectId", "SubjectId")))?.name
  ?? "Untitled subject";
const slotFacultyName = (slot) => pick(slot, "facultyName", "FacultyName", "staffName", "StaffName") ?? pick(slot?.faculty, "facultyName", "FacultyName", "staffName", "StaffName", "fullName", "FullName", "name", "Name") ?? "Unassigned";
const slotRoomName = (slot) => pick(slot, "roomName", "RoomName", "roomCode", "RoomCode") ?? pick(slot?.room, "roomName", "RoomName", "roomCode", "RoomCode", "name", "Name") ?? "—";
const isBreakPeriod = (period) => {
  const raw = period?.raw ?? period;
  const isBreak = pick(raw, "isBreak", "IsBreak", "isBreakPeriod", "IsBreakPeriod");
  const type = String(pick(raw, "periodType", "PeriodType", "type", "Type", "slotType", "SlotType") ?? "").toLowerCase();
  const name = String(pick(raw, "periodName", "name", "Name") ?? period?.name ?? "").toLowerCase();
  return isBreak === true || isBreak === "true" || type.includes("break") || /(break|lunch|interval)/.test(name);
};
const newestSection = (sections) =>
  [...sections].sort((left, right) => {
    const createdKeys = ["createdAt", "CreatedAt", "createdOn", "CreatedOn", "createdDate", "CreatedDate"];
    const rightCreated = Date.parse(pick(right.raw, ...createdKeys) ?? "") || 0;
    const leftCreated = Date.parse(pick(left.raw, ...createdKeys) ?? "") || 0;
    if (rightCreated !== leftCreated) return rightCreated - leftCreated;
    return Number(right.id) - Number(left.id);
  })[0];
const toBreakDefinitions = (items) => {
  let precedingPeriod = 0;
  return list(items)
    .sort((left, right) => Number(pick(left, "sequenceOrder") ?? 0) - Number(pick(right, "sequenceOrder") ?? 0))
    .flatMap((entry) => {
      const breakTypeId = pick(entry, "breakTypeId");
      const periodNumber = Number(pick(entry, "periodNumber") ?? 0);
      if (!breakTypeId && periodNumber > 0) precedingPeriod = periodNumber;
      if (breakTypeId === undefined || breakTypeId === null) return [];
      const afterPeriod = Number(pick(entry, "afterPeriod") ?? precedingPeriod);
      const durationMinutes = Number(pick(entry, "durationMinutes"));
      if (!afterPeriod || !durationMinutes) return [];
      return [{
        breakTypeId: Number(breakTypeId),
        afterPeriod,
        durationMinutes,
        customName: pick(entry, "name", "breakTypeName") ?? null,
      }];
    });
};
function Page({ title, subtitle, action, children }) {
  return (
    <DashboardLayout
      title={title}
      subtitle={subtitle}
      breadcrumb={["Operations", "TimeTable"]}
      actions={action}
    >
      <main className="ttm-page">{children}</main>
    </DashboardLayout>
  );
}
function Btn({ children, className = "cms-btn cms-btn-primary", ...props }) {
  return (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  );
}
function Field({ label, children }) {
  return (
    <label className="ttm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Modal({ title, onClose, children, className = "" }) {
  return (
    <div className="ttm-overlay">
      <section className={`ttm-modal ${className}`.trim()}>
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function ConfirmDelete({ name, busy, error, onCancel, onConfirm }) {
  return (
    <Modal title="Delete Period Structure?" onClose={busy ? () => {} : onCancel}>
      <div className="ttm-modal-body">
        <p>
          Are you sure you want to delete {name ? `“${name}”` : "this period structure"}? This
          action cannot be undone.
        </p>
        {error && <p className="ttm-validation-error">{error}</p>}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Btn>
          <Btn disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : "Delete"}
          </Btn>
        </footer>
      </div>
    </Modal>
  );
}

function useLookups(initial = {}) {
  const [value, setValue] = useState({ ...EMPTY, ...initial });
  const [sectionsReloadKey, setSectionsReloadKey] = useState(0);
  const [data, setData] = useState({
    boards: [],
    years: [],
    allYears: [],
    levels: [],
    allLevels: [],
    groups: [],
    programs: [],
    programsLoading: false,
    sections: [],
    sectionsLoading: false,
    sectionsError: false,
    subjects: [],
    periods: [],
    rooms: [],
  });
  useEffect(() => {
    Promise.allSettled([
      apiClient.get(apiEndpoints.boards.getAll, { params: { Status: true } }),
      apiClient.get(apiEndpoints.academicYears.getAll, { params: { Status: true } }),
      apiClient.get(apiEndpoints.boards.academicLevels),
      apiClient.get(apiEndpoints.rooms.getAll),
    ]).then((r) =>
      setData((current) => ({
        ...current,
        boards:
          r[0].status === "fulfilled"
            ? optionize(r[0].value.data, ["boardId", "id", "Id"], ["boardName", "name", "Name"]).filter((board) => isActiveRecord(board.raw))
            : [],
        years:
          r[1].status === "fulfilled"
            ? optionize(
                r[1].value.data,
                ["academicYearId", "id", "Id"],
                ["academicYearName", "yearName", "name", "Name"],
              ).filter((year) => isActiveRecord(year.raw))
            : [],
        allYears:
          r[1].status === "fulfilled"
            ? optionize(
                r[1].value.data,
                ["academicYearId", "id", "Id"],
                ["academicYearName", "yearName", "name", "Name"],
              ).filter((year) => isActiveRecord(year.raw))
            : [],
        levels:
          r[2].status === "fulfilled"
            ? optionize(
                r[2].value.data,
                ["academicLevelId", "levelId", "id", "Id"],
                ["academicLevelName", "levelName", "name", "Name"],
              )
            : [],
        allLevels:
          r[2].status === "fulfilled"
            ? optionize(
                r[2].value.data,
                ["academicLevelId", "levelId", "id", "Id"],
                ["academicLevelName", "levelName", "name", "Name"],
              )
            : [],
        rooms:
          r[3].status === "fulfilled"
            ? optionize(
                r[3].value.data,
                ["roomId", "id", "Id"],
                ["roomName", "name", "Name", "roomCode"],
              )
            : [],
      })),
    );
  }, []);
  useEffect(() => {
    if (!value.boardId) return undefined;
    let cancelled = false;
    apiClient
      .get(apiEndpoints.academicYears.active, { params: { boardId: value.boardId } })
      .then((response) => {
        const yearId = activeYearId(response.data);
        if (!cancelled) {
          const mappedYears = uniqueAcademicYearsByName(boardMappedOptions(
            data.allYears,
            data.boards,
            value.boardId,
            ["academicYearIds", "AcademicYearIds", "yearIds", "YearIds"],
            ["academicYearNames", "AcademicYearNames", "yearNames", "YearNames"],
          ), (item) => item.name);
          const selectedYear = yearId ? String(yearId) : mappedYears[0]?.id;
          setValue((current) =>
            // A generated draft is opened with its full context. Do not
            // replace that context while the lookup data is refreshing,
            // otherwise the Draft screen is left with only the board value
            // and appears to return to the setup screen.
            current.boardId === value.boardId && !current.academicYearId && selectedYear
              ? { ...current, academicYearId: selectedYear, academicLevelId: "", groupId: "", programId: "", sectionId: "" }
              : current,
          );
        }
      })
      .catch(() => {
        const mappedYears = uniqueAcademicYearsByName(boardMappedOptions(
          data.allYears,
          data.boards,
          value.boardId,
          ["academicYearIds", "AcademicYearIds", "yearIds", "YearIds"],
          ["academicYearNames", "AcademicYearNames", "yearNames", "YearNames"],
        ), (item) => item.name);
        if (!cancelled && mappedYears[0]?.id) {
          setValue((current) =>
            current.boardId === value.boardId && !current.academicYearId
              ? { ...current, academicYearId: mappedYears[0].id, academicLevelId: "", groupId: "", programId: "", sectionId: "" }
              : current,
          );
        }
      });
    return () => { cancelled = true; };
  }, [value.boardId, data.allYears, data.boards]);
  useEffect(() => {
    if (!value.boardId) return;
    Promise.allSettled([
      apiClient.get(apiEndpoints.groups.list, {
        params: {
          boardId: value.boardId,
          isActive: true,
        },
      }),
      apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId: value.boardId } }),
    ])
      .then(([groupsResult, levelsResult]) =>
        setData((current) => ({
          ...current,
          years: uniqueAcademicYearsByName(boardMappedOptions(
            current.allYears,
            current.boards,
            value.boardId,
            ["academicYearIds", "AcademicYearIds", "yearIds", "YearIds"],
            ["academicYearNames", "AcademicYearNames", "yearNames", "YearNames"],
          ), (item) => item.name),
          levels:
            levelsResult.status === "fulfilled"
              ? optionize(
                  levelsResult.value.data,
                  ["academicLevelId", "levelId", "id", "Id"],
                  ["academicLevelName", "levelName", "name", "Name"],
                )
              : boardMappedOptions(
                  current.allLevels,
                  current.boards,
                  value.boardId,
                  ["academicLevelIds", "AcademicLevelIds", "levelIds", "LevelIds"],
                  ["academicLevelNames", "AcademicLevelNames", "levelNames", "LevelNames"],
                ),
          groups: groupsResult.status === "fulfilled"
            ? optionize(groupsResult.value.data, ["groupId", "id", "Id"], ["groupName", "name", "Name"])
            : [],
        })),
      )
      .catch(() => setData((current) => ({ ...current, groups: [], levels: [] })));
  }, [
    value.boardId,
    data.allYears,
    data.allLevels,
    data.boards,
  ]);
  useEffect(() => {
    if (!value.groupId) {
      setData((current) => ({ ...current, programs: [], programsLoading: false }));
      return undefined;
    }
    let cancelled = false;
    setData((current) => ({ ...current, programs: [], programsLoading: true }));
    apiClient
      .get(apiEndpoints.groups.programs(value.groupId))
      .then((response) => {
        if (cancelled) return;
        setData((current) => ({
          ...current,
          programs: optionize(
            response.data,
            ["programId", "ProgramId", "id", "Id", "groupProgramId", "GroupProgramId"],
            ["programName", "programme", "program", "name", "Name"],
          ),
          programsLoading: false,
        }));
      })
      .catch(() => {
        if (!cancelled) setData((current) => ({ ...current, programs: [], programsLoading: false }));
      });
    return () => { cancelled = true; };
  }, [value.groupId]);
  useEffect(() => {
    if (!value.groupId) return;
    const selectedProgram = data.programs.find((program) => String(program.id) === String(value.programId));
    setData((current) => ({
      ...current,
      sections: value.programId ? current.sections : [],
      sectionsLoading: Boolean(value.programId),
      sectionsError: false,
    }));
    Promise.allSettled([
      value.programId && selectedProgram
        ? apiClient.get(apiEndpoints.sections.search, {
            params: {
              AcademicLevelId: Number(value.academicLevelId),
              GroupId: Number(value.groupId),
              ProgramId: pick(selectedProgram?.raw, "programId", "ProgramId", "id", "Id"),
              IsActive: true,
            },
          })
        : Promise.resolve({ data: [] }),
      apiClient.get(apiEndpoints.subjects.context, {
        params: {
          boardId: value.boardId,
          groupId: value.groupId,
          academicLevelId: value.academicLevelId,
        },
      }),
      apiClient.get(apiEndpoints.periods.getAll, {
        params: {
          boardId: value.boardId,
          academicYearId: value.academicYearId,
          academicLevelId: value.academicLevelId,
          groupId: value.groupId,
        },
      }),
    ]).then((r) =>
      setData((current) => ({
        ...current,
        sections:
          r[0].status === "fulfilled"
            ? optionize(sectionsForProgramme(r[0].value.data, selectedProgram, value.groupId, value.academicLevelId), ["sectionId", "id", "Id"], ["sectionName", "name", "Name"])
            : [],
        sectionsLoading: false,
        sectionsError: Boolean(value.programId) && r[0].status === "rejected",
        subjects:
          r[1].status === "fulfilled"
            ? optionize(
                r[1].value.data,
                ["subjectId", "SubjectId", "subjectID", "SubjectID", "subjectDefinitionId", "SubjectDefinitionId", "id", "Id"],
                ["subjectName", "SubjectName", "name", "Name"],
              ).filter((year) => isActiveRecord(year.raw))
            : [],
        periods:
          r[2].status === "fulfilled"
            ? optionize(r[2].value.data, ["periodId", "id", "Id"], ["periodName", "name", "Name"])
            : [],
      })),
    );
  }, [value.boardId, value.academicYearId, value.academicLevelId, value.groupId, value.programId, data.programs, sectionsReloadKey]);
  const change = (key) => (event) =>
    setValue((current) => {
      const next = event.target.value;
      if (key === "boardId") {
        setData((currentData) => ({
          ...currentData,
          years: [],
          levels: [],
          groups: [],
          programs: [],
          sections: [],
          subjects: [],
          periods: [],
          sectionsLoading: false,
          sectionsError: false,
        }));
        return { ...EMPTY, boardId: next };
      }
      if (key === "academicYearId")
        {
          setData((currentData) => ({ ...currentData, programs: [], sections: [], subjects: [], periods: [], sectionsLoading: false, sectionsError: false }));
          return {
          ...current,
          academicYearId: next,
          academicLevelId: "",
          groupId: "",
          programId: "",
          sectionId: "",
          };
        }
      if (key === "academicLevelId") {
        setData((currentData) => ({ ...currentData, programs: [], sections: [], subjects: [], periods: [], sectionsLoading: false, sectionsError: false }));
        return { ...current, academicLevelId: next, groupId: "", programId: "", sectionId: "" };
      }
      if (key === "groupId") {
        setData((currentData) => ({ ...currentData, programs: [], sections: [], sectionsLoading: false, sectionsError: false }));
        return { ...current, groupId: next, programId: "", sectionId: "" };
      }
      if (key === "programId") {
        setData((data) => ({ ...data, sections: [], sectionsLoading: Boolean(next), sectionsError: false }));
        return { ...current, programId: next, sectionId: "" };
      }
      return { ...current, [key]: next };
    });
  const reloadSections = () => {
    if (value.programId) setSectionsReloadKey((key) => key + 1);
  };
  return { value, data, change, setValue, reloadSections };
}
function Context({ state, section = true, compact = false, hideGlobalContext = false }) {
  const { value, data, change } = state;
  const select = (label, key, values, disabled, emptyLabel = `Select ${label}`) => (
    <Field label={label}>
      <select value={value[key]} onChange={change(key)} disabled={disabled}>
        <option value="">{emptyLabel}</option>
        {values.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <div className={`ttm-context${compact ? " ttm-draft-context" : ""}${hideGlobalContext ? " ttm-global-context" : ""}`}>
      {!hideGlobalContext && select("Board", "boardId", data.boards)}
      {!hideGlobalContext && select("Academic Year", "academicYearId", data.years, !value.boardId)}
      {select("Academic Level", "academicLevelId", data.levels, !value.academicYearId)}
      {select("Group", "groupId", data.groups, !value.academicLevelId)}
      {select(
        "Program",
        "programId",
        data.programs,
        !value.groupId || data.programsLoading,
        data.programsLoading ? "Loading programs..." : value.groupId && !data.programs.length ? "No programs available for this group" : undefined,
      )}
      {section && select("Section", "sectionId", data.sections, !value.programId)}
    </div>
  );
}
function ProgrammeSections({ data, onRetry }) {
  return (
    <section className="ttm-programme-sections" aria-live="polite">
      <header>
        <b>Sections for this Academic Level</b>
        <span>Sections are automatically loaded for the selected group and program.</span>
      </header>
      {data.sectionsLoading ? <p>Loading sections...</p> : null}
      {data.sectionsError ? (
        <div className="ttm-sections-error">
          <p className="ttm-validation-error">Unable to load sections. Please try again.</p>
          <Btn className="cms-btn cms-btn-ghost" onClick={onRetry}>Retry sections</Btn>
        </div>
      ) : null}
      {!data.sectionsLoading && !data.sectionsError && !data.sections.length ? <p>No sections found for the selected group and program.</p> : null}
      {!data.sectionsLoading && data.sections.length ? (
        <div className="ttm-section-chips">
          {data.sections.map((section) => <span key={section.id}>{section.name}</span>)}
        </div>
      ) : null}
    </section>
  );
}

function StructureForm({ item, close, saved }) {
  const [form, setForm] = useState({
    name: pick(item, "name") ?? "",
    dayStartTime: pick(item, "dayStartTime") ?? "",
    periodDurationMinutes: pick(item, "periodDurationMinutes") ?? "",
    totalTeachingPeriods: pick(item, "totalTeachingPeriods") ?? "",
    isActive: pick(item, "isActive") ?? true,
    breaks: [],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [breakTypes, setBreakTypes] = useState([]);
  const [previewRequested, setPreviewRequested] = useState(Boolean(structureId(item)));
  useEffect(() => {
    apiClient
      .get(apiEndpoints.breakTypes.list)
      .then((response) => setBreakTypes(optionize(response.data, ["id", "breakTypeId", "Id"], ["name", "breakTypeName", "Name"])))
      .catch((requestError) => setError(getApiErrorMessage(requestError)));
    if (!structureId(item)) return;
    apiClient
      .get(apiEndpoints.periodStructures.getById(structureId(item)))
      .then((response) => {
        const detail = response.data;
        const breaks = toBreakDefinitions(detail?.items).map((entry) => ({
          ...entry,
          breakTypeId: String(entry.breakTypeId),
          afterPeriod: String(entry.afterPeriod),
          durationMinutes: String(entry.durationMinutes),
        }));
        setForm((current) => ({ ...current, breaks }));
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError)));
  }, [item]);
  const validationMessage = useCallback(() => {
    if (!form.name.trim()) return "Structure Name is required.";
    if (!/^\d{2}:\d{2}/.test(form.dayStartTime)) return "Day Start Time is required.";
    const periods = Number(form.totalTeachingPeriods), duration = Number(form.periodDurationMinutes);
    if (!Number.isInteger(periods) || periods < 1 || periods > 15) return "Teaching Periods must be between 1 and 15.";
    if (!Number.isFinite(duration) || duration < 20 || duration > 120) return "Period Duration must be between 20 and 120 minutes.";
    const positions = new Set();
    for (const entry of form.breaks) {
      if (!entry.breakTypeId || !entry.afterPeriod || !entry.durationMinutes) return "Complete every break configuration row.";
      const after = Number(entry.afterPeriod), breakDuration = Number(entry.durationMinutes);
      if (!Number.isInteger(after) || after < 1 || after >= periods) return "A break must be after a valid teaching period, before the final period.";
      if (!Number.isFinite(breakDuration) || breakDuration <= 0) return "Break duration must be greater than zero.";
      if (positions.has(after)) return "Only one break can be configured after each period.";
      positions.add(after);
    }
    return "";
  }, [form]);
  const preview = useMemo(() => {
    if (validationMessage()) return [];
    const [hour, minute] = form.dayStartTime.slice(0, 5).split(":").map(Number);
    let cursor = hour * 60 + minute;
    const format = (total) => {
      const normalized = ((total % 1440) + 1440) % 1440, h = Math.floor(normalized / 60), m = normalized % 60;
      const suffix = h >= 12 ? "PM" : "AM", displayHour = h % 12 || 12;
      return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
    };
    const breaksByPeriod = new Map(form.breaks.map((entry) => [Number(entry.afterPeriod), entry]));
    return Array.from({ length: Number(form.totalTeachingPeriods) }, (_, index) => {
      const period = index + 1, start = cursor; cursor += Number(form.periodDurationMinutes);
      const rows = [{ kind: "period", label: `P${period}`, start: format(start), end: format(cursor) }];
      const breakItem = breaksByPeriod.get(period);
      if (breakItem) { const breakStart = cursor; cursor += Number(breakItem.durationMinutes); rows.push({ kind: "break", label: breakTypes.find((type) => String(type.id) === String(breakItem.breakTypeId))?.name || "Break", start: format(breakStart), end: format(cursor) }); }
      return rows;
    }).flat();
  }, [form, breakTypes, validationMessage]);
  const save = async () => {
    if (saving) return;
    const message = validationMessage();
    if (message) { setError(message); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        dayStartTime: /^\d{2}:\d{2}$/.test(form.dayStartTime)
          ? `${form.dayStartTime}:00`
          : form.dayStartTime,
        periodDurationMinutes: Number(form.periodDurationMinutes),
        totalTeachingPeriods: Number(form.totalTeachingPeriods),
        breaks: form.breaks.map((breakItem) => ({
          breakTypeId: Number(breakItem.breakTypeId),
          afterPeriod: Number(breakItem.afterPeriod),
          durationMinutes: Number(breakItem.durationMinutes),
          customName: breakItem.customName || null,
        })),
      };
      const response = structureId(item)
        ? await apiClient.put(apiEndpoints.periodStructures.update(structureId(item)), payload)
        : await apiClient.post(apiEndpoints.periodStructures.create, payload);
      saved(response.data?.data ?? response.data ?? item);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const set = (key) => (e) => { setPreviewRequested(false); setForm((x) => ({ ...x, [key]: e.target.value })); };
  const updateBreak = (index, key, next) => { setPreviewRequested(false); setForm((current) => ({ ...current, breaks: current.breaks.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: next } : entry) })); };
  return (
    <Modal
      title={structureId(item) ? "Edit Period Structure" : "Create Period Structure"}
      onClose={close}
    >
      <div className="ttm-modal-body">
        <div className="ttm-period-structure-main-fields">
          <Field label="Structure Name">
            <input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Day Start Time">
            <input type="time" value={form.dayStartTime} onChange={set("dayStartTime")} />
          </Field>
          <Field label="Teaching Periods">
            <input
              type="number"
              min="1"
              max="15"
              value={form.totalTeachingPeriods}
              onChange={set("totalTeachingPeriods")}
            />
          </Field>
          <Field label="Period Duration (minutes)">
            <input
              type="number"
              min="20"
              max="120"
              value={form.periodDurationMinutes}
              onChange={set("periodDurationMinutes")}
            />
          </Field>
        </div>
        <div className="ttm-break-head">
          <b>Break Configuration</b>
          <Btn
            className="cms-btn cms-btn-ghost"
            disabled={!breakTypes.length}
            onClick={() =>
              setForm((current) => ({
                ...current,
                breaks: [
                  ...current.breaks,
                  { breakTypeId: String(breakTypes[0]?.id ?? ""), afterPeriod: "", durationMinutes: "", customName: "" },
                ],
              }))
            }
          >
            + Add Break
          </Btn>
        </div>
        {form.breaks.map((breakItem, index) => (
          <div className="ttm-break-row" key={`${breakItem.breakTypeId}-${index}`}>
            <select
              value={breakItem.breakTypeId}
              onChange={(event) => updateBreak(index, "breakTypeId", event.target.value)}
            >
              <option value="">Select break type</option>
              {breakTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            <select
              value={breakItem.afterPeriod}
              onChange={(event) => updateBreak(index, "afterPeriod", event.target.value)}
            >
              <option value="">After period</option>
              {Array.from({ length: Math.max((Number(form.totalTeachingPeriods) || 0) - 1, 0) }, (_, number) => (
                <option key={number + 1} value={number + 1}>After P{number + 1}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              aria-label="Break duration in minutes"
              placeholder="Minutes"
              value={breakItem.durationMinutes}
              onChange={(event) => updateBreak(index, "durationMinutes", event.target.value)}
            />
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({ ...current, breaks: current.breaks.filter((_, entryIndex) => entryIndex !== index) }))
              }
            >
              Delete
            </button>
          </div>
        ))}
        <Btn className="cms-btn cms-btn-ghost ttm-preview-button" onClick={() => { const message = validationMessage(); setError(message); setPreviewRequested(!message); }}>Generate Preview</Btn>
        {previewRequested && preview.length ? <section className="ttm-structure-preview"><h3>Generated Period Structure</h3>{preview.map((entry, index) => <div key={`${entry.label}-${index}`} className={entry.kind === "break" ? "break" : ""}><b>{entry.label}</b><span>{entry.start} - {entry.end}</span></div>)}</section> : null}
        {error && <p className="ttm-validation-error">{error}</p>}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>
            Cancel
          </Btn>
          <Btn
            disabled={
              saving ||
              !form.name ||
              !form.dayStartTime ||
              !form.periodDurationMinutes ||
              !form.totalTeachingPeriods
            }
            onClick={save}
          >
            {saving ? "Saving…" : "Save Structure"}
          </Btn>
        </footer>
      </div>
    </Modal>
  );
}

function StructurePreview({ item, close, notify }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const loadPreview = async () => {
      try {
        const detail = await apiClient.get(apiEndpoints.periodStructures.getById(structureId(item)));
        const breaks = toBreakDefinitions(detail.data?.items);
        const response = await apiClient.post(apiEndpoints.periodStructures.preview, {
          dayStartTime: pick(item, "dayStartTime"),
          periodDurationMinutes: Number(pick(item, "periodDurationMinutes")),
          totalTeachingPeriods: Number(pick(item, "totalTeachingPeriods")),
          breaks,
        });
        setPreview(response.data);
      } catch (requestError) {
        const message = getApiErrorMessage(requestError);
        setError(message);
        notify(message);
      }
    };
    loadPreview();
  }, [item, notify]);
  return (
    <Modal title={`Preview: ${pick(item, "name")}`} onClose={close}>
      <div className="ttm-modal-body">
        {error ? <p className="ttm-validation-error">{error}</p> : null}
        {!preview && !error ? <p>Loading preview…</p> : null}
        {preview?.timeline?.length ? (
          <div className="ttm-period-list">
            {preview.timeline.map((slot) => (
              <div className={slot.isBreak ? "break" : ""} key={slot.sequenceOrder}>
                <b>{slot.slotName ?? `Period ${slot.periodNumber}`}</b>
                <span>{slot.startTime} – {slot.endTime}</span>
              </div>
            ))}
          </div>
        ) : null}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" onClick={close}>Close</Btn>
        </footer>
      </div>
    </Modal>
  );
}

function AssignStructureForm({ item, close, assigned, notify, initial }) {
  const state = useLookups(initial);
  const { value, data, change } = state;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ready = value.boardId && value.academicYearId && value.academicLevelId && value.groupId;
  const assign = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError("");
    try {
      await apiClient.post(apiEndpoints.periodStructures.assign(structureId(item)), {
        periodStructureId: Number(structureId(item)),
        boardId: Number(value.boardId),
        academicYearId: Number(value.academicYearId),
        academicLevelId: Number(value.academicLevelId),
        groupId: Number(value.groupId),
        isActive: true,
      });
      assigned(value);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      notify(message);
    } finally {
      setSaving(false);
    }
  };
  const select = (label, key, values, disabled) => (
    <Field label={label}>
      <select value={value[key]} onChange={change(key)} disabled={disabled}>
        <option value="">Select {label}</option>
        {values.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </select>
    </Field>
  );
  return (
    <Modal title="Assign Structure to Group" onClose={saving ? () => {} : close}>
      <div className="ttm-modal-body">
        <div className="ttm-form-grid">
          {select("Academic Level", "academicLevelId", data.levels, !value.academicYearId)}
          {select("Group", "groupId", data.groups, !value.academicLevelId)}
        </div>
        <Field label="Period Structure">
          <input value={pick(item, "name") ?? ""} readOnly />
        </Field>
        {error ? <p className="ttm-validation-error">{error}</p> : null}
        <footer>
          <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>Cancel</Btn>
          <Btn disabled={!ready || saving} onClick={assign}>
            {saving ? "Assigning…" : "Assign & Continue"}
          </Btn>
        </footer>
      </div>
    </Modal>
  );
}
function Structures({ notify, initial }) {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [item, setItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState("");
  const navigate = useNavigate();
  const load = useCallback(
    () =>
      apiClient
        .get(apiEndpoints.periodStructures.list)
        .then((r) => setItems(list(r.data)))
        .catch((e) => notify(getApiErrorMessage(e))),
    [notify],
  );
  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);
  const remove = async () => {
    if (deleting || !item) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiClient.delete(apiEndpoints.periodStructures.delete(structureId(item)));
      setModal(null);
      notify("Period structure deleted.");
      load();
    } catch (e) {
      setDeleteError(getApiErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Page
  title="Period Structures"
  subtitle="Manage reusable schedules for groups."
>
  <div className="ttm-period-structure-toolbar">
    <Link
      className="ttm-back-link"
      to="/dashboard/timetable"
      state={{ timetableContext: initial }}
    >
      <ArrowLeft size={15} />
      Back to Timetable
    </Link>

    <Btn onClick={() => { setItem(null); setModal("form"); }}>
      + Create Structure
    </Btn>
  </div>

  <section className="ttm-card">
        {loading ? (
          <p className="ttm-empty">Loading period structures…</p>
        ) : !items.length ? (
          <p className="ttm-empty">No period structures are available.</p>
        ) : (
          <table className="ttm-period-structures-table" aria-label="Period Structures">
            <colgroup>
              <col className="ttm-structure-name-column" />
              <col className="ttm-periods-column" />
              <col className="ttm-duration-column" />
              <col className="ttm-status-column" />
              <col className="ttm-actions-column" />
            </colgroup>
            <thead><tr>
              <th>Structure Name</th><th>Periods</th><th>Duration</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>{items.map((row) => (
              <tr key={structureId(row)}>
                <td><b>{pick(row, "name")}</b></td>
                <td>{pick(row, "totalTeachingPeriods")}</td>
                <td>{pick(row, "periodDurationMinutes")} min</td>
                <td className="ttm-status-cell">
                  <span className="ttm-badge">{pick(row, "isActive") ? "Active" : "Inactive"}</span>
                </td>
                <td className="ttm-actions-cell">
                  <div className="ttm-actions">
                    <button
                      className="ttm-action-edit"
                      aria-label="Edit"
                      title="Edit"
                      onClick={() => {
                        setItem(row);
                        setModal("form");
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button className="ttm-action-preview" aria-label="Preview" title="Preview" onClick={() => { setItem(row); setModal("preview"); }}><Eye size={16} aria-hidden="true" /></button>
                    <button className="ttm-action-assign" aria-label="Assign" title="Assign" onClick={() => { setItem(row); setModal("assign"); }}><UserPlus size={16} aria-hidden="true" /></button>
                    <button
                      className={pick(row, "isActive") ? "ttm-action-deactivate" : "ttm-action-activate"}
                      aria-label={pick(row, "isActive") ? "Deactivate" : "Activate"}
                      title={pick(row, "isActive") ? "Deactivate" : "Activate"}
                      onClick={async () => {
                        try {
                          const detail = await apiClient.get(apiEndpoints.periodStructures.getById(structureId(row)));
                          const breaks = toBreakDefinitions(detail.data?.items);
                          await apiClient.put(apiEndpoints.periodStructures.update(structureId(row)), {
                            name: pick(row, "name"),
                            dayStartTime: pick(row, "dayStartTime"),
                            periodDurationMinutes: Number(pick(row, "periodDurationMinutes")),
                            totalTeachingPeriods: Number(pick(row, "totalTeachingPeriods")),
                            breaks,
                            isActive: !pick(row, "isActive"),
                          });
                          notify(`Period structure ${pick(row, "isActive") ? "deactivated" : "activated"}.`);
                          load();
                        } catch (requestError) {
                          notify(getApiErrorMessage(requestError));
                        }
                      }}
                    >
                      <Power size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="ttm-action-delete"
                      aria-label="Delete"
                      title="Delete"
                      onClick={() => {
                        setItem(row);
                        setDeleteError("");
                        setModal("delete");
                      }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                    </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {modal === "form" && (
        <StructureForm
          item={item}
          close={() => setModal(null)}
          saved={(savedStructure) => {
            const isNewStructure = !structureId(item);
            load();
            if (isNewStructure && structureId(savedStructure)) {
              setItem(savedStructure);
              setModal("assign");
              notify("Period structure saved. Assign it to continue.");
              return;
            }
            setModal(null);
            notify("Period structure saved.");
          }}
        />
      )}
      {modal === "preview" && <StructurePreview item={item} close={() => setModal(null)} notify={notify} />}
      {modal === "assign" && (
        <AssignStructureForm
          item={item}
          close={() => setModal(null)}
          notify={notify}
          initial={initial}
          assigned={(context) => {
            setModal(null);
            notify("Period structure assigned.");
            navigate("/dashboard/timetable/generate", {
              state: { timetableContext: { ...context, periodStructureId: structureId(item) } },
            });
          }}
        />
      )}
      {modal === "delete" && (
        <ConfirmDelete
          name={pick(item, "name")}
          busy={deleting}
          error={deleteError}
          onCancel={() => setModal(null)}
          onConfirm={remove}
        />
      )}
    </Page>
  );
}

function Generate({ goDraft, notify, initial }) {
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const state = useLookups({
    ...initial,
    boardId: selectedBoardId || initial?.boardId || "",
    academicYearId: selectedAcademicYearId || initial?.academicYearId || "",
  });
  const { value, data } = state;
  const [requirements, setRequirements] = useState({});
  const [workingDays, setWorkingDays] = useState(() =>
    (initial?.workingDays?.length ? initial.workingDays : DEFAULT_WORKING_DAYS).map(Number),
  );
  const [capacityError, setCapacityError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(initial?.sectionId ?? "");
  const [inputErrors, setInputErrors] = useState({});
  const allocationContextRef = useRef("");
  const allocationStateRef = useRef("");
  const manuallyEditedRef = useRef(false);
  // The periods endpoint can include break slots. Capacity is based on actual
  // teaching periods, not every timeline entry returned by the API.
  const periodsPerDay = data.periods.filter((period) => !isBreakPeriod(period)).length;
  const weeklyCapacity = periodsPerDay * workingDays.length;
  const totalRequiredPeriods = Object.values(requirements).reduce(
    (total, weeklyPeriods) => total + (Number(weeklyPeriods) || 0),
    0,
  );
  const selectedSection = data.sections.find((section) => String(section.id) === String(selectedSectionId)) ?? data.sections[0];
  const remainingCapacity = weeklyCapacity - totalRequiredPeriods;
  const allocationContext = [value.boardId, value.academicYearId, value.academicLevelId, value.groupId, value.programId].join(":");
  const allocationState = `${allocationContext}:${periodsPerDay}:${data.subjects.map((subject) => subject.id).join(",")}`;
  const ready =
    value.boardId &&
    value.academicYearId &&
    value.academicLevelId &&
    value.groupId &&
    value.programId &&
    data.sections.length &&
    !data.sectionsLoading &&
    workingDays.length;
  const toggleWorkingDay = (day) => {
    setWorkingDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b),
    );
    setCapacityError("");
  };
  useEffect(() => {
    setSelectedSectionId((current) =>
      data.sections.some((section) => String(section.id) === String(current))
        ? current
        : (data.sections[0]?.id ?? ""),
    );
  }, [data.sections]);
  useEffect(() => {
    const contextChanged = allocationContextRef.current !== allocationContext;
    if (contextChanged) {
      allocationContextRef.current = allocationContext;
      manuallyEditedRef.current = false;
      setInputErrors({});
    }
    if (!data.subjects.length || (!contextChanged && (manuallyEditedRef.current || allocationStateRef.current === allocationState))) return;
    setRequirements(allocateWeeklyPeriods(data.subjects, periodsPerDay));
    allocationStateRef.current = allocationState;
    setCapacityError("");
  }, [allocationContext, allocationState, data.subjects, periodsPerDay]);
  const updateRequirement = (subjectId, rawValue) => {
    const text = String(rawValue ?? "");
    if (text !== "" && !/^\d+$/.test(text)) {
      setInputErrors((current) => ({ ...current, [subjectId]: "Enter a whole number." }));
      return;
    }
    const value = text === "" ? 0 : Number(text);
    if (!Number.isInteger(value) || value < 0 || value > weeklyCapacity) {
      setInputErrors((current) => ({ ...current, [subjectId]: `Enter a whole number from 0 to ${weeklyCapacity}.` }));
      return;
    }
    manuallyEditedRef.current = true;
    setInputErrors((current) => {
      const { [subjectId]: _error, ...rest } = current;
      return rest;
    });
    setRequirements((current) => ({ ...current, [subjectId]: value }));
    setCapacityError("");
  };
  const resetRequirements = () => {
    manuallyEditedRef.current = false;
    setRequirements(allocateWeeklyPeriods(data.subjects, periodsPerDay));
    allocationStateRef.current = allocationState;
    setWorkingDays(DEFAULT_WORKING_DAYS.map(Number));
    setCapacityError("");
    setInputErrors({});
  };
  const generate = async () => {
    if (busy) return;
    const selectedProgram = data.programs.find((program) => String(program.id) === String(value.programId));
    const programId = Number(pick(selectedProgram?.raw, "programId", "ProgramId", "id", "Id"));
    const sectionIds = data.sections
      .map((section) => Number(pick(section.raw, "sectionId", "SectionId", "id", "Id", section.id)))
      .filter((sectionId) => Number.isInteger(sectionId) && sectionId > 0);
    if (!Number.isInteger(programId) || programId <= 0) {
      notify("Please select a valid program.");
      return;
    }
    if (!sectionIds.length) {
      notify("No sections found for the selected group and program. Create sections in Section Management first.");
      return;
    }
    if (totalRequiredPeriods > weeklyCapacity) {
      setCapacityError(`Allocated subject periods exceed weekly capacity by ${totalRequiredPeriods - weeklyCapacity} periods.`);
      return;
    }
    const invalidSubject = data.subjects.find((subject) => {
      const value = Number(requirements[subject.id]);
      return !Number.isInteger(value) || value < 0 || value > weeklyCapacity;
    });
    if (invalidSubject) {
      setCapacityError("Weekly Periods must be whole numbers from 0 to the weekly capacity.");
      return;
    }
    try {
      setBusy(true);
      const subjectRequirements = data.subjects
        .map((subject) => ({
          subjectId: Number(subject.id),
          weeklyPeriods: Number(requirements[subject.id] || 0),
        }))
        .filter((entry) => entry.weeklyPeriods > 0);
      if (!subjectRequirements.length) {
        notify("Enter at least one subject weekly-period requirement before generating the timetable.");
        return;
      }
      const response = await apiClient.post(
        apiEndpoints.timetable.generate,
        {
          boardId: Number(value.boardId),
          academicYearId: Number(value.academicYearId),
          academicLevelId: Number(value.academicLevelId),
          groupId: Number(value.groupId),
          programId,
          p_ProgramId: programId,
          sectionIds,
          workingDays,
          subjectRequirements,
        },
        {
          // The live endpoint reports this exact parameter name. Include it
          // in the query collection as well as the JSON command body.
          params: { p_ProgramId: programId },
        },
      );
      const result = response.data?.data ?? response.data ?? {};
      const generatedSlots = list(result.generatedSlots);
      if (result.isSuccess === false || Number(result.totalSlotsGenerated ?? generatedSlots.length) <= 0) {
        notify(result.message ?? "The timetable generator did not create any slots. Check the subject requirements and faculty assignments, then try again.");
        return;
      }
      notify(result.message ?? "Timetable generated.");
      // Draft chooses the newest section returned by the existing Section
      // API, while the generator still receives every programme section.
      goDraft({ ...value, sectionId: "", workingDays, generatedSlots });
    } catch (e) {
      const message = `${getApiErrorMessage(e)} ${e?.response?.data?.details ?? ""}`;
      notify(
        /SaveChanges|saving the entity changes|database|duplicate|constraint/i.test(message)
          ? "The timetable could not be saved because generated data already exists or conflicts with a database rule. Refresh the Draft screen and avoid generating the same timetable again."
          : /LINQ|StaffSubjectAllocation|allocation/i.test(message)
          ? "Timetable generation could not resolve staff-subject allocations. Allocate faculty to the requested subjects, then try again."
          : message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title="Generate Timetable"
      subtitle="Generate a conflict-free theory timetable in DRAFT state."
      action={<div className="ttm-page-actions"><Link className="cms-btn cms-btn-ghost" to="/dashboard/timetable/setup" state={{ timetableContext: value }}>Create Period Structure</Link></div>}
    >
      <section className="ttm-card">
        <Context state={state} section={false} hideGlobalContext />
        {value.programId ? (
          <div className="ttm-generation-content">
            <section className="ttm-generate-overview">
              <div className="ttm-generate-working-days" aria-labelledby="working-days-label">
                <b id="working-days-label">Working Days</b>
                <div className="ttm-day-toggles">
                  {WORKING_DAY_OPTIONS.map((day) => (
                    <button type="button" key={day.value} className={workingDays.includes(day.value) ? "active" : ""} aria-pressed={workingDays.includes(day.value)} onClick={() => toggleWorkingDay(day.value)}>
                      {day.shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ttm-generate-sections">
                <b>Sections ({data.sections.length})</b>
                {data.sectionsLoading ? <span className="ttm-generate-state">Loading sections…</span> : data.sectionsError ? <button type="button" className="cms-btn cms-btn-ghost" onClick={state.reloadSections}>Retry sections</button> : <div className="ttm-generate-section-chips">
                  {data.sections.map((section) => <button type="button" key={section.id} className={String(section.id) === String(selectedSection?.id) ? "active" : ""} aria-pressed={String(section.id) === String(selectedSection?.id)} onClick={() => setSelectedSectionId(section.id)}>{section.name}</button>)}
                </div>}
              </div>
              <aside className={`ttm-generate-capacity${remainingCapacity < 0 ? " is-exceeded" : ""}`} aria-label="Weekly period capacity">
                <b>Weekly Period Capacity</b>
                <span>Allocated Periods <strong>{totalRequiredPeriods} / {weeklyCapacity}</strong></span>
                <span>{remainingCapacity < 0 ? "Exceeded By" : "Periods Remaining"} <strong>{Math.abs(remainingCapacity)}</strong></span>
                <small>{periodsPerDay} teaching periods × {workingDays.length} working days</small>
              </aside>
            </section>
            <section className="ttm-generate-subjects">
              <div className="ttm-generate-subject-table-wrap">
                <table className="ttm-generate-subject-table">
                  <thead><tr><th>#</th><th>Subject Code</th><th>Subject Name</th><th>Type</th><th>Weekly Periods</th></tr></thead>
                  <tbody>{data.subjects.length ? data.subjects.map((subject, index) => {
                    const type = pick(subject.raw, "subjectType", "SubjectType", "type", "Type") ?? "Subject";
                    const code = pick(subject.raw, "subjectCode", "SubjectCode", "code", "Code") ?? "—";
                    return <tr key={subject.id}><td>{index + 1}</td><td>{code}</td><td>{subject.name}</td><td><span className={`ttm-subject-type ${String(type).toLowerCase().replace(/[^a-z]+/g, "-")}`}>{type}</span></td><td><input type="number" min="0" max={weeklyCapacity} step="1" value={requirements[subject.id] ?? 0} onChange={(event) => updateRequirement(subject.id, event.target.value)} aria-invalid={Boolean(inputErrors[subject.id])} aria-label={`${subject.name} weekly periods`} />{inputErrors[subject.id] ? <small className="ttm-weekly-period-error">{inputErrors[subject.id]}</small> : null}</td></tr>;
                  }) : <tr><td colSpan="5" className="ttm-generate-no-subjects">No subjects are available for this timetable context.</td></tr>}</tbody>
                </table>
              </div>
            </section>
            {capacityError ? <p className="ttm-validation-error ttm-capacity-error">{capacityError}</p> : null}
          </div>
        ) : null}
        <footer className={`ttm-screen-actions${value.programId ? " ttm-generation-footer" : ""}`}>
          {value.programId ? <button type="button" className="cms-btn cms-btn-ghost" onClick={resetRequirements}>Reset</button> : null}
          <Btn disabled={!ready || busy} onClick={generate}>
            {busy ? "Generating…" : "Generate Timetable"}
          </Btn>
        </footer>
      </section>
    </Page>
  );
}

function SlotEditor({ context, data, slot, workingDays, close, saved, notify, lab = false }) {
  const [form, setForm] = useState({
    dayOfWeek: String(pick(slot, "dayOfWeek", "DayOfWeek") ?? ""),
    periodId: String(pick(slot, "periodId", "PeriodId") ?? ""),
    subjectId: String(pick(slot, "subjectId", "SubjectId") ?? ""),
    facultyId: String(pick(slot, "facultyId", "FacultyId") ?? ""),
    roomId: String(pick(slot, "roomId", "RoomId") ?? ""),
    remarks: pick(slot, "remarks", "Remarks") ?? "",
  });
  const [faculty, setFaculty] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!form.subjectId) return;
    apiClient
      .get(apiEndpoints.timetable.getAllocatedFaculties, {
        params: { ...context, subjectId: form.subjectId },
      })
      .then((r) =>
        setFaculty(
          optionize(r.data, ["facultyId", "FacultyId", "staffId", "StaffId", "id", "Id"], ["facultyName", "FacultyName", "staffName", "StaffName", "name", "Name"])
            .filter((entry) => isActiveRecord(entry.raw)),
        ),
      )
      .catch((e) => notify(getApiErrorMessage(e)));
  }, [context, form.subjectId, notify]);
  const set = (key) => (e) => setForm((x) => ({ ...x, [key]: e.target.value }));
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(Object.entries(context).map(([key, val]) => [key, Number(val)])),
        ...Object.fromEntries(
          Object.entries(form).map(([key, val]) => [
            key === "remarks" ? key : key,
            key === "remarks" ? val : Number(val),
          ]),
        ),
        isPublished: Boolean(pick(slot, "isPublished") ?? false),
      };
      timetableId(slot)
        ? await apiClient.put(apiEndpoints.timetable.update(timetableId(slot)), payload)
        : await apiClient.post(apiEndpoints.timetable.create, payload);
      saved("Timetable slot saved.");
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const deleteSlot = async () => {
    const id = timetableId(slot);
    if (!id || saving || !window.confirm("Delete this timetable slot?")) return;
    setSaving(true);
    try {
      await apiClient.delete(apiEndpoints.timetable.delete(id));
      saved("Timetable slot deleted.");
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const toggleSlotPublish = async () => {
    const id = timetableId(slot);
    if (!id || saving) return;
    const nextPublished = !pick(slot, "isPublished", "IsPublished");
    setSaving(true);
    try {
      await apiClient.patch(apiEndpoints.timetable.publish(id), { isPublished: nextPublished });
      saved(`Timetable slot ${nextPublished ? "published" : "unpublished"}.`);
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const select = (label, key, values, optionLabel = (entry) => entry.name ?? entry.label) => (
    <Field label={label}>
      <select value={form[key]} onChange={set(key)}>
        <option value="">Select {label}</option>
        {values.map((entry) => (
          <option key={entry.id ?? entry.value} value={entry.id ?? entry.value}>
            {optionLabel(entry)}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <Modal title={lab ? "Add Lab / Practical" : timetableId(slot) ? "Edit Timetable Slot" : "Add Timetable Slot"} className="ttm-slot-editor-modal" onClose={close}>
      <div className="ttm-modal-body">
        <div className="ttm-form-grid">
          {select(
            "Day",
            "dayOfWeek",
            workingDays.map((day) => ({ id: day, name: DAYS[day] })),
          )}
          {select("Period", "periodId", data.periods.filter((period) => !isBreakPeriod(period)))}
          {select("Subject", "subjectId", data.subjects)}
          {select("Staff", "facultyId", faculty, facultyOptionLabel)}
          {select("Room", "roomId", data.rooms)}
          <Field label="Remarks">
            <input value={form.remarks} onChange={set("remarks")} />
          </Field>
        </div>
        <footer>
          {timetableId(slot) ? <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={deleteSlot}>Delete</Btn> : null}
          {timetableId(slot) ? (
            <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={toggleSlotPublish}>
              {pick(slot, "isPublished", "IsPublished") ? "Unpublish Slot" : "Publish Slot"}
            </Btn>
          ) : null}
          <Btn className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>
            Cancel
          </Btn>
          <Btn disabled={saving} onClick={save}>{saving ? "Saving…" : lab ? "Add Lab" : "Save Slot"}</Btn>
        </footer>
      </div>
    </Modal>
  );
}
function SubstitutionPreview({ context, close, notify }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sectionId = Number(context.sectionId);
  const academicYearId = Number(context.academicYearId);

  useEffect(() => {
    if (!sectionId || !academicYearId) {
      setRows([]);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setRows([]);
    setLoading(true);
    setError("");
    const params = { date, sectionId, academicYearId };
    Promise.all([
      apiClient.get(apiEndpoints.timetable.substitutions, { params }),
      apiClient.get(apiEndpoints.timetable.effective, { params }),
    ]).then(([substitutionsResponse, effectiveResponse]) => {
      if (cancelled) return;
      const effectiveByTimetableId = new Map(
        list(effectiveResponse.data).map((slot) => [String(pick(slot, "timetableId", "TimetableId")), slot]),
      );
      setRows(list(substitutionsResponse.data).map((substitution) => {
        const effective = effectiveByTimetableId.get(String(pick(substitution, "timetableId", "TimetableId")));
        const substituteName = effective && pick(effective, "isSubstituted", "IsSubstituted")
          ? pick(effective, "effectiveStaffName", "EffectiveStaffName")
          : pick(substitution, "substituteStaffName", "SubstituteStaffName");
        return {
          id: pick(substitution, "substitutionId", "SubstitutionId", "id", "Id"),
          period: pick(substitution, "periodName", "PeriodName") || `Period ${pick(substitution, "periodNumber", "PeriodNumber") || ""}`,
          time: [pick(substitution, "startTime", "StartTime"), pick(substitution, "endTime", "EndTime")]
            .filter(Boolean)
            .map((time) => String(time).slice(0, 5))
            .join(" - "),
          subject: pick(substitution, "subjectName", "SubjectName"),
          className: pick(substitution, "programName", "ProgramName", "groupName", "GroupName") || "—",
          section: pick(substitution, "sectionName", "SectionName") || "—",
          originalFaculty: pick(effective, "originalStaffName", "OriginalStaffName")
            || pick(substitution, "originalStaffName", "OriginalStaffName"),
          substituteFaculty: substituteName || "Not Assigned",
          assigned: Boolean(substituteName),
        };
      }));
    }).catch((requestError) => {
      if (cancelled) return;
      const message = getApiErrorMessage(requestError);
      setRows([]);
      setError(message);
      notify(message);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [academicYearId, date, notify, sectionId]);

  return (
    <Modal title="Faculty Leave / Substitution Preview" className="ttm-substitution-modal" onClose={close}>
      <div className="ttm-modal-body">
        <div className="ttm-substitution-toolbar">
          <Field label="Date">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
        {loading ? <p className="ttm-empty">Loading faculty substitutions...</p> : null}
        {!loading && error ? <p className="ttm-validation-error">{error}</p> : null}
        {!loading && !error && !rows.length ? <p className="ttm-empty">No faculty substitutions for this date.</p> : null}
        {!loading && !error && rows.length ? (
          <div className="ttm-substitution-table-wrap">
            <table className="ttm-substitution-table">
              <thead><tr><th>Period</th><th>Time</th><th>Subject</th><th>Class / Section</th><th>Original Faculty</th><th>Substitute Faculty</th><th>Status</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.period}</td><td>{row.time || "—"}</td><td>{row.subject || "—"}</td>
                  <td>{row.className} - {row.section}</td><td>{row.originalFaculty || "—"}</td>
                  <td>{row.substituteFaculty}</td>
                  <td><span className={`ttm-substitution-status${row.assigned ? " assigned" : ""}`}>{row.assigned ? "Substitute Assigned" : "Pending Substitute"}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : null}
        <footer><Btn className="cms-btn cms-btn-ghost" onClick={close}>Close</Btn></footer>
      </div>
    </Modal>
  );
}
function Draft({ initial, notify }) {
  const state = useLookups(initial);
  const { value, data, setValue } = state;
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [publishedSlotDetails, setPublishedSlotDetails] = useState(null);
  const [substitutionPreviewOpen, setSubstitutionPreviewOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyTarget, setCopyTarget] = useState({ academicYearId: "", sectionId: "" });
  const [actionBusy, setActionBusy] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [exportBusy, setExportBusy] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const [workflowStatus, setWorkflowStatus] = useState(() => timetableWorkflowStatus(initial));
  const firstSection = useRef(true);
  const [validation, setValidation] = useState(null);
  const [validationOpen, setValidationOpen] = useState(false);
  const [studentChoices, setStudentChoices] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [staffChoices, setStaffChoices] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [publishedFilter, setPublishedFilter] = useState(
    initial?.isPublished === undefined ? "" : String(Boolean(initial.isPublished)),
  );
  const workingDays = (initial?.workingDays?.length ? initial.workingDays : DEFAULT_WORKING_DAYS)
    .map(Number)
    .filter((day) => WORKING_DAY_OPTIONS.some((option) => option.value === day));
  const generatedSlots = useMemo(() => list(initial?.generatedSlots), [initial?.generatedSlots]);
  useEffect(() => {
    const closeWhenOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) setExportOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  useEffect(() => {
    if (!value.programId || !data.sections.length) return;
    if (value.sectionId) return;
    const defaultSection = newestSection(data.sections);
    if (!defaultSection) return;
    setValue((current) =>
      current.programId === value.programId
        ? { ...current, sectionId: defaultSection.id }
        : current,
    );
  }, [data.sections, setValue, value.programId, value.sectionId]);
  const load = useCallback(async () => {
    if (!value.sectionId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const r = await apiClient.get(apiEndpoints.timetable.getBySection(value.sectionId), {
        params: {
          academicYearId: value.academicYearId,
          ...(publishedFilter === "true" || publishedFilter === "false" ? { isPublished: publishedFilter } : {}),
        },
      });
      const fetchedSlots = list(r.data);
      const responseSlots = generatedSlots.filter(
        (slot) => String(pick(slot, "sectionId", "SectionId")) === String(value.sectionId),
      );
      const currentSlots = fetchedSlots.length ? fetchedSlots : responseSlots;
      setSlots(currentSlots);
      setWorkflowStatus(timetableWorkflowStatus(currentSlots.length ? currentSlots : initial));
    } catch (e) {
      setSlots([]);
      notify(getApiErrorMessage(e));
    } finally {
      setSlotsLoading(false);
    }
  }, [generatedSlots, initial, notify, publishedFilter, value.academicYearId, value.sectionId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (firstSection.current) {
      firstSection.current = false;
      return;
    }
    setValidation(null);
  }, [value.sectionId]);
  const published = workflowStatus === "published";
  const approved = workflowStatus === "approved";
  useEffect(() => {
    if (!publishedSlotDetails) return undefined;
    const closeOnOutsideClick = (event) => {
      if (event.target.closest(".ttm-published-slot-details, .ttm-published-slot")) return;
      setPublishedSlotDetails(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setPublishedSlotDetails(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [publishedSlotDetails]);
  useEffect(() => {
    setPublishedSlotDetails(null);
  }, [published, publishedFilter, value.sectionId]);
  useEffect(() => {
    if (!published || !value.sectionId) {
      setStudentChoices([]);
      setStaffChoices([]);
      setSelectedStudentId("");
      setStudentSearch("");
      setSelectedStaffId("");
      return undefined;
    }
    let cancelled = false;
    Promise.allSettled([
      apiClient.get(apiEndpoints.faculty.getAll, {
        params: { StaffType: "Teaching", Status: "Active", PageSize: 100 },
      }),
      apiClient.get(apiEndpoints.students.getBySection(value.sectionId)),
    ]).then(([staffResult, studentsResult]) => {
      if (cancelled) return;
      setStaffChoices(staffResult.status === "fulfilled"
        ? optionize(
            staffResult.value.data,
            ["facultyId", "FacultyId", "staffId", "StaffId", "id", "Id"],
            ["facultyName", "FacultyName", "staffName", "StaffName", "fullName", "FullName", "name", "Name"],
          ).filter((entry) => isActiveRecord(entry.raw))
        : []);
      setStudentChoices(studentsResult.status === "fulfilled"
        ? optionize(
            studentsResult.value.data,
            ["studentId", "StudentId", "id", "Id"],
            ["studentName", "StudentName", "fullName", "FullName", "name", "Name"],
          )
        : []);
      setSelectedStudentId("");
      setStudentSearch("");
      setSelectedStaffId("");
    });
    return () => { cancelled = true; };
  }, [published, value.sectionId]);
  const find = (day, periodId) =>
    slots.find(
      (slot) =>
        (String(pick(slot, "dayOfWeek", "DayOfWeek", "dayNumber", "DayNumber")) === String(day)
          || String(pick(slot, "day", "Day")).toLowerCase() === String(DAYS[day]).toLowerCase()) &&
        String(pick(slot, "periodId", "PeriodId", "periodNumber", "PeriodNumber")) === String(periodId),
    );
  const openPublishedSlotDetails = (event, slot, period, dayOfWeek, interaction = "click") => {
    const currentId = `${timetableId(slot) ?? "slot"}:${dayOfWeek}:${period.id}`;
    if (interaction === "click" && publishedSlotDetails?.id === currentId && publishedSlotDetails.pinned) {
      setPublishedSlotDetails(null);
      return;
    }
    if (interaction === "hover" && publishedSlotDetails?.id === currentId && publishedSlotDetails.pinned) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = 190;
    const height = 88;
    const left = bounds.right + width + 8 <= window.innerWidth
      ? bounds.right + 8
      : Math.max(8, bounds.left - width - 8);
    const top = Math.max(8, Math.min(bounds.top, window.innerHeight - height - 8));
    setPublishedSlotDetails({ id: currentId, slot, style: { left, top }, pinned: interaction === "click" });
  };
  const openSlotEditor = async (slot, pendingSlot) => {
    if (!slot) {
      if (!pendingSlot || actionBusy) return;
      // Reuse the existing SlotEditor in create mode, prefilled with the
      // empty grid cell's day and teaching period.
      setEditing(pendingSlot);
      return;
    }
    const id = timetableId(slot);
    if (!id || actionBusy) return;
    setActionBusy(true);
    setActiveAction("slot");
    try {
      const response = await apiClient.get(apiEndpoints.timetable.getById(id));
      setEditing(response.data?.data ?? response.data ?? slot);
    } catch (error) {
      notify(getApiErrorMessage(error));
    } finally {
      setActionBusy(false);
      setActiveAction("");
    }
  };
  const action = async (path, method = "post", body) => {
    if (actionBusy) return;
    const actionName = path.includes("validate") ? "validate" : path.includes("approve") ? "approve" : path.includes("publish") ? "publish" : "action";
    setActiveAction(actionName);
    setActionBusy(true);
    try {
      const requestConfig = {
        url: path,
        method,
        params: { academicYearId: Number(value.academicYearId) },
      };
      if (body !== undefined) requestConfig.data = body;
      else requestConfig.headers = { "Content-Type": undefined };
      const r = await apiClient.request(requestConfig);
      if (method === "post" && path.includes("validate")) {
        setValidation(r.data);
        setValidationOpen(true);
      }
      else notify(r.data?.message ?? "Timetable updated.");
      // Publishing changes which server-side status collection owns the
      // slots. The successful publish handler switches the status filter,
      // and that filter change performs the correctly scoped reload.
      // Approval is confirmed locally before the section endpoint has
      // necessarily reflected its new status. Avoid replacing that confirmed
      // state with a stale draft response, which would disable Publish again.
      if (actionName !== "publish" && actionName !== "approve") load();
      return true;
    } catch (e) {
      notify(getApiErrorMessage(e));
      return false;
    } finally {
      setActionBusy(false);
      setActiveAction("");
    }
  };
  const copyTimetable = async () => {
    if (actionBusy) return;
    if (!copyTarget.academicYearId || !copyTarget.sectionId) {
      notify("Select a target academic year and section.");
      return;
    }
    if (String(copyTarget.academicYearId) === String(value.academicYearId) && String(copyTarget.sectionId) === String(value.sectionId)) {
      const sectionName = data.sections.find((section) => String(section.id) === String(value.sectionId))?.name || "this section";
      notify(`This timetable has already been copied for ${sectionName}. Select a different target section or academic year.`);
      return;
    }
    setActionBusy(true);
    setActiveAction("copy");
    try {
      await apiClient.post(apiEndpoints.timetable.copy, {
        sourceAcademicYearId: Number(value.academicYearId),
        sourceSectionId: Number(value.sectionId),
        targetAcademicYearId: Number(copyTarget.academicYearId),
        targetSectionId: Number(copyTarget.sectionId),
      });
      setCopying(false);
      notify("Timetable copied successfully.");
      load();
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setActionBusy(false);
      setActiveAction("");
    }
  };
  const viewPublished = async (kind, selectedId = "") => {
    if (actionBusy || !selectedId) return;
    setActionBusy(true);
    setActiveAction(kind);
    try {
      const endpoint = kind === "student"
        ? apiEndpoints.timetable.getByStudent(selectedId)
        : apiEndpoints.timetable.getByFaculty(selectedId);
      const params = kind === "student"
        ? { academicYearId: value.academicYearId }
        : { academicYearId: value.academicYearId };
      const response = await apiClient.get(endpoint, { params });
      const viewed = list(response.data);
      if (viewed.length) {
        setSlots(viewed);
        notify(`${kind === "student" ? "Student" : "Faculty"} timetable loaded.`);
      } else {
        setSlots([]);
        notify("No timetable periods found.");
      }
    } catch (e) {
      notify(getApiErrorMessage(e));
    } finally {
      setActionBusy(false);
    }
  };
  const contextName = (items, id, fallback) => items.find((item) => String(item.id) === String(id))?.name || fallback;
  const validId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;
  const exportSectionPdf = async () => {
    if (exportBusy) return;
    if (![value.boardId, value.academicYearId, value.academicLevelId, value.groupId, value.programId, value.sectionId].every(validId)) {
      notify("Please select Board, Academic Year, Academic Level, Group, Program and Section before exporting.");
      return;
    }
    setExportBusy("section");
    try {
      const response = await apiClient.get(apiEndpoints.timetable.exportSectionPdf, {
        params: {
          boardId: Number(value.boardId),
          academicLevelId: Number(value.academicLevelId),
          academicYearId: Number(value.academicYearId),
          groupId: Number(value.groupId),
          programId: Number(value.programId),
          sectionId: Number(value.sectionId),
          "api-version": 1,
        },
        responseType: "blob",
      });
      const sectionName = contextName(data.sections, value.sectionId, "Section");
      const academicYear = contextName(data.years, value.academicYearId, "Academic_Year");
      downloadResponseFile(response, `Section_Timetable_${filePart(sectionName, "Section")}_${filePart(academicYear, "Academic_Year")}.pdf`);
      notify("Section timetable PDF downloaded.");
    } catch (error) { notify(await exportErrorMessage(error)); }
    finally { setExportBusy(""); }
  };
  const exportGroupExcel = async () => {
    if (exportBusy) return;
    if (![value.boardId, value.academicLevelId, value.academicYearId, value.groupId].every(validId)) {
      notify("Please select Board, Academic Level, Academic Year and Group before exporting.");
      return;
    }
    setExportBusy("group");
    try {
      const response = await apiClient.get(apiEndpoints.timetable.exportGroupExcel, {
        params: {
          boardId: Number(value.boardId),
          academicLevelId: Number(value.academicLevelId),
          academicYearId: Number(value.academicYearId),
          groupId: Number(value.groupId),
          "api-version": "1.0",
        },
        responseType: "blob",
      });
      const groupName = contextName(data.groups, value.groupId, "Group");
      const academicYear = contextName(data.years, value.academicYearId, "Academic_Year");
      downloadResponseFile(response, `Timetable_${filePart(groupName, "Group")}_${filePart(academicYear, "Academic_Year")}.xlsx`);
      notify("Group timetable exported successfully.");
    } catch (error) {
      notify(error?.response?.status === 404
        ? "No timetable found for the selected group."
        : await exportErrorMessage(error));
    } finally {
      setExportBusy("");
    }
  };
  return (
    <Page
      title="Generated Draft Grid"
      subtitle="Review, validate, approve and publish the section timetable."
    >
      <Link className="cms-back-link" to="/dashboard/timetable">
        <ArrowLeft size={15} /> Back to Timetable
      </Link>
      <section className="ttm-card">
        <Context state={state} compact hideGlobalContext />
        {value.sectionId && (
          <>
            <div className="ttm-grid-head">
              <div className="ttm-grid-title">
                <div className="ttm-toolbar-heading">
                  <i><CalendarDays size={20} aria-hidden="true" /></i>
                  <div>
                    <b>Section timetable</b>
                    <span>View the published timetable for the selected section.</span>
                  </div>
                </div>
                <Btn className="cms-btn cms-btn-ghost ttm-substitution-trigger" onClick={() => setSubstitutionPreviewOpen(true)}>
                  <UsersRound size={17} aria-hidden="true" /> Faculty Leave / Substitutions
                </Btn>
              </div>
              <div className="ttm-grid-workflow">
                <div className="ttm-toolbar-workflow-actions">
                  <label className="ttm-inline-filter">
                    <span>Status</span>
                    <select value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value)} disabled={actionBusy}>
                      <option value="">All</option>
                      <option value="false">Draft</option>
                      <option value="true">Published</option>
                    </select>
                  </label>
                <div ref={exportMenuRef} className={`ttm-export-menu${exportBusy ? " is-busy" : ""}`}>
                  <button type="button" className="cms-btn cms-btn-ghost" aria-haspopup="menu" aria-expanded={exportOpen} disabled={Boolean(exportBusy)} onClick={() => setExportOpen((open) => !open)}>
                    <Download size={15} aria-hidden="true" /> {exportBusy ? "Exporting…" : "Export"} <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  {exportOpen ? <div className="ttm-export-options" role="menu">
                    <button type="button" disabled={Boolean(exportBusy)} onClick={() => {
                      setExportOpen(false);
                      exportSectionPdf();
                    }}>
                      <FileText size={16} aria-hidden="true" /> Export PDF
                    </button>
                    <button type="button" disabled={Boolean(exportBusy)} onClick={() => {
                      setExportOpen(false);
                      exportGroupExcel();
                    }}>
                      <FileSpreadsheet size={16} aria-hidden="true" /> Export Excel
                    </button>
                  </div> : null}
                </div>
                {!published && <Btn className="cms-btn cms-btn-ghost ttm-icon-action" disabled={activeAction === "copy"} onClick={() => setCopying(true)} title="Copy Timetable" aria-label="Copy Timetable">
                  <Copy size={16} aria-hidden="true" />
                </Btn>}
                {!published && <Btn
                  className="cms-btn cms-btn-ghost"
                  disabled={workflowStatus !== "draft" || activeAction === "validate"}
                  onClick={() => action(apiEndpoints.timetable.validateSection(value.sectionId))}
                >
                  {activeAction === "validate" ? "Validating…" : "Validate"}
                </Btn>}
                {!published && <Btn disabled={(workflowStatus !== "validated" && !validation?.isValid) || activeAction === "approve" || approved} onClick={async () => {
                  const ok = await action(apiEndpoints.timetable.approveSection(value.sectionId));
                  if (ok) setWorkflowStatus("approved");
                }}>
                  {activeAction === "approve" ? "Approving…" : "Approve"}
                </Btn>}
                {!published && <Btn disabled={activeAction === "publish" || !approved}
                  onClick={async () => {
                    const ok = await action(apiEndpoints.timetable.publishSection(value.sectionId), "patch", { isPublished: true });
                    if (ok) {
                      setWorkflowStatus("published");
                      setPublishedFilter("true");
                      navigate("/dashboard/timetable", {
                        replace: true,
                        state: { timetableContext: { ...value, isPublished: true } },
                      });
                    }
                  }}
                >
                  {activeAction === "publish" ? "Publishing…" : "Publish"}
                </Btn>}
                </div>
                {published && (
                  <div className="ttm-toolbar-searches">
                    <label className="ttm-inline-filter ttm-staff-select">
                      <Search size={18} aria-hidden="true" />
                      <input
                        type="search"
                        list="ttm-staff-options"
                        aria-label="Select staff"
                        value={selectedStaffId}
                        disabled={actionBusy || !staffChoices.length}
                        onChange={(event) => {
                          const search = event.target.value;
                          setStaffSearch(search);
                          const staff = staffChoices.find(
                            (entry) => facultyOptionLabel(entry).toLowerCase() === search.trim().toLowerCase(),
                          );
                          if (staff) {
                            setSelectedStaffId(staff.id);
                            setSelectedStudentId("");
                            viewPublished("faculty", staff.id);
                          } else if (!search) {
                            setSelectedStaffId("");
                            load();
                          }
                        }}
                      />
                      <datalist id="ttm-staff-options">
                        {staffChoices.map((staff) => <option key={staff.id} value={facultyOptionLabel(staff)} />)}
                      </datalist>
                    </label>
                    <label className="ttm-inline-filter ttm-person-select">
                      <Search size={18} aria-hidden="true" />
                      <input
                        type="search"
                        list="ttm-student-options"
                        aria-label="Select student"
                        placeholder="Search student"
                        autoComplete="off"
                        value={studentSearch}
                        disabled={actionBusy || !studentChoices.length}
                        onChange={(event) => {
                          const search = event.target.value;
                          setStudentSearch(search);
                          const student = studentChoices.find(
                            (entry) => studentOptionLabel(entry).toLowerCase() === search.trim().toLowerCase(),
                          );
                          if (student) {
                            setSelectedStudentId(student.id);
                            setSelectedStaffId("");
                            viewPublished("student", student.id);
                          } else if (!search) {
                            setSelectedStudentId("");
                            load();
                          }
                        }}
                      />
                      <datalist id="ttm-student-options">
                        {studentChoices.map((student) => <option key={student.id} value={studentOptionLabel(student)} />)}
                      </datalist>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="ttm-grid-wrap">
              <table className="ttm-grid">
                <thead>
                  <tr>
                    <th>Day</th>
                    {data.periods.map((period) => {
                      const timeRange = periodTimeRange(period);
                      return <th key={period.id}>{period.name}{timeRange ? <small>{timeRange}</small> : null}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {workingDays.map((dayOfWeek) => (
                    (() => {
                      const dayName = DAYS[dayOfWeek];
                      return (
                    <tr key={dayName}>
                      <th>{dayName}</th>
                      {data.periods.map((period) => {
                        if (isBreakPeriod(period)) {
                          return (
                            <td className="break" key={period.id}>
                              {period.name}
                            </td>
                          );
                        }
                        const slot = find(dayOfWeek, period.id);
                        return (
                          <td className="slot" key={period.id}>
                            <button
                              className={published && slot ? "ttm-published-slot" : ""}
                              onMouseEnter={(event) => {
                                if (published && slot) openPublishedSlotDetails(event, slot, period, dayOfWeek, "hover");
                              }}
                              onMouseLeave={() => {
                                setPublishedSlotDetails((current) => current && !current.pinned ? null : current);
                              }}
                              onClick={(event) => {
                                if (published) {
                                  if (slot) openPublishedSlotDetails(event, slot, period, dayOfWeek);
                                  return;
                                }
                                openSlotEditor(slot, { dayOfWeek, periodId: period.id });
                              }}
                              disabled={published ? !slot : Boolean(selectedStaffId) || (actionBusy && activeAction === "slot")}
                            >
                              {slot ? (
                                published ? <b>{slotSubjectName(slot, data.subjects)}</b> : (
                                  <>
                                    <b>{slotSubjectName(slot, data.subjects)}</b>
                                    <span>{slotFacultyName(slot)}</span>
                                    <small>{slotRoomName(slot)}</small>
                                    <i className="ttm-slot-edit">Edit</i>
                                  </>
                                )
                              ) : (
                                slotsLoading
                                  ? "Loading…"
                                  : selectedStaffId
                                    ? <span className="ttm-empty-slot" aria-label="No class assigned">—</span>
                                    : <span className="ttm-slot-add">+ Add Slot</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
            {publishedSlotDetails && createPortal((() => {
              const { slot, style } = publishedSlotDetails;
              return (
                <aside className="ttm-published-slot-details" style={style} aria-label="Published timetable slot details">
                  <button type="button" className="ttm-published-slot-close" aria-label="Close slot details" onClick={() => setPublishedSlotDetails(null)}>×</button>
                  <h3>{slotSubjectName(slot, data.subjects)}</h3>
                  <p>{slotFacultyName(slot)}</p>
                  <p>{slotRoomName(slot)}</p>
                </aside>
              );
            })(), document.body)}
          </>
        )}
      </section>
      {validationOpen && validation && (
        <Modal title="Validate Timetable" onClose={() => setValidationOpen(false)}>
          <div className="ttm-modal-body">
            <div className={`ttm-validation-result${validation.isValid ? "" : " has-errors"}`}>
              <b>{validation.isValid ? "Timetable is valid" : "Validation failed"}</b>
              <span>{(validation.errors ?? []).length} Errors · {(validation.warnings ?? []).length} Warnings</span>
              {[...(validation.errors ?? []), ...(validation.warnings ?? [])].map((entry, index) => <p key={index}>{entry.message ?? entry}</p>)}
            </div>
            <footer><Btn className="cms-btn cms-btn-ghost" onClick={() => setValidationOpen(false)}>Close</Btn></footer>
          </div>
        </Modal>
      )}
      {editing && (
        <SlotEditor
          context={value}
          data={data}
          slot={editing}
          lab={Boolean(editing.__lab)}
          workingDays={workingDays}
          close={() => setEditing(null)}
          notify={notify}
          saved={(message) => {
            setEditing(null);
            // Any change to a published slot creates a new draft revision.
            // Require validation and approval before it can be published again.
            setValidation(null);
            notify(message || "Timetable slot updated.");
            load();
          }}
        />
      )}
      {substitutionPreviewOpen && (
        <SubstitutionPreview context={value} close={() => setSubstitutionPreviewOpen(false)} notify={notify} />
      )}
      {copying && (
        <Modal title="Copy Timetable" onClose={() => setCopying(false)}>
          <div className="ttm-modal-body">
            <p>Copy the currently selected timetable to another academic year and section.</p>
            <div className="ttm-form-grid">
              <Field label="Target Academic Year">
                <select value={copyTarget.academicYearId} onChange={(e) => setCopyTarget((x) => ({ ...x, academicYearId: e.target.value }))}>
                  <option value="">Select Academic Year</option>
                  {data.years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
                </select>
              </Field>
              <Field label="Target Section">
                <select value={copyTarget.sectionId} onChange={(e) => setCopyTarget((x) => ({ ...x, sectionId: e.target.value }))}>
                  <option value="">Select Section</option>
                  {data.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                </select>
              </Field>
            </div>
            <footer>
              <Btn className="cms-btn cms-btn-ghost" onClick={() => setCopying(false)}>Cancel</Btn>
              <Btn disabled={activeAction === "copy"} onClick={copyTimetable}>
                {activeAction === "copy" ? "Copying…" : "Copy Timetable"}
              </Btn>
            </footer>
          </div>
        </Modal>
      )}
    </Page>
  );
}
function MainTimetable({ notify }) {
  const location = useLocation();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const state = useLookups({
    ...location.state?.timetableContext,
    boardId: selectedBoardId || location.state?.timetableContext?.boardId || "",
    academicYearId: selectedAcademicYearId || location.state?.timetableContext?.academicYearId || "",
  });
  const { value } = state;
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const completeContext = [value.boardId, value.academicYearId, value.academicLevelId, value.groupId, value.programId, value.sectionId].every(Boolean);
  const openGenerated = async () => {
    if (!completeContext || opening) {
      notify("Select Board, Academic Year, Academic Level, Group, Program and Section first.");
      return;
    }
    setOpening(true);
    try {
      const response = await apiClient.get(apiEndpoints.timetable.getAll, { params: { pageNumber: 1, pageSize: 100 } });
      const matches = list(response.data).filter((entry) =>
        String(pick(entry, "boardId", "BoardId")) === String(value.boardId)
        && String(pick(entry, "academicYearId", "AcademicYearId")) === String(value.academicYearId)
        && String(pick(entry, "academicLevelId", "AcademicLevelId")) === String(value.academicLevelId)
        && String(pick(entry, "groupId", "GroupId")) === String(value.groupId)
        && String(pick(entry, "programId", "ProgramId", "programmeId", "ProgrammeId")) === String(value.programId)
        && String(pick(entry, "sectionId", "SectionId")) === String(value.sectionId),
      );
      const latest = [...matches].sort((left, right) => {
        const date = (entry) => Date.parse(pick(entry, "generatedAt", "GeneratedAt", "createdAt", "CreatedAt", "updatedAt", "UpdatedAt", "date", "Date") ?? "") || 0;
        return date(right) - date(left) || Number(timetableId(right) ?? 0) - Number(timetableId(left) ?? 0);
      })[0];
      if (!latest) {
        notify("No generated timetable was found for the selected context.");
        return;
      }
      navigate("/dashboard/timetable/draft", { state: { timetableContext: { ...value, isPublished: pick(latest, "isPublished", "IsPublished"), workingDays: latest.workingDays ?? latest.WorkingDays } } });
    } catch (error) {
      notify(getApiErrorMessage(error));
    } finally {
      setOpening(false);
    }
  };
  return (
    <Page title="Timetable" subtitle="Choose a timetable context to create or view a generated timetable.">
      <section className="ttm-card">
        <div className="ttm-main-row">
          <Context state={state} hideGlobalContext />
          <div className="ttm-view-tabs" role="group" aria-label="Timetable view actions">
            <Btn className="ttm-view-tab is-active" aria-pressed="true" disabled={!completeContext} onClick={() => navigate("/dashboard/timetable/setup", { state: { timetableContext: value } })}>Create Timetable</Btn>
            <Btn className="ttm-view-tab" aria-pressed="false" disabled={!completeContext || opening} onClick={openGenerated}>{opening ? "Opening…" : "Generated Timetable"}</Btn>
          </div>
        </div>
      </section>
    </Page>
  );
}

function LatestDraft({ notify }) {
  const [state, setState] = useState({ loading: true, context: null });
  useEffect(() => {
    let active = true;
    const timeout = new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Timetable request timed out.")), 15000);
    });
    Promise.race([
      apiClient.get(apiEndpoints.timetable.getAll, { params: { pageNumber: 1, pageSize: 20 } }),
      timeout,
    ])
      .then((response) => {
        if (!active) return;
        const rows = list(response.data);
        const latest = [...rows].sort((a, b) => {
          const date = (entry) => Date.parse(pick(entry, "generatedAt", "GeneratedAt", "createdAt", "CreatedAt", "updatedAt", "UpdatedAt", "date", "Date") ?? "") || 0;
          return date(b) - date(a) || Number(pick(b, "id", "Id", "timetableId", "TimetableId") ?? 0) - Number(pick(a, "id", "Id", "timetableId", "TimetableId") ?? 0);
        })[0];
        if (!latest) return setState({ loading: false, context: null });
        const section = latest.section ?? latest.Section ?? {};
        const program = latest.program ?? latest.Program ?? latest.programme ?? latest.Programme ?? {};
        const year = latest.academicYear ?? latest.AcademicYear ?? {};
        const board = latest.board ?? latest.Board ?? {};
        const level = latest.academicLevel ?? latest.AcademicLevel ?? {};
        const group = latest.group ?? latest.Group ?? {};
        setState({
          loading: false,
          context: {
            boardId: pick(latest, "boardId", "BoardId") ?? pick(board, "boardId", "BoardId", "id", "Id") ?? "",
            academicYearId: pick(latest, "academicYearId", "AcademicYearId") ?? pick(year, "academicYearId", "AcademicYearId", "id", "Id") ?? "",
            academicLevelId: pick(latest, "academicLevelId", "AcademicLevelId") ?? pick(level, "academicLevelId", "AcademicLevelId", "id", "Id") ?? "",
            groupId: pick(latest, "groupId", "GroupId") ?? pick(group, "groupId", "GroupId", "id", "Id") ?? "",
            programId: pick(latest, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? pick(program, "programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id") ?? "",
            sectionId: pick(latest, "sectionId", "SectionId") ?? pick(section, "sectionId", "SectionId", "id", "Id") ?? "",
            isPublished: pick(latest, "isPublished", "IsPublished"),
            workingDays: latest.workingDays ?? latest.WorkingDays,
          },
        });
      })
      .catch((error) => {
        if (active) {
          notify(getApiErrorMessage(error));
          setState({ loading: false, context: null });
        }
      });
    return () => { active = false; };
  }, [notify]);
  if (state.loading) return <Page title="Generated Timetable" subtitle="Loading the latest generated timetable…"><section className="ttm-card"><p className="ttm-empty">Loading timetable…</p></section></Page>;
  if (!state.context?.sectionId) return <Page title="Generated Timetable" subtitle="Review generated timetables."><section className="ttm-card"><p className="ttm-empty">No generated timetable available.</p><div className="ttm-screen-actions"><Link className="cms-btn cms-btn-primary" to="/dashboard/timetable/generate">Generate Timetable</Link></div></section></Page>;
  return <Draft initial={state.context} notify={notify} />;
}
export default function TimetablePage({ screen = "latest" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState("");
  const view =
    screen === "latest" ? (
      <MainTimetable notify={setToast} />
    ) : screen === "draft" ? (
      <Draft initial={location.state?.timetableContext} notify={setToast} />
    ) : screen === "generate" ? (
      <Generate
        notify={setToast}
        initial={location.state?.timetableContext}
        goDraft={(context) =>
          navigate("/dashboard/timetable/draft", { state: { timetableContext: context } })
        }
      />
    ) : (
      <Structures notify={setToast} initial={location.state?.timetableContext} />
    );
  return (
    <div className="timetable-module">
      {view}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
