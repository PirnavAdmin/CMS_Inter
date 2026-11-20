import apiClient from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

/**
 * 1. GET /api/v1/settings/templates
 * Fetch all templates with pagination, keyword search, category filter, and active status filter.
 */
export async function getTemplates({
  pageNumber = 1,
  pageSize = 50,
  search = "",
  category = "",
  isActive = null,
} = {}) {
  const params = {
    pageNumber,
    pageSize,
  };
  if (search && search.trim()) params.search = search.trim();
  if (category && category !== "All Categories" && category !== "All") params.category = category.trim();
  if (typeof isActive === "boolean") params.isActive = isActive;

  const response = await apiClient.get(apiEndpoints.settingsTemplates.list, { params });
  return response.data;
}

/**
 * 2. GET /api/v1/settings/templates/categories
 * Fetch available template categories.
 */
export async function getTemplateCategories() {
  const response = await apiClient.get(apiEndpoints.settingsTemplates.categories);
  return response.data;
}

/**
 * 3. GET /api/v1/settings/templates/{id}
 * Fetch a single template by its identifier.
 */
export async function getTemplateById(id) {
  const response = await apiClient.get(apiEndpoints.settingsTemplates.getById(id));
  return response.data;
}

/**
 * 4. GET /api/v1/settings/templates/by-code/{templateCode}
 * Fetch a single template by its unique code (e.g. BONAFIDE_CERT, TRANSFER_CERT).
 */
export async function getTemplateByCode(templateCode) {
  const response = await apiClient.get(apiEndpoints.settingsTemplates.getByCode(templateCode));
  return response.data;
}

/**
 * 5. POST /api/v1/settings/templates
 * Create a new template with dynamic placeholders and HTML content.
 */
export async function createTemplate(templateData) {
  const payload = {
    templateCode: templateData.templateCode || templateData.code || `TMPL_${Date.now()}`,
    title: templateData.title || templateData.name || "Untitled Template",
    category: templateData.category || "Student Certificate",
    certificateType: templateData.certificateType || templateData.category || null,
    contentBody: templateData.contentBody || templateData.content || "",
    placeholders: Array.isArray(templateData.placeholders)
      ? templateData.placeholders
      : Array.isArray(templateData.dynamicFields)
      ? templateData.dynamicFields
      : [],
    logoPath: templateData.logoPath || null,
    isDefault: Boolean(templateData.isDefault),
    isActive: templateData.isActive !== false && templateData.status !== "Inactive",
  };
  const response = await apiClient.post(apiEndpoints.settingsTemplates.create, payload);
  return response.data;
}

/**
 * 6. PUT /api/v1/settings/templates/{id}
 * Update an existing template (auto-increments Version and updates UpdatedAt).
 */
export async function updateTemplate(id, templateData) {
  const payload = {
    title: templateData.title || templateData.name,
    category: templateData.category || "Student Certificate",
    certificateType: templateData.certificateType || templateData.category || null,
    contentBody: templateData.contentBody || templateData.content || "",
    placeholders: Array.isArray(templateData.placeholders)
      ? templateData.placeholders
      : Array.isArray(templateData.dynamicFields)
      ? templateData.dynamicFields
      : [],
    logoPath: templateData.logoPath || null,
    isDefault: Boolean(templateData.isDefault),
    isActive: templateData.isActive !== false && templateData.status !== "Inactive",
  };
  const response = await apiClient.put(apiEndpoints.settingsTemplates.update(id), payload);
  return response.data;
}

/**
 * 7. DELETE /api/v1/settings/templates/{id}
 * Soft-delete / deactivate a template.
 */
export async function deleteTemplate(id) {
  const response = await apiClient.delete(apiEndpoints.settingsTemplates.delete(id));
  return response.data;
}

/**
 * 8. PATCH /api/v1/settings/templates/{id}/toggle-active
 * Toggle the active status of a template.
 */
export async function toggleTemplateActive(id) {
  const response = await apiClient.patch(apiEndpoints.settingsTemplates.toggleActive(id));
  return response.data;
}

/**
 * 9. POST /api/v1/settings/templates/preview
 * Dynamically render a template with real or sample placeholders.
 */
export async function previewTemplate(previewPayload) {
  const response = await apiClient.post(apiEndpoints.settingsTemplates.preview, previewPayload);
  return response.data;
}

/**
 * 10. POST /api/v1/settings/templates/upload-logo
 * Upload a persistent logo image file to server storage.
 */
export async function uploadTemplateLogo(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post(apiEndpoints.settingsTemplates.uploadLogo, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

/**
 * 11. POST /api/v1/settings/templates/{id}/duplicate
 * Duplicate an existing template.
 */
export async function duplicateTemplate(id) {
  const response = await apiClient.post(apiEndpoints.settingsTemplates.duplicate(id));
  return response.data;
}

/**
 * 12. POST /api/v1/settings/templates/{id}/set-default
 * Mark a template as default for its category.
 */
export async function setDefaultTemplate(id) {
  const response = await apiClient.post(apiEndpoints.settingsTemplates.setDefault(id));
  return response.data;
}

const templateApi = {
  getTemplates,
  getTemplateCategories,
  getTemplateById,
  getTemplateByCode,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
  previewTemplate,
  uploadTemplateLogo,
  duplicateTemplate,
  setDefaultTemplate,
};

export default templateApi;
