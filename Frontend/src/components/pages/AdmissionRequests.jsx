import { useMemo, useState } from "react";
import { ArrowLeft, Check, Eye, Inbox, Info, Search, Send, X } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Toast } from "@/components/common/Ui.jsx";
import { createAdmissionRequestsMockData } from "@/data/admissionRequestsMockData.js";
import "./AdmissionRequests.css";

const PAGE_SIZE = 5;
const studentFields = [
  ["firstName", "First Name"], ["lastName", "Last Name"], ["gender", "Gender"],
  ["dateOfBirth", "Date of Birth"], ["bloodGroup", "Blood Group"],
  ["aadhaar", "Aadhaar Number"], ["mobile", "Student Mobile"], ["email", "Email"],
];

function RequestStatus({ status }) {
  const style = status === "Approved" ? "active" : status === "Rejected" ? "danger" : "warn";
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
  const mockRequests = useMemo(() => createAdmissionRequestsMockData(campusOptions), [campusOptions]);
  const [updates, setUpdates] = useState({});
  const [tab, setTab] = useState("outgoing");
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState("");
  const requests = mockRequests.map((request) => ({ ...request, ...updates[request.id] }));
  const campusId = String(currentCampusId || "");
  const outgoing = requests.filter((request) => String(request.fromCampus.value) === campusId);
  const incoming = requests.filter((request) => String(request.toCampus.value) === campusId);
  const isIncoming = tab === "incoming";
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

  const changeStatus = (status) => {
    if (!isIncoming || !detail || detail.status !== "Pending") return;
    const date = new Date().toLocaleString("en-IN");
    setUpdates((current) => ({
      ...current,
      [detail.id]: { status, history: [...detail.history, { label: `Request ${status}`, date, status }] },
    }));
    setToast(`Request ${status.toLowerCase()} for this preview session.`);
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
                ["Submitted On", detail.submittedOn], ["Status", <RequestStatus status={detail.status} />], ["Remarks", detail.remarks],
              ]} />
              <DetailsSection title="Student Details" fields={studentFields.map(([key, label]) => [label, detail.student[key]])} />
              <section className="cms-preview-section">
                <div className="cms-preview-head"><h3>{isIncoming ? "Request History" : "Current Status"}</h3><RequestStatus status={detail.status} /></div>
                <ol className="cms-requests-history">
                  {detail.history.map((event, index) => <li key={index}><div><strong>{event.label}</strong><time>{event.date}</time></div><RequestStatus status={event.status} /></li>)}
                </ol>
              </section>
            </div>
            {isIncoming ? <aside className="cms-card cms-requests-action">
              <div className="cms-card-head"><h2>Action</h2></div>
              <div className="cms-card-body">
                {detail.status === "Pending" ? <>
                  <button type="button" className="cms-btn cms-btn-primary" onClick={() => changeStatus("Approved")}><Check size={15} />Approve Request</button>
                  <button type="button" className="cms-btn cms-btn-danger" onClick={() => changeStatus("Rejected")}><X size={15} />Reject Request</button>
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
                <tbody>{visible.length ? visible.map((request) => <tr key={request.id}>
                  <td className="cms-strong">{request.admissionNumber}</td><td>{request.studentName}</td><td>{otherCampus(request).label}</td><td>{request.submittedOn}</td><td><RequestStatus status={request.status} /></td>
                  <td><button type="button" className="cms-btn cms-btn-ghost" aria-label={`View request ${request.admissionNumber}`} onClick={() => setDetailId(request.id)}><Eye size={15} />View</button></td>
                </tr>) : <tr><td colSpan={6} className="cms-requests-empty">No admission requests found.</td></tr>}</tbody>
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
