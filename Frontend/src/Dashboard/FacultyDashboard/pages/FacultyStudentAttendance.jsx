import React, { useState, useEffect } from "react";
import { CheckCircle, Save, Loader2, FileSpreadsheet, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { facultyMockData } from "../data/facultyMockData.js";
import { useFacultySafe } from "../FacultyContext.jsx";
import "../styles/FacultyStudentAttendance.css";

export default function FacultyStudentAttendance() {
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

  const [attView, setAttView] = useState("daily"); // "daily" | "monthly" | "defaulters"
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attBoard, setAttBoard] = useState("");
  const [attYear, setAttYear] = useState("");
  const [attLevel, setAttLevel] = useState("");
  const [attGroup, setAttGroup] = useState("");
  const [attProgram, setAttProgram] = useState("");
  const [attSection, setAttSection] = useState("");
  const [attStudents, setAttStudents] = useState(facultyMockData.students || []);
  const [attDirty, setAttDirty] = useState(false);
  const [attSaving, setAttSaving] = useState(false);

  // Cascading Academic Lists
  const [attBoards, setAttBoards] = useState([]);
  const [attYears, setAttYears] = useState([]);
  const [attLevels, setAttLevels] = useState([]);
  const [attGroups, setAttGroups] = useState([]);
  const [attPrograms, setAttPrograms] = useState([]);
  const [attSections, setAttSections] = useState([]);

  useEffect(() => {
    setAttBoards(facultyMockData.boards || []);
    setAttYears(facultyMockData.academicYears || []);
    setAttLevels(facultyMockData.levels || []);
    setAttGroups(facultyMockData.groups || []);
    setAttPrograms(facultyMockData.programs || []);
    setAttSections(facultyMockData.sections || []);

    if (facultyMockData.boards?.[0]) setAttBoard(facultyMockData.boards[0].id);
    if (facultyMockData.academicYears?.[0]) setAttYear(facultyMockData.academicYears[0].id);
    if (facultyMockData.levels?.[0]) setAttLevel(facultyMockData.levels[0].id);
    if (facultyMockData.groups?.[0]) setAttGroup(facultyMockData.groups[0].id);
    if (facultyMockData.programs?.[0]) setAttProgram(facultyMockData.programs[0].id);
    if (facultyMockData.sections?.[0]) setAttSection(facultyMockData.sections[0].id || "1");
  }, []);

  const toggleSessionStatus = (studentId, session, status) => {
    setAttStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, [`${session}Status`]: status } : s))
    );
    setAttDirty(true);
  };

  const markAllPresent = () => {
    setAttStudents((prev) =>
      prev.map((s) => ({ ...s, morningStatus: "Present", afternoonStatus: "Present" }))
    );
    setAttDirty(true);
    notify("All students marked Present for both sessions.");
  };

  const saveAttendance = async () => {
    setAttSaving(true);
    window.setTimeout(() => {
      setAttDirty(false);
      setAttSaving(false);
      notify("Student attendance saved successfully!");
    }, 250);
  };

  const handleExportAttendanceSheet = () => {
    if (!attStudents.length) return notify("No attendance records to export.", "error");
    const exportData = attStudents.map((s, idx) => ({
      "S.No": idx + 1,
      "Roll No": s.rollNo,
      "Admission No": s.admissionNo,
      "Student Name": s.name,
      Date: attDate,
      "Morning Session": s.morningStatus,
      "Afternoon Session": s.afternoonStatus,
      "Total Classes": s.totalClasses || 48,
      "Classes Attended": s.presentCount || 45,
      "Attendance %": `${s.attendancePct || 90}%`,
      Remarks: s.remarks || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Attendance");
    XLSX.writeFile(workbook, `Student_Attendance_${attDate}_Section_${attSection || "1"}.xlsx`);
    notify("Class attendance sheet downloaded as Excel file.");
  };

  const handleDownloadStudentSlip = (student) => {
    const slipText = [
      "================================================================================",
      "                    PIRNAV COLLEGES - STUDENT ATTENDANCE SLIP                   ",
      "================================================================================",
      `Date of Record   : ${attDate}`,
      `Generated Time   : ${new Date().toLocaleTimeString()}`,
      "",
      "STUDENT DETAILS:",
      "--------------------------------------------------------------------------------",
      `Student Name     : ${student.name}`,
      `Roll Number      : ${student.rollNo}`,
      `Admission Number : ${student.admissionNo}`,
      `Section / Class  : Section ${attSection || "A"}`,
      `Academic Year    : 2025-2026`,
      "",
      "DAILY SESSION STATUS:",
      "--------------------------------------------------------------------------------",
      `Morning Session  : ${student.morningStatus}`,
      `Afternoon Session: ${student.afternoonStatus}`,
      `Daily Remarks    : ${student.remarks || "Regular Attendance"}`,
      "",
      "MONTHLY CUMULATIVE METRICS:",
      "--------------------------------------------------------------------------------",
      `Total Classes    : ${student.totalClasses || 48}`,
      `Classes Present  : ${student.presentCount || 45}`,
      `Overall Attendance: ${student.attendancePct || 90}%`,
      `Hall Ticket Eligibility: ${(student.attendancePct || 90) >= 75 ? "ELIGIBLE (>= 75%)" : "SHORTAGE CONDONATION REQUIRED"}`,
      "",
      "Authorized Signatory / Faculty In-Charge: ______________________",
      "================================================================================",
    ].join("\n");
    const blob = new Blob([slipText.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Slip_${student.rollNo}_${attDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Attendance slip downloaded for ${student.name}.`);
  };

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>Student Attendance Entry</h1>
          <p>Replicated from Admin Operations: mark daily session attendance, view monthly reports and defaulters.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {attView === "daily" && (
            <>
              <button className="cms-btn cms-btn-ghost" onClick={markAllPresent}>
                <CheckCircle size={15} /> Mark All Present
              </button>
              <button className="cms-btn cms-btn-primary" onClick={saveAttendance} disabled={attSaving}>
                {attSaving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save Attendance
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="sp-att-views-bar">
        <button
          className={`sp-att-view-btn ${attView === "daily" ? "active" : ""}`}
          onClick={() => setAttView("daily")}
        >
          Daily Attendance
        </button>
        <button
          className={`sp-att-view-btn ${attView === "monthly" ? "active" : ""}`}
          onClick={() => setAttView("monthly")}
        >
          Monthly Report
        </button>
        <button
          className={`sp-att-view-btn ${attView === "defaulters" ? "active" : ""}`}
          onClick={() => setAttView("defaulters")}
        >
          Defaulters List (&lt; 75%)
        </button>
      </div>

      {/* Cascading Filter Card */}
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            <div className="cms-field">
              <label>Attendance Date</label>
              <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
            </div>
            <div className="cms-field">
              <label>Board</label>
              <select value={attBoard} onChange={(e) => setAttBoard(e.target.value)}>
                {attBoards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="cms-field">
              <label>Academic Year</label>
              <select value={attYear} onChange={(e) => setAttYear(e.target.value)}>
                {attYears.length ? (
                  attYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))
                ) : (
                  <option value="">Loading active years...</option>
                )}
              </select>
            </div>
            <div className="cms-field">
              <label>Academic Level</label>
              <select value={attLevel} onChange={(e) => setAttLevel(e.target.value)}>
                {attLevels.length ? (
                  attLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">Intermediate 1st Year (+1)</option>
                    <option value="2">Intermediate 2nd Year (+2)</option>
                  </>
                )}
              </select>
            </div>
            <div className="cms-field">
              <label>Group</label>
              <select value={attGroup} onChange={(e) => setAttGroup(e.target.value)}>
                {attGroups.length ? (
                  attGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">MPC (Maths, Physics, Chem)</option>
                    <option value="2">BiPC (Biology, Physics, Chem)</option>
                    <option value="3">MEC (Maths, Econ, Commerce)</option>
                  </>
                )}
              </select>
            </div>
            <div className="cms-field">
              <label>Section</label>
              <select value={attSection} onChange={(e) => setAttSection(e.target.value)}>
                {attSections.length ? (
                  attSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">Section A</option>
                    <option value="2">Section B</option>
                    <option value="3">Section C</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* View 1: Daily Attendance Table */}
      {attView === "daily" && (
        <div className="cms-card">
          <div className="cms-card-head">
            <h2>Student Attendance Sheet — {attDate}</h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {attDirty && (
                <span style={{ fontSize: 12, color: "var(--cms-amber)", fontWeight: 700 }}>● Unsaved Changes</span>
              )}
              <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>
                {attStudents.filter((s) => s.morningStatus === "Present").length} / {attStudents.length} Present
              </span>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ padding: "5px 12px", fontSize: 12.5 }}
                onClick={handleExportAttendanceSheet}
                title="Download whole class attendance sheet as Excel file"
              >
                <FileSpreadsheet size={14} /> Export Sheet
              </button>
            </div>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Morning Session</th>
                  <th>Afternoon Session</th>
                  <th>Remarks</th>
                  <th style={{ width: 60, textAlign: "center" }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {attStudents.map((s, idx) => (
                  <tr
                    key={s.studentId}
                    className={s.morningStatus === "Absent" && s.afternoonStatus === "Absent" ? "sp-absent-row" : ""}
                  >
                    <td className="cms-strong">{idx + 1}</td>
                    <td className="cms-strong">{s.rollNo}</td>
                    <td>{s.admissionNo}</td>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td>
                      <div className="sp-session-toggle">
                        {["Present", "Absent", "Half Day"].map((st) => (
                          <button
                            key={st}
                            className={`sp-session-btn ${st.toLowerCase().replace(" ", "")}${s.morningStatus === st ? " active" : ""}`}
                            style={
                              s.morningStatus === st
                                ? { transform: "scale(1.05)", fontWeight: 800 }
                                : { opacity: 0.6 }
                            }
                            onClick={() => toggleSessionStatus(s.studentId, "morning", st)}
                          >
                            {st === "Half Day" ? "HD" : st[0]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="sp-session-toggle">
                        {["Present", "Absent", "Half Day"].map((st) => (
                          <button
                            key={st}
                            className={`sp-session-btn ${st.toLowerCase().replace(" ", "")}${s.afternoonStatus === st ? " active" : ""}`}
                            style={
                              s.afternoonStatus === st
                                ? { transform: "scale(1.05)", fontWeight: 800 }
                                : { opacity: 0.6 }
                            }
                            onClick={() => toggleSessionStatus(s.studentId, "afternoon", st)}
                          >
                            {st === "Half Day" ? "HD" : st[0]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        style={{
                          border: "1px solid var(--cms-border)",
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 12,
                          width: 130,
                        }}
                        value={s.remarks || ""}
                        placeholder="Optional"
                        onChange={(e) => {
                          const val = e.target.value;
                          setAttStudents((prev) =>
                            prev.map((x) => (x.studentId === s.studentId ? { ...x, remarks: val } : x))
                          );
                          setAttDirty(true);
                        }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="cms-action-btn"
                        onClick={() => handleDownloadStudentSlip(s)}
                        title={`Download Attendance Slip for ${s.name}`}
                      >
                        <Download size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Monthly Report */}
      {attView === "monthly" && (
        <div className="cms-card">
          <div className="cms-card-head">
            <h2>Monthly Attendance Report</h2>
            <button className="cms-btn cms-btn-ghost" onClick={() => notify("Exporting monthly attendance CSV...")}>
              <Download size={14} /> Export CSV
            </button>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Total Classes</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attStudents.map((s) => (
                  <tr key={s.studentId}>
                    <td className="cms-strong">{s.rollNo}</td>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td>{s.totalClasses}</td>
                    <td style={{ color: "var(--cms-green)", fontWeight: 700 }}>{s.presentCount}</td>
                    <td style={{ color: "var(--cms-red)", fontWeight: 700 }}>
                      {s.totalClasses - s.presentCount}
                    </td>
                    <td style={{ fontWeight: 800 }}>{s.attendancePct}%</td>
                    <td>
                      <span className={`cms-badge ${s.attendancePct >= 75 ? "cms-badge-active" : "cms-badge-danger"}`}>
                        {s.attendancePct >= 75 ? "Eligible" : "Shortage"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Defaulters */}
      {attView === "defaulters" && (
        <div className="cms-card">
          <div className="cms-card-head">
            <div>
              <h2>Attendance Defaulters (&lt; 75% Attendance)</h2>
              <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>
                Students not meeting the board exam hall-ticket criteria
              </div>
            </div>
            <span className="cms-badge cms-badge-danger">
              {attStudents.filter((s) => s.attendancePct < 75).length} Defaulters
            </span>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Classes Attended</th>
                  <th>Attendance %</th>
                  <th>Shortage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {attStudents
                  .filter((s) => s.attendancePct < 75)
                  .map((s) => (
                    <tr key={s.studentId}>
                      <td className="cms-strong">{s.rollNo}</td>
                      <td>
                        <strong>{s.name}</strong>
                      </td>
                      <td>
                        {s.presentCount} / {s.totalClasses}
                      </td>
                      <td style={{ color: "var(--cms-red)", fontWeight: 800 }}>{s.attendancePct}%</td>
                      <td style={{ color: "var(--cms-red)" }}>{(75 - s.attendancePct).toFixed(1)}% Shortage</td>
                      <td>
                        <button
                          className="cms-btn cms-btn-ghost"
                          style={{ fontSize: 11.5, padding: "4px 8px" }}
                          onClick={() => notify(`Notice SMS sent to parent of ${s.name}`)}
                        >
                          Send Notice
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
