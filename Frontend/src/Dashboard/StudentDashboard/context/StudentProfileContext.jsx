import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/api/axios.js";
import { getCurrentStudent, getCurrentStudentPhotoFile } from "../services/studentAcademicService.js";

const StudentProfileContext = createContext(null);

export function StudentProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState({ path: "", url: "", error: "", loading: false });

  useEffect(() => {
    const path = profile?.photo;
    if (!path) { setPhoto({ path: "", url: "", error: "", loading: false }); return; }
    const controller = new AbortController();
    let objectUrl = "";
    setPhoto({ path, url: "", error: "", loading: true });
    getCurrentStudentPhotoFile(path, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setPhoto({ path, url: objectUrl, error: "", loading: false });
    }).catch((requestError) => {
      if (!controller.signal.aborted) setPhoto({ path, url: "", error: getApiErrorMessage(requestError), loading: false });
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [profile?.photo]);

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
  const applyPhotoRemoval = useCallback(() => {
    setProfile((current) => current ? { ...current, photo: null } : current);
  }, []);
  const value = useMemo(() => ({ profile, loading, error, refreshProfile, applyPhotoRemoval,
    photoUrl: photo.path === profile?.photo ? photo.url : "",
    photoError: photo.path === profile?.photo ? photo.error : "",
    photoLoading: photo.path === profile?.photo && photo.loading,
  }), [profile, loading, error, refreshProfile, photo, applyPhotoRemoval]);
  return <StudentProfileContext.Provider value={value}>{children}</StudentProfileContext.Provider>;
}

export const useStudentProfile = () => useContext(StudentProfileContext);
