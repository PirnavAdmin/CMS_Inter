import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Download, Printer, Plus, Eye, CheckCircle2, Users, Loader2 } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useParentPortal, formatDate } from "../context/ParentPortalContext.jsx";
import { Modal, Toast } from "@/shared/components/Ui.jsx";
import {
  getStudentCertificates,
  requestStudentCertificate,
  getCertificatePreview,
  downloadStudentCertificate,
  getStudentById,
} from "@/api/parentApi.js";
import "../ParentDashboard.css";

export default function ParentDocumentsPage() {
  const {
    parentUser,
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
  } = useParentPortal();

  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState(null);
  const [selectedDocModal, setSelectedDocModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialModalOpen = searchParams.get("action") === "request";
  const [requestModalOpen, setRequestModalOpen] = useState(initialModalOpen);

  const getInitialDocDraft = () => {
    if (typeof window === "undefined") return { docType: "Bonafide Certificate", docPurpose: "" };
    try {
      const stored = window.sessionStorage.getItem("cms-parent-doc-draft");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          docType: parsed.docType || "Bonafide Certificate",
          docPurpose: parsed.docPurpose || "",
        };
      }
    } catch {}
    return { docType: "Bonafide Certificate", docPurpose: "" };
  };

  const initialDraft = getInitialDocDraft();
  const [docType, setDocType] = useState(initialDraft.docType);
  const [docPurpose, setDocPurpose] = useState(initialDraft.docPurpose);
  const [toastMessage, setToastMessage] = useState("");

  const handleOpenRequestModal = () => {
    setRequestModalOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("action", "request");
      return next;
    });
  };

  const handleCloseRequestModal = () => {
    setRequestModalOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("action");
      return next;
    });
  };

  useEffect(() => {
    const isRequest = searchParams.get("action") === "request";
    setRequestModalOpen(isRequest);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (requestModalOpen) {
        window.sessionStorage.setItem("cms-parent-doc-draft", JSON.stringify({ docType, docPurpose }));
      }
    } catch {}
  }, [requestModalOpen, docType, docPurpose]);

  const handleSelectChild = (id) => {
    setActiveChildId(id);
  };

  const loadDocuments = useCallback(async (showLoader = true) => {
    if (!child) return;
    const studentId = child.studentId || child.id;
    const admissionNo = child.admissionNo || child.admissionNumber;
    if (!studentId && !admissionNo) return;

    if (showLoader) setLoadingDocs(true);
    setDocsError(null);

    try {
      // 1. Fetch official student certificates from real backend GET /api/v1/certificates
      const [certsRes, profileRes] = await Promise.allSettled([
        getStudentCertificates(studentId, admissionNo),
        (studentId && !String(studentId).startsWith("stu-")) ? getStudentById(studentId) : Promise.resolve(null),
      ]);

      const rawCerts = certsRes.status === "fulfilled" && Array.isArray(certsRes.value) ? certsRes.value : [];
      const profile = profileRes.status === "fulfilled" ? profileRes.value : null;

      // Map certificates into table rows
      const certificateDocs = rawCerts.map((c, idx) => ({
        id: c.certificateId || c.id || `cert-${idx}`,
        certificateId: c.certificateId || c.id,
        title: c.certificateType || c.type || "Official Certificate",
        type: c.certificateType || c.type || "Certificate",
        docNo: c.certificateNumber || c.certificateNo || c.number || `CERT-${c.certificateId || idx + 1}`,
        issuedDate: c.issueDate ? formatDate(c.issueDate) : (c.status === "Requested" ? "Under Process" : (c.requestDate ? formatDate(c.requestDate) : "—")),
        purpose: c.purpose || c.remarks || "Official Verification",
        status: c.status || "Requested",
        raw: c,
        isCertificate: true,
      }));

      // 2. Map any student admission profile documents if present
      const uploadedDocs = [];
      if (profile) {
        const docFields = [
          { key: "aadhaarDocument", label: "Aadhaar Card Document", type: "Identity Proof" },
          { key: "birthCertificate", label: "Birth Certificate", type: "Date of Birth Proof" },
          { key: "transferCertificate", label: "Transfer Certificate (TC)", type: "Prior Academic Record" },
          { key: "tenthCertificate", label: "10th Class SSC / Board Certificate", type: "Academic Verification" },
          { key: "marksMemo", label: "Marks Memo / Grade Card", type: "Academic Transcript" },
          { key: "studyCertificate", label: "Study & Conduct Certificate", type: "Institutional Certificate" },
          { key: "incomeCertificate", label: "Income Certificate", type: "Fee Concession / Scholarship" },
          { key: "casteCertificate", label: "Caste / Category Certificate", type: "Reservation Verification" },
        ];

        docFields.forEach((df) => {
          const val = profile[df.key] || profile[df.key.charAt(0).toUpperCase() + df.key.slice(1)];
          if (val && typeof val === "string" && val.trim()) {
            uploadedDocs.push({
              id: `doc-${df.key}-${child.id}`,
              title: df.label,
              type: df.type,
              docNo: `DOC-${df.key.slice(0, 3).toUpperCase()}-${child.admissionNo || child.id}`,
              issuedDate: "Verified at Admission",
              purpose: "Admission Document Verification",
              status: "Approved",
              fileUrl: val,
              isUploadedDoc: true,
            });
          }
        });
      }

      setDocs([...certificateDocs, ...uploadedDocs]);
    } catch (err) {
      setDocsError(err?.message || "Failed to load certificates.");
      setDocs([]);
    } finally {
      if (showLoader) setLoadingDocs(false);
    }
  }, [child]);

  useEffect(() => {
    loadDocuments(true);
  }, [loadDocuments]);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!docPurpose.trim() || !child) return;

    setSubmitting(true);
    try {
      const admissionNo = child.admissionNo || child.admissionNumber;
      await requestStudentCertificate({
        admissionNo,
        certificateType: docType,
        purpose: docPurpose.trim(),
        remarks: "Parent Portal request",
      });

      setToastMessage(`Request for ${docType} submitted successfully to Administration!`);
      handleCloseRequestModal();
      setDocPurpose("");
      try {
        window.sessionStorage.removeItem("cms-parent-doc-draft");
      } catch {}
      await loadDocuments(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to submit request.";
      setToastMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (doc) => {
    if (doc.isCertificate && doc.certificateId) {
      setDownloadingId(doc.id);
      try {
        const blob = await downloadStudentCertificate(doc.certificateId);
        const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${doc.docNo || "certificate"}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setToastMessage("Failed to download certificate PDF. Please try again.");
      } finally {
        setDownloadingId(null);
      }
    } else if (doc.fileUrl && doc.fileUrl !== "#") {
      window.open(doc.fileUrl, "_blank");
    } else {
      setSelectedDocModal(doc);
    }
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
        <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={handleOpenRequestModal}>
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
                className={`parent-child-switch-btn ${String(activeChildId || child?.id) === String(c.id) ? "is-active" : ""}`}
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
            <button type="button" className="cms-btn cms-btn-primary cms-btn-sm" onClick={handleOpenRequestModal}>
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
                  {loadingDocs ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "var(--cms-muted)" }}>
                        Loading documents and certificates...
                      </td>
                    </tr>
                  ) : docs.length === 0 ? (
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
                        <span className={`cms-badge ${doc.status === "Approved" || doc.status === "Paid" || doc.status === "Issued" ? "cms-badge-active" : "cms-badge-warn"}`}>
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
                            disabled={downloadingId === doc.id}
                            title="Download Certificate"
                            onClick={() => handleDownload(doc)}
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
            onClose={handleCloseRequestModal}
            size="md"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={handleCloseRequestModal}>Cancel</button>
                <button type="button" className="cms-btn cms-btn-primary" disabled={submitting} onClick={handleRequestSubmit}>
                  {submitting ? "Submitting..." : "Submit Application"}
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
