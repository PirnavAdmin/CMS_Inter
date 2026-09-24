import { createContext, useContext, useState, useEffect, useMemo } from "react";

const CampusContext = createContext(null);

const STORAGE_KEY_CAMPUSES = "cms_campuses_data";
const STORAGE_KEY_SELECTED_CAMPUS = "cms_selected_campus_id";

const DEFAULT_CAMPUSES = [
  {
    id: "CAMPUS-01",
    name: "Main Campus - Hyderabad",
    code: "HYD-MAIN",
    address: "Plot 45, Knowledge City, HITEC City, Hyderabad, Telangana - 500081",
    phone: "+91 40 6789 0123",
    email: "hyderabad@pirnavcolleges.edu.in",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
      "Telangana Board of Intermediate Education",
      "Central Board of Secondary Education",
    ],
    status: "Active",
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "CAMPUS-02",
    name: "City Campus - Vijayawada",
    code: "VJA-CITY",
    address: "MG Road, Opposite Municipal Complex, Vijayawada, Andhra Pradesh - 520010",
    phone: "+91 866 245 6789",
    email: "vijayawada@pirnavcolleges.edu.in",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
      "Central Board of Secondary Education",
    ],
    status: "Active",
    createdAt: "2024-02-10T00:00:00.000Z",
  },
  {
    id: "CAMPUS-03",
    name: "Guntur Campus",
    code: "GNT-01",
    address: "Brodipet 4th Lane, Guntur, Andhra Pradesh - 522002",
    phone: "+91 863 223 4567",
    email: "guntur@pirnavcolleges.edu.in",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
    ],
    status: "Active",
    createdAt: "2024-03-01T00:00:00.000Z",
  },
  {
    id: "CAMPUS-04",
    name: "Visakhapatnam Campus",
    code: "VSKP-01",
    address: "Dwaraka Nagar Main Road, Visakhapatnam, Andhra Pradesh - 530016",
    phone: "+91 891 278 9012",
    email: "vizag@pirnavcolleges.edu.in",
    boards: [
      "Board of Intermediate Education, Andhra Pradesh",
      "Council for the Indian School Certificate Examinations",
    ],
    status: "Inactive",
    createdAt: "2024-04-12T00:00:00.000Z",
  },
];

export function CampusProvider({ children }) {
  // Load campuses from localStorage or fallback
  const [campuses, setCampuses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CAMPUSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load campuses from localStorage", e);
    }
    return DEFAULT_CAMPUSES;
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

  // Save campuses to localStorage on update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CAMPUSES, JSON.stringify(campuses));
    } catch (e) {
      console.warn("Failed to persist campuses to localStorage", e);
    }
  }, [campuses]);

  // Save selected campus id to localStorage
  useEffect(() => {
    try {
      if (selectedCampusId) {
        localStorage.setItem(STORAGE_KEY_SELECTED_CAMPUS, selectedCampusId);
      }
    } catch (e) {
      console.warn("Failed to persist selected campus id", e);
    }
  }, [selectedCampusId]);

  // Derived selectedCampus object
  const selectedCampus = useMemo(() => {
    return (
      campuses.find((c) => c.id === selectedCampusId) ||
      campuses.find((c) => c.status === "Active" || c.status?.includes("Active")) ||
      campuses[0] ||
      null
    );
  }, [campuses, selectedCampusId]);

  // Setter for selected campus (supports object or ID string)
  const handleSetSelectedCampus = (campusOrId) => {
    if (!campusOrId) return;
    if (typeof campusOrId === "object" && campusOrId.id) {
      setSelectedCampusId(campusOrId.id);
    } else if (typeof campusOrId === "string") {
      setSelectedCampusId(campusOrId);
    }
  };

  // Add new campus
  const addCampus = (campusData) => {
    const newCampus = {
      ...campusData,
      id: campusData.id || `CAMPUS-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: campusData.status || "Active",
    };
    setCampuses((prev) => [newCampus, ...prev]);
    return newCampus;
  };

  // Update existing campus
  const updateCampus = (id, updatedData) => {
    setCampuses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedData, updatedAt: new Date().toISOString() } : c))
    );
  };

  // Delete campus
  const deleteCampus = (id) => {
    setCampuses((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (selectedCampusId === id && remaining.length > 0) {
        setSelectedCampusId(remaining[0].id);
      }
      return remaining;
    });
  };

  const contextValue = useMemo(
    () => ({
      campuses,
      selectedCampus,
      setSelectedCampus: handleSetSelectedCampus,
      addCampus,
      updateCampus,
      deleteCampus,
    }),
    [campuses, selectedCampus]
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

