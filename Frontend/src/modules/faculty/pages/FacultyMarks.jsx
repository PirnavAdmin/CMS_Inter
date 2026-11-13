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

const isObjectiveExam = (exam, schedules = []) => {
  const schedList = Array.isArray(schedules)
    ? schedules
    : (Array.isArray(exam?.schedules) ? exam.schedules : (Array.isArray(exam?.examinationSchedules) ? exam.examinationSchedules : []));

  for (const sch of schedList) {
    const schExamMode = String(sch?.examMode || "").trim().toUpperCase();
    if (schExamMode === "OBJECTIVE") return true;
    const schMode = String(sch?.scheduleMode || sch?.mode || "").trim().toUpperCase();
    if (["OBJECTIVE", "COMBINED_OBJECTIVE", "PATTERN_WISE", "COMBINED"].includes(schMode)) return true;
    const schPat = String(sch?.patternName || "").trim().toLowerCase();
    if (schPat && !schPat.includes("regular")) return true;
  }

  if (!exam) return false;

  const mode = String(exam.scheduleMode || exam.mode || exam.examMode || "").trim().toUpperCase();
  if (["OBJECTIVE", "COMBINED_OBJECTIVE", "PATTERN_WISE", "COMBINED"].includes(mode)) return true;

  const pat = String(exam.examPattern || exam.pattern || exam.patternName || "").trim().toLowerCase();
  if (pat.includes("regular")) return false;
  if (
    pat.includes("objective") ||
    pat.includes("mains") ||
    pat.includes("advance") ||
    pat.includes("eamcet") ||
    pat.includes("neet") ||
    pat.includes("jee") ||
    pat.includes("bitsat") ||
    pat.includes("cuet")
  ) {
    return true;
  }

  const cat = String(exam.examCategory || exam.category || "").trim().toUpperCase();
  if (cat === "OBJECTIVE") return true;
  if (cat === "REGULAR") return false;

  return false;
};

// Helper to strictly determine if an examination matches the selected academic group
const isExamMatchingGroup = (exam, targetGroupId, targetGroupName, allGroups = []) => {
  if (!exam || !targetGroupId) return false;

  const cleanTargetId = String(targetGroupId).trim();
  const cleanTargetName = String(targetGroupName || "").trim().toLowerCase();

  // All other group names in the college (e.g. ["bipc", "mec", "cec", "hec"])
  const otherGroupNames = (allGroups || [])
    .filter((g) => {
      const gid = String(g.id || g.groupId || "").trim();
      return gid && gid !== cleanTargetId;
    })
    .map((g) => String(g.name || g.groupName || "").trim().toLowerCase())
    .filter((name) => name.length >= 2);

  // 1. Check positive numeric groupId / GroupId
  const rawGid = exam.groupId ?? exam.GroupId;
  const numGid = rawGid != null && rawGid !== "" ? Number(rawGid) : null;
  const hasValidNumGid = numGid !== null && !isNaN(numGid) && numGid > 0;

  // 2. Check groupIds array
  const rawGids = exam.groupIds ?? exam.GroupIds;
  const hasGidsArray = Array.isArray(rawGids) && rawGids.length > 0;
  const gidsSet = hasGidsArray ? new Set(rawGids.map((id) => String(id).trim())) : null;

  // 3. Check groupName / GroupName
  const examGName = String(exam.groupName ?? exam.GroupName ?? exam.group?.name ?? exam.group?.groupName ?? "").trim().toLowerCase();

  // 4. Check groupSubjectSelections (Objective examinations)
  const gSubjectSelections = exam.groupSubjectSelections;
  const hasGSubjSelections = gSubjectSelections && typeof gSubjectSelections === "object" && Object.keys(gSubjectSelections).length > 0;
  const gSubjKeys = hasGSubjSelections ? Object.keys(gSubjectSelections).map((k) => String(k).trim()) : [];

  // Exclude explicit mismatches first:
  // A) Exam specifies a different valid groupId, and groupIds does not include targetGroupId
  if (hasValidNumGid && String(numGid) !== cleanTargetId) {
    if (!hasGidsArray || !gidsSet.has(cleanTargetId)) {
      return false;
    }
  }

  // B) Exam has groupIds array and targetGroupId is NOT in it
  if (hasGidsArray && !gidsSet.has(cleanTargetId)) {
    return false;
  }

  // C) Exam has groupSubjectSelections and targetGroupId is NOT among the group keys
  if (hasGSubjSelections && !gSubjKeys.includes(cleanTargetId)) {
    return false;
  }

  // D) Exam has explicit groupName of another known group
  if (examGName) {
    if (cleanTargetName && (examGName === cleanTargetName || examGName.includes(cleanTargetName))) {
      return true;
    }
    if (otherGroupNames.some((other) => examGName === other || (other.length >= 3 && examGName.includes(other)))) {
      return false;
    }
  }

  // E) Exam title or code specifically mentions another group as a whole word
  const examTitleAndCode = `${exam.examName || ""} ${exam.examinationName || ""} ${exam.name || ""} ${exam.examCode || ""} ${exam.code || ""}`.toLowerCase();
  const mentionsOtherGroup = otherGroupNames.some(
    (other) => other && other.length >= 3 && new RegExp(`\\b${other}\\b`, "i").test(examTitleAndCode)
  );
  if (mentionsOtherGroup) {
    const mentionsTargetGroup = cleanTargetName && cleanTargetName.length >= 2 && new RegExp(`\\b${cleanTargetName}\\b`, "i").test(examTitleAndCode);
    if (!mentionsTargetGroup) {
      return false;
    }
  }

  // Positive matches:
  if (hasValidNumGid && String(numGid) === cleanTargetId) return true;
  if (hasGidsArray && gidsSet.has(cleanTargetId)) return true;
  if (hasGSubjSelections && gSubjKeys.includes(cleanTargetId)) return true;
  if (cleanTargetName && examGName && (examGName === cleanTargetName || examGName.includes(cleanTargetName))) return true;
  if (cleanTargetName && cleanTargetName.length >= 2 && new RegExp(`\\b${cleanTargetName}\\b`, "i").test(examTitleAndCode)) return true;

  // Schedules check
  const schedules = exam.schedules || exam.examinationSchedules || [];
  if (Array.isArray(schedules) && schedules.length > 0) {
    const schedGids = schedules.map((s) => s.groupId != null ? String(s.groupId).trim() : "").filter(Boolean);
    if (schedGids.length > 0) {
      return schedGids.includes(cleanTargetId);
    }
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
    maxPractical: 0,
    showInternal: false,
    showPractical: false,
    showTheory: true,
    showObtained: false,
    passingMarks: 35,
    examDate: null,
    isObjective: false,
    category: "REGULAR",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const inputRefs = useRef({});
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
  const [resultsModalLoading, setResultsModalLoading] = useState(false);
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
            mode: String(ev.mode || "").toUpperCase() || null,
            maxMarks: ev.maxMarks != null ? Number(ev.maxMarks) : null,
            internalMax: ev.internalMax != null ? Number(ev.internalMax) : null,
            practicalMax: ev.practicalMax != null ? Number(ev.practicalMax) : null,
            theoryMax: ev.theoryMax != null ? Number(ev.theoryMax) : null,
            adminRemarks: ev.rejectionReason || ev.remarks || ev.adminRemarks || "",
            totalStudents: Number(ev.totalStudents || (Array.isArray(ev.students) ? ev.students.length : (Array.isArray(ev.rows) ? ev.rows.length : 0))),
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
        setEvaluationsLedger({}); // EVAL_EMPTY
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

  /* duplicate context helpers start
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

  duplicate context helpers end */

  // Fetch Completed Examinations matching Academic Context (Strictly completed only)
  useEffect(() => {
    let isMounted = true;
    const authUser = getAuthUser();
    const effectiveCampusId = context?.profile?.campusId || authUser?.campusId || academicCtx.selectedCampus || 1;
    const cleanBoard = extractId(selectedBoard);
    const cleanYear = extractId(selectedYear);
    const params = {
      campusId: effectiveCampusId,
      CampusId: effectiveCampusId,
      ...(cleanBoard ? { boardId: Number(cleanBoard), BoardId: Number(cleanBoard) } : {}),
      ...(cleanYear ? { academicYearId: Number(cleanYear), AcademicYearId: Number(cleanYear) } : {}),
      ...(selectedLevel ? { academicLevelId: Number(selectedLevel), AcademicLevelId: Number(selectedLevel) } : {}),
      ...(selectedGroup ? { groupId: Number(selectedGroup), GroupId: Number(selectedGroup) } : {}),
      ...(selectedProgram ? { programId: Number(selectedProgram), ProgramId: Number(selectedProgram) } : {}),
      status: "COMPLETED",


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
            if (selectedProgram) {
              const matchesProgram = !e.programId || String(e.programId) === String(selectedProgram) ||
                (Array.isArray(e.programIds) && e.programIds.map(String).includes(String(selectedProgram)));
              if (!matchesProgram) return false;
            }
            if (selectedGroup) {
              const curGName = timetableGroups.find((g) => String(g.id) === String(selectedGroup))?.name || ""; if (!isExamMatchingGroup(e, selectedGroup, curGName, timetableGroups)) { return false;
            }



            }

            return true;
          });
          setExaminationsList(completedExams);
        }
      })
      .catch((err) => console.warn("Error fetching examinations:", err));

    return () => { isMounted = false; };
  }, [selectedBoard, selectedYear, selectedLevel, selectedGroup, selectedProgram, timetableGroups, context?.profile?.campusId, academicCtx.selectedCampus]);

  // Group-Filtered examinations list ensuring the dropdown strictly shows only group examinations
  const filteredExaminationsList = useMemo(() => {
    if (!selectedGroup) return examinationsList;
    const gName = timetableGroups.find((g) => String(g.id) === String(selectedGroup))?.name || ""; return examinationsList.filter((ex) => isExamMatchingGroup(ex, selectedGroup, gName, timetableGroups));
  }, [examinationsList, selectedGroup, timetableGroups]);

  // Keep selectedExam synchronized if the filtered completed exam list changes
  useEffect(() => {
    if (selectedExam) {
      const exists = filteredExaminationsList.some((e) => String(e.examinationId || e.id || e.examId) === String(selectedExam));
      if (!exists) {
        setSelectedExam("");
        setCurrentStudents([]);
        setSubjectInclusionError(null);
      }
    }
  }, [filteredExaminationsList, selectedExam]);

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
    return filteredExaminationsList.find((e) => String(e.examinationId || e.id) === String(selectedExam)) || null;
  }, [filteredExaminationsList, selectedExam]);

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

      setFieldErrors({});
      setLiveAnnouncement("");

      // Strict validation: Verify faculty subject is officially included in the selected examination configuration
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

      // Fetch authoritative evaluation header/maxima AND subject metadata from DB endpoints
      const subjLookupBoard = cleanBoard || selectedExamObj?.boardId;
      const subjLookupGroup = selectedGroup || selectedExamObj?.groupId;
      const subjLookupLevel = selectedLevel || selectedExamObj?.academicLevelId;
      const [evalStudentsRes, subjectsCtxRes] = await Promise.all([
        apiClient
          .get(`/api/v1/faculty/evaluations/${newSubject}_${targetSec}_${newExam}/students`, {
            params: { campusId: effectiveCampusId },
            headers: { ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}) },
            skipGlobalLoader: true,
          })
          .catch(() => null),
        (subjLookupGroup || (subjLookupBoard && subjLookupLevel))
          ? apiClient
              .get("/api/v1/subjects/context", {
                params: {
                  ...(subjLookupBoard ? { boardId: Number(subjLookupBoard) } : {}),
                  ...(subjLookupGroup ? { groupId: Number(subjLookupGroup) } : {}),
                  ...(subjLookupLevel ? { academicLevelId: Number(subjLookupLevel) } : {}),
                },
                skipGlobalLoader: true,
              })
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      const evalHeader = evalStudentsRes?.data?.data || evalStudentsRes?.data || null;
      const subjectsCtxRaw = subjectsCtxRes?.data?.data || subjectsCtxRes?.data || [];
      const subjectsCtxList = Array.isArray(subjectsCtxRaw) ? subjectsCtxRaw : [];
      const subjectMeta = subjectsCtxList.find((sub) => {
        const sid = String(sub.subjectId ?? sub.id ?? "").trim();
        if (sid === String(newSubject).trim()) return true;
        if (altAlloc?.subjectId && sid === String(altAlloc.subjectId).trim()) return true;
        const sc = String(sub.subjectCode || "").trim().toLowerCase();
        const sn = String(sub.subjectName || "").trim().toLowerCase();
        if (targetCode && sc && sc === targetCode) return true;
        if (targetName && sn && sn === targetName) return true;
        return false;
      }) || null;

      const subjSchedule = schedules.find((sch) => {
        const schId = String(sch.subjectId).trim();
        if (schId === String(newSubject).trim()) return true;
        if (altAlloc?.subjectId && schId === String(altAlloc.subjectId).trim()) return true;
        if (Array.isArray(sch.includedSubjectIds)) {
          if (sch.includedSubjectIds.map((x) => String(x).trim()).includes(String(newSubject).trim())) return true;
          if (altAlloc?.subjectId && sch.includedSubjectIds.map((x) => String(x).trim()).includes(String(altAlloc.subjectId).trim())) return true;
        }
        const sCode = (sch.subjectCode || "").trim().toLowerCase();
        const sName = (sch.subjectName || "").trim().toLowerCase();
        if (targetCode && sCode === targetCode) return true;
        if (targetName && sName === targetName) return true;
        return false;
      }) || (schedules.length > 0 ? schedules[0] : null);

      const headerMode = String(evalHeader?.mode || "").trim().toUpperCase();
      const isObjective = headerMode === "OBJECTIVE" || isObjectiveExam(selectedExamObj, schedules);

      let examDate = subjSchedule?.examDate || subjSchedule?.date || selectedExamObj?.startDate || selectedExamObj?.examDate || selectedExamObj?.endDate || null;
      let maxTotal = 100;
      let maxInternal = 0;
      let maxPractical = 0;
      let maxTheory = 0;
      let showInternal = false;
      let showPractical = false;
      let showTheory = false;
      let showObtained = false;
      let passingMarks = 35;

      if (isObjective) {
        maxInternal = 0;
        maxPractical = 0;
        maxTheory = 0;
        showInternal = false;
        showPractical = false;
        showTheory = false;
        showObtained = true;
        maxTotal = Number(
          (subjSchedule?.maxMarks && Number(subjSchedule.maxMarks) > 0 ? subjSchedule.maxMarks : null) ??
          (evalHeader?.maxMarks && Number(evalHeader.maxMarks) > 0 ? evalHeader.maxMarks : null) ??
          (selectedExamObj?.totalMarks && Number(selectedExamObj.totalMarks) > 0 ? selectedExamObj.totalMarks : null) ??
          (subjectMeta?.totalMarks && Number(subjectMeta.totalMarks) > 0 ? subjectMeta.totalMarks : null) ??
          100
        );
        const pct = Number(evalHeader?.passPercentage || selectedExamObj?.passPercentage || 0);
        passingMarks = Number(
          (subjSchedule?.passingMarks && Number(subjSchedule.passingMarks) > 0 ? subjSchedule.passingMarks : null) ??
          (pct > 0 ? Math.round((pct / 100) * maxTotal) : null) ??
          (subjectMeta?.passingMarks && Number(subjectMeta.passingMarks) > 0 ? subjectMeta.passingMarks : null) ??
          35
        );
      } else {
        const rawInt = Number(evalHeader?.internalMax ?? subjectMeta?.internalMarks ?? 0);
        const rawPrac = Number(evalHeader?.practicalMax ?? subjectMeta?.practicalMarks ?? 0);
        const rawTh = Number(evalHeader?.theoryMax ?? subjectMeta?.externalMarks ?? 0);
        const schedExamMode = String(subjSchedule?.examMode || "").trim().toLowerCase();
        const examTypeLower = String(selectedExamObj?.examType || selectedExamObj?.assessmentTypeName || "").trim().toLowerCase();
        const examNameLower = String(selectedExamObj?.examName || selectedExamObj?.name || "").trim().toLowerCase();

        if (rawInt + rawPrac + rawTh > 0) {
          maxInternal = rawInt;
          maxPractical = rawPrac;
          maxTheory = rawTh;
        } else if (schedExamMode === "practical" || examTypeLower.includes("practical") || examNameLower.includes("practical")) {
          maxPractical = Number(subjSchedule?.maxMarks || evalHeader?.maxMarks || subjectMeta?.totalMarks || selectedExamObj?.totalMarks || 100);
        } else if (schedExamMode === "internal" || examTypeLower.includes("internal")) {
          maxInternal = Number(subjSchedule?.maxMarks || evalHeader?.maxMarks || subjectMeta?.totalMarks || selectedExamObj?.totalMarks || 100);
        } else {
          maxTheory = Number(subjSchedule?.maxMarks || evalHeader?.maxMarks || subjectMeta?.totalMarks || selectedExamObj?.totalMarks || 100);
        }

        showInternal = maxInternal > 0;
        showPractical = maxPractical > 0;
        showTheory = maxTheory > 0;
        showObtained = false;
        maxTotal = (maxInternal + maxPractical + maxTheory) || Number(subjSchedule?.maxMarks || evalHeader?.maxMarks || subjectMeta?.totalMarks || 100);
        passingMarks = Number(
          (subjSchedule?.passingMarks && Number(subjSchedule.passingMarks) > 0 ? subjSchedule.passingMarks : null) ??
          (subjectMeta?.passingMarks && Number(subjectMeta.passingMarks) > 0 ? subjectMeta.passingMarks : null) ??
          selectedExamObj?.passingMarks ??
          selectedExamObj?.passMarks ??
          35
        );
      }

      setCurrentConfig({
        maxTotal,
        maxTheory,
        maxInternal,
        maxPractical,
        showInternal,
        showPractical,
        showTheory,
        showObtained,
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
        // Match section students: strictly from this section roster (no foreign students injected)
        rawStudentList.forEach((st) => {

          const targetStudentId = String(st.studentId);
          if (marksMap.has(targetStudentId) || liveStatus === "NOT STARTED" || liveStatus === "DRAFT") {
            effectiveRoster.push(st);

          }
        });
        if (effectiveRoster.length === 0) { effectiveRoster = rawStudentList; }
      } else {
        /* STRAY_OLD_CODE_START

        }
// CLEAN_SECTION_DONE
// UNUSED_MARKS_LOOP





          }
        });










          }
        });
      } else {
        STRAY_OLD_CODE_END */
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

      // Also hydrate marksMap from evalHeader.students if saved marks exist there
      if (evalHeader && Array.isArray(evalHeader.students) && (evalHeader.evaluationId > 0 || String(evalHeader.status || "").toUpperCase() !== "DRAFT")) {
        evalHeader.students.forEach((es) => {
          const sId = String(es.studentId ?? "");
          if (sId && !marksMap.has(sId)) {
            marksMap.set(sId, es);
          }
        });
      }

      // Map student rows
      const mappedRows = effectiveRoster.map((student) => {
        const mark = marksMap.get(String(student.studentId));
        const hasRecordedMark = Boolean(
          mark && (
            Number(mark.markId || 0) > 0 ||
            Boolean(mark.isAbsent || mark.absent) ||
            liveStatus !== "NOT STARTED" ||
            Number(mark.totalMarks ?? mark.obtainedMarks ?? mark.total ?? 0) > 0 ||
            Number(mark.internalMarks ?? mark.internal ?? 0) > 0 ||
            Number(mark.practicalMarks ?? mark.practical ?? 0) > 0 ||
            Number(mark.theoryMarks ?? mark.theory ?? 0) > 0 ||
            Boolean(mark.remarks)
          )
        );
        if (mark && hasRecordedMark) {
          const isAbsent = Boolean(mark.isAbsent || mark.absent);
          const internal = isObjective || !showInternal ? 0 : Number(mark.internalMarks ?? mark.internal ?? 0);
          const practical = isObjective || !showPractical ? 0 : Number(mark.practicalMarks ?? mark.practical ?? 0);
          const theory = isObjective || !showTheory ? 0 : Number(mark.theoryMarks ?? mark.theory ?? 0);
          const obtainedRaw = mark.obtainedMarks ?? mark.totalMarks ?? mark.total ?? (internal + practical + theory);
          const obtainedMarks = isAbsent ? "" : Number(obtainedRaw ?? 0);
          const componentSum = (showInternal ? internal : 0) + (showPractical ? practical : 0) + (showTheory ? theory : 0);
          const total = isAbsent ? 0 : (isObjective ? Number(obtainedMarks || 0) : (componentSum || Number(obtainedRaw || 0)));
          const percentage = isAbsent ? "0.00%" : `${((total / (maxTotal || 1)) * 100).toFixed(2)}%`;
          return {
            studentId: student.studentId,
            rollNo: mark.rollNo || student.rollNo || "",
            name: mark.studentName || student.name || `Student #${student.studentId}`,
            internal: isAbsent ? 0 : (isObjective ? 0 : (showInternal ? internal : 0)),
            practical: isAbsent ? 0 : (isObjective ? 0 : (showPractical ? practical : 0)),
            theory: isAbsent ? 0 : (isObjective ? 0 : (showTheory ? theory : 0)),
            obtainedMarks: isAbsent ? "" : (isObjective ? obtainedMarks : total),
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
            internal: isObjective || !showInternal ? 0 : "",
            practical: isObjective || !showPractical ? 0 : "",
            theory: isObjective || !showTheory ? 0 : "",
            obtainedMarks: "",
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

  const getMaxForField = (field) => {
    if (field === "internal") return Number(currentConfig.maxInternal || 0);
    if (field === "practical") return Number(currentConfig.maxPractical || 0);
    if (field === "theory") return Number(currentConfig.maxTheory || 0);
    return Number(currentConfig.maxTotal || 100);
  };

  const getFieldLabel = (field) => {
    if (field === "internal") return "Internal";
    if (field === "practical") return "Practical";
    if (field === "theory") return "Theory";
    return "Obtained";
  };

  const validateSingleMarkValue = (field, rawVal, { allowEmpty = true } = {}) => {
    if (rawVal === "" || rawVal === null || rawVal === undefined) {
      return allowEmpty ? null : `Please enter ${getFieldLabel(field).toLowerCase()} marks.`;
    }
    const num = Number(rawVal);
    const maxAllowed = getMaxForField(field);
    if (isNaN(num)) return "Enter a valid number.";
    if (num < 0) return "Marks cannot be negative.";
    if (num > maxAllowed) return `Marks cannot exceed ${maxAllowed}.`;
    return null;
  };

  const handleStudentMarkBlur = (studentId, field, rawVal) => {
    const err = validateSingleMarkValue(field, rawVal, { allowEmpty: true });
    const errKey = `${studentId}_${field}`;
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) {
        next[errKey] = err;
        setLiveAnnouncement(`${getFieldLabel(field)} marks error: ${err}`);
      } else {
        delete next[errKey];
      }
      return next;
    });
  };

  // Student mark input change handlers (validation runs on blur/submit; valid edits clear errors on input)
  const handleStudentMarkChange = (studentId, field, rawVal) => {
    if (field === "internal" || field === "practical" || field === "theory" || field === "obtainedMarks") {
      const errKey = `${studentId}_${field}`;
      const err = validateSingleMarkValue(field, rawVal, { allowEmpty: true });
      if (!err) {
        setFieldErrors((prev) => {
          if (!prev[errKey]) return prev;
          const next = { ...prev };
          delete next[errKey];
          return next;
        });
      }
    }

    setCurrentStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;

        let val = rawVal;
        if (field === "internal" || field === "practical" || field === "theory" || field === "obtainedMarks") {
          if (val === "" || val === null || val === undefined) {
            val = "";
          } else {
            const num = Number(val);
            if (!isNaN(num)) {
              val = num;
            }
          }
        }

        const next = { ...s, [field]: val };
        const max = currentConfig.maxTotal || 100;
        let total = 0;

        if (currentConfig.isObjective) {
          const parsedObj = next.obtainedMarks === "" || next.obtainedMarks === null || next.obtainedMarks === undefined ? 0 : Number(next.obtainedMarks);
          total = next.absent ? 0 : (isNaN(parsedObj) ? 0 : parsedObj);
          next.internal = 0;
          next.practical = 0;
          next.theory = 0;
          next.totalScore = total;
        } else {
          const internal = currentConfig.showInternal ? Number(next.internal || 0) : 0;
          const practical = currentConfig.showPractical ? Number(next.practical || 0) : 0;
          const theory = currentConfig.showTheory ? Number(next.theory || 0) : 0;
          total = next.absent ? 0 : (internal + practical + theory);
          next.obtainedMarks = total;
          next.totalScore = total;
        }

        next.percentage = next.absent ? "0.00%" : `${((total / (max || 1)) * 100).toFixed(2)}%`;
        return next;
      })
    );
  };

  const handleToggleAbsent = (studentId) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${studentId}_`)) delete next[k];
      });
      return next;
    });
    setCurrentStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const nextAbsent = !s.absent;
        const max = currentConfig.maxTotal || 100;
        if (nextAbsent) {
          return {
            ...s,
            absent: true,
            internal: 0,
            practical: 0,
            theory: 0,
            obtainedMarks: "",
            totalScore: 0,
            percentage: "0.00%",
            remarks: s.remarks || "Absent",
          };
        }
        const total = currentConfig.isObjective
          ? Number(s.obtainedMarks || 0)
          : (currentConfig.showInternal ? Number(s.internal || 0) : 0) +
            (currentConfig.showPractical ? Number(s.practical || 0) : 0) +
            (currentConfig.showTheory ? Number(s.theory || 0) : 0);
        return {
          ...s,
          absent: false,
          internal: currentConfig.isObjective || !currentConfig.showInternal ? 0 : (s.internal === 0 ? "" : s.internal),
          practical: currentConfig.isObjective || !currentConfig.showPractical ? 0 : (s.practical === 0 ? "" : s.practical),
          theory: currentConfig.isObjective || !currentConfig.showTheory ? 0 : (s.theory === 0 ? "" : s.theory),
          obtainedMarks: currentConfig.isObjective ? (s.obtainedMarks || "") : total,
          totalScore: total,
          percentage: `${((total / (max || 1)) * 100).toFixed(2)}%`,
          remarks: s.remarks === "Absent" ? "" : s.remarks,
        };
      })
    );
  };

  const validateStudentsBeforeSave = ({ requireAll = false } = {}) => {
    const errors = {};
    let firstInvalidStudentId = null;
    let firstInvalidField = null;
    let firstMessage = null;

    const activeFields = currentConfig.isObjective
      ? ["obtainedMarks"]
      : [
          ...(currentConfig.showInternal ? ["internal"] : []),
          ...(currentConfig.showPractical ? ["practical"] : []),
          ...(currentConfig.showTheory ? ["theory"] : []),
        ];

    for (const s of currentStudents) {
      if (s.absent) continue;
      for (const field of activeFields) {
        const err = validateSingleMarkValue(field, s[field], { allowEmpty: !requireAll });
        if (err) {
          const errKey = `${s.studentId}_${field}`;
          errors[errKey] = err;
          if (!firstMessage) {
            firstInvalidStudentId = s.studentId;
            firstInvalidField = field;
            firstMessage = `${s.name} (${getFieldLabel(field)}): ${err}`;
          }
        }
      }
      if (s.remarks && s.remarks.length > 250 && !firstMessage) {
        firstMessage = `Remarks cannot exceed 250 characters for student ${s.name}.`;
      }
    }

    setFieldErrors(errors);
    if (firstMessage) {
      setLiveAnnouncement(firstMessage);
      notify(firstMessage, "error");
      if (firstInvalidStudentId && firstInvalidField) {
        const targetIndex = currentStudents.findIndex((st) => st.studentId === firstInvalidStudentId);
        if (targetIndex >= 0) {
          const targetPage = Math.floor(targetIndex / pageSize) + 1;
          if (targetPage !== currentPage) setCurrentPage(targetPage);
        }
        setTimeout(() => {
          const el = inputRefs.current[`${firstInvalidStudentId}_${firstInvalidField}`];
          if (el && typeof el.focus === "function") el.focus();
        }, 40);
      }
      return false;
    }
    return true;
  };

  const buildStudentMarkPayloads = (targetStatusLabel) => {
    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id;
    const campusId = context?.profile?.campusId || authUser?.campusId || academicCtx.selectedCampus || 1;
    const resolvedBoardId = extractId(selectedBoard) ? Number(extractId(selectedBoard)) : (Number(timetableInfo.boardId) || 1);
    const resolvedBoardName = timetableInfo.boardName || "BIEAP";
    const resolvedYearId = extractId(selectedYear) ? Number(extractId(selectedYear)) : (Number(timetableInfo.academicYearId) || 1);
    const resolvedLevelId = selectedLevel ? Number(selectedLevel) : 1;
    const resolvedLevelName = "Intermediate";
    const resolvedGroupId = selectedGroup ? Number(selectedGroup) : 1;
    const key = `${selectedSubject}_${selectedSection}_${selectedExam}`;

    const draftPayload = {
      evaluationId: key,
      students: currentStudents.map((s) => {
        if (currentConfig.isObjective) {
          const score = s.absent ? 0 : Math.round(Number(s.obtainedMarks || 0));
          return {
            studentId: Number(s.studentId),
            internalMarks: 0,
            practicalMarks: 0,
            theoryMarks: 0,
            obtainedMarks: score,
            totalMarks: score,
            isAbsent: Boolean(s.absent),
            remarks: s.remarks || "",
          };
        }
        const internal = s.absent || !currentConfig.showInternal ? 0 : Math.round(Number(s.internal || 0));
        const practical = s.absent || !currentConfig.showPractical ? 0 : Math.round(Number(s.practical || 0));
        const theory = s.absent || !currentConfig.showTheory ? 0 : Math.round(Number(s.theory || 0));
        const total = s.absent ? 0 : (internal + practical + theory);
        return {
          studentId: Number(s.studentId),
          internalMarks: internal,
          practicalMarks: practical,
          theoryMarks: theory,
          obtainedMarks: total,
          totalMarks: total,
          isAbsent: Boolean(s.absent),
          remarks: s.remarks || "",
        };
      }),
    };

    const bulkPayload = currentStudents.map((s) => {
      const isObj = currentConfig.isObjective;
      const internal = s.absent || isObj || !currentConfig.showInternal ? 0 : Math.round(Number(s.internal || 0));
      const practical = s.absent || isObj || !currentConfig.showPractical ? 0 : Math.round(Number(s.practical || 0));
      const theory = s.absent || isObj || !currentConfig.showTheory ? 0 : Math.round(Number(s.theory || 0));
      const obtained = s.absent ? 0 : (isObj ? Math.round(Number(s.obtainedMarks || 0)) : (internal + practical + theory));
      return {
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
        internalMarks: internal,
        practicalMarks: practical,
        theoryMarks: theory,
        totalMarks: obtained,
        obtainedMarks: obtained,
        passingMarks: currentConfig.passingMarks || 35,
        isPass: !s.absent && obtained >= (currentConfig.passingMarks || 35),
        isAbsent: Boolean(s.absent),
        remarks: s.remarks || "",
        status: targetStatusLabel,
        isActive: true,
      };
    });

    return { draftPayload, bulkPayload, campusId, staffId, key };
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
    if (!validateStudentsBeforeSave({ requireAll: false })) return;

    setSavingMarks(true);
    const authUser = getAuthUser();
    const { draftPayload, staffId, key } = buildStudentMarkPayloads("DRAFT");
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
      mode: currentConfig.isObjective ? "OBJECTIVE" : "REGULAR",
      maxMarks: currentConfig.maxTotal,
      internalMax: currentConfig.maxInternal,
      practicalMax: currentConfig.maxPractical,
      theoryMax: currentConfig.maxTheory,
      faculty: context?.profile?.name || authUser?.fullName || "Faculty",
      empId: staffId ? `EMP-${staffId}` : "",
      status: "DRAFT",
      adminRemarks: "Draft saved by faculty.",
      rows: currentStudents,
    };

    try {
      await apiClient.put(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload)
        .catch(() => apiClient.post(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload));

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
    if (subjectInclusionError) {
      notify(subjectInclusionError, "error");
      return;
    }
    if (currentStudents.length === 0) {
      notify("No eligible students to submit marks for.", "error");
      return;
    }
    if (!validateStudentsBeforeSave({ requireAll: true })) return;

    setSavingMarks(true);
    const authUser = getAuthUser();
    const { draftPayload, bulkPayload, campusId, staffId, key } = buildStudentMarkPayloads("SUBMITTED");
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
      mode: currentConfig.isObjective ? "OBJECTIVE" : "REGULAR",
      maxMarks: currentConfig.maxTotal,
      internalMax: currentConfig.maxInternal,
      practicalMax: currentConfig.maxPractical,
      theoryMax: currentConfig.maxTheory,
      faculty: context?.profile?.name || authUser?.fullName || "Faculty",
      empId: staffId ? `EMP-${staffId}` : "",
      status: "SUBMITTED",
      adminRemarks: "Submitted to Admin. Awaiting verification review.",
      rows: currentStudents,
    };

    try {
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
  const handleViewResults = async (ev) => {
    setViewResultsEval(ev);
    setResultsModalPage(1);
    const evalId = ev.evaluationId || `${ev.subjectId}_${ev.sectionId}_${ev.examId}`;
    if (!evalId) return;

    setResultsModalLoading(true);
    try {
      const authUser = getAuthUser();
      const effectiveCampusId = context?.profile?.campusId || context?.profileData?.campusId || authUser?.campusId || academicCtx.selectedCampus || 1;
      const keyPrimary = ev.evaluationId || `${ev.subjectId}_${ev.sectionId}_${ev.examId}`;
      const keyLegacy = `${ev.sectionId}_${ev.examId}_${ev.subjectId}`;

      // Authoritative evaluation endpoints (try official evaluation object FIRST to get exact submitted students)
      const endpointsToTry = [
        `/api/v1/evaluations/${keyPrimary}`,
        `/api/v1/faculty/evaluations/${keyPrimary}`,
        `/api/v1/evaluations/${keyLegacy}`,
        `/api/v1/faculty/evaluations/${keyLegacy}`,
        `/api/v1/faculty/evaluations/${keyPrimary}/students`,
        `/api/v1/evaluations/${keyPrimary}/students`,
      ];
      /* OLD_CLOSE



      ];
      OLD_CLOSE_END */
      let resData = null;
      for (const url of endpointsToTry) {
        try {
          const res = await apiClient.get(url, {
            params: { campusId: effectiveCampusId },
            headers: { ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}) },
          });
          const payload = res?.data?.data !== undefined ? res.data.data : res?.data;
          if (payload && (Array.isArray(payload.students) || Array.isArray(payload.marksList) || Array.isArray(payload))) {
            resData = payload;
            break;
          }
        } catch {
          // try next endpoint
        }
      }

      // If direct GET did not find students, search via /api/v1/evaluations/search
      if (!resData || !(resData.students?.length || resData.marksList?.length)) {
        try {
          const searchPayload = {
            campusId: Number(effectiveCampusId) || 1,
            sectionId: Number(ev.sectionId),
            examinationId: Number(ev.examId || ev.examinationId),
            subjectId: Number(ev.subjectId),
          };
          const searchRes = await apiClient.post("/api/v1/evaluations/search", searchPayload, {
            headers: { ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}) },
            skipGlobalLoader: true,
          }).catch(() => null);
          const evalList = searchRes?.data?.data || searchRes?.data || [];
          if (Array.isArray(evalList) && evalList.length > 0) {
            const matched = evalList.find((item) => {
              if (item.evaluationId && String(item.evaluationId).trim() === String(keyPrimary).trim()) return true;
              return String(item.subjectId) === String(ev.subjectId) && String(item.sectionId) === String(ev.sectionId);
            }) || evalList[0];
            if (matched && (Array.isArray(matched.students) || Array.isArray(matched.marksList))) {
              resData = matched;
            }
          }
        } catch {}
      }

      if (!resData) {
        try {
          const examId = ev.examId || ev.examinationId;
          const marksRes = await apiClient.get(`/api/v1/marks/exam/${examId}`, {
            params: { campusId: effectiveCampusId },
            headers: { ...(effectiveCampusId ? { "X-Campus-Id": String(effectiveCampusId) } : {}) },
          });
          const raw = marksRes?.data?.data || marksRes?.data || [];
          const list = Array.isArray(raw) ? raw : (raw?.items || []);
          const filtered = list.filter((m) => String(m.subjectId) === String(ev.subjectId) && (!ev.sectionId || String(m.sectionId) === String(ev.sectionId)));
          if (filtered.length) {
            resData = { students: filtered };
          }
        } catch {
          // ignore
        }
      }

      let rawStudents = Array.isArray(resData)
        ? resData
        : (resData?.students || resData?.marksList || resData?.rows || []);

      // If resData didn't have students, check ev.rows or evaluationsLedger
      if (!rawStudents.length && (ev.rows?.length || evaluationsLedger[keyPrimary]?.rows?.length || evaluationsLedger[keyLegacy]?.rows?.length)) {
        rawStudents = ev.rows?.length
          ? ev.rows
          : (evaluationsLedger[keyPrimary]?.rows || evaluationsLedger[keyLegacy]?.rows || []);
      }

      // Filter strictly to submitted section students:
      // 1. Exclude any records belonging to a different section if sectionId is present
      if (ev.sectionId && rawStudents.some((s) => s.sectionId && String(s.sectionId) !== String(ev.sectionId))) {
        rawStudents = rawStudents.filter((s) => !s.sectionId || String(s.sectionId) === String(ev.sectionId));
      }

      // 2. Filter out extraneous unsubmitted students who have no markId and no submission marks
      // Submitted students have markId > 0, "Faculty Submission" remarks, isSubmitted flag, or evaluated marks/absent
      if (rawStudents.length > 0) {
        const submittedOnly = rawStudents.filter((s) => {
          const hasMarkId = s.markId != null && Number(s.markId) > 0;
          const hasSubRemarks = s.remarks && String(s.remarks).toLowerCase().includes("submission");
          const isSubStatus = s.isSubmitted === true || ["SUBMITTED", "APPROVED", "VERIFIED", "PUBLISHED"].includes(String(s.status || s.statusCode || "").toUpperCase());
          const isAbsent = Boolean(s.isAbsent ?? s.absent);
          const hasMarks = (s.totalMarks != null && Number(s.totalMarks) > 0) ||
                           (s.total != null && Number(s.total) > 0) ||
                           (s.theory != null && Number(s.theory) > 0) ||
                           (s.theoryMarks != null && Number(s.theoryMarks) > 0) ||
                           (s.obtainedMarks != null && Number(s.obtainedMarks) > 0);

          return hasMarkId || hasSubRemarks || isSubStatus || isAbsent || hasMarks;
        });

        if (submittedOnly.length > 0 && submittedOnly.length < rawStudents.length) {
          rawStudents = submittedOnly;
        }
      }

      // 3. If resData has explicit totalStudents (e.g. 25 in the official response) and rawStudents is still longer
      const expectedTotal = Number(resData?.totalStudents || ev.totalStudents || 0);
      if (expectedTotal > 0 && rawStudents.length > expectedTotal) {
        rawStudents.sort((a, b) => {
          const aSub = (a.markId ? 2 : 0) + (String(a.remarks || "").toLowerCase().includes("submission") ? 1 : 0);
          const bSub = (b.markId ? 2 : 0) + (String(b.remarks || "").toLowerCase().includes("submission") ? 1 : 0);
          return bSub - aSub;
        });
        rawStudents = rawStudents.slice(0, expectedTotal);
      }

      // 4. Stable sort by Roll No then Name matching Marks Entry roster
      rawStudents.sort((a, b) => {
        const rollA = String(a.rollNo || a.admissionNo || "");
        const rollB = String(b.rollNo || b.admissionNo || "");
        if (rollA && rollB) {
          const cmp = rollA.localeCompare(rollB, undefined, { numeric: true });
          if (cmp !== 0) return cmp;
        }
        return String(a.studentName || a.name || "").localeCompare(String(b.studentName || b.name || ""));
      });

      const matchedExamObj = examinationsList.find((ex) => String(ex.examinationId || ex.id || ex.examId) === String(ev.examId || ev.examinationId));
      const resolvedModalMode = String(resData?.mode || ev.mode || (isObjectiveExam(matchedExamObj) ? "OBJECTIVE" : "")).trim().toUpperCase();
      const modalIsObjective = resolvedModalMode === "OBJECTIVE";

      if (rawStudents.length > 0) {
        const configuredMax = Number(
          (resData?.subjectMaxMarks && Number(resData.subjectMaxMarks) > 0 ? resData.subjectMaxMarks : null) ||
          (resData?.maxMarks && Number(resData.maxMarks) > 0 ? resData.maxMarks : null) ||
          (ev.maxMarks && Number(ev.maxMarks) > 0 ? ev.maxMarks : null) ||
          (currentConfig?.maxTotal && Number(currentConfig.maxTotal) > 0 ? currentConfig.maxTotal : null) ||
          100
        );
        const mappedRows = rawStudents.map((s, idx) => {
          const isAbsent = Boolean(s.isAbsent ?? s.absent);
          const internal = modalIsObjective ? 0 : (s.internal !== undefined && s.internal !== null ? s.internal : (s.internalMarks ?? 0));
          const practical = modalIsObjective ? 0 : (s.practical !== undefined && s.practical !== null ? s.practical : (s.practicalMarks ?? 0));
          const theory = modalIsObjective ? 0 : (s.theory !== undefined && s.theory !== null ? s.theory : (s.theoryMarks ?? 0));
          const totalVal = s.obtainedMarks !== undefined && s.obtainedMarks !== null
            ? s.obtainedMarks
            : (s.total !== undefined && s.total !== null ? s.total : (s.totalMarks !== undefined && s.totalMarks !== null ? s.totalMarks : 0));
          const numTotal = Number(totalVal) || 0;
          const studentMax = Number(s.maxMarks || 0);
          const maxM = studentMax > 0 ? studentMax : configuredMax;
          let pct = "—";
          if (!isAbsent) {
            if (s.percentage !== null && s.percentage !== undefined && s.percentage !== "") {
              const parsedPct = parseFloat(String(s.percentage));
              pct = !isNaN(parsedPct) ? `${Math.min(100, Math.max(0, parsedPct)).toFixed(2)}%` : String(s.percentage);
            } else {
              const calcPct = maxM > 0 ? Math.min(100, Math.max(0, (numTotal / maxM) * 100)) : 0;
              pct = `${calcPct.toFixed(2)}%`;
            }
          }

          return {
            studentId: s.studentId || idx,
            rollNo: s.rollNo || s.admissionNo || "—",
            name: s.studentName || s.name || "Student",
            studentName: s.studentName || s.name || "Student",
            admissionNo: s.admissionNo || "",
            internal: isAbsent ? "—" : internal,
            practical: isAbsent ? "—" : practical,
            theory: isAbsent ? "—" : theory,
            total: isAbsent ? "—" : totalVal,
            totalScore: isAbsent ? "—" : totalVal,
            obtainedMarks: isAbsent ? "—" : totalVal,
            percentage: isAbsent ? "—" : pct,
            absent: isAbsent,
            isAbsent,
            remarks: s.remarks || "",
          };
        });

        const hasPracticalMarks = !modalIsObjective && (
          Number(resData?.practicalMax || ev.practicalMax || 0) > 0 ||
          Boolean(resData?.isPractical || resData?.isPracticalApplicable) ||
          mappedRows.some((r) => !r.absent && Number(r.practical || 0) > 0)
        );
        const hasInternalMarks = !modalIsObjective && (
          Number(resData?.internalMax || ev.internalMax || 0) > 0 ||
          mappedRows.some((r) => !r.absent && Number(r.internal || 0) > 0) ||
          (!hasPracticalMarks && mappedRows.some((r) => !r.absent && Number(r.internal || 0) >= 0))
        );

        setViewResultsEval((prev) => ({
          ...(prev || ev),
          ...(typeof resData === "object" ? resData : {}),
          rows: mappedRows,
          isObjective: modalIsObjective,
          showPractical: hasPracticalMarks,
          showInternal: hasInternalMarks,
          totalStudents: mappedRows.length,
          subjectName: resData?.subjectName || ev.subjectName,
          examName: resData?.examinationName || ev.examName,
          section: resData?.sectionName || ev.section,
          status: resData?.status || resData?.statusCode || ev.status,
        }));
      }
    } catch (e) {
      console.warn("Could not fetch evaluation students for modal:", e);
    } finally {
      setResultsModalLoading(false);
    }
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
      const obtainedIdx = header.findIndex((h) => h.includes("obtained") || h.includes("objective") || h === "marks");
      const theoryIdx = header.findIndex((h) => h.includes("theory") || (!h.includes("obtained") && !h.includes("internal") && !h.includes("practical") && h.includes("marks")));
      const internalIdx = header.findIndex((h) => h.includes("internal"));
      const practicalIdx = header.findIndex((h) => h.includes("practical"));

      if (rollIdx === -1 && obtainedIdx === -1 && theoryIdx === -1 && internalIdx === -1 && practicalIdx === -1) {
        notify("Spreadsheet must contain valid headers ('Roll No' and Marks column).", "error");
        return;
      }

      let importedCount = 0;
      setCurrentStudents((prev) =>
        prev.map((student) => {
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(",").map((c) => c.trim());
            const fileRoll = rollIdx !== -1 ? cols[rollIdx] : "";
            if (fileRoll && String(student.rollNo).toLowerCase() === fileRoll.toLowerCase()) {
              importedCount++;
              const max = currentConfig.maxTotal || 100;
              if (currentConfig.isObjective) {
                const rawSrc = obtainedIdx !== -1 ? cols[obtainedIdx] : (theoryIdx !== -1 ? cols[theoryIdx] : "");
                const num = Number(rawSrc);
                const obtained = isNaN(num) ? 0 : Math.min(Math.max(0, num), max);
                const total = student.absent ? 0 : obtained;
                return {
                  ...student,
                  internal: 0,
                  practical: 0,
                  theory: 0,
                  obtainedMarks: student.absent ? "" : obtained,
                  totalScore: total,
                  percentage: student.absent ? "0.00%" : `${((total / (max || 1)) * 100).toFixed(2)}%`,
                };
              }
              const fileInternal = internalIdx !== -1 && currentConfig.showInternal ? Number(cols[internalIdx]) : Number(student.internal || 0);
              const filePractical = practicalIdx !== -1 && currentConfig.showPractical ? Number(cols[practicalIdx]) : Number(student.practical || 0);
              const fileTheory = theoryIdx !== -1 && currentConfig.showTheory ? Number(cols[theoryIdx]) : Number(student.theory || 0);
              const internal = !currentConfig.showInternal || isNaN(fileInternal) ? 0 : Math.min(Math.max(0, fileInternal), currentConfig.maxInternal || 0);
              const practical = !currentConfig.showPractical || isNaN(filePractical) ? 0 : Math.min(Math.max(0, filePractical), currentConfig.maxPractical || 0);
              const theory = !currentConfig.showTheory || isNaN(fileTheory) ? 0 : Math.min(Math.max(0, fileTheory), currentConfig.maxTheory || 0);
              const total = student.absent ? 0 : (internal + practical + theory);
              return {
                ...student,
                internal: currentConfig.showInternal ? internal : 0,
                practical: currentConfig.showPractical ? practical : 0,
                theory: currentConfig.showTheory ? theory : 0,
                obtainedMarks: total,
                totalScore: total,
                percentage: student.absent ? "0.00%" : `${((total / (max || 1)) * 100).toFixed(2)}%`,
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
                    setSelectedLevel(e.target.value); setSelectedExam(""); setSelectedSubject(""); setCurrentStudents([]); setSubjectInclusionError(null);
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
                    setSelectedGroup(e.target.value); setSelectedExam(""); setSelectedSubject(""); setCurrentStudents([]); setSubjectInclusionError(null);
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
                    setSelectedProgram(e.target.value); setSelectedExam(""); setSelectedSubject(""); setCurrentStudents([]); setSubjectInclusionError(null);
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
                    setSelectedSection(e.target.value); setSelectedExam(""); setSelectedSubject(""); setCurrentStudents([]); setSubjectInclusionError(null);
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
                        ...filteredExaminationsList.map((ex) => ({
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
        setSubjectInclusionError(null);
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

                  {/* Accessible Polite Live Region for Marks Validation */}
                  <div className="cms-sr-only" aria-live="polite" role="status">
                    {liveAnnouncement}
                  </div>

                  {/* Student Table */}
                  <div className="cms-table-wrap" style={{ width: "100%", overflowX: "auto" }}>
                    <table className="cms-table" style={{ width: "100%", tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          <th className="cms-cell-center" style={{ width: 90 }}>ROLL NO</th>
                          <th style={{ width: "27%", minWidth: 140 }}>STUDENT</th>
                          {currentConfig.isObjective ? (
                            <th className="cms-cell-center" style={{ width: 190 }}>
                              OBTAINED MARKS / {currentConfig.maxTotal}
                            </th>
                          ) : (
                            <>
                              {currentConfig.showInternal && (
                                <th className="cms-cell-center" style={{ width: 140 }}>
                                  INTERNAL / {currentConfig.maxInternal}
                                </th>
                              )}
                              {currentConfig.showPractical && (
                                <th className="cms-cell-center" style={{ width: 140 }}>
                                  PRACTICAL / {currentConfig.maxPractical}
                                </th>
                              )}
                              {currentConfig.showTheory && (
                                <th className="cms-cell-center" style={{ width: 140 }}>
                                  THEORY / {currentConfig.maxTheory}
                                </th>
                              )}
                              <th className="cms-cell-center" style={{ width: 120 }}>
                                TOTAL / {currentConfig.maxTotal}
                              </th>
                            </>
                          )}
                          <th className="cms-cell-center" style={{ width: 110 }}>PERCENTAGE</th>
                          <th className="cms-cell-center" style={{ width: "12%", minWidth: 65 }}>ABSENT</th>
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
                                  {(() => {
                                    const errKey = `${s.studentId}_obtainedMarks`;
                                    const errMsg = fieldErrors[errKey];
                                    const errId = `err-${s.studentId}-obtained`;
                                    return (
                                      <div className="cms-mark-input-cell">
                                        <input
                                          ref={(el) => { inputRefs.current[errKey] = el; }}
                                          type="number"
                                          inputMode="numeric"
                                          min="0"
                                          max={currentConfig.maxTotal}
                                          placeholder={`0–${currentConfig.maxTotal}`}
                                          aria-label={`${s.name} Obtained Marks (Max ${currentConfig.maxTotal})`}
                                          aria-invalid={errMsg ? "true" : "false"}
                                          aria-describedby={errMsg ? errId : undefined}
                                          className={`cms-cell-input cms-num-input ${errMsg ? "cms-input-error" : ""}`}
                                          value={s.absent ? "" : (s.obtainedMarks ?? "")}
                                          disabled={s.absent || isLocked}
                                          onChange={(e) => handleStudentMarkChange(s.studentId, "obtainedMarks", e.target.value)}
                                          onBlur={(e) => handleStudentMarkBlur(s.studentId, "obtainedMarks", e.target.value)}
                                        />
                                        {errMsg && (
                                          <div id={errId} className="cms-field-error-text">
                                            {errMsg}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>
                              ) : (
                                <>
                                  {currentConfig.showInternal && (
                                    <td className="cms-cell-center">
                                      {(() => {
                                        const errKey = `${s.studentId}_internal`;
                                        const errMsg = fieldErrors[errKey];
                                        const errId = `err-${s.studentId}-internal`;
                                        return (
                                          <div className="cms-mark-input-cell">
                                            <input
                                              ref={(el) => { inputRefs.current[errKey] = el; }}
                                              type="number"
                                              inputMode="numeric"
                                              min="0"
                                              max={currentConfig.maxInternal}
                                              placeholder={`0–${currentConfig.maxInternal}`}
                                              aria-label={`${s.name} Internal Marks (Max ${currentConfig.maxInternal})`}
                                              aria-invalid={errMsg ? "true" : "false"}
                                              aria-describedby={errMsg ? errId : undefined}
                                              className={`cms-cell-input cms-num-input ${errMsg ? "cms-input-error" : ""}`}
                                              value={s.absent ? "" : (s.internal ?? "")}
                                              disabled={s.absent || isLocked}
                                              onChange={(e) => handleStudentMarkChange(s.studentId, "internal", e.target.value)}
                                              onBlur={(e) => handleStudentMarkBlur(s.studentId, "internal", e.target.value)}
                                            />
                                            {errMsg && (
                                              <div id={errId} className="cms-field-error-text">
                                                {errMsg}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  )}
                                  {currentConfig.showPractical && (
                                    <td className="cms-cell-center">
                                      {(() => {
                                        const errKey = `${s.studentId}_practical`;
                                        const errMsg = fieldErrors[errKey];
                                        const errId = `err-${s.studentId}-practical`;
                                        return (
                                          <div className="cms-mark-input-cell">
                                            <input
                                              ref={(el) => { inputRefs.current[errKey] = el; }}
                                              type="number"
                                              inputMode="numeric"
                                              min="0"
                                              max={currentConfig.maxPractical}
                                              placeholder={`0–${currentConfig.maxPractical}`}
                                              aria-label={`${s.name} Practical Marks (Max ${currentConfig.maxPractical})`}
                                              aria-invalid={errMsg ? "true" : "false"}
                                              aria-describedby={errMsg ? errId : undefined}
                                              className={`cms-cell-input cms-num-input ${errMsg ? "cms-input-error" : ""}`}
                                              value={s.absent ? "" : (s.practical ?? "")}
                                              disabled={s.absent || isLocked}
                                              onChange={(e) => handleStudentMarkChange(s.studentId, "practical", e.target.value)}
                                              onBlur={(e) => handleStudentMarkBlur(s.studentId, "practical", e.target.value)}
                                            />
                                            {errMsg && (
                                              <div id={errId} className="cms-field-error-text">
                                                {errMsg}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  )}
                                  {currentConfig.showTheory && (
                                    <td className="cms-cell-center">
                                      {(() => {
                                        const errKey = `${s.studentId}_theory`;
                                        const errMsg = fieldErrors[errKey];
                                        const errId = `err-${s.studentId}-theory`;
                                        return (
                                          <div className="cms-mark-input-cell">
                                            <input
                                              ref={(el) => { inputRefs.current[errKey] = el; }}
                                              type="number"
                                              inputMode="numeric"
                                              min="0"
                                              max={currentConfig.maxTheory}
                                              placeholder={`0–${currentConfig.maxTheory}`}
                                              aria-label={`${s.name} Theory Marks (Max ${currentConfig.maxTheory})`}
                                              aria-invalid={errMsg ? "true" : "false"}
                                              aria-describedby={errMsg ? errId : undefined}
                                              className={`cms-cell-input cms-num-input ${errMsg ? "cms-input-error" : ""}`}
                                              value={s.absent ? "" : (s.theory ?? "")}
                                              disabled={s.absent || isLocked}
                                              onChange={(e) => handleStudentMarkChange(s.studentId, "theory", e.target.value)}
                                              onBlur={(e) => handleStudentMarkBlur(s.studentId, "theory", e.target.value)}
                                            />
                                            {errMsg && (
                                              <div id={errId} className="cms-field-error-text">
                                                {errMsg}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                  )}
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
        <div className="sp-modal-backdrop cms-overlay" onClick={() => setShowBulkModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(13, 27, 51, 0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", zIndex: 10000 }}>
          <div
            className="sp-modal cms-modal sm"
            style={{
              width: "min(520px, calc(100vw - 32px))",
              maxWidth: "520px",
              background: "var(--cms-surface, #ffffff)",
              color: "var(--cms-text, #10203c)",
              borderRadius: "16px",
              border: "1px solid var(--cms-border, #e4e8f0)",
              boxShadow: "var(--cms-shadow-lg, 0 20px 50px rgba(16, 32, 60, 0.18))",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sp-modal-header cms-modal-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cms-border, #e4e8f0)", padding: "16px 22px", background: "var(--cms-surface, #ffffff)" }}>
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

            <div className="sp-modal-body cms-modal-body" style={{ padding: "16px 22px", background: "var(--cms-surface, #ffffff)", maxHeight: "calc(85vh - 120px)", overflowY: "auto" }}>
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

            <div className="sp-modal-footer cms-modal-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--cms-border, #e4e8f0)", padding: "14px 22px", background: "var(--cms-surface, #ffffff)" }}>
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
        <div className="sp-modal-backdrop cms-overlay" onClick={() => setViewResultsEval(null)} style={{ position: "fixed", inset: 0, background: "rgba(13, 27, 51, 0.55)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", zIndex: 10000 }}>
          <div
            className="sp-modal cms-modal"
            style={{
              width: "min(920px, calc(100vw - 32px))",
              maxWidth: "920px",
              background: "var(--cms-surface, #ffffff)",
              color: "var(--cms-text, #10203c)",
              borderRadius: "16px",
              border: "1px solid var(--cms-border, #e4e8f0)",
              boxShadow: "var(--cms-shadow-lg, 0 20px 50px rgba(16, 32, 60, 0.18))",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sp-modal-header cms-modal-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cms-border, #e4e8f0)", padding: "16px 22px", background: "var(--cms-surface, #ffffff)" }}>
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

            <div className="sp-modal-body cms-modal-body" style={{ padding: "16px 22px", background: "var(--cms-surface, #ffffff)", maxHeight: "calc(85vh - 120px)", overflowY: "auto" }}>
              <div className="cms-table-wrap" style={{ width: "100%", overflowX: "auto" }}>
                <table className="cms-table" style={{ width: "100%", tableLayout: "auto" }}>
                  <thead>
                    <tr>
                      <th className="cms-cell-center" style={{ width: "13%", minWidth: 70 }}>ROLL NO</th>
                      <th style={{ width: "27%", minWidth: 140 }}>STUDENT</th>
                      {viewResultsEval.isObjective ? (
                        <th className="cms-cell-center" style={{ width: "18%", minWidth: 110 }}>OBTAINED MARKS</th>
                      ) : (
                        <>
                          {viewResultsEval.showInternal !== false && (
                            <th className="cms-cell-center" style={{ width: "12%", minWidth: 70 }}>INTERNAL</th>
                          )}
                          {viewResultsEval.showPractical && (
                            <th className="cms-cell-center" style={{ width: "12%", minWidth: 70 }}>PRACTICAL</th>
                          )}
                          <th className="cms-cell-center" style={{ width: "12%", minWidth: 70 }}>THEORY</th>
                          <th className="cms-cell-center" style={{ width: "12%", minWidth: 70 }}>TOTAL</th>
                        </>
                      )}
                      <th className="cms-cell-center" style={{ width: "12%", minWidth: 80 }}>PERCENTAGE</th>
                      <th className="cms-cell-center" style={{ width: "12%", minWidth: 65 }}>ABSENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const colCount = viewResultsEval.isObjective
                        ? 5
                        : 5 + (viewResultsEval.showInternal !== false ? 1 : 0) + (viewResultsEval.showPractical ? 1 : 0) + 1;
                      if (resultsModalLoading) {
                        return (
                          <tr>
                            <td colSpan={colCount} style={{ textAlign: "center", padding: "20px 0", color: "var(--cms-muted)" }}>
                              Loading student scores...
                            </td>
                          </tr>
                        );
                      }
                      const rows = viewResultsEval.rows || [];
                      const start = (resultsModalPage - 1) * resultsPageSize;
                      const pagedRows = rows.slice(start, start + resultsPageSize);
                      if (pagedRows.length === 0) {
                        return (
                          <tr>
                            <td colSpan={colCount} style={{ textAlign: "center", padding: "20px 0", color: "var(--cms-muted)" }}>
                              No student scores recorded for this evaluation.
                            </td>
                          </tr>
                        );
                      }
                      return pagedRows.map((r, idx) => (
                        <tr key={r.studentId || idx}>
                          <td className="cms-cell-center" style={{ fontWeight: 600 }}>{r.rollNo}</td>
                          <td style={{ fontWeight: 600 }}>{r.studentName || r.name}</td>
                          {viewResultsEval.isObjective ? (
                            <td className="cms-cell-center" style={{ fontWeight: 700 }}>
                              {r.absent ? "—" : (r.obtainedMarks ?? r.totalScore ?? r.totalMarks ?? r.total ?? "—")}
                            </td>
                          ) : (
                            <>
                              {viewResultsEval.showInternal !== false && (
                                <td className="cms-cell-center">{r.absent ? "—" : r.internal}</td>
                              )}
                              {viewResultsEval.showPractical && (
                                <td className="cms-cell-center">{r.absent ? "—" : r.practical}</td>
                              )}
                              <td className="cms-cell-center">{r.absent ? "—" : r.theory}</td>
                              <td className="cms-cell-center" style={{ fontWeight: 700 }}>{r.absent ? "—" : (r.totalScore ?? r.totalMarks ?? r.total ?? r.obtainedMarks ?? "—")}</td>
                            </>
                          )}
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

            <div className="sp-modal-footer cms-modal-foot" style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--cms-border, #e4e8f0)", padding: "14px 22px", background: "var(--cms-surface, #ffffff)" }}>
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
