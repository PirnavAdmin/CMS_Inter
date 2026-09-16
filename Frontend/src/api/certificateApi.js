import api from "./axios";

// ==================== CERTIFICATES API ====================

// 1. Get all certificates with filters (search, status, certificateType)
export const getCertificates = (params) => {
  return api.get("/api/v1/certificates", { params });
};

// 2. Get workflow stage summary counts (5 Badges: Generated, Reviewed, Approved, Issued, Cancelled)
export const getCertificateWorkflowStats = () => {
  return api.get("/api/v1/certificates/workflow-stats");
};

// 3. Get students dropdown for Create Certificate form auto-fill
export const getCertificateStudentsDropdown = () => {
  return api.get("/api/v1/certificates/students-dropdown");
};

// 4. Get single certificate details by ID
export const getCertificateById = (id) => {
  return api.get(`/api/v1/certificates/${id}`);
};

// 4.1. Get hydrated certificate preview by ID (interpolated template & placeholders)
export const getCertificatePreview = (id) => {
  return api.get(`/api/v1/certificates/${id}/preview`);
};

// 4.2. Dynamically render certificate template with payload
export const renderCertificateTemplate = (payload) => {
  return api.post("/api/v1/certificates/render-template", payload);
};

// 5. Generate / Create Certificate
export const generateCertificate = (data) => {
  return api.post("/api/v1/certificates/generate", data);
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

// 9. Bulk Approve (Approves all reviewed certificates)
export const bulkApproveCertificates = () => {
  return api.patch("/api/v1/certificates/bulk-approve");
};

// 10. Bulk Issue (Issues all approved certificates)
export const bulkIssueCertificates = (issuedBy) => {
  return api.patch("/api/v1/certificates/bulk-issue", null, {
    params: issuedBy ? { issuedBy } : {},
  });
};

// 11. Cancel Certificate
export const cancelCertificate = (id) => {
  return api.patch(`/api/v1/certificates/${id}/cancel`);
};

// 12. Delete Certificate
export const deleteCertificate = (id) => {
  return api.delete(`/api/v1/certificates/${id}`);
};

// 13. Download Certificate PDF Stream
export const downloadCertificatePdf = (id) => {
  return api.get(`/api/v1/certificates/download/${id}`, {
    responseType: "blob",
  });
};

// 14. Verify Certificate Publicly
export const verifyCertificate = (certificateNo) => {
  return api.get(`/api/v1/certificates/verify/${encodeURIComponent(certificateNo)}`);
};
