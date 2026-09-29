import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Download, ArrowRight, Layers, Calendar, CheckCircle, CheckCircle2, Users, UserCheck, UserX, Megaphone, RotateCcw, ChevronDown } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Modal, SkeletonTable, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import {
  getEligibleStudents,
  previewPromotion,
  promoteStudents,
  promoteSingleStudent,
  allocateProgram,
  allocateSection,
  allocateGroup,
  getPromotionHistory,
  rollbackPromotion,
  getPromotionReport,
} from "@/features/promotion/services/promotionStore.js";
import "./PromotionPage.css";

const EMPTY_SETUP = {
  fromYear: "", board: "", fromLevel: "", group: "", program: "", fromSection: "",
  toYear: "", toBoard: "", toLevel: "", toGroup: "", toProgram: "", toSection: "",
};

const EMPTY_HISTORY_FILTERS = {
  academicYearId: "", academicLevel: "",
  groupId: "", programId: "", section: "", studentId: "", search: "", promotionStatus: "", fromDate: "", toDate: "",
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null);
  return key ? item[key] : undefined;
};

const unwrap = (payload, preferred = []) => {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    ...preferred.map((key) => payload?.[key]), payload?.data, payload?.Data, payload?.items, payload?.Items,
    payload?.records, payload?.Records, payload?.result, payload?.Result, payload?.$values,
    payload?.data?.items, payload?.data?.records, payload?.data?.$values,
  ];
  return candidates.find(Array.isArray) || [];
};

const unwrapObject = (payload) => payload?.data ?? payload?.Data ?? payload?.result ?? payload?.Result ?? payload ?? {};
const asString = (value) => value === undefined || value === null ? "" : String(value);
const isPresent = (value) => value !== "" && value !== undefined && value !== null;
const numericId = (value) => {
  if (!isPresent(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
};
const compactParams = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => isPresent(value) && !Number.isNaN(value)));
const unique = (values) => [...new Set(values.filter(Boolean).map(String))];
const option = (value, label) => ({ value: asString(value), label: asString(label ?? value) });
const isSecondYearLevel = (value) => /\b(?:2nd|second)\s+year\b/i.test(asString(value));
const academicYearRange = (year) => {
  const match = asString(year).match(/\b(\d{4})\s*[-/]\s*(\d{4})\b/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  return end === start + 1 ? { start, end } : null;
};

const isNextAcademicYear = (sourceYear, targetYear) => {
  const source = academicYearRange(sourceYear);
  const target = academicYearRange(targetYear);
  return Boolean(source && target && target.start === source.start + 1);
};

const CAMPUS_TRANSFER_OPTIONS = {
  campuses: [
    { name: "Main Campus (HQ)", board: "Board of Intermediate Education, Andhra Pradesh (BIEAP)" },
    { name: "North Campus", board: "Board of Intermediate Education, Andhra Pradesh (BIEAP)" },
    { name: "City Campus", board: "Central Board of Secondary Education (CBSE)" },
    { name: "Junior College Campus", board: "" },
  ],
  reasons: ["Parent Request", "Change of Residence", "Transportation Convenience", "Academic Requirement", "Administrative Transfer", "Other"],
};

const CAMPUS_TRANSFER_STUDENTS = [
  ["ADM-52", "Sahithi R", "1", "First Year", "MPC", "MPC Regular", "MPC-A"],
  ["ADM-2026-001", "Rahul Kumar", "101", "First Year", "MPC", "MPC Regular", "MPC-A"],
  ["ADM-2026-002", "Priya Reddy", "102", "First Year", "MPC", "MPC Regular", "MPC-A"],
  ["ADM-2026-003", "Sai Kiran", "103", "First Year", "MPC", "MPC Regular", "MPC-A"],
  ["ADM-2026-004", "Anjali Rao", "104", "Second Year", "BiPC", "BiPC Regular", "BiPC-A"],
].map(([admissionNo, name, rollNo, level, group, program, section]) => ({
  id: admissionNo,
  admissionNo,
  name,
  rollNo,
  campus: "Main Campus (HQ)",
  level,
  group,
  program,
  section,
  board: "Board of Intermediate Education, Andhra Pradesh (BIEAP)",
  status: "Active",
}));

const CAMPUS_TRANSFER_REQUESTS = [
  { id: 1, student: CAMPUS_TRANSFER_STUDENTS[0], fromCampus: "Main Campus (HQ)", toCampus: "North Campus", requestedBy: "Administrator - Main Campus", requestedTo: "Principal - North Campus", requestDate: "29-09-2026", effectiveDate: "01-10-2026", reason: "Parent Request", remarks: "Requested by parent for better transportation facility.", status: "Pending" },
  { id: 2, student: CAMPUS_TRANSFER_STUDENTS[1], fromCampus: "Main Campus (HQ)", toCampus: "North Campus", requestedBy: "Administrator - Main Campus", requestedTo: "College Administrator", requestDate: "28-09-2026", effectiveDate: "03-10-2026", reason: "Change of Residence", remarks: "Family relocated near the destination campus.", status: "Approved", approvedBy: "College Administrator", approvedOn: "30-09-2026", approvalRemarks: "Approved. Seat allocated in the corresponding section." },
  { id: 3, student: CAMPUS_TRANSFER_STUDENTS[2], fromCampus: "North Campus", toCampus: "Main Campus (HQ)", requestedBy: "Administrator - North Campus", requestedTo: "Principal - Main Campus", requestDate: "26-09-2026", effectiveDate: "05-10-2026", reason: "Academic Requirement", remarks: "Requested for academic programme continuity.", status: "Rejected", rejectedBy: "Principal - Main Campus", rejectedOn: "29-09-2026", rejectionReason: "No seats available in the selected programme/section." },
  { id: 4, student: CAMPUS_TRANSFER_STUDENTS[3], fromCampus: "Main Campus (HQ)", toCampus: "North Campus", requestedBy: "Administrator - Main Campus", requestedTo: "Academic Administrator", requestDate: "25-09-2026", effectiveDate: "06-10-2026", reason: "Administrative Transfer", remarks: "Administrative request.", status: "Pending" },
  { id: 5, student: CAMPUS_TRANSFER_STUDENTS[4], fromCampus: "Main Campus (HQ)", toCampus: "North Campus", requestedBy: "Administrator - Main Campus", requestedTo: "Principal - North Campus", requestDate: "24-09-2026", effectiveDate: "07-10-2026", reason: "Transportation Convenience", remarks: "Closer transport route available.", status: "Approved", approvedBy: "Principal - North Campus", approvedOn: "28-09-2026", approvalRemarks: "Approved after verification." },
  { id: 6, student: CAMPUS_TRANSFER_STUDENTS[1], fromCampus: "North Campus", toCampus: "Main Campus (HQ)", requestedBy: "Administrator - North Campus", requestedTo: "Principal - Main Campus", requestDate: "29-09-2026", effectiveDate: "08-10-2026", reason: "Parent Request", remarks: "Requested by the parent.", status: "Pending" },
];

const getMasterFailureMessage = (responses, names) => {
  const failures = responses
    .map((result, index) => result.status === "rejected" ? { name: names[index], error: result.reason } : null)
    .filter(Boolean);
  if (!failures.length) return "";
  const statuses = failures.map(({ error }) => error?.response?.status);
  if (statuses.some((status) => status === 502) || failures.some(({ error }) => !error?.response)) {
    return "Unable to connect to the server. Please check your network connection and try again.";
  }
  if (statuses.some((status) => status === 401)) return "Your session has expired. Please sign in again.";
  if (statuses.some((status) => status === 403)) return "Your account is not permitted to load Promotion master data.";
  return `Unable to load ${failures.map(({ name }) => name).join(", ")}. Other live master data remains available.`;
};

const normalizeStudent = (item) => {
  const id = read(item, "studentId", "StudentId", "id", "Id");
  const eligibleFlag = read(item, "isEligible", "IsEligible", "eligible", "Eligible");
  const eligibility = asString(read(item, "eligibilityStatus", "EligibilityStatus", "eligibility", "status", "Status"));
  return {
    raw: item,
    id: numericId(id) ?? id,
    admissionNo: read(item, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo", "admissionNumberNo", "AdmissionNumberNo", "studentCode", "StudentCode") || "-",
    name: read(item, "studentName", "StudentName", "fullName", "FullName", "name", "Name") || "-",
    academicYear: read(item, "academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "sourceAcademicYearName", "SourceAcademicYearName", "currentAcademicYear", "CurrentAcademicYear") || "-",
    academicYearId: read(item, "academicYearId", "AcademicYearId"),
    board: read(item, "boardName", "BoardName", "sourceBoardName", "SourceBoardName", "board", "Board") || "-",
    boardId: read(item, "boardId", "BoardId"),
    level: read(item, "academicLevel", "AcademicLevel", "sourceAcademicLevel", "SourceAcademicLevel", "level", "Level") || "-",
    levelId: read(item, "academicLevelId", "AcademicLevelId"),
    group: read(item, "groupName", "GroupName", "sourceGroupName", "SourceGroupName", "group", "Group") || "-",
    groupId: read(item, "groupId", "GroupId", "sourceGroupId", "SourceGroupId"),
    program: read(item, "programName", "ProgramName", "sourceProgramName", "SourceProgramName", "program", "Program") || "-",
    programId: read(item, "programId", "ProgramId", "sourceProgramId", "SourceProgramId"),
    section: read(item, "sectionName", "SectionName", "sourceSection", "SourceSection", "section", "Section") || "-",
    medium: read(item, "medium", "Medium", "sourceMedium", "SourceMedium") || "-",
    eligibility: eligibility || (eligibleFlag === false ? "Not Eligible" : "-"),
    eligibleFlag,
    reason: read(item, "eligibilityReason", "EligibilityReason", "reason", "Reason", "remarks", "Remarks") || "",
  };
};

const normalizeHistory = (item) => ({
  raw: item,
  id: numericId(read(item, "promotionId", "PromotionId", "id", "Id")) ?? read(item, "promotionId", "PromotionId", "id", "Id"),
  studentId: read(item, "studentId", "StudentId"),
  student: read(item, "studentName", "StudentName", "name", "Name") || "-",
  admissionNo: read(item, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo", "studentCode", "StudentCode") || "-",
  sourceYear: read(item, "sourceAcademicYear", "SourceAcademicYear", "sourceAcademicYearName", "SourceAcademicYearName", "academicYearName", "AcademicYearName") || "-",
  sourceLevel: read(item, "sourceAcademicLevel", "SourceAcademicLevel", "academicLevel", "AcademicLevel") || "-",
  sourceGroup: read(item, "sourceGroupName", "SourceGroupName", "groupName", "GroupName") || "-",
  sourceSection: read(item, "sourceSection", "SourceSection", "section", "Section") || "-",
  targetYear: read(item, "targetAcademicYear", "TargetAcademicYear", "targetAcademicYearName", "TargetAcademicYearName") || "-",
  targetLevel: read(item, "targetAcademicLevel", "TargetAcademicLevel") || "-",
  targetGroup: read(item, "targetGroupName", "TargetGroupName") || "-",
  targetSection: read(item, "targetSection", "TargetSection") || "-",
  date: read(item, "promotionDate", "PromotionDate", "createdAt", "CreatedAt") ? String(read(item, "promotionDate", "PromotionDate", "createdAt", "CreatedAt")).split("T")[0] : "-",
  status: read(item, "promotionStatus", "PromotionStatus", "status", "Status") || "-",
  promotedBy: read(item, "promotedBy", "PromotedBy", "promotedByName", "PromotedByName") || "System",
  canRollback: read(item, "canRollback", "CanRollback") !== false && !read(item, "isRolledBack", "IsRolledBack", "rollbackStatus", "RollbackStatus"),
});

const isEligible = (student) => {
  if (!student) return false;
  const status = (student.eligibilityStatus || "").toLowerCase();
  return status === "eligible" || status === "";
};

export default function PromotionPage({ screen = "promotion" }) {
  const navigate = useNavigate();
  const [localTab, setLocalTab] = useState("");
  const activeTab = localTab || screen;

  // Consume global Board & Academic Year from Navbar Context
  const {
    selectedBoardId,
    selectedBoard,
    selectedAcademicYearId,
    selectedAcademicYear,
  } = useAcademicContext();

  const campusCtx = useCampusContext();
  const activeCampusId = campusCtx?.selectedCampus?.campusId || campusCtx?.selectedCampus?.id || null;

  const [allocationTab, setAllocationTab] = useState("program");
  const [setup, setSetup] = useState(EMPTY_SETUP);
  const [masters, setMasters] = useState({ years: [], boards: [], levels: [], groups: [], sections: [] });
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterError, setMasterError] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [individualStudent, setIndividualStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyFilters, setHistoryFilters] = useState(EMPTY_HISTORY_FILTERS);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [rollbackRecord, setRollbackRecord] = useState(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);
  const eligibleController = useRef(null);

  const loadMasters = useCallback(async () => {
    setMasterLoading(true);
    setMasterError("");
    try {
      const responses = await Promise.allSettled([
        apiClient.get(apiEndpoints.academicYears.getAll),
        apiClient.get(apiEndpoints.boards.list),
        apiClient.get(apiEndpoints.boards.academicLevels),
        apiClient.get(apiEndpoints.groups.list),
        apiClient.get(apiEndpoints.sections.list),
      ]);
      const dataAt = (index) => responses[index].status === "fulfilled" ? responses[index].value.data : [];
      const [yearsData, boardsData, levelsData, groupsData, sectionsData] = responses.map((_, index) => dataAt(index));
      const groupItems = unwrap(groupsData);
      const sectionItems = unwrap(sectionsData);
      const levels = unwrap(levelsData, ["academicLevels", "AcademicLevels"]).map((item) => ({
        ...option(typeof item === "string" ? item : read(item, "academicLevelId", "AcademicLevelId", "id", "Id", "academicLevelName", "AcademicLevelName", "levelName", "LevelName"), typeof item === "string" ? item : read(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "academicLevel", "AcademicLevel", "name", "Name")),
        board: asString(read(item, "boardId", "BoardId")),
        year: asString(read(item, "academicYearId", "AcademicYearId")),
      })).filter((item) => item.value);
      const groups = groupItems.map((item) => ({
        ...option(read(item, "groupId", "GroupId", "id", "Id"), read(item, "groupName", "GroupName", "name", "Name")),
        board: asString(read(item, "boardId", "BoardId")),
        level: asString(read(item, "academicLevel", "AcademicLevel", "academicLevelName", "AcademicLevelName")),
        levelId: asString(read(item, "academicLevelId", "AcademicLevelId")),
        year: asString(read(item, "academicYearId", "AcademicYearId")),
        programs: unwrap(item, ["programs", "Programs"]).map((program) => option(read(program, "programId", "ProgramId", "id", "Id"), read(program, "programName", "ProgramName", "name", "Name"))).filter((program) => numericId(program.value)),
      })).filter((item) => numericId(item.value));
      const sections = sectionItems.map((item) => ({
        value: asString(read(item, "sectionName", "SectionName", "name", "Name", "section", "Section", "sectionId", "SectionId", "id", "Id")),
        label: asString(read(item, "sectionName", "SectionName", "name", "Name", "section", "Section")),
        group: asString(read(item, "groupId", "GroupId")),
        level: asString(read(item, "academicLevelId", "AcademicLevelId")),
        board: asString(read(item, "boardId", "BoardId")),
        year: asString(read(item, "academicYearId", "AcademicYearId")),
        program: asString(read(item, "programId", "ProgramId", "groupProgramId", "GroupProgramId")),
      })).filter((item) => item.value);
      const boardOptions = unwrap(boardsData).map((item) => {
        const ids = read(item, "academicLevelIds", "AcademicLevelIds");
        const names = read(item, "academicLevelNames", "AcademicLevelNames", "academicLevels", "AcademicLevels");
        return {
          ...option(read(item, "boardId", "BoardId", "id", "Id"), read(item, "boardName", "BoardName", "name", "Name")),
          academicLevelIds: Array.isArray(ids) ? ids.map(asString) : [],
          academicLevelNames: Array.isArray(names) ? names.map((level) => asString(typeof level === "object" ? read(level, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name") : level)) : [],
          active: read(item, "isActive", "IsActive", "active", "Active") === true || /^active$/i.test(asString(read(item, "status", "Status"))),
        };
      }).filter((item) => numericId(item.value) && item.active);

      setMasters({
        years: unwrap(yearsData).map((item) => ({
          ...option(read(item, "academicYearId", "AcademicYearId", "id", "Id"), read(item, "academicYear", "AcademicYear", "academicYearName", "AcademicYearName", "name", "Name")),
          board: asString(read(item, "boardId", "BoardId")),
          active: read(item, "isActive", "IsActive") === true || /^active$/i.test(asString(read(item, "status", "Status"))),
        })).filter((item) => numericId(item.value)),
        boards: boardOptions,
        levels,
        groups,
        sections,
      });
      setMasterError(getMasterFailureMessage(responses, ["academic years", "boards", "academic levels", "groups", "sections"]));
    } catch (requestError) {
      setMasterError(getApiErrorMessage(requestError));
    } finally {
      setMasterLoading(false);
    }
  }, []);

  useEffect(() => { loadMasters(); }, [loadMasters]);

  useEffect(() => () => eligibleController.current?.abort(), []);

  // Dynamically load programs for groups
  useEffect(() => {
    const groupIds = unique([setup.group, historyFilters.groupId]);
    if (!groupIds.length) return undefined;
    let active = true;
    setMasters((current) => ({
      ...current,
      groups: current.groups.map((group) => groupIds.includes(group.value) ? { ...group, programs: [] } : group),
    }));
    Promise.allSettled(groupIds.map((groupId) => apiClient.get(apiEndpoints.groups.programs(groupId))))
      .then((results) => {
        if (!active) return;
        setMasters((current) => ({
          ...current,
          groups: current.groups.map((group) => {
            const index = groupIds.indexOf(group.value);
            const result = results[index];
            if (index < 0 || result?.status !== "fulfilled") return group;
            const programs = unwrap(result.value.data)
              .map((program) => option(
                read(program, "programId", "ProgramId", "id", "Id", "groupProgramId", "GroupProgramId"),
                read(program, "programName", "ProgramName", "programme", "Programme", "program", "Program", "name", "Name"),
              ))
              .filter((program) => numericId(program.value));
            return { ...group, programs };
          }),
        }));
      });
    return () => { active = false; };
  }, [historyFilters.groupId, setup.group]);

  // Derive the next academic year automatically from the current navbar year
  const nextAcademicYearObj = useMemo(() => {
    if (!selectedAcademicYear && !selectedAcademicYearId) return null;
    const currentLabel = selectedAcademicYear?.label || selectedAcademicYear?.name || "";
    const currentRange = academicYearRange(currentLabel);
    if (currentRange && masters.years.length) {
      const found = masters.years.find((y) => {
        const r = academicYearRange(y.label);
        return r && r.start === currentRange.start + 1;
      });
      if (found) return found;
    }
    // Fallback: look for 2027-2028 or year with label ending in +1
    const nextByPattern = masters.years.find((y) => /2027\s*[-/]\s*2028/i.test(y.label));
    if (nextByPattern) return nextByPattern;
    return null;
  }, [masters.years, selectedAcademicYear, selectedAcademicYearId]);

  // Synchronize setup directly whenever navbar Board or Academic Year changes
  useEffect(() => {
    if (!selectedBoardId && !selectedAcademicYearId) return;
    const targetYearId = nextAcademicYearObj?.value || "";
    setSetup((current) => ({
      ...current,
      board: asString(selectedBoardId),
      fromYear: asString(selectedAcademicYearId),
      toBoard: asString(selectedBoardId),
      toYear: asString(targetYearId),
      fromLevel: "",
      group: "",
      program: "",
      fromSection: "",
      toLevel: "",
      toGroup: "",
      toProgram: "",
      toSection: "",
    }));
    setFieldErrors({});
    setStudentsLoaded(false);
    setStudents([]);
    setSelectedIds([]);
    setHistoryLoaded(false);
    setReportLoaded(false);
    setError("");
  }, [selectedBoardId, selectedAcademicYearId, nextAcademicYearObj, activeCampusId]);

  // Resolve academic levels associated with the active board
  const boardLevels = useMemo(() => {
    const boardValue = setup.board || asString(selectedBoardId);
    const activeBoard = masters.boards.find((b) => String(b.value) === String(boardValue) || String(b.id) === String(boardValue));
    if (!activeBoard) return masters.levels;
    const matched = masters.levels.filter((level) => {
      if (level.board && String(level.board) === String(boardValue)) return true;
      if (activeBoard.academicLevelIds?.length && activeBoard.academicLevelIds.includes(String(level.value))) return true;
      if (activeBoard.academicLevelNames?.length && activeBoard.academicLevelNames.some((n) => n.toLowerCase() === level.label.toLowerCase())) return true;
      return false;
    });
    return matched.length ? matched : masters.levels;
  }, [masters.boards, masters.levels, selectedBoardId, setup.board]);

  // Filter levels for the active navbar board & academic year
  const levelsFor = useCallback((prefix) => {
    if (prefix === "to") {
      const sourceObj = boardLevels.find((l) => String(l.value) === String(setup.fromLevel));
      const sourceLabel = sourceObj?.label || "";
      if (/1st|first|\b1\b/i.test(sourceLabel)) {
        const secondYearLevels = boardLevels.filter((l) => /2nd|second|\b2\b/i.test(l.label));
        if (secondYearLevels.length > 0) return secondYearLevels;
      }
      return boardLevels.filter((l) => String(l.value) !== String(setup.fromLevel));
    }
    return boardLevels;
  }, [boardLevels, setup.fromLevel]);

  // Filter groups for the active navbar board, academic year, and chosen level
  const groupsFor = useCallback((prefix) => masters.groups.filter((group) => {
    const boardValue = setup.board || asString(selectedBoardId);
    const yearValue = setup.fromYear || asString(selectedAcademicYearId);
    const levelValue = setup[prefix === "from" ? "fromLevel" : "toLevel"];
    if (!boardValue || !yearValue) return true;
    if (!levelValue) return group.board === asString(boardValue) && group.year === asString(yearValue);
    const levelLabel = masters.levels.find((level) => level.value === asString(levelValue))?.label;
    return group.board === asString(boardValue)
      && group.year === asString(yearValue)
      && (group.levelId === asString(levelValue) || group.level === asString(levelLabel));
  }), [masters.groups, masters.levels, selectedAcademicYearId, selectedBoardId, setup]);

  const programsFor = useCallback((prefix) => {
    const groupValue = setup[prefix === "from" ? "group" : "toGroup"];
    const group = masters.groups.find((item) => item.value === asString(groupValue));
    return group?.programs || [];
  }, [masters.groups, setup]);

  const sectionsFor = useCallback((prefix) => {
    const groupValue = setup[prefix === "from" ? "group" : "toGroup"];
    const groupLabel = masters.groups.find((item) => item.value === groupValue)?.label;
    const levelValue = setup[prefix === "from" ? "fromLevel" : "toLevel"];
    const programValue = setup[prefix === "from" ? "program" : "toProgram"];
    const boardValue = setup.board || asString(selectedBoardId);
    const yearValue = setup.fromYear || asString(selectedAcademicYearId);
    return masters.sections.filter((section) => (!section.group || section.group === groupValue || section.group === groupLabel)
      && (!section.level || section.level === levelValue)
      && (!programValue || !section.program || section.program === asString(programValue))
      && (!section.board || section.board === asString(boardValue))
      && (!section.year || section.year === asString(yearValue)));
  }, [masters.groups, masters.sections, selectedAcademicYearId, selectedBoardId, setup]);

  // Form fields for Source - Board & From Academic Year are REMOVED as they come from the Navbar!
  const sourceFields = useMemo(() => [
    { name: "fromLevel", label: "From Academic Level", type: "select", options: levelsFor("from"), required: true },
    { name: "group", label: "Group", type: "select", options: groupsFor("from"), required: true, disabled: !setup.fromLevel },
    { name: "program", label: "Program", type: "select", options: programsFor("from"), required: true, disabled: !setup.group },
    { name: "fromSection", label: "From Section", type: "select", options: sectionsFor("from"), required: true, disabled: !setup.program },
  ], [groupsFor, levelsFor, programsFor, sectionsFor, setup.fromLevel, setup.group, setup.program]);

  const selectedSourceLevel = masters.levels.find((level) => level.value === asString(setup.fromLevel));
  const isFinalYear = isSecondYearLevel(selectedSourceLevel?.label || setup.fromLevel);
  const destinationLevels = useMemo(() => levelsFor("to").filter((level) => !/^degree$/i.test(level.label)), [levelsFor]);
  const lockedTargetGroups = useMemo(() => masters.groups.filter((group) => group.value === asString(setup.group)), [masters.groups, setup.group]);
  const lockedTargetPrograms = useMemo(() => programsFor("from").filter((program) => program.value === asString(setup.program)), [programsFor, setup.program]);

  // Form fields for Destination - Board & To Academic Year are REMOVED (Board inherits, Target Year is automated)!
  const targetFields = useMemo(() => [
    { name: "toLevel", label: "To Academic Level", type: "select", options: destinationLevels, required: true },
    { name: "toGroup", label: "Group", type: "select", options: lockedTargetGroups, required: true, disabled: true },
    { name: "toProgram", label: "Program", type: "select", options: lockedTargetPrograms, required: true, disabled: true },
    { name: "toSection", label: "To Section", type: "select", options: sectionsFor("to"), required: true },
  ], [destinationLevels, lockedTargetGroups, lockedTargetPrograms, sectionsFor]);

  const updateSetup = (name, value) => {
    const resets = {
      fromLevel: ["group", "program", "fromSection", "toGroup", "toProgram", "toSection"],
      group: ["program", "fromSection", "toProgram", "toSection"],
      program: ["fromSection", "toSection"],
      toLevel: ["toSection"],
    };

    setSetup((current) => {
      const updated = {
        ...current,
        ...Object.fromEntries((resets[name] || []).map((key) => [key, ""])),
        [name]: value,
        ...(name === "group" ? { toGroup: value, toProgram: "" } : {}),
        ...(name === "program" ? { toProgram: value } : {}),
      };

      // Automatically suggest next academic level for this board when fromLevel is selected
      if (name === "fromLevel") {
        const sourceLevelObj = boardLevels.find((l) => String(l.value) === String(value));
        const sourceLabel = sourceLevelObj?.label || value;
        if (/1st|first|\b1\b/i.test(sourceLabel)) {
          const secondYear = boardLevels.find((l) => /2nd|second|\b2\b/i.test(l.label)) || boardLevels[1];
          if (secondYear) {
            updated.toLevel = secondYear.value;
          }
        }
      }

      return updated;
    });

    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
    setStudentsLoaded(false);
    setStudents([]);
    setSelectedIds([]);
    setError("");
  };

  const validateFields = (fields) => {
    const errors = {};
    fields.forEach((field) => {
      if (field.required && !setup[field.name]) errors[field.name] = `${field.label} is required.`;
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const academicLevelLabel = useCallback((levelId) => masters.levels.find((level) => level.value === asString(levelId))?.label || asString(levelId), [masters.levels]);

  const eligibleParams = useCallback(() => {
    return compactParams({
      CampusId: numericId(activeCampusId),
      AcademicYearId: numericId(setup.fromYear || selectedAcademicYearId),
      BoardId: numericId(setup.board || selectedBoardId),
      AcademicLevel: academicLevelLabel(setup.fromLevel),
      GroupId: numericId(setup.group),
      ProgramId: numericId(setup.program),
      Section: setup.fromSection,
      TargetAcademicYearId: numericId(setup.toYear || nextAcademicYearObj?.value),
      TargetAcademicLevel: academicLevelLabel(setup.toLevel),
      TargetGroupId: numericId(setup.toGroup),
      TargetSection: setup.toSection,
    });
  }, [activeCampusId, academicLevelLabel, nextAcademicYearObj?.value, selectedAcademicYearId, selectedBoardId, setup]);

  const fetchEligibleStudents = useCallback(async () => {
    setStudentsLoading(true);
    setError("");
    try {
      const data = await getEligibleStudents(eligibleParams());
      const rows = unwrap(data, ["students", "Students", "eligibleStudents", "EligibleStudents"]).map(normalizeStudent).filter((student) => isPresent(student.id));
      setStudents(rows);
      setStudentsLoaded(true);
      setSelectedIds((current) => current.filter((id) => rows.some((student) => student.id === id && isEligible(student))));
    } catch (requestError) {
      setStudents([]);
      setStudentsLoaded(true);
      setError(getApiErrorMessage(requestError));
    } finally {
      setStudentsLoading(false);
    }
  }, [eligibleParams]);

  const loadStudents = async () => {
    if (!validateFields(sourceFields)) {
      setError("Please complete the required source level, group, and section.");
      return;
    }
    await fetchEligibleStudents();
  };

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = !query || `${student.name} ${student.admissionNo} ${student.id}`.toLowerCase().includes(query);
      return matchesSearch && (!eligibilityFilter || student.eligibility === eligibilityFilter);
    });
  }, [eligibilityFilter, search, students]);

  const selectedStudents = useMemo(() => students.filter((student) => selectedIds.includes(student.id) && isEligible(student)), [selectedIds, students]);
  const eligibleStudents = useMemo(() => students.filter(isEligible), [students]);
  const summary = useMemo(() => ({ eligible: eligibleStudents.length, ineligible: students.length - eligibleStudents.length }), [eligibleStudents.length, students.length]);

  const buildPayload = () => ({
    sourceAcademicYearId: numericId(setup.fromYear || selectedAcademicYearId),
    sourceAcademicLevelId: numericId(setup.fromLevel),
    sourceAcademicLevel: academicLevelLabel(setup.fromLevel),
    sourceGroupId: numericId(setup.group),
    sourceProgramId: numericId(setup.program),
    sourceSection: setup.fromSection,
    targetAcademicYearId: numericId(setup.toYear || nextAcademicYearObj?.value),
    targetAcademicLevelId: numericId(setup.toLevel),
    targetAcademicLevel: academicLevelLabel(setup.toLevel),
    targetGroupId: numericId(setup.toGroup),
    targetProgramId: numericId(setup.toProgram),
    targetSection: setup.toSection,
    studentIds: selectedStudents.map((student) => numericId(student.id)).filter(Boolean),
  });

  const validatePromotion = () => {
    if (!nextAcademicYearObj && !setup.toYear) {
      setError("Destination academic year could not be found. Please ensure the next academic year is configured.");
      return false;
    }
    if (!validateFields([...sourceFields, ...targetFields])) {
      setError("Please complete the required source and destination details.");
      return false;
    }
    if (String(setup.group) !== String(setup.toGroup) || String(setup.program) !== String(setup.toProgram)) {
      setFieldErrors((current) => ({ ...current, toGroup: "Target Group must match Source Group.", toProgram: "Target Program must match Source Program." }));
      setError("Target Group and Program must match the Source configuration.");
      return false;
    }
    if (!selectedIds.length) {
      setError("Please select at least one eligible student.");
      return false;
    }
    if (selectedStudents.length !== selectedIds.length) {
      setError("Only eligible students can be promoted.");
      return false;
    }
    if (!buildPayload().studentIds.length) {
      setError("Selected students do not contain valid backend IDs.");
      return false;
    }
    setError("");
    return true;
  };

  const openPreview = async () => {
    if (!validatePromotion()) return;
    setPreviewLoading(true);
    setError("");
    try {
      const data = await previewPromotion(buildPayload());
      setPreviewData(unwrapObject(data));
    } catch (previewError) {
      setPreviewData(null);
      setError(previewError?.code === "ECONNABORTED" ? "Promotion preview timed out. Please check that the promotion API is running and try again." : getApiErrorMessage(previewError));
    } finally {
      setPreviewLoading(false);
    }
  };

  const refreshAfterMutation = async () => {
    setSelectedIds([]);
    await Promise.all([fetchEligibleStudents(), fetchHistory()]);
  };

  const confirmPromotion = async () => {
    if (submitting || !validatePromotion()) return;
    setSubmitting(true);
    try {
      const res = await promoteStudents(buildPayload());
      const batchId = read(unwrapObject(res), "promotionBatchId", "PromotionBatchId");
      setPreviewData(null);
      setToast(`Promotion completed successfully${batchId ? `. Batch ID: ${batchId}` : "."}`);
      await refreshAfterMutation();
    } catch (promotionError) {
      setError(getApiErrorMessage(promotionError));
    } finally {
      setSubmitting(false);
    }
  };

  const promoteIndividual = async () => {
    if (!individualStudent || submitting || !validateFields(targetFields)) return;
    const studentId = numericId(individualStudent.id);
    if (!studentId) { setError("This student does not contain a valid backend ID."); return; }
    setSubmitting(true);
    try {
      await promoteSingleStudent(studentId, {
        targetAcademicYearId: numericId(setup.toYear || nextAcademicYearObj?.value),
        targetAcademicLevel: academicLevelLabel(setup.toLevel),
        targetGroupId: numericId(setup.toGroup),
        targetSection: setup.toSection,
      });
      setIndividualStudent(null);
      setToast("Student promoted successfully.");
      await refreshAfterMutation();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError("");
    try {
      const rows = await getPromotionHistory(compactParams({
        campusId: numericId(activeCampusId),
        academicYearId: numericId(historyFilters.academicYearId || selectedAcademicYearId),
        academicLevel: historyFilters.academicLevel,
        groupId: numericId(historyFilters.groupId),
        programId: numericId(historyFilters.programId),
        section: historyFilters.section,
        studentId: numericId(historyFilters.studentId),
        search: historyFilters.search.trim(),
        promotionStatus: historyFilters.promotionStatus,
        fromDate: historyFilters.fromDate,
        toDate: historyFilters.toDate,
      }));
      setHistory(unwrap(rows, ["history", "History", "promotions", "Promotions"]).map(normalizeHistory));
      setHistoryLoaded(true);
    } catch (requestError) {
      setHistory([]);
      setHistoryLoaded(true);
      setError(getApiErrorMessage(requestError));
    } finally {
      setHistoryLoading(false);
    }
  }, [activeCampusId, historyFilters, selectedAcademicYearId]);

  useEffect(() => {
    if (activeTab === "history" && !historyLoaded) fetchHistory();
  }, [activeTab, fetchHistory, historyLoaded]);

  const rollback = async () => {
    if (!rollbackReason.trim()) { setError("Enter a reason for rollback."); return; }
    const promotionId = numericId(rollbackRecord?.id);
    if (!promotionId) { setError("This record does not contain a valid backend Promotion ID."); return; }
    setRollbackLoading(true);
    try {
      await rollbackPromotion({ promotionId, reason: rollbackReason.trim() });
      setRollbackRecord(null);
      setRollbackReason("");
      setToast("Promotion rolled back successfully.");
      await fetchHistory();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setRollbackLoading(false);
    }
  };

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    setError("");
    try {
      const res = await getPromotionReport(compactParams({
        campusId: numericId(activeCampusId),
        academicYearId: numericId(selectedAcademicYearId),
      }));
      const data = unwrapObject(res);
      setReportData(data);
      setReportRows(unwrap(data, ["details", "Details"]).map(normalizeHistory));
      setReportLoaded(true);
    } catch (requestError) {
      setReportRows([]);
      setReportLoaded(true);
      setError(getApiErrorMessage(requestError));
    } finally {
      setReportLoading(false);
    }
  }, [activeCampusId, selectedAcademicYearId]);

  useEffect(() => {
    if (activeTab === "report" && !reportLoaded) fetchReport();
  }, [activeTab, fetchReport, reportLoaded]);

  const exportCsv = () => {
    if (!reportRows.length) return;
    const headers = ["Promotion ID", "Student Name", "Admission No", "Source Academic Details", "Target Academic Details", "Promotion Date", "Status", "Promoted By"];
    const lines = reportRows.map((r) => [
      r.id ?? "",
      `"${(r.student || "").replace(/"/g, '""')}"`,
      `"${(r.admissionNo || "").replace(/"/g, '""')}"`,
      `"${[r.sourceYear, r.sourceLevel, r.sourceGroup, r.sourceSection].filter((v) => v !== "-").join(" - ")}"`,
      `"${[r.targetYear, r.targetLevel, r.targetGroup, r.targetSection].filter((v) => v !== "-").join(" - ")}"`,
      r.date || "",
      `"${(r.status || "").replace(/"/g, '""')}"`,
      `"${(r.promotedBy || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...lines.map((l) => l.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Promotion_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const setHistoryFilter = (name, value) => setHistoryFilters((current) => ({
    ...current,
    [name]: value,
    ...(name === "groupId" ? { programId: "", section: "" } : {}),
    ...(name === "programId" ? { section: "" } : {}),
  }));

  const historyGroup = masters.groups.find((group) => group.value === asString(historyFilters.groupId));
  const historyPrograms = historyGroup?.programs || [];
  const historySections = masters.sections.filter((section) => (!section.group || section.group === asString(historyFilters.groupId) || section.group === historyGroup?.label) && (!historyFilters.programId || !section.program || section.program === asString(historyFilters.programId)));
  const previewStudents = unwrap(previewData, ["students", "Students", "eligibleStudents", "EligibleStudents"]);
  const previewEligibleCount = read(previewData, "eligibleCount", "EligibleCount") ?? (previewStudents.length ? previewStudents.filter((student) => isEligible(normalizeStudent(student))).length : selectedStudents.length);

  return (
    <DashboardLayout
      title={
        activeTab === "promotion" ? "Student Promotion" :
        activeTab === "single" ? "Single Student Promotion" :
        activeTab === "allocation" ? "Program & Section Allocation" :
        activeTab === "transfer" ? "Campus Transfer" :
        activeTab === "history" ? "Promotion History" :
        "Promotion Reports"
      }
      subtitle="Manage student promotions, program tracks, and section allocations."
      breadcrumb={["Academics", "Promotion"]}
    >
      <div className="promotion-page">
        <nav className="promotion-tabs" aria-label="Promotion sections">
          {[
            ["promotion", "Student Promotion", "/dashboard/promotions/eligible"],
            ["single", "Single Student", "/dashboard/promotions/single"],
            ["allocation", "Program & Section Allocation", "/dashboard/promotions/allocation"],
            ["transfer", "Campus Transfer", null],
            ["history", "Promotion History", "/dashboard/promotions/history"],
          ].map(([value, label, path]) => (
            <button
              key={value}
              className={activeTab === value ? "is-active" : ""}
              onClick={() => {
                setError("");
                if (value === "transfer") setLocalTab("transfer");
                else {
                  setLocalTab("");
                  navigate(path);
                }
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {error ? <div className="promotion-error" role="alert">{error}</div> : null}

        {activeTab === "promotion" ? (
          <>
            <section className="cms-card promotion-card">
              <div className="cms-card-head">
                <div>
                  <h2>1. Promotion Setup</h2>
                  <p>Configure the student cohort level, group, and section for promotion.</p>
                </div>
                <button className="cms-btn cms-btn-ghost" onClick={loadMasters} disabled={masterLoading}>
                  {masterLoading ? "Loading..." : <><RefreshCw size={16} aria-hidden="true" /> Refresh</>}
                </button>
              </div>

              <div className="promotion-context-wrap">
                <div className="promotion-context-row">
                  <div className="promotion-context-board">
                    <span className="promotion-context-label">Board</span>
                    <strong>{selectedBoard?.name || selectedBoard?.code || "Board of Intermediate Education, AP"}</strong>
                  </div>

                  <div className="promotion-context-year">
                    <span className="promotion-context-label">Source Academic Year</span>
                    <strong>{selectedAcademicYear?.label || selectedAcademicYear?.name || "2026-2027"}</strong>
                  </div>
                  <span className="promotion-context-arrow" aria-hidden="true"><ArrowRight size={18} /></span>
                  <div className={`promotion-context-year promotion-context-destination${nextAcademicYearObj ? " is-auto" : " is-missing"}`}>
                    <span className="promotion-context-label">Destination Academic Year</span>
                    <strong>{nextAcademicYearObj ? `${nextAcademicYearObj.label} (Auto)` : "2027-2028 (Default)"}</strong>
                  </div>
                </div>
              </div>

              <div className="cms-card-body promotion-setup-grid">
                <div className="promotion-flow-panel">
                  <h3>Current / Source Details</h3>
                  <div className="promotion-field-grid">
                    {sourceFields.map((field) => (
                      <Field
                        key={field.name}
                        field={{ ...field, disabled: masterLoading || field.disabled }}
                        value={setup[field.name]}
                        error={fieldErrors[field.name]}
                        onChange={updateSetup}
                      />
                    ))}
                  </div>
                </div>

                <div className="promotion-arrow" aria-hidden="true">→</div>

                {isFinalYear ? (
                  <div className="promotion-flow-panel promotion-completion-panel">
                    <h3>Course Completion</h3>
                    <p>Second year students transition upon board examination and course completion.</p>
                  </div>
                ) : (
                  <div className="promotion-flow-panel">
                    <h3>Destination Details</h3>
                    <div className="promotion-field-grid">
                      {targetFields.map((field) => (
                        <Field
                          key={field.name}
                          field={{ ...field, disabled: masterLoading || field.disabled }}
                          value={setup[field.name]}
                          error={fieldErrors[field.name]}
                          onChange={updateSetup}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="promotion-actions">
                <button
                  className="cms-btn cms-btn-primary"
                  onClick={loadStudents}
                  disabled={masterLoading || studentsLoading}
                >
                  {studentsLoading ? "Loading..." : "Load Students"}
                </button>
                <button
                  className="cms-btn cms-btn-ghost"
                  onClick={() => {
                    setSetup((c) => ({
                      ...c,
                      fromLevel: "",
                      group: "",
                      program: "",
                      fromSection: "",
                      toLevel: "",
                      toGroup: "",
                      toProgram: "",
                      toSection: "",
                    }));
                    setStudents([]);
                    setStudentsLoaded(false);
                    setSelectedIds([]);
                    setSearch("");
                    setFieldErrors({});
                    setError("");
                  }}
                >
                  Clear Selection
                </button>
              </div>
            </section>

            <section className="cms-card promotion-card">
              <div className="cms-card-head promotion-table-head">
                <div>
                  <h2>2. Student Eligibility</h2>
                  <p>
                    {studentsLoaded
                      ? `${students.length} student${students.length === 1 ? "" : "s"} returned by the Promotion API.`
                      : "Select the cohort level, group, and section above, then click Load Students."}
                  </p>
                </div>
                <span className="cms-badge cms-badge-info">Selected Students: {selectedIds.length}</span>
              </div>
              <div className="promotion-table-controls">
                <input
                  aria-label="Search students"
                  placeholder="Search student name, admission number, or ID"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button className="cms-btn cms-btn-ghost" onClick={loadStudents} disabled={studentsLoading}>
                  Search
                </button>
                <button
                  className="cms-btn cms-btn-ghost"
                  onClick={() => setSelectedIds(visibleStudents.map((student) => student.id))}
                  disabled={!visibleStudents.length}
                >
                  Select All
                </button>
                <button className="cms-btn cms-btn-ghost" onClick={() => setSelectedIds([])}>
                  Clear
                </button>
              </div>
              {studentsLoading ? (
                <SkeletonTable columns={isFinalYear ? 9 : 10} rows={6} />
              ) : studentsLoaded ? (
                <div className="cms-table-wrap">
                  <table className="cms-table promotion-table">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Admission No.</th>
                        <th>Student Name</th>
                        <th>Academic Year</th>
                        <th>Board</th>
                        <th>Level</th>
                        <th>Group</th>
                        <th>Section</th>
                        <th>Medium</th>
                        {!isFinalYear ? <th>Action</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStudents.length ? (
                        visibleStudents.map((student) => (
                          <tr key={student.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(student.id)}
                                onChange={() =>
                                  setSelectedIds((current) =>
                                    current.includes(student.id)
                                      ? current.filter((id) => id !== student.id)
                                      : [...current, student.id]
                                  )
                                }
                              />
                            </td>
                            <td className="cms-strong">{student.admissionNo}</td>
                            <td>{student.name}</td>
                            <td>{student.academicYear}</td>
                            <td>{student.board}</td>
                            <td>{student.level}</td>
                            <td>{student.group}</td>
                            <td>{student.section}</td>
                            <td>{student.medium}</td>
                            {!isFinalYear ? (
                              <td>
                                <button
                                  className="cms-action-link"
                                  onClick={() => setIndividualStudent(student)}
                                >
                                  Promote
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isFinalYear ? 9 : 10} className="promotion-empty">
                            No students found for the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="promotion-empty">Select the source details, then load students.</div>
              )}
            </section>

            {studentsLoaded ? (
              <section className="promotion-summary" style={{ gridTemplateColumns: "repeat(2, minmax(100px, 1fr))" }}>
                <div><span>Total Students</span><strong>{students.length}</strong></div>
                <div><span>Selected</span><strong>{selectedIds.length}</strong></div>
              </section>
            ) : null}

            {!isFinalYear ? (
              <div className="promotion-final-actions">
                <button
                  className="cms-btn cms-btn-primary"
                  onClick={openPreview}
                  disabled={!selectedIds.length || previewLoading || submitting}
                >
                  {previewLoading ? "Preparing Preview..." : "Preview Promotion"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {activeTab === "single" ? (
          <SinglePromotionScreen
            masters={masters}
            preselectedStudent={individualStudent || students.find(isEligible)}
            allStudents={students}
            defaultNextYearId={nextAcademicYearObj?.value}
            onPromoteSuccess={(name) => {
              setToast(`Student ${name ? `(${name}) ` : ""}promotion completed successfully.`);
              refreshAfterMutation();
            }}
          />
        ) : null}

        {activeTab === "allocation" ? (
          <AllocationScreen
            activeTab={allocationTab}
            setActiveTab={setAllocationTab}
            masters={masters}
            setup={setup}
            students={students}
            defaultNextYearId={nextAcademicYearObj?.value}
            onSaved={(actionName) => setToast(`${actionName} allocation updated successfully.`)}
            onReloadCohort={loadStudents}
          />
        ) : null}

        {activeTab === "transfer" ? <CampusTransferScreen onSuccess={setToast} /> : null}

        {activeTab === "history" ? (
          <section className="cms-card promotion-card">
            <div className="cms-card-head">
              <div>
                <h2>Promotion History</h2>
                <p>Search completed promotion activity and roll back supported records.</p>
              </div>
            </div>
            <div className="cms-card-body promotion-history-filters">
              {[
                { name: "academicYearId", label: "Source Year", type: "select", options: uniqueAcademicYearsByName(masters.years, (year) => year.label) },
                { name: "academicLevel", label: "Source Level", type: "select", options: masters.levels },
                { name: "groupId", label: "Source Group", type: "select", options: masters.groups },
                { name: "programId", label: "Source Program", type: "select", options: historyPrograms, disabled: !historyFilters.groupId },
                { name: "section", label: "Source Section", type: "select", options: historySections, disabled: !historyFilters.programId },
                { name: "studentId", label: "Student ID", type: "number" },
                { name: "search", label: "Search" },
                { name: "promotionStatus", label: "Promotion Status" },
              ].map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={historyFilters[field.name]}
                  onChange={setHistoryFilter}
                />
              ))}
              <HistoryDateRange
                fromDate={historyFilters.fromDate}
                toDate={historyFilters.toDate}
                onChange={setHistoryFilter}
              />
            </div>
            <div className="promotion-actions">
              <button
                className="cms-btn cms-btn-ghost"
                onClick={() => { setHistoryFilters(EMPTY_HISTORY_FILTERS); setHistoryLoaded(false); }}
              >
                Clear Filters
              </button>
              <button
                className="cms-btn cms-btn-primary"
                onClick={fetchHistory}
                disabled={historyLoading}
              >
                {historyLoading ? "Loading..." : "Load History"}
              </button>
            </div>
            {historyLoading ? (
              <SkeletonTable columns={8} rows={6} />
            ) : historyLoaded ? (
              <HistoryTable rows={history} onRollback={setRollbackRecord} />
            ) : null}
          </section>
        ) : null}

      </div>

      {previewData ? (
        <Modal
          title="Promotion Preview"
          onClose={() => setPreviewData(null)}
          footer={
            <>
              <button className="cms-btn cms-btn-ghost" onClick={() => setPreviewData(null)} disabled={submitting}>
                Cancel
              </button>
              <button className="cms-btn cms-btn-primary" onClick={confirmPromotion} disabled={submitting}>
                {submitting ? "Promoting..." : "Confirm Promotion"}
              </button>
            </>
          }
        >
          <div className="promotion-preview-details">
            <div>
              <span>Source</span>
              <strong>
                {[
                  selectedAcademicYear?.label || selectedAcademicYear?.name || "2026-2027",
                  selectedBoard?.name || "BIEAP",
                  setup.fromLevel,
                  masters.groups.find((item) => item.value === setup.group)?.label,
                  setup.fromSection && `Section ${setup.fromSection}`,
                ].filter(Boolean).join(" • ")}
              </strong>
            </div>
            <div>
              <span>Destination</span>
              <strong>
                {[
                  nextAcademicYearObj ? nextAcademicYearObj.label : "2027-2028",
                  selectedBoard?.name || "BIEAP",
                  setup.toLevel,
                  masters.groups.find((item) => item.value === setup.toGroup)?.label,
                  setup.toSection && `Section ${setup.toSection}`,
                ].filter(Boolean).join(" • ")}
              </strong>
            </div>
            <div><span>Selected Students</span><strong>{selectedIds.length}</strong></div>
            <div><span>Eligible Students</span><strong>{previewEligibleCount}</strong></div>
            <div><span>Not Eligible Students</span><strong>{read(previewData, "notEligibleCount", "NotEligibleCount", "ineligibleCount", "IneligibleCount") ?? 0}</strong></div>
          </div>
          {previewStudents.length ? (
            <ul className="promotion-preview-list">
              {previewStudents.map((student, index) => (
                <li key={read(student, "studentId", "StudentId", "id", "Id") ?? index}>
                  {read(student, "studentName", "StudentName", "name", "Name") || read(student, "admissionNumber", "AdmissionNumber") || `Student ${index + 1}`}
                  {read(student, "eligibilityStatus", "EligibilityStatus", "reason", "Reason") ? ` — ${read(student, "eligibilityStatus", "EligibilityStatus", "reason", "Reason")}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="promotion-preview-copy">The backend preview completed successfully for the selected students.</p>
          )}
        </Modal>
      ) : null}

      {individualStudent ? (
        <Modal
          title="Promote Student"
          size="sm"
          onClose={() => setIndividualStudent(null)}
          footer={
            <>
              <button className="cms-btn cms-btn-ghost" onClick={() => setIndividualStudent(null)} disabled={submitting}>
                Cancel
              </button>
              <button
                className="cms-btn cms-btn-primary"
                onClick={promoteIndividual}
                disabled={submitting}
              >
                {submitting ? "Promoting..." : "Promote Student"}
              </button>
            </>
          }
        >
          <div className="promotion-confirm-copy">
            <p>Promote this student to the selected Target configuration?</p>
            <strong>{individualStudent.name}</strong>
            <p>{individualStudent.admissionNo}</p>
          </div>
        </Modal>
      ) : null}

      {rollbackRecord ? (
        <Modal
          title="Rollback Promotion"
          size="sm"
          onClose={() => setRollbackRecord(null)}
          footer={
            <>
              <button className="cms-btn cms-btn-ghost" onClick={() => setRollbackRecord(null)} disabled={rollbackLoading}>
                Cancel
              </button>
              <button
                className="cms-btn cms-btn-danger"
                onClick={rollback}
                disabled={rollbackLoading || !rollbackReason.trim()}
              >
                {rollbackLoading ? "Rolling Back..." : "Rollback"}
              </button>
            </>
          }
        >
          <div className="cms-field">
            <label htmlFor="rollback-reason">Rollback reason <span className="req">*</span></label>
            <textarea
              id="rollback-reason"
              value={rollbackReason}
              onChange={(event) => setRollbackReason(event.target.value)}
              placeholder="Enter the reason for rollback"
            />
          </div>
        </Modal>
      ) : null}

      <Toast message={masterError} type="error" onClose={() => setMasterError("")} />
      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}

function CampusTransferScreen({ onSuccess }) {
  const { selectedCampus } = useCampusContext();
  const emptyForm = { campus: "", effectiveDate: "", reason: "", remarks: "" };
  const [transferTab, setTransferTab] = useState("create");
  const [requestDirection, setRequestDirection] = useState("sent");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOpen, setStudentOpen] = useState(false);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [boardAlert, setBoardAlert] = useState(null);
  const [requests, setRequests] = useState(CAMPUS_TRANSFER_REQUESTS);
  const [requestSearch, setRequestSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [requestPage, setRequestPage] = useState(1);
  const [detailRequest, setDetailRequest] = useState(null);
  const [approveRequest, setApproveRequest] = useState(null);
  const [rejectRequest, setRejectRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [notification, setNotification] = useState(null);
  const activeCampusName = selectedCampus?.name || selectedCampus?.campusName || "Main Campus (HQ)";
  const sourceCampus = student?.campus || "Main Campus (HQ)";
  const sourceBoard = student?.board || CAMPUS_TRANSFER_OPTIONS.campuses.find((campus) => campus.name === sourceCampus)?.board || "";
  const destination = CAMPUS_TRANSFER_OPTIONS.campuses.find((campus) => campus.name === form.campus);

  const change = (name, value) => {
    if (name === "campus") {
      if (value === sourceCampus) {
        setForm((current) => ({ ...current, campus: "" }));
        setErrors((current) => ({ ...current, campus: "Destination campus must be different from source campus." }));
        return;
      }
      const selectedCampus = CAMPUS_TRANSFER_OPTIONS.campuses.find((campus) => campus.name === value);
      if (selectedCampus && !selectedCampus.board) {
        setBoardAlert({ title: "Board Not Configured", message: "No board is configured for the selected destination campus. Please configure a board before transferring the student." });
        setForm((current) => ({ ...current, campus: "" }));
        return;
      }
      if (selectedCampus && sourceBoard && selectedCampus.board !== sourceBoard) {
        setBoardAlert({ title: "Board Mismatch", sourceBoard, destinationBoard: selectedCampus.board, message: "Campus transfer is only allowed between campuses with the same board. Please select a destination campus configured with the same board." });
        setForm((current) => ({ ...current, campus: "" }));
        return;
      }
    }
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    if (!query) return CAMPUS_TRANSFER_STUDENTS;
    return CAMPUS_TRANSFER_STUDENTS.filter((item) => `${item.name} ${item.admissionNo}`.toLowerCase().includes(query));
  }, [studentQuery]);
  const validate = () => {
    const nextErrors = {};
    if (!student) nextErrors.student = "Student is required.";
    if (!form.campus) nextErrors.campus = "Destination Campus is required.";
    if (form.campus === sourceCampus) nextErrors.campus = "Destination campus must be different from source campus.";
    if (!form.effectiveDate) nextErrors.effectiveDate = "Transfer Effective Date is required.";
    if (!form.reason) nextErrors.reason = "Transfer Reason is required.";
    if (form.reason === "Other" && !form.remarks.trim()) nextErrors.remarks = "Reason / Remarks is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const sendEnabled = Boolean(student && destination?.board === sourceBoard && form.effectiveDate && form.reason && (form.reason !== "Other" || form.remarks.trim()));

  const clear = () => {
    setStudent(null);
    setStudentQuery("");
    setStudentOpen(false);
    setForm(emptyForm);
    setErrors({});
  };

  const sendRequest = () => {
    if (!validate()) return;
    if (!destination?.board || destination.board !== sourceBoard) return;
    const nextRequest = {
      id: Math.max(0, ...requests.map((request) => Number(request.id) || 0)) + 1,
      student,
      fromCampus: sourceCampus,
      toCampus: destination.name,
      requestedTo: `Principal - ${destination.name}`,
      requestedBy: `Administrator - ${sourceCampus}`,
      requestDate: "29-09-2026",
      effectiveDate: form.effectiveDate.split("-").reverse().join("-"),
      reason: form.reason,
      remarks: form.remarks,
      status: "Pending",
    };
    setRequests((current) => [nextRequest, ...current]);
    clear();
    setTransferTab("requests");
    setDetailRequest(nextRequest);
    onSuccess("Campus transfer request sent successfully. Waiting for approval.");
  };

  const sentRequests = useMemo(() => requests.filter((request) => request.fromCampus === activeCampusName), [activeCampusName, requests]);
  const receivedRequests = useMemo(() => requests.filter((request) => request.toCampus === activeCampusName), [activeCampusName, requests]);
  const directionalRequests = requestDirection === "sent" ? sentRequests : receivedRequests;
  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    return directionalRequests.filter((request) => {
      const matchesQuery = !query || `${request.student.name} ${request.student.admissionNo} ${request.fromCampus} ${request.toCampus}`.toLowerCase().includes(query);
      return matchesQuery && (statusFilter === "All" || request.status === statusFilter);
    });
  }, [directionalRequests, requestSearch, statusFilter]);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const currentPage = Math.min(requestPage, totalPages);
  const pagedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateRequest = (id, updates) => {
    let updated;
    setRequests((current) => current.map((request) => {
      if (request.id !== id) return request;
      updated = { ...request, ...updates };
      return updated;
    }));
    return { ...(requests.find((request) => request.id === id) || {}), ...updates };
  };

  const confirmApproval = () => {
    const destinationBoard = CAMPUS_TRANSFER_OPTIONS.campuses.find((campus) => campus.name === approveRequest.toCampus)?.board;
    if (!destinationBoard || destinationBoard !== approveRequest.student.board) {
      setApproveRequest(null);
      setBoardAlert({
        title: "Board Not Configured",
        sourceBoard: approveRequest.student.board,
        destinationBoard: destinationBoard || "Not configured",
        message: "This board is not configured for the destination campus. The transfer cannot be approved.",
      });
      return;
    }
    const approverName = approveRequest.requestedTo;
    const updated = updateRequest(approveRequest.id, { status: "Approved", approvedBy: approverName, approvedOn: "29-09-2026", approvalRemarks: "Approved after destination campus verification." });
    setApproveRequest(null);
    setDetailRequest(updated);
    setNotification({ type: "approved", title: "Campus Transfer Request Approved", message: `${updated.student.name}'s campus transfer request to ${updated.toCampus} has been approved.`, request: updated });
    onSuccess(`Campus transfer request approved by ${approverName}.`);
  };

  const confirmRejection = () => {
    if (!rejectionReason.trim()) { setRejectionError("Rejection reason is required."); return; }
    const approverName = rejectRequest.requestedTo;
    const updated = updateRequest(rejectRequest.id, { status: "Rejected", rejectedBy: approverName, rejectedOn: "29-09-2026", rejectionReason: rejectionReason.trim() });
    setRejectRequest(null);
    setRejectionReason("");
    setRejectionError("");
    setDetailRequest(updated);
    setNotification({ type: "rejected", title: "Campus Transfer Request Rejected", message: `Campus transfer request for ${updated.student.name} (${updated.student.admissionNo}) to ${updated.toCampus} was rejected by ${approverName}.`, request: updated });
    onSuccess(`Campus transfer request rejected by ${approverName}.`);
  };

  return (
    <>
      <section className={`cms-card promotion-card campus-transfer-card${transferTab === "requests" ? " campus-transfer-requests-card" : ""}`}>
        <div className="campus-transfer-subtabs" role="tablist">
          <button type="button" className={transferTab === "create" ? "is-active" : ""} onClick={() => setTransferTab("create")}>Create Transfer Request</button>
          <button type="button" className={transferTab === "requests" ? "is-active" : ""} onClick={() => setTransferTab("requests")}>Transfer Requests</button>
        </div>

      {transferTab === "create" ? (
      <>
        <div className="cms-card-head">
          <div><h2>Campus Transfer</h2><p>Transfer an individual student between campuses.</p></div>
        </div>
        <div className="cms-card-body campus-transfer-body">
          <div className={`cms-field campus-transfer-student-picker${errors.student ? " has-error" : ""}`}>
            <label htmlFor="campus-transfer-student">Student<span className="req">*</span></label>
            <div className="campus-transfer-combobox">
              <input
                id="campus-transfer-student"
                value={studentQuery}
                placeholder="Search by student name or admission no"
                autoComplete="off"
                onFocus={() => setStudentOpen(true)}
                onBlur={() => window.setTimeout(() => setStudentOpen(false), 0)}
                onChange={(event) => { setStudentQuery(event.target.value); setStudent(null); setStudentOpen(true); setErrors((current) => ({ ...current, student: undefined })); }}
                aria-expanded={studentOpen}
                aria-autocomplete="list"
              />
              <button
                className={`campus-transfer-combobox-toggle${studentOpen ? " is-open" : ""}`}
                type="button"
                aria-label={studentOpen ? "Close student options" : "Open student options"}
                aria-expanded={studentOpen}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setStudentOpen((open) => !open);
                  document.getElementById("campus-transfer-student")?.focus();
                }}
              >
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              {studentOpen ? (
                <div className="campus-transfer-options" role="listbox">
                  <div className="campus-transfer-options-header">Select Student</div>
                  <div className="campus-transfer-options-list">
                  {filteredStudents.length ? filteredStudents.map((item) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={student?.id === item.id}
                      className={student?.id === item.id ? "is-selected" : ""}
                      key={item.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => { setStudent(item); setStudentQuery(`${item.name} — ${item.admissionNo}`); setStudentOpen(false); setErrors((current) => ({ ...current, student: undefined })); }}
                    >
                      <span className="campus-transfer-option-copy"><strong>{item.name}</strong><small>{item.admissionNo}</small></span>
                      {student?.id === item.id ? <CheckCircle2 size={16} className="campus-transfer-option-check" aria-hidden="true" /> : null}
                    </button>
                  )) : <div className="campus-transfer-no-option">No matching students.</div>}
                  </div>
                </div>
              ) : null}
            </div>
            {errors.student ? <span className="cms-error">{errors.student}</span> : null}
          </div>

          {student ? (
            <div className="campus-transfer-student-info">
              <h3>Student Information</h3>
              <div className="campus-transfer-info-grid">
                <TransferPreviewItem label="Student Name" value={student.name} />
                <TransferPreviewItem label="Admission No" value={student.admissionNo} />
                <TransferPreviewItem label="Roll No" value={student.rollNo} />
                <TransferPreviewItem label="Academic Level" value={student.level} />
                <TransferPreviewItem label="Group" value={student.group} />
                <TransferPreviewItem label="Program" value={student.program} />
                <TransferPreviewItem label="Section" value={student.section} />
                <TransferPreviewItem label="Board" value={student.board} />
              </div>
            </div>
          ) : null}

          <div className="campus-transfer-details">
            <h3>Campus Transfer Details</h3>
            <div className="campus-transfer-form-grid">
              <div className="cms-field campus-transfer-readonly"><label>Source Campus</label><div>{sourceCampus}</div><small className="campus-transfer-board-note">Board: {sourceBoard}</small></div>
              <div className={`cms-field${errors.campus ? " has-error" : ""}`}>
                <label htmlFor="transfer-campus">Destination Campus<span className="req">*</span></label>
                <select id="transfer-campus" value={form.campus} onChange={(event) => change("campus", event.target.value)}>
                  <option value="">Select Destination Campus</option>
                  {CAMPUS_TRANSFER_OPTIONS.campuses.map((campus) => <option key={campus.name} value={campus.name} disabled={campus.name === sourceCampus}>{campus.name}</option>)}
                </select>
                {destination?.board ? <small className="campus-transfer-board-note">Board: {destination.board}</small> : null}
                {errors.campus ? <span className="cms-error">{errors.campus}</span> : null}
              </div>
              <div className={`cms-field${errors.effectiveDate ? " has-error" : ""}`}>
                <label htmlFor="transfer-effective-date">Transfer Effective Date<span className="req">*</span></label>
                <input id="transfer-effective-date" type="date" value={form.effectiveDate} onChange={(event) => change("effectiveDate", event.target.value)} />
                {errors.effectiveDate ? <span className="cms-error">{errors.effectiveDate}</span> : null}
              </div>
              <div className={`cms-field${errors.reason ? " has-error" : ""}`}>
                <label htmlFor="transfer-reason">Transfer Reason<span className="req">*</span></label>
                <select id="transfer-reason" value={form.reason} onChange={(event) => change("reason", event.target.value)}><option value="">Select Reason</option>{CAMPUS_TRANSFER_OPTIONS.reasons.map((reason) => <option key={reason}>{reason}</option>)}</select>
                {errors.reason ? <span className="cms-error">{errors.reason}</span> : null}
              </div>
              <div className={`cms-field campus-transfer-remarks${errors.remarks ? " has-error" : ""}`}>
                <label htmlFor="transfer-remarks">{form.reason === "Other" ? <>Reason / Remarks<span className="req">*</span></> : "Remarks"}</label>
                <textarea id="transfer-remarks" value={form.remarks} onChange={(event) => change("remarks", event.target.value)} placeholder={form.reason === "Other" ? "Enter transfer reason" : "Add optional remarks"} />
                {errors.remarks ? <span className="cms-error">{errors.remarks}</span> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="promotion-actions campus-transfer-actions"><button className="cms-btn cms-btn-ghost" onClick={clear}>Clear</button><button className="cms-btn cms-btn-primary" disabled={!sendEnabled} onClick={sendRequest}>Send Transfer Request</button></div>
      </>
      ) : (
        <div className="campus-transfer-requests-content">
          <div className="cms-card-head campus-transfer-requests-head">
            <div><h2>Campus Transfer Requests</h2><p>View and manage campus transfer requests.</p></div>
            <div className="campus-transfer-direction-tabs" role="tablist" aria-label="Transfer request direction">
              <button type="button" role="tab" aria-selected={requestDirection === "sent"} className={requestDirection === "sent" ? "is-active" : ""} onClick={() => { setRequestDirection("sent"); setRequestPage(1); }}><span>Sent Requests</span><b>{sentRequests.length}</b></button>
              <button type="button" role="tab" aria-selected={requestDirection === "received"} className={requestDirection === "received" ? "is-active" : ""} onClick={() => { setRequestDirection("received"); setRequestPage(1); }}><span>Received Requests</span><b>{receivedRequests.length}</b></button>
            </div>
          </div>
          {notification ? <div className={`campus-transfer-notification is-${notification.type}`}><div><strong>{notification.title}</strong><span>{notification.message}</span></div><button type="button" onClick={() => setDetailRequest(notification.request)}>{notification.type === "rejected" ? "View Reason" : "View Details"}</button></div> : null}
          <div className="campus-transfer-request-tools">
            <input value={requestSearch} onChange={(event) => { setRequestSearch(event.target.value); setRequestPage(1); }} placeholder="Search by student name, admission no, or campus..." />
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setRequestPage(1); }}><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
          </div>
          <div className="cms-table-wrap"><table className="cms-table campus-transfer-request-table"><thead><tr><th>#</th><th>Student Name</th><th>Admission No</th><th>{requestDirection === "sent" ? "To Campus" : "From Campus"}</th><th>{requestDirection === "sent" ? "Requested To" : "Requested By"}</th><th>Request Date</th><th>Effective Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {pagedRequests.length ? pagedRequests.map((request, index) => <tr key={request.id}><td>{(currentPage - 1) * pageSize + index + 1}</td><td className="cms-strong">{request.student.name}</td><td>{request.student.admissionNo}</td><td>{requestDirection === "sent" ? request.toCampus : request.fromCampus}</td><td>{requestDirection === "sent" ? request.requestedTo : request.requestedBy}</td><td>{request.requestDate}</td><td>{request.effectiveDate}</td><td><span className={`campus-transfer-status-badge is-${request.status.toLowerCase()}`}>{request.status}</span></td><td><div className="campus-transfer-row-actions"><button type="button" onClick={() => setDetailRequest(request)}>View</button>{requestDirection === "received" && request.status === "Pending" ? <><button type="button" className="approve" onClick={() => setApproveRequest(request)}>Approve</button><button type="button" className="reject" onClick={() => { setRejectRequest(request); setRejectionReason(""); setRejectionError(""); }}>Reject</button></> : null}</div></td></tr>) : <tr><td colSpan={9} className="promotion-empty">No {requestDirection} transfer requests are available for {activeCampusName}.</td></tr>}
          </tbody></table></div>
          <div className="campus-transfer-request-pagination"><span>Showing {filteredRequests.length ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length} entries</span><div><button disabled={currentPage === 1} onClick={() => setRequestPage((page) => Math.max(1, page - 1))}>‹</button><span>{currentPage}</span><button disabled={currentPage === totalPages} onClick={() => setRequestPage((page) => Math.min(totalPages, page + 1))}>›</button></div></div>
        </div>
      )}
      </section>

      {boardAlert ? (
        <Modal
          title={boardAlert.title}
          size="sm"
          onClose={() => setBoardAlert(null)}
          footer={<button className="cms-btn cms-btn-primary" onClick={() => setBoardAlert(null)}>OK</button>}
        >
          <div className="campus-transfer-board-alert"><p>{boardAlert.title === "Board Mismatch" ? "The selected destination campus is configured with a different board." : boardAlert.message}</p>{boardAlert.sourceBoard ? <><TransferPreviewItem label="Source Campus Board" value={boardAlert.sourceBoard} /><TransferPreviewItem label="Destination Campus Board" value={boardAlert.destinationBoard} /><p>{boardAlert.message}</p></> : null}</div>
        </Modal>
      ) : null}

      {detailRequest ? <CampusTransferDetailsModal request={detailRequest} canDecide={requestDirection === "received" && detailRequest.toCampus === activeCampusName} onClose={() => setDetailRequest(null)} onApprove={() => { setApproveRequest(detailRequest); setDetailRequest(null); }} onReject={() => { setRejectRequest(detailRequest); setDetailRequest(null); setRejectionReason(""); setRejectionError(""); }} /> : null}
      {approveRequest ? <CampusTransferDecisionModal title="Approve Campus Transfer" request={approveRequest} message={`Approving this request will transfer the student to ${approveRequest.toCampus}.`} onClose={() => setApproveRequest(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setApproveRequest(null)}>Cancel</button><button className="cms-btn cms-btn-primary" onClick={confirmApproval}>Approve Request</button></>} /> : null}
      {rejectRequest ? <CampusTransferDecisionModal title="Reject Campus Transfer" request={rejectRequest} onClose={() => setRejectRequest(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setRejectRequest(null)}>Cancel</button><button className="cms-btn cms-btn-danger" disabled={!rejectionReason.trim()} onClick={confirmRejection}>Reject Request</button></>}><div className={`cms-field campus-transfer-rejection${rejectionError ? " has-error" : ""}`}><label htmlFor="campus-transfer-rejection">Rejection Reason<span className="req">*</span></label><textarea id="campus-transfer-rejection" value={rejectionReason} onChange={(event) => { setRejectionReason(event.target.value); setRejectionError(""); }} onBlur={() => { if (!rejectionReason.trim()) setRejectionError("Rejection reason is required."); }} placeholder="Enter the reason for rejecting this transfer request" />{rejectionError ? <span className="cms-error">{rejectionError}</span> : null}</div></CampusTransferDecisionModal> : null}
    </>
  );
}

function CampusTransferDetailsModal({ request, canDecide, onClose, onApprove, onReject }) {
  const isPending = request.status === "Pending" && canDecide;
  return <Modal title="Campus Transfer Request Details" className="campus-transfer-detail-modal" onClose={onClose} footer={<>{isPending ? <><button className="cms-btn cms-btn-danger" onClick={onReject}>Reject</button><button className="cms-btn cms-btn-primary" onClick={onApprove}>Approve</button></> : null}<button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button></>}>
    <div className="campus-transfer-detail-content">
      <div className="campus-transfer-detail-heading"><h3>Student Information</h3><span className={`campus-transfer-status-badge is-${request.status.toLowerCase()}`}>{request.status === "Pending" ? "Pending Approval" : request.status}</span></div>
      <div className="campus-transfer-info-grid campus-transfer-detail-student"><TransferPreviewItem label="Student Name" value={request.student.name} /><TransferPreviewItem label="Admission No" value={request.student.admissionNo} /><TransferPreviewItem label="Roll No" value={request.student.rollNo} /><TransferPreviewItem label="Academic Level" value={request.student.level} /><TransferPreviewItem label="Group" value={request.student.group} /><TransferPreviewItem label="Program" value={request.student.program} /><TransferPreviewItem label="Section" value={request.student.section} /><TransferPreviewItem label="Board" value={request.student.board} /></div>
      <div className="campus-transfer-detail-columns"><div><h3>Transfer Details</h3><TransferPreviewItem label="From Campus" value={request.fromCampus} /><TransferPreviewItem label="To Campus" value={request.toCampus} /><TransferPreviewItem label="Transfer Effective Date" value={request.effectiveDate} /><TransferPreviewItem label="Transfer Reason" value={request.reason} /><TransferPreviewItem label="Remarks" value={request.remarks || "-"} /></div><div><h3>{request.status === "Approved" ? "Approval Details" : request.status === "Rejected" ? "Rejection Details" : "Request Information"}</h3><TransferPreviewItem label="Requested To" value={request.requestedTo} /><TransferPreviewItem label="Request Date" value={request.requestDate} /><TransferPreviewItem label="Current Status" value={request.status === "Pending" ? "Pending Approval" : request.status} />{request.status === "Approved" ? <><TransferPreviewItem label="Approved By" value={request.approvedBy} /><TransferPreviewItem label="Approved Date" value={request.approvedOn} /><TransferPreviewItem label="Approval Details" value={request.approvalRemarks} /></> : request.status === "Rejected" ? <><TransferPreviewItem label="Rejected By" value={request.rejectedBy} /><TransferPreviewItem label="Rejected Date" value={request.rejectedOn} /><TransferPreviewItem label="Rejection Reason" value={request.rejectionReason} /></> : <p className="campus-transfer-waiting">Waiting for response from destination campus.</p>}</div></div>
    </div>
  </Modal>;
}

function CampusTransferDecisionModal({ title, request, message, onClose, footer, children }) {
  return <Modal title={title} size="sm" className="campus-transfer-decision-modal" onClose={onClose} footer={footer}><div className="campus-transfer-decision-summary"><strong>{request.student.name}</strong><span>{request.student.admissionNo}</span><TransferPreviewItem label="From" value={request.fromCampus} /><TransferPreviewItem label="To" value={request.toCampus} /><TransferPreviewItem label="Effective Date" value={request.effectiveDate} />{message ? <p>{message}</p> : null}{children}</div></Modal>;
}

function TransferPreviewItem({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function HistoryTable({ rows, onRollback }) {
  return (
    <div className="cms-table-wrap">
      <table className="cms-table promotion-table">
        <thead>
          <tr>
            <th>Promotion ID</th>
            <th>Student</th>
            <th>Admission No.</th>
            <th>Source</th>
            <th>Target</th>
            <th>Date</th>
            <th>Status</th>
            <th>Promoted By</th>
            {onRollback ? <th>Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={row.id ?? index}>
                <td className="cms-strong">{row.id ?? "-"}</td>
                <td>{row.student}</td>
                <td>{row.admissionNo}</td>
                <td>{[row.sourceYear, row.sourceLevel, row.sourceGroup, row.sourceSection].filter((v) => v !== "-").join(" • ") || "-"}</td>
                <td>{[row.targetYear, row.targetLevel, row.targetGroup, row.targetSection].filter((v) => v !== "-").join(" • ") || "-"}</td>
                <td>{row.date}</td>
                <td>
                  <span className={`promotion-status ${/rolledback/i.test(row.status) ? "not-eligible" : "eligible"}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.promotedBy}</td>
                {onRollback ? (
                  <td>
                    <button
                      className="cms-action-link danger"
                      disabled={!row.canRollback}
                      onClick={() => onRollback(row)}
                    >
                      Rollback
                    </button>
                  </td>
                ) : null}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={onRollback ? 9 : 8} className="promotion-empty">No promotion history available.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HistoryDateRange({ fromDate, toDate, onChange }) {
  return (
    <div className="cms-field promotion-date-range">
      <label>Date Range</label>
      <div className="promotion-date-range-control">
        <label>From Date<input type="date" value={fromDate} onChange={(event) => onChange("fromDate", event.target.value)} /></label>
        <span aria-hidden="true">—</span>
        <label>To Date<input type="date" value={toDate} onChange={(event) => onChange("toDate", event.target.value)} /></label>
      </div>
    </div>
  );
}

function SinglePromotionScreen({ masters, preselectedStudent, allStudents = [], defaultNextYearId, onPromoteSuccess }) {
  const { selectedBoard, selectedAcademicYear } = useAcademicContext();
  const [currentStudent, setCurrentStudent] = useState(preselectedStudent || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [target, setTarget] = useState({
    year: defaultNextYearId || "",
    level: "",
    group: "",
    program: "",
    section: "",
    medium: "English",
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preselectedStudent) setCurrentStudent(preselectedStudent);
  }, [preselectedStudent]);

  useEffect(() => {
    if (defaultNextYearId && !target.year) {
      setTarget((t) => ({ ...t, year: defaultNextYearId }));
    }
  }, [defaultNextYearId, target.year]);

  const change = (name, value) => {
    setTarget((current) => ({
      ...current,
      ...(name === "group" ? { program: "", section: "" } : {}),
      ...(name === "program" ? { section: "" } : {}),
      [name]: value,
    }));
  };

  const targetGroup = masters.groups.find((group) => group.value === asString(target.group));
  const targetPrograms = targetGroup?.programs || [];
  const targetSections = masters.sections.filter((section) =>
    (!section.group || section.group === asString(target.group) || section.group === targetGroup?.label) &&
    (!target.program || !section.program || section.program === asString(target.program))
  );
  const targetYearLabel = masters.years.find((year) => year.value === asString(target.year))?.label;

  const fields = [
    { name: "year", label: "Target Academic Year", type: "select", options: uniqueAcademicYearsByName(masters.years, (year) => year.label), required: true },
    { name: "level", label: "Target Academic Level", type: "select", options: masters.levels, required: true },
    { name: "group", label: "Target Group", type: "select", options: masters.groups, required: true },
    { name: "program", label: "Target Program", type: "select", options: targetPrograms, required: true, disabled: !target.group },
    { name: "section", label: "Target Section", type: "select", options: targetSections, required: true, disabled: !target.program },
    { name: "medium", label: "Target Medium", type: "select", options: [option("English")], required: true },
  ];

  const handleSearchSelect = (student) => {
    setCurrentStudent(student);
    setSearchTerm("");
    setError("");
  };

  const matchingStudents = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return allStudents.filter((s) => `${s.name} ${s.admissionNo} ${s.id}`.toLowerCase().includes(q));
  }, [allStudents, searchTerm]);

  const executePromote = async () => {
    if (!currentStudent || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const targetLevel = masters.levels.find((level) => level.value === asString(target.level))?.label || asString(target.level);
      await promoteSingleStudent(currentStudent.id, {
        targetAcademicYearId: numericId(target.year),
        targetAcademicLevel: targetLevel,
        targetGroupId: numericId(target.group),
        targetProgramId: numericId(target.program),
        targetSection: target.section,
        targetMedium: target.medium,
      });
      setConfirming(false);
      onPromoteSuccess?.(currentStudent.name);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="cms-card promotion-card">
      <div className="cms-card-head">
        <div>
          <h2>Single Student Promotion</h2>
          <p>Select a student from the active cohort to promote individually.</p>
        </div>
      </div>
      {error ? <div className="promotion-error" role="alert">{error}</div> : null}

      <div className="cms-card-body promotion-setup-grid promotion-single-grid">
        <div className="promotion-flow-panel">
          <h3>Current Details</h3>
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--cms-muted)", display: "block", marginBottom: "6px" }}>
              Select Student (from loaded cohort)
            </label>
            <select
              value={currentStudent?.id || ""}
              onChange={(e) => {
                const selected = allStudents.find((s) => String(s.id) === String(e.target.value));
                setCurrentStudent(selected || null);
                setError("");
              }}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "6px",
                border: "1px solid var(--cms-border)",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                fontSize: "13.5px",
                outline: "none"
              }}
            >
              <option value="">
                {allStudents.length
                  ? `-- Select Student (${allStudents.length} available) --`
                  : "-- No students loaded. Please load students in Student Promotion tab first --"}
              </option>
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {currentStudent ? (
            <div style={{ display: "grid", gap: "8px", fontSize: "13px", marginTop: "12px" }}>
              <div><strong>Student Name:</strong> {currentStudent.name}</div>
              <div><strong>Admission No:</strong> {currentStudent.admissionNo}</div>
              <div><strong>Academic Year:</strong> {currentStudent.academicYear || selectedAcademicYear?.label || "2026-2027"}</div>
              <div><strong>Board:</strong> {currentStudent.board || selectedBoard?.name || "BIEAP"}</div>
              <div><strong>Level:</strong> {currentStudent.level}</div>
              <div><strong>Group:</strong> {currentStudent.group}</div>
              <div><strong>Program:</strong> {currentStudent.program}</div>
              <div><strong>Section:</strong> {currentStudent.section}</div>
            </div>
          ) : (
            <p className="promotion-empty">No student selected. Select a student from the dropdown above.</p>
          )}
        </div>

        <div className="promotion-flow-panel">
          <h3>Destination Details</h3>
          <div className="promotion-field-grid">
            {fields.map((field) => (
              <Field
                key={field.name}
                field={field}
                value={target[field.name]}
                onChange={change}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="promotion-actions">
        <button
          className="cms-btn cms-btn-ghost"
          type="button"
          onClick={() => { setCurrentStudent(null); setTarget({ year: defaultNextYearId || "", level: "", group: "", program: "", section: "", medium: "English" }); }}
        >
          Reset
        </button>
        <button
          className="cms-btn cms-btn-primary"
          type="button"
          disabled={!currentStudent || !isEligible(currentStudent) || Object.values(target).some((value) => !value) || submitting}
          onClick={() => setConfirming(true)}
        >
          {submitting ? "Promoting..." : "Promote Student"}
        </button>
      </div>

      {confirming ? (
        <Modal
          title="Confirm Student Promotion"
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button className="cms-btn cms-btn-ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="cms-btn cms-btn-primary" onClick={executePromote} disabled={submitting}>
                {submitting ? "Promoting..." : "Confirm & Promote"}
              </button>
            </>
          }
        >
          <p>Are you sure you want to promote <strong>{currentStudent?.name}</strong> ({currentStudent?.admissionNo})?</p>
          <div style={{ marginTop: "10px", padding: "10px", background: "var(--cms-subtle)", borderRadius: "6px" }}>
            <div><strong>From:</strong> {currentStudent?.academicYear} • {currentStudent?.level} • {currentStudent?.group} • {currentStudent?.program}</div>
            <div style={{ marginTop: "4px" }}>
              <strong>To:</strong> {targetYearLabel} • {masters.levels.find((l) => l.value === asString(target.level))?.label} • {targetGroup?.label} • Section {target.section}
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function AllocationScreen({ activeTab, setActiveTab, masters, setup, students, defaultNextYearId, onSaved, onReloadCohort }) {
  const { selectedBoard, selectedAcademicYear, selectedAcademicYearId, selectedBoardId } = useAcademicContext();
  const [selected, setSelected] = useState([]);
  const [bulkTarget, setBulkTarget] = useState("");
  const [targetMap, setTargetMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isProgram = activeTab === "program";

  // Derive rows from students
  const rows = useMemo(() => students.map((s) => ({
    id: s.id,
    student: s.name,
    roll: s.admissionNo,
    group: s.group,
    groupId: s.groupId,
    program: s.program,
    programId: s.programId,
    section: s.section,
  })), [students]);

  // Program options available for selected group
  const currentGroupId = setup.toGroup || setup.group || (students.length > 0 ? students[0].groupId : "");
  const currentGroupObj = masters.groups.find((g) => g.value === asString(currentGroupId));
  const availablePrograms = currentGroupObj?.programs || masters.groups.flatMap((g) => g.programs || []);

  const availableSections = masters.sections;

  const handleApplyBulk = () => {
    if (!bulkTarget) return;
    const updated = { ...targetMap };
    selected.forEach((id) => {
      updated[id] = bulkTarget;
    });
    setTargetMap(updated);
  };

  const handleSave = async () => {
    if (!selected.length) {
      setMessage("Please select at least one student.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const targetYearId = numericId(setup.toYear || defaultNextYearId || selectedAcademicYearId);
      const targetAcademicLevel = masters.levels.find((l) => l.value === asString(setup.toLevel || setup.fromLevel))?.label;
      const targetGroupId = numericId(setup.toGroup || setup.group);

      if (!targetYearId || !targetAcademicLevel || !targetGroupId) {
        setMessage("Missing required target configuration. Please select Year, Level, and Group.");
        setSaving(false);
        return;
      }

      if (isProgram) {
        const byProgram = {};
        for (const id of selected) {
          const progId = numericId(targetMap[id] || bulkTarget);
          if (!progId) {
            throw new Error(`Please specify a target program for selected student ID: ${id}`);
          }
          if (!byProgram[progId]) byProgram[progId] = [];
          byProgram[progId].push(id);
        }

        for (const [progIdStr, studentIds] of Object.entries(byProgram)) {
          await allocateProgram({
            studentIds,
            targetAcademicYearId: targetYearId,
            targetAcademicLevel,
            targetGroupId,
            targetProgramId: Number(progIdStr),
          });
        }
        onSaved?.("Program");
      } else {
        const bySection = {};
        for (const id of selected) {
          const sec = targetMap[id] || bulkTarget;
          if (!sec) {
            throw new Error(`Please specify a target section for selected student ID: ${id}`);
          }
          if (!bySection[sec]) bySection[sec] = [];
          bySection[sec].push(id);
        }

        for (const [secStr, studentIds] of Object.entries(bySection)) {
          await allocateSection({
            studentIds,
            targetAcademicYearId: targetYearId,
            targetAcademicLevel,
            targetGroupId,
            targetSection: secStr,
          });
        }
        onSaved?.("Section");
      }

      setSelected([]);
      setTargetMap({});
      setBulkTarget("");
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="cms-card promotion-card promotion-allocation-card">
      <div className="promotion-tabs promotion-allocation-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={isProgram}
          className={isProgram ? "is-active" : ""}
          onClick={() => { setActiveTab("program"); setMessage(""); }}
        >
          Program Allocation (Track Change)
        </button>
        <button
          role="tab"
          aria-selected={!isProgram}
          className={!isProgram ? "is-active" : ""}
          onClick={() => { setActiveTab("section"); setMessage(""); }}
        >
          Section Allocation
        </button>
      </div>

      <div className="promotion-allocation-toolbar">
        <div className="promotion-allocation-bulk">
          <span>
            Bulk Assign {isProgram ? "Program" : "Section"} to Selected ({selected.length}):
          </span>
          <select
            value={bulkTarget}
            onChange={(e) => setBulkTarget(e.target.value)}
            className="promotion-allocation-select"
          >
            <option value="">Select target {isProgram ? "program" : "section"}</option>
            {isProgram
              ? availablePrograms.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)
              : availableSections.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            className="cms-btn cms-btn-ghost"
            onClick={handleApplyBulk}
            disabled={!selected.length || !bulkTarget}
          >
            Apply to Selected
          </button>
        </div>

        <div className="promotion-allocation-selection-actions">
          <button
            className="cms-btn cms-btn-ghost"
            onClick={() => setSelected(rows.map((r) => r.id))}
            disabled={!rows.length}
          >
            Select All
          </button>
          <button
            className="cms-btn cms-btn-ghost"
            onClick={() => setSelected([])}
            disabled={!selected.length}
          >
            Clear Selection
          </button>
        </div>
      </div>

      {message ? <div className="promotion-error" role="alert">{message}</div> : null}

      <div className="cms-table-wrap promotion-allocation-table-wrap">
        <table className="cms-table promotion-table promotion-allocation-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Student Name</th>
              <th>Admission No.</th>
              <th>Group</th>
              <th>Current {isProgram ? "Program" : "Section"}</th>
              <th>Target {isProgram ? "Program" : "Section"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() =>
                        setSelected((items) =>
                          items.includes(row.id) ? items.filter((id) => id !== row.id) : [...items, row.id]
                        )
                      }
                    />
                  </td>
                  <td className="cms-strong">{row.student}</td>
                  <td>{row.roll}</td>
                  <td>{row.group}</td>
                  <td>{isProgram ? (row.program || "Regular") : (row.section || "-")}</td>
                  <td>
                    <select
                      value={targetMap[row.id] || ""}
                      onChange={(e) => setTargetMap({ ...targetMap, [row.id]: e.target.value })}
                      style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--cms-border)", fontSize: "12.5px" }}
                    >
                      <option value="">Choose {isProgram ? "program" : "section"}</option>
                      {isProgram
                        ? availablePrograms.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)
                        : availableSections.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="promotion-empty">
                  No students available. Please load students from the Student Promotion tab first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="promotion-actions promotion-allocation-save">
        <button
          className="cms-btn cms-btn-primary"
          disabled={!selected.length || saving}
          onClick={handleSave}
        >
          {saving ? "Saving Allocation..." : `Save ${isProgram ? "Program" : "Section"} Allocation`}
        </button>
      </div>
    </section>
  );
}

function ReportScreen({ reportData, rows, loading, loaded, onLoad, onExportCsv }) {
  const total = reportData?.totalStudents ?? rows.length;
  const eligible = reportData?.eligibleStudents ?? rows.filter((r) => /eligible/i.test(r.status) || !/rolledback/i.test(r.status)).length;
  const notEligible = reportData?.notEligibleStudents ?? (total - eligible);
  const promoted = reportData?.promotedStudents ?? rows.filter((r) => /promot/i.test(r.status)).length;
  const rolledBack = reportData?.rolledBackStudents ?? rows.filter((r) => /rollback/i.test(r.status)).length;
  const summaryCards = [
    { label: "Total Students", value: total, tone: "total", Icon: Users },
    { label: "Eligible", value: eligible, tone: "eligible", Icon: UserCheck },
    { label: "Not Eligible", value: notEligible, tone: "not-eligible", Icon: UserX },
    { label: "Promoted", value: promoted, tone: "promoted", Icon: Megaphone },
    { label: "Rolled Back", value: rolledBack, tone: "rolled-back", Icon: RotateCcw },
  ];

  return (
    <div className="promotion-report-screen">
      <section className="promotion-summary promotion-report-summary" aria-label="Promotion report summary">
        {summaryCards.map(({ label, value, tone, Icon }) => (
          <article className={`promotion-report-summary-card is-${tone}`} key={label}>
            <span className="promotion-report-summary-icon" aria-hidden="true"><Icon size={18} /></span>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="cms-card promotion-card promotion-report-card">
        <div className="cms-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Promotion Reports</h2>
            <p>Review comprehensive promotion metrics and audit records.</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="cms-btn cms-btn-ghost" onClick={onExportCsv} disabled={!rows.length}>
              <Download size={15} style={{ marginRight: "6px" }} /> Export CSV
            </button>
            <button className="cms-btn cms-btn-primary" onClick={onLoad} disabled={loading}>
              {loading ? "Loading..." : "Refresh Report"}
            </button>
          </div>
        </div>

        {loaded ? (
          <HistoryTable rows={rows} />
        ) : (
          <div className="promotion-empty">Load the report to view promotion records.</div>
        )}
      </section>
    </div>
  );
}
