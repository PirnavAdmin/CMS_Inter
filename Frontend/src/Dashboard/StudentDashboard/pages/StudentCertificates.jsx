import { useCallback, useEffect, useState } from "react";
import { Download, Plus, X } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentStatusBadge from "../components/StudentStatusBadge.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const list = (data, keys) => { const value = unwrap(data); if (Array.isArray(value)) return value; for (const key of keys) if (Array.isArray(value?.[key])) return value[key]; return []; };
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const saveFile = (blob, filename) => { const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob])); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); };

export default function StudentCertificates() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "", purpose: "", notes: "" });
  const load = useCallback(async () => {
    if (!student?.studentId) return;
    setLoading(true); setError("");
    const [certResult, templateResult] = await Promise.allSettled([
      apiClient.get(studentApiEndpoints.certificates.list, { params: { search: student.admissionNo || student.studentId } }),
      apiClient.get(studentApiEndpoints.certificates.activeTemplates),
    ]);
    if (certResult.status === "fulfilled") {
      const records = list(certResult.value.data, ["items", "Items", "records", "Records", "certificates", "Certificates"]);
      setRows(records.filter((item) => String(read(item, "studentId", "StudentId") ?? "") === String(student.studentId) || (student.admissionNo && String(read(item, "admissionNo", "AdmissionNo") ?? "").toLowerCase() === String(student.admissionNo).toLowerCase())));
    }
    if (templateResult.status === "fulfilled") setTemplates(list(templateResult.value.data, ["items", "Items", "templates", "Templates"]));
    const failed = [certResult, templateResult].find((item) => item.status === "rejected");
    if (certResult.status === "rejected") setError(getApiErrorMessage(certResult.reason));
    else if (failed) setError(`Certificate templates could not be loaded. ${getApiErrorMessage(failed.reason)}`);
    setLoading(false);
  }, [student]);
  useEffect(() => { if (!profileLoading) load(); }, [load, profileLoading]);

  const submit = async (event) => {
    event.preventDefault();
    if (!student?.admissionNo || !form.type || !form.purpose.trim()) return;
    setSaving(true); setError("");
    try {
      await apiClient.post(studentApiEndpoints.certificates.generate, { admissionNo: student.admissionNo, certificateType: form.type, purpose: form.purpose.trim(), remarks: form.notes.trim() || null, requestDate: new Date().toISOString() });
      setOpen(false); setForm({ type: "", purpose: "", notes: "" }); await load();
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setSaving(false); }
  };
  const download = async (row) => {
    const id = read(row, "certificateId", "CertificateId", "id", "Id");
    if (!id || downloading) return;
    setDownloading(String(id));
    try {
      const response = await apiClient.get(studentApiEndpoints.certificates.download(id), { responseType: "blob" });
      saveFile(response.data, `${read(row, "certificateNumber", "CertificateNumber") || `certificate-${id}`}.pdf`);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setDownloading(""); }
  };
  const templatesReady = templates.map((item) => String(read(item, "templateTitle", "TemplateTitle", "certificateType", "CertificateType", "name", "Name", "templateCode", "TemplateCode") || "")).filter(Boolean);
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={5} rows={5}/></div>;
  return <div className="sp-page">
    <StudentPageHeader title="Certificates" subtitle="View and request your student certificates." action={<button className="sp-btn primary" type="button" onClick={() => { setForm((current) => ({ ...current, type: templatesReady[0] || "" })); setOpen(true); }} disabled={!templatesReady.length}><Plus size={16}/> Request Certificate</button>}/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    <StudentCard title="Certificate Requests" subtitle={`${rows.length} certificate request${rows.length === 1 ? "" : "s"}`}>
      {!rows.length && !error ? <StudentEmptyState title="No certificate requests" text="Your certificate requests and issued certificates will appear here."/> : <StudentDataTable columns={["Certificate No.", "Certificate Type", "Requested Date", "Purpose", "Status", "Action"]} rows={rows} empty="No certificate requests found for this student." renderCell={(value, row, column, index) => {
        if (index === 0) return read(row, "certificateNumber", "CertificateNumber") || "—";
        if (index === 1) return read(row, "certificateType", "CertificateType", "templateTitle", "TemplateTitle") || "—";
        if (index === 2) return date(read(row, "requestDate", "RequestDate", "generatedAt", "GeneratedAt"));
        if (index === 3) return read(row, "purpose", "Purpose") || "—";
        if (index === 4) return <StudentStatusBadge value={read(row, "status", "Status") || "Pending"}/>;
        const issued = /issued/i.test(String(read(row, "status", "Status") || ""));
        const id = String(read(row, "certificateId", "CertificateId", "id", "Id") || "");
        return <button type="button" className="sp-icon-action" title={issued ? "Download certificate" : "Certificate is not issued yet"} aria-label="Download certificate" disabled={!issued || downloading === id} onClick={() => download(row)}><Download size={16}/></button>;
      }}/>
      }
    </StudentCard>
    {open ? <div className="sp-modal-backdrop"><form className="sp-modal" onSubmit={submit}><header><div><h2>Request Certificate</h2><p>Submit a certificate request for review.</p></div><button type="button" className="sp-icon-btn" onClick={() => setOpen(false)}><X size={18}/></button></header><label><span>Certificate Type</span><select required value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}><option value="">Select certificate type</option>{templatesReady.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label><span>Purpose</span><input required value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}/></label><label><span>Additional Notes</span><textarea rows="3" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}/></label><footer><button type="button" className="sp-btn" onClick={() => setOpen(false)}>Cancel</button><button className="sp-btn primary" disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</button></footer></form></div> : null}
  </div>;
}
