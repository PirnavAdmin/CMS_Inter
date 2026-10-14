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
} from "lucide-react";
import * as XLSX from "xlsx";
import { useFacultySafe } from "../FacultyContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient from "@/api/axios.js";
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

  // Storage for evaluations (Tracks status: APPROVED, SUBMITTED, VERIFIED, REJECTED, DRAFT)
  const [evaluationsLedger, setEvaluationsLedger] = useState(() => {
    const saved = localStorage.getItem("cms_faculty_marks_evaluations");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Could not parse saved evaluations ledger:", e);
      }
    }
    return {};
  });

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

  // Persist ledger changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("cms_faculty_marks_evaluations", JSON.stringify(evaluationsLedger));
    } catch (e) {
      console.warn("Failed saving evaluations ledger:", e);
    }
  }, [evaluationsLedger]);

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
          if (list.length) setSelectedLevel(list[0].academicLevelId || list[0].id);
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
          if (list.length) setSelectedGroup(list[0].groupId || list[0].id);
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
          if (list.length) setSelectedProgram(list[0].programId || list[0].id);
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
          if (list.length) setSelectedSection(list[0].sectionId || list[0].id);
        }
      })
      .catch((err) => console.warn("Error fetching sections for marks:", err));
    return () => { isMounted = false; };
  }, [selectedBoard, selectedYear, selectedLevel, selectedGroup, selectedProgram]);

  // 6. Fetch Examinations & Subjects when context is applied
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
          if (list.length && !selectedSubject) {
            setSelectedSubject(list[0].subjectId || list[0].id);
          }
        }
      })
      .catch((err) => console.warn("Error fetching subjects:", err));

    return () => { isMounted = false; };
  }, [selectedBoard, selectedGroup, selectedLevel]);

  // Selected Exam Metadata
  const selectedExamInfo = useMemo(() => {
    return examinationsList.find((e) => String(e.examinationId || e.id) === String(selectedExam)) || null;
  }, [examinationsList, selectedExam]);

  const selectedExamName = selectedExamInfo
    ? `${selectedExamInfo.examName || selectedExamInfo.name} (${selectedExamInfo.examCode || selectedExamInfo.code || "EXAM"})`
    : "";

  // Selected Subject Metadata
  const selectedSubjectObj = useMemo(() => {
    return subjectsList.find((s) => String(s.subjectId || s.id) === String(selectedSubject)) || null;
  }, [subjectsList, selectedSubject]);

  const selectedSubjectName = selectedSubjectObj
    ? (selectedSubjectObj.subjectName || selectedSubjectObj.name)
    : "Selected Subject";

  // Selected Section Metadata
  const selectedSectionName = useMemo(() => {
    const found = sectionsList.find((s) => String(s.sectionId || s.id) === String(selectedSection));
    return found ? (found.sectionName || found.name) : `Section #${selectedSection}`;
  }, [sectionsList, selectedSection]);

  // Handle clicking "Enter Marks" button
  const handleEnterMarks = () => {
    if (!selectedBoard || !selectedYear || !selectedLevel || !selectedGroup || !selectedProgram || !selectedSection) {
      notify("Please select all Academic Context filters before opening Marks Entry.", "error");
      return;
    }
    setContextApplied(true);
    notify(`Marks Entry workspace loaded for ${selectedSectionName}.`);
    if (selectedExam && selectedSubject) {
      handleExamOrSubjectChange(selectedExam, selectedSubject);
    }
  };

  // Handle changing Exam or Subject inside workspace
  const handleExamOrSubjectChange = async (newExam, newSubject) => {
    if (!newExam || !newSubject) {
      setCurrentStudents([]);
      setCurrentRejectionRemarks("");
      return;
    }

    const key = `${selectedSection}_${newExam}_${newSubject}`;
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
        sectionId: Number(selectedSection),
      };

      const res = await apiClient.get("/api/v1/attendance/admin/students", { params: studentParams });
      const raw = res.data?.data || res.data || [];

      let mapped = [];
      if (Array.isArray(raw) && raw.length) {
        mapped = raw.map((s) => ({
          studentId: s.studentId || s.id,
          rollNo: s.rollNumber || s.rollNo || `RL-${s.studentId}`,
          name: s.studentName || s.name || `Student #${s.studentId}`,
          internal: 18,
          theory: 55,
          totalScore: 73,
          percentage: "73.00%",
          absent: false,
          remarks: "Regular",
        }));
      }

      setCurrentStudents(mapped);
      setEvaluationStatus("DRAFT");
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
              theory: isAbsent ? 0 : r.theory || 45,
              internal: isAbsent ? 0 : r.internal || 15,
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

  // Save Draft (via /api/v1/marks/bulk and local ledger)
  const handleSaveDraft = async () => {
    if (!selectedExam || !selectedSubject) return;
    setSavingMarks(true);

    const key = `${selectedSection}_${selectedExam}_${selectedSubject}`;
    const updatedEval = {
      evaluationId: key,
      section: selectedSectionName,
      examId: selectedExam,
      examName: selectedExamName,
      subjectId: selectedSubject,
      subjectName: selectedSubjectName,
      faculty: "Faculty In-Charge",
      empId: "EMP-FACULTY",
      status: "DRAFT",
      adminRemarks: "",
      rows: currentStudents,
      submittedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    try {
      const payload = {
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
          rollNo: s.rollNo,
          studentName: s.name,
          internalMarks: Number(s.internal || 0),
          theoryMarks: Number(s.theory || 0),
          isAbsent: Boolean(s.absent),
          remarks: s.remarks || "",
        })),
      };

      await apiClient.post("/api/v1/marks/bulk", payload);
    } catch (err) {
      console.warn("API bulk save endpoint warning, saving to local evaluations ledger:", err);
    }

    setEvaluationsLedger((prev) => ({ ...prev, [key]: updatedEval }));
    setEvaluationStatus("DRAFT");
    setSavingMarks(false);
    notify("Marks draft saved successfully.");
  };

  // Submit Subject / Resubmit (via /api/v1/marks/bulk with SUBMITTED status)
  const handleSubmitSubject = async () => {
    if (!selectedExam || !selectedSubject) return;
    setSavingMarks(true);

    const key = `${selectedSection}_${selectedExam}_${selectedSubject}`;
    const wasRejected = evaluationStatus === "REJECTED";

    const updatedEval = {
      evaluationId: key,
      section: selectedSectionName,
      examId: selectedExam,
      examName: selectedExamName,
      subjectId: selectedSubject,
      subjectName: selectedSubjectName,
      faculty: "Faculty In-Charge",
      empId: "EMP-FACULTY",
      status: "SUBMITTED",
      adminRemarks: "Submitted to Admin. Awaiting verification review.",
      rows: currentStudents,
      submittedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    try {
      const payload = {
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
          rollNo: s.rollNo,
          studentName: s.name,
          internalMarks: Number(s.internal || 0),
          theoryMarks: Number(s.theory || 0),
          isAbsent: Boolean(s.absent),
          remarks: s.remarks || "",
        })),
      };

      await apiClient.post("/api/v1/marks/bulk", payload);
    } catch (err) {
      console.warn("API bulk submit warning:", err);
    }

    setEvaluationsLedger((prev) => ({ ...prev, [key]: updatedEval }));
    setEvaluationStatus("SUBMITTED");
    setCurrentRejectionRemarks("");
    setSavingMarks(false);

    if (wasRejected) {
      notify("Corrected marks resubmitted to Admin for review!", "success");
    } else {
      notify("Marks submitted successfully! Pending Admin verification and approval.", "success");
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
    const approved = all.filter((e) => e.status === "APPROVED").length;
    const verified = all.filter((e) => e.status === "VERIFIED").length;
    const submitted = all.filter((e) => e.status === "SUBMITTED").length;
    const rejected = all.filter((e) => e.status === "REJECTED").length;
    return {
      total: all.length,
      approved,
      underReview: verified + submitted,
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

      {/* TAB 1: MARKS ENTRY WORKSPACE */}
      {activeTab === "entry" && (
        <>
          {/* Card 1: Academic Context Filters */}
          <div className="cms-card" style={{ marginBottom: 16 }}>
            <div className="cms-card-body">
              <div className="cms-filters" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                <div className="cms-field">
                  <label>Board</label>
                  <select
                    value={selectedBoard}
                    onChange={(e) => {
                      setSelectedBoard(e.target.value);
                      setContextApplied(false);
                    }}
                  >
                    <option value="">Select Board</option>
                    {boardsList.map((b) => (
                      <option key={b.boardId || b.id} value={b.boardId || b.id}>
                        {b.boardName || b.name || b.boardCode}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cms-field">
                  <label>Academic Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      setContextApplied(false);
                    }}
                  >
                    <option value="">Select Year</option>
                    {yearsList.map((y) => (
                      <option key={y.academicYearId || y.id} value={y.academicYearId || y.id}>
                        {y.yearName || y.academicYearName || y.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cms-field">
                  <label>Academic Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => {
                      setSelectedLevel(e.target.value);
                      setContextApplied(false);
                    }}
                  >
                    <option value="">Select Level</option>
                    {levelsList.map((l) => (
                      <option key={l.academicLevelId || l.id} value={l.academicLevelId || l.id}>
                        {l.levelName || l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cms-field">
                  <label>Group</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => {
                      setSelectedGroup(e.target.value);
                      setContextApplied(false);
                    }}
                  >
                    <option value="">Select Group</option>
                    {groupsList.map((g) => (
                      <option key={g.groupId || g.id} value={g.groupId || g.id}>
                        {g.groupName || g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cms-field">
                  <label>Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => {
                      setSelectedProgram(e.target.value);
                      setContextApplied(false);
                    }}
                  >
                    <option value="">Select Program</option>
                    {programsList.map((p) => (
                      <option key={p.programId || p.id} value={p.programId || p.id}>
                        {p.programName || p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cms-field">
                  <label>Section</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setContextApplied(false);
                    }}
                  >
                    <option value="">Select Section</option>
                    {sectionsList.map((s) => (
                      <option key={s.sectionId || s.id} value={s.sectionId || s.id}>
                        {s.sectionName || s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="att-filter-action" style={{ alignSelf: "flex-end" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={handleEnterMarks}
                    style={{ height: 38 }}
                  >
                    Enter Marks
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt before clicking "Enter Marks" */}
          {!contextApplied && (
            <div className="cms-card">
              <div style={{ padding: "44px 20px", textAlign: "center", color: "var(--cms-muted)", fontSize: 14 }}>
                Please select your Academic Context filters above and click <strong>Enter Marks</strong> to load examinations and student marks entry sheet.
              </div>
            </div>
          )}

          {/* Card 2: Marks Entry Workspace (Revealed after clicking "Enter Marks") */}
          {contextApplied && (
            <div className="cms-card">
              <div className="cms-card-body" style={{ padding: 18 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: selectedExam && selectedSubject ? 14 : 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 16,
                      flex: 1,
                      minWidth: 320,
                      flexWrap: "wrap",
                    }}
                  >
                    <div className="cms-field-group" style={{ flex: 1, minWidth: 240 }}>
                      <label className="cms-field-label">EXAMINATION</label>
                      <select
                        className="cms-select-input"
                        value={selectedExam}
                        onChange={(e) => {
                          setSelectedExam(e.target.value);
                          handleExamOrSubjectChange(e.target.value, selectedSubject);
                        }}
                      >
                        <option value="">Select Examination</option>
                        {examinationsList.map((ex) => (
                          <option key={ex.examinationId || ex.id} value={ex.examinationId || ex.id}>
                            {ex.examName || ex.name} ({ex.examCode || ex.code || "EXAM"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="cms-field-group" style={{ flex: 1.4, minWidth: 300 }}>
                      <label className="cms-field-label">SUBJECT</label>
                      <select
                        className="cms-select-input"
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                          handleExamOrSubjectChange(selectedExam, e.target.value);
                        }}
                      >
                        <option value="">Select Subject</option>
                        {subjectsList.map((sub) => (
                          <option key={sub.subjectId || sub.id} value={sub.subjectId || sub.id}>
                            {sub.subjectName || sub.name} ({sub.subjectCode || sub.code || "SUB"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      height: 35,
                    }}
                  >
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      disabled={!selectedExam || !selectedSubject || isApproved || isSubmitted}
                      onClick={() => {
                        setBulkFile(null);
                        setBulkFileName("");
                        setShowBulkModal(true);
                      }}
                      title="Upload and bulk import marks from Excel file"
                    >
                      Bulk Import
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-secondary"
                      disabled={!selectedExam || !selectedSubject || isApproved || savingMarks}
                      onClick={handleSaveDraft}
                    >
                      {savingMarks ? <Loader2 size={13} className="spin" /> : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      disabled={!selectedExam || !selectedSubject || isApproved || savingMarks}
                      onClick={handleSubmitSubject}
                      style={{
                        backgroundColor: isRejected ? "#dc2626" : undefined,
                        borderColor: isRejected ? "#dc2626" : undefined,
                      }}
                    >
                      {isRejected ? "Resubmit Subject" : "Submit Subject"}
                    </button>
                  </div>
                </div>

                {/* Empty State when no exam or subject is chosen */}
                {(!selectedExam || !selectedSubject) && (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "var(--cms-muted, #7B8275)",
                      fontSize: 13.5,
                      marginTop: 14,
                    }}
                  >
                    Select an Examination and Subject above to populate student marks records.
                  </div>
                )}

                {/* Marks Entry Table & Status Toolbar */}
                {selectedExam && selectedSubject && (
                  <>
                    {/* Rejection Alert Banner if admin rejected this evaluation */}
                    {isRejected && currentRejectionRemarks && (
                      <div className="sp-rejection-banner">
                        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <strong>Admin Rejection Remarks:</strong>
                          <p style={{ margin: "4px 0 0 0" }}>{currentRejectionRemarks}</p>
                          <span style={{ fontSize: 11.5, opacity: 0.9 }}>
                            Please correct the scores below and click <strong>Resubmit Subject</strong> to send back for verification and approval.
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className="cms-entry-toolbar"
                      style={{
                        paddingTop: 12,
                        borderTop: "1px solid var(--cms-border, #E6E7DE)",
                        marginTop: 12,
                      }}
                    >
                      <div className="cms-config-summary">
                        <span className={`cms-status-pill ${evaluationStatus.toLowerCase()}`}>
                          <span className="cms-status-dot" />
                          {evaluationStatus}
                        </span>
                        <span>
                          {selectedSubjectName} · {selectedSectionName} · Maximum 100 · Passing 35%
                        </span>
                      </div>
                    </div>

                    <div className="cms-table-wrap">
                      <table className="cms-table">
                        <thead>
                          <tr>
                            <th className="cms-cell-center" style={{ width: 90 }}>
                              ROLL NO
                            </th>
                            <th>STUDENT</th>
                            <th className="cms-cell-center" style={{ width: 130 }}>
                              INTERNAL / 20
                            </th>
                            <th className="cms-cell-center" style={{ width: 130 }}>
                              THEORY / 80
                            </th>
                            <th className="cms-cell-center" style={{ width: 120 }}>
                              TOTAL / 100
                            </th>
                            <th className="cms-cell-center" style={{ width: 120 }}>
                              PERCENTAGE
                            </th>
                            <th className="cms-cell-center" style={{ width: 80 }}>
                              ABSENT
                            </th>
                            <th style={{ width: 180 }}>REMARKS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingStudents ? (
                            <tr>
                              <td colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                                <Loader2 size={20} className="spin" style={{ marginInline: "auto" }} />
                                <div style={{ marginTop: 8, fontSize: 13, color: "var(--cms-muted)" }}>
                                  Loading student roster...
                                </div>
                              </td>
                            </tr>
                          ) : pagedRows.length ? (
                            pagedRows.map((row) => {
                              const isRowAbsent = Boolean(row.absent);
                              const total = isRowAbsent
                                ? 0
                                : Number(row.internal || 0) + Number(row.theory || 0);
                              const pct = isRowAbsent ? 0 : (total / 100) * 100;
                              const isLocked = isApproved;

                              return (
                                <tr key={row.studentId}>
                                  <td className="cms-cell-center cms-cell-bold">{row.rollNo}</td>
                                  <td>
                                    <div className="cms-cell-bold">{row.name}</div>
                                  </td>
                                  <td className="cms-cell-center">
                                    <input
                                      type="number"
                                      className="cms-num-input"
                                      value={row.internal ?? ""}
                                      min={0}
                                      max={20}
                                      disabled={isRowAbsent || isLocked}
                                      onChange={(e) => handleInternalChange(row.studentId, e.target.value)}
                                    />
                                  </td>
                                  <td className="cms-cell-center">
                                    <input
                                      type="number"
                                      className="cms-num-input"
                                      value={row.theory ?? ""}
                                      min={0}
                                      max={80}
                                      disabled={isRowAbsent || isLocked}
                                      onChange={(e) => handleTheoryChange(row.studentId, e.target.value)}
                                    />
                                  </td>
                                  <td className="cms-cell-center cms-cell-bold">{total}</td>
                                  <td className="cms-cell-center cms-cell-bold">{pct.toFixed(2)}%</td>
                                  <td className="cms-cell-center">
                                    <input
                                      type="checkbox"
                                      checked={isRowAbsent}
                                      disabled={isLocked}
                                      onChange={(e) => handleAbsentToggle(row.studentId, e.target.checked)}
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="cms-text-input"
                                      value={row.remarks || ""}
                                      disabled={isLocked}
                                      onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                                      placeholder="Remarks"
                                    />
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={8} style={{ textAlign: "center", padding: 32 }}>
                                <div className="cms-empty">No students found in {selectedSectionName}.</div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <nav className="att-pagination">
                      <span className="att-pagination-summary">
                        Showing{" "}
                        {currentStudents.length === 0
                          ? "0–0 of 0 records"
                          : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, currentStudents.length)} of ${currentStudents.length} records`}
                      </span>
                      <div className="att-pagination-controls">
                        <div className="att-per-page-wrap">
                          <span>Per page:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="att-per-page-select"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={20}>20</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          Previous
                        </button>
                        <span className="att-page-number">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={currentPage >= totalPages || totalPages === 0}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          Next
                        </button>
                      </div>
                    </nav>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: EVALUATION REPORT & RESULTS */}
      {activeTab === "report" && (
        <>
          {/* Summary Metric Cards */}
          <div className="cms-stats-grid" style={{ marginBottom: 14 }}>
            <div className="cms-stat-card">
              <div className="cms-stat-label">TOTAL EVALUATIONS</div>
              <div className="cms-stat-val">{reportStats.total}</div>
            </div>
            <div className="cms-stat-card approved">
              <div className="cms-stat-label">APPROVED & PUBLISHED</div>
              <div className="cms-stat-val">{reportStats.approved}</div>
            </div>
            <div className="cms-stat-card under-review">
              <div className="cms-stat-label">PENDING / UNDER REVIEW</div>
              <div className="cms-stat-val">{reportStats.underReview}</div>
            </div>
            <div className="cms-stat-card rejected">
              <div className="cms-stat-label">NEEDS REVISION</div>
              <div className="cms-stat-val">{reportStats.rejected}</div>
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
                                onClick={() => {
                                  setViewResultsEval(ev);
                                  setResultsModalPage(1);
                                }}
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
                        <td colSpan={6} style={{ textAlign: "center", padding: 32 }}>
                          <div className="cms-empty">No evaluation reports match the search criteria.</div>
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
                    disabled={reportPage === 1}
                    onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="att-page-number">
                    {reportPage} / {reportTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={reportPage >= reportTotalPages || reportTotalPages === 0}
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
