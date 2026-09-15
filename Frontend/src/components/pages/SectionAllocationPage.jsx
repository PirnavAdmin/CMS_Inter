import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  Search,
  X,
  ChevronDown,
  CheckSquare,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./StudentManagementPage.css";
import "./SectionAllocationPage.css";
const list = (d) => {
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.items)) return d.data.items;
  if (Array.isArray(d?.result)) return d.result;
  return [];
};
const EXCLUDED_NOTIFICATION_SOURCES = ["certificates"];
const valueOf = (item, ...keys) => keys.map((key) => item?.[key]).find((value) => value !== undefined && value !== null);
const objectFrom = (payload) => payload?.data?.data ?? payload?.data ?? payload?.result ?? payload ?? {};
const programIdOf = (program) => valueOf(program, "programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id", "groupProgramId", "GroupProgramId");
const programNameOf = (program) => valueOf(program, "programName", "ProgramName", "programmeName", "ProgrammeName", "programme", "Programme", "name", "Name");
const sectionIdOf = (section) => valueOf(section, "sectionId", "SectionId", "id", "Id");
const sectionNameOf = (section) => valueOf(section, "sectionName", "SectionName", "name", "Name");
const levelIdOf = (level) => valueOf(level, "academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id");
const levelNameOf = (level) => valueOf(level, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name");
const asValues = (value) => Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
const normalizedValue = (value) => String(value ?? "").trim().toLowerCase();
const admissionIdOf = (student) => valueOf(student, "admissionId", "AdmissionId", "studentAdmissionId", "StudentAdmissionId");
const studentIdOf = (student) => valueOf(student, "studentId", "StudentId", "id", "Id");
const admissionNumberOf = (student) => String(valueOf(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim().toLowerCase();
const studentSectionIdOf = (student) => valueOf(student, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId", "assignedSectionId", "AssignedSectionId")
  ?? valueOf(student?.section, "sectionId", "SectionId", "id", "Id")
  ?? valueOf(student?.Section, "sectionId", "SectionId", "id", "Id")
  ?? (typeof student?.section === "number" ? student.section : undefined);
const studentSectionNameOf = (student) => valueOf(student, "sectionName", "SectionName", "allocatedSectionName", "AllocatedSectionName", "assignedSectionName", "AssignedSectionName")
  ?? valueOf(student?.section, "sectionName", "SectionName", "name", "Name")
  ?? valueOf(student?.Section, "sectionName", "SectionName", "name", "Name")
  ?? (typeof student?.section === "string" ? student.section : undefined);
const studentRollOf = (student) => valueOf(student, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll");
const hasRollNumber = (student) => {
  const roll = String(studentRollOf(student) ?? "").trim();
  return Boolean(roll && !/^(?:pending|[-—])$/i.test(roll));
};
const findBackendStudent = (backendStudents, student) => {
  const admissionNumber = admissionNumberOf(student);
  const studentId = String(studentIdOf(student) ?? "");
  const admissionId = String(admissionIdOf(student) ?? "");
  return backendStudents.find((candidate) =>
    (admissionNumber && admissionNumberOf(candidate) === admissionNumber) ||
    (studentId && String(studentIdOf(candidate) ?? "") === studentId) ||
    (admissionId && String(admissionIdOf(candidate) ?? "") === admissionId)
  );
};
const buildRollPlan = ({ sectionId, backendStudents, candidates }) => {
  const sectionStudents = backendStudents.filter((student) => String(studentSectionIdOf(student) ?? "") === String(sectionId));
  const existingRolls = sectionStudents.filter(hasRollNumber).map((student) => String(studentRollOf(student)).trim());
  if (existingRolls.some((roll) => !/^\d+$/.test(roll))) {
    throw new Error("Automatic roll generation is unavailable because this section contains formatted roll numbers.");
  }
  const highestExistingRoll = existingRolls.reduce((highest, roll) => Math.max(highest, Number(roll)), 0);
  const admissionIds = candidates.flatMap((student) => {
    const admissionId = Number(admissionIdOf(student));
    if (!Number.isFinite(admissionId) || admissionId <= 0 || student.isApproved === false) return [];
    const backendStudent = findBackendStudent(backendStudents, student);
    if (!backendStudent || String(studentSectionIdOf(backendStudent) ?? "") !== String(sectionId) || hasRollNumber(backendStudent)) return [];
    return [admissionId];
  });
  return { startingRollNumber: highestExistingRoll + 1, admissionIds: [...new Set(admissionIds)] };
};
const mergeBackendStudents = (currentStudents, backendStudents) => currentStudents.map((student) => {
  const backendStudent = findBackendStudent(backendStudents, student);
  if (!backendStudent) return student;
  const sectionId = studentSectionIdOf(backendStudent);
  const sectionName = studentSectionNameOf(backendStudent);
  const roll = studentRollOf(backendStudent);
  return {
    ...student,
    ...(sectionId != null ? { sectionId } : {}),
    ...(sectionName != null ? { section: sectionName } : {}),
    ...(roll != null ? { roll } : {}),
  };
});
const matchesScope = (selectedId, options, rowId, rowName, idKeys, nameKeys) => {
  if (!selectedId) return true;
  const selected = String(selectedId);
  const option = (options || []).find((item) => String(valueOf(item, ...idKeys) ?? "") === selected);
  const selectedName = normalizedValue(option ? valueOf(option, ...nameKeys) : "");
  const candidates = [rowId, rowName].map(normalizedValue).filter(Boolean);
  return candidates.includes(normalizedValue(selected)) || Boolean(selectedName && candidates.includes(selectedName));
};

const levelsForBoard = (allLevels, boardId, boardRows) => {
  const board = boardRows.find((item) => String(item?.boardId ?? item?.BoardId ?? item?.id ?? item?.Id) === String(boardId));
  const embedded = list(board?.academicLevels ?? board?.AcademicLevels ?? board?.levels ?? board?.Levels);
  if (embedded.length) {
    const embeddedIds = new Set(embedded.map(levelIdOf).filter((id) => id != null).map(String));
    return embeddedIds.size ? allLevels.filter((level) => embeddedIds.has(String(levelIdOf(level)))) : embedded;
  }

  const levelIds = new Set([
    ...asValues(board?.academicLevelIds),
    ...asValues(board?.AcademicLevelIds),
    ...asValues(board?.levelIds),
    ...asValues(board?.LevelIds),
  ].map(String).filter(Boolean));
  if (levelIds.size) return allLevels.filter((level) => levelIds.has(String(levelIdOf(level))));

  const directLevels = allLevels.filter((level) => {
    const levelBoardId = level?.boardId ?? level?.BoardId;
    return levelBoardId != null && String(levelBoardId) === String(boardId);
  });
  return directLevels.length ? directLevels : allLevels;
};

const changeStudentAllocation = async ({ admissionId, studentId, currentProgramId, programId, sectionId, student }) => {
  if (String(programId) !== String(currentProgramId)) {
    throw new Error("Changing program is not supported by the current backend API contract.");
  }
  const response = await apiClient.put(apiEndpoints.students.updateSection(studentId), { sectionId });
  try {
    const afterSectionResponse = await apiClient.get(apiEndpoints.students.getAll);
    const afterSectionStudents = list(afterSectionResponse.data);
    const rollPlan = buildRollPlan({ sectionId, backendStudents: afterSectionStudents, candidates: [{ ...student, admissionId, studentId }] });
    if (rollPlan.admissionIds.length) {
      await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, { sectionId, ...rollPlan });
    }
    const refreshed = await Promise.allSettled([
      admissionId ? apiClient.get(apiEndpoints.studentAdmissions.getById(admissionId)) : Promise.resolve({ data: {} }),
      apiClient.get(apiEndpoints.students.getById(studentId)),
      apiClient.get(apiEndpoints.students.getAll),
    ]);
    const refreshedStudent = refreshed[2].status === "fulfilled"
      ? findBackendStudent(list(refreshed[2].value.data), { ...student, admissionId, studentId }) ?? {}
      : {};
    return {
      ...response,
      data: {
        ...objectFrom(response.data),
        ...(refreshed[0].status === "fulfilled" ? objectFrom(refreshed[0].value.data) : {}),
        ...(refreshed[1].status === "fulfilled" ? objectFrom(refreshed[1].value.data) : {}),
        ...refreshedStudent,
      },
    };
  } catch (error) {
    error.sectionAllocationSucceeded = true;
    throw error;
  }
};
export default function SectionAllocationPage() {
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [ctx, setCtx] = useState({
    board: "",
    year: "",
    level: "",
    group: "",
    program: "",
    section: "",
  }),
    [boards, setBoards] = useState([]),
    [years, setYears] = useState([]),
    [levels, setLevels] = useState([]),
    [groups, setGroups] = useState([]),
    [programs, setPrograms] = useState([]),
    [sections, setSections] = useState([]),
    [sectionDirectory, setSectionDirectory] = useState([]),
    [levelDirectory, setLevelDirectory] = useState([]),
    [students, setStudents] = useState([]),
    [message, setMessage] = useState(""),
    [messageType, setMessageType] = useState("success"),
    [changingStudent, setChangingStudent] = useState(null),
    [busy, setBusy] = useState(""),
    [page, setPage] = useState(1),

    // --- Selection State ---
    [selectedIds, setSelectedIds] = useState([]),
    [bulkActionModal, setBulkActionModal] = useState(null),
    [bulkTargetSection, setBulkTargetSection] = useState(""),
    [bulkLoading, setBulkLoading] = useState(false),

    // --- Real-time Search & Secondary Table Filters ---
    [searchQuery, setSearchQuery] = useState(""),
    [tableSectionFilter, setTableSectionFilter] = useState(""),
    [tableProgramFilter, setTableProgramFilter] = useState(""),

    // --- Smart Excel Import & Verification State ---
    [isImportModalOpen, setIsImportModalOpen] = useState(false),
    [selectedExcelFile, setSelectedExcelFile] = useState(null),
    [excelVerificationResult, setExcelVerificationResult] = useState(null),
    [isVerifying, setIsVerifying] = useState(false),
    [allocationPreview, setAllocationPreview] = useState(null),
    [previewTab, setPreviewTab] = useState("allocated"),
    [isAllocating, setIsAllocating] = useState(false);

  const fileInputRef = useRef(null);
  const masterCheckboxRef = useRef(null);
  const boardRequestRef = useRef(0);
  const groupRequestRef = useRef(0);
  const programRequestRef = useRef(0);
  const sectionRequestRef = useRef(0);

  useEffect(() => {
    const board = String(selectedBoardId ?? "");
    const year = String(selectedAcademicYearId ?? "");
    setCtx((current) => {
      if (current.board === board && current.year === year) return current;
      return {
        ...current,
        board,
        year,
        ...(current.board !== board ? { level: "", group: "", program: "", section: "" } : {}),
      };
    });
  }, [selectedAcademicYearId, selectedBoardId]);

  const refreshStudentsFromBackend = async () => {
    const response = await apiClient.get(apiEndpoints.students.getAll);
    const backendStudents = list(response.data);
    setStudents((current) => mergeBackendStudents(current, backendStudents));
    return backendStudents;
  };

  useEffect(() => {
    Promise.all([
      apiClient.get(apiEndpoints.boards.list, { params: { status: true } }).catch(() => apiClient.get(apiEndpoints.boards.list)),
      apiClient.get(apiEndpoints.sections.list).catch(() => ({ data: [] })),
      apiClient.get(apiEndpoints.academicLevels.list).catch(() => ({ data: [] })),
      apiClient.get(apiEndpoints.admissions.getAll),
      apiClient.get(apiEndpoints.students.getAll),
    ])
      .then(([b, allSectionsResponse, allLevelsResponse, admissionsResponse, studentsResponse]) => {
        setBoards(list(b.data));
        setSectionDirectory(list(allSectionsResponse.data));
        setLevelDirectory(list(allLevelsResponse.data));
        const studentsByAdmissionNumber = new Map(
          list(studentsResponse.data).map((student) => [
            String(student.admissionNo ?? student.admissionNumber ?? "").trim(),
            student,
          ]),
        );
        setStudents(
          list(admissionsResponse.data).map((admission, i) => {
            const x = studentsByAdmissionNumber.get(
              String(admission.admissionNo ?? admission.admissionNumber ?? "").trim(),
            ) ?? {};
            const approved = admission?.isApproved ?? admission?.IsApproved ?? admission?.approved ?? admission?.Approved
              ?? admission?.approvalStatus ?? admission?.ApprovalStatus;
            const verified = admission?.isVerified ?? admission?.IsVerified ?? admission?.verified ?? admission?.Verified
              ?? admission?.verificationStatus ?? admission?.VerificationStatus;
            const admissionStatus = String(
              admission?.status ?? admission?.Status ?? admission?.admissionStatus ?? admission?.AdmissionStatus ?? "",
            ).trim().toLowerCase();
            const isApproved =
              approved === true ||
              approved === 1 ||
              String(approved).toLowerCase() === "true" ||
              ["approved", "active", "completed"].includes(admissionStatus);
            const isVerified =
              verified == null ||
              verified === true ||
              verified === 1 ||
              String(verified).toLowerCase() === "true" ||
              ["approved", "active", "completed"].includes(admissionStatus);
            return ({
              ...x,
              id: x.studentId ?? x.id ?? `admission-${admission.admissionId ?? i}`,
              // The bulk allocation endpoint accepts admission IDs only. A
              // student ID is a different record and makes the backend look up
              // a non-existent admission.
              // Prefer the admission foreign key already returned by the
              // student record. Fall back to the admission-number lookup for
              // older API responses that do not expose it.
              admissionId:
                x.admissionId ??
                x.AdmissionId ??
                x.studentAdmissionId ??
                x.StudentAdmissionId ??
                admission?.admissionId ??
                admission?.studentAdmissionId ??
                admission?.id ??
                "",
              studentId: x.studentId ?? x.id ?? "",
              name: [admission.firstName, admission.lastName].filter(Boolean).join(" ") || x.studentName || x.fullName || x.name || "Unnamed Student",
              admissionNo: admission.admissionNo ?? admission.admissionNumber ?? x.admissionNo ?? x.admissionNumber ?? "—",
              boardId: admission.boardId ?? admission.BoardId ?? x.boardId ?? x.BoardId,
              academicYearId: admission.academicYearId ?? admission.AcademicYearId ?? x.academicYearId ?? x.AcademicYearId,
              academicYearName: admission.academicYearName ?? admission.AcademicYearName ?? x.academicYearName ?? x.yearName ?? "",
              academicLevelId: admission.academicLevelId ?? admission.AcademicLevelId ?? x.academicLevelId ?? x.AcademicLevelId,
              academicLevelName: admission.academicLevelName ?? admission.AcademicLevelName ?? admission.levelName ?? admission.LevelName ?? x.academicLevelName ?? x.levelName ?? "",
              academicLevelCode: admission.academicLevelCode ?? admission.AcademicLevelCode ?? admission.levelCode ?? admission.LevelCode ?? x.academicLevelCode ?? x.levelCode ?? "",
              groupId: admission.groupId ?? admission.GroupId ?? x.groupId,
              programId:
                x.programId ??
                x.programmeId ??
                admission?.programId ??
                admission?.ProgramId ??
                admission?.programmeId ??
                admission?.ProgrammeId ??
                admission?.program?.programId ??
                admission?.Program?.programId,
              group: admission.groupName ?? admission.GroupName ?? x.groupName ?? x.group ?? "",
              programme:
                x.programmeName ??
                x.programName ??
                x.programme ??
                admission?.programmeName ??
                admission?.ProgrammeName ??
                admission?.programName ??
                admission?.ProgramName ??
                admission?.programme?.programmeName ??
                admission?.program?.programName ??
                admission?.Program?.programName ??
                "",
              // Keep the ID as well as the label. The roll-number action must
              // compare IDs; comparing a section label to the selected ID makes
              // every allocated student appear ineligible after a reload.
              sectionId:
                x.sectionId ??
                x.SectionId ??
                x.allocatedSectionId ??
                x.AllocatedSectionId ??
                x.assignedSectionId ??
                x.AssignedSectionId ??
                admission?.sectionId ??
                admission?.SectionId ??
                admission?.allocatedSectionId ??
                admission?.AllocatedSectionId ??
                admission?.assignedSectionId ??
                admission?.AssignedSectionId ??
                admission?.section?.sectionId ??
                admission?.Section?.sectionId ??
                "",
              section:
                x.sectionName ??
                x.section ??
                admission?.sectionName ??
                admission?.SectionName ??
                admission?.allocatedSectionName ??
                admission?.AllocatedSectionName ??
                admission?.assignedSectionName ??
                admission?.AssignedSectionName ??
                admission?.section?.sectionName ??
                admission?.Section?.sectionName ??
                "",
              roll: admission.rollNumber ?? admission.RollNumber ?? admission.rollNo ?? admission.RollNo ?? x.rollNumber ?? x.rollNo ?? "",
              status: admission.status ?? admission.Status ?? x.status ?? "Pending allocation",
              isApproved: isApproved && isVerified,
            });
          }),
        );
      })
      .catch((e) => { setMessageType("error"); setMessage(getApiErrorMessage(e)); })
      .finally(() => setStudentsLoading(false));
  }, []);

  // Cascading dependency: Board -> Academic Years, Academic Levels, Groups
  useEffect(() => {
    const requestSequence = ++boardRequestRef.current;
    if (!ctx.board) {
      setYears([]);
      setLevels([]);
      setGroups([]);
      setPrograms([]);
      setSections([]);
      return;
    }

    // 1. Fetch active Academic Years for selected board
    apiClient
      .get(apiEndpoints.academicYears.active, { params: { boardId: ctx.board } })
      .catch(() => apiClient.get(apiEndpoints.academicYears.active))
      .then((r) => {
        if (requestSequence !== boardRequestRef.current) return;
        const rawYears = list(r.data);
        const boardYears = rawYears.filter((y) => {
          const bId = y.boardId ?? y.BoardId;
          return bId == null || String(bId) === String(ctx.board);
        });
        const finalYears = boardYears.length ? boardYears : rawYears;
        setYears(finalYears);
        if (!selectedAcademicYearId) {
          const active = finalYears.find((y) => y.isActive);
          if (active) setCtx((c) => ({ ...c, year: String(active.academicYearId ?? active.id) }));
        }
      })
      .catch((e) => { if (requestSequence === boardRequestRef.current) setMessage(getApiErrorMessage(e)); });

    // 2. Fetch Academic Levels for selected board
    apiClient
      .get(apiEndpoints.boards.academicLevels, { params: { boardId: ctx.board } })
      .catch(() => apiClient.get(`/api/v1/boards/${encodeURIComponent(ctx.board)}/academic-levels`))
      .catch(() => apiClient.get(apiEndpoints.academicLevels.list, { params: { boardId: ctx.board } }))
      .then((r) => { if (requestSequence === boardRequestRef.current) setLevels(levelsForBoard(list(r.data), ctx.board, boards)); })
      .catch((e) => { if (requestSequence === boardRequestRef.current) setMessage(getApiErrorMessage(e)); });

  }, [ctx.board, boards, selectedAcademicYearId]);

  // Cascading dependency: navbar academic context + Academic Level -> Groups
  useEffect(() => {
    const requestSequence = ++groupRequestRef.current;
    if (!ctx.board || !ctx.year || !ctx.level) {
      setGroups([]);
      setPrograms([]);
      setSections([]);
      return;
    }
    apiClient
      .get(apiEndpoints.groups.list, {
        params: {
          boardId: Number(ctx.board),
          academicYearId: Number(ctx.year),
        },
      })
      .then((response) => {
        if (requestSequence !== groupRequestRef.current) return;
        const scopedGroups = list(response.data).filter((group) =>
          matchesScope(ctx.board, boards, valueOf(group, "boardId", "BoardId"), valueOf(group, "boardName", "BoardName"), ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]) &&
          matchesScope(ctx.year, years, valueOf(group, "academicYearId", "AcademicYearId", "yearId", "YearId"), valueOf(group, "academicYearName", "AcademicYearName", "yearName", "YearName"), ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]) &&
          matchesScope(ctx.level, levels, valueOf(group, "academicLevelId", "AcademicLevelId", "levelId", "LevelId"), valueOf(group, "academicLevelName", "AcademicLevelName", "levelName", "LevelName"), ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name"]),
        );
        setGroups(scopedGroups);
      })
      .catch((error) => {
        if (requestSequence !== groupRequestRef.current) return;
        setGroups([]);
        setMessage(getApiErrorMessage(error));
      });
  }, [boards, ctx.board, ctx.level, ctx.year, levels, years]);

  // Cascading dependency: Group -> Programs
  useEffect(() => {
    const requestSequence = ++programRequestRef.current;
    if (!ctx.group) {
      setPrograms([]);
      setSections([]);
      return;
    }
    const g = groups.find((x) => String(x.groupId ?? x.id) === String(ctx.group));
    const embedded = g?.programs || g?.programmes;
    if (embedded?.length) {
      if (requestSequence === programRequestRef.current) setPrograms(embedded);
      return;
    }
    apiClient
      .get(apiEndpoints.groups.programs(ctx.group))
      .then((r) => { if (requestSequence === programRequestRef.current) setPrograms(list(r.data)); })
      .catch((e) => { if (requestSequence === programRequestRef.current) setMessage(getApiErrorMessage(e)); });
  }, [ctx.group, groups]);

  // Cascading dependency: Program -> Sections
  useEffect(() => {
    const requestSequence = ++sectionRequestRef.current;
    if (!ctx.program) {
      setSections([]);
      return;
    }
    const selectedProgram = programs.find(
      (program) =>
        String(program.programId ?? program.programmeId ?? program.id ?? program.groupProgramId) ===
        String(ctx.program),
    );
    const programId = selectedProgram?.programId ?? selectedProgram?.programmeId ?? ctx.program;
    const groupProgramId = selectedProgram?.groupProgramId ?? selectedProgram?.groupProgrammeId;
    const programme =
      selectedProgram?.programName ??
      selectedProgram?.programmeName ??
      selectedProgram?.programme ??
      selectedProgram?.name;
    const numericLevelId = Number(ctx.level);
    apiClient
      .get(apiEndpoints.sections.list, {
        params: {
          BoardId: ctx.board,
          AcademicYearId: ctx.year,
          ...(Number.isFinite(numericLevelId) && numericLevelId > 0 ? { AcademicLevelId: numericLevelId } : {}),
          GroupId: ctx.group,
          ProgramId: programId,
          ...(programme ? { Programme: programme } : {}),
          IsActive: true,
        },
      })
      .then((r) => {
        if (requestSequence !== sectionRequestRef.current) return;
        const programmeName = String(programme ?? "").trim().toLowerCase();
        const programmeSections = list(r.data).filter((section) => {
          const sectionProgramId = section?.programId ?? section?.ProgramId ?? section?.programmeId ?? section?.ProgrammeId;
          const sectionGroupProgramId = section?.groupProgramId ?? section?.GroupProgramId ?? section?.groupProgrammeId;
          const sectionProgrammeName = String(
            section?.programme ?? section?.Programme ?? section?.program ?? section?.Program ?? section?.programName ?? section?.ProgramName ?? "",
          ).trim().toLowerCase();
          return (
            String(sectionProgramId ?? "") === String(programId) ||
            (groupProgramId != null && String(sectionGroupProgramId ?? "") === String(groupProgramId)) ||
            (programmeName && sectionProgrammeName === programmeName)
          );
        });
        const groupSections = programmeSections.filter(
          (section) =>
            matchesScope(ctx.board, boards, valueOf(section, "boardId", "BoardId"), valueOf(section, "boardName", "BoardName"), ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]) &&
            matchesScope(ctx.year, years, valueOf(section, "academicYearId", "AcademicYearId", "yearId", "YearId"), valueOf(section, "academicYearName", "AcademicYearName", "yearName", "YearName"), ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]) &&
            matchesScope(ctx.level, levels, valueOf(section, "academicLevelId", "AcademicLevelId", "levelId", "LevelId"), valueOf(section, "academicLevelName", "AcademicLevelName", "levelName", "LevelName"), ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name"]) &&
            matchesScope(ctx.group, groups, valueOf(section, "groupId", "GroupId"), valueOf(section, "groupName", "GroupName"), ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]),
        );
        setSections(groupSections);
      })
      .catch((e) => {
        if (requestSequence !== sectionRequestRef.current) return;
        setSections([]);
        setMessage(getApiErrorMessage(e));
      });
  }, [boards, ctx.board, ctx.group, ctx.level, ctx.program, ctx.year, groups, levels, programs, years]);

  // Academic scope filtering:
  // Fields 1-5 (board, year, level, group, program) act as FILTERS.
  // Field 6 (section) is strictly the TARGET ALLOCATION section and does NOT filter out unallocated students.
  const academicRows = useMemo(
    () =>
      students.filter(
        (s) =>
          s.isApproved &&
          matchesScope(ctx.board, boards, s.boardId, s.boardName, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]) &&
          matchesScope(ctx.year, years, s.academicYearId, s.academicYearName, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]) &&
          matchesScope(ctx.level, levels, s.academicLevelId, s.academicLevelName, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name"]) &&
          matchesScope(ctx.group, groups, s.groupId, s.group, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]) &&
          matchesScope(ctx.program, programs, s.programId, s.programme, ["programId", "ProgramId", "programmeId", "ProgrammeId", "groupProgramId", "GroupProgramId", "id", "Id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "programme", "Programme", "name", "Name"]),
      ).sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" })),
    [boards, ctx.board, ctx.group, ctx.level, ctx.program, ctx.year, groups, levels, programs, students, years],
  );

  // Table toolbar instant search & filters
  const filteredRows = useMemo(() => {
    return academicRows.filter((s) => {
      // 1. Search by Student Name or Admission No.
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = String(s.name ?? "").toLowerCase().includes(q);
        const matchAdm = String(s.admissionNo ?? "").toLowerCase().includes(q);
        const matchgrp = String(s.groupId ?? s.Group ?? "").toLowerCase().includes(q);
        if (!matchName && !matchAdm && !matchgrp) return false;
      }
      // 2. Program filter in table toolbar
      if (tableProgramFilter) {
        const matchProgId = String(s.programId ?? "") === String(tableProgramFilter);
        const matchProgName = String(s.programme ?? "").toLowerCase() === String(tableProgramFilter).toLowerCase();
        if (!matchProgId && !matchProgName) return false;
      }
      // 3. Section filter in table toolbar
      if (tableSectionFilter) {
        if (tableSectionFilter === "pending") {
          const hasSection = Boolean(s.sectionId || (s.section && String(s.section).toLowerCase() !== "pending"));
          if (hasSection) return false;
        } else {
          const matchesId = String(s.sectionId ?? "") === String(tableSectionFilter);
          const matchesName = String(s.section ?? "").toLowerCase() === String(tableSectionFilter).toLowerCase();
          if (!matchesId && !matchesName) return false;
        }
      }
      return true;
    });
  }, [academicRows, searchQuery, tableProgramFilter, tableSectionFilter]);

  const rows = filteredRows;
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [ctx, searchQuery, tableProgramFilter, tableSectionFilter]);

  // Section options for toolbar filter and modals
  const tableSectionOptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    sections.forEach((sec) => {
      const id = String(sec.sectionId ?? sec.id ?? "");
      const name = sec.sectionName ?? sec.name;
      if (id && name && !seen.has(id)) {
        seen.add(id);
        result.push({ id, name });
      }
    });
    return result;
  }, [sections]);

  // Program options for toolbar filter: gathers options from master programs & all student records
  const tableProgramOptions = useMemo(() => {
    const seen = new Set();
    const result = [];
    programs.forEach((prog) => {
      const id = String(prog.programId ?? prog.id ?? "");
      const name = prog.programName ?? prog.name ?? prog.programmeName ?? prog.programme;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        result.push({ id: id || name, name });
      }
    });
    students.forEach((s) => {
      const name = s.programme || s.programName;
      if (name && name !== "—" && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        result.push({ id: s.programId ? String(s.programId) : name, name });
      }
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [programs, students]);

  // Master Checkbox synchronization
  const visibleIds = pageRows.map((r) => r.id);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !isAllVisibleSelected;

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomeVisibleSelected;
    }
  }, [isSomeVisibleSelected]);

  const toggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  // Bulk Change Section Handler
  const executeBulkChangeSection = async () => {
    if (bulkLoading || busy || isAllocating) return;
    const sectionIdNum = Number(bulkTargetSection);
    if (!sectionIdNum) return;
    const selectedStudents = students.filter((s) => selectedIds.includes(s.id) && s.isApproved);
    const targetSectionObj =
      sections.find((sec) => String(sec.sectionId ?? sec.id) === String(sectionIdNum)) ||
      sectionDirectory.find((sec) => String(sec.sectionId ?? sec.id) === String(sectionIdNum));

    const admissionIds = selectedStudents
      .map((s) => Number(s.admissionId))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!admissionIds.length) {
      setMessage("Selected students do not have valid admission records.");
      setMessageType("error");
      return;
    }

    setBulkLoading(true);
    let sectionAllocationSucceeded = false;
    try {
      await apiClient.post(apiEndpoints.studentAdmissions.bulkSection, {
        sectionId: sectionIdNum,
        admissionIds,
      });
      sectionAllocationSucceeded = true;
      const afterSectionStudents = await refreshStudentsFromBackend();
      const rollPlan = buildRollPlan({ sectionId: sectionIdNum, backendStudents: afterSectionStudents, candidates: selectedStudents });
      if (rollPlan.admissionIds.length) {
        await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, { sectionId: sectionIdNum, ...rollPlan });
      }
      await refreshStudentsFromBackend();

      const sectionName = targetSectionObj?.sectionName || targetSectionObj?.name || `Section ${sectionIdNum}`;
      setMessageType("success");
      setMessage(`Successfully allocated ${selectedStudents.length} student(s) to ${sectionName}.`);
      setSelectedIds([]);
      setBulkActionModal(null);
      setBulkTargetSection("");
    } catch (err) {
      setMessageType("error");
      if (sectionAllocationSucceeded) {
        await refreshStudentsFromBackend().catch(() => null);
        setMessage("Section allocation succeeded, but roll number generation failed. Please retry roll number generation.");
        setSelectedIds([]);
        setBulkActionModal(null);
        setBulkTargetSection("");
      } else {
        setMessage(getApiErrorMessage(err));
      }
    } finally {
      setBulkLoading(false);
    }
  };

  // Excel file selection inside the Import Modal
  const handleExcelFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedExcelFile(file);
      setExcelVerificationResult(null);
    }
  };

  // Dedicated verification function for the Excel file
  const handleVerifyExcelFile = () => {
    if (!selectedExcelFile) {
      setMessage("Please choose an Excel file to verify.");
      setMessageType("error");
      return;
    }

    setIsVerifying(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawJson || !rawJson.length) {
          setExcelVerificationResult({
            isValid: false,
            error: "The uploaded file contains no data rows.",
          });
          return;
        }

        let skippedRowsCount = 0;
        const validImportedRows = [];

        rawJson.forEach((row) => {
          const keys = Object.keys(row);
          const findVal = (regex) => {
            const k = keys.find((key) => regex.test(key.trim()));
            return k !== undefined ? String(row[k]).trim() : "";
          };

          const admNo = findVal(/^(adm|admission|admission_?no|admission_?number|admissionno|roll|roll_?no|student_?id|enrollment_?no)$/i);
          const name = findVal(/^(student_?name|name|full_?name|candidate_?name|studentname|student|fullname|first_?name)$/i);
          const prog = findVal(/^(program|programme|course|stream|branch)$/i);
          const reqSec = findVal(/^(section|sec|preferred_?section)$/i);

          if (admNo && name) {
            validImportedRows.push({
              admissionNo: admNo,
              name: name,
              programme: prog,
              requestedSection: reqSec,
              rawRow: row,
            });
          } else {
            skippedRowsCount++;
          }
        });

        if (!validImportedRows.length) {
          setExcelVerificationResult({
            isValid: false,
            error: "Validation failed: Every row must contain both a valid Admission Number and Student Name.",
            totalRows: rawJson.length,
            validRowsCount: 0,
            skippedRowsCount,
          });
          return;
        }

        const matchedList = validImportedRows.map((imported) => {
          const match = students.find(
            (s) =>
              (imported.admissionNo && String(s.admissionNo).trim().toLowerCase() === imported.admissionNo.toLowerCase()) ||
              (imported.name && String(s.name).trim().toLowerCase() === imported.name.toLowerCase())
          );
          return {
            ...imported,
            existingStudent: match || null,
            id: match?.id || `import-${imported.admissionNo || Math.random()}`,
            admissionId: match?.admissionId || "",
            studentId: match?.studentId || "",
            name: match?.name || imported.name || "Unnamed Student",
            admissionNo: match?.admissionNo || imported.admissionNo || "—",
            programId: match?.programId || "",
            programme: match?.programme || imported.programme || "General",
            groupId: match?.groupId || "",
            currentSection: match?.section || "Pending",
            currentSectionId: match?.sectionId || "",
            isApproved: match?.isApproved === true,
          };
        });

        const candidateSections = (sections.length ? sections : sectionDirectory).filter(
          (s) => s.isActive !== false
        );

        const sectionStatsMap = {};
        candidateSections.forEach((sec) => {
          const secId = String(sec.sectionId ?? sec.id);
          const maxCapacity = Number(sec.maximumStrength ?? sec.capacity ?? sec.strength ?? sec.maxStudents ?? 40);
          const currentAllocated = students.filter((s) => String(s.sectionId) === secId).length;
          sectionStatsMap[secId] = {
            sectionId: secId,
            sectionName: sec.sectionName ?? sec.name ?? `Section ${secId}`,
            programId: String(sec.programId ?? sec.programmeId ?? ""),
            programme: sec.programme ?? sec.programName ?? "",
            groupId: String(sec.groupId ?? ""),
            maxCapacity,
            currentAllocated,
            remainingCapacity: Math.max(0, maxCapacity - currentAllocated),
            newAllocatedCount: 0,
          };
        });

        const allocated = [];
        const overflow = [];

        matchedList.forEach((st) => {
          if (!st.isApproved) {
            overflow.push({
              ...st,
              proposedSectionId: "",
              proposedSectionName: "Approval Required",
              status: "Admission Approval Required",
              reason: "Only verified and approved admissions can be allocated.",
            });
            return;
          }
          let targetSec = null;

          const matchingSections = Object.values(sectionStatsMap).filter((sec) => {
            if (st.programId && sec.programId && String(sec.programId) !== String(st.programId)) return false;
            return true;
          });

          if (st.requestedSection) {
            const directMatch = matchingSections.find(
              (s) => s.sectionName.toLowerCase() === st.requestedSection.toLowerCase() && s.remainingCapacity > 0
            );
            if (directMatch) targetSec = directMatch;
          }

          if (!targetSec) {
            targetSec =
              matchingSections.find((s) => s.remainingCapacity > 0) ||
              Object.values(sectionStatsMap).find((s) => s.remainingCapacity > 0);
          }

          if (targetSec) {
            targetSec.remainingCapacity -= 1;
            targetSec.newAllocatedCount += 1;
            allocated.push({
              ...st,
              proposedSectionId: targetSec.sectionId,
              proposedSectionName: targetSec.sectionName,
              status: "Auto-Allocated",
            });
          } else {
            overflow.push({
              ...st,
              proposedSectionId: "",
              proposedSectionName: "Overflow (Approval Required)",
              status: "Capacity Overflow - Requires Approval",
              reason: "Section capacity limit reached. Requires administrator approval.",
            });
          }
        });

        setExcelVerificationResult({
          isValid: true,
          totalRows: rawJson.length,
          validRowsCount: validImportedRows.length,
          skippedRowsCount,
          allocatedCount: allocated.length,
          overflowCount: overflow.length,
          allocated,
          overflow,
          sectionStats: Object.values(sectionStatsMap),
          allCandidateSections: candidateSections,
        });
      } catch (err) {
        console.error("Excel parse error:", err);
        setExcelVerificationResult({
          isValid: false,
          error: "Failed to parse Excel file. Please ensure it is a valid spreadsheet format (.xlsx, .xls, .csv).",
        });
      } finally {
        setIsVerifying(false);
      }
    };
    reader.readAsArrayBuffer(selectedExcelFile);
  };

  // Proceed to the Capacity & Overflow Review Modal
  const handleProceedToAllocation = () => {
    if (!excelVerificationResult || !excelVerificationResult.isValid) return;
    setAllocationPreview({
      importedCount: excelVerificationResult.validRowsCount,
      allocated: excelVerificationResult.allocated,
      overflow: excelVerificationResult.overflow,
      sectionStats: excelVerificationResult.sectionStats,
      allCandidateSections: excelVerificationResult.allCandidateSections,
    });
    setPreviewTab(excelVerificationResult.overflow.length > 0 ? "overflow" : "allocated");
    setIsImportModalOpen(false);
  };

  // Confirm and save auto-allocation
  const handleConfirmSaveAllocation = async () => {
    if (isAllocating || bulkLoading || busy || !allocationPreview?.allocated?.length) return;
    setIsAllocating(true);
    let rollGenerationFailed = false;
    try {
      const groupsBySection = {};
      allocationPreview.allocated.forEach((st) => {
        if (!st.proposedSectionId) return;
        const admId = Number(st.admissionId);
        if (st.isApproved && Number.isFinite(admId) && admId > 0) {
          if (!groupsBySection[st.proposedSectionId]) {
            groupsBySection[st.proposedSectionId] = [];
          }
          groupsBySection[st.proposedSectionId].push({ ...st, admissionId: admId });
        }
      });
      if (!Object.keys(groupsBySection).length) throw new Error("No approved students with valid admission records are available for allocation.");

      let totalSaved = 0;
      for (const [secId, studentGroup] of Object.entries(groupsBySection)) {
        const admissionIds = studentGroup.map((item) => item.admissionId);
        const sectionIdNum = Number(secId);
        if (admissionIds.length) {
          await apiClient.post(apiEndpoints.studentAdmissions.bulkSection, {
            sectionId: sectionIdNum,
            admissionIds,
          });
          try {
            const afterSectionStudents = await refreshStudentsFromBackend();
            const rollPlan = buildRollPlan({ sectionId: sectionIdNum, backendStudents: afterSectionStudents, candidates: studentGroup });
            if (rollPlan.admissionIds.length) {
              await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, { sectionId: sectionIdNum, ...rollPlan });
            }
          } catch (rollError) {
            rollGenerationFailed = true;
            throw rollError;
          }
          totalSaved += admissionIds.length;
        }
      }

      await refreshStudentsFromBackend();

      setMessageType("success");
      setMessage(`Successfully allocated ${totalSaved} student(s) across sections.`);
      setAllocationPreview(null);
    } catch (err) {
      setMessageType("error");
      await refreshStudentsFromBackend().catch(() => null);
      if (rollGenerationFailed) {
        setMessage("Section allocation succeeded, but roll number generation failed. Please retry roll number generation.");
      } else {
        setMessage(getApiErrorMessage(err));
      }
    } finally {
      setIsAllocating(false);
    }
  };

  // Force-allocate all overflow students
  const handleForceAllocateAll = () => {
    if (!allocationPreview?.overflow?.length || !allocationPreview?.sectionStats?.length) return;
    const sectionsList = allocationPreview.sectionStats;
    let secIdx = 0;
    const eligibleOverflow = allocationPreview.overflow.filter((student) => student.isApproved);
    const ineligibleOverflow = allocationPreview.overflow.filter((student) => !student.isApproved);
    const newlyAllocated = eligibleOverflow.map((st) => {
      const chosenSection = sectionsList[secIdx % sectionsList.length];
      secIdx++;
      return {
        ...st,
        proposedSectionId: chosenSection.sectionId,
        proposedSectionName: chosenSection.sectionName,
        status: "Force-Allocated (Approved)",
      };
    });

    setAllocationPreview((prev) => ({
      ...prev,
      allocated: [...prev.allocated, ...newlyAllocated],
      overflow: ineligibleOverflow,
    }));
    setPreviewTab(ineligibleOverflow.length ? "overflow" : "allocated");
    setMessage(ineligibleOverflow.length
      ? "Approved overflow students were assigned. Unapproved admissions remain blocked."
      : "All overflow students approved and assigned to sections.");
    setMessageType("success");
  };

  const update = (k, v) =>
    setCtx((c) => ({
      ...c,
      [k]: v,
      ...(k === "board" ? { year: "", level: "", group: "", program: "", section: "" } : {}),
      ...(k === "level" ? { group: "", program: "", section: "" } : {}),
      ...(k === "group" ? { program: "", section: "" } : {}),
      ...(k === "program" ? { section: "" } : {}),
    }));

  const save = async () => {
    if (busy || bulkLoading || isAllocating) return;
    const selectedStudents = rows.filter((student) => student.isApproved);
    const ids = selectedStudents
      .map((student) => Number(student.admissionId))
      .filter((id) => Number.isFinite(id) && id > 0),
      sectionId = Number(ctx.section);
    if (!sectionId)
      return setMessage("Please select a Target Section from the dropdown above to allocate students.");
    if (!ids.length)
      return setMessage("Only verified and approved admissions can be allocated to a section.");
    setBusy("save");
    let sectionAllocationSucceeded = false;
    try {
      await apiClient.post(apiEndpoints.studentAdmissions.bulkSection, {
        sectionId,
        admissionIds: ids,
      });
      sectionAllocationSucceeded = true;
      const afterSectionStudents = await refreshStudentsFromBackend();
      const rollPlan = buildRollPlan({ sectionId, backendStudents: afterSectionStudents, candidates: selectedStudents });
      if (rollPlan.admissionIds.length) {
        await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, { sectionId, ...rollPlan });
      }
      await refreshStudentsFromBackend();
      setMessageType("success");
      setMessage("Section allocation and roll numbers saved successfully.");
    } catch (e) {
      setMessageType("error");
      if (sectionAllocationSucceeded) {
        await refreshStudentsFromBackend().catch(() => null);
        setMessage("Section allocation succeeded, but roll number generation failed. Please retry roll number generation.");
      } else {
        setMessage(getApiErrorMessage(e));
      }
    } finally {
      setBusy("");
    }
  };

  const rolls = async () => {
    if (busy || bulkLoading || isAllocating) return;
    const sectionId = Number(ctx.section);
    const selectedSectionName = sections.find(
      (section) => String(section.sectionId ?? section.id) === String(sectionId),
    )?.sectionName;
    if (!sectionId) return setMessage("Please select a Target Section before generating roll numbers.");
    const sectionCandidates = students
      .filter(
        (student) =>
          student.isApproved &&
          (Number(student.sectionId) === sectionId ||
            (!student.sectionId &&
              String(student.section).trim().toLowerCase() ===
              String(selectedSectionName ?? "").trim().toLowerCase())),
      );
    if (!sectionCandidates.length)
      return setMessage("Allocate students to a section before generating roll numbers.");
    setBusy("roll");
    try {
      const backendStudents = await refreshStudentsFromBackend();
      const rollPlan = buildRollPlan({ sectionId, backendStudents, candidates: sectionCandidates });
      if (!rollPlan.admissionIds.length) {
        setMessageType("success");
        setMessage("All allocated students in this section already have roll numbers.");
        return;
      }
      await apiClient.post(apiEndpoints.studentAdmissions.bulkRollNumbers, { sectionId, ...rollPlan });
      await refreshStudentsFromBackend();
      setMessageType("success");
      setMessage("Roll numbers generated successfully.");
    } catch (e) {
      setMessageType("error");
      setMessage(getApiErrorMessage(e));
    } finally {
      setBusy("");
    }
  };

  const opt = (arr, idKey, labelKey) =>
    (arr || []).map((x) => {
      const id =
        x?.[idKey] ??
        (idKey === "programId" ? x?.programmeId ?? x?.groupProgramId : undefined) ??
        x?.id ??
        x?.value ??
        x;
      const label =
        x?.[labelKey] ??
        (labelKey === "programName" ? x?.programmeName ?? x?.programme : undefined) ??
        x?.name ??
        x?.label ??
        x;
      return (
        <option key={String(id)} value={id}>
          {label}
        </option>
      );
    });

  const allocationChanged = (student, updated) => {
    setStudents((current) => current.map((item) => item.id === student.id ? { ...item, ...updated } : item));
    setChangingStudent(null);
    setMessageType("success");
    setMessage("Program/Section changed successfully.");
  };

  return (
    <DashboardLayout
      title="Section Allocation"
      subtitle="Allocate admitted students by admission order before generating roll numbers."
      breadcrumb={["People", "Section Allocation"]}
      excludeNotificationSources={EXCLUDED_NOTIFICATION_SOURCES}
    >
      <section className="cms-card">
        <div className="cms-card-body student-management-filters">
          {[
            ["Academic Level", "level", levels, "academicLevelId", "levelName"],
            ["Group", "group", groups, "groupId", "groupName"],
            ["Program", "program", programs, "programId", "programName"],
            ["Target Section", "section", sections, "sectionId", "sectionName"],
          ].map(([l, k, a, i, n]) => (
            <label className="cms-field" key={k}>
              <span>{l}</span>
              <select value={ctx[k]} onChange={(e) => update(k, e.target.value)}>
                <option value="">Select {l}</option>
                {opt(a, i, n)}
              </select>
            </label>
          ))}
        </div>
        <div className="student-management-actions">
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={!!busy}>
            {busy === "save" ? "Saving..." : "Save Section Allocation"}
          </button>
          <button className="cms-btn cms-btn-ghost" onClick={rolls} disabled={!!busy}>
            {busy === "roll" ? "Generating..." : "Generate Roll Numbers"}
          </button>
        </div>
      </section>

      <section className="cms-card">
        {/* ============================================================ */}
        {/* TOOLBAR MATCHING REFERENCE SCREENSHOT                       */}
        {/* ============================================================ */}
        <div className="allocation-toolbar">
          {/* Search bar on left */}
          <div className="allocation-search">
            <Search3DIcon size={16} />
            <input
              type="search"
              placeholder="Search by Name, Admission No,G..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="allocation-search-clear"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Pill dropdown filters */}
          <div className="allocation-toolbar-filters">
            {/* Program Filter */}
            <div className="allocation-filter-pill">
              <select
                value={tableProgramFilter}
                onChange={(e) => {
                  setTableProgramFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Program</option>
                {tableProgramOptions.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="allocation-pill-icon" />
            </div>

            {/* Section Filter */}
            <div className="allocation-filter-pill">
              <select
                value={tableSectionFilter}
                onChange={(e) => {
                  setTableSectionFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Section</option>
                <option value="pending">Pending / Unallocated</option>
                {tableSectionOptions.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="allocation-pill-icon" />
            </div>
          </div>

          <div className="allocation-toolbar-spacer" />
        </div>

        {/* Dynamic Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="allocation-bulk-bar">
            <div className="allocation-bulk-info">
              <span className="allocation-bulk-badge">
                <CheckSquare size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {selectedIds.length} Student{selectedIds.length > 1 ? "s" : ""} Selected
              </span>
              {selectedIds.length < rows.length && (
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{ height: 26, fontSize: 12, padding: "0 8px", background: "transparent" }}
                  onClick={() => setSelectedIds(rows.map((r) => r.id))}
                >
                  Select all {rows.length} filtered
                </button>
              )}
            </div>
            <div className="allocation-bulk-actions">
              <button
                type="button"
                className="cms-btn cms-btn-primary allocation-bulk-btn"
                onClick={() => {
                  setBulkTargetSection("");
                  setBulkActionModal("section");
                }}
                disabled={bulkLoading}
              >
                <Users size={14} />
                Bulk Allocate Section
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost allocation-bulk-btn"
                onClick={clearSelection}
                disabled={bulkLoading}
              >
                <X size={14} />
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                {/* Starting Column: Master Checkbox */}
                <th className="allocation-th-checkbox">
                  <input
                    type="checkbox"
                    className="allocation-checkbox"
                    ref={masterCheckboxRef}
                    checked={isAllVisibleSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all students on active page"
                  />
                </th>
                <th>Student Name</th>
                <th>Admission No.</th>
                <th>Academic Level</th>
                <th>Group</th>
                <th>Program</th>
                <th>Section</th>
                <th>Roll No.</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                <tr>
                  <td colSpan="10">
                    <div className="cms-empty">Loading admitted students...</div>
                  </td>
                </tr>
              ) : pageRows.length ? (
                pageRows.map((s) => (
                  <tr key={s.id} className={selectedIds.includes(s.id) ? "row-selected" : ""}>
                    {/* Starting Column: Row Checkbox */}
                    <td className="allocation-td-checkbox">
                      <input
                        type="checkbox"
                        className="allocation-checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelectRow(s.id)}
                        aria-label={`Select student ${s.name}`}
                      />
                    </td>
                    <td>{s.name}</td>
                    <td>{s.admissionNo}</td>
                    <td className="allocation-level-cell">
                      <div className="allocation-level-main">
                        {s.academicLevelName ||
                          levelDirectory.find((l) => String(l.academicLevelId ?? l.id) === String(s.academicLevelId))?.levelName ||
                          levels.find((l) => String(l.academicLevelId ?? l.id) === String(s.academicLevelId))?.levelName ||
                          "Level —"}
                      </div>
                      <div className="allocation-level-sub">
                        {s.academicLevelCode ||
                          levelDirectory.find((l) => String(l.academicLevelId ?? l.id) === String(s.academicLevelId))?.levelCode ? (
                          <span className="allocation-level-badge">
                            {s.academicLevelCode ||
                              levelDirectory.find((l) => String(l.academicLevelId ?? l.id) === String(s.academicLevelId))?.levelCode}
                          </span>
                        ) : null}
                        <span>{s.academicYearName ? `AY: ${s.academicYearName}` : "—"}</span>
                      </div>
                    </td>
                    <td>{s.group || groups.find((g) => String(g.groupId ?? g.id) === String(s.groupId))?.groupName || "—"}</td>
                    <td>{s.programme || programs.find((program) => String(program.programId ?? program.id) === String(s.programId))?.programName || "—"}</td>
                    <td>{s.section || sectionDirectory.find((section) => String(section.sectionId ?? section.id) === String(s.sectionId))?.sectionName || sections.find((section) => String(section.sectionId ?? section.id) === String(s.sectionId))?.sectionName || "Pending"}</td>
                    <td>{s.roll || "Pending"}</td>
                    <td>
                      <StatusBadge value={s.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cms-action-btn"
                        aria-label={`Edit allocation for ${s.name}`}
                        title="Edit program or section"
                        disabled={!Number(s.studentId) || !Number(s.groupId)}
                        onClick={() => setChangingStudent(s)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10">
                    <div className="cms-empty">No admitted students found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!studentsLoading && (
          <footer className="section-allocation-pagination">
            <span>
              Showing {rows.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, rows.length)} of {rows.length} students
            </span>
            <div className="section-allocation-pagination-actions">
              <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                Next
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* Existing Change Allocation Modal */}
      {changingStudent ? (
        <ChangeAllocationModal
          student={changingStudent}
          onClose={() => setChangingStudent(null)}
          onChanged={allocationChanged}
        />
      ) : null}

      {/* Bulk Change Section Modal */}
      {bulkActionModal === "section" && (
        <Modal
          title="Bulk Change Section"
          size="sm"
          className="section-allocation-change-modal"
          onClose={() => !bulkLoading && setBulkActionModal(null)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setBulkActionModal(null)}
                disabled={bulkLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={executeBulkChangeSection}
                disabled={bulkLoading || !bulkTargetSection}
              >
                {bulkLoading ? "Allocating..." : `Allocate ${selectedIds.length} Students`}
              </button>
            </>
          }
        >
          <div className="section-allocation-change-content">
            <p>
              Assign <strong>{selectedIds.length}</strong> selected student(s) to a target section:
            </p>
            <label className="cms-field">
              <span>Target Section <span className="req">*</span></span>
              <select
                value={bulkTargetSection}
                onChange={(e) => setBulkTargetSection(e.target.value)}
                disabled={bulkLoading}
              >
                <option value="">Select Target Section</option>
                {tableSectionOptions.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Modal>
      )}

      {/* Excel Import & Verification Modal */}
      {isImportModalOpen && (
        <Modal
          title="Import Excel & Auto-Allocate Students"
          size="md"
          className="excel-import-modal"
          onClose={() => {
            if (!isVerifying) {
              setIsImportModalOpen(false);
              setSelectedExcelFile(null);
              setExcelVerificationResult(null);
            }
          }}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedExcelFile(null);
                  setExcelVerificationResult(null);
                }}
                disabled={isVerifying}
              >
                Cancel
              </button>

              {!excelVerificationResult?.isValid ? (
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleVerifyExcelFile}
                  disabled={!selectedExcelFile || isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Verify & Validate Excel"}
                </button>
              ) : (
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleProceedToAllocation}
                >
                  Proceed to Section Allocation ({excelVerificationResult.validRowsCount} Students)
                </button>
              )}
            </>
          }
        >
          <div className="excel-import-modal-content">
            {/* File Dropzone / Selector */}
            {!selectedExcelFile ? (
              <label className="excel-dropzone">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: "none" }}
                  onChange={handleExcelFileSelect}
                />
                <div className="excel-dropzone-icon">
                  <FileSpreadsheet size={22} />
                </div>
                <span className="excel-dropzone-title">Click to upload or drag & drop Excel</span>
                <span className="excel-dropzone-subtitle">Supported formats: .xlsx, .xls, .csv</span>
              </label>
            ) : (
              <div className="excel-file-card">
                <div className="excel-file-info">
                  <FileSpreadsheet size={24} color="var(--cms-primary, #6F8400)" />
                  <div>
                    <strong>{selectedExcelFile.name}</strong>
                    <span>{(selectedExcelFile.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{ height: 30, padding: "0 10px", fontSize: 12 }}
                  onClick={() => {
                    setSelectedExcelFile(null);
                    setExcelVerificationResult(null);
                  }}
                  disabled={isVerifying}
                >
                  Change File
                </button>
              </div>
            )}

            {/* Verification Result Panel */}
            {excelVerificationResult && (
              <div className="excel-verify-box">
                <div className="excel-verify-header">
                  <strong>Verification Status</strong>
                  {excelVerificationResult.isValid ? (
                    <span className="excel-verify-badge valid">
                      <CheckCircle2 size={13} />
                      Verified & Ready
                    </span>
                  ) : (
                    <span className="excel-verify-badge invalid">
                      <AlertTriangle size={13} />
                      Validation Failed
                    </span>
                  )}
                </div>

                {excelVerificationResult.isValid ? (
                  <>
                    <div className="excel-verify-grid">
                      <div className="excel-verify-stat">
                        <span className="excel-verify-stat-label">Valid Records</span>
                        <span className="excel-verify-stat-val" style={{ color: "var(--cms-primary, #6F8400)" }}>
                          {excelVerificationResult.validRowsCount}
                        </span>
                      </div>
                      <div className="excel-verify-stat">
                        <span className="excel-verify-stat-label">Within Capacity</span>
                        <span className="excel-verify-stat-val" style={{ color: "var(--cms-green, #0f9d58)" }}>
                          {excelVerificationResult.allocatedCount}
                        </span>
                      </div>
                      <div className="excel-verify-stat">
                        <span className="excel-verify-stat-label">Capacity Overflow</span>
                        <span
                          className="excel-verify-stat-val"
                          style={{
                            color:
                              excelVerificationResult.overflowCount > 0
                                ? "var(--cms-red, #d93636)"
                                : "var(--cms-muted)",
                          }}
                        >
                          {excelVerificationResult.overflowCount}
                        </span>
                      </div>
                    </div>

                    {excelVerificationResult.skippedRowsCount > 0 && (
                      <p style={{ margin: 0, fontSize: 12, color: "var(--cms-amber, #b7791f)" }}>
                        ⚠️ {excelVerificationResult.skippedRowsCount} row(s) were skipped due to missing Admission Number or Student Name.
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--cms-red, #d93636)" }}>
                    {excelVerificationResult.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Allocation Review & Capacity Approval Modal */}
      {allocationPreview && (
        <Modal
          title="Excel Auto-Allocation & Capacity Review"
          size="lg"
          className="allocation-review-modal"
          onClose={() => !isAllocating && setAllocationPreview(null)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setAllocationPreview(null)}
                disabled={isAllocating}
              >
                Cancel
              </button>
              {allocationPreview.overflow.length > 0 && (
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{ color: "var(--cms-amber, #b7791f)", borderColor: "var(--cms-amber, #b7791f)" }}
                  onClick={handleForceAllocateAll}
                  disabled={isAllocating}
                  title="Force-allocates overflow students into sections evenly"
                >
                  Approve & Force Allocate All
                </button>
              )}
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleConfirmSaveAllocation}
                disabled={isAllocating || !allocationPreview.allocated.length}
              >
                {isAllocating ? "Saving..." : `Confirm & Save (${allocationPreview.allocated.length} Allocated)`}
              </button>
            </>
          }
        >
          <div>
            {/* Summary Metrics */}
            <div className="allocation-preview-metrics">
              <div className="allocation-metric-card">
                <span className="allocation-metric-title">Total Processed</span>
                <span className="allocation-metric-value">{allocationPreview.importedCount}</span>
              </div>
              <div className="allocation-metric-card highlight">
                <span className="allocation-metric-title">Auto-Allocated</span>
                <span className="allocation-metric-value" style={{ color: "var(--cms-primary, #6F8400)" }}>
                  {allocationPreview.allocated.length}
                </span>
              </div>
              <div className={`allocation-metric-card ${allocationPreview.overflow.length ? "danger" : ""}`}>
                <span className="allocation-metric-title">Capacity Overflow</span>
                <span className="allocation-metric-value" style={{ color: allocationPreview.overflow.length ? "var(--cms-red, #d93636)" : "var(--cms-muted)" }}>
                  {allocationPreview.overflow.length}
                </span>
              </div>
            </div>

            {/* Tab Headers */}
            <div className="allocation-preview-tabs">
              <button
                type="button"
                className={`allocation-preview-tab-btn ${previewTab === "allocated" ? "active" : ""}`}
                onClick={() => setPreviewTab("allocated")}
              >
                <CheckCircle2 size={15} />
                Auto-Allocated ({allocationPreview.allocated.length})
              </button>
              <button
                type="button"
                className={`allocation-preview-tab-btn ${previewTab === "overflow" ? "active" : ""}`}
                onClick={() => setPreviewTab("overflow")}
              >
                <AlertTriangle size={15} />
                Overflow ({allocationPreview.overflow.length})
              </button>
              <button
                type="button"
                className={`allocation-preview-tab-btn ${previewTab === "sections" ? "active" : ""}`}
                onClick={() => setPreviewTab("sections")}
              >
                <Users size={15} />
                Section Capacities ({allocationPreview.sectionStats.length})
              </button>
            </div>

            {/* Tab 1: Allocated List */}
            {previewTab === "allocated" && (
              <div className="allocation-preview-table-wrap">
                <table className="cms-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Admission No</th>
                      <th>Program</th>
                      <th>Assigned Section</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationPreview.allocated.length ? (
                      allocationPreview.allocated.map((st, idx) => (
                        <tr key={`alloc-${st.id || idx}`}>
                          <td>{st.name}</td>
                          <td>{st.admissionNo}</td>
                          <td>{st.programme}</td>
                          <td>
                            <strong>{st.proposedSectionName}</strong>
                          </td>
                          <td>
                            <span className="cms-badge" style={{ background: "var(--cms-green-soft, #e6f6ee)", color: "var(--cms-green, #0f9d58)", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                              Auto-Allocated
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: 20, color: "var(--cms-muted)" }}>
                          No students allocated yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Overflow List */}
            {previewTab === "overflow" && (
              <div className="allocation-preview-table-wrap">
                <table className="cms-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Admission No</th>
                      <th>Program</th>
                      <th>Reason</th>
                      <th>Override Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationPreview.overflow.length ? (
                      allocationPreview.overflow.map((st, idx) => (
                        <tr key={`ovf-${st.id || idx}`}>
                          <td>{st.name}</td>
                          <td>{st.admissionNo}</td>
                          <td>{st.programme}</td>
                          <td style={{ color: "var(--cms-red, #d93636)", fontSize: 12 }}>
                            {st.reason}
                          </td>
                          <td>
                            <select
                              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--cms-border)" }}
                              value={st.proposedSectionId || ""}
                              onChange={(e) => {
                                const secId = e.target.value;
                                const secObj = allocationPreview.sectionStats.find((s) => String(s.sectionId) === String(secId));
                                setAllocationPreview((prev) => {
                                  const updatedOverflow = prev.overflow.filter((_, i) => i !== idx);
                                  const movedItem = {
                                    ...st,
                                    proposedSectionId: secId,
                                    proposedSectionName: secObj?.sectionName || `Section ${secId}`,
                                    status: "Manually Approved",
                                  };
                                  return {
                                    ...prev,
                                    allocated: [...prev.allocated, movedItem],
                                    overflow: updatedOverflow,
                                  };
                                });
                              }}
                            >
                              <option value="">Select Section to Override</option>
                              {allocationPreview.sectionStats.map((sec) => (
                                <option key={sec.sectionId} value={sec.sectionId}>
                                  {sec.sectionName} (Cap: {sec.maxCapacity}, Occ: {sec.currentAllocated + sec.newAllocatedCount})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: 20, color: "var(--cms-green, #0f9d58)" }}>
                          No capacity overflow. All students fit within available section capacities!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Section Capacities */}
            {previewTab === "sections" && (
              <div className="allocation-section-cards">
                {allocationPreview.sectionStats.map((sec) => {
                  const totalAllocated = sec.currentAllocated + sec.newAllocatedCount;
                  const percent = Math.min(100, Math.round((totalAllocated / (sec.maxCapacity || 1)) * 100));
                  const isFull = totalAllocated >= sec.maxCapacity;
                  const isNearFull = percent >= 85 && !isFull;
                  const fillClass = isFull ? "full" : isNearFull ? "warning" : "normal";

                  return (
                    <div key={sec.sectionId} className="capacity-card">
                      <div className="capacity-header">
                        <span>{sec.sectionName}</span>
                        <span style={{ color: isFull ? "var(--cms-red, #d93636)" : "var(--cms-primary, #6F8400)" }}>
                          {totalAllocated} / {sec.maxCapacity} ({percent}%)
                        </span>
                      </div>
                      <div className="capacity-meter-track">
                        <div
                          className={`capacity-meter-fill ${fillClass}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="capacity-subtext">
                        {sec.newAllocatedCount > 0 && <span>+{sec.newAllocatedCount} new · </span>}
                        {isFull ? "Section is at maximum capacity" : `${Math.max(0, sec.maxCapacity - totalAllocated)} slots available`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      <Toast message={message} type={messageType} onClose={() => setMessage("")} />
    </DashboardLayout>
  );
}

function ChangeAllocationModal({ student, onClose, onChanged }) {
  const [detail, setDetail] = useState(student);
  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [programId, setProgramId] = useState(String(student.programId ?? ""));
  const [sectionId, setSectionId] = useState(String(student.sectionId ?? ""));
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const groupId = valueOf(detail, "groupId", "GroupId") ?? student.groupId;
  const currentProgramId = String(valueOf(detail, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? student.programId ?? "");
  const currentSectionId = String(valueOf(detail, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId") ?? student.sectionId ?? "");
  const currentProgramName = valueOf(detail, "programName", "ProgramName", "programmeName", "ProgrammeName", "programme", "Programme") ?? student.programme ?? "—";
  const currentSectionName = valueOf(detail, "sectionName", "SectionName", "allocatedSectionName", "AllocatedSectionName") ?? student.section ?? "—";
  const currentRoll = valueOf(detail, "rollNumber", "RollNumber", "rollNo", "RollNo") ?? student.roll ?? "Pending";

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      student.admissionId ? apiClient.get(apiEndpoints.studentAdmissions.getById(student.admissionId)) : Promise.resolve({ data: {} }),
      apiClient.get(apiEndpoints.groups.programs(student.groupId)),
    ]).then(([detailResult, programsResult]) => {
      if (!active) return;
      if (detailResult.status === "fulfilled") {
        const current = objectFrom(detailResult.value.data);
        setDetail((value) => ({ ...value, ...current }));
        setProgramId(String(valueOf(current, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? student.programId ?? ""));
        setSectionId(String(valueOf(current, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId") ?? student.sectionId ?? ""));
      }
      if (programsResult.status === "fulfilled") setPrograms(list(programsResult.value.data));
      else setError(getApiErrorMessage(programsResult.reason));
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [student]);

  useEffect(() => {
    if (!programId) { setSections([]); return undefined; }
    let active = true;
    const selectedProgram = programs.find((program) => String(programIdOf(program)) === String(programId));
    const actualProgramId = valueOf(selectedProgram, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? programId;
    const groupProgramId = valueOf(selectedProgram, "groupProgramId", "GroupProgramId", "groupProgrammeId", "GroupProgrammeId");
    setSectionsLoading(true);
    setError("");
    apiClient.get(apiEndpoints.sections.list, { params: { ProgramId: actualProgramId, IsActive: true } })
      .then((response) => {
        if (!active) return;
        const available = list(response.data).filter((section) => {
          const sectionProgramId = valueOf(section, "programId", "ProgramId", "programmeId", "ProgrammeId");
          const sectionGroupProgramId = valueOf(section, "groupProgramId", "GroupProgramId", "groupProgrammeId", "GroupProgrammeId");
          const sectionGroupId = valueOf(section, "groupId", "GroupId");
          const belongsToProgram = String(sectionProgramId ?? "") === String(actualProgramId)
            || (groupProgramId != null && String(sectionGroupProgramId ?? "") === String(groupProgramId));
          return belongsToProgram && (sectionGroupId == null || String(sectionGroupId) === String(groupId));
        });
        setSections(available);
        setSectionId((current) => available.some((section) => String(sectionIdOf(section)) === String(current)) ? current : "");
      })
      .catch((requestError) => active && setError(getApiErrorMessage(requestError)))
      .finally(() => active && setSectionsLoading(false));
    return () => { active = false; };
  }, [groupId, programId, programs]);

  const unchanged = String(programId) === currentProgramId && String(sectionId) === currentSectionId;
  const selectedSection = sections.find((section) => String(sectionIdOf(section)) === String(sectionId));
  const selectedProgram = programs.find((program) => String(programIdOf(program)) === String(programId));
  const confirm = async () => {
    const admissionId = Number(student.admissionId);
    const studentId = Number(student.studentId);
    const nextProgramId = Number(programId);
    const nextSectionId = Number(sectionId);
    if (!studentId) return setError("This student does not contain a valid Student ID.");
    if (!nextProgramId || !nextSectionId) return setError("New Program and New Section are required.");
    if (!selectedSection) return setError("The selected section does not belong to the selected program.");
    if (unchanged) return setError("Please select a different program or section.");
    setSaving(true); setError("");
    try {
      const response = await changeStudentAllocation({ admissionId: admissionId || undefined, studentId, currentProgramId: Number(currentProgramId), programId: nextProgramId, sectionId: nextSectionId, student });
      const result = objectFrom(response.data);
      onChanged(student, {
        programId: nextProgramId,
        programme: valueOf(result, "programName", "ProgramName", "programmeName", "ProgrammeName") ?? programNameOf(selectedProgram),
        sectionId: nextSectionId,
        section: valueOf(result, "sectionName", "SectionName") ?? sectionNameOf(selectedSection),
        roll: valueOf(result, "rollNumber", "RollNumber", "rollNo", "RollNo") ?? "",
      });
    } catch (requestError) {
      setError(requestError.sectionAllocationSucceeded
        ? "Section allocation succeeded, but roll number generation failed. Please retry roll number generation."
        : getApiErrorMessage(requestError));
    }
    finally { setSaving(false); }
  };

  return <Modal title="Change Program / Section" size="sm" className="section-allocation-change-modal" onClose={saving ? () => { } : onClose} footer={<><button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="cms-btn cms-btn-primary" onClick={confirm} disabled={loading || sectionsLoading || saving || !programId || !sectionId}>{saving ? "Changing..." : "Confirm Change"}</button></>}>
    <div className="section-allocation-change-content">
      <div className="section-allocation-student"><strong>{student.name}</strong><span>· {student.admissionNo}</span></div>
      <p>Current: {currentProgramName} · Section {currentSectionName} · Roll No {currentRoll}</p>
      {error ? <div className="section-allocation-change-error" role="alert">{error}</div> : null}
      <div className="section-allocation-change-fields">
        <label className="cms-field"><span>New Program <span className="req">*</span></span><select value={programId} disabled={loading || saving} onChange={(event) => { setProgramId(event.target.value); setSectionId(""); setError(""); }}><option value="">Select New Program</option>{programs.map((program) => <option key={String(programIdOf(program))} value={programIdOf(program)}>{programNameOf(program)}</option>)}</select></label>
        <label className="cms-field"><span>New Section <span className="req">*</span></span><select value={sectionId} disabled={!programId || sectionsLoading || saving} onChange={(event) => { setSectionId(event.target.value); setError(""); }}><option value="">{sectionsLoading ? "Loading sections..." : "Select New Section"}</option>{sections.map((section) => <option key={String(sectionIdOf(section))} value={sectionIdOf(section)}>{sectionNameOf(section)}</option>)}</select></label>
      </div>
    </div>
  </Modal>;
}
