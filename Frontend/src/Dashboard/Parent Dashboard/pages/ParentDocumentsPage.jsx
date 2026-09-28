import { useState } from "react";
import { FileText, Download, Printer, Plus, Eye, CheckCircle2, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, getStoredDocs, saveStoredDocs } from "../parentData.js";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import "../ParentDashboard.css";

export default function ParentDocumentsPage() {
  const {
    parentUser,
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
  } = useParentPortal();
  const [docsMap, setDocsMap] = useState(getStoredDocs());
  const [selectedDocModal, setSelectedDocModal] = useState(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [docType, setDocType] = useState("Bonafide Certificate");
  const [docPurpose, setDocPurpose] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const docs = child && docsMap[child.id] ? docsMap[child.id] : [];

  const handleSelectChild = (id) => {
    setActiveChildId(id);
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!docPurpose.trim() || !child) return;

    const newDoc = {
      id: `doc-${Date.now()}`,
      title: docType,
      type: docType,
      issuedDate: "Under Process",
      docNo: `REQ-2026-${Math.floor(100 + Math.random() * 900)}`,
      status: "Requested",
      purpose: docPurpose.trim(),
      fileUrl: "#",
    };

    const updated = {
      ...docsMap,
      [child.id]: [newDoc, ...docs],
    };

    setDocsMap(updated);
    saveStoredDocs(updated);
    setRequestModalOpen(false);
    setDocPurpose("");
    setToastMessage(`Request for ${docType} submitted successfully to Administration!`);
  };

  if (availableChildren.length === 0 || !child) {
    return (
      <DashboardLayout
        title="Documents & Certificates"
        subtitle="Student Documents Repository"
        breadcrumb={["Parent Portal", "Documents"]}
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
      title="Documents & Certificates"
      subtitle={`Official certificates, issued documents, and verification records • ${child.name}`}
      breadcrumb={["Parent Portal", "Documents"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={() => setRequestModalOpen(true)}>
          <Plus size={14} /> Request Document
        </button>
      }
    >
      <div className="parent-dashboard-wrapper">
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />

        {/* Child Switcher */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>{child.name} ({child.group})</h2>
              <p>Student Documents Repository • Admission No: {child.admissionNo} • Level: {child.level}</p>
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

        {/* Documents Table */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <FileText size={18} /> Issued Certificates & Student Records ({docs.length})
            </h3>
            <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={() => setRequestModalOpen(true)}>
              <Plus size={14} /> Request New Certificate
            </button>
          </div>
          <div className="parent-card-body" style={{ padding: 0 }}>
            <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
              <table className="parent-timetable-table">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Document Type</th>
                    <th>Document Ref No</th>
                    <th>Issued Date</th>
                    <th>Purpose / Category</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                        No documents or certificates available for {child.name}.
                      </td>
                    </tr>
                  ) : (
                    docs.map((doc) => (
                    <tr key={doc.id}>
                      <td><strong>{doc.title}</strong></td>
                      <td>{doc.type}</td>
                      <td style={{ fontSize: 12, color: "var(--cms-muted)" }}>{doc.docNo}</td>
                      <td>{doc.issuedDate}</td>
                      <td>{doc.purpose}</td>
                      <td>
                        <span className={`cms-badge ${doc.status === "Approved" || doc.status === "Paid" ? "cms-badge-active" : "cms-badge-warn"}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="cms-btn cms-btn-sm cms-btn-outline"
                            onClick={() => setSelectedDocModal(doc)}
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            type="button"
                            className="cms-btn cms-btn-sm cms-btn-primary"
                            onClick={() => {
                              setSelectedDocModal(doc);
                            }}
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Request Document Modal */}
        {requestModalOpen && (
          <Modal
            title="Request Official Student Document"
            onClose={() => setRequestModalOpen(false)}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setRequestModalOpen(false)}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleRequestSubmit}>
                  Submit Application
                </button>
              </>
            }
          >
            <form onSubmit={handleRequestSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: 12, background: "var(--cms-bg)", borderRadius: 8, fontSize: 13 }}>
                Applicant: <strong>{child.name} ({child.admissionNo})</strong>
              </div>

              <div>
                <label className="cms-label">Document Type Required</label>
                <select
                  className="cms-select"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="Bonafide Certificate">Bonafide Certificate (General / Passport / Bank)</option>
                  <option value="Study & Conduct Certificate">Study & Conduct Certificate</option>
                  <option value="Fee Clearance Certificate">Fee Clearance & Structure Certificate</option>
                  <option value="Custodian Certificate">Custodian Certificate of Original Certificates</option>
                  <option value="Transfer Certificate">Transfer Certificate (TC)</option>
                </select>
              </div>

              <div>
                <label className="cms-label">Purpose / Reason *</label>
                <textarea
                  className="cms-textarea"
                  rows={3}
                  placeholder="State the purpose (e.g., State Scholarship application, Passport verification)..."
                  value={docPurpose}
                  onChange={(e) => setDocPurpose(e.target.value)}
                  required
                />
              </div>

              <p style={{ margin: 0, fontSize: 12, color: "var(--cms-muted)" }}>
                Applications are processed within 2 working days. You can track status and download the verified PDF directly here.
              </p>
            </form>
          </Modal>
        )}

        {/* Document Preview Modal */}
        {selectedDocModal && (
          <Modal
            title={`Document Preview — ${selectedDocModal.title}`}
            onClose={() => setSelectedDocModal(null)}
            size="lg"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setSelectedDocModal(null)}>Close</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => window.print()}>
                  <Printer size={14} /> Print Document
                </button>
              </>
            }
          >
            <div className="parent-receipt-sheet">
              <div className="parent-receipt-header">
                <h2>PIRNAV JUNIOR COLLEGE</h2>
                <p>Campus Road, Jubilee Hills, Hyderabad - 500033</p>
                <strong style={{ display: "block", marginTop: 6, fontSize: 16 }}>{selectedDocModal.title.toUpperCase()}</strong>
                <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>Certificate No: {selectedDocModal.docNo}</div>
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.8, margin: "24px 0", color: "var(--cms-text)" }}>
                This is to certify that <strong>{child.name}</strong>, Son/Daughter of <strong>Sri {child.parentName || parentUser?.name || "Parent/Guardian"}</strong>,
                bearing Admission Number <strong>{child.admissionNo}</strong> and Roll Number <strong>{child.roll}</strong>,
                is a bonafide student of this institution studying in <strong>{child.level}</strong>,
                Course/Group <strong>{child.programme}</strong> during the academic year <strong>{child.academicYear}</strong>.
                <br /><br />
                As per college records, the student maintains good character and conduct. This certificate is issued for the purpose of <strong>{selectedDocModal.purpose}</strong> upon parent request.
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 16, borderTop: "1px solid #cbd5e1" }}>
                <div>Date of Issue: <strong>{selectedDocModal.issuedDate}</strong></div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: "1px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 600 }}>Principal & Head of Institution</div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
