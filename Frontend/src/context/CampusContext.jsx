import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import * as campusApi from "../api/campusApi.js";
import { getAuthToken, getAuthUser, saveAuthSession } from "../modules/auth/authStorage.js";
import apiClient from "../api/axios.js";
import { apiEndpoints } from "../api/apiEndpoints.js";

const CampusContext = createContext(null);

const STORAGE_KEY_CAMPUSES = "cms_campuses_data";
const STORAGE_KEY_SELECTED_CAMPUS = "cms_selected_campus_id";

import { DEFAULT_CAMPUSES } from "../data/defaultCampuses.js";
export { DEFAULT_CAMPUSES };

const getTenantKeySuffix = () => {
  const u = getAuthUser();
  return u?.collegeId ? `_c${u.collegeId}` : "";
};

export function CampusProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load campuses from tenant-scoped localStorage (never leak another college's campuses)
  const [campuses, setCampuses] = useState(() => {
    const u = getAuthUser();
    const suffix = getTenantKeySuffix();
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_CAMPUSES}${suffix}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(campusApi.normalizeCampus);
        }
      }
    } catch (e) {
      console.warn("Failed to load campuses from localStorage", e);
    }
    if (u?.collegeId && Number(u.collegeId) > 1) return [];
    return DEFAULT_CAMPUSES.map(campusApi.normalizeCampus);
  });

  // Selected campus state (tenant-scoped)
  const [selectedCampusId, setSelectedCampusId] = useState(() => {
    const u = getAuthUser();
    const suffix = getTenantKeySuffix();
    if (u?.collegeId && Number(u.collegeId) > 1 && campuses.length === 0) {
      return "";
    }
    try {
      const savedId = localStorage.getItem(`${STORAGE_KEY_SELECTED_CAMPUS}${suffix}`);
      if (savedId) {
        if (campuses.length === 0 || campuses.some((c) => String(c.id) === String(savedId) || String(c.campusId) === String(savedId))) {
          return savedId;
        }
      }
    } catch (e) {
      console.warn("Failed to load selected campus id", e);
    }
    if (u?.collegeId && Number(u.collegeId) > 1) return "";
    return DEFAULT_CAMPUSES[0]?.id || "";
  });

  // For Principal or assigned staff role, track their assigned campus IDs
  const [principalAssignedCampusIds, setPrincipalAssignedCampusIds] = useState(() => {
    const u = getAuthUser();
    if (Array.isArray(u?.assignedCampusIds) && u.assignedCampusIds.length > 0) {
      return u.assignedCampusIds.map(Number);
    }
    if (u?.campusId) {
      return [Number(u.campusId)];
    }
    return null;
  });

  // Keep assigned campuses updated on auth change or fetch from profile if missing
  useEffect(() => {
    const u = getAuthUser();
    if (!u) return;

    const roleStr = String(u.role || "").trim().toLowerCase();
    const isAdmin = roleStr === "admin" || roleStr === "superadmin" || roleStr === "administrator";
    if (isAdmin) return; // Admins have full access to all campuses

    if (Array.isArray(u.assignedCampusIds) && u.assignedCampusIds.length > 0) {
      setPrincipalAssignedCampusIds(u.assignedCampusIds.map(Number));
      return;
    }

    if (u.campusId) {
      setPrincipalAssignedCampusIds([Number(u.campusId)]);
      return;
    }

    // Only query staff profile if role is principal or non-admin staff needing profile lookup
    const isPrincipal = roleStr === "principal";
    const targetStaffId = u.staffId || u.id;
    if (isPrincipal && targetStaffId) {
      apiClient.get(apiEndpoints.faculty.getById(targetStaffId), { silent: true, skipErrorLog: true })
        .then((res) => {
          const data = res?.data?.data || res?.data;
          if (data) {
            const ids = Array.isArray(data.assignedCampusIds) && data.assignedCampusIds.length > 0
              ? data.assignedCampusIds.map(Number)
              : (data.campusId ? [Number(data.campusId)] : []);
            if (ids.length > 0) {
              setPrincipalAssignedCampusIds(ids);
              const token = getAuthToken();
              saveAuthSession({ token, user: { ...u, assignedCampusIds: ids, assignedBoardIds: data.assignedBoardIds || [] }, role: u.role }, true);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Fetch live campuses from backend
  const fetchCampuses = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await campusApi.getCampuses();
      if (Array.isArray(data)) {
        setCampuses(data);
        setSelectedCampusId((prev) => {
          const exists = data.some(
            (c) => String(c.id) === String(prev) || String(c.campusId) === String(prev)
          );
          if (exists) return prev;
          return data[0]?.id ? String(data[0].id) : (data[0]?.campusId ? String(data[0].campusId) : "");
        });
      }
    } catch (err) {
      console.warn("Could not fetch campuses from API, keeping cached:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  // Save campuses to tenant-scoped localStorage on update
  useEffect(() => {
    const suffix = getTenantKeySuffix();
    try {
      if (Array.isArray(campuses)) {
        localStorage.setItem(`${STORAGE_KEY_CAMPUSES}${suffix}`, JSON.stringify(campuses));
      }
    } catch (e) {
      console.warn("Failed to persist campuses to localStorage", e);
    }
  }, [campuses]);

  // Save selected campus id to tenant-scoped localStorage
  useEffect(() => {
    const suffix = getTenantKeySuffix();
    try {
      if (selectedCampusId != null && selectedCampusId !== "") {
        localStorage.setItem(`${STORAGE_KEY_SELECTED_CAMPUS}${suffix}`, String(selectedCampusId));
      } else {
        localStorage.removeItem(`${STORAGE_KEY_SELECTED_CAMPUS}${suffix}`);
      }
    } catch (e) {
      console.warn("Failed to persist selected campus id", e);
    }
  }, [selectedCampusId]);

  // Derived active campuses for header/navbar selection
  const activeCampuses = useMemo(() => {
    if (!Array.isArray(campuses)) return [];
    const allActive = campuses.filter((c) => {
      if (!c) return false;
      if (c.isActive === false) return false;
      const statusStr = String(c.status || "").toLowerCase();
      if (statusStr === "inactive") return false;
      return true;
    });

    const u = getAuthUser();
    const roleStr = String(u?.role || "").trim().toLowerCase();
    const isAdmin = roleStr === "admin" || roleStr === "superadmin" || roleStr === "administrator";

    if (isAdmin) {
      return allActive;
    }

    const assignedIds = principalAssignedCampusIds || 
      (Array.isArray(u?.assignedCampusIds) && u.assignedCampusIds.length > 0 
        ? u.assignedCampusIds.map(Number) 
        : (u?.campusId ? [Number(u.campusId)] : null));

    if (Array.isArray(assignedIds) && assignedIds.length > 0) {
      const allowedSet = new Set(assignedIds);
      const filtered = allActive.filter((c) => {
        const cId = Number(c.id ?? c.campusId);
        return allowedSet.has(cId);
      });
      if (filtered.length > 0) {
        return filtered;
      }
    }

    if (u?.campusId) {
      const cId = Number(u.campusId);
      const filtered = allActive.filter((c) => Number(c.id ?? c.campusId) === cId);
      if (filtered.length > 0) return filtered;
    }

    return allActive;
  }, [campuses, principalAssignedCampusIds]);

  // Derived selectedCampus object
  const selectedCampus = useMemo(() => {
    const list = activeCampuses.length > 0 ? activeCampuses : campuses;
    if (!list?.length) return null;
    const strId = String(selectedCampusId);
    return (
      list.find((c) => String(c.id) === strId || String(c.campusId) === strId) ||
      list.find((c) => c.isHQ) ||
      list[0] ||
      null
    );
  }, [activeCampuses, campuses, selectedCampusId]);

  // Auto-sync selectedCampusId if the active list changes and current selection is not in active campuses
  useEffect(() => {
    if (activeCampuses.length > 0) {
      const exists = activeCampuses.some((c) => String(c.id) === String(selectedCampusId) || String(c.campusId) === String(selectedCampusId));
      if (!exists && selectedCampus) {
        setSelectedCampusId(String(selectedCampus.id ?? selectedCampus.campusId));
      }
    }
  }, [activeCampuses, selectedCampus, selectedCampusId]);

  // Setter for selected campus (supports object or ID string/number)
  const handleSetSelectedCampus = useCallback((campusOrId) => {
    if (!campusOrId) return;
    if (typeof campusOrId === "object") {
      const targetId = campusOrId.id ?? campusOrId.campusId;
      if (targetId != null) setSelectedCampusId(String(targetId));
    } else {
      setSelectedCampusId(String(campusOrId));
    }
  }, []);

  // Add new campus
  const addCampus = useCallback(async (campusData) => {
    try {
      const created = await campusApi.createCampus(campusData);
      setCampuses((prev) => [created, ...prev.filter((c) => String(c.id) !== String(created.id))]);
      return created;
    } catch (err) {
      // Fallback local addition if offline
      console.warn("API creation failed, adding locally:", err);
      const fallbackCampus = campusApi.normalizeCampus({
        ...campusData,
        id: `CAMPUS-${Date.now().toString(36).toUpperCase()}`,
        campusId: Date.now(),
        createdAt: new Date().toISOString(),
        status: campusData.status || "Active",
        isActive: campusData.isActive !== false,
      });
      setCampuses((prev) => [fallbackCampus, ...prev]);
      throw err;
    }
  }, []);

  // Update existing campus
  const updateCampus = useCallback(async (id, updatedData) => {
    try {
      const updated = await campusApi.updateCampus(id, updatedData);
      setCampuses((prev) =>
        prev.map((c) => (String(c.id) === String(id) || String(c.campusId) === String(id) ? updated : c))
      );
      return updated;
    } catch (err) {
      console.warn("API update failed, updating locally:", err);
      setCampuses((prev) =>
        prev.map((c) =>
          String(c.id) === String(id) || String(c.campusId) === String(id)
            ? campusApi.normalizeCampus({ ...c, ...updatedData, updatedAt: new Date().toISOString() })
            : c
        )
      );
      throw err;
    }
  }, []);

  // Delete campus
  const deleteCampus = useCallback(async (id) => {
    try {
      await campusApi.deleteCampus(id);
      setCampuses((prev) => {
        const remaining = prev.filter((c) => String(c.id) !== String(id) && String(c.campusId) !== String(id));
        if (String(selectedCampusId) === String(id) && remaining.length > 0) {
          setSelectedCampusId(String(remaining[0].id || remaining[0].campusId));
        }
        return remaining;
      });
    } catch (err) {
      console.warn("API delete failed, deleting locally:", err);
      setCampuses((prev) => {
        const remaining = prev.filter((c) => String(c.id) !== String(id) && String(c.campusId) !== String(id));
        if (String(selectedCampusId) === String(id) && remaining.length > 0) {
          setSelectedCampusId(String(remaining[0].id || remaining[0].campusId));
        }
        return remaining;
      });
      throw err;
    }
  }, [selectedCampusId]);

  // Toggle status
  const toggleCampusStatus = useCallback(async (id) => {
    try {
      await campusApi.toggleCampusStatus(id);
      setCampuses((prev) =>
        prev.map((c) => {
          if (String(c.id) === String(id) || String(c.campusId) === String(id)) {
            const nextActive = !c.isActive;
            return {
              ...c,
              isActive: nextActive,
              status: nextActive ? "Active" : "Inactive",
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.warn("API toggle status failed:", err);
      throw err;
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      campuses,
      activeCampuses,
      selectedCampus,
      selectedCampusId,
      setSelectedCampus: handleSetSelectedCampus,
      fetchCampuses,
      addCampus,
      updateCampus,
      deleteCampus,
      toggleCampusStatus,
      loading,
      error,
    }),
    [
      campuses,
      activeCampuses,
      selectedCampus,
      selectedCampusId,
      handleSetSelectedCampus,
      fetchCampuses,
      addCampus,
      updateCampus,
      deleteCampus,
      toggleCampusStatus,
      loading,
      error,
    ]
  );

  return <CampusContext.Provider value={contextValue}>{children}</CampusContext.Provider>;
}

const EMPTY_CAMPUS_CONTEXT = {
  campuses: [],
  activeCampuses: [],
  selectedCampus: null,
  selectedCampusId: "",
  setSelectedCampus: () => {},
  fetchCampuses: () => Promise.resolve(),
  addCampus: () => Promise.resolve(),
  updateCampus: () => Promise.resolve(),
  deleteCampus: () => Promise.resolve(),
  toggleCampusStatus: () => Promise.resolve(),
  loading: false,
  error: null,
};

export function useCampusContext() {
  const context = useContext(CampusContext);
  return context || EMPTY_CAMPUS_CONTEXT;
}

export const useCampus = useCampusContext;
export default CampusContext;
