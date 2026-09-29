import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen, Users, Award, FileText, CheckCircle2, TrendingUp, Calendar,
  ChevronRight, Eye, Download, Printer, Clock
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import {
  useParentPortal,
  academicSubjectsData, examResultsData
} from "../parentData.js";
import { Modal } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentAcademicsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "subjects" ? "subjects" : "results";
  const [activeTab, setActiveTab] = useState(initialTab);
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    dataKey,
    currentAcademicYear,
  } = useParentPortal();
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedSubjectModal, setSelectedSubjectModal] = useState(null);
  const [memoOpen, setMemoOpen] = useState(false);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "subjects") {
      setActiveTab("subjects");
    } else if (tabFromUrl === "results") {
      setActiveTab("results");
    }
  }, [searchParams]);

  useEffect(() => {
    setSelectedResult(null);
  }, [currentAcademicYear, activeChildId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const subjects = child ? (academicSubjectsData[dataKey] || (currentAcademicYear === "2026-2027" ? academicSubjectsData[child.id] : [])) || [] : [];
  const rawResults = child ? examResultsData[child.id] || [] : [];
  const yearResults = rawResults.filter((r) => r.academicYear === currentAcademicYear);
  const currentExam = (selectedResult && selectedResult.academicYear === currentAcademicYear)
    ? selectedResult
    : yearResults[0] || null;

  const handleSelectChild = (id) => {
    setActiveChildId(id);
    setSelectedResult(null);
  };

  if (availableChildren.length === 0 || !child) {
    return (
      <DashboardLayout
        title="Academics & Results"
        subtitle="Academic Records"
        breadcrumb={["Parent Portal", "Academics & Results"]}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <Users size={48} style={{ color: "var(--cms-muted)", margin: "0 auto 16px" }} />
            <h3>No Children Associated</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              No enrolled student records were found linked to your parent account.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Academics & Results"
      subtitle={`Curriculum, Exam Results & Marks Memos • SGPA: ${child.academics.sgpa} (${child.academics.grade}) • ${child.name}`}
      breadcrumb={["Parent Portal", "Academics & Results"]}
    >
      <div className="parent-dashboard-wrapper">
        {/* Child Switcher Banner */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>{child.name} ({child.programme})</h2>
              <p>{child.level} • {child.semester} • Academic Year {child.academicYear}</p>
            </div>
          </div>
          <div className="parent-child-switch-buttons">
            {availableChildren.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`parent-child-switch-btn ${child.id === c.id ? "is-active" : ""}`}
                onClick={() => handleSelectChild(c.id)}
              >
                <Users size={14} /> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Academic & Performance Stat Cards */}
        <div className="parent-stat-grid">
          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap">
              <Award size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Current SGPA</div>
              <div className="parent-stat-value" style={{ color: "var(--cms-primary-dark)" }}>{child.academics.sgpa} / 10.0</div>
              <div className="parent-stat-subtext">Overall Grade: <strong>{child.academics.grade}</strong></div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap green">
              <TrendingUp size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Cumulative CGPA</div>
              <div className="parent-stat-value">{child.academics.cgpa}</div>
              <div className="parent-stat-subtext">{child.academics.performanceTrend}</div>
            </div>
          </div>

          <div className="parent-stat-card">
            <div className="parent-stat-icon-wrap amber">
              <Award size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Class Standing</div>
              <div className="parent-stat-value">{child.academics.rank}</div>
              <div className="parent-stat-subtext">{child.section} Merit List</div>
            </div>
          </div>

          <div className="parent-stat-card" style={{ cursor: currentExam ? "pointer" : "default" }} onClick={() => currentExam && setMemoOpen(true)}>
            <div className="parent-stat-icon-wrap">
              <Printer size={24} />
            </div>
            <div className="parent-stat-info">
              <div className="parent-stat-label">Official Marks Memo</div>
              <div className="parent-stat-value" style={{ fontSize: 16, color: "var(--cms-primary-dark)" }}>
                {currentExam ? "Click to View" : "No Records"}
              </div>
              <div className="parent-stat-subtext">
                {currentExam ? "Printable Grade Card" : `Academic Year ${currentAcademicYear}`}
              </div>
            </div>
          </div>
        </div>

        {/* Unified Tab Switcher */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            paddingBottom: 4,
          }}
        >
          <button
            type="button"
            className={`cms-btn ${activeTab === "results" ? "cms-btn-primary" : "cms-btn-outline"}`}
            onClick={() => handleTabChange("results")}
            style={{ gap: 8, padding: "8px 18px", fontSize: 13.5, fontWeight: 700 }}
          >
            <Award size={16} /> Exam Results & Marks Memo
          </button>
          <button
            type="button"
            className={`cms-btn ${activeTab === "subjects" ? "cms-btn-primary" : "cms-btn-outline"}`}
            onClick={() => handleTabChange("subjects")}
            style={{ gap: 8, padding: "8px 18px", fontSize: 13.5, fontWeight: 700 }}
          >
            <BookOpen size={16} /> Enrolled Subjects & Curriculum ({subjects.length})
          </button>
        </div>

        {/* TAB 1: EXAM RESULTS & MARKS MEMO */}
        {activeTab === "results" && (
          <>
            {/* Exam & Previous Results Selector */}
            <div
              className="parent-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                flexWrap: "wrap",
                gap: 12,
                background: "var(--cms-surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Calendar size={18} color="var(--cms-primary-dark)" />
                <label
                  htmlFor="exam-results-select"
                  style={{ fontSize: 13.5, fontWeight: 700, color: "var(--cms-text)" }}
                >
                  Select Examination / Previous Result:
                </label>
                <select
                  id="exam-results-select"
                  className="cms-select"
                  value={currentExam?.examName || ""}
                  onChange={(e) => {
                    const found = yearResults.find((r) => r.examName === e.target.value);
                    if (found) setSelectedResult(found);
                  }}
                  disabled={yearResults.length === 0}
                  style={{
                    minWidth: 320,
                    padding: "8px 14px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    borderRadius: 8,
                    cursor: yearResults.length > 0 ? "pointer" : "default",
                  }}
                >
                  {yearResults.length > 0 ? (
                    <optgroup label={`Academic Year (${currentAcademicYear}) Examinations`}>
                      {yearResults.map((res) => (
                        <option key={res.examName} value={res.examName}>
                          {res.examName} ({res.period})
                        </option>
                      ))}
                    </optgroup>
                  ) : (
                    <option value="">No examination results recorded for {currentAcademicYear}</option>
                  )}
                </select>
              </div>

              {currentExam && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    className="cms-badge"
                    style={{
                      fontSize: 11.5,
                      background: "var(--cms-bg)",
                      border: "1px solid var(--cms-border)",
                      color: "var(--cms-text)",
                    }}
                  >
                    Year: <strong>{currentExam.academicYear || currentAcademicYear}</strong>
                  </span>
                  <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>
                    Session: <strong>{currentExam.period}</strong>
                  </span>
                  <span className="cms-badge cms-badge-active" style={{ fontSize: 11.5 }}>
                    {currentExam.resultStatus}
                  </span>
                  <span
                    className="cms-badge"
                    style={{
                      fontSize: 11.5,
                      background: "var(--cms-primary-soft)",
                      color: "var(--cms-primary-dark)",
                      border: "1px solid var(--cms-primary-border)",
                    }}
                  >
                    SGPA: <strong>{currentExam.sgpa}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Statement of Marks Table */}
            {currentExam ? (
              <div className="parent-card">
                <div className="parent-card-header">
                  <h3 className="parent-card-title">
                    <Award size={18} /> {currentExam.examName} — Statement of Marks
                  </h3>
                  <button
                    type="button"
                    className="cms-btn cms-btn-sm cms-btn-primary"
                    onClick={() => setMemoOpen(true)}
                  >
                    <Printer size={14} /> View Printable Memo
                  </button>
                </div>
                <div className="parent-card-body" style={{ padding: 0 }}>
                  <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
                    <table className="parent-timetable-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Maximum Marks</th>
                          <th>Marks Obtained</th>
                          <th>Percentage</th>
                          <th>Grade</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(currentExam.subjects || []).map((sub) => {
                          const subPercent = sub.max ? ((sub.obtained / sub.max) * 100).toFixed(1) : 0;
                          return (
                            <tr key={sub.code}>
                              <td>
                                <strong>{sub.subject}</strong>
                                <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>Code: {sub.code}</div>
                              </td>
                              <td>{sub.max}</td>
                              <td style={{ fontWeight: 700, color: "var(--cms-text)" }}>{sub.obtained}</td>
                              <td>{subPercent}%</td>
                              <td>
                                <span className="cms-badge cms-badge-active" style={{ minWidth: 32, textAlign: "center" }}>
                                  {sub.grade}
                                </span>
                              </td>
                              <td>
                                <span className="cms-badge cms-badge-active">
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: "var(--cms-bg)", fontWeight: 700 }}>
                          <td>TOTAL / AGGREGATE</td>
                          <td>{currentExam.maxMarks}</td>
                          <td style={{ color: "var(--cms-primary-dark)", fontSize: 15 }}>{currentExam.obtainedMarks}</td>
                          <td>{currentExam.percentage}</td>
                          <td>SGPA: {currentExam.sgpa}</td>
                          <td>
                            <span className="cms-badge cms-badge-active">{currentExam.resultStatus}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="parent-card">
                <div className="parent-card-header">
                  <h3 className="parent-card-title">
                    <Award size={18} /> Statement of Marks
                  </h3>
                </div>
                <div className="parent-card-body" style={{ padding: "40px 16px", textAlign: "center", color: "var(--cms-muted)" }}>
                  <Award size={36} style={{ margin: "0 auto 10px", opacity: 0.45, display: "block" }} />
                  <h4 style={{ margin: "0 0 6px 0", color: "var(--cms-text)" }}>No Results Recorded for Academic Year {currentAcademicYear}</h4>
                  <p style={{ margin: 0, fontSize: 13.5 }}>
                    There are no examination results or grade sheets recorded for the selected academic year.
                  </p>
                </div>
              </div>
            )}

          </>
        )}

        {/* TAB 2: ENROLLED SUBJECTS & CURRICULUM */}
        {activeTab === "subjects" && (
          <div className="parent-card">
            <div className="parent-card-header">
              <h3 className="parent-card-title">
                <BookOpen size={18} /> Enrolled Subjects & Internal Assessments
              </h3>
              <div style={{ display: "flex", gap: 10 }}>
                <Link to="/parent-dashboard/timetable" className="cms-btn cms-btn-sm cms-btn-primary" style={{ textDecoration: "none" }}>
                  <Clock size={14} /> View Timetable
                </Link>
              </div>
            </div>
            <div className="parent-card-body" style={{ padding: 0 }}>
              <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
                <table className="parent-timetable-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Credits</th>
                      <th>Internals</th>
                      <th>Assignments</th>
                      <th>Attendance</th>
                      <th>Grade</th>
                      <th>Faculty In-Charge</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                          No enrolled subjects or curriculum records found for Academic Year {currentAcademicYear}.
                        </td>
                      </tr>
                    ) : (
                      subjects.map((sub) => (
                      <tr key={sub.code}>
                        <td>
                          <strong>{sub.name}</strong>
                          <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>Code: {sub.code}</div>
                        </td>
                        <td>{sub.credits} Credits</td>
                        <td style={{ fontWeight: 600 }}>{sub.internals}</td>
                        <td>{sub.assignments}</td>
                        <td style={{ color: "var(--cms-green)", fontWeight: 600 }}>{sub.attendance}</td>
                        <td>
                          <span className="cms-badge cms-badge-active" style={{ minWidth: 32, textAlign: "center" }}>
                            {sub.grade}
                          </span>
                        </td>
                        <td>{sub.faculty}</td>
                        <td>
                          <button
                            type="button"
                            className="cms-btn cms-btn-sm cms-btn-outline"
                            onClick={() => setSelectedSubjectModal(sub)}
                          >
                            <Eye size={13} /> Assessment Details
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Subject Detail Modal */}
        {selectedSubjectModal && (
          <Modal
            title={`Subject Details — ${selectedSubjectModal.name} (${selectedSubjectModal.code})`}
            onClose={() => setSelectedSubjectModal(null)}
            size="md"
            footer={
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedSubjectModal(null)}>
                Close
              </button>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: 14, background: "var(--cms-bg)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Subject Faculty:</span>
                  <strong>{selectedSubjectModal.faculty}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Course Credits:</span>
                  <strong>{selectedSubjectModal.credits} Credits</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Internal Assessment Marks:</span>
                  <strong style={{ color: "var(--cms-primary-dark)" }}>{selectedSubjectModal.internals}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Homework & Assignment Average:</span>
                  <strong>{selectedSubjectModal.assignments}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Class Attendance:</span>
                  <strong style={{ color: "var(--cms-green)" }}>{selectedSubjectModal.attendance}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--cms-border)", paddingTop: 8 }}>
                  <span>Evaluation Grade:</span>
                  <strong style={{ fontSize: 16, color: "var(--cms-green)" }}>{selectedSubjectModal.grade} ({selectedSubjectModal.status})</strong>
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--cms-muted)", margin: 0 }}>
                Internal marks are calculated based on monthly tests, assignments, classroom interactions, and lab performance in accordance with college academic regulations.
              </p>
            </div>
          </Modal>
        )}

        {/* Printable Marks Memo Modal */}
        {memoOpen && currentExam && (
          <Modal
            title="Official Statement of Marks / Marks Memo"
            onClose={() => setMemoOpen(false)}
            size="lg"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setMemoOpen(false)}>Close</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => window.print()}>
                  <Printer size={15} /> Print Marks Memo
                </button>
              </>
            }
          >
            <div className="parent-receipt-sheet">
              <div className="parent-receipt-header">
                <h2>PIRNAV JUNIOR COLLEGE</h2>
                <p>Affiliated to the Board of Intermediate Education, Hyderabad</p>
                <strong style={{ display: "block", marginTop: 6, fontSize: 15 }}>MEMORANDUM OF MARKS — {currentExam.examName}</strong>
              </div>

              <div className="parent-profile-meta-grid" style={{ marginBottom: 16 }}>
                <div className="parent-meta-item"><span>Student Name:</span> <strong>{child.name}</strong></div>
                <div className="parent-meta-item"><span>Admission No:</span> <strong>{child.admissionNo}</strong></div>
                <div className="parent-meta-item"><span>Roll Number:</span> <strong>{child.roll}</strong></div>
                <div className="parent-meta-item"><span>Academic Year:</span> <strong>{currentExam.academicYear || child.academicYear}</strong></div>
                <div className="parent-meta-item"><span>Course:</span> <strong>{child.programme}</strong></div>
                <div className="parent-meta-item"><span>Class Rank:</span> <strong>{currentExam.classRank}</strong></div>
                <div className="parent-meta-item"><span>SGPA:</span> <strong>{currentExam.sgpa} / 10.0</strong></div>
              </div>

              <table className="parent-receipt-table">
                <thead>
                  <tr>
                    <th>Subject Code & Title</th>
                    <th>Max Marks</th>
                    <th>Obtained</th>
                    <th>Grade</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(currentExam.subjects || []).map((s) => (
                    <tr key={s.code}>
                      <td><strong>{s.subject}</strong> ({s.code})</td>
                      <td>{s.max}</td>
                      <td><strong>{s.obtained}</strong></td>
                      <td>{s.grade}</td>
                      <td>{s.status}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td>Total Marks</td>
                    <td>{currentExam.maxMarks}</td>
                    <td style={{ color: "var(--cms-primary-dark)" }}>{currentExam.obtainedMarks} ({currentExam.percentage})</td>
                    <td>SGPA: {currentExam.sgpa}</td>
                    <td>{currentExam.resultStatus}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 16, borderTop: "1px solid #cbd5e1" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 30 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Class Mentor</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 30 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Examination Convenor</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 30 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Principal Signature & Seal</div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
