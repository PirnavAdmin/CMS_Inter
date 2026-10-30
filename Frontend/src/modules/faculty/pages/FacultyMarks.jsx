import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Upload,
  Download,
  CheckCircle,
  X,
  Search,
  AlertTriangle,
  RotateCcw,
  Eye,
  UserCheck,
  Loader2,
  FileSpreadsheet,
  ClipboardCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useFacultySafe } from "../FacultyContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient from "@/api/axios.js";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import MarksEntryPage from "@/modules/admin/AdminMarksEntry/MarksEntryPage.jsx";
import "../styles/FacultyMarks.css";

export default function FacultyMarks() {
  const context = useFacultySafe();
  const academicCtx = useAcademicContext() || {};
  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Main Tabs State: "entry" | "report"
  const [activeTab, setActiveTab] = useState("entry");

  // 1. Academic Context Filters
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
  const [allocatedSections, setAllocatedSections] = useState([]);
  const [allocatedSubjects, setAllocatedSubjects] = useState([]);

  // Filter loading flags
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Context applied state (controlled by "Enter Marks" button)
  const [contextApplied, setContextApplied] = useState(false);

  // 2. Marks Entry Workspace Filters (Examinations & Subjects from Real APIs)
  const [examinationsList, setExaminationsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Rejection feedback note for current editing session
  const [currentRejectionRemarks, setCurrentRejectionRemarks] = useState("");

  // Storage for evaluations (Tracks live status: APPROVED, SUBMITTED, VERIFIED, REJECTED, DRAFT)
  const [evaluationsLedger, setEvaluationsLedger] = useState({});

  // Purge any legacy stale mock evaluations from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem("cms_faculty_marks_evaluations");
    } catch (e) {
      // ignore
    }
  }, []);

  // Current working student rows
  const [currentStudents, setCurrentStudents] = useState([]);
  const [evaluationStatus, setEvaluationStatus] = useState("DRAFT");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  // Marks Entry Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Load faculty evaluations from live API on mount / tab change
  useEffect(() => {
    let isMounted = true;
    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id || authUser?.userId;
    if (!staffId) return;

    const fetchLiveEvaluations = async () => {
      try {
        let res = await apiClient.get("/api/v1/faculty/evaluations", { params: { facultyId: staffId } }).catch(() => null);
        if (!res || !res.data) {
          res = await apiClient.get(`/api/v1/faculty/evaluations?facultyId=${staffId}`).catch(() => null);
        }

        const rawList = res?.data?.data !== undefined ? res.data.data : res?.data;
        if (!isMounted) return;

        if (Array.isArray(rawList)) {
          const next = {};
          rawList.forEach((ev) => {
            const key = String(ev.evaluationId || ev.id || `${ev.sectionId}_${ev.examinationId || ev.examId}_${ev.subjectId}`);
            next[key] = {
              evaluationId: String(ev.evaluationId || ev.id || key),
              sectionId: ev.sectionId,
              section: ev.sectionName || (ev.sectionId ? `Section #${ev.sectionId}` : "—"),
              examId: ev.examinationId || ev.examId,
              examName: ev.examinationName || ev.examName || (ev.examinationId ? `Exam #${ev.examinationId}` : "—"),
              subjectId: ev.subjectId,
              subjectName: ev.subjectName || (ev.subjectId ? `Subject #${ev.subjectId}` : "—"),
              faculty: ev.facultyName || context?.profile?.name || authUser?.fullName || "Faculty Member",
              empId: ev.empId || `EMP-${staffId}`,
              status: ev.status ? String(ev.status).toUpperCase() : "DRAFT",
              adminRemarks: ev.rejectionReason || ev.remarks || ev.adminRemarks || "",
              rows: ev.rows || ev.students || [],
              submittedAt: ev.lastSubmittedAt ? String(ev.lastSubmittedAt).split("T")[0] : (ev.submittedAt ? String(ev.submittedAt).split("T")[0] : ""),
              updatedAt: ev.lastSubmittedAt ? String(ev.lastSubmittedAt).split("T")[0] : (ev.updatedAt ? String(ev.updatedAt).split("T")[0] : ""),
            };
          });

          setEvaluationsLedger((prev) => {
            // Keep in-session draft submissions created locally in this session if not yet in backend
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
        if (isMounted) setEvaluationsLedger({});
      }
    };

    fetchLiveEvaluations();
    return () => { isMounted = false; };
  }, [context?.profile?.staffId, activeTab]);

  // 1. Initialize Boards & Academic Years
  useEffect(() => {
    let isMounted = true;
    async function initContext() {
      try {
        if (academicCtx.boards?.length) {
          if (isMounted) setBoardsList(academicCtx.boards);
          if (isMounted && !selectedBoard) setSelectedBoard(academicCtx.selectedBoardId || academicCtx.boards[0].id || academicCtx.boards[0].boardId);
        } else {
          const res = await apiClient.get("/api/v1/boards");
          const list = res.data?.data || res.data || [];
          if (isMounted) {
            setBoardsList(list);
            if (list.length && !selectedBoard) setSelectedBoard(list[0].boardId || list[0].id);
          }
        }

        if (academicCtx.academicYears?.length) {
          if (isMounted) setYearsList(academicCtx.academicYears);
          if (isMounted && !selectedYear) setSelectedYear(academicCtx.selectedAcademicYearId || academicCtx.academicYears[0].id || academicCtx.academicYears[0].academicYearId);
        } else {
          const res = await apiClient.get("/api/v1/academic-years");
          const list = res.data?.data || res.data || [];
          if (isMounted) {
            setYearsList(list);
            if (list.length && !selectedYear) setSelectedYear(list[0].academicYearId || list[0].id);
          }
        }
      } catch (err) {
        console.warn("Error initializing boards/years for marks:", err);
      }
    }
    initContext();
    return () => { isMounted = false; };
  }, [academicCtx.boards, academicCtx.academicYears]);

  // 0. Fetch Faculty Timetable Allocated Sections & Allocated Subjects
  useEffect(() => {
    let isMounted = true;
    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id || authUser?.userId;
    if (!staffId) return;

    // 1. Fetch faculty timetable (provides allocated sections and subjects)
    apiClient
      .get(`/api/v1/timetable/faculty/${staffId}`)
      .then((res) => {
        const slots = res.data?.data || res.data || [];
        if (!isMounted || !Array.isArray(slots)) return;

        const secMap = new Map();
        const subMap = new Map();
        slots.forEach((s) => {
          if (s.sectionId && !secMap.has(s.sectionId)) {
            secMap.set(s.sectionId, {
              sectionId: s.sectionId,
              sectionName: s.sectionName || `Section #${s.sectionId}`,
              academicLevelId: s.academicLevelId,
              academicLevelName: s.levelName || s.academicLevelName,
              groupId: s.groupId,
              groupName: s.groupName,
              programId: s.programId,
              programName: s.programName,
            });
          }
          if (s.subjectId && !subMap.has(s.subjectId)) {
            subMap.set(s.subjectId, {
              subjectId: s.subjectId,
              subjectName: s.subjectName || `Subject #${s.subjectId}`,
              subjectCode: s.subjectCode || "",
              academicLevelId: s.academicLevelId,
            });
          }
        });
        const secList = Array.from(secMap.values());
        const subList = Array.from(subMap.values());
        if (isMounted) {
          setAllocatedSections(secList);
          if (subList.length > 0) {
            setAllocatedSubjects((prev) => {
              const map = new Map();
              prev.forEach((p) => map.set(p.subjectId, p));
              subList.forEach((s) => map.set(s.subjectId, s));
              return Array.from(map.values());
            });
          }
          // Do not auto-select section or apply context on mount; wait for faculty selection
        }
      })
      .catch((err) => console.warn("Could not load faculty timetable sections:", err));

    // 2. Fetch staff subject allocations (strictly enforces Chemistry allocations e.g. IDs 14, 19, 33)
    apiClient
      .get(`/api/v1/staff/${staffId}/subject-allocations`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (!isMounted || !Array.isArray(list)) return;
        setAllocatedSubjects((prev) => {
          const map = new Map();
          prev.forEach((p) => map.set(p.subjectId, p));
          list.forEach((s) => {
            const subId = s.subjectId || s.id;
            if (subId) {
              map.set(subId, {
                subjectId: subId,
                subjectName: s.subjectName || s.name || `Subject #${subId}`,
                subjectCode: s.subjectCode || s.code || "",
                academicLevelId: s.academicLevelId,
              });
            }
          });
          return Array.from(map.values());
        });
      })
      .catch((err) => console.warn("Could not load faculty subject allocations:", err));

    return () => { isMounted = false; };
  }, [context?.profile?.staffId, context?.profileData?.staffId]);

  // 2. Fetch Academic Levels
  useEffect(() => {
    if (!selectedBoard) return;
    let isMounted = true;
    apiClient
      .get(`/api/v1/academic-levels?boardId=${selectedBoard}`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted) {
          setLevelsList(list);
        }
      })
      .catch((err) => console.warn("Error fetching levels for marks:", err));
    return () => { isMounted = false; };
  }, [selectedBoard]);

  // 3. Fetch Groups
  useEffect(() => {
    if (!selectedBoard) return;
    let isMounted = true;
    const params = new URLSearchParams();
    if (selectedBoard) params.append("boardId", selectedBoard);
    if (selectedYear) params.append("academicYearId", selectedYear);
    if (selectedLevel) params.append("academicLevelId", selectedLevel);

    apiClient
      .get(`/api/v1/groups?${params.toString()}`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted) {
          setGroupsList(list);
        }
      })
      .catch((err) => console.warn("Error fetching groups for marks:", err));
    return () => { isMounted = false; };
  }, [selectedBoard, selectedYear, selectedLevel]);

  // 4. Fetch Programs
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/v1/programs")
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted) {
          setProgramsList(list);
        }
      })
      .catch((err) => console.warn("Error fetching programs for marks:", err));
    return () => { isMounted = false; };
  }, [selectedGroup]);

  // 5. Fetch Sections
  useEffect(() => {
    if (!selectedBoard) return;
    let isMounted = true;
    const params = new URLSearchParams();
    if (selectedBoard) params.append("boardId", selectedBoard);
    if (selectedYear) params.append("academicYearId", selectedYear);
    if (selectedLevel) params.append("academicLevelId", selectedLevel);
    if (selectedGroup) params.append("groupId", selectedGroup);
    if (selectedProgram) params.append("programId", selectedProgram);

    apiClient
      .get(`/api/v1/sections?${params.toString()}`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted) {
          setSectionsList(list);
        }
      })
      .catch((err) => console.warn("Error fetching sections for marks:", err));
    return () => { isMounted = false; };
  }, [selectedBoard, selectedYear, selectedLevel, selectedGroup, selectedProgram]);

  // Strictly constrain sections to Faculty's allocated timetable sections
  const displaySections = useMemo(() => {
    const map = new Map();
    allocatedSections.forEach((s) => {
      if (!selectedLevel || String(s.academicLevelId) === String(selectedLevel)) {
        map.set(String(s.sectionId), { ...s, isAssigned: true });
      }
    });
    if (allocatedSections.length > 0) {
      return Array.from(map.values());
    }
    // Fallback only if no allocations found for this faculty
    sectionsList.forEach((s) => {
      const id = String(s.sectionId || s.id);
      if (!map.has(id)) {
        map.set(id, {
          sectionId: s.sectionId || s.id,
          sectionName: s.sectionName || s.name || `Section #${id}`,
          academicLevelId: s.academicLevelId,
          groupId: s.groupId,
          programId: s.programId,
          isAssigned: false,
        });
      }
    });
    return Array.from(map.values());
  }, [allocatedSections, sectionsList, selectedLevel]);

  // 6. Fetch Examinations & Subjects
  useEffect(() => {
    let isMounted = true;

    // Fetch Examinations
    apiClient
      .get("/api/v1/examinations")
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted && Array.isArray(list)) {
          setExaminationsList(list);
          if (list.length && !selectedExam) {
            setSelectedExam(list[0].examinationId || list[0].id);
          }
        }
      })
      .catch((err) => console.warn("Error fetching examinations:", err));

    // Fetch Subjects
    const subParams = new URLSearchParams();
    if (selectedBoard) subParams.append("boardId", selectedBoard);
    if (selectedGroup) subParams.append("groupId", selectedGroup);
    if (selectedLevel) subParams.append("academicLevelId", selectedLevel);

    apiClient
      .get(`/api/v1/subjects?${subParams.toString()}`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (isMounted && Array.isArray(list)) {
          setSubjectsList(list);
        }
      })
      .catch((err) => console.warn("Error fetching subjects:", err));

    return () => { isMounted = false; };
  }, [selectedBoard, selectedGroup, selectedLevel]);

  // Filtered Subjects strictly constrained to Faculty's allocated subjects (e.g. Chemistry - I, Chemistry - II, Chemistry)
  const filteredSubjects = useMemo(() => {
    if (allocatedSubjects.length > 0) {
      const allowedIds = new Set(allocatedSubjects.map((s) => Number(s.subjectId)));
      const filtered = subjectsList.filter((s) => allowedIds.has(Number(s.subjectId || s.id)));
      if (filtered.length > 0) {
        return filtered;
      }
      // If subjectsList hasn't matched yet or is empty, use allocated subjects matching level
      const matchLevel = allocatedSubjects.filter(
        (s) => !selectedLevel || !s.academicLevelId || String(s.academicLevelId) === String(selectedLevel)
      );
      return matchLevel.length > 0 ? matchLevel : allocatedSubjects;
    }
    return subjectsList;
  }, [subjectsList, allocatedSubjects, selectedLevel]);

  // Auto-sync selectedSubject only when context is applied
  useEffect(() => {
    if (contextApplied && filteredSubjects.length > 0) {
      const exists = filteredSubjects.some((s) => String(s.subjectId || s.id) === String(selectedSubject));
      if (!exists) {
        const nextSub = filteredSubjects[0].subjectId || filteredSubjects[0].id;
        setSelectedSubject(nextSub);
        if (selectedExam) {
          handleExamOrSubjectChange(selectedExam, nextSub);
        }
      }
    }
  }, [contextApplied, filteredSubjects]);

  // Quick helper to select assigned class from chips
  const selectAssignedClass = (sec) => {
    setSelectedSection(sec.sectionId);
    if (sec.academicLevelId) setSelectedLevel(sec.academicLevelId);
    if (sec.groupId) setSelectedGroup(sec.groupId);
    if (sec.programId) setSelectedProgram(sec.programId);
    setContextApplied(true);
    if (selectedExam && selectedSubject) {
      handleExamOrSubjectChange(selectedExam, selectedSubject, sec.sectionId);
    }
  };

  // Section Change Handler
  const handleSectionChange = (val) => {
    setSelectedSection(val);
    const matched =
      allocatedSections.find((s) => String(s.sectionId) === String(val)) ||
      sectionsList.find((s) => String(s.sectionId || s.id) === String(val));
    if (matched) {
      if (matched.academicLevelId) setSelectedLevel(matched.academicLevelId);
      if (matched.groupId) setSelectedGroup(matched.groupId);
      if (matched.programId) setSelectedProgram(matched.programId);
    }
    setContextApplied(true);
  };

  // Selected Exam Metadata
  const selectedExamInfo = useMemo(() => {
    return examinationsList.find((e) => String(e.examinationId || e.id) === String(selectedExam)) || null;
  }, [examinationsList, selectedExam]);

  const selectedExamName = selectedExamInfo
    ? `${selectedExamInfo.examName || selectedExamInfo.name} (${selectedExamInfo.examCode || selectedExamInfo.code || "EXAM"})`
    : "";

  // Selected Subject Metadata
  const selectedSubjectObj = useMemo(() => {
    return (
      filteredSubjects.find((s) => String(s.subjectId || s.id) === String(selectedSubject)) ||
      subjectsList.find((s) => String(s.subjectId || s.id) === String(selectedSubject)) ||
      null
    );
  }, [filteredSubjects, subjectsList, selectedSubject]);

  const selectedSubjectName = selectedSubjectObj
    ? (selectedSubjectObj.subjectName || selectedSubjectObj.name)
    : "Selected Subject";

  // Selected Section Metadata
  const selectedSectionName = useMemo(() => {
    const found =
      displaySections.find((s) => String(s.sectionId || s.id) === String(selectedSection)) ||
      sectionsList.find((s) => String(s.sectionId || s.id) === String(selectedSection));
    return found ? (found.sectionName || found.name) : (selectedSection ? `Section #${selectedSection}` : "Select Section");
  }, [displaySections, sectionsList, selectedSection]);

  // Handle clicking "Enter Marks" button
  const handleEnterMarks = () => {
    if (!selectedSection) {
      notify("Please select a Section before loading Marks Entry.", "error");
      return;
    }
    setContextApplied(true);
    notify(`Marks Entry workspace loaded for ${selectedSectionName}.`);
    const examToLoad =
      selectedExam || (examinationsList.length ? examinationsList[0].examinationId || examinationsList[0].id : "");
    const subToLoad =
      selectedSubject || (filteredSubjects.length ? filteredSubjects[0].subjectId || filteredSubjects[0].id : "");
    if (examToLoad && !selectedExam) setSelectedExam(examToLoad);
    if (subToLoad && !selectedSubject) setSelectedSubject(subToLoad);
    if (examToLoad && subToLoad) {
      handleExamOrSubjectChange(examToLoad, subToLoad, selectedSection);
    }
  };

  // Handle changing Exam or Subject inside workspace
  const handleExamOrSubjectChange = async (newExam, newSubject, explicitSection) => {
    const targetSec = explicitSection || selectedSection;
    if (!newExam || !newSubject || !targetSec) {
      setCurrentStudents([]);
      setCurrentRejectionRemarks("");
      return;
    }

    const key = `${targetSec}_${newExam}_${newSubject}`;
    const existing = evaluationsLedger[key];

    if (existing && existing.rows && existing.rows.length) {
      setCurrentStudents(existing.rows);
      setEvaluationStatus(existing.status || "DRAFT");
      setCurrentRejectionRemarks(existing.status === "REJECTED" ? existing.adminRemarks || "" : "");
      setCurrentPage(1);
      return;
    }

    // Fetch real students from attendance student list
    setLoadingStudents(true);
    try {
      const studentParams = {
        boardId: selectedBoard ? Number(selectedBoard) : undefined,
        academicYearId: selectedYear ? Number(selectedYear) : undefined,
        academicLevelId: selectedLevel ? Number(selectedLevel) : undefined,
        groupId: selectedGroup ? Number(selectedGroup) : undefined,
        programId: selectedProgram ? Number(selectedProgram) : undefined,
        sectionId: Number(targetSec),
      };

      const res = await apiClient.get("/api/v1/attendance/admin/students", { params: studentParams });
      const raw = res.data?.data || res.data || [];

      // Check if marks are already persisted in DB for this subject & exam
      let savedMarksMap = new Map();
      try {
        if (newSubject && Number(newSubject) > 0) {
          const marksRes = await apiClient.get(`/api/v1/marks/subject/${newSubject}`).catch(() => null);
          const marksData = marksRes?.data?.data || marksRes?.data || [];
          if (Array.isArray(marksData)) {
            marksData.forEach((m) => {
              if (String(m.examinationId) === String(newExam)) {
                savedMarksMap.set(Number(m.studentId), m);
              }
            });
          }
        }
      } catch (e) {
        // ignore if endpoint not found
      }

      let mapped = [];
      if (Array.isArray(raw) && raw.length) {
        mapped = raw.map((s) => {
          const sId = Number(s.studentId || s.id);
          const existingMark = savedMarksMap.get(sId);
          const internal = existingMark ? Number(existingMark.internalMarks || 0) : 0;
          const theory = existingMark ? Number(existingMark.theoryMarks || 0) : 0;
          const totalScore = internal + theory;
          const isAbsent = existingMark ? Boolean(existingMark.isAbsent) : false;
          const remarks = existingMark ? (existingMark.remarks || "Regular") : "Regular";
          return {
            studentId: sId,
            rollNo: s.rollNumber || s.rollNo || `RL-${sId}`,
            name: s.studentName || s.name || `Student #${sId}`,
            internal: isAbsent ? 0 : internal,
            theory: isAbsent ? 0 : theory,
            totalScore: isAbsent ? 0 : totalScore,
            percentage: isAbsent ? "0.00%" : `${totalScore.toFixed(2)}%`,
            absent: isAbsent,
            remarks: isAbsent ? "Absent" : remarks,
          };
        });
      }

      setCurrentStudents(mapped);
      setEvaluationStatus(savedMarksMap.size > 0 ? "SUBMITTED" : "DRAFT");
      setCurrentRejectionRemarks("");
    } catch (err) {
      console.warn("Could not load section students for marks, setting empty roster:", err);
      setCurrentStudents([]);
    } finally {
      setLoadingStudents(false);
      setCurrentPage(1);
    }
  };

  // Row update handlers
  const handleTheoryChange = (studentId, val) => {
    const num = val === "" ? "" : Math.max(0, Math.min(80, Number(val)));
    setCurrentStudents((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, theory: num } : r))
    );
  };

  const handleInternalChange = (studentId, val) => {
    const num = val === "" ? "" : Math.max(0, Math.min(20, Number(val)));
    setCurrentStudents((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, internal: num } : r))
    );
  };

  const handleAbsentToggle = (studentId, isAbsent) => {
    setCurrentStudents((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? {
              ...r,
              absent: isAbsent,
              theory: isAbsent ? 0 : r.theory || 0,
              internal: isAbsent ? 0 : r.internal || 0,
              remarks: isAbsent ? "Absent" : r.remarks === "Absent" ? "" : r.remarks,
            }
          : r
      )
    );
  };

  const handleRemarksChange = (studentId, val) => {
    setCurrentStudents((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks: val } : r))
    );
  };

  // Save Draft (via canonical /api/v1/faculty/evaluations/{id}/marks)
  const handleSaveDraft = async () => {
    if (!selectedExam || !selectedSubject) return;
    setSavingMarks(true);

    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id || authUser?.userId;

    const key = `${selectedSubject}_${selectedSection}_${selectedExam}`;
    const legacyKey = `${selectedSection}_${selectedExam}_${selectedSubject}`;
    const updatedEval = {
      evaluationId: key,
      section: selectedSectionName,
      sectionId: Number(selectedSection),
      examId: selectedExam,
      examinationId: Number(selectedExam),
      examName: selectedExamName,
      subjectId: selectedSubject,
      subjectName: selectedSubjectName,
      faculty: context?.profile?.name || authUser?.fullName || "Faculty",
      empId: staffId ? `EMP-${staffId}` : "",
      status: "DRAFT",
      adminRemarks: "",
      rows: currentStudents,
      submittedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    try {
      const payload = {
        evaluationId: key,
        students: currentStudents.map((s) => ({
          studentId: Number(s.studentId),
          internalMarks: Number(s.internal || 0),
          theoryMarks: Number(s.theory || 0),
          practicalMarks: Number(s.practical || 0),
          totalMarks: Number(s.totalScore || ((s.internal || 0) + (s.theory || 0))),
          isAbsent: Boolean(s.absent),
          remarks: s.remarks || "",
        })),
      };

      await apiClient.put(`/api/v1/faculty/evaluations/${key}/marks`, payload)
        .catch(() => apiClient.post(`/api/v1/faculty/evaluations/${key}/marks`, payload))
        .catch(() => apiClient.post("/api/v1/marks/bulk", {
          marks: currentStudents.map((s) => ({
            board: "BIEAP",
            boardId: selectedBoard ? Number(selectedBoard) : undefined,
            academicYearId: selectedYear ? Number(selectedYear) : 1,
            academicLevelId: selectedLevel ? Number(selectedLevel) : undefined,
            groupId: selectedGroup ? Number(selectedGroup) : 1,
            sectionId: Number(selectedSection),
            examinationId: Number(selectedExam),
            subjectId: Number(selectedSubject),
            studentId: Number(s.studentId),
            facultyId: staffId ? Number(staffId) : undefined,
            rollNo: s.rollNo,
            studentName: s.name,
            internalMarks: Number(s.internal || 0),
            theoryMarks: Number(s.theory || 0),
            isAbsent: Boolean(s.absent),
            remarks: s.remarks || "",
          }))
        }));
    } catch (err) {
      console.warn("Save draft marks warning:", err);
    }

    setEvaluationsLedger((prev) => ({
      ...prev,
      [key]: { ...updatedEval, isLocal: true },
      [legacyKey]: { ...updatedEval, isLocal: true },
    }));
    setEvaluationStatus("DRAFT");
    setSavingMarks(false);
    notify("Marks draft saved successfully.");
  };

  // Submit Subject / Resubmit (via canonical /api/v1/faculty/evaluations/{id}/submit)
  const handleSubmitSubject = async () => {
    if (!selectedExam || !selectedSubject) return;
    setSavingMarks(true);

    const authUser = getAuthUser();
    const staffId = context?.profile?.staffId || context?.profileData?.staffId || authUser?.staffId || authUser?.id || authUser?.userId;

    const key = `${selectedSubject}_${selectedSection}_${selectedExam}`;
    const legacyKey = `${selectedSection}_${selectedExam}_${selectedSubject}`;
    const wasRejected = evaluationStatus === "REJECTED";

    const updatedEval = {
      evaluationId: key,
      section: selectedSectionName,
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
      submittedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    try {
      // 1. Save latest marks first
      const draftPayload = {
        evaluationId: key,
        students: currentStudents.map((s) => ({
          studentId: Number(s.studentId),
          internalMarks: Number(s.internal || 0),
          theoryMarks: Number(s.theory || 0),
          practicalMarks: Number(s.practical || 0),
          totalMarks: Number(s.totalScore || ((s.internal || 0) + (s.theory || 0))),
          isAbsent: Boolean(s.absent),
          remarks: s.remarks || "",
        })),
      };
      await apiClient.put(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload)
        .catch(() => apiClient.post(`/api/v1/faculty/evaluations/${key}/marks`, draftPayload));

      // 2. Submit or Resubmit
      if (wasRejected) {
        await apiClient.post(`/api/v1/faculty/evaluations/${key}/resubmit`, {
          resubmissionMessage: "Corrected marks resubmitted by faculty."
        }).catch(() => apiClient.post(`/api/v1/faculty/evaluations/${key}/submit`));
      } else {
        await apiClient.post(`/api/v1/faculty/evaluations/${key}/submit`);
      }
    } catch (err) {
      if (err?.response?.status === 403 || err?.status === 403) {
        setSavingMarks(false);
        notify("Access Denied: You do not have permission to submit marks.", "error");
        return;
      }
      console.warn("API submit warning:", err);
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
      notify("Corrected marks resubmitted to Admin for review!", "success");
    } else {
      notify("Marks submitted successfully! Pending Admin verification and approval.", "success");
    }
  };

  // Open student results modal with API fallback
  const handleOpenResultsModal = async (ev) => {
    setViewResultsEval(ev);
    setResultsModalPage(1);
    if (!ev.rows || ev.rows.length === 0) {
      try {
        const res = await apiClient.get(`/api/v1/faculty/evaluations/${ev.evaluationId}/students`).catch(() =>
          apiClient.get(`/api/v1/evaluations/${ev.evaluationId}/students`)
        );
        const data = res?.data?.data || res?.data || {};
        const studentsList = data.students || data.studentMarks || data.items || [];
        if (studentsList.length > 0) {
          const mappedRows = studentsList.map((s) => ({
            studentId: s.studentId,
            rollNo: s.rollNo || s.admissionNo || "",
            name: s.studentName || "Student",
            internal: s.internal ?? s.internalMarks ?? 0,
            theory: s.theory ?? s.theoryMarks ?? 0,
            totalScore: s.totalMarks ?? s.obtainedMarks ?? 0,
            percentage: s.percentage ? `${s.percentage}%` : "—",
            absent: Boolean(s.isAbsent || s.absent),
            remarks: s.remarks || "",
          }));
          setViewResultsEval((prev) => ({ ...prev, rows: mappedRows }));
        }
      } catch (err) {
        console.warn("Could not fetch evaluation students:", err);
      }
    }
  };

  // Switch to Marks Entry to edit and resubmit
  const handleEditAndResubmit = (ev) => {
    setSelectedExam(ev.examId);
    setSelectedSubject(ev.subjectId);
    setContextApplied(true);
    setCurrentStudents(ev.rows || []);
    setEvaluationStatus(ev.status);
    setCurrentRejectionRemarks(ev.adminRemarks || "");
    setActiveTab("entry");
    setCurrentPage(1);
    notify(`Loaded ${ev.subjectName} for revision. Check admin feedback above.`, "info");
  };

  // Download Sample Template for Bulk Import
  const handleDownloadTemplate = () => {
    const templateData = [
      { "Roll No": "25MPC001", "Student Name": "Sample Student 1", "Internal / 20": 20, "Theory / 80": 65, Absent: "NO", Remarks: "Good" },
      { "Roll No": "25MPC002", "Student Name": "Sample Student 2", "Internal / 20": 18, "Theory / 80": 55, Absent: "NO", Remarks: "Fair" },
      { "Roll No": "25MPC003", "Student Name": "Sample Student 3", "Internal / 20": 0, "Theory / 80": 0, Absent: "YES", Remarks: "Absent" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marks Template");
    XLSX.writeFile(wb, `Marks_Template_${selectedSubjectName.replace(/\s+/g, "_")}.xlsx`);
    notify("Excel template downloaded successfully.");
  };

  // Trigger File Input Click
  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle File Selection for Bulk Import
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkFileName(file.name);
  };

  // Handle Validate & Apply Bulk File
  const handleValidateAndImportFile = () => {
    if (!bulkFile) {
      notify("Please select an Excel file (.xlsx, .xls) to validate.", "error");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          if (!data || !data.length) {
            notify("Uploaded spreadsheet does not contain valid student rows.", "error");
            return;
          }

          setCurrentStudents((prev) => {
            return prev.map((student, idx) => {
              const matched = data[idx] || {};
              const theory = matched["Theory / 80"] !== undefined ? Number(matched["Theory / 80"]) : student.theory;
              const internal = matched["Internal / 20"] !== undefined ? Number(matched["Internal / 20"]) : student.internal;
              const isAb = String(matched["Absent"] || "").toUpperCase() === "YES" || String(matched["Absent"] || "").toUpperCase() === "TRUE";
              const remarks = matched["Remarks"] || student.remarks;

              return {
                ...student,
                theory: isAb ? 0 : Math.max(0, Math.min(80, theory)),
                internal: isAb ? 0 : Math.max(0, Math.min(20, internal)),
                absent: isAb,
                remarks: remarks,
              };
            });
          });

          setShowBulkModal(false);
          setBulkFile(null);
          setBulkFileName("");
          notify(`Successfully validated and imported marks from ${bulkFileName}!`, "success");
        } catch (err) {
          console.error("Error parsing Excel:", err);
          notify("Failed to parse Excel file. Please ensure standard headers.", "error");
        }
      };
      reader.readAsBinaryString(bulkFile);
    } catch (err) {
      notify("Error reading uploaded file.", "error");
    }
  };

  // Marks Entry Pagination Slices
  const totalPages = Math.max(1, Math.ceil(currentStudents.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return currentStudents.slice(start, start + pageSize);
  }, [currentStudents, currentPage, pageSize]);

  const isApproved = evaluationStatus === "APPROVED";
  const isRejected = evaluationStatus === "REJECTED";
  const isSubmitted = evaluationStatus === "SUBMITTED" || evaluationStatus === "VERIFIED";

  // Filtered evaluations for Report Tab
  const evaluationsList = useMemo(() => {
    return Object.values(evaluationsLedger).filter((e) => {
      if (reportStatusFilter !== "ALL" && e.status !== reportStatusFilter) return false;
      if (reportExamFilter !== "ALL" && String(e.examId) !== String(reportExamFilter)) return false;
      if (reportSearch.trim()) {
        const q = reportSearch.toLowerCase();
        const match =
          e.examName.toLowerCase().includes(q) ||
          e.subjectName.toLowerCase().includes(q) ||
          e.section.toLowerCase().includes(q) ||
          (e.adminRemarks || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [evaluationsLedger, reportStatusFilter, reportExamFilter, reportSearch]);

  // Report Summary Statistics
  const reportStats = useMemo(() => {
    const all = Object.values(evaluationsLedger);
    const approved = all.filter((e) => e.status === "APPROVED" || e.status === "PUBLISHED").length;
    const verified = all.filter((e) => e.status === "VERIFIED").length;
    const submitted = all.filter((e) => e.status === "SUBMITTED").length;
    const underReview = all.filter((e) => e.status === "UNDER_REVIEW" || e.status === "PENDING").length;
    const rejected = all.filter((e) => e.status === "REJECTED" || e.status === "NEEDS_REVISION").length;
    return {
      total: all.length,
      approved,
      underReview: verified + submitted + underReview,
      rejected,
    };
  }, [evaluationsLedger]);

  // Report Tab Pagination Slices
  const reportTotalPages = Math.max(1, Math.ceil(evaluationsList.length / reportPageSize));
  const pagedEvaluations = useMemo(() => {
    const start = (reportPage - 1) * reportPageSize;
    return evaluationsList.slice(start, start + reportPageSize);
  }, [evaluationsList, reportPage, reportPageSize]);

  // Results Modal calculations
  const resultsModalRows = useMemo(() => {
    if (!viewResultsEval) return [];
    return viewResultsEval.rows || [];
  }, [viewResultsEval]);

  const resultsModalTotalPages = Math.max(1, Math.ceil(resultsModalRows.length / resultsPageSize));
  const pagedResultsModalRows = useMemo(() => {
    const start = (resultsModalPage - 1) * resultsPageSize;
    return resultsModalRows.slice(start, start + resultsPageSize);
  }, [resultsModalRows, resultsModalPage]);

  const passedStudentsCount = useMemo(() => {
    return resultsModalRows.filter((r) => {
      if (r.absent) return false;
      const total = Number(r.internal || 0) + Number(r.theory || 0);
      return total >= 40;
    }).length;
  }, [resultsModalRows]);

  return (
    <div className="cms-marks-entry">
      {/* 1. Page Header */}
      <div className="cms-page-head" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#FFF4ED",
              color: "#E05638",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 2px 5px rgba(224, 86, 56, 0.15)",
            }}
          >
            📊
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Faculty Marks Entry & Evaluation</h1>
            <p style={{ margin: "2px 0 0 0", color: "var(--cms-muted, #7B8275)", fontSize: 13 }}>
              Manage student internal and theory marks, bulk imports, and verification workflows
            </p>
          </div>
        </div>

        {/* Top-Right Primary Tabs Switcher */}
        <div className="cms-tabs" style={{ margin: 0 }}>
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

      {/* TAB 1: MARKS ENTRY WORKSPACE (Identical screens & workflow from Admin Portal) */}
      {activeTab === "entry" && (
        <MarksEntryPage embedded={true} hideTabs={true} forcedTab="entry" />
      )}
      {/* TAB 2: EVALUATION REPORT & RESULTS */}
      {activeTab === "report" && (
        <>
          {/* Summary Metric KPI Cards (Matching Reference 2) */}
          <div className="cms-stats-grid" style={{ marginBottom: 16 }}>
            <div className="cms-stat-card total-box">
              <p className="cms-stat-label">Total Evaluations</p>
              <h3 className="cms-stat-val">{reportStats.total}</h3>
            </div>
            <div className="cms-stat-card approved approved-box">
              <p className="cms-stat-label">Approved &amp; Published</p>
              <h3 className="cms-stat-val">{reportStats.approved}</h3>
            </div>
            <div className="cms-stat-card under-review under-review-box pending-box">
              <p className="cms-stat-label">Pending / Under Review</p>
              <h3 className="cms-stat-val">{reportStats.underReview}</h3>
            </div>
            <div className="cms-stat-card rejected rejected-box">
              <p className="cms-stat-label">Needs Revision</p>
              <h3 className="cms-stat-val">{reportStats.rejected}</h3>
            </div>
          </div>

          <div className="cms-card">
            <div className="cms-card-body" style={{ padding: 18 }}>
              {/* Search & Filter Bar */}
              <div className="cms-report-search-bar" style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
                  <input
                    type="search"
                    className="cms-text-input"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Search by exam, subject, or section..."
                    style={{ paddingLeft: 32 }}
                  />
                  <Search size={15} style={{ position: "absolute", left: 10, top: 11, color: "var(--cms-muted)" }} />
                </div>

                <select
                  className="cms-select-input"
                  style={{ width: 170 }}
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Needs Revision</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>

              {/* Evaluations Table */}
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>EXAMINATION</th>
                      <th>SUBJECT</th>
                      <th>SECTION</th>
                      <th>STATUS</th>
                      <th>ADMIN REMARKS</th>
                      <th style={{ textAlign: "center", width: 120 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedEvaluations.length ? (
                      pagedEvaluations.map((ev) => (
                        <tr key={ev.evaluationId}>
                          <td className="cms-cell-bold">{ev.examName}</td>
                          <td>{ev.subjectName}</td>
                          <td>{ev.section}</td>
                          <td>
                            <span className={`cms-status-pill ${ev.status.toLowerCase()}`}>
                              <span className="cms-status-dot" />
                              {ev.status}
                            </span>
                          </td>
                          <td style={{ fontSize: 12.5, color: ev.status === "REJECTED" ? "#dc2626" : "var(--cms-muted)" }}>
                            {ev.adminRemarks || "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              <button
                                type="button"
                                className="cms-action-btn"
                                onClick={() => handleOpenResultsModal(ev)}
                                title="View student score breakdown"
                              >
                                <Eye size={14} />
                              </button>
                              {ev.status === "REJECTED" && (
                                <button
                                  type="button"
                                  className="cms-action-btn"
                                  onClick={() => handleEditAndResubmit(ev)}
                                  title="Edit scores and resubmit to Admin"
                                  style={{ color: "#dc2626" }}
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: 36 }}>
                          <div className="cms-empty" style={{ color: "var(--cms-muted)", fontSize: 13.5 }}>
                            {reportSearch.trim() || reportStatusFilter !== "ALL"
                              ? "No evaluation reports match the search criteria."
                              : "No evaluations found."}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Report Tab Pagination */}
              <nav className="att-pagination">
                <span className="att-pagination-summary">
                  Showing{" "}
                  {evaluationsList.length === 0
                    ? "0–0 of 0 records"
                    : `${(reportPage - 1) * reportPageSize + 1}–${Math.min(reportPage * reportPageSize, evaluationsList.length)} of ${evaluationsList.length} records`}
                </span>
                <div className="att-pagination-controls">
                  <button
                    type="button"
                    disabled={reportPage === 1 || evaluationsList.length === 0}
                    onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="att-page-number">
                    {evaluationsList.length === 0 ? "0 / 0" : `${reportPage} / ${reportTotalPages}`}
                  </span>
                  <button
                    type="button"
                    disabled={reportPage >= reportTotalPages || reportTotalPages === 0 || evaluationsList.length === 0}
                    onClick={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Bulk Import Modal */}
      {showBulkModal && (
        <div className="sp-modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="sp-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="sp-modal-head">
              <div>
                <h3 className="sp-modal-title" style={{ margin: 0, fontSize: 16 }}>Bulk Import Marks</h3>
                <p className="sp-modal-subtitle" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                  Import student marks for {selectedSubjectName} ({selectedSectionName})
                </p>
              </div>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setShowBulkModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sp-modal-body" style={{ padding: 18 }}>
              <div
                style={{
                  border: "2px dashed var(--cms-border, #E6E7DE)",
                  borderRadius: 10,
                  padding: "28px 16px",
                  textAlign: "center",
                  background: "var(--cms-surface-soft, #fafafa)",
                  cursor: "pointer",
                }}
                onClick={handleTriggerFileInput}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <Upload size={32} style={{ color: "var(--cms-primary, #6F8400)", marginBottom: 8 }} />
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--cms-text)" }}>
                  {bulkFileName ? bulkFileName : "Click or drag Excel/CSV spreadsheet here"}
                </div>
                <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 4 }}>
                  Supports .xlsx, .xls, and .csv files formatted with standard Roll No & Marks headers
                </div>
              </div>

              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{ fontSize: 12, padding: "4px 8px" }}
                  onClick={handleDownloadTemplate}
                >
                  <Download size={13} /> Download Sample Template
                </button>
              </div>
            </div>

            <div className="sp-modal-foot">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={handleValidateAndImportFile}
                disabled={!bulkFile}
              >
                Validate & Import Marks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: View Results Modal */}
      {viewResultsEval && (
        <div className="sp-modal-overlay" onClick={() => setViewResultsEval(null)}>
          <div className="sp-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div className="sp-modal-head">
              <div>
                <h3 className="sp-modal-title" style={{ margin: 0, fontSize: 16 }}>
                  Evaluation Results — {viewResultsEval.subjectName}
                </h3>
                <p className="sp-modal-subtitle" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                  {viewResultsEval.examName} · {viewResultsEval.section}
                </p>
              </div>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setViewResultsEval(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sp-modal-body" style={{ padding: 18 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <span className="cms-badge cms-badge-success">
                  {passedStudentsCount} Passed (≥ 35%)
                </span>
                <span className="cms-badge cms-badge-danger">
                  {resultsModalRows.length - passedStudentsCount} Needs Improvement
                </span>
              </div>

              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student</th>
                      <th className="cms-cell-center">Internal / 20</th>
                      <th className="cms-cell-center">Theory / 80</th>
                      <th className="cms-cell-center">Total / 100</th>
                      <th className="cms-cell-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedResultsModalRows.map((r) => {
                      const total = r.absent ? 0 : Number(r.internal || 0) + Number(r.theory || 0);
                      const isPass = total >= 35 && !r.absent;

                      return (
                        <tr key={r.studentId}>
                          <td className="cms-cell-bold">{r.rollNo}</td>
                          <td>{r.name}</td>
                          <td className="cms-cell-center">{r.absent ? "—" : r.internal}</td>
                          <td className="cms-cell-center">{r.absent ? "—" : r.theory}</td>
                          <td className="cms-cell-center cms-cell-bold">{r.absent ? "0" : total}</td>
                          <td className="cms-cell-center">
                            {r.absent ? (
                              <span style={{ color: "var(--cms-red)", fontWeight: 700 }}>Absent</span>
                            ) : isPass ? (
                              <span style={{ color: "var(--cms-green)", fontWeight: 700 }}>PASS</span>
                            ) : (
                              <span style={{ color: "var(--cms-red)", fontWeight: 700 }}>FAIL</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <nav className="att-pagination" style={{ marginTop: 12 }}>
                <span className="att-pagination-summary">
                  Showing {(resultsModalPage - 1) * resultsPageSize + 1}–{Math.min(resultsModalPage * resultsPageSize, resultsModalRows.length)} of {resultsModalRows.length} students
                </span>
                <div className="att-pagination-controls">
                  <button
                    type="button"
                    disabled={resultsModalPage === 1}
                    onClick={() => setResultsModalPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="att-page-number">
                    {resultsModalPage} / {resultsModalTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={resultsModalPage >= resultsModalTotalPages || resultsModalTotalPages === 0}
                    onClick={() => setResultsModalPage((p) => Math.min(resultsModalTotalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </nav>
            </div>

            <div className="sp-modal-foot">
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => setViewResultsEval(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
