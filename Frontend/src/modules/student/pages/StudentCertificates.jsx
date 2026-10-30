import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Download, Plus, X } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage, Toast } from "@/shared/components/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentStatusBadge from "../components/StudentStatusBadge.jsx";
import { useStudentProfile, useStudentNavigation } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const list = (data, keys) => { const value = unwrap(data); if (Array.isArray(value)) return value; for (const key of keys) if (Array.isArray(value?.[key])) return value[key]; return []; };
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const saveFile = (blob, filename) => { const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob])); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); };

const DEFAULT_FALLBACK_TYPES = [
  "Bonafide Certificate",
  "Study Certificate",
  "Conduct Certificate",
  "Transfer Certificate"
];

export default function StudentCertificates() {
  const navigation = useStudentNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const consumedRequest = useRef(null);
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [rows, setRows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [success, setSuccess] = useState("");
  const open = navigation.params.get("action") === "request";
  const updateNavigation = navigation.update;
  const setOpen = useCallback((value) => updateNavigation({ action: value ? "request" : null }), [updateNavigation]);
  const [form, setForm] = useState({ type: "", purpose: "", notes: "" });

  const load = useCallback(async (showLoading = true) => {
    if (!student?.studentId) { setLoading(false); return; }
    if (showLoading) setLoading(true);
    setError("");
    const [certResult, typeResult] = await Promise.allSettled([
      apiClient.get(studentApiEndpoints.certificates.list, { params: { search: student.admissionNo || student.studentId } }),
      apiClient.get(studentApiEndpoints.certificates.activeTemplates),
    ]);
    if (certResult.status === "fulfilled") {
      const records = list(certResult.value.data, ["items", "Items", "records", "Records", "certificates", "Certificates"]);
      setRows(records.filter((item) => String(read(item, "studentId", "StudentId") ?? "") === String(student.studentId) || (student.admissionNo && String(read(item, "admissionNo", "AdmissionNo") ?? "").toLowerCase() === String(student.admissionNo).toLowerCase())));
    }
    if (typeResult.status === "fulfilled") {
      const records = list(typeResult.value.data, ["items", "Items", "records", "Records", "templates", "Templates", "certificates", "Certificates"]);
      const filtered = records.filter((item) => {
        const active = read(item, "isActive", "IsActive");
        const status = String(read(item, "status", "Status") || "").toLowerCase();
        const campus = read(item, "campusId", "CampusId");
        return ![false, 0, "false", "0"].includes(active) && status !== "cancelled" && status !== "inactive"
          && (student.campusId == null || campus == null || String(campus) === String(student.campusId));
      });
      if (filtered.length > 0) {
        setTemplates(filtered);
      } else {
        setTemplates(DEFAULT_FALLBACK_TYPES);
      }
    } else {
      setTemplates(DEFAULT_FALLBACK_TYPES);
    }
    if (certResult.status === "rejected") setError(getApiErrorMessage(certResult.reason));
    setLoading(false);
  }, [student]);

  useEffect(() => { if (!profileLoading) load(); }, [load, profileLoading]);
  useEffect(() => {
    const refresh = () => { if (!profileLoading) load(false); };
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, profileLoading]);

  useEffect(() => {
    let channel;
    try {
      channel = new BroadcastChannel("cms_notifications");
      channel.onmessage = (event) => {
        const data = event.data;
        if (data?.type === "CERTIFICATE_STATUS_UPDATED") {
          const studentAdm = String(student?.admissionNo || "").trim().toLowerCase();
          const msgAdm = String(data?.admissionNo || "").trim().toLowerCase();
          if (studentAdm && msgAdm && studentAdm === msgAdm) {
            setSuccess(`Your ${data.certificateType} certificate has been ${String(data.status).toLowerCase()} by administration.`);
            load(false);
          }
        }
      };
    } catch {}
    return () => {
      try { channel?.close(); } catch {}
    };
  }, [student?.admissionNo, load]);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const admissionNo = String(student?.admissionNo || "").trim();
    if (!admissionNo) return setRequestError("Your admission number is unavailable. Please contact the college administrator.");
    if (!form.type || !form.purpose.trim()) return setRequestError("Select a certificate type and enter its purpose.");
    setSaving(true); setRequestError("");
    try {
      await apiClient.post(studentApiEndpoints.certificates.studentRequest, { admissionNo, certificateType: form.type, purpose: form.purpose.trim(), remarks: form.notes.trim() || null, requestDate: new Date().toISOString() });
      try {
        const channel = new BroadcastChannel('cms_notifications');
        channel.postMessage({
          type: 'NEW_CERTIFICATE_REQUEST',
          admissionNo,
          studentName: student?.name || student?.studentName || admissionNo,
          certificateType: form.type,
          purpose: form.purpose.trim(),
          timestamp: new Date().toISOString()
        });
        channel.close();
      } catch {
        // Fallback if BroadcastChannel unavailable
      }
      setOpen(false); setForm({ type: "", purpose: "", notes: "" }); setSuccess("Certificate request submitted successfully."); await load();
    } catch (failure) { setRequestError(getApiErrorMessage(failure)); }
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

  const templatesReady = [...new Set(templates
    .filter((item) => typeof item === "string" || ![false, 0, "false", "0", "Inactive"].includes(read(item, "isActive", "IsActive", "status", "Status")))
    .map((item) => String(typeof item === "string" ? item : read(item, "certificateType", "CertificateType", "title", "Title", "templateTitle", "TemplateTitle", "name", "Name", "templateCode", "TemplateCode") || "").trim())
    .filter(Boolean))];
  const defaultCertificateType = templatesReady[0] || "";

  const openRequestCertificate = useCallback(() => {
    setRequestError("");
    setForm((current) => ({ ...current, type: defaultCertificateType }));
    setOpen(true);
<<<<<<< HEAD
  }, [defaultCertificateType]);

=======
  }, [defaultCertificateType, setOpen]);
>>>>>>> origin/main
  useEffect(() => {
    if (!location.state?.openRequestCertificate || profileLoading || loading
      || consumedRequest.current === location.key) return;
    consumedRequest.current = location.key;
    openRequestCertificate();
    const { openRequestCertificate: consumed, ...remainingState } = location.state;
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, {
      replace: true,
      state: Object.keys(remainingState).length ? remainingState : null,
    });
  }, [location, navigate, profileLoading, loading, defaultCertificateType, openRequestCertificate]);
<<<<<<< HEAD

=======
  useEffect(() => {
    if (open && !form.type && defaultCertificateType) setForm((current) => ({ ...current, type: defaultCertificateType }));
  }, [open, form.type, defaultCertificateType]);
>>>>>>> origin/main
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={5} rows={5}/></div>;

  return (
    <div className="sp-page">
      <StudentPageHeader title="Certificates" subtitle="View and request your student certificates." action={<button className="sp-btn primary" type="button" onClick={openRequestCertificate}><Plus size={16}/> Request Certificate</button>}/>
      {success ? <Toast message={success} type="success" onClose={() => setSuccess("")}/> : null}
      {!templatesReady.length && !error ? <div className="sp-api-state">No admin-created certificate types are available for your academic context. Please contact the college administrator.</div> : null}
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
        }}/>}
      </StudentCard>
      {open ? (
        <div className="sp-modal-backdrop">
          <form className="sp-modal" onSubmit={submit}>
            <header>
              <div>
                <h2>Request Certificate</h2>
                <p>Submit a certificate request for review.</p>
              </div>
              <button type="button" className="sp-icon-btn" disabled={saving} onClick={() => setOpen(false)}><X size={18}/></button>
            </header>
            {requestError ? <div className="sp-api-state is-error" role="alert">{requestError}</div> : null}
            {!templatesReady.length ? <div className="sp-api-state" role="status">{error || "No admin-created certificate types are available for your academic context. Please contact the college administrator."}</div> : null}
            <label>
              <span>Certificate Type</span>
              <select required value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="">Select certificate type</option>
                {templatesReady.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>Purpose</span>
              <input required value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}/>
            </label>
            <label>
              <span>Additional Notes</span>
              <textarea rows="3" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}/>
            </label>
            <footer>
              <button type="button" className="sp-btn" disabled={saving} onClick={() => setOpen(false)}>Cancel</button>
              <button className="sp-btn primary" disabled={saving || !templatesReady.length}>{saving ? "Submitting..." : "Submit Request"}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
