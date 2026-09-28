import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import * as campusApi from "../api/campusApi.js";
import { getAuthToken } from "../features/authStorage.js";

const CampusContext = createContext(null);

const STORAGE_KEY_CAMPUSES = "cms_campuses_data";
const STORAGE_KEY_SELECTED_CAMPUS = "cms_selected_campus_id";

const DEFAULT_CAMPUSES = [
  {
    id: 1,
    campusId: 1,
    name: "Main Campus (HQ)",
    campusName: "Main Campus (HQ)",
    code: "MAIN",
    campusCode: "MAIN",
    address: "123 University Blvd, Central District",
    phone: "+91 98765 43210",
    contactPhone: "+91 98765 43210",
    email: "maincampus@pirnav.edu",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
    ],
    affiliatedBoards: [
      {
        boardId: 1,
        boardCode: "BIEAP",
        boardName: "Board of Intermediate Education, Andhra Pradesh",
        isActive: true,
      },
    ],
    boardIds: [1],
    isHQ: true,
    isActive: true,
    status: "Active",
    createdAt: "2026-09-23T11:14:43",
  },
  {
    id: 2,
    campusId: 2,
    name: "North Branch",
    campusName: "North Branch",
    code: "NORTH",
    campusCode: "NORTH",
    address: "45 Knowledge Park, North Sector",
    phone: "+91 98765 43211",
    contactPhone: "+91 98765 43211",
    email: "north@pirnav.edu",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
    ],
    affiliatedBoards: [
      {
        boardId: 1,
        boardCode: "BIEAP",
        boardName: "Board of Intermediate Education, Andhra Pradesh",
        isActive: true,
      },
    ],
    boardIds: [1],
    isHQ: false,
    isActive: true,
    status: "Active",
    createdAt: "2026-09-23T11:14:44",
  },
  {
    id: 3,
    campusId: 3,
    name: "South Campus",
    campusName: "South Campus",
    code: "SOUTH",
    campusCode: "SOUTH",
    address: "78 Tech Corridor, South Block",
    phone: "+91 98765 43212",
    contactPhone: "+91 98765 43212",
    email: "south@pirnav.edu",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
    ],
    affiliatedBoards: [
      {
        boardId: 1,
        boardCode: "BIEAP",
        boardName: "Board of Intermediate Education, Andhra Pradesh",
        isActive: true,
      },
    ],
    boardIds: [1],
    isHQ: false,
    isActive: true,
    status: "Active",
    createdAt: "2026-09-23T11:14:45",
  },
  {
    id: 4,
    campusId: 4,
    name: "City Center Campus",
    campusName: "City Center Campus",
    code: "CITY",
    campusCode: "CITY",
    address: "12 Downtown Metro Avenue",
    phone: "+91 98765 43213",
    contactPhone: "+91 98765 43213",
    email: "city@pirnav.edu",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
    ],
    affiliatedBoards: [
      {
        boardId: 1,
        boardCode: "BIEAP",
        boardName: "Board of Intermediate Education, Andhra Pradesh",
        isActive: true,
      },
    ],
    boardIds: [1],
    isHQ: false,
    isActive: true,
    status: "Active",
    createdAt: "2026-09-23T11:14:46",
  },
];

export function CampusProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load campuses from localStorage or fallback
  const [campuses, setCampuses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CAMPUSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(campusApi.normalizeCampus);
        }
      }
    } catch (e) {
      console.warn("Failed to load campuses from localStorage", e);
    }
    return DEFAULT_CAMPUSES.map(campusApi.normalizeCampus);
  });

  // Selected campus state
  const [selectedCampusId, setSelectedCampusId] = useState(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_SELECTED_CAMPUS);
      if (savedId) return savedId;
    } catch (e) {
      console.warn("Failed to load selected campus id", e);
    }
    return DEFAULT_CAMPUSES[0]?.id || "";
  });

  // Fetch live campuses from backend
  const fetchCampuses = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await campusApi.getCampuses();
      if (Array.isArray(data) && data.length > 0) {
        setCampuses(data);
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

  // Save campuses to localStorage on update
  useEffect(() => {
    try {
      if (campuses?.length) {
        localStorage.setItem(STORAGE_KEY_CAMPUSES, JSON.stringify(campuses));
      }
    } catch (e) {
      console.warn("Failed to persist campuses to localStorage", e);
    }
  }, [campuses]);

  // Save selected campus id to localStorage
  useEffect(() => {
    try {
      if (selectedCampusId != null && selectedCampusId !== "") {
        localStorage.setItem(STORAGE_KEY_SELECTED_CAMPUS, String(selectedCampusId));
      }
    } catch (e) {
      console.warn("Failed to persist selected campus id", e);
    }
  }, [selectedCampusId]);

  // Derived active campuses for header/navbar selection
  const activeCampuses = useMemo(() => {
    if (!Array.isArray(campuses)) return [];
    return campuses.filter((c) => {
      if (!c) return false;
      if (c.isActive === false) return false;
      const statusStr = String(c.status || "").toLowerCase();
      if (statusStr === "inactive") return false;
      return true;
    });
  }, [campuses]);

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

export function useCampusContext() {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error("useCampusContext must be used within a CampusProvider");
  }
  return context;
}

export const useCampus = useCampusContext;
export default CampusContext;
