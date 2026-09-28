import apiClient, { getApiErrorMessage } from "./apiClient.js";
import { apiEndpoints } from "./apiEndpoints.js";

/**
 * Unwrap nested API responses (e.g. data, items, $values)
 */
const unwrapResponse = (res) => {
  const payload = res?.data !== undefined ? res.data : res;
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return payload;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values", "data", "Data", "payload", "Payload"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return payload;
};

/**
 * Normalizes a campus object to ensure uniform properties across UI and components
 */
export const normalizeCampus = (item) => {
  if (!item || typeof item !== "object") return item;

  const rawId = item.campusId ?? item.id ?? item.CampusId ?? item.Id;
  const id = rawId != null ? String(rawId) : "";
  const numericId = typeof rawId === "number" ? rawId : parseInt(rawId, 10) || 0;

  const name = item.campusName ?? item.name ?? item.CampusName ?? item.Name ?? "";
  const code = item.campusCode ?? item.code ?? item.CampusCode ?? item.Code ?? "";
  const address = item.address ?? item.Address ?? "";
  const phone = item.contactPhone ?? item.phone ?? item.ContactPhone ?? item.Phone ?? "";
  const email = item.email ?? item.Email ?? "";
  const isHQ = Boolean(item.isHQ ?? item.IsHQ ?? item.isDefault ?? false);
  const isActive = item.isActive !== undefined 
    ? Boolean(item.isActive) 
    : (item.status === "Active" || item.status === "Active (Displays in Header Selector)" || true);
  const status = item.status ?? (isActive ? "Active" : "Inactive");
  const studentCount = Number(item.studentCount ?? item.StudentCount ?? 0);
  const displayOrder = Number(item.displayOrder ?? item.DisplayOrder ?? 0);

  const affiliatedBoards = Array.isArray(item.affiliatedBoards)
    ? item.affiliatedBoards
    : Array.isArray(item.AffiliatedBoards)
    ? item.AffiliatedBoards
    : [];

  const boardIds = Array.isArray(item.boardIds)
    ? item.boardIds
    : Array.isArray(item.BoardIds)
    ? item.BoardIds
    : Array.isArray(item.affiliatedBoardIds)
    ? item.affiliatedBoardIds
    : affiliatedBoards.map((b) => b.boardId ?? b.id).filter(Boolean);

  const boards = affiliatedBoards.length > 0
    ? affiliatedBoards.map((b) => b.boardName || b.name || b.boardCode || b.code)
    : Array.isArray(item.boards)
    ? item.boards
    : [];

  return {
    ...item,
    id: id || numericId,
    campusId: numericId || id,
    name,
    campusName: name,
    code,
    campusCode: code,
    address,
    phone,
    contactPhone: phone,
    email,
    isHQ,
    isActive,
    status,
    studentCount,
    displayOrder,
    affiliatedBoards,
    boardIds,
    boards,
    createdAt: item.createdAt || item.CreatedAt,
    updatedAt: item.updatedAt || item.UpdatedAt,
  };
};

/**
 * 1. GET /api/v1/campuses
 * Retrieves all campuses with search and filtering (search, isActive, boardId).
 */
export async function getCampuses(params = {}) {
  try {
    const queryParams = {};
    if (params.search && String(params.search).trim()) {
      queryParams.search = String(params.search).trim();
    }
    if (params.isActive !== undefined && params.isActive !== null && params.isActive !== "All") {
      queryParams.isActive = typeof params.isActive === "boolean" ? params.isActive : params.isActive === "Active";
    }
    if (params.boardId) {
      queryParams.boardId = Number(params.boardId);
    }

    const response = await apiClient.get(apiEndpoints.campuses.list, { params: queryParams });
    const rawList = unwrapResponse(response);
    return Array.isArray(rawList) ? rawList.map(normalizeCampus) : [];
  } catch (error) {
    console.error("Failed to fetch campuses list:", error);
    throw new Error(getApiErrorMessage(error) || "Failed to load campuses.");
  }
}

/**
 * 2. POST /api/v1/campuses
 * Creates a new campus branch with affiliated boards.
 */
export async function createCampus(campusData) {
  try {
    const payload = {
      campusName: (campusData.campusName || campusData.name || "").trim(),
      campusCode: (campusData.campusCode || campusData.code || "").trim().toUpperCase(),
      address: (campusData.address || "").trim(),
      contactPhone: (campusData.contactPhone || campusData.phone || "").trim(),
      email: (campusData.email || "").trim(),
      isHQ: Boolean(campusData.isHQ),
      isActive: campusData.isActive !== undefined 
        ? Boolean(campusData.isActive) 
        : Boolean(campusData.status?.includes("Active")),
      boardIds: Array.isArray(campusData.boardIds) 
        ? campusData.boardIds.map((id) => Number(id)).filter((id) => !isNaN(id)) 
        : [],
    };

    const response = await apiClient.post(apiEndpoints.campuses.create, payload);
    const result = unwrapResponse(response);
    return normalizeCampus(result);
  } catch (error) {
    console.error("Failed to create campus:", error);
    throw new Error(getApiErrorMessage(error) || "Failed to create campus branch.");
  }
}

/**
 * 3. GET /api/v1/campuses/active-header
 * Retrieves lightweight active campuses for header branch selector dropdown.
 */
export async function getActiveHeaderCampuses() {
  try {
    const response = await apiClient.get(apiEndpoints.campuses.activeHeader);
    const rawList = unwrapResponse(response);
    return Array.isArray(rawList) ? rawList.map(normalizeCampus) : [];
  } catch (error) {
    console.warn("Failed to fetch active header campuses, falling back to full list:", error);
    // Fallback to getCampuses({ isActive: true }) if active-header endpoint is unavailable
    try {
      const fallbackList = await getCampuses({ isActive: true });
      return fallbackList;
    } catch {
      throw new Error(getApiErrorMessage(error) || "Failed to load active header campuses.");
    }
  }
}

/**
 * 4. GET /api/v1/campuses/stats
 * Retrieves statistics for the Campus Configuration screen cards.
 */
export async function getCampusStats(selectedCampusId = null) {
  try {
    const params = {};
    if (selectedCampusId != null && selectedCampusId !== "") {
      const parsedId = Number(selectedCampusId);
      if (!isNaN(parsedId)) {
        params.selectedCampusId = parsedId;
      }
    }

    const response = await apiClient.get(apiEndpoints.campuses.stats, { params });
    const data = unwrapResponse(response);
    return {
      totalCampuses: Number(data?.totalCampuses ?? data?.TotalCampuses ?? 0),
      activeInHeader: Number(data?.activeInHeader ?? data?.ActiveInHeader ?? 0),
      inactiveBranches: Number(data?.inactiveBranches ?? data?.InactiveBranches ?? 0),
      selectedBranch: data?.selectedBranch || data?.SelectedBranch ? normalizeCampus(data.selectedBranch || data.SelectedBranch) : null,
    };
  } catch (error) {
    console.warn("Failed to fetch campus stats from API:", error);
    return null;
  }
}

/**
 * 5. GET /api/v1/campuses/{id}
 * Retrieves single campus details by ID with affiliated boards.
 */
export async function getCampusById(id) {
  if (id == null || id === "") throw new Error("Campus ID is required");
  try {
    const response = await apiClient.get(apiEndpoints.campuses.getById(id));
    const result = unwrapResponse(response);
    return normalizeCampus(result);
  } catch (error) {
    console.error(`Failed to fetch campus with id ${id}:`, error);
    throw new Error(getApiErrorMessage(error) || "Failed to fetch campus details.");
  }
}

/**
 * 6. PUT /api/v1/campuses/{id}
 * Updates an existing campus branch details and affiliated boards.
 */
export async function updateCampus(id, campusData) {
  if (id == null || id === "") throw new Error("Campus ID is required for update");
  try {
    const numericId = typeof id === "number" ? id : parseInt(id, 10) || Number(campusData.campusId) || 0;
    const payload = {
      campusId: numericId,
      campusName: (campusData.campusName || campusData.name || "").trim(),
      campusCode: (campusData.campusCode || campusData.code || "").trim().toUpperCase(),
      address: (campusData.address || "").trim(),
      contactPhone: (campusData.contactPhone || campusData.phone || "").trim(),
      email: (campusData.email || "").trim(),
      isHQ: Boolean(campusData.isHQ),
      isActive: campusData.isActive !== undefined 
        ? Boolean(campusData.isActive) 
        : Boolean(campusData.status?.includes("Active")),
      boardIds: Array.isArray(campusData.boardIds) 
        ? campusData.boardIds.map((bid) => Number(bid)).filter((bid) => !isNaN(bid)) 
        : [],
    };

    const response = await apiClient.put(apiEndpoints.campuses.update(id), payload);
    const result = unwrapResponse(response);
    return normalizeCampus(result);
  } catch (error) {
    console.error(`Failed to update campus with id ${id}:`, error);
    throw new Error(getApiErrorMessage(error) || "Failed to update campus branch.");
  }
}

/**
 * 7. DELETE /api/v1/campuses/{id}
 * Deletes or soft-deletes a campus branch (if no active students enrolled).
 */
export async function deleteCampus(id) {
  if (id == null || id === "") throw new Error("Campus ID is required for deletion");
  try {
    const response = await apiClient.delete(apiEndpoints.campuses.delete(id));
    return response.data;
  } catch (error) {
    console.error(`Failed to delete campus with id ${id}:`, error);
    throw new Error(getApiErrorMessage(error) || "Failed to delete campus branch.");
  }
}

/**
 * 8. GET /api/v1/campuses/{id}/boards
 * Retrieves boards affiliated with a specific campus branch.
 */
export async function getCampusBoards(id) {
  if (id == null || id === "") throw new Error("Campus ID is required");
  try {
    const response = await apiClient.get(apiEndpoints.campuses.getBoards(id));
    const result = unwrapResponse(response);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error(`Failed to fetch affiliated boards for campus with id ${id}:`, error);
    throw new Error(getApiErrorMessage(error) || "Failed to load campus affiliated boards.");
  }
}

/**
 * 9. PATCH /api/v1/campuses/{id}/toggle-status
 * Toggles the active status of a campus branch (displays in header selector).
 */
export async function toggleCampusStatus(id) {
  if (id == null || id === "") throw new Error("Campus ID is required");
  try {
    const response = await apiClient.patch(apiEndpoints.campuses.toggleStatus(id));
    return response.data;
  } catch (error) {
    console.error(`Failed to toggle status for campus with id ${id}:`, error);
    throw new Error(getApiErrorMessage(error) || "Failed to toggle campus status.");
  }
}

export default {
  normalizeCampus,
  getCampuses,
  createCampus,
  getActiveHeaderCampuses,
  getCampusStats,
  getCampusById,
  updateCampus,
  deleteCampus,
  getCampusBoards,
  toggleCampusStatus,
};

