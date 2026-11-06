import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  FileCheck,
  Search,
  Filter,
  Check,
  X,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { useFacultySafe } from "../FacultyContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient from "@/api/axios.js";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import "../styles/FacultyMarks.css";
import FacultySearchableSelect from "../components/FacultySearchableSelect.jsx";


const normalizeSubjectName = (name) => {
  return String(name || "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*-\s*[ivx0-9]+/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

// Safe ID extractor preventing [object Object] serialization
const extractId = (val) => {
  if (val == null) return "";
  if (typeof val === "object") {
    const candidate = val.boardId ?? val.academicYearId ?? val.id ?? val.value;
    if (candidate != null && typeof candidate !== "object") {
      return String(candidate).trim();
    }
    return "";
  }
  const str = String(val).trim();
  if (str === "[object Object]" || str === "undefined" || str === "null") return "";
  return str;
};

const isObjectiveExam = (exam) => {
  if (!exam) return false;
  const cat = String(exam.examCategory || exam.category || "").trim().toUpperCase();
  if (cat === "OBJECTIVE") return true;
  if (cat === "REGULAR") return false;

  const mode = String(exam.scheduleMode || exam.mode || exam.examMode || "").trim().toUpperCase();
  if (["OBJECTIVE", "COMBINED_OBJECTIVE"].includes(mode)) return true;
  if (mode === "SUBJECT_WISE" || mode === "REGULAR") return false;

  const pat = String(exam.examPattern || exam.pattern || exam.patternName || "").trim().toLowerCase();
  if (pat.includes("regular")) return false;
  if (
    pat.includes("objective") ||
    pat.includes("mains") ||
    pat.includes("neet") ||
    pat.includes("jee") ||
    pat.includes("bitsat") ||
    pat.includes("cuet")
  ) {
    return true;
  }
  return false;
};

const fetchAuthoritativeSectionStudents = async (filters = {}, campusId = null) => {
  const sectionId = filters.section;
  if (!sectionId) return [];

  const studentMap = new Map();

  const addRecords = (records) => {
    (records || []).forEach((s) => {
      const sId = String(s.studentId ?? s.id ?? '');
      if (!sId) return;
      if (s.isActive === false || String(s.status || '').toLowerCase() === 'inactive') return;
      const admNo = String(s.admissionNo ?? s.admissionNumber ?? s.AdmissionNo ?? '').trim();
      const admissionDate = s.admissionDate || s.dateOfAdmission || s.allocatedDate || null;

      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: Number(sId),
          admissionNo: admNo,
          rollNo: String(s.rollNumber ?? s.rollNo ?? s.roll ?? '').trim(),
          name: s.studentName ?? s.fullName ?? s.name ?? `Student #${sId}`,
          isActive: true,
          admissionDate: admissionDate ? String(admissionDate).slice(0, 10) : null,
          allocatedDate: s.allocatedDate || s.allocationDate || s.assignedDate || admissionDate || null,
        });
      }
    });
  };

  // Section Students API call matching Admin / Student Management with full pagination
  try {
    const fetchSize = 100;
    for (let pageNumber = 1; ; pageNumber += 1) {
      const params = {
        boardId: filters.board ? Number(filters.board) : undefined,
        academicYearId: filters.year ? Number(filters.year) : undefined,
        ...(filters.level ? { academicLevelId: Number(filters.level) } : {}),
        ...(filters.group ? { groupId: Number(filters.group) } : {}),
        ...(filters.program ? { programId: Number(filters.program) } : {}),
        sectionId: Number(sectionId) || sectionId,
        campusId: campusId ? Number(campusId) : undefined,
        pageNumber,
        pageSize: fetchSize,
      };
      const res = await apiClient.get('/api/v1/students', {
        params,
        skipGlobalLoader: true,
      }).catch(() => null);
      const payload = res?.data?.data ?? res?.data?.Data ?? res?.data ?? {};
      const batch = Array.isArray(payload)
        ? payload
        : payload.items ?? payload.Items ?? payload.results ?? payload.Results ?? payload.$values ?? [];
      addRecords(batch);
      const total = payload.totalCount ?? payload.TotalCount;
      if (!batch.length || (total != null ? studentMap.size >= Number(total) : batch.length < fetchSize)) break;
    }
  } catch (err) {
    console.warn('Notice: could not query students endpoint in FacultyMarks:', err);
  }

  // Authoritative query only - no unconstrained fallbacks



  const list = Array.from(studentMap.values());
  list.sort((a, b) => {
    if (a.rollNo && b.rollNo) {
      const cmp = a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true });
      if (cmp !== 0) return cmp;
    }
    return (a.name || '').localeCompare(b.name || '');
  });

  return list;
};


// Helper to validate whether a faculty subject is included in the selected examination configuration
const validateSubjectExamInclusion = (examObj, subjectId, targetSubj, altAlloc, schedules = []) => {
  if (!examObj || !subjectId) return { isValid: false, error: null };

  const isObjective = isObjectiveExam(examObj);
  const targetIdStr = String(subjectId).trim();
  const altIdStr = altAlloc?.subjectId ? String(altAlloc.subjectId).trim() : null;
  const targetName = (targetSubj?.subjectName || "").trim().toLowerCase();
  const targetCode = (targetSubj?.subjectCode || "").trim().toLowerCase();

  const matchesSubject = (sId, sName, sCode) => {
    if (sId != null) {
      const sIdStr = String(sId).trim();
      if (sIdStr === targetIdStr) return true;
      if (altIdStr && sIdStr === altIdStr) return true;
    }
    if (targetCode && sCode) {
      if (String(sCode).trim().toLowerCase() === targetCode) return true;
    }
    if (targetName && sName) {
      const sNameLow = String(sName).trim().toLowerCase();
      if (sNameLow === targetName) return true;
      if (targetName.includes("chem") && sNameLow.includes("chem")) return true;
      if (targetName.includes("math") && sNameLow.includes("math")) return true;
      if (targetName.includes("phys") && sNameLow.includes("phys")) return true;
    }
    return false;
  };

  if (isObjective) {
    // OBJECTIVE EXAMINATION: Pattern-wise included subjects validation
    const patternIncludedSubIds = new Set();

    (schedules || []).forEach((sch) => {
      if (Array.isArray(sch.includedSubjectIds)) {
        sch.includedSubjectIds.forEach((id) => patternIncludedSubIds.add(String(id).trim()));
      }
      if (Array.isArray(sch.allSubjectIds)) {
        sch.allSubjectIds.forEach((id) => patternIncludedSubIds.add(String(id).trim()));
      }
      if (Array.isArray(sch.subjectIds)) {
        sch.subjectIds.forEach((id) => patternIncludedSubIds.add(String(id).trim()));
      }
      if (sch.subjectId != null) {
        patternIncludedSubIds.add(String(sch.subjectId).trim());
      }
    });

    if (Array.isArray(examObj.includedSubjectIds)) {
      examObj.includedSubjectIds.forEach((id) => patternIncludedSubIds.add(String(id).trim()));
    }
    if (Array.isArray(examObj.allocatedSubjectIds)) {
      examObj.allocatedSubjectIds.forEach((id) => patternIncludedSubIds.add(String(id).trim()));
    }
    if (Array.isArray(examObj.selectedSubjectIds)) {
      examObj.selectedSubjectIds.forEach((id) => patternIncludedSubIds.add(String(id).trim()));
    }
    if (Array.isArray(examObj.groupSubjectSelections?.[examObj?.groupId])) {
      examObj.groupSubjectSelections[examObj.groupId].forEach((id) => patternIncludedSubIds.add(String(id).trim()));
    }

    let isIncluded = patternIncludedSubIds.has(targetIdStr) || (altIdStr ? patternIncludedSubIds.has(altIdStr) : false);

    if (!isIncluded && (schedules || []).length > 0) {
      isIncluded = schedules.some((sch) => matchesSubject(sch.subjectId, sch.subjectName, sch.subjectCode));
    }

    if (!isIncluded) {
      return {
        isValid: false,
        error: "This subject is not included in the selected examination pattern. Marks entry is not available for this subject.",
      };
    }
    return { isValid: true, error: null };
  } else {
    // REGULAR EXAMINATION: Subject-wise schedule validation
    let isIncluded = false;

    if (Array.isArray(schedules) && schedules.length > 0) {
      isIncluded = schedules.some((sch) => {
        if (matchesSubject(sch.subjectId, sch.subjectName, sch.subjectCode)) return true;
        if (Array.isArray(sch.includedSubjectIds)) {
          return sch.includedSubjectIds.some((id) => String(id).trim() === targetIdStr || (altIdStr && String(id).trim() === altIdStr));
        }
        return false;
      });
    }

    if (!isIncluded && Array.isArray(examObj.allocatedSubjectIds) && examObj.allocatedSubjectIds.length > 0) {
      isIncluded = examObj.allocatedSubjectIds.some((id) => String(id).trim() === targetIdStr || (altIdStr && String(id).trim() === altIdStr));
    }

    if (!isIncluded && Array.isArray(examObj.selectedSubjectIds) && examObj.selectedSubjectIds.length > 0) {
      isIncluded = examObj.selectedSubjectIds.some((id) => String(id).trim() === targetIdStr || (altIdStr && String(id).trim() === altIdStr));
    }

    if (!isIncluded) {
      return {
        isValid: false,
        error: "This subject is not included in the selected examination. Marks entry is not available for this subject.",
      };
    }
    return { isValid: true, error: null };
  }
};

export default function FacultyMarks() {
  const context = useFacultySafe();
  const academicCtx = useAcademicContext();

  // Notification Toast State
  const [notification, setNotification] = useState(null);
  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Main Tabs State: "entry" | "report"
  const [activeTab, setActiveTab] = useState("entry");

  // 1. Academic Context Filters (Board & Academic Year auto-filled & read-only)
  const [selectedBoard, setSelectedBoard] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Cascading Filter Dropdown Lists
  const [boardsList, setBoardsList] = useState([]);
  const [yearsList, setYearsList] = useState([]);
  const [levelsList, setLevelsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [programsList, setProgramsList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  // Timetable slots & allocated subjects
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [allocatedSubjects, setAllocatedSubjects] = useState([]);

  // Context applied state (controlled by "Enter Marks" button)
  const [contextApplied, setContextApplied] = useState(false);

  // 2. Marks Entry Workspace Filters (Examinations & Subjects - strictly faculty allocated)
  const [examinationsList, setExaminationsList] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjectInclusionError, setSubjectInclusionError] = useState(null);

  // Rejection feedback note for current editing session
  const [currentRejectionRemarks, setCurrentRejectionRemarks] = useState("");

  // Storage for evaluations (Tracks live status: APPROVED, SUBMITTED, VERIFIED, REJECTED, DRAFT)
  const [evaluationsLedger, setEvaluationsLedger] = useState({});

  // Current working student rows & exam configuration
  const [currentStudents, setCurrentStudents] = useState([]);
  const [currentConfig, setCurrentConfig] = useState({
    maxTotal: 100,
    maxTheory: 100,
    maxInternal: 0,
    passingMarks: 35,
    examDate: null,
  });
  const [evaluationStatus, setEvaluationStatus] = useState("NOT STARTED");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Marks Entry Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Bulk Import Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkFileName, setBulkFileName] = useState("");
  const fileInputRef = useRef(null);

  // View Results Modal State
  const [viewResultsEval, setViewResultsEval] = useState(null);
  const [resultsModalPage, setResultsModalPage] = useState(1);
  const resultsPageSize = 5;

  // Report Tab Filters & Pagination State
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("ALL");
  const [reportExamFilter, setReportExamFilter] = useState("ALL");
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(5);

  // Reset report page when filters change
  useEffect(() => {
    setReportPage(1);
  }, [reportStatusFilter, reportExamFilter, reportSearch]);

  // Load faculty evaluations from live API on mount / tab change / after submission
  const fetchLiveEvaluations = useCallback(async () => {
    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id;
    if (!staffId) return;

    try {
      let res = await apiClient.get(`/api/v1/faculty/evaluations?facultyId=${staffId}`).catch(() => null);
      if (!res || !res.data) {
        res = await apiClient.get("/api/v1/faculty/evaluations", { params: { facultyId: staffId } }).catch(() => null);
      }

      const rawList = res?.data?.data || res?.data || [];
      if (Array.isArray(rawList)) {
        const next = {};
        rawList.forEach((ev) => {
          const parts = String(ev.evaluationId || "").split("_");
          const parsedSubId = (ev.subjectId && Number(ev.subjectId) > 0) ? ev.subjectId : (parts.length >= 3 ? parts[0] : (ev.subjectId || ""));
          const parsedSecId = (ev.sectionId && Number(ev.sectionId) > 0) ? ev.sectionId : (parts.length >= 3 ? parts[1] : 0);
          const parsedExamId = (ev.examinationId && Number(ev.examinationId) > 0)
            ? ev.examinationId
            : ((ev.examId && Number(ev.examId) > 0) ? ev.examId : (parts.length >= 3 ? parts[2] : 0));

          const rawStatus = ev.status || ev.statusCode || "DRAFT";
          const normalizedStatus = String(rawStatus).trim().toUpperCase();

          const evalObj = {
            evaluationId: String(ev.evaluationId || ev.id || `${parsedSubId}_${parsedSecId}_${parsedExamId}`),
            sectionId: parsedSecId,
            section: ev.sectionName || (parsedSecId ? `Section #${parsedSecId}` : "—"),
            examId: parsedExamId,
            examinationId: parsedExamId,
            examName: ev.examinationName || ev.examName || (parsedExamId ? `Exam #${parsedExamId}` : "—"),
            subjectId: parsedSubId,
            subjectName: ev.subjectName || (parsedSubId ? `Subject #${parsedSubId}` : "—"),
            faculty: ev.facultyName || context?.profile?.name || authUser?.fullName || "Faculty Member",
            empId: ev.facultyCode || ev.empId || (staffId ? `EMP-${staffId}` : ""),
            status: normalizedStatus,
            statusCode: normalizedStatus,
            adminRemarks: ev.rejectionReason || ev.remarks || ev.adminRemarks || "",
            rows: ev.rows || ev.students || [],
            submittedAt: ev.lastSubmittedAt ? String(ev.lastSubmittedAt).split("T")[0] : (ev.submittedAt ? String(ev.submittedAt).split("T")[0] : ""),
            updatedAt: ev.lastSubmittedAt ? String(ev.lastSubmittedAt).split("T")[0] : (ev.updatedAt ? String(ev.updatedAt).split("T")[0] : ""),
          };

          const key1 = String(ev.evaluationId || evalObj.evaluationId);
          const key2 = `${parsedSecId}_${parsedExamId}_${parsedSubId}`;
          const key3 = `${parsedSubId}_${parsedSecId}_${parsedExamId}`;
          next[key1] = evalObj;
          next[key2] = evalObj;
          next[key3] = evalObj;
        });

        setEvaluationsLedger((prev) => {
          const merged = { ...next };
          Object.entries(prev).forEach(([k, v]) => {
            if (v?.isLocal && !merged[k]) {
              merged[k] = v;
            }
          });
          return merged;
        });
      } else {
        setEvaluationsLedger({});
      }
    } catch (err) {
      console.warn("Could not load faculty evaluations from API:", err);
    }
  }, [context?.profile?.staffId, context?.profileData?.staffId, context?.profile?.name, context?.profileData?.allocatedSubjects]);

  useEffect(() => {
    fetchLiveEvaluations();
  }, [fetchLiveEvaluations, activeTab]);

  // Load Boards & Academic Years
  useEffect(() => {
    let isMounted = true;
    async function initContext() {
      try {
        if (academicCtx.boards?.length) {
          if (isMounted) setBoardsList(academicCtx.boards);
        } else {
          const res = await apiClient.get("/api/v1/boards");
          const list = res.data?.data || res.data || [];
          if (isMounted) setBoardsList(list);
        }

        if (academicCtx.academicYears?.length) {
          if (isMounted) setYearsList(academicCtx.academicYears);
        } else {
          const res = await apiClient.get("/api/v1/academic-years");
          const list = res.data?.data || res.data || [];
          if (isMounted) setYearsList(list);
        }
      } catch (err) {
        console.warn("Could not initialize academic context:", err);
      }
    }
    initContext();
    return () => { isMounted = false; };
  }, [academicCtx.boards, academicCtx.academicYears]);

  // Fetch timetable slots and staff subject allocations for currently authenticated faculty
  useEffect(() => {
    let isMounted = true;
    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id;
    if (!staffId) return;

    apiClient
      .get(`/api/v1/timetable/faculty/${staffId}`)
      .then((res) => {
        const slots = res.data?.data || res.data || [];
        if (!isMounted || !Array.isArray(slots)) return;
        setTimetableSlots(slots);
      })
      .catch((err) => console.warn("Could not load faculty timetable slots:", err));

    apiClient
      .get(`/api/v1/staff/${staffId}/subject-allocations`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (!isMounted || !Array.isArray(list)) return;
        setAllocatedSubjects(list.map((s) => ({
          subjectId: s.subjectId || s.id,
          subjectName: s.subjectName || s.name || `Subject #${s.subjectId || s.id}`,
          subjectCode: s.subjectCode || s.code || "",
          academicLevelId: s.academicLevelId,
        })));
      })
      .catch((err) => console.warn("Could not load faculty subject allocations:", err));

    return () => { isMounted = false; };
  }, [context?.profile?.staffId, context?.profileData?.staffId, context?.profileData?.allocatedSubjects]);

  // Load fallback academic levels and programs if needed
  useEffect(() => {
    const cleanBoard = extractId(selectedBoard);
    if (!cleanBoard) return;
    let isMounted = true;
    apiClient.get(`/api/v1/academic-levels?boardId=${encodeURIComponent(cleanBoard)}`)
      .then((res) => { if (isMounted) setLevelsList(res.data?.data || res.data || []); })
      .catch(() => { });
    return () => { isMounted = false; };
  }, [selectedBoard]);

  useEffect(() => {
    let isMounted = true;
    apiClient.get("/api/v1/programs")
      .then((res) => { if (isMounted) setProgramsList(res.data?.data || res.data || []); })
      .catch(() => { });
    return () => { isMounted = false; };
  }, []);

  // Read-only Single Line Info Details (Board & Academic Year) - auto-filled like Student Attendance (Reference 2)
  const timetableInfo = useMemo(() => {
    const slot = (selectedLevel ? timetableSlots.find((s) => String(s.academicLevelId) === String(selectedLevel)) : null)
      || (selectedSection ? timetableSlots.find((s) => String(s.sectionId) === String(selectedSection)) : null)
      || timetableSlots[0];

    const rawBoardId = extractId(slot?.boardId)
      || extractId(selectedBoard)
      || extractId(academicCtx.selectedBoardId)
      || extractId(academicCtx.selectedBoard)
      || extractId(boardsList[0]?.boardId || boardsList[0]?.id)
      || "1";

    const rawYearId = extractId(slot?.academicYearId)
      || extractId(selectedYear)
      || extractId(academicCtx.selectedAcademicYearId)
      || extractId(academicCtx.selectedAcademicYear)
      || extractId(yearsList[0]?.academicYearId || yearsList[0]?.id)
      || "9";

    const fallbackBoard = slot?.boardName
      || (typeof academicCtx.selectedBoard === "object" ? (academicCtx.selectedBoard?.name || academicCtx.selectedBoard?.boardName) : null)
      || academicCtx.selectedBoardName
      || boardsList.find((b) => String(b.boardId || b.id) === String(rawBoardId))?.boardName
      || boardsList.find((b) => String(b.boardId || b.id) === String(rawBoardId))?.name
      || boardsList[0]?.boardName
      || boardsList[0]?.name
      || "Board of Intermediate Education, Andhra Pradesh";

    const fallbackYear = slot?.academicYearName
      || (typeof academicCtx.selectedAcademicYear === "object" ? (academicCtx.selectedAcademicYear?.academicYear || academicCtx.selectedAcademicYear?.name) : null)
      || academicCtx.selectedYearName
      || yearsList.find((y) => String(y.academicYearId || y.id) === String(rawYearId))?.academicYearName
      || yearsList.find((y) => String(y.academicYearId || y.id) === String(rawYearId))?.yearName
      || yearsList[0]?.academicYearName
      || yearsList[0]?.yearName
      || "2026-2027";

    return {
      boardName: fallbackBoard,
      academicYearName: fallbackYear,
      boardId: rawBoardId,
      academicYearId: rawYearId,
    };
  }, [timetableSlots, selectedLevel, selectedSection, selectedBoard, selectedYear, boardsList, yearsList, academicCtx]);

  // Synchronize auto-filled Board and Academic Year values into state
  useEffect(() => {
    if (timetableInfo.boardId && selectedBoard !== timetableInfo.boardId) {
      setSelectedBoard(timetableInfo.boardId);
    }
    if (timetableInfo.academicYearId && selectedYear !== timetableInfo.academicYearId) {
      setSelectedYear(timetableInfo.academicYearId);
    }
  }, [timetableInfo.boardId, timetableInfo.academicYearId, selectedBoard, selectedYear]);

  // Timetable-derived Academic Levels
  const timetableLevels = useMemo(() => {
    const map = new Map();
    timetableSlots.forEach((s) => {
      if (s.academicLevelId) {
        map.set(String(s.academicLevelId), {
          id: String(s.academicLevelId),
          name: s.academicLevelName || s.levelName || `Level #${s.academicLevelId}`,
        });
      }
    });
    if (map.size > 0) return Array.from(map.values());
    return levelsList.map((l) => ({ id: String(l.academicLevelId || l.id), name: l.levelName || l.name }));
  }, [timetableSlots, levelsList]);

  // Timetable-derived Groups: strictly display ONLY groupName (NO groupCode)
  const timetableGroups = useMemo(() => {
    const map = new Map();
    timetableSlots.forEach((s) => {
      const matchLevel = !selectedLevel || String(s.academicLevelId) === String(selectedLevel);
      if (s.groupId && matchLevel) {
        let gName = s.groupName || `Group #${s.groupId}`;
        if (s.groupCode) {
          gName = gName.replace(new RegExp(`\\s*\\(${s.groupCode}\\)`, "i"), "").trim();
        }
        gName = gName.replace(/\s*\([A-Z0-9\-_]+\)$/i, "").trim();
        map.set(String(s.groupId), {
          id: String(s.groupId),
          name: gName,
        });
      }
    });
    if (map.size > 0) return Array.from(map.values());
    return groupsList.map((g) => {
      let gName = g.groupName || g.name || `Group #${g.groupId || g.id}`;
      if (g.groupCode || g.code) {
        const c = g.groupCode || g.code;
        gName = gName.replace(new RegExp(`\\s*\\(${c}\\)`, "i"), "").trim();
      }
      gName = gName.replace(/\s*\([A-Z0-9\-_]+\)$/i, "").trim();
      return { id: String(g.groupId || g.id), name: gName };
    });
  }, [timetableSlots, selectedLevel, groupsList]);

  // Timetable-derived Programs
  const timetablePrograms = useMemo(() => {
    const map = new Map();
    timetableSlots.forEach((s) => {
      const matchLevel = !selectedLevel || String(s.academicLevelId) === String(selectedLevel);
      const matchGroup = !selectedGroup || String(s.groupId) === String(selectedGroup);
      if (s.programId && matchLevel && matchGroup) {
        map.set(String(s.programId), {
          id: String(s.programId),
          name: s.programName || `Program #${s.programId}`,
        });
      }
    });
    if (map.size > 0) return Array.from(map.values());
    return programsList.map((p) => ({ id: String(p.programId || p.id), name: p.programName || p.name }));
  }, [timetableSlots, selectedLevel, selectedGroup, programsList]);

  // Timetable-derived Sections: strictly display ONLY sectionName WITHOUT (Assigned) suffix
  const timetableSections = useMemo(() => {
    const map = new Map();
    timetableSlots.forEach((s) => {
      const matchLevel = !selectedLevel || String(s.academicLevelId) === String(selectedLevel);
      const matchGroup = !selectedGroup || String(s.groupId) === String(selectedGroup);
      const matchProg = !selectedProgram || String(s.programId) === String(selectedProgram);
      if (s.sectionId && matchLevel && matchGroup && matchProg) {
        const rawName = s.sectionName || `Section #${s.sectionId}`;
        const cleanName = rawName.replace(/\s*\(Assigned\)/i, "").trim();
        map.set(String(s.sectionId), {
          id: String(s.sectionId),
          name: cleanName,
        });
      }
    });
    if (map.size > 0) return Array.from(map.values());
    return sectionsList.map((s) => {
      const rawName = s.sectionName || s.name || `Section #${s.sectionId || s.id}`;
      return { id: String(s.sectionId || s.id), name: rawName.replace(/\s*\(Assigned\)/i, "").trim() };
    });
  }, [timetableSlots, selectedLevel, selectedGroup, selectedProgram, sectionsList]);

  // Fetch Completed Examinations matching Academic Context (Strictly completed only)
  useEffect(() => {
    let isMounted = true;
    const authUser = getAuthUser();
    const effectiveCampusId = context?.profile?.campusId || authUser?.campusId || academicCtx.selectedCampus || 1;
    const cleanBoard = extractId(selectedBoard);
    const cleanYear = extractId(selectedYear);
    const params = {
      campusId: effectiveCampusId,
      ...(cleanBoard ? { boardId: Number(cleanBoard) } : {}),
      ...(cleanYear ? { academicYearId: Number(cleanYear) } : {}),
    };

    apiClient.get("/api/v1/examinations", { params })
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted && Array.isArray(list)) {
          // Strictly filter to Completed Examinations only (filtering out SCHEDULED, DRAFT, etc.)
          const completedExams = list.filter((e) => {
            if (e.isActive === false) return false;
            const rawStatus = String(e.status ?? e.examStatus ?? e.examinationStatus ?? "").trim().toUpperCase();
            const isCompleted =
              rawStatus === "COMPLETED" ||
              e.isCompleted === true ||
              String(e.examCode || "").toUpperCase().includes("COMP") ||
              String(e.examName || "").toUpperCase().includes("COMPLETED");

            if (!isCompleted || rawStatus === "SCHEDULED" || rawStatus === "DRAFT") return false;

            if (cleanBoard && e.boardId && String(e.boardId) !== String(cleanBoard)) return false;
            if (cleanYear && e.academicYearId && String(e.academicYearId) !== String(cleanYear)) return false;
            if (selectedLevel) {
              const matchesLevel = !e.academicLevelId || String(e.academicLevelId) === String(selectedLevel) ||
                (Array.isArray(e.academicLevelIds) && e.academicLevelIds.map(String).includes(String(selectedLevel)));
              if (!matchesLevel) return false;
            }
            if (selectedGroup) {
              const matchesGroup = !e.groupId || String(e.groupId) === String(selectedGroup) ||
                (Array.isArray(e.groupIds) && e.groupIds.map(String).includes(String(selectedGroup)));
              if (!matchesGroup) return false;
            }

            return true;
          });
          setExaminationsList(completedExams);
        }
      })
      .catch((err) => console.warn("Error fetching examinations:", err));

    return () => { isMounted = false; };
  }, [selectedBoard, selectedYear, selectedLevel, selectedGroup, context?.profile?.campusId, academicCtx.selectedCampus]);

  // Keep selectedExam synchronized if the filtered completed exam list changes
  useEffect(() => {
    if (selectedExam && examinationsList.length > 0) {
      const exists = examinationsList.some((e) => String(e.examinationId || e.id || e.examId) === String(selectedExam));
      if (!exists) {
        setSelectedExam("");
        setCurrentStudents([]);
      }
    }
  }, [examinationsList, selectedExam]);

  // Authoritative Faculty-Allocated Subjects matching Section & Academic Context (NO unrestricted fallbacks)
  const filteredSubjects = useMemo(() => {
    const subMap = new Map();
    // 1. From timetable slots strictly matching selected section and academic scope
    timetableSlots.forEach((s) => {
      const matchSec = !selectedSection || String(s.sectionId) === String(selectedSection);
      const matchLevel = !selectedLevel || String(s.academicLevelId) === String(selectedLevel);
      const matchGroup = !selectedGroup || String(s.groupId) === String(selectedGroup);
      const matchProg = !selectedProgram || String(s.programId) === String(selectedProgram);

      if (s.subjectId && matchSec && matchLevel && matchGroup && matchProg) {
        subMap.set(String(s.subjectId), {
          subjectId: String(s.subjectId),
          subjectName: s.subjectName || `Subject #${s.subjectId}`,
          subjectCode: s.subjectCode || "",
        });
      }
    });

    // 2. From authenticated staff subject allocations matching level & section
    allocatedSubjects.forEach((s) => {
      const matchLevel = !selectedLevel || !s.academicLevelId || String(s.academicLevelId) === String(selectedLevel);
      if (s.subjectId && matchLevel) {
        if (!selectedSection || subMap.size === 0 || subMap.has(String(s.subjectId))) {
          if (!subMap.has(String(s.subjectId)) && !selectedSection) {
            subMap.set(String(s.subjectId), {
              subjectId: String(s.subjectId),
              subjectName: s.subjectName,
              subjectCode: s.subjectCode || "",
            });
          }
        }
      }
    });

    return Array.from(subMap.values());
  }, [timetableSlots, allocatedSubjects, selectedSection, selectedLevel, selectedGroup, selectedProgram]);

  // Helper names for Context Summary
  const selectedGroupName = useMemo(() => {
    const found = timetableGroups.find((g) => String(g.id) === String(selectedGroup));
    return found?.name || "";
  }, [timetableGroups, selectedGroup]);

  const selectedProgramName = useMemo(() => {
    const found = timetablePrograms.find((p) => String(p.id) === String(selectedProgram));
    return found?.name || "";
  }, [timetablePrograms, selectedProgram]);

  const selectedSectionCleanName = useMemo(() => {
    const found = timetableSections.find((s) => String(s.id) === String(selectedSection));
    return found?.name || "";
  }, [timetableSections, selectedSection]);

  const selectedExamInfo = useMemo(() => {
    return examinationsList.find((e) => String(e.examinationId || e.id) === String(selectedExam)) || null;
  }, [examinationsList, selectedExam]);

  const selectedExamName = selectedExamInfo
    ? `${selectedExamInfo.examName || selectedExamInfo.name || "Exam"} (${selectedExamInfo.examCode || selectedExamInfo.code || selectedExamInfo.examinationId || "EXAM"})`
    : "";

  const selectedSubjectObj = useMemo(() => {
    return filteredSubjects.find((s) => String(s.subjectId) === String(selectedSubject)) || null;
  }, [filteredSubjects, selectedSubject]);

  const selectedSubjectName = selectedSubjectObj
    ? (selectedSubjectObj.subjectName || "Selected Subject")
    : "Selected Subject";

  // Handle clicking "Enter Marks" button
  const handleEnterMarks = () => {
    if (!selectedSection) {
      notify("Please select a Section before loading Marks Entry.", "error");
      return;
    }
    setContextApplied(true);
    notify(`Marks Entry workspace loaded for ${selectedSectionCleanName || "Section"}.`);
    const autoSubj = selectedSubject || (filteredSubjects.length > 0 ? String(filteredSubjects[0].subjectId) : "");
    if (!selectedSubject && autoSubj) {
      setSelectedSubject(autoSubj);
    }
    if (selectedExam && autoSubj) {
      handleExamOrSubjectChange(selectedExam, autoSubj, selectedSection);
    }
  };

  // Auto-fill faculty's allocated subject once examination is selected
  useEffect(() => {
    if (selectedExam && !selectedSubject && filteredSubjects.length > 0) {
      const autoSubj = String(filteredSubjects[0].subjectId);
      setSelectedSubject(autoSubj);
      handleExamOrSubjectChange(selectedExam, autoSubj);
    }
  }, [selectedExam, selectedSubject, filteredSubjects]);

  // Authoritative Marks & Student Roster Handler adhering to Admin Reference
  const handleExamOrSubjectChange = async (newExam, newSubject, explicitSection) => {
    const targetSec = explicitSection || selectedSection;
    if (!newExam || !newSubject || !targetSec) {
      setCurrentStudents([]);
      setCurrentRejectionRemarks("");
      return;
    }

    setLoadingStudents(true);
    try {
      const authUser = getAuthUser();
      const effectiveCampusId = context?.profile?.campusId || authUser?.campusId || academicCtx.selectedCampus || 1;
      const cleanBoard = extractId(selectedBoard);
      const cleanYear = extractId(selectedYear);

      // STEP 1: First hit the examination schedules to get clarity on exam category
      const selectedExamObj = examinationsList.find(
        (e) => String(e.examinationId || e.id || e.examId) === String(newExam)
      ) || null;

      let schedules = selectedExamObj?.schedules || selectedExamObj?.examinationSchedules || [];
      if (!schedules.length) {
        try {
          const schedRes = await apiClient.get(`/api/v1/examinations/${newExam}/schedules`, {
            params: { campusId: effectiveCampusId },
            headers: { ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}) },
          }).catch(() => null);
          const fetched = schedRes?.data?.data || schedRes?.data || [];
          if (Array.isArray(fetched) && fetched.length > 0) schedules = fetched;
        } catch (e) {}
      }
      if (!schedules.length) {
        try {
          const schedRes2 = await apiClient.get(`/api/v1/examination-schedules`, {
            params: { examinationId: newExam, campusId: effectiveCampusId },
            headers: { ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}) },
          }).catch(() => null);
          const fetched2 = schedRes2?.data?.data || schedRes2?.data || [];
          if (Array.isArray(fetched2) && fetched2.length > 0) schedules = fetched2;
        } catch (e) {}
      }

      // Resolve target faculty subject and alternate master subject mapping
      const targetSubj =
        filteredSubjects.find((s) => String(s.subjectId) === String(newSubject)) ||
        allocatedSubjects.find((s) => String(s.subjectId) === String(newSubject));
      const targetName = (targetSubj?.subjectName || "").trim().toLowerCase();
      const targetCode = (targetSubj?.subjectCode || "").trim().toLowerCase();

      const altAlloc = allocatedSubjects.find((a) => {
        const aName = (a.subjectName || "").trim().toLowerCase();
        const aCode = (a.subjectCode || "").trim().toLowerCase();
        return (targetCode && aCode === targetCode) || (targetName && aName === targetName);
      });

      // Strict validation: Verify faculty subject is officially included in the selected examination configuration
      // For Regular: must have individual schedule (or in allocatedSubjectIds)
      // For Objective: check in exam object in included subjects
      const inclusionCheck = validateSubjectExamInclusion(selectedExamObj, newSubject, targetSubj, altAlloc, schedules);
      if (!inclusionCheck.isValid) {
        setSubjectInclusionError(inclusionCheck.error);
        setCurrentStudents([]);
        setEvaluationStatus("NOT STARTED");
        setCurrentRejectionRemarks("");
        setLoadingStudents(false);
        return;
      }
      setSubjectInclusionError(null);

      // Resolve schedule config (examDate, maxTotal, maxTheory, maxInternal, passingMarks)
      const isObjective = isObjectiveExam(selectedExamObj);
      let examDate = null;
      let passingMarks = 35;
      let maxTotal = 100;
      let maxTheory = 100;
      let maxInternal = 0;

      if (selectedExamObj) {
        passingMarks = Number(selectedExamObj.passingMarks || selectedExamObj.passMarks || 35);
        maxTotal = Number(selectedExamObj.maxMarks || selectedExamObj.totalMarks || 100);

        const subjSchedule = schedules.find((sch) => {
          const schId = String(sch.subjectId).trim();
          if (schId === String(newSubject).trim()) return true;
          if (altAlloc?.subjectId && schId === String(altAlloc.subjectId).trim()) return true;
          if (Array.isArray(sch.includedSubjectIds)) {
            if (sch.includedSubjectIds.map(String).includes(String(newSubject).trim())) return true;
            if (altAlloc?.subjectId && sch.includedSubjectIds.map(String).includes(String(altAlloc.subjectId).trim())) return true;
          }
          const sCode = (sch.subjectCode || "").trim().toLowerCase();
          const sName = (sch.subjectName || "").trim().toLowerCase();
          if (targetCode && sCode === targetCode) return true;
          if (targetName && sName === targetName) return true;
          return false;
        }) || (schedules.length > 0 ? schedules[0] : null);

        if (subjSchedule) {
          examDate = subjSchedule.examDate || subjSchedule.date || selectedExamObj.startDate || selectedExamObj.endDate;
          if (subjSchedule.maxMarks) maxTotal = Number(subjSchedule.maxMarks);
          if (subjSchedule.theoryMarks != null) maxTheory = Number(subjSchedule.theoryMarks);
          if (subjSchedule.internalMarks != null) maxInternal = Number(subjSchedule.internalMarks);
          if (subjSchedule.passingMarks != null) passingMarks = Number(subjSchedule.passingMarks);
        } else {
          examDate = selectedExamObj.startDate || selectedExamObj.examDate || selectedExamObj.endDate;
        }
      }

      setCurrentConfig({
        maxTotal,
        maxTheory,
        maxInternal,
        passingMarks,
        examDate,
        isObjective,
        category: isObjective ? "OBJECTIVE" : "REGULAR",
      });

      // STEP 2: Hit /api/v1/evaluations/search to check which state the exam/evaluation is in
      let searchedEval = null;
      let searchedStatus = null;
      let searchedRemarks = "";
      let evalStudentMarks = [];

      try {
        const evalSearchPayload = {
          campusId: Number(effectiveCampusId) || 1,
          boardId: cleanBoard ? Number(cleanBoard) : undefined,
          academicYearId: cleanYear ? Number(cleanYear) : undefined,
          academicLevelId: selectedLevel ? Number(selectedLevel) : undefined,
          groupId: selectedGroup ? Number(selectedGroup) : undefined,
          programId: selectedProgram ? Number(selectedProgram) : undefined,
          sectionId: Number(targetSec),
          examinationId: Number(newExam),
        };
        const searchRes = await apiClient.post("/api/v1/evaluations/search", evalSearchPayload, {
          headers: { ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}) },
          skipGlobalLoader: true,
        }).catch(() => null);

        const evalList = searchRes?.data?.data || searchRes?.data || [];
        if (Array.isArray(evalList) && evalList.length > 0) {
          const targetNorm = normalizeSubjectName(targetName);
          const matchedEval = evalList.find((ev) => {
            if (ev.evaluationId && String(ev.evaluationId).trim() === `${newSubject}_${targetSec}_${newExam}`) return true;
            const parts = String(ev.evaluationId || "").split("_");
            const evSubId = String(ev.subjectId || (parts.length >= 3 ? parts[0] : ""));
            const evSecId = String(ev.sectionId || (parts.length >= 3 ? parts[1] : ""));
            const evExamId = String(ev.examinationId || (parts.length >= 3 ? parts[2] : ""));

            if (evSecId && evSecId !== "0" && String(evSecId) !== String(targetSec)) return false;
            if (evExamId && evExamId !== "0" && String(evExamId) !== String(newExam)) return false;

            if (evSubId && (String(evSubId) === String(newSubject) || (altAlloc?.subjectId && String(evSubId) === String(altAlloc.subjectId)))) {
              return true;
            }
            const evCode = (ev.subjectCode || "").trim().toLowerCase();
            const evName = (ev.subjectName || "").trim().toLowerCase();
            if (targetCode && evCode === targetCode) return true;
            if (targetName && evName === targetName) return true;
            if (targetNorm && normalizeSubjectName(evName) === targetNorm) return true;
            return false;
          });

          if (matchedEval) {
            searchedEval = matchedEval;
            const raw = String(matchedEval.status || matchedEval.statusCode || matchedEval.evaluationStatus || "").trim().toUpperCase();
            if (raw) searchedStatus = raw;
            searchedRemarks = matchedEval.rejectionReason || matchedEval.adminRemarks || matchedEval.remarks || "";
            if (Array.isArray(matchedEval.students) && matchedEval.students.length > 0) {
              evalStudentMarks = matchedEval.students;
            } else if (Array.isArray(matchedEval.marksList) && matchedEval.marksList.length > 0) {
              evalStudentMarks = matchedEval.marksList;
            }
          }
        }
      } catch (searchErr) {
        console.warn("Could not query evaluations/search in FacultyMarks:", searchErr);
      }

      // STEP 3: Hit /api/v1/marks/exam/{exam_id}?campusId={campusId} to fetch campus marks
      // Filter marks strictly by current academic context: board, academicLevel, group, program, section, and subject
      let allExamMarks = [];
      let evalRecordsFromMarks = [];
      try {
        const marksRes = await apiClient.get(`/api/v1/marks/exam/${newExam}`, {
          params: { campusId: effectiveCampusId },
          headers: { "X-Campus-Id": String(effectiveCampusId) },
        }).catch(() => null);
        const data = marksRes?.data?.data || marksRes?.data || [];
        if (Array.isArray(data)) {
          // Identify evaluation objects vs student marks (as in item 3 of /marks/exam/19)
          evalRecordsFromMarks = data.filter((item) => Boolean(
            item && (
              item.evaluationId ||
              item.statusCode ||
              item.averageMarks !== undefined ||
              item.highestMarks !== undefined
            )
          ));
          allExamMarks = data.filter((item) => Boolean(item && (item.studentId || item.marks !== undefined)));
        }
      } catch (e) {
        // ignore
      }

      // If evaluations/search did not find an evaluation, check evalRecordsFromMarks
      if (!searchedEval && evalRecordsFromMarks.length > 0) {
        const targetNorm = normalizeSubjectName(targetName);
        const matchedEvalFromMarks = evalRecordsFromMarks.find((ev) => {
          const parts = String(ev.evaluationId || "").split("_");
          const evSubId = String(ev.subjectId || (parts.length >= 3 ? parts[0] : ""));
          const evSecId = String(ev.sectionId || (parts.length >= 3 ? parts[1] : ""));
          const evExamId = String(ev.examinationId || (parts.length >= 3 ? parts[2] : ""));

          if (evSecId && evSecId !== "0" && String(evSecId) !== String(targetSec)) return false;
          if (evExamId && evExamId !== "0" && String(evExamId) !== String(newExam)) return false;

          if (evSubId && (String(evSubId) === String(newSubject) || (altAlloc?.subjectId && String(evSubId) === String(altAlloc.subjectId)))) return true;
          const evCode = (ev.subjectCode || "").trim().toLowerCase();
          const evName = (ev.subjectName || "").trim().toLowerCase();
          if (targetCode && evCode === targetCode) return true;
          if (targetName && evName === targetName) return true;
          if (targetNorm && normalizeSubjectName(evName) === targetNorm) return true;
          return false;
        });

        if (matchedEvalFromMarks) {
          searchedEval = matchedEvalFromMarks;
          const raw = String(matchedEvalFromMarks.status || matchedEvalFromMarks.statusCode || matchedEvalFromMarks.evaluationStatus || "").trim().toUpperCase();
          if (raw) searchedStatus = raw;
          searchedRemarks = matchedEvalFromMarks.rejectionReason || matchedEvalFromMarks.adminRemarks || matchedEvalFromMarks.remarks || "";
        }
      }

      const resolvedSubjectId = searchedEval?.subjectId ? String(searchedEval.subjectId) : String(newSubject);

      // Filter marks strictly by current academic context (section, level, group, program, board)
      const contextFilteredMarks = allExamMarks.filter((m) => {
        if (m.isActive === false) return false;
        if (m.sectionId && String(m.sectionId) !== String(targetSec)) return false;
        if (cleanBoard && m.boardId && String(m.boardId) !== String(cleanBoard)) return false;
        if (cleanYear && m.academicYearId && String(m.academicYearId) !== String(cleanYear)) return false;
        if (selectedLevel && m.academicLevelId && String(m.academicLevelId) !== String(selectedLevel)) return false;
        if (selectedGroup && m.groupId && String(m.groupId) !== String(selectedGroup)) return false;
        if (selectedProgram && m.programId && String(m.programId) !== String(selectedProgram)) return false;
        return true;
      });

      // Filter by subject
      let subjMarks = contextFilteredMarks.filter((m) => {
        if (String(m.subjectId) === String(newSubject)) return true;
        if (resolvedSubjectId && String(m.subjectId) === String(resolvedSubjectId)) return true;
        if (altAlloc?.subjectId && String(m.subjectId) === String(altAlloc.subjectId)) return true;
        const mCode = (m.subjectCode || "").trim().toLowerCase();
        const mName = (m.subjectName || m.subject || "").trim().toLowerCase();
        if (targetCode && mCode === targetCode) return true;
        if (targetName && mName === targetName) return true;
        if (normalizeSubjectName(targetName) && normalizeSubjectName(mName) === normalizeSubjectName(targetName)) return true;
        return false;
      });

      // If evaluations/search returned student marks and marks endpoint was empty, use evalStudentMarks
      if (subjMarks.length === 0 && evalStudentMarks.length > 0) {
        subjMarks = evalStudentMarks;
      }

      // Determine live evaluation status:
      // Primary: from /api/v1/evaluations/search
      // Secondary: from marks status
      let liveStatus = searchedStatus || "NOT STARTED";
      if (!searchedStatus && subjMarks.length > 0) {
        const firstMark = subjMarks[0];
        const rawStatus = String(firstMark.status || firstMark.evaluationStatus || "").trim().toUpperCase();
        if (rawStatus === "APPROVED" || firstMark.isPublished || (firstMark.isVerified && rawStatus === "APPROVED") || firstMark.status === 3) {
          liveStatus = "APPROVED";
        } else if (rawStatus === "VERIFIED" || firstMark.isVerified || firstMark.status === 2) {
          liveStatus = "VERIFIED";
        } else if (rawStatus === "SUBMITTED" || firstMark.isSubmitted || firstMark.status === 1) {
          liveStatus = "SUBMITTED";
        } else if (rawStatus === "REJECTED") {
          liveStatus = "REJECTED";
        } else if (rawStatus) {
          liveStatus = rawStatus;
        } else {
          liveStatus = "SUBMITTED";
        }
      } else if (!searchedStatus && evaluationsLedger[`${newSubject}_${targetSec}_${newExam}`]?.status) {
        liveStatus = evaluationsLedger[`${newSubject}_${targetSec}_${newExam}`].status;
      }

      setEvaluationStatus(liveStatus);
      setCurrentRejectionRemarks(searchedRemarks);

      const key = `${newSubject}_${targetSec}_${newExam}`;
      const legacyKey = `${targetSec}_${newExam}_${newSubject}`;
      const existing = evaluationsLedger[key] || evaluationsLedger[legacyKey];

      // STEP 4: Fetch students from single /api/v1/students API (matching Student Management)
      const studentFilters = {
        board: cleanBoard,
        year: cleanYear,
        level: selectedLevel,
        group: selectedGroup,
        program: selectedProgram,
        section: targetSec,
      };
      const rawStudentList = await fetchAuthoritativeSectionStudents(studentFilters, effectiveCampusId);

      // STEP 5: Student eligibility & Roster reconciliation
      const marksMap = new Map();
      subjMarks.forEach((m) => {
        const sId = String(m.studentId ?? m.id ?? "");
        if (sId) marksMap.set(sId, m);
      });

      let effectiveRoster = [];

      if (marksMap.size > 0) {
        // When marks exist: strictly show ONLY students who have marks in this examination/subject (e.g. exactly 5 students!)
        const seenIds = new Set();
        rawStudentList.forEach((st) => {
          const sId = String(st.studentId);
          if (marksMap.has(sId)) {
            effectiveRoster.push(st);
            seenIds.add(sId);
          }
        });
        marksMap.forEach((mark, sId) => {
          if (!seenIds.has(String(sId))) {
            effectiveRoster.push({
              studentId: Number(sId),
              admissionNo: mark.admissionNo || "",
              rollNo: String(mark.rollNo || ""),
              name: mark.studentName || `Student #${sId}`,
              admissionDate: null,
            });
            seenIds.add(String(sId));
          }
        });
      } else {
        // Fresh entry: show eligible section students filtered by admission date
        effectiveRoster = rawStudentList.filter((student) => {
          const studentJoinDate = student.admissionDate || student.allocatedDate || student.dateOfAdmission;
          if (examDate && studentJoinDate) {
            const adm = String(studentJoinDate).slice(0, 10);
            const exm = String(examDate).slice(0, 10);
            if (/^\d{4}-\d{2}-\d{2}$/.test(adm) && /^\d{4}-\d{2}-\d{2}$/.test(exm) && !adm.startsWith("0001-")) {
              if (adm > exm) return false;
            }
          }
          return true;
        });
      }

      // Map student rows
      const mappedRows = effectiveRoster.map((student) => {
        const mark = marksMap.get(String(student.studentId));
        if (mark) {
          const isAbsent = Boolean(mark.isAbsent || mark.absent);
          const internal = Number(mark.internalMarks ?? mark.internal ?? 0);
          const theory = Number(mark.theoryMarks ?? mark.theory ?? 0);
          const obtainedMarks = Number(mark.obtainedMarks ?? mark.totalMarks ?? mark.total ?? (internal + theory));
          const total = isAbsent ? 0 : (isObjective ? obtainedMarks : (internal + theory || obtainedMarks));
          const percentage = isAbsent ? "0.00%" : `${((total / maxTotal) * 100).toFixed(2)}%`;
          return {
            studentId: student.studentId,
            rollNo: mark.rollNo || student.rollNo || "",
            name: mark.studentName || student.name || `Student #${student.studentId}`,
            internal: isAbsent ? 0 : internal,
            theory: isAbsent ? 0 : theory,
            obtainedMarks: isAbsent ? 0 : obtainedMarks,
            totalScore: total,
            percentage: percentage,
            absent: isAbsent,
            remarks: mark.remarks || (isAbsent ? "Absent" : ""),
          };
        } else {
          return {
            studentId: student.studentId,
            rollNo: student.rollNo || "",
            name: student.name || `Student #${student.studentId}`,
            internal: 0,
            theory: 0,
            obtainedMarks: 0,
            totalScore: 0,
            percentage: "0.00%",
            absent: false,
            remarks: "",
          };
        }
      });

      setCurrentStudents(mappedRows);
      setEvaluationStatus(liveStatus);
      setCurrentRejectionRemarks(liveStatus === "REJECTED" ? (searchedRemarks || existing?.adminRemarks || "") : "");
    } catch (err) {
      console.error("Error loading students and marks:", err);
      notify("Failed to load student roster for the selected section.", "error");
    } finally {
      setLoadingStudents(false);
    }
  };

  // Student mark input change handlers with component limits & validation
  const handleStudentMarkChange = (studentId, field, rawVal) => {
    setCurrentStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;

        let val = rawVal;
        if (field === "internal" || field === "theory" || field === "obtainedMarks") {
          if (val === "" || val === null) {
            val = "";
          } else {
            let num = Number(val);
            if (isNaN(num)) return s;
            if (num < 0) num = 0;
            const maxAllowed = field === "internal"
              ? (currentConfig.maxInternal || 20)
              : field === "theory"
                ? (currentConfig.maxTheory || 100)
                : (currentConfig.maxTotal || 100);
            if (num > maxAllowed) num = maxAllowed;
            val = num;
          }
        }

        const next = { ...s, [field]: val };
        const max = currentConfig.maxTotal || 100;
        let total = 0;

        if (currentConfig.isObjective) {
          total = next.absent ? 0 : Number(next.obtainedMarks ?? val ?? 0);
          next.obtainedMarks = next.absent ? 0 : val;
          next.totalScore = total;
        } else {
          const internal = Number(next.internal || 0);
          const theory = Number(next.theory || 0);
          total = next.absent ? 0 : internal + theory;
          next.totalScore = total;
        }

        next.percentage = next.absent ? "0.00%" : `${((total / max) * 100).toFixed(2)}%`;
        return next;
      })
    );
  };

  const handleToggleAbsent = (studentId) => {
    setCurrentStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const nextAbsent = !s.absent;
        const internal = nextAbsent ? 0 : Number(s.internal || 0);
        const theory = nextAbsent ? 0 : Number(s.theory || 0);
        const total = nextAbsent ? 0 : internal + theory;
        const max = currentConfig.maxTotal || 100;
        return {
          ...s,
          absent: nextAbsent,
          internal: nextAbsent ? 0 : s.internal,
          theory: nextAbsent ? 0 : s.theory,
          totalScore: total,
          percentage: nextAbsent ? "0.00%" : `${((total / max) * 100).toFixed(2)}%`,
          remarks: nextAbsent ? "Absent" : "",
        };
      })
    );
  };

  // Save Draft handler - authorized faculty API
  const handleSaveDraft = async () => {
        if (!selectedExam || !selectedSubject || !selectedSection) return;
    if (subjectInclusionError) {
      notify(subjectInclusionError, "error");
      return;
    }
    if (currentStudents.length === 0) {
      notify("No eligible students to save marks for.", "error");
      return;
    }

    for (const s of currentStudents) {
      if (s.absent) continue;
      const internal = Number(s.internal || 0);
      const theory = Number(s.theory || 0);
      if (internal < 0 || theory < 0) {
        notify(`Marks cannot be negative for student ${s.name}.`, "error");
        return;
      }
      if (s.remarks && s.remarks.length > 250) {
        notify(`Remarks cannot exceed 250 characters for student ${s.name}.`, "error");
        return;
      }
    }

    setSavingMarks(true);
    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id;
    const campusId = context?.profile?.campusId || authUser?.campusId || academicCtx.selectedCampus || 1;
    const key = `${selectedSubject}_${selectedSection}_${selectedExam}`;
    const legacyKey = `${selectedSection}_${selectedExam}_${selectedSubject}`;

    const updatedEval = {
      evaluationId: key,
      section: selectedSectionCleanName,
      sectionId: Number(selectedSection),
      examId: selectedExam,
      examinationId: Number(selectedExam),
      examName: selectedExamName,
      subjectId: selectedSubject,
      subjectName: selectedSubjectName,
      faculty: context?.profile?.name || authUser?.fullName || "Faculty",
      empId: staffId ? `EMP-${staffId}` : "",
      status: "DRAFT",
      adminRemarks: "Draft saved by faculty.",
      rows: currentStudents,
    };

    try {
      const draftPayload = {
        evaluationId: key,
        students: currentStudents.map((s) => ({
          studentId: Number(s.studentId),
          internalMarks: Number(s.internal || 0),
          theoryMarks: Number(s.theory || 0),
          practicalMarks: 0,
          totalMarks: Number(s.totalScore || 0),
          isAbsent: Boolean(s.absent),
          remarks: s.remarks || "",
        })),
      };

      const resolvedBoardId = extractId(selectedBoard) ? Number(extractId(selectedBoard)) : (Number(timetableInfo.boardId) || 1);
      const resolvedBoardName = timetableInfo.boardName || "BIEAP";
      const resolvedYearId = extractId(selectedYear) ? Number(extractId(selectedYear)) : (Number(timetableInfo.academicYearId) || 1);
      const resolvedLevelId = selectedLevel ? Number(selectedLevel) : 1;
      const resolvedLevelName = "Intermediate";
      const resolvedGroupId = selectedGroup ? Number(selectedGroup) : 1;

      const bulkPayload = currentStudents.map((s) => ({
        campusId: Number(campusId) || 1,
        board: resolvedBoardName,
        boardId: resolvedBoardId,
        academicYearId: resolvedYearId,
        academicLevel: resolvedLevelName,
        academicLevelId: resolvedLevelId,
        groupId: resolvedGroupId,
        programId: selectedProgram ? Number(selectedProgram) : undefined,
        sectionId: Number(selectedSection) || 1,
        examinationId: Number(selectedExam),
        subjectId: Number(selectedSubject),
        studentId: Number(s.studentId),
        facultyId: staffId ? Number(staffId) : undefined,
        rollNo: String(s.rollNo || ""),
        studentName: s.name || "",
        internalMarks: Number(s.internal || 0),
        practicalMarks: 0,
        theoryMarks: Number(s.theory || 0),
        totalMarks: Number(s.totalScore || 0),
        obtainedMarks: Number(s.totalScore || 0),
        passingMarks: currentConfig.passingMarks || 35,
        isPass: Number(s.totalScore || 0) >= (currentConfig.passingMarks || 35),
        isAbsent: Boolean(s.absent),
        remarks: s.remarks || "",
        status: "DRAFT",
        isActive: true,
      }));

      await apiClient.post("/api/v1/marks/bulk", { marks: bulkPayload }, {
        headers: { ...(campusId ? { "X-Campus-Id": String(campusId) } : {}) },
      }).catch(() => null);

      await apiClient.put(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload)
        .catch(() => apiClient.post(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload))
        .catch(() => null);

      setEvaluationsLedger((prev) => ({
        ...prev,
        [key]: { ...updatedEval, isLocal: true },
        [legacyKey]: { ...updatedEval, isLocal: true },
      }));
      setEvaluationStatus("DRAFT");
      setSavingMarks(false);
      await fetchLiveEvaluations();
      notify("Marks draft saved successfully.", "success");
    } catch (err) {
      setSavingMarks(false);
      notify(err?.response?.data?.message || err?.message || "Failed to save marks draft.", "error");
    }
  };

  // Submit Subject handler - authorized faculty API
  const handleSubmitSubject = async () => {
    if (!selectedExam || !selectedSubject || !selectedSection) return;
    if (currentStudents.length === 0) {
      notify("No eligible students to submit marks for.", "error");
      return;
    }

    for (const s of currentStudents) {
      if (s.absent) continue;
      const internal = Number(s.internal || 0);
      const theory = Number(s.theory || 0);
      if (internal < 0 || theory < 0) {
        notify(`Marks cannot be negative for student ${s.name}.`, "error");
        return;
      }
      if (s.theory === "" || s.theory === null || isNaN(theory)) {
        notify(`Please enter theory marks for ${s.name} before submitting.`, "error");
        return;
      }
      if (s.remarks && s.remarks.length > 250) {
        notify(`Remarks cannot exceed 250 characters for student ${s.name}.`, "error");
        return;
      }
    }

    setSavingMarks(true);
    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id;
    const campusId = context?.profile?.campusId || authUser?.campusId || academicCtx.selectedCampus || 1;
    const key = `${selectedSubject}_${selectedSection}_${selectedExam}`;
    const legacyKey = `${selectedSection}_${selectedExam}_${selectedSubject}`;
    const wasRejected = evaluationStatus === "REJECTED";

    const updatedEval = {
      evaluationId: key,
      section: selectedSectionCleanName,
      sectionId: Number(selectedSection),
      examId: selectedExam,
      examinationId: Number(selectedExam),
      examName: selectedExamName,
      subjectId: selectedSubject,
      subjectName: selectedSubjectName,
      faculty: context?.profile?.name || authUser?.fullName || "Faculty",
      empId: staffId ? `EMP-${staffId}` : "",
      status: "SUBMITTED",
      adminRemarks: "Submitted to Admin. Awaiting verification review.",
      rows: currentStudents,
    };

    try {
      const draftPayload = {
        evaluationId: key,
        students: currentStudents.map((s) => ({
          studentId: Number(s.studentId),
          internalMarks: Number(s.internal || 0),
          theoryMarks: Number(s.theory || 0),
          practicalMarks: 0,
          totalMarks: Number(s.totalScore || 0),
          isAbsent: Boolean(s.absent),
          remarks: s.remarks || "",
        })),
      };

      const resolvedBoardId = extractId(selectedBoard) ? Number(extractId(selectedBoard)) : (Number(timetableInfo.boardId) || 1);
      const resolvedBoardName = timetableInfo.boardName || "BIEAP";
      const resolvedYearId = extractId(selectedYear) ? Number(extractId(selectedYear)) : (Number(timetableInfo.academicYearId) || 1);
      const resolvedLevelId = selectedLevel ? Number(selectedLevel) : 1;
      const resolvedLevelName = "Intermediate";
      const resolvedGroupId = selectedGroup ? Number(selectedGroup) : 1;

      const bulkPayload = currentStudents.map((s) => ({
        campusId: Number(campusId) || 1,
        board: resolvedBoardName,
        boardId: resolvedBoardId,
        academicYearId: resolvedYearId,
        academicLevel: resolvedLevelName,
        academicLevelId: resolvedLevelId,
        groupId: resolvedGroupId,
        programId: selectedProgram ? Number(selectedProgram) : undefined,
        sectionId: Number(selectedSection) || 1,
        examinationId: Number(selectedExam),
        subjectId: Number(selectedSubject),
        studentId: Number(s.studentId),
        facultyId: staffId ? Number(staffId) : undefined,
        rollNo: String(s.rollNo || ""),
        studentName: s.name || "",
        internalMarks: Number(s.internal || 0),
        practicalMarks: 0,
        theoryMarks: Number(s.theory || 0),
        totalMarks: Number(s.totalScore || 0),
        obtainedMarks: Number(s.totalScore || 0),
        passingMarks: currentConfig.passingMarks || 35,
        isPass: Number(s.totalScore || 0) >= (currentConfig.passingMarks || 35),
        isAbsent: Boolean(s.absent),
        remarks: s.remarks || "",
        status: "SUBMITTED",
        isActive: true,
      }));

      await apiClient.post("/api/v1/marks/bulk", { marks: bulkPayload }, {
        headers: { ...(campusId ? { "X-Campus-Id": String(campusId) } : {}) },
      });

      await apiClient.put(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload)
        .catch(() => apiClient.post(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload));

      if (wasRejected) {
        await apiClient.post(`/api/v1/faculty/evaluations/${key}/resubmit`, {
          resubmissionMessage: "Corrected marks resubmitted by faculty."
        }).catch(() => apiClient.post(`/api/v1/faculty/evaluations/${key}/submit`));
      } else {
        await apiClient.post(`/api/v1/faculty/evaluations/${key}/submit`);
      }

      setEvaluationsLedger((prev) => ({
        ...prev,
        [key]: { ...updatedEval, isLocal: true },
        [legacyKey]: { ...updatedEval, isLocal: true },
      }));
      setEvaluationStatus("SUBMITTED");
      setCurrentRejectionRemarks("");
      setSavingMarks(false);

      if (wasRejected) {
        await fetchLiveEvaluations();
        notify("Corrected marks resubmitted to Admin for review!", "success");
      } else {
        await fetchLiveEvaluations();
        notify("Marks submitted successfully! Pending Admin verification and approval.", "success");
      }
    } catch (err) {
      setSavingMarks(false);
      notify(err?.response?.data?.message || err?.message || "Failed to submit marks.", "error");
    }
  };

  // Switch to edit evaluation from Report Tab
  const handleEditEvaluation = (ev) => {
    setSelectedSection(ev.sectionId);
    setSelectedExam(ev.examId);
    setSelectedSubject(ev.subjectId);
    setCurrentStudents(ev.rows || []);
    setEvaluationStatus(ev.status);
    setCurrentRejectionRemarks(ev.adminRemarks || "");
    setActiveTab("entry");
    setContextApplied(true);
    handleExamOrSubjectChange(ev.examId, ev.subjectId, ev.sectionId);
  };

  // Open Results Modal from Report Tab
  const handleViewResults = (ev) => {
    setViewResultsEval(ev);
    setResultsModalPage(1);
  };

  // Bulk Import File Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setBulkFile(file);
      setBulkFileName(file.name);
    }
  };

  const handleValidateAndImportFile = () => {
    if (!bulkFile) {
      notify("Please select a file to import.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        notify("Unable to read file content.", "error");
        return;
      }
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        notify("Spreadsheet is empty or missing data rows.", "error");
        return;
      }
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const rollIdx = header.findIndex((h) => h.includes("roll"));
      const theoryIdx = header.findIndex((h) => h.includes("theory") || h.includes("marks"));
      const internalIdx = header.findIndex((h) => h.includes("internal"));

      if (theoryIdx === -1 && rollIdx === -1) {
        notify("Spreadsheet must contain headers for 'Roll No' and 'Marks'.", "error");
        return;
      }

      let importedCount = 0;
      setCurrentStudents((prev) =>
        prev.map((student) => {
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map((c) => c.trim());
            const fileRoll = rollIdx !== -1 ? cols[rollIdx] : "";
            if (fileRoll && String(student.rollNo).toLowerCase() === fileRoll.toLowerCase()) {
              const fileTheory = theoryIdx !== -1 ? Number(cols[theoryIdx]) : student.theory;
              const fileInternal = internalIdx !== -1 ? Number(cols[internalIdx]) : student.internal;
              importedCount++;
              const theory = isNaN(fileTheory) ? 0 : Math.min(Math.max(0, fileTheory), currentConfig.maxTheory || 100);
              const internal = isNaN(fileInternal) ? 0 : Math.min(Math.max(0, fileInternal), currentConfig.maxInternal || 20);
              const total = student.absent ? 0 : internal + theory;
              const max = currentConfig.maxTotal || 100;
              return {
                ...student,
                theory,
                internal,
                totalScore: total,
                percentage: student.absent ? "0.00%" : `${((total / max) * 100).toFixed(2)}%`,
              };
            }
          }
          return student;
        })
      );

      setShowBulkModal(false);
      setBulkFile(null);
      setBulkFileName("");
      notify(`Successfully imported marks for ${importedCount} students.`, "success");
    };
    reader.readAsText(bulkFile);
  };

  // Helper flags: SUBMITTED exams remain editable as explicitly requested; locked only on VERIFIED, APPROVED, PUBLISHED
  const isLocked = ["VERIFIED", "APPROVED", "PUBLISHED"].includes(String(evaluationStatus || "").trim().toUpperCase());
  const isApproved = evaluationStatus === "APPROVED";
  const isSubmitted = evaluationStatus === "SUBMITTED" || evaluationStatus === "VERIFIED";

  // Reusable bulk action buttons for linear alignment and responsive mobile-below-line behavior
  const bulkActionButtons = (
    <div className="cms-bulk-actions">
      <button
        type="button"
        className="cms-btn cms-btn-ghost"
        disabled={!selectedExam || !selectedSubject || isLocked || Boolean(subjectInclusionError)}
        onClick={() => {
          if (!selectedExam || !selectedSubject) {
            notify("Please select Examination & Subject first.", "error");
            return;
          }
          setShowBulkModal(true);
        }}
      >
        <Upload size={14} /> Bulk Import
      </button>

      <button
        type="button"
        className="cms-btn cms-btn-outline"
        disabled={savingMarks || !selectedExam || !selectedSubject || isLocked || Boolean(subjectInclusionError)}
        onClick={handleSaveDraft}
      >
        Save Draft
      </button>

      <button
        type="button"
        className="cms-btn cms-btn-primary"
        disabled={savingMarks || !selectedExam || !selectedSubject || isLocked || Boolean(subjectInclusionError)}
        onClick={handleSubmitSubject}
      >
        Submit Subject
      </button>
    </div>
  );

  // Evaluations for Report Tab
  const evaluationsList = useMemo(() => {
    const unique = new Map();
    Object.values(evaluationsLedger).forEach((ev) => {
      if (ev && ev.evaluationId) {
        unique.set(ev.evaluationId, ev);
      }
    });
    return Array.from(unique.values());
  }, [evaluationsLedger]);

  const filteredEvaluations = useMemo(() => {
    return evaluationsList.filter((ev) => {
      const matchStatus = reportStatusFilter === "ALL" || ev.status === reportStatusFilter;
      const matchExam = reportExamFilter === "ALL" || String(ev.examId) === String(reportExamFilter);
      const matchSearch =
        !reportSearch ||
        ev.subjectName?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        ev.section?.toLowerCase().includes(reportSearch.toLowerCase()) ||
        ev.examName?.toLowerCase().includes(reportSearch.toLowerCase());
      return matchStatus && matchExam && matchSearch;
    });
  }, [evaluationsList, reportStatusFilter, reportExamFilter, reportSearch]);

  const reportTotalPages = Math.max(1, Math.ceil(filteredEvaluations.length / reportPageSize));
  const currentReportPageRows = useMemo(() => {
    const start = (reportPage - 1) * reportPageSize;
    return filteredEvaluations.slice(start, start + reportPageSize);
  }, [filteredEvaluations, reportPage, reportPageSize]);

  // Pagination for Current Students
  const totalPages = Math.max(1, Math.ceil(currentStudents.length / pageSize));
  const currentPageStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentStudents.slice(start, start + pageSize);
  }, [currentStudents, currentPage, pageSize]);

  return (
    <div className="cms-page-container faculty-marks-page">
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`cms-toast-notification ${notification.type}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {notification.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span>{notification.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="cms-toast-close"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="cms-page-header" style={{ marginBottom: 14 }}>
        <div className="cms-page-header-left">
          <div className="cms-page-icon-wrapper" style={{ background: "var(--cms-primary-soft)" }}>
            <FileSpreadsheet size={24} style={{ color: "var(--cms-primary)" }} />
          </div>
          <div>
            <h1 className="cms-page-title">Faculty Marks Entry & Evaluation</h1>
            <p className="cms-page-subtitle">
              Manage student internal and theory marks, bulk imports, and verification workflows
            </p>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="cms-page-tabs" style={{ marginTop: 10 }}>
          <button
            type="button"
            className={`cms-tab-btn ${activeTab === "entry" ? "active" : ""}`}
            onClick={() => setActiveTab("entry")}
          >
            Marks Entry
          </button>
          <button
            type="button"
            className={`cms-tab-btn ${activeTab === "report" ? "active" : ""}`}
            onClick={() => setActiveTab("report")}
          >
            Evaluation Report
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MARKS ENTRY WORKSPACE                             */}
      {/* ======================================================== */}
      {activeTab === "entry" && (
        <>
          {/* Academic Context Card (Board & Academic Year auto-filled & read-only matching Reference 2) */}
          <div className="cms-card cms-card-filter" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--cms-text)" }}>Academic Context</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: 12.5, color: "var(--cms-muted, #7B8275)" }}>
                  Select the academic scope before opening Marks Entry.
                </p>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleEnterMarks}
              >
                Enter Marks
              </button>
            </div>

            {/* Read-only Single Line Info Tab for Board & Academic Year (Exact Reference 2 layout) */}
            <div
              className="att-timetable-info-bar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                padding: "10px 16px",
                background: "var(--cms-surface-subtle, #f8faf4)",
                border: "1px solid var(--cms-border, #e4e9dc)",
                borderRadius: 10,
                marginBottom: 14,
              }}
            >
              <div className="att-info-item" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span className="att-info-label" style={{ color: "var(--cms-muted, #7B8275)", fontWeight: 600, fontSize: "12.5px" }}>Board:</span>
                <span className="att-info-value" title={timetableInfo.boardName} style={{ color: "var(--cms-text, #10203c)", fontWeight: 700, fontSize: 13, background: "var(--cms-surface, #ffffff)", border: "1px solid var(--cms-border, #d7ddc6)", padding: "3px 10px", borderRadius: 6, maxWidth: 360, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)" }}>{timetableInfo.boardName}</span>
              </div>
              <div className="att-info-divider" style={{ width: 1, height: 18, background: "var(--cms-border, #d7ddc6)" }} />
              <div className="att-info-item" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span className="att-info-label" style={{ color: "var(--cms-muted, #7B8275)", fontWeight: 600, fontSize: "12.5px" }}>Academic Year:</span>
                <span className="att-info-value" style={{ color: "var(--cms-text, #10203c)", fontWeight: 700, fontSize: 13, background: "var(--cms-surface, #ffffff)", border: "1px solid var(--cms-border, #d7ddc6)", padding: "3px 10px", borderRadius: 6, maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)" }}>{timetableInfo.academicYearName}</span>
              </div>
            </div>

            {/* Hierarchical Cascading Dropdowns: Level, Group, Program, Section (Responsive linear fit) */}
            <div className="cms-academic-filter-row">
              {/* ACADEMIC LEVEL */}
              <div className="cms-field-group">
                <FacultySearchableSelect
                  label="ACADEMIC LEVEL"
                  value={selectedLevel}
                  placeholder="Select Academic Level"
                  options={[{ id: "", name: "Select Academic Level" }, ...timetableLevels]}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setSelectedGroup("");
                    setSelectedProgram("");
                    setSelectedSection("");
                    setContextApplied(false);
                  }}
                />
              </div>

              {/* GROUP: Strictly display ONLY groupName (NO groupCode) */}
              <div className="cms-field-group">
                <FacultySearchableSelect
                  label="GROUP"
                  value={selectedGroup}
                  placeholder="Select Group"
                  options={[{ id: "", name: "Select Group" }, ...timetableGroups]}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setSelectedProgram("");
                    setSelectedSection("");
                    setContextApplied(false);
                  }}
                />
              </div>

              {/* PROGRAM */}
              <div className="cms-field-group">
                <FacultySearchableSelect
                  label="PROGRAM"
                  value={selectedProgram}
                  placeholder="Select Program"
                  options={[{ id: "", name: "Select Program" }, ...timetablePrograms]}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    setSelectedSection("");
                    setContextApplied(false);
                  }}
                />
              </div>

              {/* SECTION: Strictly display sectionName WITHOUT (Assigned) suffix */}
              <div className="cms-field-group">
                <FacultySearchableSelect
                  label="SECTION"
                  value={selectedSection}
                  placeholder="Select Section"
                  options={[{ id: "", name: "Select Section" }, ...timetableSections]}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setContextApplied(false);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Context Summary Box */}
          {contextApplied && (
            <div className="cms-context-summary">
              <strong>
                {[selectedGroupName, selectedProgramName, selectedSectionCleanName].filter(Boolean).join(" · ")}
                {selectedExamName ? ` · ${selectedExamName}` : ""}
              </strong>
            </div>
          )}

          {/* Marks Entry Workspace Card */}
          {contextApplied && (
            <div className="cms-card cms-card-filter">
              <div className="cms-workspace-filter-row">
                <div className="cms-workspace-dropdowns">
                  {/* EXAMINATION (Label removed, linear aligned) */}
                  <div className="cms-field-group cms-field-exam">
                    <FacultySearchableSelect
                      value={selectedExam}
                      placeholder="Select Examination"
                      options={[
                        { id: "", name: "Select Examination" },
                        ...examinationsList.map((ex) => ({
                          id: ex.examinationId || ex.id || ex.examId,
                          name: `${ex.examName || ex.name} (${ex.examCode || ex.code || ex.examinationId || "EXAM"})`,
                        })),
                      ]}
                      onChange={(e) => {
                        const newExam = e.target.value;
                        setSelectedExam(newExam);
                        const autoSubj = selectedSubject || (filteredSubjects.length > 0 ? String(filteredSubjects[0].subjectId) : "");
                        if (!selectedSubject && autoSubj) {
                          setSelectedSubject(autoSubj);
                        }
                        if (newExam && autoSubj) {
                          handleExamOrSubjectChange(newExam, autoSubj);
                        } else if (!newExam) {
                          setCurrentStudents([]);
                        }
                      }}
                    />
                  </div>

                  {/* SUBJECT (Label removed, auto-filled with faculty's allocated subject) */}
                  <div className="cms-field-group cms-field-subject">
                    <FacultySearchableSelect
                      value={selectedSubject}
                      placeholder={filteredSubjects.length === 0 ? "No subjects assigned" : "Select Subject"}
                      options={[
                        { id: "", name: filteredSubjects.length === 0 ? "No subjects assigned for selected section" : "Select Subject" },
                        ...filteredSubjects.map((sub) => ({
                          id: sub.subjectId,
                          name: `${sub.subjectName}${sub.subjectCode ? ` (${sub.subjectCode})` : ""}`,
                        })),
                      ]}
                      onChange={(e) => {
                        const newSubj = e.target.value;
                        setSelectedSubject(newSubj);
                        if (selectedExam && newSubj) {
                          handleExamOrSubjectChange(selectedExam, newSubj);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Workspace Action Buttons */}
                <div className="cms-bulk-actions-desktop">
                  {bulkActionButtons}
                </div>
              </div>

              {/* Rejection Alert Banner */}
              {evaluationStatus === "REJECTED" && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "rgba(220, 38, 38, 0.08)",
                    border: "1px solid rgba(220, 38, 38, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#dc2626",
                    fontSize: 13,
                  }}
                >
                  <AlertCircle size={18} />
                  <div>
                    <strong>Evaluation Rejected by Admin:</strong> {currentRejectionRemarks || "Please correct the required student scores and resubmit."}
                  </div>
                </div>
              )}

              {/* Subject Exclusion Warning Banner */}
              {subjectInclusionError ? (
                <div
                  className="cms-subject-exclusion-banner"
                  style={{
                    margin: "18px 0 10px 0",
                    padding: "14px 18px",
                    borderRadius: 8,
                    background: "rgba(220, 38, 38, 0.08)",
                    border: "1px solid rgba(220, 38, 38, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: "#dc2626",
                    fontSize: 13.5,
                    fontWeight: 500,
                  }}
                >
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <div>{subjectInclusionError}</div>
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div
                  className="cms-no-subjects-banner"
                  style={{
                    margin: "18px 0 10px 0",
                    padding: "14px 18px",
                    borderRadius: 8,
                    background: "rgba(234, 179, 8, 0.08)",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    color: "#b45309",
                    fontSize: 13.5,
                    fontWeight: 500,
                  }}
                >
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <div>No subjects are assigned to the faculty for the selected section/context.</div>
                </div>
              ) : loadingStudents ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--cms-muted)" }}>
                  <Clock size={28} className="cms-spin-icon" style={{ marginBottom: 8 }} />
                  <div>Loading eligible student roster & examination marks...</div>
                </div>
              ) : (
                <>
                  {/* Status Configuration Toolbar */}
                  <div
                    className="cms-entry-toolbar"
                    style={{
                      paddingTop: 0,
                      borderTop: "none",
                      margin: "6px 0 14px 0",
                    }}
                  >
                    <div className="cms-config-summary">
                      <span className={`cms-status-pill ${evaluationStatus.toLowerCase().replace(/[\s_]+/g, "-")}`}>
                        <span className="cms-status-dot" />
                        {evaluationStatus}
                      </span>
                    </div>
                    <div className="cms-entry-toolbar-actions">
                      <div className="cms-bulk-actions-mobile">
                        {bulkActionButtons}
                      </div>
                    </div>
                  </div>

                  {/* Student Table */}
                  <div className="cms-table-wrap">
                    <table className="cms-table">
                      <thead>
                        <tr>
                          <th className="cms-cell-center" style={{ width: 90 }}>ROLL NO</th>
                          <th>STUDENT</th>
                          {currentConfig.isObjective ? (
                            <th className="cms-cell-center" style={{ width: 180 }}>
                              OBJECTIVE MARKS / {currentConfig.maxTotal || 100}
                            </th>
                          ) : (
                            <>
                              <th className="cms-cell-center" style={{ width: 140 }}>
                                INTERNAL / {currentConfig.maxInternal || 20}
                              </th>
                              <th className="cms-cell-center" style={{ width: 140 }}>
                                THEORY / {currentConfig.maxTheory || 80}
                              </th>
                              <th className="cms-cell-center" style={{ width: 120 }}>
                                TOTAL / {currentConfig.maxTotal || 100}
                              </th>
                            </>
                          )}
                          <th className="cms-cell-center" style={{ width: 110 }}>PERCENTAGE</th>
                          <th className="cms-cell-center" style={{ width: 80 }}>ABSENT</th>
                          <th style={{ width: 160 }}>REMARKS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPageStudents.length > 0 ? (
                          currentPageStudents.map((s) => (
                            <tr key={s.studentId}>
                              <td className="cms-cell-center" style={{ fontWeight: 600 }}>{s.rollNo}</td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{s.name}</div>
                                {s.admissionNo && (
                                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Adm: {s.admissionNo}</div>
                                )}
                              </td>
                              {currentConfig.isObjective ? (
                                <td className="cms-cell-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={currentConfig.maxTotal || 100}
                                    className="cms-cell-input cms-num-input"
                                    value={s.totalScore}
                                    disabled={s.absent || isLocked}
                                    onChange={(e) => handleStudentMarkChange(s.studentId, "obtainedMarks", e.target.value)}
                                  />
                                </td>
                              ) : (
                                <>
                                  <td className="cms-cell-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max={currentConfig.maxInternal || 20}
                                      className="cms-cell-input cms-num-input"
                                      value={s.internal}
                                      disabled={s.absent || isLocked}
                                      onChange={(e) => handleStudentMarkChange(s.studentId, "internal", e.target.value)}
                                    />
                                  </td>
                                  <td className="cms-cell-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max={currentConfig.maxTheory || 80}
                                      className="cms-cell-input cms-num-input"
                                      value={s.theory}
                                      disabled={s.absent || isLocked}
                                      onChange={(e) => handleStudentMarkChange(s.studentId, "theory", e.target.value)}
                                    />
                                  </td>
                                  <td className="cms-cell-center" style={{ fontWeight: 700 }}>
                                    {s.absent ? "—" : s.totalScore}
                                  </td>
                                </>
                              )}
                              <td className="cms-cell-center" style={{ fontWeight: 600 }}>
                                {s.absent ? "—" : s.percentage}
                              </td>
                              <td className="cms-cell-center">
                                <input
                                  type="checkbox"
                                  checked={s.absent}
                                  disabled={isLocked}
                                  onChange={() => handleToggleAbsent(s.studentId)}
                                  style={{ cursor: isLocked ? "not-allowed" : "pointer", width: 16, height: 16, accentColor: "var(--cms-primary, #6f8400)" }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="cms-text-input cms-remarks-input"
                                  placeholder="Remarks"
                                  value={s.remarks}
                                  disabled={s.absent || isLocked}
                                  onChange={(e) => handleStudentMarkChange(s.studentId, "remarks", e.target.value)}
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} style={{ textAlign: "center", padding: "32px 0", color: "var(--cms-muted)" }}>
                              No eligible students available for the selected section.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {currentStudents.length > 0 && (
                    <div className="cms-pagination-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
                      <span style={{ fontSize: 13, color: "var(--cms-muted, #7B8275)" }}>
                        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, currentStudents.length)} of {currentStudents.length} records
                        {isLocked ? ` (This ${evaluationStatus.toLowerCase()} subject is published and read-only.)` : ""}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                          <span>Per page:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="cms-select-input"
                            style={{ width: "auto", height: 28, padding: "2px 6px" }}
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EVALUATION REPORT & RESULTS                       */}
      {/* ======================================================== */}
      {activeTab === "report" && (
        <>
          {/* Summary Metric KPI Cards */}
          <div className="cms-stats-grid" style={{ marginBottom: 16 }}>
            <div className="cms-stat-card total-box">
              <p className="cms-stat-label">Total Evaluations</p>
              <h2 className="cms-stat-value">{evaluationsList.length}</h2>
            </div>
            <div className="cms-stat-card submitted-box">
              <p className="cms-stat-label">Submitted</p>
              <h2 className="cms-stat-value" style={{ color: "#2563eb" }}>
                {evaluationsList.filter((e) => e.status === "SUBMITTED").length}
              </h2>
            </div>
            <div className="cms-stat-card verified-box">
              <p className="cms-stat-label">Verified</p>
              <h2 className="cms-stat-value" style={{ color: "#1d72b8" }}>
                {evaluationsList.filter((e) => e.status === "VERIFIED").length}
              </h2>
            </div>
            <div className="cms-stat-card approved-box">
              <p className="cms-stat-label">Approved</p>
              <h2 className="cms-stat-value" style={{ color: "var(--cms-primary, #6f8400)" }}>
                {evaluationsList.filter((e) => e.status === "APPROVED").length}
              </h2>
            </div>
            <div className="cms-stat-card rejected-box">
              <p className="cms-stat-label">Rejected</p>
              <h2 className="cms-stat-value" style={{ color: "#dc2626" }}>
                {evaluationsList.filter((e) => e.status === "REJECTED").length}
              </h2>
            </div>
          </div>

          {/* Report Filter & Search Toolbar */}
          <div className="cms-card cms-card-filter" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
                <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
                  <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--cms-muted)" }} />
                  <input
                    type="text"
                    className="cms-text-input"
                    style={{ paddingLeft: 32, height: 34, fontSize: 13 }}
                    placeholder="Search subject, section, or exam..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, minWidth: 160 }}>
                  <span style={{ color: "var(--cms-muted)", fontWeight: 600 }}>Status:</span>
                  <FacultySearchableSelect
                    value={reportStatusFilter}
                    options={[
                      { id: "ALL", name: "All Statuses" },
                      { id: "DRAFT", name: "Draft" },
                      { id: "SUBMITTED", name: "Submitted" },
                      { id: "VERIFIED", name: "Verified" },
                      { id: "APPROVED", name: "Approved" },
                      { id: "REJECTED", name: "Rejected" },
                    ]}
                    onChange={(e) => setReportStatusFilter(e.target.value)}
                    style={{ minWidth: 140 }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, minWidth: 200 }}>
                  <span style={{ color: "var(--cms-muted)", fontWeight: 600 }}>Exam:</span>
                  <FacultySearchableSelect
                    value={reportExamFilter}
                    options={[
                      { id: "ALL", name: "All Exams" },
                      ...examinationsList.map((ex) => ({
                        id: ex.examinationId || ex.id,
                        name: ex.examName || ex.name,
                      })),
                    ]}
                    onChange={(e) => setReportExamFilter(e.target.value)}
                    style={{ minWidth: 180 }}
                  />
                </div>
              </div>
            </div>

            {/* Evaluations Data Table */}
            <div className="cms-table-wrap" style={{ marginTop: 14 }}>
              <table className="cms-table">
                <thead>
                  <tr>
                    <th>SUBJECT</th>
                    <th>EXAMINATION</th>
                    <th>SECTION</th>
                    <th>STATUS</th>
                    <th>REMARKS / REASON</th>
                    <th className="cms-cell-center" style={{ width: 140 }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReportPageRows.length > 0 ? (
                    currentReportPageRows.map((ev) => (
                      <tr key={ev.evaluationId}>
                        <td style={{ fontWeight: 600 }}>{ev.subjectName}</td>
                        <td>{ev.examName}</td>
                        <td>{ev.section}</td>
                        <td>
                          <span className={`cms-status-pill ${ev.status.toLowerCase().replace(/[\s_]+/g, "-")}`}>
                            <span className="cms-status-dot" />
                            {ev.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 12.5, color: ev.status === "REJECTED" ? "#dc2626" : "var(--cms-muted)" }}>
                          {ev.adminRemarks || "—"}
                        </td>
                        <td className="cms-cell-center">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            {!["VERIFIED", "APPROVED", "PUBLISHED"].includes(String(ev.status || "").trim().toUpperCase()) && (
                              <button
                                type="button"
                                className="cms-btn cms-btn-ghost"
                                style={{ height: 28, padding: "0 8px", fontSize: 12 }}
                                title="Edit Marks"
                                onClick={() => handleEditEvaluation(ev)}
                              >
                                <Edit size={13} /> Edit
                              </button>
                            )}
                            <button
                              type="button"
                              className="cms-btn cms-btn-ghost"
                              style={{ height: 28, padding: "0 8px", fontSize: 12 }}
                              title="View Results"
                              onClick={() => handleViewResults(ev)}
                            >
                              <Eye size={13} /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "32px 0", color: "var(--cms-muted)" }}>
                        No evaluation records found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Report Tab */}
            {filteredEvaluations.length > 0 && (
              <div className="cms-pagination-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: 13, color: "var(--cms-muted, #7B8275)" }}>
                  Showing {(reportPage - 1) * reportPageSize + 1}–{Math.min(reportPage * reportPageSize, filteredEvaluations.length)} of {filteredEvaluations.length} evaluations
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                    <span>Per page:</span>
                    <select
                      value={reportPageSize}
                      onChange={(e) => {
                        setReportPageSize(Number(e.target.value));
                        setReportPage(1);
                      }}
                      className="cms-select-input"
                      style={{ width: "auto", height: 28, padding: "2px 6px" }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={reportPage === 1}
                    onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {reportPage} / {reportTotalPages}
                  </span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    disabled={reportPage >= reportTotalPages}
                    onClick={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* BULK IMPORT MODAL                                        */}
      {/* ======================================================== */}
      {showBulkModal && (
        <div className="sp-modal-backdrop" onClick={() => setShowBulkModal(false)}>
          <div className="sp-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cms-border, #E6E7DE)", paddingBottom: 12 }}>
              <div>
                <h3 className="sp-modal-title" style={{ margin: 0, fontSize: 16 }}>Bulk Import Marks</h3>
                <p className="sp-modal-subtitle" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                  Import student marks for {selectedSubjectName} ({selectedSectionCleanName})
                </p>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setShowBulkModal(false)}
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sp-modal-body" style={{ padding: "16px 0" }}>
              <div
                style={{
                  border: "2px dashed var(--cms-border, #E6E7DE)",
                  borderRadius: 10,
                  padding: "24px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "var(--cms-surface-subtle, #FAFAF7)",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={36} style={{ color: "var(--cms-primary, #6f8400)", marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {bulkFileName ? bulkFileName : "Click or drag Excel/CSV spreadsheet here"}
                </div>
                <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 4 }}>
                  Supports .xlsx, .xls, and .csv files formatted with standard Roll No &amp; Marks headers
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            <div className="sp-modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--cms-border, #E6E7DE)", paddingTop: 12 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setBulkFileName("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleValidateAndImportFile}
                disabled={!bulkFile}
              >
                Validate &amp; Import Marks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW RESULTS MODAL                                       */}
      {/* ======================================================== */}
      {viewResultsEval && (
        <div className="sp-modal-backdrop" onClick={() => setViewResultsEval(null)}>
          <div className="sp-modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cms-border, #E6E7DE)", paddingBottom: 12 }}>
              <div>
                <h3 className="sp-modal-title" style={{ margin: 0, fontSize: 16 }}>
                  {viewResultsEval.subjectName} — Results Inspection
                </h3>
                <p className="sp-modal-subtitle" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                  {viewResultsEval.examName} · {viewResultsEval.section} · Status: {viewResultsEval.status}
                </p>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setViewResultsEval(null)}
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sp-modal-body" style={{ padding: "16px 0" }}>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th className="cms-cell-center" style={{ width: 80 }}>ROLL NO</th>
                      <th>STUDENT</th>
                      <th className="cms-cell-center" style={{ width: 90 }}>INTERNAL</th>
                      <th className="cms-cell-center" style={{ width: 90 }}>THEORY</th>
                      <th className="cms-cell-center" style={{ width: 90 }}>TOTAL</th>
                      <th className="cms-cell-center" style={{ width: 100 }}>PERCENTAGE</th>
                      <th className="cms-cell-center" style={{ width: 80 }}>ABSENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = viewResultsEval.rows || [];
                      const start = (resultsModalPage - 1) * resultsPageSize;
                      const pagedRows = rows.slice(start, start + resultsPageSize);
                      if (pagedRows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} style={{ textAlign: "center", padding: "20px 0", color: "var(--cms-muted)" }}>
                              No student scores recorded for this evaluation.
                            </td>
                          </tr>
                        );
                      }
                      return pagedRows.map((r, idx) => (
                        <tr key={r.studentId || idx}>
                          <td className="cms-cell-center" style={{ fontWeight: 600 }}>{r.rollNo}</td>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td className="cms-cell-center">{r.absent ? "—" : r.internal}</td>
                          <td className="cms-cell-center">{r.absent ? "—" : r.theory}</td>
                          <td className="cms-cell-center" style={{ fontWeight: 700 }}>{r.absent ? "—" : r.totalScore}</td>
                          <td className="cms-cell-center">{r.absent ? "—" : r.percentage}</td>
                          <td className="cms-cell-center">{r.absent ? "Yes" : "No"}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Modal Pagination */}
              {(viewResultsEval.rows?.length || 0) > resultsPageSize && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <span style={{ fontSize: 12.5, color: "var(--cms-muted)" }}>
                    Total {viewResultsEval.rows.length} students
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      style={{ height: 26, padding: "0 8px", fontSize: 12 }}
                      disabled={resultsModalPage === 1}
                      onClick={() => setResultsModalPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      {resultsModalPage} / {Math.ceil((viewResultsEval.rows?.length || 0) / resultsPageSize)}
                    </span>
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      style={{ height: 26, padding: "0 8px", fontSize: 12 }}
                      disabled={resultsModalPage >= Math.ceil((viewResultsEval.rows?.length || 0) / resultsPageSize)}
                      onClick={() => setResultsModalPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="sp-modal-footer" style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--cms-border, #E6E7DE)", paddingTop: 12 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setViewResultsEval(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
