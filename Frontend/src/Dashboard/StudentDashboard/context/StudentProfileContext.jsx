import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { getCurrentStudent, getCurrentStudentPhotoFile } from "../services/studentAcademicService.js";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

// Keep provider and consumers on the same context during Vite Fast Refresh.
const StudentProfileContext = import.meta.hot?.data.studentProfileContext ?? createContext(null);
if (import.meta.hot) import.meta.hot.data.studentProfileContext = StudentProfileContext;

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const list = (data) => {
  const value = unwrap(data);
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "certificates", "Certificates"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};
const readVal = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");

export function StudentProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState({ path: "", url: "", error: "", loading: false });
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState([]);

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

  // Load read and dismissed notification IDs from storage when profile loads
  useEffect(() => {
    if (!profile?.admissionNo) return;
    try {
      const storedRead = JSON.parse(localStorage.getItem(`cms_student_read_notifs_${profile.admissionNo}`) || "[]");
      if (Array.isArray(storedRead)) setReadNotifIds(storedRead);
    } catch {}
    try {
      const storedDismissed = JSON.parse(sessionStorage.getItem(`cms_student_dismissed_notifs_${profile.admissionNo}`) || "[]");
      if (Array.isArray(storedDismissed)) setDismissedNotifIds(storedDismissed);
    } catch {}
  }, [profile?.admissionNo]);

  // Fetch certificate notifications from API
  const refreshNotifications = useCallback(async () => {
    if (!profile?.studentId && !profile?.admissionNo) return;
    try {
      const response = await apiClient.get(studentApiEndpoints.certificates.list, {
        params: { search: profile.admissionNo || profile.studentId }
      });
      const records = list(response?.data);
      const studentIdStr = String(profile.studentId || "");
      const admissionNoStr = String(profile.admissionNo || "").trim().toLowerCase();

      const matchedCerts = records.filter((item) => {
        const itemStudentId = String(readVal(item, "studentId", "StudentId") ?? "");
        const itemAdm = String(readVal(item, "admissionNo", "AdmissionNo") ?? "").trim().toLowerCase();
        return (studentIdStr && itemStudentId === studentIdStr) || (admissionNoStr && itemAdm === admissionNoStr);
      });

      const notifs = matchedCerts
        .filter((item) => {
          const status = String(readVal(item, "status", "Status") || "").toLowerCase();
          return status === "approved" || status === "issued";
        })
        .map((item) => {
          const status = readVal(item, "status", "Status") || "Approved";
          const isIssued = /issued/i.test(status);
          const certId = readVal(item, "certificateId", "CertificateId", "id", "Id") || "";
          const certNo = readVal(item, "certificateNumber", "CertificateNumber") || "";
          const certType = readVal(item, "certificateType", "CertificateType", "templateTitle", "TemplateTitle") || "Certificate";
          const id = `cert-${status.toLowerCase()}-${certId || certNo}`;
          const time = readVal(item, "issuedAt", "approvedAt", "issueDate", "requestDate", "generatedAt") || new Date().toISOString();

          return {
            id,
            certificateId: certId,
            certificateNumber: certNo,
            certificateType: certType,
            status: isIssued ? "Issued" : "Approved",
            title: isIssued ? "Certificate Issued" : "Certificate Approved",
            message: isIssued
              ? `Your ${certType} certificate (${certNo || "Ready"}) has been issued and is available for download!`
              : `Your request for ${certType} has been approved by the administration.`,
            time,
            to: "/student-dashboard/certificates",
          };
        })
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

      setNotifications(notifs);
    } catch {
      // Graceful fallback
    }
  }, [profile?.studentId, profile?.admissionNo]);

  useEffect(() => {
    if (profile?.admissionNo || profile?.studentId) {
      refreshNotifications();
    }
  }, [profile?.admissionNo, profile?.studentId, refreshNotifications]);

  // Real-time broadcast listener
  useEffect(() => {
    if (!profile?.admissionNo) return;
    let channel;
    try {
      channel = new BroadcastChannel("cms_notifications");
      channel.onmessage = (event) => {
        const data = event.data;
        if (data?.type === "CERTIFICATE_STATUS_UPDATED") {
          const studentAdm = String(profile.admissionNo || "").trim().toLowerCase();
          const msgAdm = String(data?.admissionNo || "").trim().toLowerCase();
          if (studentAdm && msgAdm && studentAdm === msgAdm) {
            const isIssued = /issued/i.test(data.status);
            const statusLabel = isIssued ? "Issued" : "Approved";
            const certId = data.certificateId || data.certificateNumber || Date.now();
            const notifId = `cert-${statusLabel.toLowerCase()}-${certId}`;

            const newNotif = {
              id: notifId,
              certificateId: data.certificateId,
              certificateNumber: data.certificateNumber,
              certificateType: data.certificateType,
              status: statusLabel,
              title: isIssued ? "Certificate Issued" : "Certificate Approved",
              message: isIssued
                ? `Your ${data.certificateType} certificate (${data.certificateNumber || "Ready"}) has been issued and is available for download!`
                : `Your request for ${data.certificateType} has been approved by the administration.`,
              time: data.timestamp || new Date().toISOString(),
              to: "/student-dashboard/certificates",
            };

            setNotifications((current) => [newNotif, ...current.filter((n) => n.id !== notifId)]);
            refreshNotifications();
          }
        }
      };
    } catch {}
    return () => {
      try { channel?.close(); } catch {}
    };
  }, [profile?.admissionNo, refreshNotifications]);

  const markAsRead = useCallback((id) => {
    setReadNotifIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(`cms_student_read_notifs_${profile?.admissionNo}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [profile?.admissionNo]);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem(`cms_student_read_notifs_${profile?.admissionNo}`, JSON.stringify(allIds));
    } catch {}
  }, [notifications, profile?.admissionNo]);

  const dismissNotification = useCallback((id) => {
    setDismissedNotifIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        sessionStorage.setItem(`cms_student_dismissed_notifs_${profile?.admissionNo}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [profile?.admissionNo]);

  const applyPhotoRemoval = useCallback(() => {
    setProfile((current) => current ? { ...current, photo: null } : current);
  }, []);

  const enrichedNotifications = useMemo(() => notifications.map((n) => ({
    ...n,
    isRead: readNotifIds.includes(n.id),
  })), [notifications, readNotifIds]);

  const unreadCount = useMemo(() => enrichedNotifications.filter((n) => !n.isRead).length, [enrichedNotifications]);

  const activeAlerts = useMemo(() => enrichedNotifications.filter((n) => !dismissedNotifIds.includes(n.id)), [enrichedNotifications, dismissedNotifIds]);

  const value = useMemo(() => ({
    profile, loading, error, refreshProfile, applyPhotoRemoval,
    photoUrl: photo.path === profile?.photo ? photo.url : "",
    photoError: photo.path === profile?.photo ? photo.error : "",
    photoLoading: photo.path === profile?.photo && photo.loading,
    notifications: enrichedNotifications,
    unreadCount,
    activeAlerts,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    refreshNotifications,
  }), [
    profile, loading, error, refreshProfile, photo, applyPhotoRemoval,
    enrichedNotifications, unreadCount, activeAlerts,
    markAsRead, markAllAsRead, dismissNotification, refreshNotifications,
  ]);

  return <StudentProfileContext.Provider value={value}>{children}</StudentProfileContext.Provider>;
}

export const useStudentProfile = () => useContext(StudentProfileContext);
