import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  Briefcase,
  UserX,
  AlertCircle,
  RotateCw,
  Send,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import "../styles/FacultyMyAttendance.css";
import { Skeleton } from "@/components/common/Ui.jsx";
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

const normalizeTodayData = (raw, timing) => {
  if (!raw) return null;
  const inTime = raw.inTime || raw.InTime || null;
  const outTime = raw.outTime || raw.OutTime || null;
  const rawStatus = raw.status || raw.Status || "not_punched";
  const rawTodayStatus = raw.todayStatus || raw.TodayStatus || "Absent";

  const inMins = parseTimeToMinutes(inTime);
  const outMins = parseTimeToMinutes(outTime);
  const lateThresholdStr = timing?.lateThreshold || "09:15";
  const lateThreshMins = parseTimeToMinutes(lateThresholdStr) || (9 * 60 + 15);
  const isLate = Boolean(raw.isLate ?? raw.IsLate) || (inMins !== null && inMins > lateThreshMins);

  const shiftEndStr = raw.shiftEndTime || raw.ShiftEndTime || timing?.workEndTime || "04:30 PM";
  const shiftEndMins = parseTimeToMinutes(shiftEndStr) || (16 * 60 + 30);
  const graceMins = Number(timing?.gracePeriodMinutes ?? 15);
  const checkoutCutoffMins = shiftEndMins + graceMins; // 04:45 PM

  let status = rawStatus;
  let todayStatus = rawTodayStatus;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (outTime) {
    if (outMins !== null && outMins > checkoutCutoffMins) {
      status = "missed_checkout";
      todayStatus = "Missed Checkout";
    } else {
      status = "punched_out";
      todayStatus = isLate ? "Late" : "Present";
    }
  } else if (inTime) {
    if (nowMins > checkoutCutoffMins) {
      status = "missed_checkout";
      todayStatus = "Missed Checkout";
    } else {
      status = "punched_in";
      todayStatus = isLate ? "Late" : "Present";
    }
  }

  const regState = raw.regularizationState || raw.RegularizationState || null;
  if (regState?.toLowerCase() === "approved") {
    todayStatus = "Present";
  }

  const canRegularize = (todayStatus === "Late" || todayStatus === "Missed Checkout" || todayStatus === "Absent" || todayStatus === "Half Day")
    && (!regState || regState.toLowerCase() !== "approved");

  return {
    status,
    inTime,
    outTime,
    shiftDuration: raw.shiftDuration || raw.ShiftDuration || "--",
    shiftName: raw.shiftName || raw.ShiftName || "Morning (09:00 AM – 04:30 PM)",
    shiftStartTime: raw.shiftStartTime || raw.ShiftStartTime || "09:00 AM",
    shiftEndTime: shiftEndStr,
    isLate,
    todayStatus,
    canRegularize,
    dateFormatted: raw.dateFormatted || raw.DateFormatted || new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    regularizationState: regState,
  };
};

export default function FacultyMyAttendance() {
  const context = useFacultySafe();
  const [shiftUpdateTick, setShiftUpdateTick] = useState(0);

  // Periodic ticker to recalculate active shift timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setShiftUpdateTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Attendance Timing Configuration State (Default to Teaching faculty shift: 09:00 - 16:30, Late after 09:15, Cutoff 16:45)
  const [timingConfig, setTimingConfig] = useState({
    workStartTime: "09:00",
    workEndTime: "16:30",
    lateThreshold: "09:15",
    earlyCheckoutThreshold: "16:30",
    gracePeriodMinutes: 15,
    minWorkingHours: 6.5,
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
              workStartTime: cfg.workStartTime || "09:00",
              workEndTime: cfg.workEndTime || "16:30",
              lateThreshold: cfg.lateThreshold || "09:15",
              earlyCheckoutThreshold: cfg.earlyCheckoutThreshold || "16:30",
              gracePeriodMinutes: cfg.gracePeriodMinutes ?? 15,
              minWorkingHours: cfg.minWorkingHours ?? 6.5,
            });
          }
        }
      } catch (err) {
        console.warn("Could not load attendance timing config, using defaults", err);
      }
    };
    loadTiming();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter State: "week" | "last_week" | "month" | "last_month"
  const [activeFilter, setActiveFilter] = useState("week");

  // Loading States
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live Today Status
  const [todayData, setTodayData] = useState({
    status: "not_punched",
    inTime: null,
    outTime: null,
    shiftDuration: "--",
    shiftName: "Morning (09:00 AM – 04:30 PM)",
    shiftStartTime: "09:00 AM",
    shiftEndTime: "04:30 PM",
    isLate: false,
    todayStatus: "Absent",
    canRegularize: false,
    dateFormatted: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    regularizationState: null,
  });

  // Live History & Analytics Metrics
  const [historyData, setHistoryData] = useState({
    logs: [],
    metrics: {
      workingDays: "6 Days",
      workingDaysSub: "Current Week (Mon–Sat)",
      presentDays: "0 Days",
      presentDaysSub: "Biometric verified",
      leaves: "0 Days",
      leavesSub: "No leaves applied",
      absentDays: "0 Days",
      absentDaysSub: "No absences",
    },
  });

  // Regularization Modal State
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regForm, setRegForm] = useState({
    rawDate: "",
    displayDate: "",
    requestedInTime: "09:00",
    requestedOutTime: "16:30",
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
      try {
        localStorage.setItem("staff_punch_state", JSON.stringify(next));
        window.dispatchEvent(new Event("storage"));
      } catch {}
    },
    []
  );

  // Fetch Today's Attendance Status
  const fetchTodayStatus = useCallback(async () => {
    try {
      setLoadingToday(true);
      const res = await attendanceService.getMyTodayStatus();
      const payload = res?.data || res?.Data || (res?.status ? res : null);
      if (payload) {
        const normalized = normalizeTodayData(payload, timingConfig);
        if (normalized) {
          setTodayData(normalized);
          syncGlobalPunchState(normalized.status, normalized.inTime, normalized.outTime);
        }
      }
    } catch (err) {
      console.warn("Could not load today status from backend, keeping defaults", err);
    } finally {
      setLoadingToday(false);
    }
  }, [syncGlobalPunchState, timingConfig]);

  // Fetch Attendance History for selected filter
  const fetchHistory = useCallback(async (period) => {
    try {
      setLoadingHistory(true);
      const res = await attendanceService.getMyAttendanceHistory(period);
      const payload = res?.data || res?.Data || (res?.status ? res : null);
      if (payload) {
        const rawLogs = payload.logs || payload.Logs || [];
        const rawMetrics = payload.metrics || payload.Metrics || {};

        const lateThreshMins = parseTimeToMinutes(timingConfig.lateThreshold || "09:15") || (9 * 60 + 15);
        const shiftEndMins = parseTimeToMinutes(timingConfig.workEndTime || "16:30") || (16 * 60 + 30);
        const checkoutCutoffMins = shiftEndMins + Number(timingConfig.gracePeriodMinutes || 15);

        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();

        const processedLogs = rawLogs.map((l, idx, arr) => {
          const inTime = l.inTime || l.InTime || "--";
          const outTime = l.outTime || l.OutTime || "--";
          const rawStatus = l.status || l.Status || "--";
          const isToday = Boolean(l.isToday ?? l.IsToday);
          const regState = l.regularizationState || l.RegularizationState || null;

          const inMins = parseTimeToMinutes(inTime);
          const outMins = parseTimeToMinutes(outTime);
          const isLatePunch = inMins !== null && inMins > lateThreshMins;

          let status = rawStatus;
          let hours = l.hours || l.Hours || "--";
          let isMissedCheckout = false;

          if (inTime !== "--" && inMins !== null) {
            if (outTime !== "--" && outMins !== null) {
              // Punched out: check if punch out was past cutoff (e.g. Thursday 09:49 PM)
              if (outMins > checkoutCutoffMins) {
                isMissedCheckout = true;
                status = "Missed Checkout";
              } else {
                status = isLatePunch ? "Late" : "Present";
              }
              hours = calculateDurationStr(inTime, outTime, false);
            } else {
              // Missing outTime
              if (isToday) {
                if (nowMins > checkoutCutoffMins) {
                  isMissedCheckout = true;
                  status = "Missed Checkout";
                } else {
                  status = isLatePunch ? "Late" : "Present";
                }
                hours = calculateDurationStr(inTime, null, true);
              } else {
                // Past day without punch out
                isMissedCheckout = true;
                status = "Missed Checkout";

                // Calculate duration up to next check-in or shift end
                const nextDayLog = arr.slice(idx + 1).find((next) => next.inTime && next.inTime !== "--");
                if (nextDayLog && nextDayLog.inTime) {
                  const nextInMins = parseTimeToMinutes(nextDayLog.inTime);
                  if (nextInMins !== null) {
                    const totalMins = (24 * 60 - inMins) + nextInMins;
                    const h = Math.floor(totalMins / 60);
                    const m = totalMins % 60;
                    hours = `${h}h ${m}m`;
                  } else {
                    hours = calculateDurationStr(inTime, "04:30 PM", false);
                  }
                } else {
                  hours = calculateDurationStr(inTime, "04:30 PM", false);
                }
              }
            }
          }

          if (regState?.toLowerCase() === "approved") {
            status = "Present";
          }

          const canRegularize = (status === "Late" || status === "Missed Checkout" || status === "Absent" || status === "Half Day")
            && (!regState || regState.toLowerCase() !== "approved");

          return {
            id: l.id || l.Id,
            day: l.day || l.Day,
            date: l.date || l.Date,
            rawDate: l.rawDate || l.RawDate,
            shift: l.shift || l.Shift,
            inTime,
            outTime,
            hours,
            device: l.device || l.Device,
            status,
            canRegularize,
            isToday,
            regularizationState: regState,
            holidayName: l.holidayName || l.HolidayName || null,
          };
        });

        // Compute late punch count dynamically
        const lateCount = processedLogs.filter((l) => l.status === "Late").length;
        const presentDaysCount = processedLogs.filter((l) => l.status === "Present" || l.status === "Late" || l.status === "Missed Checkout").length;

        setHistoryData({
          logs: processedLogs,
          metrics: {
            workingDays: rawMetrics.workingDays || rawMetrics.WorkingDays || "6 Days",
            workingDaysSub: rawMetrics.workingDaysSub || rawMetrics.WorkingDaysSub || "--",
            presentDays: rawMetrics.presentDays || rawMetrics.PresentDays || `${presentDaysCount} Days`,
            presentDaysSub: lateCount > 0 ? `${lateCount} late punch logged` : (rawMetrics.presentDaysSub || rawMetrics.PresentDaysSub || "--"),
            leaves: rawMetrics.leaves || rawMetrics.Leaves || "0 Days",
            leavesSub: rawMetrics.leavesSub || rawMetrics.LeavesSub || "--",
            absentDays: rawMetrics.absentDays || rawMetrics.AbsentDays || "0 Days",
            absentDaysSub: rawMetrics.absentDaysSub || rawMetrics.AbsentDaysSub || "--",
          },
        });
      }
    } catch (err) {
      console.warn("Could not load attendance history from backend", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [timingConfig]);

  // Initial load once on mount
  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  // When filter tab changes, load corresponding history
  useEffect(() => {
    fetchHistory(activeFilter);
  }, [activeFilter, fetchHistory]);

  // Punch In Handler
  const handlePunchIn = async () => {
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

  // Real-time check if check-out cutoff (shift end + 15 min grace) has passed
  const isMissedCheckout = useMemo(() => {
    if (todayData.status === "missed_checkout" || todayData.todayStatus === "Missed Checkout") return true;
    if (todayData.status === "punched_in" && !todayData.outTime) {
      const shiftEndMins = parseTimeToMinutes(todayData.shiftEndTime || timingConfig.workEndTime);
      if (shiftEndMins !== null) {
        const cutoffMins = shiftEndMins + Number(timingConfig.gracePeriodMinutes || 15);
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        return nowMins > cutoffMins;
      }
    }
    return false;
  }, [todayData.status, todayData.todayStatus, todayData.outTime, todayData.shiftEndTime, timingConfig, shiftUpdateTick]);

  // Punch Out Handler
  const handlePunchOut = async () => {
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

  // Open Regularization Modal for a specific date
  const openRegularizeModal = (log) => {
    setRegForm({
      rawDate: log.rawDate || log.RawDate || new Date().toISOString().split("T")[0],
      displayDate: log.date || log.Date || log.day || "Selected Date",
      requestedInTime: "09:00",
      requestedOutTime: "16:30",
      reason: "",
    });
    setRegModalOpen(true);
  };

  // Submit Regularization Form
  const handleSubmitRegularization = async (e) => {
    e.preventDefault();
    if (!regForm.reason.trim()) {
      notify("Please provide a reason for attendance regularization.", "error");
      return;
    }

    setRegSubmitting(true);
    try {
      const payload = {
        attendanceDate: regForm.rawDate,
        requestedInTime: regForm.requestedInTime ? `${regForm.requestedInTime}:00` : null,
        requestedOutTime: regForm.requestedOutTime ? `${regForm.requestedOutTime}:00` : null,
        reason: regForm.reason.trim(),
      };

      const res = await attendanceService.submitRegularization(payload);
      const isSuccess = Boolean(res?.status ?? res?.Status);
      if (isSuccess) {
        notify("Attendance regularization request submitted successfully. Pending Principal/Admin approval.", "success");
        setRegModalOpen(false);
        fetchTodayStatus();
        fetchHistory(activeFilter);
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

  // Real-time dynamic shift duration display
  const clockShiftDuration = useMemo(() => {
    if (todayData.status === "punched_out" && todayData.inTime && todayData.outTime) {
      return calculateDurationStr(todayData.inTime, todayData.outTime, false);
    }
    if (todayData.status === "punched_in" && todayData.inTime) {
      return calculateDurationStr(todayData.inTime, null, true);
    }
    return todayData.shiftDuration && todayData.shiftDuration !== "--" ? todayData.shiftDuration : "--:--";
  }, [todayData, shiftUpdateTick]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Present":
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
      {/* Top Punch & Shift Grid */}
      <div className="sp-attendance-top-grid">
        {/* Left Card: Attendance & Shift Summary */}
        <div className="cms-card sp-shift-summary-card">
          <div className="sp-card-header">
            <h3 className="sp-card-title">Attendance & Shift Summary</h3>
            <p className="sp-card-desc">
              Campus shift schedule, check-in status & calculated shift duration.
            </p>
          </div>

          <div className="sp-summary-inner-box">
            {/* Check Status Row - Centered in middle */}
            <div className="sp-summary-status-row">
              <span className="sp-summary-label">Check Status:</span>
              <span
                className={`sp-check-status-badge ${
                  todayData.status === "punched_in" && !isMissedCheckout
                    ? (todayData.isLate ? "late" : "in")
                    : todayData.status === "punched_out"
                    ? "completed"
                    : isMissedCheckout
                    ? "missed"
                    : "not-checked"
                }`}
              >
                <span className="sp-status-bullet">•</span>
                {todayData.status === "punched_in" && !isMissedCheckout
                  ? `Checked In (${todayData.inTime || "--"})${todayData.isLate ? " (Late)" : ""}`
                  : todayData.status === "punched_out"
                  ? `Completed (${todayData.outTime || "--"})`
                  : isMissedCheckout
                  ? "Missed Checkout (Cutoff Passed)"
                  : "Not Checked In"}
              </span>
            </div>

            {/* 3 Metric Columns: CHECK IN, CHECK OUT, SHIFT DURATION */}
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
                <span className="sp-metric-col-label">SHIFT DURATION</span>
                <span className={`sp-metric-col-val ${todayData.status === "punched_in" && !isMissedCheckout ? "highlight" : ""}`}>
                  {clockShiftDuration === "--" ? "--:--" : clockShiftDuration}
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

        {/* Right Card: Check-In / Check-Out Actions */}
        <div className="cms-card sp-punch-action-card">
          <div className="sp-card-header">
            <h3 className="sp-card-title">Check-In / Check-Out</h3>
            <p className="sp-card-desc">
              Click below to record your campus entry or exit timestamp.
            </p>
          </div>

          <div className="sp-punch-twin-grid">
            {/* Check In Panel */}
            <div className="sp-twin-panel checkin-panel">
              {/* Check In Header: Icon beside Title */}
              <div className="sp-twin-header">
                <div className="sp-twin-icon-box checkin">
                  <LogIn size={15} />
                </div>
                <div className="sp-twin-title checkin">CHECK IN</div>
              </div>

              {/* Modern Digital Clock & Status Badge */}
              <div className="sp-digital-display checkin">
                <span className="sp-digital-time">{todayData.inTime || "--:-- --"}</span>
                <span className={`sp-digital-status-pill ${todayData.inTime ? (todayData.isLate ? "late" : "checked") : "pending"}`}>
                  <span className="sp-status-dot">•</span>
                  {todayData.inTime ? (todayData.isLate ? "Checked In (Late)" : "Checked In") : "Not Checked In"}
                </span>
              </div>

              {/* Check In Button */}
              <button
                type="button"
                className={`sp-punch-pill-btn checkin ${
                  todayData.status === "not_punched" && !actionLoading ? "active" : "inactive"
                }`}
                disabled={todayData.status !== "not_punched" || actionLoading}
                onClick={handlePunchIn}
              >
                {actionLoading && todayData.status === "not_punched" ? (
                  <Loader2 size={15} className="sp-spin" />
                ) : (
                  <LogIn size={15} />
                )}
                <span>Check In</span>
              </button>

              <div className="sp-punch-foot-hint">Allowed: {todayData.shiftStartTime} – {todayData.shiftEndTime}</div>
            </div>

            {/* Check Out Panel */}
            <div className="sp-twin-panel checkout-panel">
              {/* Check Out Header: Icon beside Title */}
              <div className="sp-twin-header">
                <div className="sp-twin-icon-box checkout">
                  <LogOut size={15} />
                </div>
                <div className="sp-twin-title checkout">CHECK OUT</div>
              </div>

              {/* Modern Digital Clock & Status Badge */}
              <div className="sp-digital-display checkout">
                <span className="sp-digital-time">{todayData.outTime || "--:-- --"}</span>
                <span className={`sp-digital-status-pill ${
                  todayData.outTime 
                    ? "checked" 
                    : isMissedCheckout 
                    ? "missed" 
                    : "pending"
                }`}>
                  <span className="sp-status-dot">•</span>
                  {todayData.outTime 
                    ? "Checked Out" 
                    : isMissedCheckout 
                    ? "Missed Checkout" 
                    : "Not Checked Out"}
                </span>
              </div>

              {/* Check Out Button */}
              {isMissedCheckout ? (
                <>
                  <button
                    type="button"
                    className="sp-punch-pill-btn checkout missed"
                    disabled
                    title="Check-out window (shift end + 15m) has passed. Marked as Missed Checkout."
                  >
                    <AlertCircle size={14} />
                    <span>Missed Checkout</span>
                  </button>
                  <button
                    type="button"
                    className="sp-missed-regularize-btn"
                    onClick={() =>
                      openRegularizeModal({
                        rawDate: new Date().toISOString().split("T")[0],
                        date: todayData.dateFormatted,
                      })
                    }
                  >
                    Regularize Attendance &gt;
                  </button>
                  <div className="sp-punch-foot-hint" style={{ color: "#b91c1c" }}>
                    15m cutoff passed. Apply for regularization.
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`sp-punch-pill-btn checkout ${
                      todayData.status === "punched_in" && !actionLoading ? "active" : "inactive"
                    }`}
                    disabled={todayData.status !== "punched_in" || actionLoading}
                    onClick={handlePunchOut}
                  >
                    {actionLoading && todayData.status === "punched_in" ? (
                      <Loader2 size={15} className="sp-spin" />
                    ) : (
                      <LogOut size={15} />
                    )}
                    <span>Check Out</span>
                  </button>

                  <div className="sp-punch-foot-hint">15m checkout window after shift end</div>
                </>
              )}
            </div>
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
                <div className="sp-kpi-value">{historyData.metrics?.workingDays || historyData.metrics?.WorkingDays || "0 Days"}</div>
                <div className="sp-kpi-sub">{historyData.metrics?.workingDaysSub || historyData.metrics?.WorkingDaysSub || "--"}</div>
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
                <div className="sp-kpi-value green-val">{historyData.metrics?.presentDays || historyData.metrics?.PresentDays || "0 Days"}</div>
                <div className="sp-kpi-sub">{historyData.metrics?.presentDaysSub || historyData.metrics?.PresentDaysSub || "--"}</div>
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
                <div className="sp-kpi-value">{historyData.metrics?.leaves || historyData.metrics?.Leaves || "0 Days"}</div>
                <div className="sp-kpi-sub">{historyData.metrics?.leavesSub || historyData.metrics?.LeavesSub || "--"}</div>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Absent Days */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box red">
            <UserX size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Absent Days</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 75, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="sp-kpi-value red-val">{historyData.metrics?.absentDays || historyData.metrics?.AbsentDays || "0 Days"}</div>
                <div className="sp-kpi-sub">{historyData.metrics?.absentDaysSub || historyData.metrics?.AbsentDaysSub || "--"}</div>
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
                    const holidayName = log.holidayName || log.HolidayName;
                    const isUpcoming = status === "-" || status === "--";

                    return (
                      <tr key={id}>
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
                              {holidayName && (
                                <span className="sp-holiday-name-subtext" title={holidayName}>
                                  {holidayName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {regState === "pending" ? (
                            <span className="sp-reg-badge pending">Pending</span>
                          ) : regState === "approved" ? (
                            <span className="sp-reg-badge approved">Approved</span>
                          ) : regState === "rejected" ? (
                            <span className="sp-reg-badge rejected">Rejected</span>
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
        <div className="sp-reg-modal-backdrop" onClick={() => !regSubmitting && setRegModalOpen(false)}>
          <div className="sp-reg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-reg-modal-header">
              <h3 className="sp-reg-modal-title">Attendance Regularization Request</h3>
              <button
                type="button"
                className="sp-reg-modal-close"
                disabled={regSubmitting}
                onClick={() => setRegModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRegularization}>
              <div className="sp-reg-modal-body">
                <div className="sp-reg-form-group">
                  <label className="sp-reg-label">Attendance Date</label>
                  <input
                    type="text"
                    className="sp-reg-input"
                    value={regForm.displayDate}
                    disabled
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="sp-reg-form-group">
                    <label className="sp-reg-label">Requested In-Time</label>
                    <input
                      type="time"
                      className="sp-reg-input"
                      value={regForm.requestedInTime}
                      onChange={(e) => setRegForm({ ...regForm, requestedInTime: e.target.value })}
                      required
                    />
                  </div>

                  <div className="sp-reg-form-group">
                    <label className="sp-reg-label">Requested Out-Time</label>
                    <input
                      type="time"
                      className="sp-reg-input"
                      value={regForm.requestedOutTime}
                      onChange={(e) => setRegForm({ ...regForm, requestedOutTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="sp-reg-form-group">
                  <label className="sp-reg-label">Reason / Justification *</label>
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
                  onClick={() => setRegModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sp-reg-submit-btn"
                  disabled={regSubmitting || !regForm.reason.trim()}
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
