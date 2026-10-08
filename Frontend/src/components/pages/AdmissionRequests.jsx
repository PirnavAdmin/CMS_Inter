import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Eye, Inbox, Info, Loader2, Search, Send, X } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast } from "@/components/common/Ui.jsx";
import { formatDate } from "@/data/feeManagementData.js";
import "./AdmissionRequests.css";

const PAGE_SIZE = 5;
const studentFields = [
  ["firstName", "First Name"], ["lastName", "Last Name"], ["gender", "Gender"],
  ["dateOfBirth", "Date of Birth"], ["bloodGroup", "Blood Group"],
  ["aadhaar", "Aadhaar Number"], ["mobile", "Student Mobile"], ["email", "Email"],
];

const read = (source, ...keys) => {
  if (!source || typeof source !== "object") return undefined;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
};

const readText = (source, ...keys) => {
  const value = read(source, ...keys);
  return value === undefined || value === null ? "" : String(value);
};

const readId = (source, ...keys) => {
  const value = read(source, ...keys);
  return value === undefined || value === null || value === "" ? "" : String(value);
};

const getCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.Data)) return payload.Data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.Results)) return payload.Results;
  return [];
};

const normalizeRequestStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  if (["request approved", "requestapproved", "approved request"].includes(status)) return "Request Approved";
  if (["request rejected", "requestrejected", "rejected request"].includes(status)) return "Request Rejected";
  if (["approved", "approve", "active", "completed", "complete"].includes(status)) return "Approved";
  if (["rejected", "reject", "inactive", "cancelled", "canceled", "denied"].includes(status)) return "Rejected";
  if (["verified", "verify"].includes(status)) return "Verified";
  return "Pending";
};

const campusOptionFor = (campusOptions = [], campusId, campusName) => {
  const match = campusOptions.find((option) => String(option.value) === String(campusId || ""));
  if (match) return match;
  const value = campusId || campusName || "";
  return { value: String(value), label: campusName || String(value || "-") };
};

const normalizeAdmissionRequest = (item, campusOptions, currentCampusId, direction) => {
  const admission = read(item, "admission", "Admission", "studentAdmission", "StudentAdmission") || {};
  const student = read(item, "student", "Student", "studentDetails", "StudentDetails") || {};
  const firstName = readText(item, "firstName", "FirstName") || readText(student, "firstName", "FirstName");
  const lastName = readText(item, "lastName", "LastName") || readText(student, "lastName", "LastName");
  const targetCampus = read(item, "campus", "Campus") || read(admission, "campus", "Campus") || {};
  const sourceCampus = read(item, "sourceCampus", "SourceCampus") || {};
  const targetCampusId = readId(item, "campusId", "CampusId") || readId(targetCampus, "campusId", "CampusId", "id", "Id");
  const targetCampusName = readText(item, "campusName", "CampusName") || readText(targetCampus, "campusName", "CampusName", "name", "Name", "campusCode", "CampusCode");
  const sourceCampusId = readId(item, "sourceCampusId", "SourceCampusId") || readId(sourceCampus, "campusId", "CampusId", "id", "Id") || (direction === "outgoing" ? currentCampusId : "");
  const sourceCampusName = readText(item, "sourceCampusName", "SourceCampusName") || readText(sourceCampus, "campusName", "CampusName", "name", "Name", "campusCode", "CampusCode");
  const id = readId(item, "admissionId", "AdmissionId", "id", "Id") || readText(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber");
  const admissionNumber = readText(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "number", "Number");
  const studentName = readText(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
    || readText(student, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
    || [firstName, lastName].filter(Boolean).join(" ");
  const submittedOn = readText(item, "createdAt", "CreatedAt", "submittedOn", "SubmittedOn", "admissionDate", "AdmissionDate", "date", "Date");
  const status = normalizeRequestStatus(readText(item, "status", "Status", "admissionStatus", "AdmissionStatus"));
  return {
    id,
    admissionId: readId(item, "admissionId", "AdmissionId", "id", "Id"),
    admissionNumber,
    studentName,
    submittedOn,
    status,
    remarks: readText(item, "remarks", "Remarks"),
    fromCampus: campusOptionFor(campusOptions, sourceCampusId, sourceCampusName),
    toCampus: campusOptionFor(campusOptions, targetCampusId, targetCampusName),
    student: {
      firstName,
      lastName,
      gender: readText(item, "gender", "Gender") || readText(student, "gender", "Gender"),
      dateOfBirth: readText(item, "dateOfBirth", "DateOfBirth", "dob", "DOB") || readText(student, "dateOfBirth", "DateOfBirth", "dob", "DOB"),
      bloodGroup: readText(item, "bloodGroup", "BloodGroup") || readText(student, "bloodGroup", "BloodGroup"),
      aadhaar: readText(item, "aadhaarNumber", "AadhaarNumber", "aadhaar", "Aadhaar") || readText(student, "aadhaarNumber", "AadhaarNumber", "aadhaar", "Aadhaar"),
      mobile: readText(item, "studentMobileNumber", "StudentMobileNumber", "mobileNumber", "MobileNumber", "mobile", "Mobile") || readText(student, "studentMobileNumber", "StudentMobileNumber", "mobileNumber", "MobileNumber", "mobile", "Mobile"),
      email: readText(item, "email", "Email", "studentEmail", "StudentEmail") || readText(student, "email", "Email", "studentEmail", "StudentEmail"),
    },
    history: [
      { label: "Request Submitted", date: submittedOn, status: "Pending" },
      ...(status !== "Pending" ? [{ label: status, date: readText(item, "updatedAt", "UpdatedAt") || submittedOn, status }] : []),
    ],
  };
};

function RequestStatus({ status }) {
  const style = status === "Request Approved" || status === "Approved" ? "active" : status === "Request Rejected" || status === "Rejected" ? "danger" : "warn";
  return <span className={`cms-badge cms-badge-${style}`}>{status}</span>;
}

function DetailsSection({ title, fields }) {
  return (
    <section className="cms-preview-section">
      <div className="cms-preview-head"><h3>{title}</h3></div>
      <div className="cms-preview-grid">
        {fields.map(([label, value]) => (
          <div className="cms-preview-item" key={label}><span>{label}</span><strong>{value || "-"}</strong></div>
        ))}
      </div>
    </section>
  );
}

export default function AdmissionRequests({ campusOptions, currentCampusId, onClose }) {
  const [tab, setTab] = useState("outgoing");
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [requestsByTab, setRequestsByTab] = useState({ outgoing: [], incoming: [] });
  const isIncoming = tab === "incoming";

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [outgoingResponse, incomingResponse] = await Promise.all([
        apiClient.get(apiEndpoints.admissions.outgoingRequests),
        apiClient.get(apiEndpoints.admissions.incomingRequests),
      ]);
      setRequestsByTab({
        outgoing: getCollection(outgoingResponse.data).map((item) => normalizeAdmissionRequest(item, campusOptions, currentCampusId, "outgoing")),
        incoming: getCollection(incomingResponse.data).map((item) => normalizeAdmissionRequest(item, campusOptions, currentCampusId, "incoming")),
      });
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [campusOptions, currentCampusId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const outgoing = requestsByTab.outgoing;
  const incoming = requestsByTab.incoming;
  const scopedRequests = isIncoming ? incoming : outgoing;
  const otherCampus = (request) => isIncoming ? request.fromCampus : request.toCampus;
  const filterOptions = Array.from(new Map(scopedRequests.map((request) => [otherCampus(request).value, otherCampus(request)])).values());
  const activeFilter = filterOptions.some((campus) => campus.value === campusFilter) ? campusFilter : "";
  const query = search.trim().toLowerCase();
  const filtered = scopedRequests.filter((request) => (
    (!activeFilter || otherCampus(request).value === activeFilter)
    && `${request.admissionNumber} ${request.studentName}`.toLowerCase().includes(query)
  ));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const detail = scopedRequests.find((request) => request.id === detailId);

  const changeStatus = async (status) => {
    if (!isIncoming || !detail || detail.status !== "Pending") return;
    const admissionId = detail.admissionId || detail.id;
    const remarks = window.prompt("Remarks (optional)", "") || "";
    const rejectionReason = status === "Request Rejected" ? window.prompt("Rejection reason", "") : "";
    if (status === "Request Rejected" && !String(rejectionReason || "").trim()) {
      setToast("Rejection reason is required.");
      return;
    }
    setActionBusy(status);
    try {
      if (status === "Request Approved") {
        await apiClient.post(apiEndpoints.admissions.approveRequest(admissionId), { remarks });
      } else {
        await apiClient.post(apiEndpoints.admissions.rejectRequest(admissionId), { rejectionReason, remarks });
      }
      setToast(status === "Request Approved" ? "Admission request approved." : "Admission request rejected.");
      await loadRequests();
      setDetailId(null);
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setActionBusy("");
    }
  };

  return (
    <DashboardLayout
      title={detail ? `${isIncoming ? "Incoming" : "Outgoing"} Admission Request Details` : "Admission Requests"}
      subtitle={detail ? `Request ${isIncoming ? "received from" : "sent to"} another campus.` : "View and manage admission requests."}
      breadcrumb={["People", "Student Admission"]}
      actions={<button type="button" className="cms-btn cms-btn-ghost" onClick={detail ? () => setDetailId(null) : onClose}><ArrowLeft size={15} />{detail ? "Back to Requests" : "Back to Student Admission"}</button>}
    >
      <div className="cms-admission-requests">
        {detail ? (
          <div className={`cms-requests-details ${isIncoming ? "has-action" : ""}`}>
            <div className="cms-requests-sections">
              <DetailsSection title="Request Information" fields={[
                ["Admission Number", detail.admissionNumber], ["Student Name", detail.studentName],
                [isIncoming ? "From Campus" : "Requested Campus", otherCampus(detail).label],
                ["Submitted On", formatDate(detail.submittedOn) || detail.submittedOn], ["Status", <RequestStatus status={detail.status} />], ["Remarks", detail.remarks],
              ]} />
              <DetailsSection title="Student Details" fields={studentFields.map(([key, label]) => [label, key === "dateOfBirth" ? formatDate(detail.student[key]) || detail.student[key] : detail.student[key]])} />
              <section className="cms-preview-section">
                <div className="cms-preview-head"><h3>{isIncoming ? "Request History" : "Current Status"}</h3><RequestStatus status={detail.status} /></div>
                <ol className="cms-requests-history">
                  {detail.history.map((event, index) => <li key={index}><div><strong>{event.label}</strong><time>{formatDate(event.date) || event.date}</time></div><RequestStatus status={event.status} /></li>)}
                </ol>
              </section>
            </div>
            {isIncoming ? <aside className="cms-card cms-requests-action">
              <div className="cms-card-head"><h2>Action</h2></div>
              <div className="cms-card-body">
                {detail.status === "Pending" ? <>
                  <button type="button" className="cms-btn cms-btn-primary" disabled={Boolean(actionBusy)} onClick={() => changeStatus("Request Approved")}><Check size={15} />{actionBusy === "Request Approved" ? "Approving..." : "Approve Request"}</button>
                  <button type="button" className="cms-btn cms-btn-danger" disabled={Boolean(actionBusy)} onClick={() => changeStatus("Request Rejected")}><X size={15} />{actionBusy === "Request Rejected" ? "Rejecting..." : "Reject Request"}</button>
                </> : <RequestStatus status={detail.status} />}
              </div>
            </aside> : null}
          </div>
        ) : <>
          <div className="cms-admission-main-tabs cms-requests-tabs" role="tablist" aria-label="Admission requests">
            {[{ id: "outgoing", label: "My Campus Requests", count: outgoing.length, Icon: Send }, { id: "incoming", label: "Incoming Requests", count: incoming.length, Icon: Inbox }].map(({ id, label, count, Icon }) => (
              <button key={id} type="button" id={`requests-tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="requests-panel" className={`cms-admission-main-tab ${tab === id ? "is-active" : ""}`} onClick={() => { setTab(id); setCampusFilter(""); setPage(1); }}><Icon size={14} /><span>{label}</span><span className="cms-requests-count">{count}</span></button>
            ))}
          </div>
          <div id="requests-panel" role="tabpanel" aria-labelledby={`requests-tab-${tab}`}>
            <div className="cms-requests-info"><Info size={18} /><p>{isIncoming ? "These are admission requests sent from other campuses to your campus. You can view the details and take required action." : "These are admission requests you have submitted to other campuses. You can view the details and track the status."}</p></div>
            <div className="cms-card cms-admission-list-card">
              <div className="cms-admission-toolbar cms-requests-toolbar">
                <div className="cms-field cms-requests-search-field">
                  <label htmlFor="admission-requests-search">Search</label>
                  <div className="cms-search cms-admission-search"><Search size={16} /><input id="admission-requests-search" aria-label="Search admission requests" placeholder="Search by admission number or student name..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
                </div>
                <Field field={{ name: "requestCampus", label: "Campus", type: "select", options: [{ value: "", label: "All Campuses" }, ...filterOptions] }} value={activeFilter} onChange={(_, value) => { setCampusFilter(value); setPage(1); }} />
              </div>
              <div className="cms-table-wrap"><table className="cms-table cms-requests-table">
                <thead><tr>{["Admission Number", "Student Name", isIncoming ? "From Campus" : "Requested Campus", "Submitted On", "Status", "Action"].map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} className="cms-requests-empty"><Loader2 size={16} className="cms-spin" /> Loading requests...</td></tr> : visible.length ? visible.map((request) => <tr key={request.id}>
                    <td className="cms-strong">{request.admissionNumber}</td><td>{request.studentName}</td><td>{otherCampus(request).label}</td><td>{formatDate(request.submittedOn) || request.submittedOn}</td><td><RequestStatus status={request.status} /></td>
                    <td><button type="button" className="cms-btn cms-btn-ghost" aria-label={`View request ${request.admissionNumber}`} onClick={() => setDetailId(request.id)}><Eye size={15} />View</button></td>
                  </tr>) : <tr><td colSpan={6} className="cms-requests-empty">No admission requests found.</td></tr>}
                </tbody>
              </table></div>
              <div className="cms-pagination"><span className="cms-page-info">Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} requests</span><button type="button" className="cms-page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" className="cms-page-btn is-active" aria-current="page">{currentPage}</button><button type="button" className="cms-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button></div>
            </div>
          </div>
        </>}
      </div>
      <Toast message={toast} type="info" onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
