import api from "./axios";

// ==================== CERTIFICATES API ====================

// 1. Get all certificates with filters (search, status, certificateType, campusId, boardId, academicYearId)
export const getCertificates = (params) => {
  return api.get("/api/v1/certificates", { params });
};

// 2. Get workflow stage summary counts (Requested, Generated, Reviewed, Approved, Issued, Cancelled)
export const getCertificateWorkflowStats = (params) => {
  return api.get("/api/v1/certificates/workflow-stats", { params });
};

// 3. Get students dropdown for Create Certificate form auto-fill
export const getCertificateStudentsDropdown = (params) => {
  return api.get("/api/v1/certificates/students-dropdown", { params });
};

// 4. Get single certificate details by ID
export const getCertificateById = (id) => {
  return api.get(`/api/v1/certificates/${id}`);
};

// 4.1. Get active certificate templates for dropdown
export const getActiveTemplates = () => {
  return api.get("/api/v1/certificates/active-templates");
};

// 4.2. Get hydrated certificate preview by ID (interpolated template & placeholders)
export const getCertificatePreview = (id) => {
  return api.get(`/api/v1/certificates/${id}/preview`);
};

// 4.3. Dynamically render certificate template with payload
export const renderCertificateTemplate = (payload) => {
  return api.post("/api/v1/certificates/render-template", payload);
};

// 5. Generate / Create Certificate
export const generateCertificate = (data) => {
  return api.post("/api/v1/certificates/generate", data);
};

// 5.1. Generate Certificate from Request
export const generateCertificateFromRequest = (id) => {
  return api.patch(`/api/v1/certificates/${id}/generate`);
};

// 6. Review Certificate (Generated -> Reviewed)
export const reviewCertificate = (id) => {
  return api.patch(`/api/v1/certificates/${id}/review`);
};

// 7. Approve Certificate (Reviewed -> Approved)
export const approveCertificate = (id) => {
  return api.patch(`/api/v1/certificates/${id}/approve`);
};

// 8. Issue Certificate (Approved -> Issued)
export const issueCertificate = (id, issuedBy) => {
  return api.patch(`/api/v1/certificates/${id}/issue`, null, {
    params: issuedBy ? { issuedBy } : {},
  });
};

// 9. Bulk Review (Reviews all generated/pending certificates for a campus)
export const bulkReviewCertificates = (campusId) => {
  return api.patch("/api/v1/certificates/bulk-review", null, {
    params: campusId ? { campusId } : {},
  });
};

// 10. Bulk Approve (Approves all reviewed certificates for a campus)
export const bulkApproveCertificates = (campusId) => {
  return api.patch("/api/v1/certificates/bulk-approve", null, {
    params: campusId ? { campusId } : {},
  });
};

// 11. Bulk Issue (Issues all approved certificates for a campus)
export const bulkIssueCertificates = (issuedBy, campusId) => {
  const params = {};
  if (issuedBy) params.issuedBy = issuedBy;
  if (campusId) params.campusId = campusId;
  return api.patch("/api/v1/certificates/bulk-issue", null, { params });
};

// 11.1. Bulk Eligible Students for grid selection
export const getBulkEligibleStudents = (params) => {
  return api.get("/api/v1/certificates/bulk-eligible-students", { params });
};

// 11.2. Bulk Generate Certificates
export const bulkGenerateCertificates = (data) => {
  return api.post("/api/v1/certificates/bulk-generate", data);
};

// 12. Cancel Certificate
export const cancelCertificate = (id) => {
  return api.patch(`/api/v1/certificates/${id}/cancel`);
};

// 13. Delete Certificate
export const deleteCertificate = (id) => {
  return api.delete(`/api/v1/certificates/${id}`);
};

// 13.1. Update Fee Clearance
export const updateFeeClearance = (id, data) => {
  return api.patch(`/api/v1/certificates/${id}/fee-clearance`, data);
};

// 13.2. Grant Fee Exemption / Principal Permission
export const grantFeeExemption = (id, data) => {
  return api.patch(`/api/v1/certificates/${id}/fee-exemption`, data);
};

// 14. Download Certificate PDF Stream
export const downloadCertificatePdf = (id) => {
  return api.get(`/api/v1/certificates/download/${id}`, {
    responseType: "blob",
  });
};

// 15. Verify Certificate Publicly
export const verifyCertificate = (certificateNo) => {
  return api.get(`/api/v1/certificates/verify/${encodeURIComponent(certificateNo)}`);
};

// 16. Export Certificates to Excel / CSV
export const exportCertificatesExcel = (params) => {
  return api.get("/api/v1/certificates/export/excel", {
    params,
    responseType: "blob",
  });
};

// 17. Export Certificates to Multi-Page PDF
export const exportCertificatesPdf = (params) => {
  return api.get("/api/v1/certificates/export/pdf", {
    params,
    responseType: "blob",
  });
};
