import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import Page from "../layout/ExamCellPageLayout.jsx";
import { payload, records } from "./Dashboard.jsx";

export default function HallAllocation() {
  const { selectedCampusId } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [date, setDate] = useState("");
  const [session, setSession] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState(null);
  const [slotId, setSlotId] = useState("");
  useEffect(() => {
    let active = true;
    setExamId(""); setExams([]); setError("");
    api.get(apiEndpoints.examinations.getAll, { params: { campusId: selectedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId, pageSize: 1000 } }).then((res) => { if (active) setExams(records(res)); }).catch((error) => { if (active) setError(getApiErrorMessage(error) || "Unable to load examinations."); });
    return () => { active = false; };
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    let active = true;
    setSchedules([]); setContext(null); setRooms([]); setAvailableRooms(null); setSlotId(""); setDate(""); setSession("");
    if (!examId) return;
    setLoading(true); setError("");
    Promise.all([api.get(`/api/v1/examinations/${examId}/schedules`, { params: { campusId: selectedCampusId } }), api.get(`/api/v1/examinations/${examId}/scheduling-context`, { params: { campusId: selectedCampusId } }), api.get(apiEndpoints.rooms.getAll, { params: { campusId: selectedCampusId } })]).then(([scheduleResponse, contextResponse, roomResponse]) => { if (active) { setSchedules(records(scheduleResponse)); setContext(payload(contextResponse)); setRooms(records(roomResponse)); } }).catch((error) => { if (active) setError(getApiErrorMessage(error) || "Unable to load hall assignments."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [examId, selectedCampusId]);
  useEffect(() => {
    let active = true;
    setAvailableRooms(null);
    const slot = schedules.find((row) => String(row.examScheduleId || row.id) === slotId);
    if (!slot?.examDate || !slot.startTime || !slot.endTime) return;
    api.get("/api/v1/examinations/available-halls", { params: { examinationId: Number(examId), examDate: slot.examDate, startTime: slot.startTime, endTime: slot.endTime, excludeScheduleId: slot.examScheduleId || slot.id, sectionIds: context?.sectionIds } }).then((response) => { if (active) setAvailableRooms(records(response)); }).catch((err) => { if (active) setError(getApiErrorMessage(err) || "Unable to load available rooms."); });
    return () => { active = false; };
  }, [slotId, schedules, examId, context]);
  const rows = schedules.filter((row) => (!date || String(row.examDate || row.date).slice(0, 10) === date) && (!session || String(row.sessionId || row.session || "") === session));
  const roomFor = (row) => rooms.find((room) => String(room.id || room.roomId) === String(row.roomId));
  const allocationTotal = rows.every((row) => row.allocatedStudents != null) && rows.length ? rows.reduce((total, row) => total + Number(row.allocatedStudents), 0) : null;
  return <Page title="Hall Allocation" subtitle="View actual room assignments and allocate halls through the exam schedule workflow.">
    <section className="ec-card ec-padding"><div className="ec-form-grid"><label>Examination<select value={examId} onChange={(e) => setExamId(e.target.value)}><option value="">Select examination</option>{exams.map((exam) => <option value={exam.examinationId || exam.id} key={exam.examinationId || exam.id}>{exam.examName} · {exam.academicLevelName || exam.academicLevel} · {exam.groupName}</option>)}</select></label><label>Exam Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Session<select value={session} onChange={(e) => setSession(e.target.value)}><option value="">All sessions</option>{[...new Set(schedules.map((row) => row.sessionId || row.session).filter(Boolean))].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div><div className="ec-actions"><Link className="ec-primary" to="/exam-cell-dashboard/exam-timetable" state={{ examId }}>Manual Allocation / Edit Schedule</Link><button disabled title="No automatic hall allocation API is available">Auto Allocate</button><button disabled title="No seating plan API is available">Print Seating Plan</button></div><p className="ec-muted">Room capacity and invigilator checks remain in the existing scheduling flow. Student seat allocation and seating-plan APIs are not available.</p>{error && <p className="ec-error" role="alert">{error}</p>}</section>
    <section className="ec-card ec-padding"><div className="ec-form-grid"><label>Check room availability for a slot<select value={slotId} onChange={(event) => setSlotId(event.target.value)}><option value="">Select scheduled slot</option>{rows.map((row) => <option key={row.examScheduleId || row.id} value={row.examScheduleId || row.id}>{row.examDate} · {row.startTime} – {row.endTime} · {row.subjectName}</option>)}</select></label></div><div className="ec-metrics">{[["Total Students", context?.totalEligibleStudents], ["Rooms Available", availableRooms?.length], ["Students Allocated", allocationTotal], ["Pending", null]].map(([label, value]) => <div className="ec-metric" key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}</div></section>
    <section className="ec-card"><div className="ec-table-scroll"><table><thead><tr><th>Date</th><th>Subject</th><th>Room</th><th>Capacity</th><th>Allocated Students</th><th>Remaining Seats</th><th>Invigilator</th><th>Status</th></tr></thead><tbody>{rows.length ? rows.map((row) => { const room = roomFor(row); const capacity = row.capacity ?? room?.capacity; const assigned = row.allocatedStudents ?? row.studentCount; return <tr key={row.examScheduleId || row.id}><td>{row.examDate || row.date}</td><td>{row.subjectName}</td><td>{row.roomNumber || row.hall || room?.roomNumber || room?.name || "—"}</td><td>{capacity ?? "—"}</td><td>{assigned ?? "—"}</td><td>{capacity != null && assigned != null ? Number(capacity) - Number(assigned) : "—"}</td><td>{row.invigilatorName || row.invigilator || "—"}</td><td>{row.status || "—"}</td></tr>; }) : <tr><td colSpan="8">{loading ? "Loading hall assignments…" : examId ? "No schedules available." : "Select an examination to view its hall assignments."}</td></tr>}</tbody></table></div></section>
  </Page>;
}
