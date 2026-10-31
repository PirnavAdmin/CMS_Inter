import { useAccountantViewParams } from "../components/AccountantUI.jsx";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  Briefcase,
  UserX,
  AlertCircle,
  Send,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import "./AccountantMyAttendance.css";
import { Skeleton } from "@/shared/components/Ui.jsx";
import { getApiErrorMessage } from "@/api/apiClient.js";
import { attendanceService } from "../../../api/attendanceService.js";

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

const toInputTime = (value) => {
  const minutes = parseTimeToMinutes(value);
  return minutes === null ? "" : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

const normalizeTodayData = (raw) => {
  if (!raw) return null;
  return {
    status: raw.status || raw.Status || "unavailable",
    inTime: raw.inTime || raw.InTime || null,
    outTime: raw.outTime || raw.OutTime || null,
    shiftDuration: raw.shiftDuration || raw.ShiftDuration || "--",
    shiftName: raw.shiftName || raw.ShiftName || "--",
    shiftStartTime: raw.shiftStartTime || raw.ShiftStartTime || "--",
    shiftEndTime: raw.shiftEndTime || raw.ShiftEndTime || "--",
    isLate: Boolean(raw.isLate ?? raw.IsLate),
    todayStatus: raw.todayStatus || raw.TodayStatus || "--",
    canRegularize: Boolean(raw.canRegularize ?? raw.CanRegularize),
    dateFormatted: raw.dateFormatted || raw.DateFormatted || new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    regularizationState: raw.regularizationState || raw.RegularizationState || null,
  };
};

export default function AccountantMyAttendance() {
  const [todayError, setTodayError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const actionLock = useRef(false);
  const regLock = useRef(false);
  const historyRequest = useRef(0);
  const activeFilterRef = useRef("week");
  const [, setShiftUpdateTick] = useState(0);

  // Periodic ticker to recalculate active shift timer every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setShiftUpdateTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter State: "week" | "last_week" | "month" | "last_month"
  const { params: viewParams, setParam } = useAccountantViewParams();
  const activeFilter = ["week", "last_week", "month", "last_month"].includes(viewParams.get("range")) ? viewParams.get("range") : "week";
  const setActiveFilter = (range) => setParam("range", range);
  activeFilterRef.current = activeFilter;
  const regularizeDate = viewParams.get("regularize");
  const [historyPeriod, setHistoryPeriod] = useState("");

  // Loading States
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live Today Status
  const [todayData, setTodayData] = useState({
    status: "unavailable",
    inTime: null,
    outTime: null,
    shiftDuration: "--",
    shiftName: "--",
    shiftStartTime: "--",
    shiftEndTime: "--",
    isLate: false,
    todayStatus: "--",
    canRegularize: false,
    dateFormatted: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    regularizationState: null,
  });

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
  const selectedLog = regularizeDate == null ? null : historyData.logs.find((log) => String(log.rawDate).slice(0, 10) === regularizeDate);
  const regModalOpen = Boolean(regularizeDate && !loadingHistory && !historyError && historyPeriod === activeFilter && selectedLog?.canRegularize);
  const setRegModalOpen = (open) => { if (!open) setParam("regularize", null); };
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regDraft, setRegForm] = useState({
    rawDate: "",
    displayDate: "",
    requestedInTime: "",
    requestedOutTime: "",
    reason: "",
  });

  const regForm = regDraft.rawDate === regularizeDate ? regDraft : {
    rawDate: regularizeDate || "",
    displayDate: selectedLog?.date || selectedLog?.day || "Selected Date",
    requestedInTime: toInputTime(selectedLog?.inTime) || toInputTime(todayData.shiftStartTime),
    requestedOutTime: toInputTime(selectedLog?.outTime) || toInputTime(todayData.shiftEndTime), reason: "",
  };
  const [toast, setToast] = useState(null);

  const notify = useCallback((text, type = "success") => {
    setToast({ text, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch Today's Attendance Status
  const fetchTodayStatus = useCallback(async () => {
    try {
      setLoadingToday(true);
      setTodayError(null);
      const res = await attendanceService.getMyTodayStatus();
      const payload = res?.data ?? res?.Data;
      if ((res?.status ?? res?.Status) === false || !payload) throw new Error(res?.message || res?.Message || "Attendance data is unavailable.");
      if (payload) {
        const normalized = normalizeTodayData(payload);
        if (normalized) {
          setTodayData(normalized);
        }
      }
    } catch (err) {
      setTodayError(getApiErrorMessage(err));
      setTodayData((prev) => ({ ...prev, status: "unavailable" }));
    } finally {
      setLoadingToday(false);
    }
  }, []);

  // Fetch Attendance History for selected filter
  const fetchHistory = useCallback(async (period) => {
    const request = ++historyRequest.current;
    try {
      setLoadingHistory(true);
      setHistoryError(null);
      setHistoryData({ logs: [], metrics: {} });
      const res = await attendanceService.getMyAttendanceHistory(period);
      const payload = res?.data ?? res?.Data;
      if ((res?.status ?? res?.Status) === false || !payload) throw new Error(res?.message || res?.Message || "Attendance data is unavailable.");
      if (request !== historyRequest.current || period !== activeFilterRef.current) return;
      if (payload) {
        setHistoryPeriod(period);
        const rawLogs = payload.logs || payload.Logs || [];
        const rawMetrics = payload.metrics || payload.Metrics || {};
        setHistoryData({
          logs: rawLogs.map((l) => ({
            id: l.id || l.Id,
            day: l.day || l.Day,
            date: l.date || l.Date,
            rawDate: l.rawDate || l.RawDate,
            shift: l.shift || l.Shift,
            inTime: l.inTime || l.InTime,
            outTime: l.outTime || l.OutTime,
            hours: l.hours || l.Hours,
            device: l.device || l.Device,
            status: l.status || l.Status,
            canRegularize: Boolean(l.canRegularize ?? l.CanRegularize),
            isToday: Boolean(l.isToday ?? l.IsToday),
            regularizationState: l.regularizationState || l.RegularizationState,
            holidayName: l.holidayName || l.HolidayName || null,
          })),
          metrics: {
            workingDays: rawMetrics.workingDays || rawMetrics.WorkingDays || "--",
            workingDaysSub: rawMetrics.workingDaysSub || rawMetrics.WorkingDaysSub || "--",
            presentDays: rawMetrics.presentDays || rawMetrics.PresentDays || "--",
            presentDaysSub: rawMetrics.presentDaysSub || rawMetrics.PresentDaysSub || "--",
            leaves: rawMetrics.leaves || rawMetrics.Leaves || "--",
            leavesSub: rawMetrics.leavesSub || rawMetrics.LeavesSub || "--",
            absentDays: rawMetrics.absentDays || rawMetrics.AbsentDays || "--",
            absentDaysSub: rawMetrics.absentDaysSub || rawMetrics.AbsentDaysSub || "--",
          },
        });
      }
    } catch (err) {
      if (request === historyRequest.current && period === activeFilterRef.current) setHistoryError(getApiErrorMessage(err));
    } finally {
      if (request === historyRequest.current && period === activeFilterRef.current) setLoadingHistory(false);
    }
  }, []);

  // Initial load once on mount
  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  // When filter tab changes, load corresponding history
  useEffect(() => {
    fetchHistory(activeFilterRef.current);
  }, [activeFilter, fetchHistory]);

  const changeFilter = (period) => {
    if (period === activeFilterRef.current) return;
    activeFilterRef.current = period;
    historyRequest.current += 1;
    setLoadingHistory(true);
    setActiveFilter(period);
  };

  // Punch In Handler
  const handlePunchIn = async () => {
    if (todayData.status !== "not_punched" || actionLoading || loadingToday || todayError || actionLock.current) return;
    actionLock.current = true;
    setActionLoading(true);
    try {
      const res = await attendanceService.punchIn({
        verificationMethod: 3, // WebCheckIn
        deviceId: "Web Portal",
        remarks: "Accountant Self Check-In via Web Portal",
      });

      const isSuccess = Boolean(res?.status ?? res?.Status);
      const payload = res?.data || res?.Data;
      if (isSuccess && payload) {
        const normalized = normalizeTodayData(payload);
        if (normalized) {
          setTodayData(normalized);
        }
        notify(res?.message || res?.Message || `Checked In Successfully at ${payload.inTime || payload.InTime}`, "success");
        fetchHistory(activeFilterRef.current);
      } else {
        notify(res?.message || res?.Message || "Failed to check in.", "error");
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.Message || err?.message || "Failed to check in.";
      notify(errMsg, "error");
    } finally {
      actionLock.current = false;
      setActionLoading(false);
    }
  };

  // Punch Out Handler
  const handlePunchOut = async () => {
    if (todayData.status !== "punched_in" || actionLoading || loadingToday || todayError || actionLock.current) return;
    actionLock.current = true;
    setActionLoading(true);
    try {
      const res = await attendanceService.punchOut({
        verificationMethod: 3,
        deviceId: "Web Portal",
        remarks: "Accountant Self Check-Out via Web Portal",
      });

      const isSuccess = Boolean(res?.status ?? res?.Status);
      const payload = res?.data || res?.Data;
      if (isSuccess && payload) {
        const normalized = normalizeTodayData(payload);
        if (normalized) {
          setTodayData(normalized);
        }
        notify(res?.message || res?.Message || `Punched Out Successfully at ${payload.outTime || payload.OutTime}`, "success");
        fetchHistory(activeFilterRef.current);
      } else {
        notify(res?.message || res?.Message || "Failed to punch out.", "error");
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.Message || err?.message || "Failed to punch out.";
      notify(errMsg, "error");
    } finally {
      actionLock.current = false;
      setActionLoading(false);
    }
  };

  // Open Regularization Modal for a specific date
  const openRegularizeModal = (log) => {
    if (!log.canRegularize || !log.rawDate || regLock.current) return;
    setRegForm({
      rawDate: log.rawDate,
      displayDate: log.date || log.Date || log.day || "Selected Date",
      requestedInTime: toInputTime(log.inTime) || toInputTime(todayData.shiftStartTime),
      requestedOutTime: toInputTime(log.outTime) || toInputTime(todayData.shiftEndTime),
      reason: "",
    });
    setParam("regularize", String(log.rawDate).slice(0, 10));
  };

  // Submit Regularization Form
  const handleSubmitRegularization = async (e) => {
    e.preventDefault();
    if (regLock.current) return;
    if (!regForm.reason.trim()) {
      notify("Please provide a reason for attendance regularization.", "error");
      return;
    }

    regLock.current = true;
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
        fetchHistory(activeFilterRef.current);
      } else {
        notify(res?.message || res?.Message || "Failed to submit regularization.", "error");
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err?.response?.data?.Message || err?.message || "Failed to submit regularization.";
      notify(errMsg, "error");
    } finally {
      regLock.current = false;
      setRegSubmitting(false);
    }
  };

  // Real-time dynamic shift duration display
  const clockShiftDuration = (() => {
    if (todayData.status === "punched_out" && todayData.inTime && todayData.outTime) {
      return calculateDurationStr(todayData.inTime, todayData.outTime, false);
    }
    if (todayData.status === "punched_in" && todayData.inTime) {
      return calculateDurationStr(todayData.inTime, null, true);
    }
    return todayData.shiftDuration && todayData.shiftDuration !== "--" ? todayData.shiftDuration : "--:--";
  })();

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Present":
        return "present";
      case "Late":
        return "late";
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
    <div className="acct-att-accountant-attendance-page" aria-label="My Attendance">
      {todayError && <div className="acct-att-attendance-error" role="alert"><AlertCircle size={16} /><span>Today’s attendance unavailable: {todayError}</span><button type="button" onClick={fetchTodayStatus}>Retry</button></div>}
      {historyError && <div className="acct-att-attendance-error" role="alert"><AlertCircle size={16} /><span>Attendance history unavailable: {historyError}</span><button type="button" onClick={() => fetchHistory(activeFilterRef.current)}>Retry</button></div>}
      {/* Top Punch & Shift Grid */}
      <div className="acct-att-attendance-top-grid">
        {/* Left Card: Attendance & Shift Summary */}
        <div className="cms-card acct-att-shift-summary-card">
          <div className="acct-att-card-header">
            <h3 className="acct-att-card-title">Attendance & Shift Summary</h3>
            <p className="acct-att-card-desc">
              Campus shift schedule, check-in status & calculated shift duration.
            </p>
          </div>

          <div className="acct-att-summary-inner-box">
            {/* Check Status Row - Centered in middle */}
            <div className="acct-att-summary-status-row">
              <span className="acct-att-summary-label">Check Status:</span>
              <span
                className={`acct-att-check-status-badge ${
                  todayData.status === "punched_in"
                    ? "in"
                    : todayData.status === "punched_out"
                    ? "completed"
                    : "not-checked"
                }`}
              >
                <span className="acct-att-status-bullet">•</span>
                {todayData.status === "punched_in"
                  ? `Checked In (${todayData.inTime || "--"})`
                  : todayData.status === "punched_out"
                  ? `Completed (${todayData.outTime || "--"})`
                  : loadingToday ? "Loading..." : todayError ? "Unavailable" : "Not Checked In"}
              </span>
            </div>

            {/* 3 Metric Columns: CHECK IN, CHECK OUT, SHIFT DURATION */}
            <div className="acct-att-summary-metric-cols">
              <div className="acct-att-summary-col">
                <span className="acct-att-metric-col-label">CHECK IN</span>
                <span className={`acct-att-metric-col-val ${todayData.inTime ? "highlight" : ""}`}>
                  {todayData.inTime || "--:-- --"}
                </span>
              </div>
              <div className="acct-att-summary-col">
                <span className="acct-att-metric-col-label">CHECK OUT</span>
                <span className="acct-att-metric-col-val">
                  {todayData.outTime || "--:-- --"}
                </span>
              </div>
              <div className="acct-att-summary-col">
                <span className="acct-att-metric-col-label">SHIFT DURATION</span>
                <span className={`acct-att-metric-col-val ${todayData.status === "punched_in" ? "highlight" : ""}`}>
                  {clockShiftDuration === "--" ? "--:--" : clockShiftDuration}
                </span>
              </div>
            </div>

            {/* Bottom Shift & Date Info */}
            <div className="acct-att-summary-foot-row">
              <div className="acct-att-summary-foot-left">
                <span className="acct-att-foot-label">Campus Shift:</span>
                <Clock size={13} className="acct-att-foot-icon" />
                <span className="acct-att-foot-val">{todayData.shiftStartTime} – {todayData.shiftEndTime}</span>
              </div>
              <div className="acct-att-summary-foot-right">
                <Calendar size={13} className="acct-att-foot-icon" />
                <span className="acct-att-foot-val">{todayData.dateFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Check-In / Check-Out Actions */}
        <div className="cms-card acct-att-punch-action-card">
          <div className="acct-att-card-header">
            <h3 className="acct-att-card-title">Check-In / Check-Out</h3>
            <p className="acct-att-card-desc">
              Click below to record your campus entry or exit timestamp.
            </p>
          </div>

          <div className="acct-att-punch-twin-grid">
            {/* Check In Panel */}
            <div className="acct-att-twin-panel checkin-panel">
              <div className="acct-att-twin-icon-box checkin">
                <LogIn size={16} />
              </div>
              <div className="acct-att-twin-title checkin">CHECK IN</div>

              {/* Modern Digital Clock & Status Badge */}
              <div className="acct-att-digital-display checkin">
                <span className="acct-att-digital-time">{todayData.inTime || "--:-- --"}</span>
                <span className={`acct-att-digital-status-pill ${todayData.inTime ? "checked" : "pending"}`}>
                  <span className="acct-att-status-dot">•</span>
                  {todayData.inTime ? "Checked In" : loadingToday ? "Loading..." : todayError ? "Unavailable" : "Not Checked In"}
                </span>
              </div>

              {/* Check In Button */}
              <button
                type="button"
                className={`acct-att-punch-pill-btn checkin ${
                  todayData.status === "not_punched" && !actionLoading && !loadingToday && !todayError ? "active" : "inactive"
                }`}
                disabled={todayData.status !== "not_punched" || actionLoading || loadingToday || Boolean(todayError)}
                onClick={handlePunchIn}
              >
                {actionLoading && todayData.status === "not_punched" ? (
                  <Loader2 size={15} className="acct-att-spin" />
                ) : (
                  <LogIn size={15} />
                )}
                <span>Check In</span>
              </button>

              <div className="acct-att-punch-foot-hint">Allowed: {todayData.shiftStartTime} – {todayData.shiftEndTime}</div>
            </div>

            {/* Check Out Panel */}
            <div className="acct-att-twin-panel checkout-panel">
              <div className="acct-att-twin-icon-box checkout">
                <LogOut size={16} />
              </div>
              <div className="acct-att-twin-title checkout">CHECK OUT</div>

              {/* Modern Digital Clock & Status Badge */}
              <div className="acct-att-digital-display checkout">
                <span className="acct-att-digital-time">{todayData.outTime || "--:-- --"}</span>
                <span className={`acct-att-digital-status-pill ${todayData.outTime ? "checked" : "pending"}`}>
                  <span className="acct-att-status-dot">•</span>
                  {todayData.outTime ? "Checked Out" : loadingToday ? "Loading..." : todayError ? "Unavailable" : "Not Checked Out"}
                </span>
              </div>

              {/* Check Out Button */}
              <button
                type="button"
                className={`acct-att-punch-pill-btn checkout ${
                  todayData.status === "punched_in" && !actionLoading && !loadingToday && !todayError ? "active" : "inactive"
                }`}
                disabled={todayData.status !== "punched_in" || actionLoading || loadingToday || Boolean(todayError)}
                onClick={handlePunchOut}
              >
                {actionLoading && todayData.status === "punched_in" ? (
                  <Loader2 size={15} className="acct-att-spin" />
                ) : (
                  <LogOut size={15} />
                )}
                <span>Check Out</span>
              </button>

              <div className="acct-att-punch-foot-hint">After check-in only</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 4 Metric Cards */}
      <div className="acct-att-metric-cards-grid">
        {/* Card 1: Working Days */}
        <div className="cms-card acct-att-metric-kpi-card">
          <div className="acct-att-kpi-icon-box green">
            <Calendar size={20} />
          </div>
          <div className="acct-att-kpi-content">
            <div className="acct-att-kpi-label">Working Days</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 85, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="acct-att-kpi-value">{historyData.metrics?.workingDays || historyData.metrics?.WorkingDays || "--"}</div>
                <div className="acct-att-kpi-sub">{historyData.metrics?.workingDaysSub || historyData.metrics?.WorkingDaysSub || "--"}</div>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Present Days */}
        <div className="cms-card acct-att-metric-kpi-card">
          <div className="acct-att-kpi-icon-box green">
            <CheckCircle2 size={20} />
          </div>
          <div className="acct-att-kpi-content">
            <div className="acct-att-kpi-label">Present Days</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 95, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="acct-att-kpi-value green-val">{historyData.metrics?.presentDays || historyData.metrics?.PresentDays || "--"}</div>
                <div className="acct-att-kpi-sub">{historyData.metrics?.presentDaysSub || historyData.metrics?.PresentDaysSub || "--"}</div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Approved Leaves */}
        <div className="cms-card acct-att-metric-kpi-card">
          <div className="acct-att-kpi-icon-box purple">
            <Briefcase size={20} />
          </div>
          <div className="acct-att-kpi-content">
            <div className="acct-att-kpi-label">Approved Leaves</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 85, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="acct-att-kpi-value">{historyData.metrics?.leaves || historyData.metrics?.Leaves || "--"}</div>
                <div className="acct-att-kpi-sub">{historyData.metrics?.leavesSub || historyData.metrics?.LeavesSub || "--"}</div>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Absent Days */}
        <div className="cms-card acct-att-metric-kpi-card">
          <div className="acct-att-kpi-icon-box red">
            <UserX size={20} />
          </div>
          <div className="acct-att-kpi-content">
            <div className="acct-att-kpi-label">Absent Days</div>
            {loadingHistory ? (
              <>
                <Skeleton style={{ width: 55, height: 18, margin: "2px 0" }} />
                <Skeleton style={{ width: 75, height: 11, marginTop: 4 }} />
              </>
            ) : (
              <>
                <div className="acct-att-kpi-value red-val">{historyData.metrics?.absentDays || historyData.metrics?.AbsentDays || "--"}</div>
                <div className="acct-att-kpi-sub">{historyData.metrics?.absentDaysSub || historyData.metrics?.AbsentDaysSub || "--"}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Daily Attendance History Table */}
      <div className="cms-card acct-att-attendance-history-card">
        <div className="acct-att-attendance-card-head">
          <div className="acct-att-table-head-left">
            <div className="acct-att-att-cal-icon">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="acct-att-table-title">
                {activeFilter === "week"
                  ? "This Week"
                  : activeFilter === "last_week"
                  ? "Last Week"
                  : activeFilter === "month"
                  ? "This Month"
                  : "Last Month"}
              </h2>
              <span className="acct-att-table-subtitle">
                Biometric Check-In History & Daily Attendance Logs
              </span>
            </div>
          </div>

          {/* Filter Pills: Week | Last Week | Month | Last Month */}
          <div className="acct-att-att-filter-tabs">
            <button
              type="button"
              className={`acct-att-att-filter-btn ${activeFilter === "week" ? "active" : ""}`}
              aria-pressed={activeFilter === "week"}
              onClick={() => changeFilter("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={`acct-att-att-filter-btn ${activeFilter === "last_week" ? "active" : ""}`}
              aria-pressed={activeFilter === "last_week"}
              onClick={() => changeFilter("last_week")}
            >
              Last Week
            </button>
            <button
              type="button"
              className={`acct-att-att-filter-btn ${activeFilter === "month" ? "active" : ""}`}
              aria-pressed={activeFilter === "month"}
              onClick={() => changeFilter("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`acct-att-att-filter-btn ${activeFilter === "last_month" ? "active" : ""}`}
              aria-pressed={activeFilter === "last_month"}
              onClick={() => changeFilter("last_month")}
            >
              Last Month
            </button>
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="acct-att-attendance-table">
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
                  <tr key={`skel-row-${idx}`} className="acct-att-att-skeleton-row">
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
                      <tr key={id ?? log.rawDate ?? date}>
                        <td>
                          <div className="acct-att-day-name">{day}</div>
                          <div className="acct-att-day-date">{date}</div>
                        </td>
                        <td>
                          <span className="acct-att-shift-text">{shift}</span>
                        </td>
                        <td>
                          <span className={`acct-att-time-text ${inTime !== "--" && !isUpcoming ? "highlight" : ""}`}>
                            {inTime}
                          </span>
                        </td>
                        <td>
                          <span className="acct-att-time-text">{outTime}</span>
                        </td>
                        <td>
                          <span className="acct-att-hours-text">{hours}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {isUpcoming ? (
                            <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>--</span>
                          ) : (
                            <div className="acct-att-status-cell">
                              <span className={`acct-att-status-badge ${getStatusBadgeClass(status)}`}>
                                {status}
                              </span>
                              {holidayName && (
                                <span className="acct-att-holiday-name-subtext" title={holidayName}>
                                  {holidayName}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {regState === "pending" ? (
                            <span className="acct-att-reg-badge pending">Pending</span>
                          ) : regState === "approved" ? (
                            <span className="acct-att-reg-badge approved">Approved</span>
                          ) : regState === "rejected" ? (
                            <span className="acct-att-reg-badge rejected">Rejected</span>
                          ) : canReg && log.rawDate ? (
                            <button
                              type="button"
                              className="acct-att-btn-regularize"
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
                      {historyError ? `Attendance history unavailable: ${historyError}` : "No attendance logs recorded for this period."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>

      {/* Attendance Regularization Modal */}
      {regularizeDate && !regModalOpen && <div className="acct-att-reg-modal-backdrop"><div className="acct-att-reg-modal" role="dialog" aria-label="Attendance Regularization"><p role="status">{loadingHistory || (!historyError && historyPeriod !== activeFilter) ? "Loading attendance record..." : historyError || "This attendance record is unavailable or cannot be regularized."}</p><button type="button" className="cms-btn cms-btn-secondary" onClick={() => setRegModalOpen(false)}>Close</button></div></div>}
      {regModalOpen && (
        <div className="acct-att-reg-modal-backdrop" onClick={() => !regSubmitting && setRegModalOpen(false)}>
          <div className="acct-att-reg-modal" role="dialog" aria-modal="true" aria-label="Attendance Regularization Request" onClick={(e) => e.stopPropagation()}>
            <div className="acct-att-reg-modal-header">
              <h3 className="acct-att-reg-modal-title">Attendance Regularization Request</h3>
              <button
                type="button"
                className="acct-att-reg-modal-close"
                aria-label="Close regularization"
                disabled={regSubmitting}
                onClick={() => setRegModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRegularization}>
              <div className="acct-att-reg-modal-body">
                <div className="acct-att-reg-form-group">
                  <label className="acct-att-reg-label">Attendance Date</label>
                  <input
                    type="text"
                    className="acct-att-reg-input"
                    value={regForm.displayDate}
                    disabled
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="acct-att-reg-form-group">
                    <label className="acct-att-reg-label">Requested In-Time</label>
                    <input
                      type="time"
                      className="acct-att-reg-input"
                      value={regForm.requestedInTime}
                      onChange={(e) => setRegForm({ ...regForm, requestedInTime: e.target.value })}
                      required
                    />
                  </div>

                  <div className="acct-att-reg-form-group">
                    <label className="acct-att-reg-label">Requested Out-Time</label>
                    <input
                      type="time"
                      className="acct-att-reg-input"
                      value={regForm.requestedOutTime}
                      onChange={(e) => setRegForm({ ...regForm, requestedOutTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="acct-att-reg-form-group">
                  <label className="acct-att-reg-label">Reason / Justification *</label>
                  <textarea
                    rows={3}
                    className="acct-att-reg-textarea"
                    placeholder="Explain why punch was missed or late (e.g., On official duty, scanner glitch)..."
                    value={regForm.reason}
                    onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })}
                    required
                  />

                  {/* Quick Reason Pills */}
                  <div className="acct-att-reg-quick-pills">
                    {[
                      "Biometric Machine Failure",
                      "Official Exam Duty (OD)",
                      "Campus Network / Power Issue",
                      "Permitted Late Arrival",
                    ].map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        className="acct-att-reg-quick-pill"
                        onClick={() => setRegForm((prev) => ({ ...prev, reason: pill }))}
                      >
                        + {pill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="acct-att-reg-modal-footer">
                <button
                  type="button"
                  className="acct-att-reg-cancel-btn"
                  disabled={regSubmitting}
                  onClick={() => setRegModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="acct-att-reg-submit-btn"
                  disabled={regSubmitting || !regForm.reason.trim()}
                >
                  {regSubmitting ? (
                    <Loader2 size={14} className="acct-att-spin" />
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
        <div role="status" className={`acct-att-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
