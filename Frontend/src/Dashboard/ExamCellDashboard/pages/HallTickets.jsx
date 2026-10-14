import { useEffect, useState } from "react";
import api, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import Page from "../layout/ExamCellPageLayout.jsx";
import { payload, records } from "./Dashboard.jsx";

export default function HallTickets() {
  const { selectedCampusId } = useCampusContext();
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [tickets, setTickets] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setExams([]); setTickets([]); setExamId(""); setError("");
    api.get(apiEndpoints.examinations.getAll, { params: { campusId: selectedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId, pageSize: 1000 } }).then((response) => { if (active) setExams(records(response)); }).catch((error) => { if (active) setError(getApiErrorMessage(error) || "Unable to load examinations."); });
    return () => { active = false; };
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  const generate = async (event) => {
    event.preventDefault();
    if (!examId || !Number.isInteger(Number(batchId)) || Number(batchId) <= 0) return;
    if (!window.confirm("Generate hall tickets for the selected examination and batch?")) return;
    setBusy(true); setError(""); setNotice("");
    try { const response = await api.post("/api/v1/examinations/halltickets", { examinationId: Number(examId), batchId: Number(batchId) }); setTickets(records(response)); setNotice("Hall tickets generated successfully."); }
    catch (error) { setError(getApiErrorMessage(error) || "Unable to generate hall tickets."); }
    finally { setBusy(false); }
  };
  const download = async (id, preview = false) => {
    if (!examId || !id) return;
    // Open immediately inside the click event so browser popup protection allows preview.
    const previewWindow = preview ? window.open("", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;
    setBusy(true); setError("");
    try {
      const response = await api.get(`/api/v1/examinations/halltickets/${encodeURIComponent(id)}`, { params: { examinationId: Number(examId) }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      if (previewWindow) previewWindow.location.href = url;
      else { const link = document.createElement("a"); link.href = url; link.download = `hall-ticket-${id}.pdf`; link.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { previewWindow?.close(); setError(getApiErrorMessage(error) || "Hall ticket is unavailable."); }
    finally { setBusy(false); }
  };
  return <Page title="Hall Tickets" subtitle="Generate batch hall tickets and download existing student tickets.">
    <section className="ec-card ec-padding">
      {error && <p className="ec-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      <form className="ec-form-grid" onSubmit={generate}>
        <label>Examination<select required value={examId} onChange={(event) => { setExamId(event.target.value); setTickets([]); setNotice(""); }}><option value="">Select examination</option>{exams.map((exam) => <option key={exam.examinationId || exam.id} value={exam.examinationId || exam.id}>{exam.examName} · {exam.groupName} · {exam.academicLevelName || exam.academicLevel}</option>)}</select></label>
        <label>Batch ID<input type="number" min="1" step="1" required value={batchId} onChange={(event) => setBatchId(event.target.value)} /></label>
        <button className="ec-primary" disabled={busy || !examId || !batchId}>Generate Batch Hall Tickets</button>
      </form>
      <p className="ec-muted">The existing generation API accepts an examination and batch ID. Batch lookup and individual eligibility APIs are not available; selected-student generation is not supported by this contract.</p>
      <div className="ec-form-grid"><label>Existing Student ID<input type="number" min="1" step="1" value={studentId} onChange={(event) => setStudentId(event.target.value)} /></label><button className="ec-secondary" disabled={busy || !examId || !studentId} onClick={() => download(studentId)}>Download Existing Hall Ticket</button></div>
    </section>
    <section className="ec-card"><header className="ec-card-heading"><h2>Generated Hall Tickets</h2></header><div className="ec-table-scroll"><table><thead><tr><th>Roll No.</th><th>Student</th><th>Generated At</th><th>Action</th></tr></thead><tbody>{tickets.length ? tickets.map((ticket) => <tr key={ticket.hallTicketId || ticket.studentId}><td>{ticket.rollNumber || "—"}</td><td>{ticket.studentName || "—"}</td><td>{ticket.generatedAt ? new Date(ticket.generatedAt).toLocaleString("en-IN") : "—"}</td><td><div className="ec-actions"><button disabled={busy} onClick={() => download(ticket.studentId, true)}>View / Print PDF</button><button disabled={busy} onClick={() => download(ticket.studentId)}>Download</button></div></td></tr>) : <tr><td colSpan="4">Generate a batch to view the API's returned hall tickets.</td></tr>}</tbody></table></div></section>
  </Page>;
}
