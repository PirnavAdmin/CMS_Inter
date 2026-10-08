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
} from "lucide-react";
import * as XLSX from "xlsx";
import { useFacultySafe } from "../FacultyContext.jsx";
import { MASTER_STUDENTS } from "./FacultyStudentAttendance.jsx";
import "../styles/FacultyMarks.css";

// Examination List Options
const EXAMINATIONS_LIST = [
  { id: "MPC-FINAL-2025", name: "MPC Final Examination 2025", code: "MPC-FINAL-2025", maxMarks: 100, passMarks: 40 },
  { id: "UT1-2025", name: "Unit Test I 2025", code: "UT1-2025", maxMarks: 100, passMarks: 40 },
  { id: "UT2-2025", name: "Unit Test II 2025", code: "UT2-2025", maxMarks: 100, passMarks: 40 },
  { id: "MID-2025", name: "Mid Term Examination 2025", code: "MID-2025", maxMarks: 100, passMarks: 40 },
  { id: "PRE-FINAL-2025", name: "Pre-Final Examination 2025", code: "PRE-FINAL-2025", maxMarks: 100, passMarks: 40 },
];

// Faculty's Assigned Subjects (Dr. Ananya Rao - Mathematics Department)
const FACULTY_ASSIGNED_SUBJECTS = [
  { id: "MATH1A", name: "Mathematics - IA", code: "MATH1A", group: "MPC", faculty: "Dr. Ananya Rao", empId: "EMP-104" },
  { id: "MATH1B", name: "Mathematics - IB", code: "MATH1B", group: "MPC", faculty: "Dr. Ananya Rao", empId: "EMP-104" },
  { id: "MATH2A", name: "Mathematics - IIA", code: "MATH2A", group: "MPC", faculty: "Dr. Ananya Rao", empId: "EMP-104" },
  { id: "MATH2B", name: "Mathematics - IIB", code: "MATH2B", group: "MPC", faculty: "Dr. Ananya Rao", empId: "EMP-104" },
  { id: "COMM101", name: "Commercial Mathematics", code: "COMM101", group: "MEC", faculty: "Dr. Ananya Rao", empId: "EMP-104" },
];

// Seed sample students for marks entry matching Screenshot 2 & 3
const getInitialSectionStudents = (section) => {
  const normalizedSec = section === "REG-1" ? "Section A" : section === "REG-2" ? "Section B" : "Section C";
  const roster = MASTER_STUDENTS.filter((s) => s.section === normalizedSec);

  const seedProfiles = [
    { name: "Sneha H", rollNo: "7", internal: 20, theory: 56.5, totalScore: 306, percentage: "76.50%", absent: false, remarks: "good" },
    { name: "Nandhitha G", rollNo: "ROLL518", internal: 20, theory: 45, totalScore: 183, percentage: "45.75%", absent: false, remarks: "need to improve" },
    { name: "Navi D", rollNo: "ROLL520", internal: 18, theory: 57, totalScore: 300, percentage: "75.00%", absent: false, remarks: "good" },
    { name: "Rohit R", rollNo: "ROLL514", internal: 20, theory: 67, totalScore: 348, percentage: "87.00%", absent: false, remarks: "very good" },
    { name: "Nakshi K", rollNo: "1", internal: 16, theory: 56, totalScore: 288, percentage: "72.00%", absent: false, remarks: "good" },
    { name: "Nandhini string", rollNo: "2", internal: 18, theory: 60, totalScore: 290, percentage: "72.50%", absent: false, remarks: "TEST" },
    { name: "Student", rollNo: "3", internal: 0, theory: 0, totalScore: 0, percentage: "0.00%", absent: true, remarks: "Absent" },
  ];

  return roster.map((s, idx) => {
    if (idx < seedProfiles.length) {
      return {
        studentId: s.studentId,
        rollNo: seedProfiles[idx].rollNo,
        name: seedProfiles[idx].name,
        internal: seedProfiles[idx].internal,
        theory: seedProfiles[idx].theory,
        totalScore: seedProfiles[idx].totalScore,
        percentage: seedProfiles[idx].percentage,
        absent: seedProfiles[idx].absent,
        remarks: seedProfiles[idx].remarks,
      };
    }
    const defaultTheory = Math.round(45 + (idx % 6) * 5);
    const defaultInternal = Math.round(15 + (idx % 4));
    return {
      studentId: s.studentId,
      rollNo: s.rollNo,
      name: s.name,
      internal: defaultInternal,
      theory: defaultTheory,
      absent: false,
      remarks: "regular",
    };
  });
};

export default function FacultyMarks() {
  const context = useFacultySafe();
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

  // 1. Academic Context Filters (All manual entry)
  const [selectedBoard, setSelectedBoard] = useState("BIEAP");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Context applied state (controlled by "Enter Marks" button)
  const [contextApplied, setContextApplied] = useState(false);

  // 2. Marks Entry Workspace Filters
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
    return {
      "REG-1_MPC-FINAL-2025_MATH1A": {
        evaluationId: "REG-1_MPC-FINAL-2025_MATH1A",
        section: "REG-1",
        examId: "MPC-FINAL-2025",
        examName: "MPC Final Examination 2025 (MPC-FINAL-2025)",
        subjectId: "MATH1A",
        subjectName: "Mathematics - IA (MATH1A)",
        faculty: "Dr. Ananya Rao",
        empId: "EMP-104",
        status: "APPROVED",
        adminRemarks: "Approved. Results published for students.",
        rows: getInitialSectionStudents("REG-1"),
        submittedAt: "Recent",
        updatedAt: "2026-05-15",
      },
      "REG-1_MPC-FINAL-2025_MATH2B": {
        evaluationId: "REG-1_MPC-FINAL-2025_MATH2B",
        section: "REG-1",
        examId: "MPC-FINAL-2025",
        examName: "MPC Final Examination 2025 (MPC-FINAL-2025)",
        subjectId: "MATH2B",
        subjectName: "Mathematics - IIB",
        faculty: "Dr. Ananya Rao",
        empId: "EMP-104",
        status: "APPROVED",
        adminRemarks: "Approved. Results published for students.",
        rows: getInitialSectionStudents("REG-1"),
        submittedAt: "Recent",
        updatedAt: "2026-05-15",
      },
      "REG-1_MPC-FINAL-2025_MATH2A": {
        evaluationId: "REG-1_MPC-FINAL-2025_MATH2A",
        section: "REG-1",
        examId: "MPC-FINAL-2025",
        examName: "MPC Final Examination 2025 (MPC-FINAL-2025)",
        subjectId: "MATH2A",
        subjectName: "Mathematics - IIA",
        faculty: "Dr. Ananya Rao",
        empId: "EMP-104",
        status: "SUBMITTED",
        adminRemarks: "Submitted to Admin. Awaiting verification review.",
        rows: getInitialSectionStudents("REG-1"),
        submittedAt: "2026-10-06",
        updatedAt: "2026-10-06",
      },
    };
  });

  // Current working student rows
  const [currentStudents, setCurrentStudents] = useState([]);
  const [evaluationStatus, setEvaluationStatus] = useState("DRAFT");

  // Marks Entry Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Bulk Import Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkFileName, setBulkFileName] = useState("");
  const fileInputRef = useRef(null);

  // View Results Modal State (Matching Screenshot 2)
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

  // Subject options restricted to faculty's department (Dr. Ananya Rao)
  const facultySubjectOptions = useMemo(() => {
    if (!selectedGroup) return FACULTY_ASSIGNED_SUBJECTS;
    return FACULTY_ASSIGNED_SUBJECTS.filter(
      (s) => s.group.toLowerCase() === selectedGroup.toLowerCase()
    );
  }, [selectedGroup]);

  // Selected Exam Metadata
  const selectedExamInfo = useMemo(
    () => EXAMINATIONS_LIST.find((e) => e.id === selectedExam) || null,
    [selectedExam]
  );
  const selectedExamName = selectedExamInfo ? `${selectedExamInfo.name} (${selectedExamInfo.code})` : "";

  // Selected Subject Metadata
  const selectedSubjectObj = useMemo(
    () => facultySubjectOptions.find((s) => s.id === selectedSubject) || null,
    [facultySubjectOptions, selectedSubject]
  );
  const selectedSubjectName = selectedSubjectObj ? selectedSubjectObj.name : "Mathematics - IA";

  // Handle clicking "Enter Marks" button
  const handleEnterMarks = () => {
    if (!selectedBoard || !selectedYear || !selectedLevel || !selectedGroup || !selectedProgram || !selectedSection) {
      notify("Please select all Academic Context filters before opening Marks Entry.", "error");
      return;
    }
    setContextApplied(true);
    notify("Marks Entry workspace loaded.");
  };

  // Handle changing Exam or Subject inside workspace
  const handleExamOrSubjectChange = (newExam, newSubject) => {
    if (!newExam || !newSubject) {
      setCurrentStudents([]);
      setCurrentRejectionRemarks("");
      return;
    }

    const key = `${selectedSection}_${newExam}_${newSubject}`;
    const existing = evaluationsLedger[key];

    if (existing) {
      setCurrentStudents(existing.rows || []);
      setEvaluationStatus(existing.status || "DRAFT");
      setCurrentRejectionRemarks(existing.status === "REJECTED" ? existing.adminRemarks || "" : "");
    } else {
      const initial = getInitialSectionStudents(selectedSection);
      setCurrentStudents(initial);
      setEvaluationStatus("DRAFT");
      setCurrentRejectionRemarks("");
    }
    setCurrentPage(1);
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

  // Save Draft
  const handleSaveDraft = () => {
    if (!selectedExam || !selectedSubject) return;
    const key = `${selectedSection}_${selectedExam}_${selectedSubject}`;
    const updatedEval = {
      evaluationId: key,
      section: selectedSection,
      examId: selectedExam,
      examName: selectedExamName,
      subjectId: selectedSubject,
      subjectName: selectedSubjectObj?.name || selectedSubject,
      faculty: "Dr. Ananya Rao",
      empId: "EMP-104",
      status: "DRAFT",
      adminRemarks: "",
      rows: currentStudents,
      submittedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    setEvaluationsLedger((prev) => ({ ...prev, [key]: updatedEval }));
    setEvaluationStatus("DRAFT");
    notify("Marks draft saved successfully.");
  };

  // Submit Subject / Resubmit
  const handleSubmitSubject = () => {
    if (!selectedExam || !selectedSubject) return;
    const key = `${selectedSection}_${selectedExam}_${selectedSubject}`;
    const wasRejected = evaluationStatus === "REJECTED";

    const updatedEval = {
      evaluationId: key,
      section: selectedSection,
      examId: selectedExam,
      examName: selectedExamName,
      subjectId: selectedSubject,
      subjectName: selectedSubjectObj?.name || selectedSubject,
      faculty: "Dr. Ananya Rao",
      empId: "EMP-104",
      status: "SUBMITTED",
      adminRemarks: "Submitted to Admin. Awaiting verification review.",
      rows: currentStudents,
      submittedAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    setEvaluationsLedger((prev) => ({ ...prev, [key]: updatedEval }));
    setEvaluationStatus("SUBMITTED");
    setCurrentRejectionRemarks("");

    if (wasRejected) {
      notify("Corrected marks successfully resubmitted to Admin for verification and approval!", "success");
    } else {
      notify("Marks submitted successfully! Pending Admin verification and approval.", "success");
    }
  };

  // Switch to Marks Entry to edit and resubmit if rejected
  const handleEditAndResubmit = (ev) => {
    setSelectedSection(ev.section);
    setSelectedExam(ev.examId);
    setSelectedSubject(ev.subjectId);
    setContextApplied(true);
    setCurrentStudents(ev.rows || []);
    setEvaluationStatus(ev.status);
    setCurrentRejectionRemarks(ev.adminRemarks || "");
    setActiveTab("entry");
    setCurrentPage(1);
    notify(`Loaded ${ev.subjectName} (${ev.section}) for revision. Check admin feedback above.`, "info");
  };

  // Download Sample Template for Bulk Import (Matching Image 1)
  const handleDownloadTemplate = () => {
    const templateData = [
      { "Roll No": "1", "Student Name": "Nandhitha G", "Internal / 20": 20, "Theory / 80": 45, Absent: "NO", Remarks: "need to improve" },
      { "Roll No": "2", "Student Name": "Nandhini string", "Internal / 20": 18, "Theory / 80": 65, Absent: "NO", Remarks: "good" },
      { "Roll No": "3", "Student Name": "Student", "Internal / 20": 0, "Theory / 80": 0, Absent: "YES", Remarks: "Absent" },
      { "Roll No": "6", "Student Name": "ramya sri", "Internal / 20": 15, "Theory / 80": 45, Absent: "NO", Remarks: "need to improve" },
      { "Roll No": "11", "Student Name": "Rohit R", "Internal / 20": 20, "Theory / 80": 80, Absent: "NO", Remarks: "very good" },
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

  // Handle Validate & Apply Bulk File (Matching Image 1)
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
      if (reportExamFilter !== "ALL" && e.examId !== reportExamFilter) return false;
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

  // Results Modal calculations (Matching Screenshot 2)
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
      {/* 1. Header (Matching Reference) */}
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
            📝
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--cms-text, #171A17)" }}>
              Marks Entry
            </h1>
            <p style={{ margin: "2px 0 0 0", color: "var(--cms-muted, #7B8275)", fontSize: 13 }}>
              Enter and submit subject-wise examination marks
            </p>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Tabs: Marks Entry & Report */}
      <div className="cms-tabs-row" style={{ marginBottom: 16 }}>
        <div className="cms-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "entry"}
            className={activeTab === "entry" ? "active" : ""}
            onClick={() => setActiveTab("entry")}
          >
            Marks Entry
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "report"}
            className={activeTab === "report" ? "active" : ""}
            onClick={() => setActiveTab("report")}
          >
            Report
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MARKS ENTRY WORKFLOW                              */}
      {/* ======================================================== */}
      {activeTab === "entry" && (
        <>
          {/* Card 1: Academic Context */}
          <div className="cms-card cms-card-filter" style={{ marginBottom: 16 }}>
            <div className="cms-section-heading">
              <div>
                <h2>Academic Context</h2>
                <p>Select the academic scope before opening Marks Entry.</p>
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                style={{ height: 35, padding: "0 18px", borderRadius: 8 }}
                disabled={
                  !selectedBoard ||
                  !selectedYear ||
                  !selectedLevel ||
                  !selectedGroup ||
                  !selectedProgram ||
                  !selectedSection
                }
                onClick={handleEnterMarks}
              >
                Enter Marks
              </button>
            </div>

            <div className="cms-filter-grid">
              <div className="cms-field-group">
                <label className="cms-field-label">BOARD</label>
                <select
                  className="cms-select-input"
                  value={selectedBoard}
                  onChange={(e) => {
                    setSelectedBoard(e.target.value);
                    setContextApplied(false);
                  }}
                >
                  <option value="">Select Board</option>
                  <option value="BIEAP">Board of Intermediate Ed...</option>
                  <option value="CBSE">Central Board of Sec...</option>
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-field-label">ACADEMIC YEAR</label>
                <select
                  className="cms-select-input"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setContextApplied(false);
                  }}
                >
                  <option value="">Select Academic Year</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-field-label">ACADEMIC LEVEL</label>
                <select
                  className="cms-select-input"
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setContextApplied(false);
                  }}
                >
                  <option value="">Select Academic Level</option>
                  <option value="Intermediate 1st Year">Intermediate 1st Year</option>
                  <option value="Intermediate 2nd Year">Intermediate 2nd Year</option>
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-field-label">GROUP</label>
                <select
                  className="cms-select-input"
                  value={selectedGroup}
                  onChange={(e) => {
                    setSelectedGroup(e.target.value);
                    setSelectedSubject("");
                    setContextApplied(false);
                  }}
                >
                  <option value="">Select Group</option>
                  <option value="MPC">MPC</option>
                  <option value="MEC">MEC</option>
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-field-label">PROGRAM</label>
                <select
                  className="cms-select-input"
                  value={selectedProgram}
                  onChange={(e) => {
                    setSelectedProgram(e.target.value);
                    setContextApplied(false);
                  }}
                >
                  <option value="">Select Program</option>
                  <option value="Regular">Regular</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="cms-field-group">
                <label className="cms-field-label">SECTION</label>
                <select
                  className="cms-select-input"
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setContextApplied(false);
                  }}
                >
                  <option value="">Select Section</option>
                  <option value="REG-1">REG-1</option>
                  <option value="REG-2">REG-2</option>
                  <option value="REG-3">REG-3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Empty State before clicking "Enter Marks" */}
          {!contextApplied && (
            <div className="cms-card">
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  color: "var(--cms-muted, #7B8275)",
                  fontSize: 14,
                }}
              >
                Select all academic filters and click Enter Marks.
              </div>
            </div>
          )}

          {/* After clicking "Enter Marks" */}
          {contextApplied && (
            <>
              {/* Context Summary Box (Theme-based support) */}
              <div className="cms-context-summary">
                <strong>
                  {selectedGroup} {selectedProgram} · {selectedSection}
                  {selectedExam ? ` · ${selectedExamName}` : ""}
                </strong>
              </div>

              {/* Workspace Card (Examination, Subject, Table) */}
              <div className="cms-card cms-card-filter">
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
                        <option value="">Select EXAMINATION</option>
                        {EXAMINATIONS_LIST.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name} ({ex.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SUBJECT: strictly only faculty-related subjects */}
                    <div className="cms-field-group" style={{ flex: 1.4, minWidth: 320 }}>
                      <label className="cms-field-label">SUBJECT</label>
                      <select
                        className="cms-select-input"
                        value={selectedSubject}
                        onChange={(e) => {
                          setSelectedSubject(e.target.value);
                          handleExamOrSubjectChange(selectedExam, e.target.value);
                        }}
                      >
                        <option value="">Select SUBJECT</option>
                        {facultySubjectOptions.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.code}) — Faculty: {sub.faculty} ({sub.empId})
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
                    {/* Bulk Import Button: Disabled for Approved and Submitted marks */}
                    <button
                      type="button"
                      className="cms-btn cms-btn-ghost"
                      disabled={!selectedExam || !selectedSubject || isApproved || isSubmitted}
                      onClick={() => {
                        setBulkFile(null);
                        setBulkFileName("");
                        setShowBulkModal(true);
                      }}
                      title={
                        !selectedExam || !selectedSubject
                          ? "Select examination and subject first"
                          : isApproved
                          ? "Bulk import is disabled for approved marks"
                          : isSubmitted
                          ? "Bulk import is disabled for submitted marks (under admin review)"
                          : "Upload and bulk import marks from Excel file"
                      }
                    >
                      Bulk Import
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-secondary"
                      disabled={!selectedExam || !selectedSubject || isApproved}
                      onClick={handleSaveDraft}
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      className="cms-btn cms-btn-primary"
                      disabled={!selectedExam || !selectedSubject || isApproved}
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
                    No subjects are configured for the selected examination.
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
                          Dr. Ananya Rao (EMP-104) · REGULAR · Maximum 100 · Pass 40%
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
                          {pagedRows.map((row) => {
                            const isRowAbsent = Boolean(row.absent);
                            const total = isRowAbsent
                              ? 0
                              : Number(row.internal || 0) + Number(row.theory || 0);
                            const pct = isRowAbsent ? 0 : (total / 100) * 100;
                            const isLocked = isApproved;

                            return (
                              <tr key={row.studentId}>
                                <td className="cms-cell-center">{row.rollNo || ""}</td>
                                <td>{row.name}</td>
                                <td className="cms-cell-center">
                                  <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    disabled={isLocked || isRowAbsent}
                                    className="cms-num-input"
                                    value={row.internal ?? ""}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleInternalChange(row.studentId, e.target.value)
                                    }
                                  />
                                </td>
                                <td className="cms-cell-center">
                                  <input
                                    type="number"
                                    min={0}
                                    max={80}
                                    disabled={isLocked || isRowAbsent}
                                    className="cms-num-input"
                                    value={row.theory ?? ""}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleTheoryChange(row.studentId, e.target.value)
                                    }
                                  />
                                </td>
                                <td className="cms-cell-center">
                                  {isRowAbsent ? "ABS" : total}
                                </td>
                                <td className="cms-cell-center">
                                  {isRowAbsent ? "ABS" : `${pct.toFixed(2)}%`}
                                </td>
                                <td className="cms-cell-center">
                                  <input
                                    type="checkbox"
                                    checked={isRowAbsent}
                                    disabled={isLocked}
                                    onChange={(e) =>
                                      handleAbsentToggle(row.studentId, e.target.checked)
                                    }
                                    style={{
                                      width: 16,
                                      height: 16,
                                      cursor: isLocked ? "not-allowed" : "pointer",
                                    }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="cms-remarks-input"
                                    disabled={isLocked}
                                    value={row.remarks || ""}
                                    placeholder=""
                                    onChange={(e) =>
                                      handleRemarksChange(row.studentId, e.target.value)
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="cms-pagination-footer">
                      <span style={{ fontSize: 13, color: "var(--cms-muted, #7B8275)" }}>
                        Showing {(currentPage - 1) * pageSize + 1}–
                        {Math.min(currentPage * pageSize, currentStudents.length)} of{" "}
                        {currentStudents.length} records{" "}
                        {isApproved
                          ? "(This approved subject is published and read-only.)"
                          : isRejected
                          ? "(This subject was rejected. Please correct and click Resubmit.)"
                          : isSubmitted
                          ? "(This submitted subject is pending admin approval.)"
                          : ""}
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
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: REPORT — STATUS & RESULTS VIEW MODAL              */}
      {/* ======================================================== */}
      {activeTab === "report" && (
        <div className="cms-card cms-card-filter">
          <div className="cms-section-heading">
            <div>
              <h2>Examination Submissions & Approval Report</h2>
              <p>
                Track status of submitted examinations, admin verification, approvals, and resolve rejection feedback.
              </p>
            </div>
          </div>

          {/* Report Statistics Cards */}
          <div className="sp-report-stats">
            <div className="sp-stat-card">
              <span className="label">Total Submissions</span>
              <span className="val">{reportStats.total}</span>
            </div>
            <div className="sp-stat-card">
              <span className="label" style={{ color: "#2E7D32" }}>Approved & Published</span>
              <span className="val" style={{ color: "#2E7D32" }}>{reportStats.approved}</span>
            </div>
            <div className="sp-stat-card">
              <span className="label" style={{ color: "#1D4ED8" }}>Under Review</span>
              <span className="val" style={{ color: "#1D4ED8" }}>{reportStats.underReview}</span>
            </div>
            <div className="sp-stat-card">
              <span className="label" style={{ color: "#DC2626" }}>Rejected / Needs Action</span>
              <span className="val" style={{ color: "#DC2626" }}>{reportStats.rejected}</span>
            </div>
          </div>

          {/* Search and Filters Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
              <div style={{ minWidth: 170 }}>
                <select
                  className="cms-select-input"
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Approved (Published)</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="REJECTED">Rejected (Needs Action)</option>
                </select>
              </div>

              <div style={{ minWidth: 220 }}>
                <select
                  className="cms-select-input"
                  value={reportExamFilter}
                  onChange={(e) => setReportExamFilter(e.target.value)}
                >
                  <option value="ALL">All Examinations</option>
                  {EXAMINATIONS_LIST.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ width: 240 }}>
              <input
                type="search"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                placeholder="Search subject or remark..."
                className="cms-select-input"
              />
            </div>
          </div>

          {/* Submissions Report Table (Matching Image 1 & 3) */}
          <div className="sp-report-table-wrap">
            <table className="sp-report-table">
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>EXAMINATION</th>
                  <th style={{ width: "22%" }}>SUBJECT & FACULTY</th>
                  <th style={{ width: "8%", textAlign: "center" }}>SECTION</th>
                  <th style={{ width: "7%", textAlign: "center" }}>STUDENTS</th>
                  <th style={{ width: "13%", minWidth: 125, textAlign: "center" }}>STATUS</th>
                  <th style={{ width: "14%" }}>ADMIN FEEDBACK & REMARKS</th>
                  <th style={{ width: "12%", minWidth: 130, textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {evaluationsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--cms-muted)" }}>
                      No submission records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  pagedEvaluations.map((ev) => {
                    const isEvApproved = ev.status === "APPROVED";
                    const isEvRejected = ev.status === "REJECTED";
                    const isEvSubmitted = ev.status === "SUBMITTED" || ev.status === "VERIFIED";

                    return (
                      <tr key={ev.evaluationId}>
                        <td>
                          <strong>{ev.examName}</strong>
                          <div style={{ fontSize: 11, color: "var(--cms-muted)", marginTop: 2 }}>
                            Submitted: {ev.submittedAt || "Recent"}
                          </div>
                        </td>
                        <td>
                          <div><strong>{ev.subjectName}</strong></div>
                          <small style={{ color: "var(--cms-muted)" }}>
                            Faculty: {ev.faculty} ({ev.empId})
                          </small>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="cms-strong">{ev.section}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>{ev.rows?.length || 0}</td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <span className={`cms-status-pill ${ev.status.toLowerCase()}`}>
                            <span className="cms-status-dot" />
                            {ev.status}
                          </span>
                        </td>
                        <td>
                          {isEvRejected ? (
                            <div style={{ color: "#DC2626", fontSize: 12, display: "flex", alignItems: "flex-start", gap: 4 }}>
                              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                              <span>{ev.adminRemarks || "Rejected by Admin. Please revise."}</span>
                            </div>
                          ) : isEvApproved ? (
                            <div style={{ color: "#2E7D32", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                              <CheckCircle size={14} style={{ flexShrink: 0 }} />
                              <span>{ev.adminRemarks || "Approved. Results published for students."}</span>
                            </div>
                          ) : (
                            <div style={{ color: "var(--cms-muted)", fontSize: 12 }}>
                              {ev.adminRemarks || "Submitted to Admin. Awaiting verification review."}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                            {/* If Approved: View Results opens Results Modal (Screenshot 2) */}
                            {isEvApproved && (
                              <button
                                type="button"
                                className="cms-btn cms-btn-ghost"
                                style={{ height: 30, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
                                onClick={() => {
                                  setViewResultsEval(ev);
                                  setResultsModalPage(1);
                                }}
                                title="View published student marks"
                              >
                                <Eye size={13} /> View Results
                              </button>
                            )}

                            {/* If Submitted or Verified: View Results is DISABLED */}
                            {isEvSubmitted && (
                              <button
                                type="button"
                                className="cms-btn cms-btn-ghost"
                                disabled={true}
                                style={{ height: 30, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
                                title="Results are awaiting Admin verification and approval"
                              >
                                <Eye size={13} /> View Results
                              </button>
                            )}

                            {/* If Rejected: Prominent Edit & Resubmit button */}
                            {isEvRejected && (
                              <button
                                type="button"
                                className="cms-btn cms-btn-primary"
                                style={{ height: 30, fontSize: 11.5, background: "#DC2626", borderColor: "#DC2626", display: "inline-flex", alignItems: "center", gap: 5 }}
                                onClick={() => handleEditAndResubmit(ev)}
                                title="Open marks in editor to correct issues and resubmit"
                              >
                                <RotateCcw size={13} /> Edit & Resubmit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Report Tab Pagination Footer (Matching Image 3) */}
          <div className="cms-pagination-footer">
            <span style={{ fontSize: 13, color: "var(--cms-muted, #7B8275)" }}>
              Showing {evaluationsList.length === 0 ? "0–0 of 0" : `${(reportPage - 1) * reportPageSize + 1}–${Math.min(reportPage * reportPageSize, evaluationsList.length)} of ${evaluationsList.length}`} records
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
                disabled={reportPage >= reportTotalPages || evaluationsList.length === 0}
                onClick={() => setReportPage((p) => Math.min(reportTotalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Import Marks Modal (Matching Image 1) */}
      {showBulkModal && (
        <div className="sp-modal-overlay">
          <div className="sp-upload-import-modal">
            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Modal Header */}
            <div className="sp-upload-import-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--cms-text, #171A17)" }}>
                  Upload & Import Marks
                </h3>
                <p style={{ margin: "5px 0 0 0", fontSize: 13, color: "var(--cms-muted, #7B8275)" }}>
                  Upload an Excel (.xlsx, .xls) file to validate and bulk import marks for{" "}
                  <strong>{selectedSubjectName}</strong>.
                </p>
              </div>
              <button
                type="button"
                className="sp-upload-close-btn"
                onClick={() => setShowBulkModal(false)}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="sp-upload-import-body">
              {/* Right-aligned Download Excel Template button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-secondary"
                  style={{ gap: 6, fontSize: 12.5, borderRadius: 8, height: 34, padding: "0 14px" }}
                  onClick={handleDownloadTemplate}
                >
                  <Download size={14} /> Download Excel Template
                </button>
              </div>

              {/* Drag & Drop Upload Container */}
              <div
                className="sp-upload-dropzone"
                onClick={handleTriggerFileInput}
              >
                <Upload size={32} style={{ color: "var(--cms-primary, #6F8400)", marginBottom: 8 }} />
                <p style={{ margin: "0 0 4px 0", fontSize: 13.5, fontWeight: 600, color: "var(--cms-text, #171A17)" }}>
                  {bulkFileName ? `Selected: ${bulkFileName}` : "Click to upload or drag & drop file"}
                </p>
                <span style={{ fontSize: 11.5, color: "var(--cms-muted, #7B8275)" }}>
                  {bulkFileName ? "File ready for validation" : "Supported formats: .xlsx, .xls, .csv"}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sp-upload-import-foot">
              <button
                type="button"
                className="cms-btn cms-btn-secondary"
                style={{ height: 36, padding: "0 18px", borderRadius: 8 }}
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                style={{ height: 36, padding: "0 18px", borderRadius: 8 }}
                onClick={handleValidateAndImportFile}
              >
                <CheckCircle size={14} /> Validate File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Results Modal (Matching Screenshot 2) */}
      {viewResultsEval && (
        <div className="sp-modal-overlay">
          <div className="sp-results-modal">
            {/* Modal Header */}
            <div className="sp-results-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "#EAF7EC",
                    color: "#1E7E34",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--cms-text, #171A17)" }}>
                    Passed Students List ({passedStudentsCount})
                  </h3>
                  <small style={{ color: "var(--cms-muted, #7B8275)", fontSize: 12 }}>
                    {viewResultsEval.examName} · {viewResultsEval.subjectName} ({viewResultsEval.section})
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="sp-upload-close-btn"
                onClick={() => setViewResultsEval(null)}
                title="Close"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Table */}
            <div className="sp-results-modal-body">
              <table className="sp-results-table">
                <thead>
                  <tr>
                    <th>ROLL NO</th>
                    <th>STUDENT NAME</th>
                    <th>SECTION</th>
                    <th style={{ textAlign: "center" }}>TOTAL</th>
                    <th style={{ textAlign: "center" }}>PERCENTAGE</th>
                    <th style={{ textAlign: "center" }}>RESULT</th>
                    <th style={{ textAlign: "center" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedResultsModalRows.map((r, i) => {
                    const isAb = Boolean(r.absent);
                    const total = isAb
                      ? 0
                      : r.totalScore !== undefined
                      ? Number(r.totalScore)
                      : Number(r.internal || 0) + Number(r.theory || 0);
                    const pct = isAb
                      ? 0
                      : r.percentage !== undefined
                      ? parseFloat(r.percentage)
                      : total > 100
                      ? (total / 400) * 100
                      : (total / 100) * 100;
                    const isPass = !isAb && (total > 100 ? total >= 140 : total >= 40);

                    return (
                      <tr key={r.studentId || i}>
                        <td style={{ fontWeight: 600 }}>{r.rollNo || (i + 1)}</td>
                        <td>{r.name}</td>
                        <td style={{ color: "var(--cms-muted)" }}>{viewResultsEval.section}</td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>
                          {isAb ? "ABS" : total}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isAb ? "ABS" : `${pct.toFixed(2)}%`}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`cms-result-badge ${isPass ? "pass" : "fail"}`}>
                            {isAb ? "ABS" : isPass ? "PASS" : "FAIL"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="sp-eye-btn"
                            title={`View details for ${r.name}`}
                            onClick={() =>
                              notify(
                                `${r.name}: Internal ${r.internal}/20, Theory ${r.theory}/80, Total ${total}/100 (${r.remarks || "Regular"})`
                              )
                            }
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Pagination Footer (Matching Screenshot 2) */}
            <div className="sp-results-modal-foot">
              <button
                type="button"
                className="sp-modal-page-btn"
                disabled={resultsModalPage === 1}
                onClick={() => setResultsModalPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: 12.5, color: "var(--cms-muted, #7B8275)", margin: "0 6px" }}>
                Page {resultsModalPage} of {resultsModalTotalPages}
              </span>
              <button
                type="button"
                className={`sp-modal-page-btn ${resultsModalPage < resultsModalTotalPages ? "active" : ""}`}
                disabled={resultsModalPage >= resultsModalTotalPages}
                onClick={() => setResultsModalPage((p) => Math.min(resultsModalTotalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`cms-toast-banner cms-toast-${toast.type}`} style={{ zIndex: 99999 }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
