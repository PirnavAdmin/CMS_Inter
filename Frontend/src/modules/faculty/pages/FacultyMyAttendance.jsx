import { useLocation, useSearchParams } from "react-router-dom";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  Briefcase,
  ShieldCheck,
  UserX,
  AlertCircle,
  RotateCw,
  Send,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import "../styles/FacultyMyAttendance.css";
import { Skeleton } from "@/shared/components/Ui.jsx";
import { useFacultySafe } from "../FacultyContext.jsx";
import { attendanceService } from "../../../api/attendanceService.js";
import { attendanceTimingApi } from "../../../api/attendanceTimingApi.js";
import { getApiErrorMessage } from "@/api/axios.js";

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === "--") return null;
  const cleaned = String(timeStr).replace(/[\u202F\u00A0]/g, " ").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatMinutesTo12h = (totalMins) => {
  if (totalMins === null || totalMins === undefined || isNaN(totalMins)) return "--";
  let h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const toInputTime = (value) => {
  if (!value || value === "--") return "";
  const match = String(value).replace(/[\u202F\u00A0]/g, " ").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return "";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
};

const calculateDurationStr = (inTime, outTime, isActive = false) => {
  if (!inTime || inTime === "--") return "0h 0m";
  const inMins = parseTimeToMinutes(inTime);
  if (inMins === null) return "0h 0m";

  let targetMins;
  if (outTime && outTime !== "--") {
    targetMins = parseTimeToMinutes(outTime);
  } else if (isActive) {
    const now = new Date();
    targetMins = now.getHours() * 60 + now.getMinutes();
  } else {
    return "0h 0m";
  }

  if (targetMins === null) return "0h 0m";
  let diff = targetMins - inMins;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
};

const getIstTodayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const normalizeTodayData = (raw, timing) => {
  if (!raw) return null;
  const inTime = raw.inTime || raw.InTime || null;
  const outTime = raw.outTime || raw.OutTime || null;
  const rawStatus = raw.status || raw.Status || "not_punched";
  const isLate = Boolean(raw.isLate ?? raw.IsLate);
  const isMissedCheckoutResolved = Boolean(raw.isMissedCheckoutResolved ?? raw.IsMissedCheckoutResolved);
  const regState = raw.regularizationState || raw.RegularizationState || null;

  const shiftStartTime = raw.shiftStartTime || raw.ShiftStartTime || (timing?.workStartTime ? formatMinutesTo12h(parseTimeToMinutes(timing.workStartTime)) : "--");
  const shiftEndTime = raw.shiftEndTime || raw.ShiftEndTime || (timing?.workEndTime ? formatMinutesTo12h(parseTimeToMinutes(timing.workEndTime)) : "--");
  const shiftName = raw.shiftName || raw.ShiftName || (shiftStartTime !== "--" ? `Shift (${shiftStartTime} – ${shiftEndTime})` : "--");

  const shiftEndMins = parseTimeToMinutes(shiftEndTime);
  const rawGrace = raw.gracePeriodMinutes ?? raw.GracePeriodMinutes ?? timing?.gracePeriodMinutes;
  const graceMins = rawGrace !== null && rawGrace !== undefined ? Number(rawGrace) : null;
  const checkoutCutoffMins = shiftEndMins !== null && graceMins !== null ? shiftEndMins + graceMins : null;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const backendMissed = Boolean(raw.isMissedCheckout ?? raw.IsMissedCheckout);
  const cutoffExpired = Boolean(inTime && !outTime && checkoutCutoffMins !== null && nowMins > checkoutCutoffMins);
  const isMissedCheckout = !outTime && !isMissedCheckoutResolved && (backendMissed || rawStatus === "missed_checkout" || cutoffExpired);
  const isCheckOutAllowed = raw.isCheckOutAllowed !== undefined || raw.IsCheckOutAllowed !== undefined
    ? Boolean(raw.isCheckOutAllowed ?? raw.IsCheckOutAllowed) && !isMissedCheckout
    : (Boolean(inTime && !outTime) && !isMissedCheckout);

  const markedByAdmin = Boolean(raw.markedByAdmin ?? raw.MarkedByAdmin);
  let status = rawStatus;
  if (outTime) {
    status = "punched_out";
  } else if (isMissedCheckout) {
    status = "missed_checkout";
  } else if (inTime) {
    status = "punched_in";
  }

  const rawTodayStatus = raw.todayStatus || raw.TodayStatus || (inTime ? (isLate ? "Late" : "Present") : "Not Punched In");
  const todayStatus = rawTodayStatus;

  const canRegularize = raw.canRegularize !== undefined || raw.CanRegularize !== undefined
    ? Boolean(raw.canRegularize ?? raw.CanRegularize)
    : ((isLate || isMissedCheckout || todayStatus === "Absent") && !regState);

  return {
    status,
    inTime,
    outTime,
    shiftDuration: raw.shiftDuration || raw.ShiftDuration || (inTime && outTime ? calculateDurationStr(inTime, outTime, false) : "--"),
    shiftName,
    shiftStartTime,
    shiftEndTime,
    checkoutCutoffTime: raw.checkoutCutoffTime || raw.CheckoutCutoffTime || (checkoutCutoffMins !== null ? formatMinutesTo12h(checkoutCutoffMins) : "--"),
    isLate,
    isMissedCheckout,
    isMissedCheckoutResolved,
    isCheckOutAllowed,
    todayStatus,
    canRegularize,
    dateFormatted: raw.dateFormatted || raw.DateFormatted || new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    regularizationId: raw.regularizationId ?? raw.RegularizationId ?? null,
    regularizationState: regState,
    regularizationType: raw.regularizationType || raw.RegularizationType || null,
    regularizationReason: raw.regularizationReason || raw.RegularizationReason || null,
    regularizationAdminRemarks: raw.regularizationAdminRemarks || raw.RegularizationAdminRemarks || null,
    reviewedAt: raw.reviewedAt || raw.ReviewedAt || null,
    markedByAdmin,
    markedBy: raw.markedBy || raw.MarkedBy || null,
  };
};

export default function FacultyMyAttendance({ adminRouting = false } = {}) {
  const [routeParams, setRouteParams] = useSearchParams();
  const { pathname } = useLocation();
  const urlRouting = adminRouting || pathname.startsWith("/faculty-dashboard/my-attendance");
  const regularizeDate = urlRouting ? routeParams.get("regularize") || "" : "";
  const highlightedRegId = routeParams.get("regId") || "";
  const rangeParam = routeParams.get("range");
  const routedRange = ["week", "last_week", "month", "last_month"].includes(rangeParam) ? rangeParam : (highlightedRegId ? "month" : "week");
  const highlightedRowRef = useRef(null);
  const restoredRegularization = useRef("");
  const historyRequest = useRef(0);
  const [historyRange, setHistoryRange] = useState("");

  const context = useFacultySafe();
  const [shiftUpdateTick, setShiftUpdateTick] = useState(0);

  // Periodic ticker to recalculate active shift timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setShiftUpdateTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Attendance Timing Configuration State (populated strictly from backend settings)
  const [timingConfig, setTimingConfig] = useState({
    workStartTime: "",
    workEndTime: "",
    lateThreshold: "",
    earlyCheckoutThreshold: "",
    gracePeriodMinutes: null,
    minWorkingHours: null,
  });

  // Load timing configuration from admin settings
  useEffect(() => {
    let isMounted = true;
    const loadTiming = async () => {
      try {
        const configs = await attendanceTimingApi.getConfigs();
        if (Array.isArray(configs) && configs.length > 0) {
          const cfg = configs.find((c) => c.staffType === 1 || c.staffType === "Teaching") || configs[0];
          if (cfg && isMounted) {
            setTimingConfig({
              workStartTime: cfg.workStartTime || "",
              workEndTime: cfg.workEndTime || "",
              lateThreshold: cfg.lateThreshold || "",
              earlyCheckoutThreshold: cfg.earlyCheckoutThreshold || "",
              gracePeriodMinutes: cfg.gracePeriodMinutes ?? null,
              minWorkingHours: cfg.minWorkingHours ?? null,
            });
          }
        }
      } catch (err) {
        console.warn("Could not load attendance timing config:", err);
      }
    };
    loadTiming();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter State: "week" | "last_week" | "month" | "last_month"
  const [localFilter, setLocalFilter] = useState("week");
  const activeFilter = urlRouting ? routedRange : localFilter;
  const setActiveFilter = (range) => {
    setLocalFilter(range);
    if (urlRouting) {
      const next = new URLSearchParams(routeParams);
      if (adminRouting) next.set("tab", "my-attendance");
      next.set("range", range);
      setRouteParams(next);
    }
  };

  // Loading & Error States
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [todayError, setTodayError] = useState("");
  const [historyError, setHistoryError] = useState("");

  // Live Today Status (populated strictly from backend API)
  const [todayData, setTodayData] = useState({
    status: "not_punched",
    inTime: null,
    outTime: null,
    shiftDuration: "--",
    shiftName: "--",
    shiftStartTime: "--",
    shiftEndTime: "--",
    checkoutCutoffTime: "--",
    isLate: false,
    isMissedCheckout: false,
    isMissedCheckoutResolved: false,
    isCheckOutAllowed: false,
    todayStatus: "--",
    canRegularize: false,
    dateFormatted: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    regularizationId: null,
    regularizationState: null,
    regularizationType: null,
    regularizationReason: null,
    regularizationAdminRemarks: null,
    reviewedAt: null,
  });

  // Monthly KPI Summary state
  const [monthlyMetrics, setMonthlyMetrics] = useState(null);

  // Live History & Analytics Metrics
  const [historyData, setHistoryData] = useState({
    logs: [],
    metrics: {
      workingDays: "--",
      workingDaysSub: "--",
      presentDays: "--",
      presentDaysSub: "--",
      leaves: "--",
      leavesSub: "--",
      absentDays: "--",
      absentDaysSub: "--",
    },
  });

  // Regularization Modal State
  const [localRegModalOpen, setLocalRegModalOpen] = useState(false);
  const regModalOpen = urlRouting
    ? Boolean(regularizeDate && restoredRegularization.current === regularizeDate && localRegModalOpen)
    : localRegModalOpen;

  const closeRegularizeModal = () => {
    setLocalRegModalOpen(false);
    if (urlRouting) {
      const next = new URLSearchParams(routeParams);
      next.delete("regularize");
      setRouteParams(next);
    }
  };

  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regForm, setRegForm] = useState({
    rawDate: "",
    displayDate: "",
    requestType: "Late Attendance",
    originalStatus: "--",
    originalInTime: "--",
    originalOutTime: "--",
    requestedInTime: "",
    requestedOutTime: "",
    reason: "",
  });

  const [toast, setToast] = useState(null);

  const notify = useCallback(
    (text, type = "success") => {
      if (context?.notify) {
        context.notify(text, type);
      } else {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
      }
    },
    [context]
  );

  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  // Sync punch status with global Faculty context
  const syncGlobalPunchState = useCallback(
    (status, inTime, outTime) => {
      const setPunchState = contextRef.current?.setPunchState;
      const isPunchedIn = status === "punched_in";
      const next = {
        isPunchedIn,
        inTime: inTime,
        outTime: outTime,
        hoursWorked: inTime ? calculateDurationStr(inTime, outTime, isPunchedIn) : "--",
      };
      if (typeof setPunchState === "function") {
        setPunchState(next);
      }
    },
    []
  );

  // Fetch Today's Attendance Status from backend API: /api/v1/staff-attendance/my-today
  const fetchTodayStatus = useCallback(async () => {
    try {
      setLoadingToday(true);
      setTodayError("");
      const res = await attendanceService.getMyTodayStatus();
      const payload = res?.data || res?.Data || (res?.status ? res : null);
      if (!payload) throw new Error(res?.message || res?.Message || "Today attendance data unavailable.");
      const normalized = normalizeTodayData(payload, timingConfig);
      if (normalized) {
        setTodayData(normalized);
        syncGlobalPunchState(normalized.status, normalized.inTime, normalized.outTime);
      }
    } catch (err) {
      setTodayError(getApiErrorMessage(err) || "Unable to load today's attendance status.");
    } finally {
      setLoadingToday(false);
    }
  }, [syncGlobalPunchState, timingConfig]);

  // Fetch Attendance History for selected filter from backend API: /api/v1/staff-attendance/my-history
  const fetchHistory = useCallback(async (period) => {
    const request = ++historyRequest.current;
    if (urlRouting) setHistoryRange("");
    try {
      setLoadingHistory(true);
      setHistoryError("");
      const res = await attendanceService.getMyAttendanceHistory(period);
      if (urlRouting && request !== historyRequest.current) return;
      const payload = res?.data || res?.Data || (res?.status ? res : null);
      if (!payload) throw new Error(res?.message || res?.Message || "Attendance history unavailable.");
      if (urlRouting) setHistoryRange(period);
      const rawLogs = payload.logs || payload.Logs || [];
      const rawMetrics = payload.metrics || payload.Metrics || {};

      const processedLogs = rawLogs.map((l) => {
        const inTime = l.inTime || l.InTime || "--";
        const outTime = l.outTime || l.OutTime || "--";
        const status = l.status || l.Status || "--";
        const isToday = Boolean(l.isToday ?? l.IsToday);
        const isMissedCheckout = Boolean(l.isMissedCheckout ?? l.IsMissedCheckout);
        const isMissedCheckoutResolved = Boolean(l.isMissedCheckoutResolved ?? l.IsMissedCheckoutResolved);
        const regState = l.regularizationState || l.RegularizationState || null;
        const shift = l.shift || l.Shift || "--";
        const hours = l.hours || l.Hours || ((inTime !== "--" && outTime !== "--") ? calculateDurationStr(inTime, outTime, false) : "--");
        const canRegularize = l.canRegularize !== undefined || l.CanRegularize !== undefined
          ? Boolean(l.canRegularize ?? l.CanRegularize)
          : ((status === "Late" || isMissedCheckout || status === "Absent") && !regState);

        return {
          id: l.id || l.Id || `log-${l.rawDate || l.RawDate}`,
          day: l.day || l.Day || "--",
          date: l.date || l.Date || "--",
          rawDate: l.rawDate || l.RawDate || "",
          shift,
          inTime,
          outTime,
          hours,
          device: l.device || l.Device || "--",
          status,
          isMissedCheckout,
          isMissedCheckoutResolved,
          markedByAdmin: Boolean(l.markedByAdmin ?? l.MarkedByAdmin),
          canRegularize,
          isToday,
          regularizationId: l.regularizationId ?? l.RegularizationId ?? null,
          regularizationState: regState,
          regularizationType: l.regularizationType || l.RegularizationType || null,
          regularizationReason: l.regularizationReason || l.RegularizationReason || null,
          regularizationAdminRemarks: l.regularizationAdminRemarks || l.RegularizationAdminRemarks || null,
          reviewedAt: l.reviewedAt || l.ReviewedAt || null,
          holidayName: l.holidayName || l.HolidayName || null,
        };
      });

      setHistoryData({
        logs: processedLogs,
        metrics: {
          workingDays: rawMetrics.workingDays || rawMetrics.WorkingDays || "0 Days",
          workingDaysSub: rawMetrics.workingDaysSub || rawMetrics.WorkingDaysSub || "--",
          presentDays: rawMetrics.presentDays || rawMetrics.PresentDays || "0 Days",
          presentDaysSub: rawMetrics.presentDaysSub || rawMetrics.PresentDaysSub || "--",
          leaves: rawMetrics.leaves || rawMetrics.Leaves || "0 Days",
          leavesSub: rawMetrics.leavesSub || rawMetrics.LeavesSub || "--",
          absentDays: rawMetrics.absentDays || rawMetrics.AbsentDays || "0 Days",
          absentDaysSub: rawMetrics.absentDaysSub || rawMetrics.AbsentDaysSub || "--",
          missedCheckoutDays: rawMetrics.missedCheckoutDays || rawMetrics.MissedCheckoutDays || "0 Days",
          lopDays: rawMetrics.lopDays || rawMetrics.LopDays || "0 Days",
          lopDaysSub: rawMetrics.lopDaysSub || rawMetrics.LopDaysSub || "",
          holidays: rawMetrics.holidays || rawMetrics.Holidays || "0 Days",
          attendancePercentage: rawMetrics.attendancePercentage ?? rawMetrics.AttendancePercentage ?? 0,
        },
      });
    } catch (err) {
      setHistoryError(getApiErrorMessage(err) || "Unable to load attendance history.");
      if (urlRouting && request === historyRequest.current) setHistoryRange("error");
    } finally {
      if (!urlRouting || request === historyRequest.current) setLoadingHistory(false);
    }
  }, [urlRouting]);

  // Initial load once on mount
  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  // When filter tab changes, load corresponding history
  useEffect(() => {
    fetchHistory(activeFilter);
  }, [activeFilter, fetchHistory]);

  // Fetch current month attendance overview for top 4 KPI cards
  const fetchMonthlyMetrics = useCallback(async () => {
    try {
      const res = await attendanceService.getMyAttendanceHistory("month");
      const payload = res?.data || res?.Data || (res?.status ? res : null);
      if (payload) {
        const rawMetrics = payload.metrics || payload.Metrics || {};
        setMonthlyMetrics(rawMetrics);
      }
    } catch (e) {
      console.warn("Could not load monthly attendance metrics", e);
    }
  }, []);

  useEffect(() => {
    fetchMonthlyMetrics();
  }, [fetchMonthlyMetrics]);

  const isMissedCheckout = useMemo(() => {
    if (todayData.isMissedCheckout && !todayData.isMissedCheckoutResolved) return true;
    if (todayData.status === "missed_checkout" && !todayData.isMissedCheckoutResolved) return true;
    if (todayData.inTime && !todayData.outTime && !todayData.isMissedCheckoutResolved) {
      const directCutoffMins = parseTimeToMinutes(todayData.checkoutCutoffTime);
      const shiftEndMins = parseTimeToMinutes(todayData.shiftEndTime !== "--" ? todayData.shiftEndTime : timingConfig.workEndTime);
      const cutoffMins = directCutoffMins !== null
        ? directCutoffMins
        : (shiftEndMins !== null && timingConfig.gracePeriodMinutes !== null ? shiftEndMins + Number(timingConfig.gracePeriodMinutes) : null);
      if (cutoffMins !== null) {
        const now = new Date();
        return (now.getHours() * 60 + now.getMinutes()) > cutoffMins;
      }
    }
    return false;
  }, [todayData, timingConfig, shiftUpdateTick]);

  const isCheckInAllowed = useMemo(() => {
    if (todayData.status !== "not_punched" || Boolean(todayError)) return false;
    const startMins = parseTimeToMinutes(todayData.shiftStartTime !== "--" ? todayData.shiftStartTime : timingConfig.workStartTime);
    const endMins = parseTimeToMinutes(todayData.shiftEndTime !== "--" ? todayData.shiftEndTime : timingConfig.workEndTime);
    if (startMins === null || endMins === null) return false;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= startMins && nowMins <= endMins;
  }, [todayData.status, todayData.shiftStartTime, todayData.shiftEndTime, timingConfig, todayError, shiftUpdateTick]);

  const isCheckOutAllowed = useMemo(() => {
    if (!todayData.inTime || todayData.outTime || isMissedCheckout || Boolean(todayError)) return false;
    if (todayData.isCheckOutAllowed === false) return false;
    const directCutoffMins = parseTimeToMinutes(todayData.checkoutCutoffTime);
    const endMins = parseTimeToMinutes(todayData.shiftEndTime !== "--" ? todayData.shiftEndTime : timingConfig.workEndTime);
    const maxMins = directCutoffMins !== null
      ? directCutoffMins
      : (endMins !== null && timingConfig.gracePeriodMinutes !== null ? endMins + Number(timingConfig.gracePeriodMinutes) : null);
    if (endMins === null || maxMins === null) return todayData.isCheckOutAllowed === true;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= (endMins - 15) && nowMins <= maxMins;
  }, [todayData, isMissedCheckout, timingConfig, todayError, shiftUpdateTick]);

  // Punch In Handler: POST /api/v1/staff-attendance/punch-in
  const handlePunchIn = async () => {
    if (todayData.markedByAdmin) {
      notify("Attendance for today has already been officially recorded by Administration.", "error");
      return;
    }
    if (!isCheckInAllowed) {
      notify(`Check-in is permitted only during configured shift hours (${todayData.shiftStartTime} – ${todayData.shiftEndTime}).`, "error");
      return;
    }
    if (todayData.status !== "not_punched" || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await attendanceService.punchIn({
        verificationMethod: 3, // WebCheckIn
        deviceId: "Web Portal",
        remarks: "Faculty Self Check-In via Web Portal",
      });

      const isSuccess = Boolean(res?.status ?? res?.Status);
      const payload = res?.data || res?.Data;
      if (isSuccess && payload) {
        const normalized = normalizeTodayData(payload, timingConfig);
        if (normalized) {
          setTodayData(normalized);
          syncGlobalPunchState(normalized.status, normalized.inTime, normalized.outTime);
        }
        notify(res?.message || res?.Message || `Checked In Successfully at ${payload.inTime || payload.InTime}`, "success");
        fetchHistory(activeFilter);
        fetchMonthlyMetrics();
      } else {
        notify(res?.message || res?.Message || "Failed to check in.", "error");
      }
    } catch (err) {
      const errMsg = getApiErrorMessage(err) || "Failed to check in.";
      notify(errMsg, "error");
    } finally {
      setActionLoading(false);
    }
  };



  // Punch Out Handler: POST /api/v1/staff-attendance/punch-out
  const handlePunchOut = async () => {
    if (todayData.markedByAdmin) {
      notify("Attendance for today has already been officially recorded by Administration.", "error");
      return;
    }
    if (todayData.status !== "punched_in" || actionLoading || isMissedCheckout) {
      if (isMissedCheckout) {
        notify("The 15-minute check-out window has expired. Marked as Missed Checkout. Please apply for attendance regularization.", "error");
      }
      return;
    }
    setActionLoading(true);
    try {
      const res = await attendanceService.punchOut({
        verificationMethod: 3,
        deviceId: "Web Portal",
        remarks: "Faculty Self Check-Out via Web Portal",
      });

      const isSuccess = Boolean(res?.status ?? res?.Status);
      const payload = res?.data || res?.Data;
      if (isSuccess && payload) {
        const normalized = normalizeTodayData(payload, timingConfig);
        if (normalized) {
          setTodayData(normalized);
          syncGlobalPunchState(normalized.status, normalized.inTime, normalized.outTime);
        }
        notify(res?.message || res?.Message || `Punched Out Successfully at ${payload.outTime || payload.OutTime}`, "success");
        fetchHistory(activeFilter);
        fetchMonthlyMetrics();
      } else {
        notify(res?.message || res?.Message || "Failed to punch out.", "error");
      }
    } catch (err) {
      const errMsg = getApiErrorMessage(err) || "Failed to punch out.";
      notify(errMsg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // URL synchronization for regularize query parameter
  useEffect(() => {
    if (!urlRouting) return;
    if (!regularizeDate) {
      restoredRegularization.current = "";
      setLocalRegModalOpen(false);
      return;
    }
    if (restoredRegularization.current === regularizeDate) return;
    setLocalRegModalOpen(false);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(regularizeDate) || Number.isNaN(Date.parse(regularizeDate))) {
      restoredRegularization.current = regularizeDate;
      notify("Invalid attendance regularization date.", "error");
      return;
    }
    if (loadingHistory || (historyRange !== activeFilter && historyRange !== "error")) return;
    if (historyRange === "error") {
      notify("Attendance history could not be loaded. Please retry.", "error");
      return;
    }
    const log = historyData.logs.find((row) => String(row.rawDate || "").slice(0, 10) === regularizeDate);
    if (!log || !log.canRegularize || ["pending", "approved", "rejected"].includes(String(log.regularizationState || "").toLowerCase())) {
      restoredRegularization.current = regularizeDate;
      notify("Attendance record is unavailable or cannot be regularized in this history range.", "error");
      return;
    }
    const detectedType = log.isMissedCheckout || log.status === "Missed Checkout"
      ? "Missed Checkout"
      : log.status === "Late"
      ? "Late Attendance"
      : "Absent";
    setRegForm({
      rawDate: regularizeDate,
      displayDate: log.date || log.day || "Selected Date",
      requestType: detectedType,
      originalStatus: log.isMissedCheckout ? `${log.status} (Missed Checkout)` : (log.status || "--"),
      originalInTime: log.inTime || "--",
      originalOutTime: log.outTime || "--",
      requestedInTime: toInputTime(log.inTime) || "",
      requestedOutTime: detectedType === "Missed Checkout" ? "" : (toInputTime(log.outTime) || ""),
      reason: "",
    });
    restoredRegularization.current = regularizeDate;
    setLocalRegModalOpen(true);
  }, [urlRouting, regularizeDate, loadingHistory, historyRange, activeFilter, historyData, notify]);

  useEffect(() => {
    if (highlightedRegId && !loadingHistory && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedRegId, loadingHistory, historyData.logs]);

  // Open Regularization Modal for a specific date
  const openRegularizeModal = (log) => {
    const targetDate = String(log.rawDate || log.RawDate || getIstTodayIso()).slice(0, 10);
    const detectedType = log.isMissedCheckout || log.status === "Missed Checkout"
      ? "Missed Checkout"
      : log.status === "Late"
      ? "Late Attendance"
      : "Absent";
    setRegForm({
      rawDate: targetDate,
      displayDate: log.date || log.Date || log.day || targetDate,
      requestType: detectedType,
      originalStatus: log.isMissedCheckout ? `${log.status || "Present"} (Missed Checkout)` : (log.status || "--"),
      originalInTime: log.inTime || "--",
      originalOutTime: log.outTime || "--",
      requestedInTime: toInputTime(log.inTime) || "",
      requestedOutTime: detectedType === "Missed Checkout" ? "" : (toInputTime(log.outTime) || ""),
      reason: "",
    });
    setLocalRegModalOpen(true);
    if (urlRouting) {
      const next = new URLSearchParams(routeParams);
      if (adminRouting) next.set("tab", "my-attendance");
      next.set("range", historyData.logs.some((row) => String(row.rawDate || "").slice(0, 10) === targetDate) ? activeFilter : "week");
      next.set("regularize", targetDate);
      setRouteParams(next);
    }
  };

  // Submit Regularization Form: POST /api/v1/staff-attendance/regularize
  const handleSubmitRegularization = async (e) => {
    e.preventDefault();
    if (regForm.reason.trim().length < 5) {
      notify("Please enter a reason of at least 5 characters for regularization.", "error");
      return;
    }

    setRegSubmitting(true);
    try {
      const isMissed = regForm.requestType === "Missed Checkout";
      const payload = {
        attendanceDate: regForm.rawDate,
        requestType: regForm.requestType,
        requestedInTime: regForm.requestedInTime ? (regForm.requestedInTime.length === 5 ? `${regForm.requestedInTime}:00` : regForm.requestedInTime) : null,
        requestedOutTime: (!isMissed && regForm.requestedOutTime) ? (regForm.requestedOutTime.length === 5 ? `${regForm.requestedOutTime}:00` : regForm.requestedOutTime) : null,
        reason: regForm.reason.trim(),
      };

      const res = await attendanceService.submitRegularization(payload);
      const isSuccess = Boolean(res?.status ?? res?.Status);
      if (isSuccess) {
        notify("Attendance regularization request submitted successfully. Pending Principal/Admin approval.", "success");
        closeRegularizeModal();
        fetchTodayStatus();
        fetchHistory(activeFilter);
        fetchMonthlyMetrics();
      } else {
        notify(res?.message || res?.Message || "Failed to submit regularization.", "error");
      }
    } catch (err) {
      const errMsg = getApiErrorMessage(err) || "Failed to submit regularization.";
      notify(errMsg, "error");
    } finally {
      setRegSubmitting(false);
    }
  };

  // Formatted check-out cutoff time strictly from backend shift end + grace period
  const formattedCutoffTime = useMemo(() => {
    if (todayData.checkoutCutoffTime && todayData.checkoutCutoffTime !== "--") {
      return todayData.checkoutCutoffTime;
    }
    const shiftEndMins = parseTimeToMinutes(
      todayData.shiftEndTime !== "--" ? todayData.shiftEndTime : timingConfig.workEndTime
    );
    if (shiftEndMins === null || timingConfig.gracePeriodMinutes === null || timingConfig.gracePeriodMinutes === undefined) {
      return "--";
    }
    return formatMinutesTo12h(shiftEndMins + Number(timingConfig.gracePeriodMinutes));
  }, [todayData.checkoutCutoffTime, todayData.shiftEndTime, timingConfig.workEndTime, timingConfig.gracePeriodMinutes]);

  const clockWorkingHours = useMemo(() => {
    if (todayData.status === "punched_out" && todayData.inTime && todayData.outTime) {
      return calculateDurationStr(todayData.inTime, todayData.outTime, false);
    }
    if (todayData.inTime && !todayData.outTime && !isMissedCheckout) {
      return calculateDurationStr(todayData.inTime, null, true);
    }
    return "--:--";
  }, [todayData, shiftUpdateTick, isMissedCheckout]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Present":
      case "Present (Admin)":
      case "Present | Marked by Admin":
        return "present";
      case "Late":
        return "late";
      case "Missed Checkout":
        return "missed-checkout";
      case "Half Day":
        return "half-day";
      case "Leave":
        return "leave";
      case "Absent":
        return "absent";
      case "Holiday":
        return "holiday";
      case "Weekly Off":
        return "weekly-off";
      case "-":
      case "--":
        return "empty";
      default:
        return "empty";
    }
  };

  return (
    <div className="sp-faculty-attendance-page">
      {(todayError || historyError) && (
        <div className="sp-att-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{todayError || historyError}</span>
          <button type="button" onClick={() => { fetchTodayStatus(); fetchHistory(activeFilter); fetchMonthlyMetrics(); }}>Retry</button>
        </div>
      )}
      {/* Top Punch & Shift Grid */}
      <div className="sp-attendance-top-grid">
        {/* Left Card: Today's Attendance Summary */}
        <div className="cms-card sp-shift-summary-card">
          <div className="sp-card-header">
            <h3 className="sp-card-title">Today's Attendance Summary</h3>
            <p className="sp-card-desc">
              Campus shift schedule, check-in status & calculated working hours.
            </p>
          </div>

          <div className="sp-summary-inner-box">
            {/* Check Status Row - Centered in middle */}
            <div className="sp-summary-status-row">
              <span className="sp-summary-label">Check Status:</span>
              <span
                className={`sp-check-status-badge ${
                  isMissedCheckout
                    ? "missed"
                    : todayData.status === "punched_out"
                    ? "completed"
                    : todayData.inTime
                    ? (todayData.isLate ? "late" : "in")
                    : "not-checked"
                }`}
              >
                <span className="sp-status-bullet">•</span>
                {todayData.status === "punched_out"
                  ? `${todayData.todayStatus || "Present"} · Checked Out (${todayData.outTime || "--"})`
                  : isMissedCheckout
                  ? `${todayData.isLate ? "Late" : "Present"} · Missed Checkout (In: ${todayData.inTime || "--"})`
                  : todayData.isMissedCheckoutResolved
                  ? "Present · Missed Checkout Regularized"
                  : todayData.inTime
                  ? `Checked In (${todayData.inTime})${todayData.isLate ? " (Late)" : ""}`
                  : (todayData.todayStatus && todayData.todayStatus !== "--" ? todayData.todayStatus : "Not Checked In")}
              </span>
            </div>

            {/* 3 Metric Columns: CHECK IN, CHECK OUT, WORKING HOURS */}
            <div className="sp-summary-metric-cols">
              <div className="sp-summary-col">
                <span className="sp-metric-col-label">CHECK IN</span>
                <span className={`sp-metric-col-val ${todayData.inTime ? "highlight" : ""}`}>
                  {todayData.inTime || "--:-- --"}
                </span>
              </div>
              <div className="sp-summary-col">
                <span className="sp-metric-col-label">CHECK OUT</span>
                <span className="sp-metric-col-val">
                  {todayData.outTime || "--:-- --"}
                </span>
              </div>
              <div className="sp-summary-col">
                <span className="sp-metric-col-label">WORKING HOURS</span>
                <span className={`sp-metric-col-val ${todayData.status === "punched_in" && !isMissedCheckout ? "highlight" : ""}`}>
                  {clockWorkingHours}
                </span>
              </div>
            </div>

            {/* Bottom Shift & Date Info */}
            <div className="sp-summary-foot-row">
              <div className="sp-summary-foot-left">
                <span className="sp-foot-label">Campus Shift:</span>
                <Clock size={13} className="sp-foot-icon" />
                <span className="sp-foot-val">{todayData.shiftStartTime} – {todayData.shiftEndTime}</span>
              </div>
              <div className="sp-summary-foot-right">
                <Calendar size={13} className="sp-foot-icon" />
                <span className="sp-foot-val">{todayData.dateFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Attendance Check-In & Check-Out Actions */}
        <div className="cms-card sp-punch-action-card">
          <div className="sp-card-header">
            <h3 className="sp-card-title">Attendance Check-In & Check-Out</h3>
            <p className="sp-card-desc">
              Click below to record your campus entry or exit timestamp.
            </p>
          </div>

          <div className="sp-punch-twin-grid">
            {todayData.markedByAdmin ? (
              <>
                <div className="sp-twin-panel checkin-panel" style={{ opacity: 0.95 }}>
                  <button
                    type="button"
                    className="sp-punch-pill-btn checkin inactive"
                    disabled
                    style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46", cursor: "not-allowed" }}
                    title="Attendance officially recorded by Administration."
                  >
                    <ShieldCheck size={15} />
                    <span>Present | Marked by Admin</span>
                  </button>
                  <div className="sp-punch-foot-hint" style={{ color: "#059669", fontWeight: 600 }}>
                    In: {todayData.inTime || "--:--"} (Admin Recorded)
                  </div>
                </div>

                <div className="sp-twin-panel checkout-panel" style={{ opacity: 0.95 }}>
                  <button
                    type="button"
                    className="sp-punch-pill-btn checkout inactive"
                    disabled
                    style={{ background: "#f8fafc", borderColor: "#e2e8f0", color: "#64748b", cursor: "not-allowed" }}
                    title="Attendance officially recorded by Administration."
                  >
                    <ShieldCheck size={15} />
                    <span>{todayData.outTime ? "Checked Out by Admin" : "Check Out (Admin Locked)"}</span>
                  </button>
                  <div className="sp-punch-foot-hint" style={{ color: "#64748b" }}>
                    Out: {todayData.outTime || "--:--"} (Admin Managed)
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Check In Panel */}
                <div className="sp-twin-panel checkin-panel">
                  {/* Check In Button */}
                  <button
                    type="button"
                    className={`sp-punch-pill-btn checkin ${
                      isCheckInAllowed && todayData.status === "not_punched" && !actionLoading ? "active" : "inactive"
                    }`}
                    disabled={!isCheckInAllowed || todayData.status !== "not_punched" || actionLoading}
                    onClick={handlePunchIn}
                    title={
                      !isCheckInAllowed
                        ? `Check-in allowed only during configured shift hours: ${todayData.shiftStartTime} – ${todayData.shiftEndTime}`
                        : "Click to Check In"
                    }
                  >
                    {actionLoading && todayData.status === "not_punched" ? (
                      <Loader2 size={15} className="sp-spin" />
                    ) : (
                      <LogIn size={15} />
                    )}
                    <span>{todayData.status === "not_punched" ? "Check In" : "Checked In"}</span>
                  </button>

                  <div
                    className="sp-punch-foot-hint"
                    style={{ color: !isCheckInAllowed && todayData.status === "not_punched" ? "#dc2626" : undefined, fontWeight: !isCheckInAllowed && todayData.status === "not_punched" ? 600 : undefined }}
                  >
                    Allowed: {todayData.shiftStartTime} – {todayData.shiftEndTime}
                    {!isCheckInAllowed && todayData.status === "not_punched" ? " (Shift Closed)" : ""}
                  </div>
                </div>

                {/* Check Out Panel (Normal Check Out button remains visible; disabled after cutoff) */}
                <div className="sp-twin-panel checkout-panel">
                  <button
                    type="button"
                    className={`sp-punch-pill-btn checkout ${
                      isCheckOutAllowed && !isMissedCheckout && todayData.inTime && !todayData.outTime && !actionLoading ? "active" : "inactive"
                    }`}
                    disabled={!isCheckOutAllowed || isMissedCheckout || !todayData.inTime || Boolean(todayData.outTime) || actionLoading}
                    onClick={handlePunchOut}
                    title={
                      isMissedCheckout
                        ? `Check-out cutoff (${formattedCutoffTime}) has passed. Use Regularize for Missed Checkout.`
                        : !isCheckOutAllowed && todayData.inTime && !todayData.outTime
                        ? `Check-out allowed around shift end (${todayData.shiftEndTime} – ${formattedCutoffTime})`
                        : "Click to Check Out"
                    }
                  >
                    {actionLoading && todayData.status === "punched_in" ? (
                      <Loader2 size={15} className="sp-spin" />
                    ) : (
                      <LogOut size={15} />
                    )}
                    <span>{todayData.status === "punched_out" ? "Checked Out" : "Check Out"}</span>
                  </button>

                  {isMissedCheckout ? (
                    <>
                      <div className="sp-punch-foot-hint" style={{ color: "#b91c1c", fontWeight: 600 }}>
                        Missed Checkout · Window closed after {formattedCutoffTime}.
                      </div>
                      {!todayData.regularizationState && (
                        <button
                          type="button"
                          className="sp-missed-regularize-btn"
                          onClick={() =>
                            openRegularizeModal({
                              rawDate: getIstTodayIso(),
                              date: todayData.dateFormatted,
                              status: todayData.todayStatus || "Present",
                              inTime: todayData.inTime || "--",
                              outTime: "--",
                              isMissedCheckout: true,
                            })
                          }
                        >
                          Regularize Missed Checkout &gt;
                        </button>
                      )}
                    </>
                  ) : (
                    <div
                      className="sp-punch-foot-hint"
                      style={{
                        color: !isCheckOutAllowed && todayData.status === "punched_in" ? "#dc2626" : undefined,
                        fontWeight: !isCheckOutAllowed && todayData.status === "punched_in" ? 600 : undefined
                      }}
                    >
                      Allowed: {todayData.shiftEndTime} – {formattedCutoffTime}
                      {!isCheckOutAllowed && todayData.status === "punched_in" ? " (Shift In Progress)" : ""}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: 4 Metric Cards */}
      <div className="sp-metric-cards-grid">
        {/* Card 1: Working Days */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box green">
            <Calendar size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Working Days</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 85, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="sp-kpi-value">{(monthlyMetrics || historyData.metrics)?.workingDays || (monthlyMetrics || historyData.metrics)?.WorkingDays || "--"}</div>
                <div className="sp-kpi-sub">{(monthlyMetrics || historyData.metrics)?.workingDaysSub || (monthlyMetrics || historyData.metrics)?.WorkingDaysSub || "--"}</div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Present Days */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box green">
            <CheckCircle2 size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Present Days</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 95, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="sp-kpi-value green-val">{(monthlyMetrics || historyData.metrics)?.presentDays || (monthlyMetrics || historyData.metrics)?.PresentDays || "--"}</div>
                <div className="sp-kpi-sub">{(monthlyMetrics || historyData.metrics)?.presentDaysSub || (monthlyMetrics || historyData.metrics)?.PresentDaysSub || "--"}</div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Approved Leaves */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box purple">
            <Briefcase size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Approved Leaves</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 85, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="sp-kpi-value">{(monthlyMetrics || historyData.metrics)?.leaves || (monthlyMetrics || historyData.metrics)?.Leaves || "--"}</div>
                <div className="sp-kpi-sub">{(monthlyMetrics || historyData.metrics)?.leavesSub || (monthlyMetrics || historyData.metrics)?.LeavesSub || "--"}</div>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Absent & LOP Days */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box red">
            <UserX size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Absent &amp; LOP Days</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 75, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="sp-kpi-value red-val">
                  {(monthlyMetrics || historyData.metrics)?.absentDays || (monthlyMetrics || historyData.metrics)?.AbsentDays || "--"}
                  {(monthlyMetrics || historyData.metrics)?.lopDays && (monthlyMetrics || historyData.metrics)?.lopDays !== "0 Days" && (
                    <span style={{ fontSize: "11px", marginLeft: "6px", color: "#dc2626", fontWeight: 700 }}>
                      ({(monthlyMetrics || historyData.metrics).lopDays} LOP)
                    </span>
                  )}
                </div>
                <div className="sp-kpi-sub" title={(monthlyMetrics || historyData.metrics)?.lopDaysSub || ""}>
                  {(monthlyMetrics || historyData.metrics)?.absentDaysSub || (monthlyMetrics || historyData.metrics)?.AbsentDaysSub || "--"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Daily Attendance History Table */}
      <div className="cms-card sp-attendance-history-card">
        <div className="sp-attendance-card-head">
          <div className="sp-table-head-left">
            <div className="sp-att-cal-icon">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="sp-table-title">
                {activeFilter === "week"
                  ? "This Week"
                  : activeFilter === "last_week"
                  ? "Last Week"
                  : activeFilter === "month"
                  ? "This Month"
                  : "Last Month"}
              </h2>
              <span className="sp-table-subtitle">
                Biometric Check-In History & Daily Attendance Logs
              </span>
            </div>
          </div>

          {/* Filter Pills: Week | Last Week | Month | Last Month */}
          <div className="sp-att-filter-tabs">
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "week" ? "active" : ""}`}
              onClick={() => setActiveFilter("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "last_week" ? "active" : ""}`}
              onClick={() => setActiveFilter("last_week")}
            >
              Last Week
            </button>
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "month" ? "active" : ""}`}
              onClick={() => setActiveFilter("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "last_month" ? "active" : ""}`}
              onClick={() => setActiveFilter("last_month")}
            >
              Last Month
            </button>
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="sp-attendance-table">
            <thead>
              <tr>
                <th style={{ width: "16%" }}>DAY</th>
                <th style={{ width: "22%" }}>SHIFT</th>
                <th style={{ width: "15%" }}>CHECK IN</th>
                <th style={{ width: "15%" }}>CHECK OUT</th>
                <th style={{ width: "12%" }}>HOURS</th>
                <th style={{ width: "10%", textAlign: "center" }}>STATUS</th>
                <th style={{ width: "10%", textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loadingHistory ? (
                Array.from({ length: 6 }, (_, idx) => (
                  <tr key={`skel-row-${idx}`} className="sp-att-skeleton-row">
                    <td>
                      <Skeleton style={{ width: "70%", height: 13 }} />
                      <Skeleton style={{ width: "45%", height: 10, marginTop: 4 }} />
                    </td>
                    <td>
                      <Skeleton style={{ width: "85%", height: 13 }} />
                      <Skeleton style={{ width: "60%", height: 10, marginTop: 4 }} />
                    </td>
                    <td><Skeleton style={{ width: "55%", height: 13 }} /></td>
                    <td><Skeleton style={{ width: "55%", height: 13 }} /></td>
                    <td><Skeleton style={{ width: "45%", height: 13 }} /></td>
                    <td style={{ textAlign: "center" }}>
                      <Skeleton style={{ width: 68, height: 20, borderRadius: 12, margin: "0 auto" }} />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Skeleton style={{ width: 54, height: 22, borderRadius: 6, margin: "0 auto" }} />
                    </td>
                  </tr>
                ))
              ) : historyData.logs && historyData.logs.length > 0 ? (
                historyData.logs.map((log) => {
                  const id = log.id || log.Id;
                  const day = log.day || log.Day;
                  const date = log.date || log.Date;
                  const shift = log.shift || log.Shift;
                  const inTime = log.inTime || log.InTime || "--";
                  const outTime = log.outTime || log.OutTime || "--";
                  const hours = log.hours || log.Hours || "--";
                  const status = log.status || log.Status || "--";
                  const canReg = log.canRegularize ?? log.CanRegularize;
                  const regState = log.regularizationState || log.RegularizationState;
                  const regLower = String(regState || "").toLowerCase();
                  const holidayName = log.holidayName || log.HolidayName;
                  const isUpcoming = status === "-" || status === "--";
                  const isHighlighted = Boolean(highlightedRegId && log.regularizationId && String(log.regularizationId) === String(highlightedRegId));

                  return (
                    <tr key={id} ref={isHighlighted ? highlightedRowRef : undefined} className={isHighlighted ? "sp-reg-row-highlight" : undefined}>
                      <td>
                        <div className="sp-day-name">{day}</div>
                        <div className="sp-day-date">{date}</div>
                      </td>
                      <td>
                        <span className="sp-shift-text">{shift}</span>
                      </td>
                      <td>
                        <span className={`sp-time-text ${inTime !== "--" && !isUpcoming ? "highlight" : ""}`}>
                          {inTime}
                        </span>
                      </td>
                      <td>
                        <span className="sp-time-text">{outTime}</span>
                      </td>
                      <td>
                        <span className="sp-hours-text">{hours}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isUpcoming ? (
                          <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>--</span>
                        ) : (
                          <div className="sp-status-cell">
                            <span className={`sp-status-badge ${getStatusBadgeClass(status)}`}>
                              {status}
                            </span>
                            {log.isMissedCheckout && !log.isMissedCheckoutResolved && (
                              <span className="sp-missed-subbadge">Missed Checkout</span>
                            )}
                            {log.isMissedCheckoutResolved && (
                              <span className="sp-resolved-subbadge">Checkout Regularized</span>
                            )}
                            {holidayName && (
                              <span className="sp-holiday-name-subtext" title={holidayName}>
                                {holidayName}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {regLower === "pending" || regLower === "approved" || regLower === "rejected" ? (
                          <div className="sp-reg-action-info">
                            <span className={`sp-reg-badge ${regLower}`}>
                              {regLower === "pending" ? "Pending" : regLower === "approved" ? "Approved" : "Rejected"}
                            </span>
                            {log.regularizationType && (
                              <span className="sp-reg-submeta">{log.regularizationType}</span>
                            )}
                            {log.regularizationReason && (
                              <span className="sp-reg-submeta" title={log.regularizationReason}>
                                Reason: {log.regularizationReason}
                              </span>
                            )}
                            {log.regularizationAdminRemarks && (
                              <span className="sp-reg-submeta remarks" title={log.regularizationAdminRemarks}>
                                Admin: {log.regularizationAdminRemarks}
                              </span>
                            )}
                          </div>
                        ) : canReg ? (
                          <button
                            type="button"
                            className="sp-btn-regularize"
                            onClick={() => openRegularizeModal(log)}
                          >
                            <FileText size={12} />
                            <span>Regularize</span>
                          </button>
                        ) : (
                          <span style={{ color: "var(--cms-muted)", fontSize: 12 }}>--</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--cms-muted)" }}>
                    No attendance logs recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Regularization Modal */}
      {regModalOpen && (
        <div className="sp-reg-modal-backdrop" onClick={() => !regSubmitting && closeRegularizeModal()}>
          <div className="sp-reg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-reg-modal-header">
              <h3 className="sp-reg-modal-title">Attendance Regularization Request</h3>
              <button
                type="button"
                className="sp-reg-modal-close"
                disabled={regSubmitting}
                onClick={closeRegularizeModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRegularization}>
              <div className="sp-reg-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="sp-reg-form-group">
                    <label className="sp-reg-label">Attendance Date</label>
                    <input type="text" className="sp-reg-input" value={regForm.displayDate} disabled />
                  </div>
                  <div className="sp-reg-form-group">
                    <label className="sp-reg-label">Request Type</label>
                    <select
                      className="sp-reg-input"
                      value={regForm.requestType}
                      onChange={(e) => setRegForm({ ...regForm, requestType: e.target.value })}
                    >
                      <option value="Late Attendance">Late Attendance</option>
                      <option value="Missed Checkout">Missed Checkout</option>
                      <option value="Absent">Absent / Missing Punch</option>
                    </select>
                  </div>
                </div>

                <div className="sp-reg-orig-summary">
                  <span>Original Status: <strong>{regForm.originalStatus}</strong></span>
                  <span>In: <strong>{regForm.originalInTime}</strong></span>
                  <span>Out: <strong>{regForm.originalOutTime}</strong></span>
                </div>

                {regForm.requestType !== "Missed Checkout" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div className="sp-reg-form-group">
                      <label className="sp-reg-label">Requested In-Time</label>
                      <input
                        type="time"
                        className="sp-reg-input"
                        value={regForm.requestedInTime}
                        onChange={(e) => setRegForm({ ...regForm, requestedInTime: e.target.value })}
                      />
                    </div>
                    <div className="sp-reg-form-group">
                      <label className="sp-reg-label">Requested Out-Time</label>
                      <input
                        type="time"
                        className="sp-reg-input"
                        value={regForm.requestedOutTime}
                        onChange={(e) => setRegForm({ ...regForm, requestedOutTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="sp-reg-form-group">
                  <label className="sp-reg-label">Reason / Justification * (min 5 characters)</label>
                  <textarea
                    rows={3}
                    className="sp-reg-textarea"
                    placeholder="Explain why punch was missed or late (e.g., On official duty, scanner glitch)..."
                    value={regForm.reason}
                    onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                    required
                  />

                  {/* Quick Reason Pills */}
                  <div className="sp-reg-quick-pills">
                    {[
                      "Biometric Machine Failure",
                      "Official Exam Duty (OD)",
                      "Campus Network / Power Issue",
                      "Permitted Late Arrival",
                    ].map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        className="sp-reg-quick-pill"
                        onClick={() => setRegForm((prev) => ({ ...prev, reason: pill }))}
                      >
                        + {pill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sp-reg-modal-footer">
                <button
                  type="button"
                  className="sp-reg-cancel-btn"
                  disabled={regSubmitting}
                  onClick={closeRegularizeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sp-reg-submit-btn"
                  disabled={regSubmitting || regForm.reason.trim().length < 5}
                >
                  {regSubmitting ? (
                    <Loader2 size={14} className="sp-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  <span>{regSubmitting ? "Submitting..." : "Submit Request"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
