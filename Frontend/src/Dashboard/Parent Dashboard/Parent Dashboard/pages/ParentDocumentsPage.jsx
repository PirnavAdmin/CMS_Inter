import { SkeletonRow } from "@/shared/components/Skeleton.jsx";
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
      const certificateDocs = rawCerts.map((c, idx) => {
        const rawStatus = String(c.status || c.certificateStatus || "").trim();
        const normStatus = rawStatus.toLowerCase();
        const isIssued = normStatus === "issued" || normStatus === "authorized" || normStatus === "active";

        let displayStatus = "Requested";
        if (isIssued) {
          displayStatus = "Issued";
        } else if (normStatus === "approved") {
          displayStatus = "Approved";
        } else if (normStatus === "reviewed") {
          displayStatus = "Reviewed";
        } else if (normStatus === "generated") {
          displayStatus = "Generated";
        } else if (normStatus === "cancelled") {
          displayStatus = "Cancelled";
        } else {
          displayStatus = rawStatus || "Requested";
        }

        return {
          id: c.certificateId || c.id || `cert-${idx}`,
          certificateId: c.certificateId || c.id,
          title: c.certificateType || c.type || "Official Certificate",
          type: c.certificateType || c.type || "Certificate",
          docNo: c.certificateNumber || c.certificateNo || c.number || (isIssued ? `CERT-${c.certificateId || idx + 1}` : "Pending Issue"),
          issuedDate: isIssued
            ? (c.issueDate ? formatDate(c.issueDate) : (c.requestDate ? formatDate(c.requestDate) : formatDate(new Date().toISOString())))
            : (displayStatus === "Requested" ? "Under Process" : (displayStatus === "Approved" ? "Ready to Issue" : "Under Review")),
          purpose: c.purpose || c.remarks || "Official Verification",
          status: displayStatus,
          isIssued,
          raw: c,
          isCertificate: true,
        };
      });

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
              status: "Issued",
              isIssued: true,
              fileUrl: val,
              isUploadedDoc: true,
            });
          }
        });
      }

      const combined = [...certificateDocs, ...uploadedDocs];
      setDocs(combined);
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

      setToastMessage(`Request for ${docType} submitted successfully to Administration/Examination Cell!`);
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

  const handlePrintDocument = (doc = selectedDocModal) => {
    if (!doc || !child) return;

    const parentName = child.parentName || parentUser?.name || "Parent / Guardian";
    const studentName = child.name || "Student";
    const admissionNo = child.admissionNo || "ADM-001";
    const rollNo = child.roll || "01";
    const courseGroup = child.programme || child.group || "MPC";
    const academicYear = child.academicYear || "2026-2027";
    const classLevel = child.level || "Intermediate 1st Year";
    const docTitle = String(doc.title || "Official Certificate").toUpperCase();
    const docNo = doc.docNo || `CERT-${doc.id || "001"}`;
    const issueDate = doc.issuedDate && doc.issuedDate !== "Under Process"
      ? doc.issuedDate
      : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const purpose = doc.purpose || "Official Verification";

    const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${docTitle} - ${studentName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .cert-frame {
      width: 100%;
      max-width: 720px;
      border: 3px double #1e3a8a;
      border-radius: 12px;
      padding: 40px 36px;
      background: #ffffff;
      min-height: 860px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cert-header {
      text-align: center;
      border-bottom: 2px dashed #94a3b8;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .college-name {
      font-size: 26px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: 1px;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .college-sub {
      font-size: 13px;
      color: #475569;
      margin: 0 0 16px 0;
    }
    .cert-title-badge {
      display: inline-block;
      padding: 6px 24px;
      background: #f8fafc;
      border: 2px solid #1e3a8a;
      border-radius: 6px;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .cert-meta {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }
    .cert-body {
      font-size: 15px;
      line-height: 2.1;
      color: #1e293b;
      margin: 36px 0;
      text-align: justify;
    }
    .cert-body strong {
      color: #0f172a;
      font-weight: 700;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #cbd5e1;
    }
    .cert-issue-info {
      font-size: 13px;
      color: #334155;
      line-height: 1.8;
    }
    .cert-sig-box {
      text-align: center;
      min-width: 200px;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      margin-top: 55px;
      padding-top: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="cert-frame">
    <div>
      <div class="cert-header">
        <h1 class="college-name">PIRNAV JUNIOR COLLEGE</h1>
        <p class="college-sub">Campus Road, Jubilee Hills, Hyderabad - 500033 • Recognized by State Board of Intermediate Education</p>
        <div class="cert-title-badge">${docTitle}</div>
        <div class="cert-meta">Certificate Ref No: <strong>${docNo}</strong></div>
      </div>

      <div class="cert-body">
        This is to certify that <strong>${studentName}</strong>, 
        Son/Daughter of <strong>Sri ${parentName}</strong>, 
        bearing Admission Number <strong>${admissionNo}</strong> and Roll Number <strong>${rollNo}</strong>, 
        is a bonafide student of this institution studying in <strong>${classLevel}</strong>, 
        Course/Group <strong>${courseGroup}</strong> during the academic year <strong>${academicYear}</strong>.
        <br><br>
        As per college records, the student maintains good character and conduct. 
        This certificate is issued for the purpose of <strong>${purpose}</strong> upon parent request.
      </div>
    </div>

    <div class="cert-footer">
      <div class="cert-issue-info">
        <div>Date of Issue: <strong>${issueDate}</strong></div>
        <div>Place: <strong>Hyderabad</strong></div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Status: <strong>Official / Verified Record</strong></div>
      </div>
      <div class="cert-sig-box">
        <div class="sig-line">Principal & Head of Institution</div>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener("load", function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      const docFrame = iframe.contentWindow.document;
      docFrame.open();
      docFrame.write(printHtml);
      docFrame.close();
      iframe.contentWindow.focus();
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => iframe.remove(), 1000);
      }, 400);
    }
  };

  const handleDownload = async (doc) => {
    if (!doc.isIssued) {
      setToastMessage("Certificate has not been issued yet. It will be available once approved by Administration/Examination Cell.");
      return;
    }

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
        // Fallback: Generate official PDF using jsPDF
        try {
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

          // Double border
          pdf.setDrawColor(30, 58, 138);
          pdf.setLineWidth(1.5);
          pdf.rect(10, 10, 190, 277);
          pdf.setLineWidth(0.5);
          pdf.rect(12, 12, 186, 273);

          // College Header
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(20);
          pdf.setTextColor(30, 58, 138);
          pdf.text("PIRNAV JUNIOR COLLEGE", 105, 30, { align: "center" });

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);
          pdf.text("Campus Road, Jubilee Hills, Hyderabad - 500033 • Recognized by State Board", 105, 37, { align: "center" });

          // Certificate Title
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.setTextColor(15, 23, 42);
          pdf.text(String(doc.title || "OFFICIAL CERTIFICATE").toUpperCase(), 105, 52, { align: "center" });

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Certificate No: ${doc.docNo || "CERT-2026"}`, 105, 58, { align: "center" });

          // Divider
          pdf.setDrawColor(203, 213, 225);
          pdf.line(20, 65, 190, 65);

          // Body
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(30, 41, 59);

          const parentName = child.parentName || parentUser?.name || "Parent/Guardian";
          const bodyText = `This is to certify that ${child.name}, Son/Daughter of Sri ${parentName}, bearing Admission Number ${child.admissionNo} and Roll Number ${child.roll || "01"}, is a bonafide student of this institution studying in ${child.level || "Intermediate 1st Year"}, Course/Group ${child.programme || child.group || "MPC"} during the academic year ${child.academicYear || "2026-2027"}.\n\nAs per college records, the student maintains good character and conduct. This certificate is issued for the purpose of ${doc.purpose || "Official Purpose"} upon parent request.`;

          const splitText = pdf.splitTextToSize(bodyText, 170);
          pdf.text(splitText, 20, 80);

          // Footer
          const issueDate = doc.issuedDate && doc.issuedDate !== "Under Process" ? doc.issuedDate : new Date().toLocaleDateString("en-GB");
          pdf.setFontSize(10);
          pdf.setTextColor(51, 65, 85);
          pdf.text(`Date of Issue: ${issueDate}`, 20, 240);
          pdf.text("Place: Hyderabad", 20, 246);
          pdf.text("Status: Verified & Issued", 20, 252);

          pdf.line(140, 245, 190, 245);
          pdf.setFont("helvetica", "bold");
          pdf.text("Principal & Head of Institution", 165, 250, { align: "center" });

          pdf.save(`${doc.docNo || "certificate"}.pdf`);
        } catch (pdfErr) {
          setToastMessage("Failed to download certificate PDF. Please try again.");
        }
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
                    Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={7} />)
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
                        <span className={`cms-badge ${doc.isIssued ? "cms-badge-active" : (doc.status === "Approved" ? "cms-badge-info" : "cms-badge-warn")}`}>
                          {doc.isIssued ? "• Issued" : `• ${doc.status === "Approved" ? "Approved" : (doc.status === "Generated" || doc.status === "Reviewed" ? "Under Review" : "Requested")}`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {doc.isIssued ? (
                            <>
                              <button
                                type="button"
                                className="cms-btn cms-btn-sm cms-btn-outline"
                                onClick={() => setSelectedDocModal(doc)}
                                title="View Issued Certificate"
                              >
                                <Eye size={13} /> View
                              </button>
                              <button
                                type="button"
                                className="cms-btn cms-btn-sm cms-btn-outline"
                                onClick={() => handlePrintDocument(doc)}
                                title="Print Official Certificate"
                              >
                                <Printer size={13} /> Print
                              </button>
                              <button
                                type="button"
                                className="cms-btn cms-btn-sm cms-btn-primary"
                                disabled={downloadingId === doc.id}
                                title="Download Official PDF"
                                onClick={() => handleDownload(doc)}
                              >
                                {downloadingId === doc.id ? (
                                  <Loader2 size={13} className="cms-spin" />
                                ) : (
                                  <Download size={13} />
                                )}
                              </button>
                            </>
                          ) : (
                            <span
                              style={{
                                fontSize: 11.5,
                                fontWeight: 600,
                                color: "#b45309",
                                background: "rgba(245, 158, 11, 0.1)",
                                border: "1px solid rgba(245, 158, 11, 0.25)",
                                padding: "4px 10px",
                                borderRadius: 6,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              Pending Approval
                            </span>
                          )}
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
                Applications are processed within 2 working days. Once approved and issued by Administration or Examination Cell, you can view, print, and download the verified PDF directly here.
              </p>
            </form>
          </Modal>
        )}

        {/* Document Preview Modal */}
        {selectedDocModal && selectedDocModal.isIssued && (
          <Modal
            title={`Document Preview — ${selectedDocModal.title}`}
            onClose={() => setSelectedDocModal(null)}
            size="lg"
            className="parent-document-preview-modal"
            footer={
              <>
                <button type="button" className="cms-btn cms-btn-outline" onClick={() => setSelectedDocModal(null)}>Close</button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={() => handlePrintDocument(selectedDocModal)}
                >
                  <Printer size={14} /> Print Document
                </button>
              </>
            }
          >
            <div className="parent-receipt-sheet" id="parent-certificate-print-sheet">
              <div className="parent-receipt-header">
                <h2>PIRNAV JUNIOR COLLEGE</h2>
                <p>Campus Road, Jubilee Hills, Hyderabad - 500033 • Recognized by State Board of Intermediate Education</p>
                <strong style={{ display: "block", marginTop: 8, fontSize: 16, color: "#1e3a8a", letterSpacing: "0.5px" }}>
                  {selectedDocModal.title.toUpperCase()}
                </strong>
                <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 4 }}>Certificate No: {selectedDocModal.docNo}</div>
              </div>

              <div style={{ fontSize: 14.5, lineHeight: 2, margin: "28px 0", color: "var(--cms-text)" }}>
                This is to certify that <strong>{child.name}</strong>, Son/Daughter of <strong>Sri {child.parentName || parentUser?.name || "Parent/Guardian"}</strong>,
                bearing Admission Number <strong>{child.admissionNo}</strong> and Roll Number <strong>{child.roll || "01"}</strong>,
                is a bonafide student of this institution studying in <strong>{child.level || "Intermediate 1st Year"}</strong>,
                Course/Group <strong>{child.programme || child.group || "MPC"}</strong> during the academic year <strong>{child.academicYear || "2026-2027"}</strong>.
                <br /><br />
                As per college records, the student maintains good character and conduct. This certificate is issued for the purpose of <strong>{selectedDocModal.purpose}</strong> upon parent request.
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 40, paddingTop: 16, borderTop: "1px solid #cbd5e1" }}>
                <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                  <div>Date of Issue: <strong>{selectedDocModal.issuedDate}</strong></div>
                  <div>Place: <strong>Hyderabad</strong></div>
                  <div style={{ fontSize: 11, color: "var(--cms-muted)", marginTop: 2 }}>Status: <strong>Official / Verified Record</strong></div>
                </div>
                <div style={{ textAlign: "center", minWidth: 180 }}>
                  <div style={{ height: 35 }}></div>
                  <div style={{ borderTop: "1.5px solid #334155", paddingTop: 4, fontSize: 12, fontWeight: 700 }}>Principal & Head of Institution</div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  );
}
