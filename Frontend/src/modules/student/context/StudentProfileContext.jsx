import { useSearchParams } from "react-router-dom";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
const facilityRows = (payload, kind) => {
  const value = payload?.data?.data ?? payload?.data ?? payload?.Data ?? payload ?? {};
  if (Array.isArray(value)) return value;
  const collection = value?.items ?? value?.Items ?? value?.records ?? value?.Records ?? value?.allocations ?? value?.Allocations;
  if (Array.isArray(collection)) return collection;
  const record = kind === "transport" ? value?.transport ?? value?.Transport ?? value?.assignment ?? value?.Assignment : null;
  return record ? [record] : [value];
};
const activeFacility = (row) => {
  const status = readVal(row, "status", "Status", "allocationStatus", "AllocationStatus", "assignmentStatus", "AssignmentStatus", "isActive", "IsActive");
  const access = readVal(row, "hasTransportAccess", "HasTransportAccess");
  if (/^(false|0)$/i.test(String(access))) return false;
  return /^(active|true|1|assigned|approved|allocated|running)$/i.test(String(status ?? "")) || (status == null && /^(true|1)$/i.test(String(access ?? "")));
};
const matchesStudent = (row, student, requireId = false) => {
  const id = readVal(row, "studentId", "StudentId");
  const admission = readVal(row, "admissionNo", "AdmissionNo");
  if (id != null && Number(id) > 0) return String(Number(id)) === String(Number(student.studentId));
  if (admission != null && student.admissionNo) return String(admission).trim().toLowerCase() === String(student.admissionNo).trim().toLowerCase();
  return !requireId;
};
const hasFacility = (row, kind) => activeFacility(row) && Boolean(kind === "hostel"
  ? readVal(row, "hostelId", "HostelId", "allocationId", "AllocationId", "roomId", "RoomId")
  : readVal(row, "assignmentId", "AssignmentId", "studentTransportAssignmentId", "StudentTransportAssignmentId", "routeId", "RouteId", "routeName", "RouteName", "vehicleNumber", "VehicleNumber", "busNumber", "BusNumber"));
const evaluateStudentFacility = (student, transportResult, hostelResult) => {
  if (!student) return { type: "none", hostelAllocation: null, transportAllocation: null };

  const read = (...keys) => keys.map((key) => student?.[key]).find((value) => value != null && value !== "");

  // 1. Hostel allocation from API
  let activeHostel = null;
  if (hostelResult?.status === "fulfilled") {
    const hostelRows = facilityRows(hostelResult.value, "hostel");
    activeHostel = hostelRows.find((row) => row && matchesStudent(row, student, true) && hasFacility(row, "hostel")) || null;
  }

  // 2. Profile hostel indicators (from /api/v1/students/me)
  const studentType = String(read("studentType", "StudentType", "residentialType", "ResidentialType", "isResidential", "IsResidential") || "").toLowerCase();
  const isResidential = ["residential", "hostel", "hosteller", "true", "2"].includes(studentType);
  const hostelBlock = read("hostelBlock", "HostelBlock", "hostelName", "HostelName");
  const hostelRoom = read("hostelRoom", "HostelRoom", "roomNumber", "RoomNumber", "roomNo", "RoomNo");
  const hostelBed = read("hostelBed", "HostelBed", "bedNumber", "BedNumber", "bedNo", "BedNo");
  const hostelId = read("hostelId", "HostelId");
  const hasProfileHostel = Boolean(hostelId || hostelBlock || hostelRoom || isResidential);

  if (!activeHostel && hasProfileHostel) {
    activeHostel = {
      hostelId: hostelId || 1,
      hostelName: hostelBlock || "Hostel",
      hostelBlockName: hostelBlock || "Hostel Block",
      roomNumber: hostelRoom || "Assigned Room",
      roomTypeName: hostelRoom || "Standard Room",
      bedNumber: hostelBed || "—",
      floorLevel: read("floorLevel", "FloorLevel", "floor", "Floor") || "—",
      joiningDate: read("joiningDate", "JoiningDate", "allocationDate", "AllocationDate", "admissionDate", "AdmissionDate") || "",
      status: read("status", "Status", "allocationStatus", "AllocationStatus") || "Active",
    };
  }

  // 3. Transport allocation from API
  let activeTransport = null;
  if (transportResult?.status === "fulfilled") {
    const transportRows = facilityRows(transportResult.value, "transport");
    activeTransport = transportRows.find((row) => row && matchesStudent(row, student) && hasFacility(row, "transport")) || null;
  }

  // 4. Profile transport indicators
  const transReq = read("transportRequired", "TransportRequired", "isTransportRequired", "IsTransportRequired");
  const isTransportRequired = /^(true|1|yes)$/i.test(String(transReq));
  const routeId = read("routeId", "RouteId", "busRouteId", "BusRouteId");
  const busRoute = read("busRoute", "BusRoute", "routeName", "RouteName");
  const pickupPoint = read("pickupPoint", "PickupPoint", "pickupPointName", "PickupPointName");
  const busType = read("busType", "BusType", "vehicleType", "VehicleType");
  const hasProfileTransport = Boolean((isTransportRequired && !isResidential) || routeId || busRoute || pickupPoint);

  if (!activeTransport && hasProfileTransport) {
    activeTransport = {
      routeId: routeId || "",
      routeName: busRoute || "Assigned Bus Route",
      pickupPointName: pickupPoint || "Assigned Stop",
      busType: busType || "College Bus",
      status: "Active",
    };
  }

  // 5. Exclusivity resolution
  const isHostel = Boolean(activeHostel);
  const isTransport = Boolean(activeTransport);

  let type = "none";
  if (isHostel && !isTransport) {
    type = "hostel";
  } else if (isTransport && !isHostel) {
    type = "transport";
  } else if (isHostel && isTransport) {
    if (isResidential && !isTransportRequired) {
      type = "hostel";
    } else if (isTransportRequired && !isResidential) {
      type = "transport";
    } else {
      const hostelDate = Date.parse(activeHostel.joiningDate || activeHostel.allocationDate || 0) || 0;
      const transportDate = Date.parse(activeTransport.startDate || activeTransport.effectiveFrom || 0) || 0;
      type = transportDate > hostelDate ? "transport" : "hostel";
    }
  } else {
    type = "none";
  }

  return { type, hostelAllocation: activeHostel, transportAllocation: activeTransport };
};

export function StudentProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState({ path: "", url: "", error: "", loading: false });
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState([]);
  const [facilityAccess, setFacilityAccess] = useState({ loading: true, type: null });

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

  useEffect(() => {
    let active = true;
    if (!profile?.studentId) {
      setFacilityAccess({ loading: false, type: "none", hostelAllocation: null, transportAllocation: null });
      return () => { active = false; };
    }
    setFacilityAccess({ loading: true, type: null, hostelAllocation: null, transportAllocation: null });
    Promise.allSettled([
      apiClient.get(studentApiEndpoints.transport.studentDetails, { params: { studentId: profile.studentId, academicYear: profile.academicYearName } }),
      apiClient.get(studentApiEndpoints.hostel.studentAllocations, { params: { studentId: profile.studentId, status: "Active" } }),
    ]).then(([transportResult, hostelResult]) => {
      if (!active) return;
      const evaluation = evaluateStudentFacility(profile, transportResult, hostelResult);
      setFacilityAccess({
        loading: false,
        type: evaluation.type,
        hostelAllocation: evaluation.hostelAllocation,
        transportAllocation: evaluation.transportAllocation,
      });
    });
    return () => { active = false; };
  }, [profile]);

  // Load read and dismissed notification IDs from storage when profile loads
  useEffect(() => {
    if (!profile?.admissionNo) return;
    try {
      const storedRead = JSON.parse(localStorage.getItem(`cms_student_read_notifs_${profile.admissionNo}`) || "[]");
      if (Array.isArray(storedRead)) setReadNotifIds(storedRead);
    } catch { /* Ignore unavailable or malformed storage; keep the default read notifications. */ }
    try {
      const storedDismissed = JSON.parse(sessionStorage.getItem(`cms_student_dismissed_notifs_${profile.admissionNo}`) || "[]");
      if (Array.isArray(storedDismissed)) setDismissedNotifIds(storedDismissed);
    } catch { /* Ignore unavailable or malformed storage; keep the default dismissed notifications. */ }
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
    } catch { /* Live notification broadcasts are optional; API refresh remains available. */ }
    return () => {
      try { channel?.close(); } catch { /* The optional notification channel may already be closed. */ }
    };
  }, [profile?.admissionNo, refreshNotifications]);

  const markAsRead = useCallback((id) => {
    setReadNotifIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        localStorage.setItem(`cms_student_read_notifs_${profile?.admissionNo}`, JSON.stringify(next));
      } catch { /* Keep the in-memory read state when local storage is unavailable. */ }
      return next;
    });
  }, [profile?.admissionNo]);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem(`cms_student_read_notifs_${profile?.admissionNo}`, JSON.stringify(allIds));
    } catch { /* Keep the in-memory read state when local storage is unavailable. */ }
  }, [notifications, profile?.admissionNo]);

  const dismissNotification = useCallback((id) => {
    setDismissedNotifIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      try {
        sessionStorage.setItem(`cms_student_dismissed_notifs_${profile?.admissionNo}`, JSON.stringify(next));
      } catch { /* Keep the in-memory dismissed state when session storage is unavailable. */ }
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
    profile, loading, error, refreshProfile, applyPhotoRemoval, facilityAccess,
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
    profile, loading, error, refreshProfile, photo, applyPhotoRemoval, facilityAccess,
    enrichedNotifications, unreadCount, activeAlerts,
    markAsRead, markAllAsRead, dismissNotification, refreshNotifications,
  ]);

  return <StudentProfileContext.Provider value={value}>{children}</StudentProfileContext.Provider>;
}

export const useStudentProfile = () => useContext(StudentProfileContext);

// Student-only URL state: batch related controls into a single browser history entry.
export function useStudentNavigation() {
  const [params, setParams] = useSearchParams();
  const current = useRef({ params, setParams });
  current.current = { params, setParams };
  const pending = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const update = useCallback((changes, { replace = false } = {}) => {
    if (!mounted.current) return;
    const existing = pending.current;
    const next = existing?.params || new URLSearchParams(current.current.params);
    Object.entries(changes).forEach(([key, value]) => value == null || value === "" ? next.delete(key) : next.set(key, String(value)));
    pending.current = { params: next, replace: existing ? existing.replace && replace : replace };
    if (!existing) queueMicrotask(() => {
      const target = pending.current; pending.current = null;
      if (mounted.current && target && target.params.toString() !== current.current.params.toString()) current.current.setParams(target.params, { replace: target.replace });
    });
  }, []);
  return { params, update };
}

export function studentRouteValue(navigation, key, fallback, validate = () => true) {
  const raw = navigation.params.get(key);
  const candidate = typeof fallback === "number" ? Number(raw) : typeof fallback === "boolean" ? raw === "true" : raw;
  const value = raw != null && raw !== "" && validate(candidate) ? candidate : fallback;
  const setValue = (next) => navigation.update({ [key]: typeof next === "function" ? next(value) : next });
  return [value, setValue];
}

export const validStudentPage = (value) => Number.isSafeInteger(value) && value > 0 && value <= 100000;
export const validStudentDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
