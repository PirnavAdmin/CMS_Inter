import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { Field, Modal, StatusBadge, Toast, useForm } from "@/components/common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./CourseGroupPage.css";

const MODULE_SLUG = "courses";
const STATUS_OPTIONS = ["Active", "Inactive"];
const PROGRAMS_STORAGE_KEY = "cms.groupPrograms.v1";
const PROGRAM_MAPPINGS_STORAGE_KEY = "cms.groupProgramMappings.v1";

const DEFAULT_PROGRAMS = [
  { programId: "regular", backendProgramId: 1, programName: "Regular", programCode: "REG", status: "Active" },
  { programId: "jee", backendProgramId: 2, programName: "JEE", programCode: "JEE", status: "Active" },
  { programId: "jee-advanced", backendProgramId: 3, programName: "JEE Advanced", programCode: "JEEADV", status: "Active" },
  { programId: "eapcet", backendProgramId: 4, programName: "EAPCET", programCode: "EAPCET", status: "Active" },
  { programId: "neet", backendProgramId: 5, programName: "NEET", programCode: "NEET", status: "Active" },
  { programId: "neet-advanced", backendProgramId: 6, programName: "NEET Advanced", programCode: "NEETADV", status: "Active" },
  { programId: "ca-foundation", backendProgramId: 7, programName: "CA Foundation", programCode: "CAF", status: "Active" },
  { programId: "cma-foundation", backendProgramId: 8, programName: "CMA Foundation", programCode: "CMAF", status: "Active" },
  { programId: "cuet", backendProgramId: 9, programName: "CUET", programCode: "CUET", status: "Active" },
  { programId: "ipmat", backendProgramId: 10, programName: "IPMAT", programCode: "IPMAT", status: "Active" },
  { programId: "clat", backendProgramId: 11, programName: "CLAT", programCode: "CLAT", status: "Active" },
];

const getCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.$values)) return payload.$values;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.$values)) return payload.data.$values;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.Items)) return payload.data.Items;
  if (Array.isArray(payload?.Data?.$values)) return payload.Data.$values;
  if (Array.isArray(payload?.Data?.items)) return payload.Data.items;
  if (Array.isArray(payload?.Data?.Items)) return payload.Data.Items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null);
  return key ? item[key] : undefined;
};

const validId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0;
};

const responseData = (response) => response?.data?.data || response?.data?.Data || response?.data;

const optionFrom = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) ?? value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const splitValues = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (typeof value === "string") return value.split(",");
  return [];
};

const compactStrings = (values) => splitValues(values).map((value) => String(value).trim()).filter(Boolean);

const normalizeBoardOption = (item) => {
  const option = optionFrom(item, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"]);
  if (!option) return null;
  return {
    ...option,
    academicLevelIds: compactStrings(read(item, "academicLevelIds", "AcademicLevelIds", "levelIds", "LevelIds")),
    academicLevelNames: compactStrings(read(item, "academicLevelNames", "AcademicLevelNames", "levelNames", "LevelNames")),
    academicYearIds: compactStrings(read(item, "academicYearIds", "AcademicYearIds", "yearIds", "YearIds")),
    academicYearNames: compactStrings(read(item, "academicYearNames", "AcademicYearNames", "yearNames", "YearNames")),
  };
};

const normalizeAcademicYearOption = (item) => {
  const option = optionFrom(item, ["academicYearId", "AcademicYearId", "yearId", "YearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]);
  if (!option) return null;
  const active = read(item, "isActive", "IsActive", "active", "Active", "status", "Status");
  return {
    ...option,
    boardId: String(read(item, "boardId", "BoardId") || ""),
    isActive: typeof active === "string" ? active.toLowerCase() === "active" : active !== false,
  };
};

const normalizeAcademicLevelOption = (item) => optionFrom(
  item,
  ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"],
  ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"],
);

const normalizeProgram = (item) => {
  const programId = read(item, "programId", "ProgramId", "id", "Id");
  const programName = read(item, "programName", "ProgramName", "name", "Name") || "";
  const programCode = read(item, "programCode", "ProgramCode", "code", "Code") || programName;
  const status = read(item, "status", "Status", "isActive", "IsActive");
  return {
    programId: String(programId || programCode || programName),
    backendProgramId: Number(programId) || undefined,
    programName: String(programName || programCode || "Program"),
    programCode: String(programCode || programName || "PGM").toUpperCase(),
    status: typeof status === "string" ? (status.toLowerCase() === "inactive" ? "Inactive" : "Active") : status === false ? "Inactive" : "Active",
  };
};

const uniqueByValue = (options) => Array.from(new Map(options.filter(Boolean).map((item) => [String(item.value), item])).values());

const getLevelsForBoardOption = (levels, board) => {
  if (!board) return [];
  const mappedIds = new Set(board.academicLevelIds || []);
  if (mappedIds.size) return levels.filter((level) => mappedIds.has(String(level.value)));
  const mappedNames = new Set((board.academicLevelNames || []).map((name) => name.toLowerCase()));
  if (mappedNames.size) return levels.filter((level) => mappedNames.has(String(level.label).toLowerCase()));
  return [];
};

const getMappedLevelsForBoard = (masters, boardId) => {
  const levels = masters.levels || [];
  const board = (masters.boards || []).find((item) => String(item.value) === String(boardId));
  if (!boardId || !board) return [];
  return getLevelsForBoardOption(levels, board);
};

const getMappedYearsForBoard = (masters, boardId) => {
  const years = masters.years || [];
  const board = (masters.boards || []).find((item) => String(item.value) === String(boardId));
  const boardYears = years.filter((year) => String(year.boardId) === String(boardId));
  if (boardYears.length) return uniqueAcademicYearsByName(boardYears, (year) => year.label);
  if (!boardId || !board) return [];
  const mappedIds = new Set(board.academicYearIds || []);
  if (mappedIds.size) return uniqueAcademicYearsByName(years.filter((year) => mappedIds.has(String(year.value))), (year) => year.label);
  const mappedNames = new Set((board.academicYearNames || []).map((name) => name.toLowerCase()));
  if (mappedNames.size) return uniqueAcademicYearsByName(years.filter((year) => mappedNames.has(String(year.label).toLowerCase())), (year) => year.label);
  return [];
};

const defaultLevelForBoard = (masters, boardId, currentLevel = "") => {
  const levels = getMappedLevelsForBoard(masters, boardId);
  if (currentLevel && levels.some((level) => String(level.value) === String(currentLevel))) return currentLevel;
  return levels[0]?.value || "";
};

const normalizeStatus = (item) => {
  const status = read(item, "status", "Status");
  if (typeof status === "boolean") return status ? "Active" : "Inactive";
  if (status) return String(status);
  return read(item, "isActive", "IsActive") ? "Active" : "Inactive";
};

const masterLabel = (options = [], value) => (
  value ? options.find((option) => String(option.value) === String(value))?.label : ""
);

const normalizeGroup = (item, masters = {}) => {
  const id = read(item, "groupId", "GroupId", "id", "Id");
  const code = read(item, "groupCode", "GroupCode", "code") || "-";
  const boardId = String(read(item, "boardId", "BoardId") || "");
  const year = String(read(item, "academicYearId", "AcademicYearId", "yearId", "YearId", "year") || "");
  const levelId = String(read(item, "academicLevelId", "AcademicLevelId") || "");

  return {
    id,
    name: read(item, "groupName", "GroupName", "name") || "-",
    code,
    boardId,
    board: read(item, "boardName", "BoardName", "board", "Board") || masterLabel(masters.boards, boardId) || "-",
    year,
    yearName: read(item, "academicYearName", "AcademicYearName", "yearName", "YearName") || masterLabel(masters.years, year) || "",
    levelId,
    level: read(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "academicLevel", "AcademicLevel", "level") || masterLabel(masters.levels, levelId) || "-",
    programs: programNamesForGroup(id).join(", ") || "-",
    subjects: read(item, "subjects", "Subjects", "subjectCount", "SubjectCount", "totalSubjects", "TotalSubjects") ?? "-",
    status: normalizeStatus(item),
  };
};

const groupFormFields = [
  { name: "board", label: "Board", type: "select", options: [], required: true },
  { name: "year", label: "Academic Year", type: "select", options: [], required: true },
  { name: "name", label: "Group Name", required: true },
  { name: "code", label: "Group Code", required: true },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
];

const optionLabel = (options, value, fallback = "-") => (
  options.find((option) => String(option.value) === String(value))?.label || fallback
);

const selectedContextOption = (item, id, labelKeys) => {
  if (!validId(id)) return null;
  const label = read(item, ...labelKeys) || id;
  return { ...(item || {}), value: String(id), label: String(label) };
};

const groupMatchesAcademicContext = (row, { boardId, academicYearId } = {}) => (
  (!validId(boardId) || String(row.boardId || "") === String(boardId))
  && (!validId(academicYearId) || String(row.year || "") === String(academicYearId))
);

const backendProgramIdFor = (programId) => {
  const direct = Number(programId);
  if (Number.isInteger(direct) && direct > 0) return direct;
  const program = getProgramMaster().find((item) => String(item.programId) === String(programId));
  const mapped = Number(program?.backendProgramId);
  return Number.isInteger(mapped) && mapped > 0 ? mapped : null;
};

const normalizeSelectedProgramIds = (programIds = [], programs = getProgramMaster()) => {
  const availablePrograms = programs.length ? programs : getProgramMaster();
  const selected = programIds
    .map((programId) => {
      const match = availablePrograms.find((program) => (
        String(program.programId) === String(programId)
        || String(program.backendProgramId || "") === String(programId)
      ));
      return match ? String(match.programId) : "";
    })
    .filter(Boolean);
  return Array.from(new Set(selected));
};

const normalizeGroupForm = (item) => {
  const group = normalizeGroup(item);
  return {
    board: group.boardId,
    year: group.year,
    level: group.levelId,
    name: group.name === "-" ? "" : group.name,
    code: group.code === "-" ? "" : group.code,
    status: group.status,
  };
};

const toPayload = (formData, selectedProgramIds = []) => {
  const backendProgramIds = Array.from(new Set(selectedProgramIds
    .map(backendProgramIdFor)
    .filter((programId) => Number.isInteger(programId) && programId > 0)));
  const payload = {
    board: formData.boardName || formData.board,
    groupName: formData.name,
    groupCode: formData.code,
    academicLevel: formData.levelName || formData.level,
    isActive: formData.status === "Active",
  };
  if (formData.board) payload.boardId = Number(formData.board);
  if (formData.year) payload.academicYearId = Number(formData.year);
  if (formData.level) payload.academicLevelId = Number(formData.level);
  if (backendProgramIds.length) {
    payload.programIds = backendProgramIds;
    payload.programs = programsForIds(selectedProgramIds);
  }
  return payload;
};

const readCreatedGroupId = (response) => read(responseData(response) || {}, "groupId", "GroupId", "id", "Id");

const storageGet = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const storageSet = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new Error(`Unable to save program selections locally. ${error?.message || "Please try again."}`);
  }
};

const getProgramMaster = () => {
  const stored = storageGet(PROGRAMS_STORAGE_KEY, []);
  const byCode = new Map([...DEFAULT_PROGRAMS, ...stored].map((program) => [program.programCode.toUpperCase(), program]));
  return Array.from(byCode.values());
};

const loadProgramMaster = async () => {
  const response = await apiClient.get(apiEndpoints.programs.list);
  const apiPrograms = getCollection(response.data).map(normalizeProgram).filter((program) => program.programId);
  if (apiPrograms.length) {
    saveProgramMaster(apiPrograms);
    return apiPrograms;
  }
  return getProgramMaster();
};

const saveProgramMaster = (programs) => {
  const defaults = new Set(DEFAULT_PROGRAMS.map((program) => program.programCode.toUpperCase()));
  const customPrograms = programs.filter((program) => !defaults.has(program.programCode.toUpperCase()));
  storageSet(PROGRAMS_STORAGE_KEY, customPrograms);
};

const groupCodeKey = (code) => {
  const normalized = String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized === "BIPC" || normalized === "BIPCALT" ? "BIPC" : normalized;
};

const getProgramMappings = () => storageGet(PROGRAM_MAPPINGS_STORAGE_KEY, {});

const saveProgramMapping = (groupId, groupCode, programIds) => {
  const mappings = getProgramMappings();
  mappings[String(groupId)] = {
    groupCode: groupCodeKey(groupCode),
    programIds: Array.from(new Set(programIds)),
  };
  storageSet(PROGRAM_MAPPINGS_STORAGE_KEY, mappings);
};

const programsForIds = (programIds) => {
  const selectedIds = new Set(programIds.map((programId) => String(programId)));
  return getProgramMaster()
    .filter((program) => selectedIds.has(String(program.programId)))
    .map((program) => ({
      programId: backendProgramIdFor(program.programId) || program.programId,
      programName: program.programName,
      programCode: program.programCode,
      status: program.status,
    }));
};

const programIdsForGroup = (groupId) => {
  const mapping = groupId ? getProgramMappings()[String(groupId)] : null;
  return mapping?.programIds?.length ? mapping.programIds : [];
};

const fetchProgramIdsForGroup = async (groupId, availablePrograms = getProgramMaster()) => {
  if (!groupId) return [];
  try {
    const response = await apiClient.get(apiEndpoints.programs.mappedByGroup(groupId));
    const data = responseData(response);
    const rows = getCollection(response.data).length
      ? getCollection(response.data)
      : getCollection(read(data, "programs", "Programs", "items", "Items"));
    const programIds = rows
      .map((program) => {
        const nestedProgram = read(program, "program", "Program");
        return read(program, "programId", "ProgramId")
          ?? read(nestedProgram, "programId", "ProgramId", "id", "Id")
          ?? read(program, "id", "Id");
      })
      .filter((programId) => programId !== undefined && programId !== null && programId !== "");
    return normalizeSelectedProgramIds(programIds, availablePrograms);
  } catch {
    return [];
  }
};

const createProgramPayload = (values, groupId) => {
  const name = String(values.programName || "").trim();
  const code = String(values.programCode || name || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const payload = {
    programName: name,
    programCode: code || `PGM${Date.now()}`,
    isActive: values.status !== "Inactive",
  };
  // Verify groupId against the backend CreateProgram DTO; Swagger only lists the endpoint, not the request body.
  if (Number(groupId)) payload.groupId = Number(groupId);
  return payload;
};

function programNamesForGroup(groupId) {
  const masterById = new Map(getProgramMaster().map((program) => [program.programId, program]));
  return programIdsForGroup(groupId)
    .map((programId) => masterById.get(programId)?.programName)
    .filter(Boolean);
}

const findSavedGroupId = async (values) => {
  const response = await apiClient.get(apiEndpoints.groups.getAll, {
    params: {
      search: values.code || undefined,
      boardId: values.board || undefined,
      academicYearId: values.year || undefined,
      academicLevelId: values.level || undefined,
    },
  });
  const savedGroup = getCollection(response.data)
    .map(normalizeGroup)
    .find((group) => (
      groupCodeKey(group.code) === groupCodeKey(values.code)
      && String(group.boardId) === String(values.board)
      && String(group.year) === String(values.year)
      && (!values.level || String(group.levelId) === String(values.level))
    ));
  return savedGroup?.id;
};

const matchesSearch = (row, search) => {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [row.name, row.code, row.board, row.yearName, row.level]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
};

let groupMastersPromise = null;
const loadGroupMasters = async () => {
  if (groupMastersPromise) return groupMastersPromise;
  groupMastersPromise = (async () => {
  const [boardsResult, yearsResult, levelsResult] = await Promise.allSettled([
    apiClient.get(apiEndpoints.boards.getAll),
    apiClient.get(apiEndpoints.academicYears.list),
    apiClient.get(apiEndpoints.boards.getAcademicLevels),
  ]);
  const failures = [
    ["Board API", boardsResult],
    ["Academic Year API", yearsResult],
    ["Academic Level API", levelsResult],
  ]
    .filter(([, result]) => result.status === "rejected")
    .map(([label, result]) => `${label}: ${getApiErrorMessage(result.reason)}`);

  if (failures.length) throw new Error(`Failed to load Group dropdown data. ${failures.join(" ")}`);

  return {
    boards: uniqueByValue(getCollection(boardsResult.value.data).map(normalizeBoardOption)),
    years: uniqueByValue(getCollection(yearsResult.value.data).map(normalizeAcademicYearOption).filter((year) => year?.isActive)),
    levels: uniqueByValue(getCollection(levelsResult.value.data).map(normalizeAcademicLevelOption)),
  };
  })().catch((error) => {
    groupMastersPromise = null;
    throw error;
  });
  return groupMastersPromise;
};

const groupApi = {
  fetchRows: async ({ search = "", boardId = "", academicYearId = "" } = {}) => {
    if (!validId(boardId) || !validId(academicYearId)) return [];
    const masters = await loadGroupMasters();
    const response = await apiClient.get(apiEndpoints.groups.getAll, {
      params: {
        boardId: Number(boardId),
        academicYearId: Number(academicYearId),
      },
    });
    return getCollection(response.data)
      .map((item) => normalizeGroup(item, masters))
      .filter((row) => row.id)
      .filter((row) => groupMatchesAcademicContext(row, { boardId, academicYearId }))
      .filter((row) => matchesSearch(row, search));
  },
  fetchRow: async (groupId) => {
    const response = await apiClient.get(apiEndpoints.groups.getById(groupId));
    return normalizeGroupForm(responseData(response));
  },
  saveRow: async (values, groupId, selectedProgramIds) => {
    const payload = toPayload(values, selectedProgramIds);
    if (groupId) {
      const response = await apiClient.put(apiEndpoints.groups.update(groupId), payload);
      saveProgramMapping(groupId, values.code, selectedProgramIds);
      return response;
    }
    const response = await apiClient.post(apiEndpoints.groups.create, payload);
    const createdGroupId = readCreatedGroupId(response) || await findSavedGroupId(values);
    if (!createdGroupId) throw new Error("Group saved, but the new group ID could not be found for program mapping. Please reopen the group and save programs again.");
    saveProgramMapping(createdGroupId, values.code, selectedProgramIds);
    return response;
  },
  deleteRow: (groupId) => apiClient.delete(apiEndpoints.groups.delete(groupId)),
  validateValues: async (values, groupId) => {
    if (!values.code) return {};
    const response = await apiClient.get(apiEndpoints.groups.validateCode, {
      params: {
        groupCode: values.code,
        excludeGroupId: groupId || undefined,
      },
    });
    return response.data?.isAvailable === false ? { code: "Group Code already exists" } : {};
  },
  loadFields: async (fields) => {
    const masters = await loadGroupMasters();
    return fields.map((field) => (
      field.name === "board"
        ? { ...field, options: masters.boards }
        : field.name === "year"
          ? { ...field, options: uniqueAcademicYearsByName(masters.years, (year) => year.label) }
          : field.name === "level"
            ? { ...field, options: masters.levels }
            : field
    ));
  },
};

export const pageConfig = {
    title: "Group Management",
    subtitle: "Manage groups mapped to boards and academic levels.",
    breadcrumb: ["Academics"],
    addLabel: "Add Group",
    rows: [],
    pagination: { currentOnly: true },
    api: groupApi,
    columns: [
      { key: "name", label: "Group Name", strong: true },
      { key: "code", label: "Group Code" },
      { key: "board", label: "Board" },
      { key: "level", label: "Academic Level" },
      { key: "status", label: "Status", badge: true },
    ],
    fields: [
      { name: "board", label: "Board", type: "select", options: [], required: true },
      { name: "year", label: "Academic Year", type: "select", options: [], required: true },
      { name: "name", label: "Group Name", required: true },
      { name: "code", label: "Group Code", required: true },
      { name: "subjects", label: "Total Subjects", type: "number" },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
    ],
  };

function AddProgramModal({ onCancel, onAdd, saving = false }) {
  const fields = [
    { name: "programName", label: "Program Name", required: true },
    { name: "programCode", label: "Program Code" },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
  ];
  const { values, errors, setValue, validate } = useForm(fields, { status: "Active" });

  const submit = () => {
    if (!validate()) return;
    onAdd(values);
  };

  return (
    <Modal
      title="Add Program"
      onClose={onCancel}
      size="sm"
      footer={(
        <>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={submit} disabled={saving}>{saving ? "Adding..." : "Add Program"}</button>
        </>
      )}
    >
      <div className="cms-form-grid">
        {fields.map((field) => (
          <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={setValue} />
        ))}
      </div>
    </Modal>
  );
}

function ProgramsPanel({ groupId, groupCode, groupName, selectedProgramIds, onChange, onError }) {
  const [programs, setPrograms] = useState(getProgramMaster);
  const [adding, setAdding] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const normalizedSelectedProgramIds = useMemo(() => normalizeSelectedProgramIds(selectedProgramIds, programs), [programs, selectedProgramIds]);
  const selected = useMemo(() => new Set(normalizedSelectedProgramIds), [normalizedSelectedProgramIds]);
  const headingName = String(groupCode || groupName || "this Group").trim();

  useEffect(() => {
    let ignore = false;
    setLoadingPrograms(true);
    loadProgramMaster()
      .then((items) => {
        if (!ignore) setPrograms(items);
      })
      .catch((error) => {
        if (!ignore) onError?.(getApiErrorMessage(error) || "Unable to load programs.");
      })
      .finally(() => {
        if (!ignore) setLoadingPrograms(false);
      });
    return () => { ignore = true; };
  }, [onError]);

  const toggleProgram = (programId, checked) => {
    const id = String(programId);
    const next = checked
      ? [...normalizedSelectedProgramIds, id]
      : normalizedSelectedProgramIds.filter((selectedId) => selectedId !== id);
    onChange(Array.from(new Set(next)));
  };

  const addProgram = async (values) => {
    const code = String(values.programCode || values.programName || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const name = String(values.programName || "").trim();
    const existing = programs.find((program) => (
      program.programCode.toUpperCase() === code || program.programName.toLowerCase() === name.toLowerCase()
    ));
    if (existing) {
      onChange(Array.from(new Set([...normalizedSelectedProgramIds, String(existing.programId)])));
      setAdding(false);
      return;
    }
    setSavingProgram(true);
    try {
      const response = await apiClient.post(apiEndpoints.programs.create, createProgramPayload(values, groupId));
      const program = normalizeProgram(responseData(response) || createProgramPayload(values, groupId));
      const nextPrograms = await loadProgramMaster().catch(() => [...programs, program]);
      setPrograms(nextPrograms);
      onChange(Array.from(new Set([...normalizedSelectedProgramIds, String(program.programId)])));
      setAdding(false);
    } catch (error) {
      onError?.(getApiErrorMessage(error) || "Unable to add program.");
    } finally {
      setSavingProgram(false);
    }
  };

  return (
    <section className="course-programs-panel">
      <div className="course-programs-head">
        <div>
          <h3>Programs for {headingName}</h3>
          <p>Selected Programs: {normalizedSelectedProgramIds.length}</p>
        </div>
        <button type="button" className="cms-btn cms-btn-ghost course-add-program-btn" onClick={() => setAdding(true)}>
          <Plus size={14} /> Add Program
        </button>
      </div>
      <div className="course-program-grid">
        {loadingPrograms ? <p className="cms-muted">Loading programs...</p> : null}
        {!loadingPrograms && programs.map((program) => (
          <label key={program.programId} className="course-program-option">
            <input
              type="checkbox"
              checked={selected.has(String(program.programId))}
              disabled={program.status === "Inactive"}
              onChange={(event) => toggleProgram(program.programId, event.target.checked)}
            />
            <span>
              <strong>{program.programName}</strong>
              <small>{program.programCode}</small>
            </span>
          </label>
        ))}
      </div>
      {adding ? <AddProgramModal onCancel={() => setAdding(false)} onAdd={addProgram} saving={savingProgram} /> : null}
    </section>
  );
}

function CourseGroupFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    selectedBoard,
    selectedBoardId,
    selectedAcademicYear,
    selectedAcademicYearId,
  } = useAcademicContext();
  const [contextOptions, setContextOptions] = useState({ boards: [], years: [], levels: [] });
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { values, errors, setValue, validate, setValues, setErrors } = useForm(groupFormFields, { status: "Active" });
  const [selectedProgramIds, setSelectedProgramIds] = useState([]);
  const mode = id ? "Edit" : "Add";
  const listPath = "/dashboard/courses";
  const navbarBoardOption = useMemo(() => selectedContextOption(
    selectedBoard,
    selectedBoardId,
    ["boardName", "BoardName", "name", "Name", "boardCode", "BoardCode", "code", "Code"],
  ), [selectedBoard, selectedBoardId]);
  const navbarYearOption = useMemo(() => selectedContextOption(
    selectedAcademicYear,
    selectedAcademicYearId,
    ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "label", "Label", "code", "Code"],
  ), [selectedAcademicYear, selectedAcademicYearId]);
  const mappedYearOptions = values.board ? getMappedYearsForBoard(contextOptions, values.board) : [];
  const yearOptions = values.board && mappedYearOptions.length
    ? mappedYearOptions
    : uniqueAcademicYearsByName(contextOptions.years, (year) => year.label);
  const fields = groupFormFields.map((field) => {
    if (field.name === "board") return { ...field, options: navbarBoardOption ? [navbarBoardOption] : contextOptions.boards, disabled: true };
    if (field.name === "year") return { ...field, options: navbarYearOption ? [navbarYearOption] : yearOptions, disabled: true };
    return field;
  });
  const showProgramError = useCallback((message) => {
    setToastType("error");
    setToast(message);
  }, []);

  const setGroupValue = (name, value) => {
    if (name === "board" || name === "year") return;
    setValue(name, value);
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const [masters, loadedGroup] = await Promise.all([
          loadGroupMasters(),
          id ? groupApi.fetchRow(id) : null,
        ]);
        if (ignore) return;
        setContextOptions({
          ...masters,
          boards: navbarBoardOption ? uniqueByValue([navbarBoardOption, ...masters.boards]) : masters.boards,
          years: navbarYearOption ? uniqueByValue([navbarYearOption, ...masters.years]) : masters.years,
        });
        if (loadedGroup) {
          setValues(loadedGroup);
          const availablePrograms = await loadProgramMaster().catch(() => getProgramMaster());
          const mappedProgramIds = await fetchProgramIdsForGroup(id, availablePrograms);
          if (!ignore) setSelectedProgramIds(mappedProgramIds);
        } else {
          setValues((current) => ({
            ...current,
            board: validId(selectedBoardId) ? String(selectedBoardId) : "",
            year: validId(selectedAcademicYearId) ? String(selectedAcademicYearId) : "",
            level: defaultLevelForBoard(masters, selectedBoardId, current.level),
          }));
        }
      } catch (error) {
        if (!ignore) {
          setToastType("error");
          setToast(getApiErrorMessage(error));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [id, navbarBoardOption, navbarYearOption, selectedAcademicYearId, selectedBoardId, setValues]);

  useEffect(() => {
    if (id) return;
    setValues((current) => {
      const board = validId(selectedBoardId) ? String(selectedBoardId) : "";
      const year = validId(selectedAcademicYearId) ? String(selectedAcademicYearId) : "";
      if (current.board === board && current.year === year) return current;
      return {
        ...current,
        board,
        year,
        level: defaultLevelForBoard(contextOptions, board, current.level),
      };
    });
    setErrors((current) => ({ ...current, board: undefined, year: undefined }));
  }, [contextOptions, id, selectedAcademicYearId, selectedBoardId, setErrors, setValues]);

  useEffect(() => {
    setSelectedProgramIds([]);
  }, [id]);

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    if (!id && (!validId(selectedBoardId) || !validId(selectedAcademicYearId))) {
      setToastType("error");
      setToast("Select a Board and Academic Year in the top navbar before saving a group.");
      return;
    }
    setSaving(true);
    try {
      const saveValues = {
        ...values,
        board: id ? values.board : String(selectedBoardId),
        year: id ? values.year : String(selectedAcademicYearId),
        level: values.level || defaultLevelForBoard(contextOptions, id ? values.board : selectedBoardId),
      };
      saveValues.boardName = optionLabel(contextOptions.boards, saveValues.board, saveValues.board);
      saveValues.levelName = optionLabel(contextOptions.levels, saveValues.level, saveValues.level);
      const validationErrors = await groupApi.validateValues(saveValues, id);
      if (validationErrors && Object.keys(validationErrors).length) {
        setErrors(validationErrors);
        return;
      }
      await groupApi.saveRow(saveValues, id, normalizeSelectedProgramIds(selectedProgramIds));
      setToastType("success");
      setToast(`Group ${id ? "updated" : "created"} successfully`);
      navigate("/dashboard/courses");
    } catch (error) {
      setToastType("error");
      setToast(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={`${mode} Group`} subtitle="Configure the group details and its programs." breadcrumb={["Group Management"]}>
      <div className="cms-form-page course-group-form-page">
        <Link to={listPath} className="cms-back-link"><ArrowLeft size={15} /> Back to Group Management</Link>
        <form className="cms-card" onSubmit={submit} noValidate>
          <div className="cms-card-body">
            {loading ? (
              <div className="cms-empty">Loading record...</div>
            ) : (
              <>
                <div className="cms-form-grid">
                  {fields.map((field) => (
                    <Field key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={setGroupValue} />
                  ))}
                </div>
                <ProgramsPanel
                  groupId={id}
                  groupCode={values.code}
                  groupName={values.name}
                  selectedProgramIds={selectedProgramIds}
                  onChange={setSelectedProgramIds}
                  onError={showProgramError}
                />
              </>
            )}
            <div className="cms-form-actions">
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(listPath)}>Cancel</button>
              <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || loading}>{saving ? "Saving..." : `${id ? "Update" : "Save"} Group`}</button>
            </div>
          </div>
        </form>
      </div>
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function CourseGroupListPage() {
  const navigate = useNavigate();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState("");

  const loadRows = useCallback(async (nextSearch = search) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setLoading(true);
    setError("");
    try {
      const loadedRows = await groupApi.fetchRows({
        search: nextSearch,
        boardId: selectedBoardId,
        academicYearId: selectedAcademicYearId,
      });
      if (requestId.current === currentRequest) setRows(loadedRows);
    } catch (err) {
      if (requestId.current === currentRequest) {
        setRows([]);
        setError(getApiErrorMessage(err));
      }
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, [search, selectedAcademicYearId, selectedBoardId]);

  useEffect(() => {
    loadRows(search);
  }, [loadRows, search]);

  const handleSearch = (value) => {
    if (value === search) return;
    setSearch(value);
  };

  const requestDeleteGroup = (row) => {
    if (deletingId) return;
    setDeleteTarget(row);
  };

  const deleteGroup = async () => {
    if (!deleteTarget?.id || deletingId) return;
    setDeletingId(deleteTarget.id);
    try {
      await groupApi.deleteRow(deleteTarget.id);
      setToastType("success");
      setToast("Group deleted successfully");
      setDeleteTarget(null);
      await loadRows(search);
    } catch (err) {
      setToastType("error");
      setToast(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  const addGroup = () => {
    navigate("/dashboard/courses/add");
  };

  const columns = useMemo(() => pageConfig.columns.map((column) => (
    column.badge ? { ...column, render: (row) => <StatusBadge value={row[column.key]} /> } : column
  )), []);

  return (
    <DashboardLayout title={pageConfig.title} subtitle={pageConfig.subtitle} breadcrumb={pageConfig.breadcrumb}>
      <div className="group-management">
        {error ? (
          <div className="cms-card" style={{ marginBottom: 16 }}>
            <div className="cms-card-body">
              <div className="cms-empty">{error}</div>
              <button className="cms-btn cms-btn-ghost" onClick={() => loadRows(search)}>Retry</button>
            </div>
          </div>
        ) : null}
        <DataTable
          title={pageConfig.title}
          columns={columns}
          rows={rows}
          loading={loading}
          addLabel={pageConfig.addLabel}
          searchPlaceholder="Search by group, code, board, academic year..."
          onSearchChange={handleSearch}
          onAdd={addGroup}
          enableExport={false}
          onEdit={(row) => navigate(`/dashboard/courses/${row.id}/edit`)}
          onDelete={requestDeleteGroup}
        />
      </div>
      {deleteTarget ? (
        <Modal
          title="Delete Group"
          size="sm"
          onClose={deletingId ? () => {} : () => setDeleteTarget(null)}
          footer={(
            <>
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)}>Cancel</button>
              <button type="button" className="cms-btn cms-btn-danger" onClick={deleteGroup} disabled={Boolean(deletingId)}>
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        >
          <p>Are you sure you want to delete this group?</p>
        </Modal>
      ) : null}
      <Toast message={toast} type={toastType} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

export function CourseGroupFormRoute() {
  return <CourseGroupFormPage />;
}

export default function CourseGroupPage({ form = false }) {
  return form ? <CourseGroupFormPage /> : <CourseGroupListPage />;
}
