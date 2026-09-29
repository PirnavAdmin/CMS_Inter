import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/api/axios.js";
import { getCurrentStudent } from "../services/studentAcademicService.js";

const StudentProfileContext = createContext(null);

export function StudentProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await getCurrentStudent();
      setProfile(next);
      return next;
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshProfile().catch(() => {}); }, [refreshProfile]);
  const value = useMemo(() => ({ profile, loading, error, refreshProfile }), [profile, loading, error, refreshProfile]);
  return <StudentProfileContext.Provider value={value}>{children}</StudentProfileContext.Provider>;
}

export const useStudentProfile = () => useContext(StudentProfileContext);
