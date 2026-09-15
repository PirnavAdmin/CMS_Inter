import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ClipboardClock, FileSpreadsheet, Pencil, PieChart, Search, Upload, UserCheck, UserX, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./AttendancePage.css";

const STUDENT_STATUSES = ["Present", "Absent"];
const STAFF_STATUSES = ["Present", "Absent", "Leave", "Late"];
const LABEL = { 1: "Present", 2: "Absent", 3: "Late", 4: "Leave" }, VALUE = { Present: 1, Absent: 2, Late: 3, Leave: 4 };
const asList = (v) => Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : Array.isArray(v?.records) ? v.records : Array.isArray(v?.data) ? v.data : [];
const body = (r) => r?.data?.data ?? r?.data ?? r ?? {};
const get = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined && v !== null);
const num = (v) => v === "" || v == null ? undefined : Number(v);
const studentSessionStatus = (row, session) => status(get(row, `${session}Status`, `${session}AttendanceStatus`, `${session}SessionStatus`, session, `${session}Attendance`));
const getTodayDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const status = (v) => LABEL[v] ?? v ?? "—";
const staffType = (v) => {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  if (n === 1 || n === 2) return n;
  return /non/i.test(String(v)) ? 2 : 1;
};
const ATTENDANCE_PAGE_SIZE = 10;
const Field = ({ label, children }) => <label className="att-field"><span>{label}</span>{children}</label>;
function Select({ label, value, onChange, items = [], all, disabled = false }) { return <Field label={label}><select value={value} onChange={onChange} disabled={disabled}>{all ? <option value="">{all}</option> : null}{items.map((x) => { const id = get(x, "id", "Id", "sectionId", "programId", "groupId", "academicLevelId", "departmentId", "facultyId", "staffId", "academicYearId", "boardId") ?? x, name = get(x, "name", "Name", "sectionName", "programName", "programmeName", "groupName", "levelName", "departmentName", "staffName", "facultyName", "academicYearName", "boardName") ?? x; return <option key={String(id)} value={id}>{name}</option>; })}</select></Field>; }

function AttendancePagination({ page, totalRows, onPageChange }) {
 const totalPages = Math.max(1, Math.ceil(totalRows / ATTENDANCE_PAGE_SIZE));
 const currentPage = Math.min(page, totalPages);
 return <nav className="att-pagination" aria-label="Attendance pages"><button type="button" className="cms-btn cms-btn-ghost" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>Previous</button><span>Page {currentPage} of {totalPages}</span><button type="button" className="cms-btn cms-btn-ghost" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>Next</button></nav>;
}

export default function AttendancePage() { const { area = "student" } = useParams(), staff = area === "staff"; const [notice, setNotice] = useState({ message: "", type: "success" }), [importOpen, setImportOpen] = useState(false); const say = (message, type = "success") => setNotice({ message, type }); return <><DashboardLayout title={staff ? "Staff Attendance" : "Student Attendance"} subtitle={staff ? "View and manage teaching and non-teaching staff attendance" : "View and manage student attendance records"} breadcrumb={["Operations", "Attendance"]} actions={<button type="button" className="cms-btn cms-btn-primary attendance-import-trigger" onClick={() => setImportOpen(true)}><Upload size={16} /> Import Attendance</button>}><main className="attendance-module">{staff ? <Screen staff say={say} /> : <Screen say={say} />}</main></DashboardLayout>{importOpen && <AttendanceImportModal staff={staff} say={say} onClose={() => setImportOpen(false)} />}<Toast message={notice.message} type={notice.type} onClose={() => setNotice({ message: "", type: "success" })} /></>; }

function AttendanceImportModal({ staff, say, onClose }) {
  const [file, setFile] = useState(null), [fileError, setFileError] = useState(""), [validated, setValidated] = useState(false);
  const [busy, setBusy] = useState(false), [results, setResults] = useState(null);

  const label = staff ? "Staff" : "Student";
  const sheets = staff ? ["Instructions", "Staff Attendance", "Staff Master Data"] : ["Instructions", "Student Attendance", "Academic Master Data"];
  const columns = staff ? ["Attendance Date", "Staff ID", "Staff Name", "Department", "Designation", "Staff Type", "Check-In Time", "Check-Out Time", "Attendance Status", "Remarks"] : ["Attendance Date", "Admission No", "Student Name", "Session", "Attendance Status", "Remarks"];

  const downloadTemplate = async () => {
    try {
      const endpoint = staff ? apiEndpoints.staffAttendance.importTemplate : apiEndpoints.attendance.importTemplate;
      const response = await apiClient.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', staff ? 'StaffAttendance_Template.xlsx' : 'StudentAttendance_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      say(getApiErrorMessage(error, "Failed to download template"), "error");
    }
  };

  const chooseFile = (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    if (!/\.xlsx$/i.test(selected.name)) {
      setFile(null);
      setFileError("Choose a valid .xlsx Excel file.");
      return;
    }
    setFile(selected);
    setFileError("");
    setValidated(false);
    setResults(null);
  };

  const processFile = async (validateOnly) => {
    if (!file) { setFileError("Choose an Excel file first."); return; }
    
    setBusy(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const endpoint = staff ? apiEndpoints.staffAttendance.importExcel : apiEndpoints.attendance.importExcel;
      const res = await apiClient.post(`${endpoint}?validateOnly=${validateOnly}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const data = res.data.data || res.data;
      if (validateOnly) {
        setResults(data);
        setValidated(true);
      } else {
        say("Attendance imported successfully!", "success");
        onClose();
      }
    } catch (error) {
      say(getApiErrorMessage(error, "Import failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const hasErrors = results && results.errors && results.errors.length > 0;

  return <Modal title={`${label} Attendance Import`} className="attendance-import-modal" onClose={onClose} footer={<><button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="cms-btn cms-btn-primary" disabled={!validated || hasErrors || busy} onClick={() => processFile(false)}>{busy && validated ? "Importing..." : "Import Attendance"}</button></>}><div className="attendance-import-flow">
    <section><div className="attendance-import-step"><b>1</b><div><strong>Download Attendance Template</strong><p>Download the standard Excel format for bulk attendance upload.</p></div></div><button type="button" className="cms-btn cms-btn-ghost" onClick={downloadTemplate}><FileSpreadsheet size={16} /> Download Template</button></section>
    <section><div className="attendance-import-step"><b>2</b><div><strong>Upload Attendance File</strong><p>Choose one .xlsx file containing the attendance records.</p></div></div><label className="attendance-import-file"><Upload size={16} /><span>Choose Excel File</span><input type="file" accept=".xlsx" onChange={chooseFile} disabled={busy} /></label>{file && <small className="attendance-import-file-name">{file.name}</small>}{fileError && <small className="attendance-import-error">{fileError}</small>}</section>
    <section><div className="attendance-import-step"><b>3</b><div><strong>Validate File</strong><p>Run a dry validation preview before importing.</p></div></div><button type="button" className="cms-btn cms-btn-primary" disabled={!file || busy} onClick={() => processFile(true)}>{busy && !validated ? "Validating..." : "Validate File"}</button></section>
    <details className="attendance-import-template"><summary>Template Structure</summary><ol>{sheets.map((sheet) => <li key={sheet}>{sheet}</li>)}</ol><p>{columns.join(" · ")}</p></details>
    
    {validated && results && <section className="attendance-import-results">
      <div className="attendance-import-step"><b>4</b><div><strong>Validation Summary</strong><p>{hasErrors ? "Fix the errors below and upload again." : "Validation passed! You can now import the data."}</p></div></div>
      <div className="attendance-import-summary"><span>Total Rows <b>{results.total}</b></span><span className="is-valid">Valid Rows <b>{results.valid}</b></span><span className="is-error">Error Rows <b>{results.errors.length}</b></span></div>
      
      {hasErrors && <div className="att-scroll"><table className="cms-table"><thead><tr><th>Row</th><th>{staff ? "Staff ID" : "Admission No"}</th><th>{label} Name</th><th>Date</th><th>Result</th><th>Message</th></tr></thead><tbody>
        {results.errors.map(([row, id, name, date, message], idx) => <tr key={idx}><td>{row}</td><td>{id}</td><td>{name}</td><td>{date}</td><td><span className="attendance-import-badge error">Error</span></td><td>{message}</td></tr>)}
      </tbody></table></div>}
      {hasErrors && <small className="attendance-import-error">Fix validation errors before importing.</small>}
    </section>}
  </div></Modal>;
}

function useOptions(staff) { const [o, setO] = useState({}); useEffect(() => { if (!staff) return undefined; let mounted = true; const calls = [apiEndpoints.departments.getAll, apiEndpoints.faculty.list]; Promise.allSettled(calls.map((url) => apiClient.get(url))).then((rs) => { if (!mounted) return; const values = rs.map((r) => r.status === "fulfilled" ? asList(body(r.value)) : []); setO({ departments: values[0], faculty: values[1] }); }); return () => { mounted = false; }; }, [staff]); return o; }

function useStudentOptions(boardId, academicYearId, levelId, groupId, programId) {
  const [options, setOptions] = useState({ levels: [], groups: [], programs: [], sections: [], loadingLevels: false, loadingGroups: false, loadingPrograms: false, loadingSections: false });
  const scoped = (rows, selected, keys) => rows.filter((row) => {
    const rowValue = get(row, ...keys);
    return rowValue == null || rowValue === "" || String(rowValue) === String(selected);
  });
  const unique = (rows, keys) => {
    const seen = new Set();
    return rows.filter((row) => {
      const id = String(get(row, ...keys) ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };
  useEffect(() => {
    if (!boardId) { setOptions((value) => ({ ...value, levels: [], groups: [], programs: [], sections: [] })); return undefined; }
    let active = true;
    setOptions((value) => ({ ...value, levels: [], loadingLevels: true }));
    apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId } })
      .then((response) => active && setOptions((value) => ({ ...value, levels: unique(scoped(asList(body(response)), boardId, ["boardId", "BoardId"]), ["academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"]), loadingLevels: false })))
      .catch(() => active && setOptions((value) => ({ ...value, levels: [], loadingLevels: false })));
    return () => { active = false; };
  }, [boardId]);
  useEffect(() => {
    if (!boardId) { setOptions((value) => ({ ...value, groups: [], loadingGroups: false })); return undefined; }
    let active = true;
    setOptions((value) => ({ ...value, groups: [], loadingGroups: true }));
    const params = { academicYearId, isActive: true };
    if (levelId) params.academicLevelId = levelId;
    apiClient.get(apiEndpoints.groups.getByBoard(boardId), { params }).then((response) => {
      if (!active) return;
      const payload = body(response);
      const wrappers = asList(payload);
      let groupRows = Array.isArray(payload?.groups) ? payload.groups : Array.isArray(payload?.Groups) ? payload.Groups : wrappers.flatMap((item) => Array.isArray(item?.groups) ? item.groups : Array.isArray(item?.Groups) ? item.Groups : Array.isArray(item?.groupList) ? item.groupList : Array.isArray(item?.data) ? item.data : get(item, "groupId", "GroupId", "id", "Id") != null ? [item] : []);
      groupRows = scoped(scoped(groupRows, boardId, ["boardId", "BoardId"]), academicYearId, ["academicYearId", "AcademicYearId"]);
      if (levelId) {
        groupRows = scoped(groupRows, levelId, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId"]);
      }
      setOptions((value) => ({ ...value, groups: unique(groupRows.filter((item) => item?.isActive !== false && item?.IsActive !== false), ["groupId", "GroupId", "id", "Id"]), loadingGroups: false }));
    }).catch(() => active && setOptions((value) => ({ ...value, groups: [], loadingGroups: false })));
    return () => { active = false; };
  }, [boardId, academicYearId, levelId]);
  useEffect(() => {
    let active = true;
    setOptions((value) => ({ ...value, programs: [], loadingPrograms: true }));
    const endpoint = groupId ? apiEndpoints.groups.programs(groupId) : apiEndpoints.programs.getAll;
    apiClient.get(endpoint)
      .then((response) => {
        if (!active) return;
        let progRows = asList(body(response));
        if (groupId) {
          progRows = scoped(progRows, groupId, ["groupId", "GroupId"]);
        }
        setOptions((value) => ({
          ...value,
          programs: unique(progRows, ["programId", "ProgramId", "programmeId", "ProgrammeId", "groupProgramId", "GroupProgramId", "id", "Id"]),
          loadingPrograms: false
        }));
      })
      .catch(() => active && setOptions((value) => ({ ...value, programs: [], loadingPrograms: false })));
    return () => { active = false; };
  }, [groupId]);
  useEffect(() => {
    let active = true;
    const selectedProgram = options.programs.find((program) => String(get(program, "id", "Id", "programId", "ProgramId", "programmeId", "ProgrammeId", "groupProgramId", "GroupProgramId")) === String(programId));
    const validProgramIds = new Set([programId, get(selectedProgram, "programId", "ProgramId", "programmeId", "ProgrammeId"), get(selectedProgram, "groupProgramId", "GroupProgramId")].filter((id) => id != null && id !== "").map(String));
    const selectedProgramName = String(get(selectedProgram, "programName", "ProgramName", "programmeName", "ProgrammeName", "name", "Name") ?? "").trim().toLowerCase();
    setOptions((value) => ({ ...value, sections: [], loadingSections: true }));
    const params = { boardId, academicYearId, isActive: true, IsActive: true };
    if (levelId) params.academicLevelId = levelId;
    if (groupId) params.groupId = groupId;
    if (programId) {
      params.programId = programId;
      params.ProgramId = programId;
    }
    apiClient.get(apiEndpoints.sections.list, { params }).then((response) => {
      if (!active) return;
      let sectionRows = asList(body(response));
      sectionRows = scoped(scoped(scoped(scoped(sectionRows, boardId, ["boardId", "BoardId"]), academicYearId, ["academicYearId", "AcademicYearId"]), levelId, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId"]), groupId, ["groupId", "GroupId"]);
      if (programId) {
        sectionRows = sectionRows.filter((section) => {
          const sectionProgramIds = [get(section, "programId", "ProgramId", "programmeId", "ProgrammeId"), get(section, "groupProgramId", "GroupProgramId")].filter((id) => id != null && id !== "").map(String);
          if (sectionProgramIds.length) return sectionProgramIds.some((id) => validProgramIds.has(id));
          const sectionProgramName = String(get(section, "programName", "ProgramName", "programmeName", "ProgrammeName", "programme", "Programme", "program", "Program") ?? "").trim().toLowerCase();
          return Boolean(selectedProgramName && sectionProgramName === selectedProgramName);
        });
      }
      setOptions((value) => ({ ...value, sections: unique(sectionRows.filter((section) => section?.isActive !== false && section?.IsActive !== false), ["sectionId", "SectionId", "id", "Id"]), loadingSections: false }));
    }).catch(() => active && setOptions((value) => ({ ...value, sections: [], loadingSections: false })));
    return () => { active = false; };
  }, [boardId, academicYearId, levelId, groupId, programId, options.programs]);
  return options;
}

function Screen({ staff = false, say }) {
 const navigate = useNavigate();
 const { selectedBoardId: navbarBoardId, selectedAcademicYearId: navbarAcademicYearId } = useAcademicContext(); const [f, setF] = useState({ date: getTodayDate(), level: "", group: "", section: "", program: "", department: "", type: "", person: "", status: "", view: "Attendance" }), [rows, setRows] = useState([]), [report, setReport] = useState(null), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [editing, setEditing] = useState(null), [search, setSearch] = useState(""), [page, setPage] = useState(1); const staffOptions = useOptions(staff), studentOptions = useStudentOptions(staff ? "" : navbarBoardId, navbarAcademicYearId, f.level, f.group, f.program); const options = staff ? staffOptions : studentOptions;
 const update = (key) => (e) => { setPage(1); setF((old) => ({ ...old, [key]: e.target.value, ...(key === "level" ? { group: "", program: "", section: "" } : {}), ...(key === "group" ? { program: "", section: "" } : {}), ...(key === "program" ? { section: "" } : {}) })); };
 const switchView = (newView) => { setPage(1); setF((old) => ({ ...old, view: newView })); if (loaded) { load(newView); } };
 useEffect(() => { if (!staff) setF((old) => ({ ...old, level: "", group: "", program: "", section: "" })); }, [staff, navbarBoardId, navbarAcademicYearId]);
 const monthParams = () => { const [year, month] = f.date.slice(0, 7).split("-"); return staff ? { month: Number(month), year: Number(year), academicYearId: num(navbarAcademicYearId), departmentId: num(f.department), staffType: staffType(f.type), ...(f.person ? { facultyId: num(f.person) } : {}) } : { month: Number(month), year: Number(year), boardId: num(navbarBoardId), academicYearId: num(navbarAcademicYearId), academicLevelId: num(f.level), groupId: num(f.group), sectionId: num(f.section), ...(f.program ? { programId: num(f.program) } : {}) }; };
 const load = async (overrideView) => { const currentView = typeof overrideView === "string" ? overrideView : f.view; setPage(1); setBusy(true); try { if (currentView === "Monthly Report") { const r = await apiClient.get(staff ? apiEndpoints.staffAttendance.monthlyReport : apiEndpoints.attendance.studentMonthlyReport, { params: monthParams() }); setReport(body(r)); } else if (!staff && currentView === "Defaulters") { const r = await apiClient.get(apiEndpoints.attendance.studentDefaulters, { params: { ...monthParams(), threshold: 75 } }); setRows(asList(body(r))); } else if (staff) { const r = await apiClient.post(apiEndpoints.staffAttendance.load, { date: f.date, academicYearId: num(navbarAcademicYearId), departmentId: num(f.department), staffType: staffType(f.type), ...(f.status ? { status: VALUE[f.status] } : {}), ...(f.person ? { facultyId: num(f.person) } : {}) }); setRows(asList(body(r))); } else { const r = await apiClient.get(apiEndpoints.attendance.studentAdminDaily, { params: { date: f.date, boardId: num(navbarBoardId), academicYearId: num(navbarAcademicYearId), academicLevelId: num(f.level), groupId: num(f.group), sectionId: num(f.section), ...(f.program ? { programId: num(f.program) } : {}) } }); setRows(asList(body(r))); } setLoaded(true); } catch (e) { say(getApiErrorMessage(e) || `Failed to load ${staff ? "staff" : "student"} attendance.`, "error"); } finally { setBusy(false); } };
 const save = async () => { const r = editing.record; const changed = staff ? editing.status !== status(r.status) : editing.morning !== status(r.morningStatus) || editing.afternoon !== status(r.afternoonStatus); if (!changed) return setEditing(null); if (!editing.remarks.trim()) return say("Reason / remark is required when attendance changes.", "error"); setBusy(true); try { if (staff) await apiClient.put(apiEndpoints.staffAttendance.update, { facultyId: get(r, "facultyId", "staffId", "id"), attendanceDate: f.date, departmentId: num(f.department) ?? get(r, "departmentId"), staffType: staffType(f.type) ?? get(r, "staffType"), status: VALUE[editing.status], inTime: editing.inTime || null, outTime: editing.outTime || null, remarks: editing.remarks }); else await apiClient.put(apiEndpoints.attendance.studentUpdate, { studentId: get(r, "studentId", "id"), attendanceDate: f.date, morningStatus: editing.morning !== status(r.morningStatus) ? VALUE[editing.morning] : null, afternoonStatus: editing.afternoon !== status(r.afternoonStatus) ? VALUE[editing.afternoon] : null, boardId: num(navbarBoardId), academicYearId: num(navbarAcademicYearId), academicLevelId: num(f.level), groupId: num(f.group), sectionId: num(f.section), ...(f.program ? { programId: num(f.program) } : {}), remarks: editing.remarks }); setEditing(null); say(`${staff ? "Staff" : "Student"} attendance updated successfully.`); await load(); } catch (e) { say(getApiErrorMessage(e) || "Failed to update attendance.", "error"); } finally { setBusy(false); } };
 const exportReport = async (kind) => { setBusy(true); try { const endpoint = staff ? kind === "csv" ? apiEndpoints.staffAttendance.monthlyExportCsv : apiEndpoints.staffAttendance.monthlyExport : kind === "csv" ? apiEndpoints.attendance.studentMonthlyExportCsv : apiEndpoints.attendance.studentMonthlyExportExcel; const r = await apiClient.get(endpoint, { params: monthParams(), responseType: "blob" }); const url = URL.createObjectURL(r.data), a = document.createElement("a"); a.href = url; a.download = `${staff ? "staff" : "student"}-attendance-${f.date.slice(0, 7)}.${kind === "csv" ? "csv" : "xlsx"}`; a.click(); URL.revokeObjectURL(url); } catch (e) { say(getApiErrorMessage(e) || "Failed to export monthly report.", "error"); } finally { setBusy(false); } };
 const normalizedSearch = search.trim().toLowerCase();
 const visible = rows.filter((r) => {
   if (!normalizedSearch) return true;
   if (staff) return `${get(r, "staffName", "facultyName")} ${get(r, "facultyId", "staffId")}`.toLowerCase().includes(normalizedSearch);
   return [get(r, "studentName", "name"), get(r, "rollNo", "rollNumber"), get(r, "admissionNo", "admissionNumber"), get(r, "studentId", "id")]
     .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
 }).filter((r) => staff || !f.status || [status(r.morningStatus), status(r.afternoonStatus)].includes(f.status));
 const totalPages = Math.max(1, Math.ceil(visible.length / ATTENDANCE_PAGE_SIZE));
 const currentPage = Math.min(page, totalPages);
 const pagedRows = visible.slice((currentPage - 1) * ATTENDANCE_PAGE_SIZE, currentPage * ATTENDANCE_PAGE_SIZE);
 useEffect(() => { setPage((current) => Math.min(current, totalPages)); }, [totalPages]);
 return <><Filters f={f} update={update} o={options} staff={staff} busy={busy} load={load} exportReport={exportReport} /><AttendanceViewSection view={f.view} update={switchView} staff={staff} />{busy && !loaded ? <Loader label="Loading attendance..." /> : null}{loaded && (f.view === "Monthly Report" ? <Monthly data={report} staff={staff} monthValue={f.date} page={page} onPageChange={setPage} search={search} onSearchChange={setSearch} /> : !staff && f.view === "Defaulters" ? <Defaulters rows={rows} /> : <>{staff ? <StaffSummary rows={visible} /> : <StudentSummary rows={visible} />}<section className="att-card att-table-card"><div className="att-student-search"><div className="att-student-search-box"><Search size={21} aria-hidden="true" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={staff ? "Search by staff name or staff ID" : "Search by student name, roll no. or admission no."} /></div></div><DailyTable rows={pagedRows} staff={staff} emptyMessage={!staff && normalizedSearch ? "No students found matching your search." : undefined} edit={(record) => setEditing(staff ? { record, status: status(record.status), inTime: get(record, "inTime") || "", outTime: get(record, "outTime") || "", remarks: get(record, "remarks", "remark") || "" } : { record, morning: status(record.morningStatus), afternoon: status(record.afternoonStatus), remarks: get(record, "remarks", "remark") || "" })} view={(record) => { const personId = staff ? get(record, "facultyId", "staffId", "id") : get(record, "studentId", "id"); if (personId != null) navigate(`/dashboard/attendance/${staff ? "staff" : "student"}/${personId}/overview`); }} /><AttendancePagination page={currentPage} totalRows={visible.length} onPageChange={setPage} /></section></>) }{editing ? <Edit editing={editing} setEditing={setEditing} staff={staff} date={f.date} save={save} close={() => setEditing(null)} busy={busy} /> : null}</>;
}

function Filters({ f, update, o, staff, busy, load, exportReport }) {
  const isMonth = f.view === "Monthly Report";
  const label = new Date(`${f.date.slice(0, 7)}-01T00:00:00`)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .replace(" ", ", ");
  return <section className="att-card att-filter-card">
    <div className={`att-filter-grid ${staff ? "att-staff-filter-grid" : "att-student-filter-grid"}`}>
      {isMonth ? <Field label="Month"><div className="att-month-picker"><span>{label}</span><CalendarDays size={18} /><input type="month" value={f.date.slice(0, 7)} onChange={(event) => update("date")({ target: { value: `${event.target.value}-01` } })} /></div></Field> : <Field label="Date"><input type="date" value={f.date} onChange={update("date")} /></Field>}
      {staff ? <>
        <Select label="Staff Type" value={f.type} onChange={update("type")} items={[{ id: "1", name: "Teaching Staff" }, { id: "2", name: "Non-Teaching Staff" }]} all="All Staff" />
        <Select label="Department" value={f.department} onChange={update("department")} items={o.departments} all="All Departments" />
        <Select label="Staff" value={f.person} onChange={update("person")} items={(o.faculty || []).map((item) => ({ id: get(item, "facultyId", "id"), name: `${get(item, "staffName", "name")} (${get(item, "facultyId", "id")})` }))} all="All Staff" />
      </> : <>
        <Select label="Academic Level" value={f.level} onChange={update("level")} items={o.levels} all={o.loadingLevels ? "Loading academic levels..." : "All Academic Levels"} disabled={o.loadingLevels} />
        <Select label="Group" value={f.group} onChange={update("group")} items={o.groups} all={o.loadingGroups ? "Loading groups..." : "All Groups"} disabled={o.loadingGroups} />
        <Select label="Program" value={f.program} onChange={update("program")} items={o.programs} all={o.loadingPrograms ? "Loading programs..." : "All Programs"} disabled={o.loadingPrograms} />
        <Select label="Section" value={f.section} onChange={update("section")} items={o.sections} all={o.loadingSections ? "Loading sections..." : "All Sections"} disabled={o.loadingSections} />
      </>}
      <Select label="Status" value={f.status} onChange={update("status")} items={staff ? STAFF_STATUSES : STUDENT_STATUSES} all="All Status" />
      <div className="att-filter-action"><button className="cms-btn cms-btn-primary" disabled={busy} onClick={() => load()}>{busy ? "Loading..." : "Get Records"}</button>{isMonth ? <button type="button" className="cms-btn cms-btn-ghost" disabled={busy} onClick={() => exportReport("excel")}>Export</button> : null}</div>
    </div>
  </section>;
}

function AttendanceViewSection({ view, update, staff }) {
  return <div className="attendance-view-section"><span className="attendance-view-label">View</span><div className="attendance-view-tabs" role="tablist" aria-label="Attendance view"><button type="button" role="tab" aria-selected={view === "Attendance"} className={view === "Attendance" ? "active" : ""} onClick={() => update("Attendance")}>Attendance</button><button type="button" role="tab" aria-selected={view === "Monthly Report"} className={view === "Monthly Report" ? "active" : ""} onClick={() => update("Monthly Report")}>Monthly Report</button>{!staff && <button type="button" role="tab" aria-selected={view === "Defaulters"} className={view === "Defaulters" ? "active" : ""} onClick={() => update("Defaulters")}>Defaulters</button>}</div></div>;
}

function StudentSummary({ rows }) { const perStudent = rows.map((r) => { const m = studentSessionStatus(r, "morning"), a = studentSessionStatus(r, "afternoon"); if (m === "Present" && a === "Present") return "Present"; if ((m === "Present" && a !== "Present" && a !== "—") || (a === "Present" && m !== "Present" && m !== "—")) return "Half-Day"; if (m === "Present" || a === "Present") return "Present"; if (m === "Absent" || a === "Absent") return "Absent"; return "—"; }).filter((x) => x !== "—"), p = perStudent.filter((x) => x === "Present").length, hd = perStudent.filter((x) => x === "Half-Day").length; return <Summary student data={[["Total Students", rows.length], ["Present", p], ["Absent", perStudent.filter((x) => x === "Absent").length], ["Half-Day", hd], ["Attendance %", perStudent.length ? `${Math.round((p + 0.5 * hd) * 100 / perStudent.length)}%` : "0%"]]} />; }
function StaffSummary({ rows }) { return <Summary student data={[["Total Staff", rows.length], ...STAFF_STATUSES.map((x) => [x, rows.filter((r) => status(r.status) === x).length])]} />; }
const studentSummaryIcons = { "Total Students": Users, "Total Staff": Users, Present: UserCheck, Absent: UserX, "Half-Day": ClipboardClock, Late: ClipboardClock, "Attendance %": PieChart };
function Summary({ data, student = false }) { return <section className={`att-summary ${student ? "att-student-summary" : ""}`}>{data.map(([l, v]) => { const Icon = studentSummaryIcons[l]; return <div key={l} className={`att-summary-card att-summary-${String(l).toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`}>{student && Icon ? <span className="att-summary-icon"><Icon size={25} strokeWidth={2.1} /></span> : null}<div className="att-summary-copy"><span>{l}</span><b>{v}</b></div></div>; })}</section>; }
function DailyTable({ rows, staff, edit, view, emptyMessage }) { const roll = !staff && rows.some((r) => get(r, "rollNo", "rollNumber") != null), admission = !staff && rows.some((r) => get(r, "admissionNo", "admissionNumber") != null); return <div className="att-scroll"><table className="cms-table att-table"><thead><tr>{staff ? <><th>Staff ID</th><th>Staff Name</th><th>Department</th><th>Designation</th><th>Status</th><th>In Time</th><th>Out Time</th></> : <><th>Student Name</th>{roll ? <th>Roll No</th> : null}{admission ? <th>Admission No</th> : null}<th>Group</th><th>Section</th><th>Morning</th><th>Afternoon</th></>}<th>Action</th></tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={get(r, staff ? "facultyId" : "studentId", "id") ?? i}>{staff ? <><td>{get(r, "facultyId", "staffId")}</td><td>{get(r, "staffName", "facultyName")}</td><td>{get(r, "departmentName", "department") || "—"}</td><td>{get(r, "designationName", "staffTypeName") || "—"}</td><td><Pill value={status(r.status)} /></td><td>{get(r, "inTime") || "—"}</td><td>{get(r, "outTime") || "—"}</td></> : <><td>{get(r, "studentName", "name")}</td>{roll ? <td>{get(r, "rollNo", "rollNumber") || "—"}</td> : null}{admission ? <td>{get(r, "admissionNo", "admissionNumber") || "—"}</td> : null}<td>{get(r, "groupName") || "—"}</td><td>{get(r, "sectionName") || "—"}</td><td><Pill value={studentSessionStatus(r, "morning")} /></td><td><Pill value={studentSessionStatus(r, "afternoon")} /></td></>}<td>{view ? <button className="cms-action-btn" title="View Overview" aria-label="View Overview" onClick={() => view(r)}><PieChart size={16} /></button> : null}<button className="cms-action-btn" title="Edit Attendance" aria-label="Edit Attendance" onClick={() => edit(r)}><Pencil size={16} /></button></td></tr>) : <tr><td colSpan="9"><div className="cms-empty">{emptyMessage || "No attendance records match the selected filters."}</div></td></tr>}</tbody></table></div>; }
function Pill({ value }) { const label = value === "Present" ? "P" : value === "Absent" ? "A" : value === "Leave" ? "L" : value === "Late" ? "LT" : "—"; return <span className={`att-status-pill ${value === "Present" ? "att-month-p" : value === "Absent" ? "att-month-a" : value === "Leave" ? "att-month-lv" : value === "Late" ? "att-month-l" : "att-month-off"}`}>{label}</span>; }
function Edit({ editing, setEditing, staff, date, save, close, busy }) { const r = editing.record; return <Modal title={`Edit ${staff ? "Staff" : "Student"} Attendance`} onClose={close} footer={<><button className="cms-btn cms-btn-ghost" disabled={busy} onClick={close}>Cancel</button><button className="cms-btn cms-btn-primary" disabled={busy} onClick={save}>{busy ? "Saving..." : "Save Changes"}</button></>}><div className="att-modal-fields"><p><b>{get(r, staff ? "staffName" : "studentName", "name")}</b></p><p>{staff ? `Staff ID: ${get(r, "facultyId", "staffId")}` : `Roll No: ${get(r, "rollNo", "rollNumber") || "—"} · Admission No: ${get(r, "admissionNo", "admissionNumber") || "—"}`} · Date: {date}</p><p>{staff ? `Department: ${get(r, "departmentName") || "—"} · Designation: ${get(r, "designationName") || "—"}` : `Group: ${get(r, "groupName") || "—"} · Section: ${get(r, "sectionName") || "—"}`}</p>{staff ? <><p>Current Status: {status(r.status)}</p><Select label="New Status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} items={STAFF_STATUSES} /><div className="att-time-fields"><Field label="In Time"><input type="time" value={editing.inTime} onChange={(e) => setEditing({ ...editing, inTime: e.target.value })} /></Field><Field label="Out Time"><input type="time" value={editing.outTime} onChange={(e) => setEditing({ ...editing, outTime: e.target.value })} /></Field></div></> : <><div className="att-detail-history"><b>Session Attendance</b><div className="att-time-fields"><Select label="Morning" value={editing.morning} onChange={(e) => setEditing({ ...editing, morning: e.target.value })} items={STUDENT_STATUSES} /><Select label="Afternoon" value={editing.afternoon} onChange={(e) => setEditing({ ...editing, afternoon: e.target.value })} items={STUDENT_STATUSES} /></div></div><div className="att-detail-history"><b>Period Attendance</b><p>Period details are not returned by the attendance API.</p></div></>}<Field label="Reason / Remark"><textarea value={editing.remarks} onChange={(e) => setEditing({ ...editing, remarks: e.target.value })} /></Field></div></Modal>; }
function monthlyDate(header, index, monthValue) { const raw = get(header, "date", "Date") ?? header; const parsed = new Date(`${String(raw).slice(0, 10)}T00:00:00`); if (!Number.isNaN(parsed.getTime())) return parsed; const [year, month] = String(monthValue || "").slice(0, 7).split("-").map(Number); return new Date(year || new Date().getFullYear(), (month || 1) - 1, index + 1); }
function MonthlyPill({ value, staff }) {
  const raw = String(value ?? "-").trim().toUpperCase();
  const normalized = (raw === "PRESENT" || raw === "P") ? "P"
    : (raw === "ABSENT" || raw === "A") ? "A"
    : (raw === "HD" || raw === "HALFDAY" || raw === "HALF-DAY" || (!staff && (raw === "LEAVE" || raw === "LV" || raw === "LATE" || raw === "LT" || raw === "L"))) ? "HD"
    : (raw === "LEAVE" || raw === "LV" || raw === "L") ? (staff ? "L" : "HD")
    : (raw === "LATE" || raw === "LT") ? (staff ? "LT" : "HD")
    : "-";
  const type = normalized === "P" ? "att-month-p"
    : normalized === "A" ? "att-month-a"
    : normalized === "L" || normalized === "HD" ? "att-month-lv"
    : normalized === "LT" ? "att-month-l"
    : "att-month-off";
  return <span className={`att-month-status ${type}`}>{normalized}</span>;
}
function Monthly({ data, staff, monthValue, page, onPageChange, search = "", onSearchChange = () => {} }) {
  const headers = data?.dayHeaders ?? data?.headers ?? [], rawRows = data?.studentRows ?? data?.staffRows ?? data?.rows ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const rows = rawRows.filter((r) => {
    if (!normalizedSearch) return true;
    if (staff) return `${get(r, "staffName", "facultyName")} ${get(r, "facultyId", "staffId")}`.toLowerCase().includes(normalizedSearch);
    return [get(r, "studentName", "name"), get(r, "rollNo", "rollNumber"), get(r, "admissionNo", "admissionNumber"), get(r, "studentId", "id")]
      .some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / ATTENDANCE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * ATTENDANCE_PAGE_SIZE, currentPage * ATTENDANCE_PAGE_SIZE);
  return <section className="att-card att-month-card">
    <header className="att-month-header">
      <div><h3>{staff ? "Staff" : "Student"} Monthly Attendance</h3><p>{headers.length} days · {rows.length} {staff ? "staff" : "students"}</p></div>
      <div className="att-month-legend"><span><i className="att-month-p">P</i> Present</span><span><i className="att-month-a">A</i> Absent</span>{staff ? <span><i className="att-month-lv">L</i> Leave</span> : <span><i className="att-month-lv">HD</i> Half-Day</span>}{staff ? <span><i className="att-month-l">LT</i> Late</span> : null}<span><i className="att-month-off">-</i> Non-working day</span></div>
    </header>
    <div className="att-student-search" style={{ padding: "0 1.25rem 1rem" }}>
      <div className="att-student-search-box">
        <Search size={21} aria-hidden="true" />
        <input value={search} onChange={(e) => { onSearchChange(e.target.value); onPageChange(1); }} placeholder={staff ? "Search by staff name or staff ID" : "Search by student name, roll no. or admission no."} />
      </div>
    </div>
    <div className="att-month-scroll"><table className="cms-table att-month-table"><thead><tr><th className="att-sticky-roll">{staff ? "Staff ID" : "Student ID"}</th><th className="att-sticky-name">{staff ? "Staff Name" : "Student Name"}</th>{headers.map((h, i) => { const date = monthlyDate(h, i, monthValue); return <th key={i} className="att-month-day"><b>{date.getDate()}</b><small>{date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</small></th>; })}<th>Present</th><th>Absent</th>{staff ? <th>Leave</th> : <th>Half-Day</th>}{staff ? <><th>Late</th><th>Working Days</th></> : null}<th>Attendance %</th></tr></thead><tbody>{pagedRows.length ? pagedRows.map((r, i) => <MonthRow key={get(r, staff ? "facultyId" : "studentId", "id") ?? i} r={r} headers={headers} staff={staff} />) : <tr><td colSpan={headers.length + (staff ? 9 : 7)}><div className="cms-empty">No attendance records match the selected filters.</div></td></tr>}</tbody></table></div>
    <AttendancePagination page={currentPage} totalRows={rows.length} onPageChange={onPageChange} />
  </section>;
}
function MonthRow({ r, headers, staff }) { const ds = r.dailyStatus ?? r.statuses ?? [], p = r.present ?? r.presentCount ?? ds.filter((x) => x === "P").length, a = r.absent ?? r.absentCount ?? ds.filter((x) => x === "A").length, lv = r.leave ?? r.leaveCount ?? ds.filter((x) => x === "LV" || x === "L").length, hd = r.halfDays ?? r.halfDayCount ?? ds.filter((x) => x === "HD").length, l = r.late ?? r.lateCount ?? ds.filter((x) => x === "L" || x === "LT").length, work = r.workingDays ?? ds.filter((x) => !["-", "H"].includes(x)).length, pc = r.attendancePercentage ?? (work ? Math.round((p + (staff ? l : 0.5 * hd)) * 100 / work) : 0); return <tr><td className="att-sticky-roll">{staff ? get(r, "facultyId", "staffId") : get(r, "studentId", "id") || get(r, "rollNo", "rollNumber") || "—"}</td><td className="att-sticky-name">{get(r, staff ? "staffName" : "studentName", "name")}</td>{headers.map((_, i) => <td key={i} className="att-month-day"><MonthlyPill value={ds[i] ?? "-"} staff={staff} /></td>)}<td>{p}</td><td>{a}</td><td>{staff ? lv : hd}</td>{staff ? <><td>{l}</td><td>{work}</td></> : null}<td>{pc}%</td></tr>; }
function Defaulters({ rows }) { return <section className="att-card att-table-card"><div className="att-scroll"><table className="cms-table att-table"><thead><tr><th>Student Name</th><th>Roll No</th><th>Admission No</th><th>Group</th><th>Section</th><th>Attendance %</th></tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={get(r, "studentId", "id") ?? i}><td>{get(r, "studentName", "name")}</td><td>{get(r, "rollNo", "rollNumber") || "—"}</td><td>{get(r, "admissionNo", "admissionNumber") || "—"}</td><td>{get(r, "groupName") || "—"}</td><td>{get(r, "sectionName") || "—"}</td><td>{get(r, "attendancePercentage", "percentage") ?? "—"}%</td></tr>) : <tr><td colSpan="6"><div className="cms-empty">No students are below this threshold.</div></td></tr>}</tbody></table></div></section>; }
