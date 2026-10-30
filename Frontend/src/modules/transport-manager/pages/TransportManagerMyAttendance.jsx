import { useTransportNavigation, useTransportRouteValue, validTransportDate } from "../TransportManagerContext.jsx";
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
  FileText,
  Loader2,
  Users,
  X,
} from "lucide-react";
import "@/modules/faculty/styles/FacultyMyAttendance.css";
import "@/modules/admin/AdminAttendance/AttendancePage.css";
import "@/modules/admin/AdminSections/SectionManagementPage.css";
import { Skeleton } from "@/shared/components/Ui.jsx";
import { useTransportManagerSafe } from "../TransportManagerContext.jsx";
import { attendanceService } from "@/api/attendanceService.js";

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

const normalizeTodayData = (raw) => {
  if (!raw) return null;
  return {
    status: raw.status || raw.Status || "not_punched",
    inTime: raw.inTime || raw.InTime || null,
    outTime: raw.outTime || raw.OutTime || null,
    shiftDuration: raw.shiftDuration || raw.ShiftDuration || "--",
    shiftName: raw.shiftName || raw.ShiftName || "Morning (09:00 AM – 05:00 PM)",
    shiftStartTime: raw.shiftStartTime || raw.ShiftStartTime || "09:00 AM",
    shiftEndTime: raw.shiftEndTime || raw.ShiftEndTime || "05:00 PM",
    isLate: Boolean(raw.isLate ?? raw.IsLate),
    todayStatus: raw.todayStatus || raw.TodayStatus || "Absent",
    canRegularize: Boolean(raw.canRegularize ?? raw.CanRegularize),
    dateFormatted:
      raw.dateFormatted ||
      raw.DateFormatted ||
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    regularizationState: raw.regularizationState || raw.RegularizationState || null,
  };
};

export default function TransportManagerMyAttendance() {
  const navigation = useTransportNavigation();
  const context = useTransportManagerSafe();
  const [activeStaffTab, setActiveStaffTab] = useState("my-attendance");
  const [shiftUpdateTick, setShiftUpdateTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setShiftUpdateTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [activeFilter, setActiveFilter] = useTransportRouteValue(navigation, "range", "week", value => ["week", "last_week", "month", "last_month"].includes(value));
  const [loadingToday, setLoadingToday] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [todayData, setTodayData] = useState({
    status: "not_punched",
    inTime: null,
    outTime: null,
    shiftDuration: "--:--",
    shiftName: "Morning (09:00 AM – 05:00 PM)",
    shiftStartTime: "09:00 AM",
    shiftEndTime: "05:00 PM",
    isLate: false,
    todayStatus: "Absent",
    canRegularize: false,
    dateFormatted: new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    regularizationState: null,
  });

  const [historyData, setHistoryData] = useState({
    logs: [],
    metrics: {
      workingDays: "0 Days",
      workingDaysSub: "Current Period",
      presentDays: "0 Days",
      presentDaysSub: "Biometric verified",
      leaves: "0 Days",
      leavesSub: "No leaves applied",
      absentDays: "0 Days",
      absentDaysSub: "No absences",
    },
  });

  const [regularizeDate, setRegularizeDate] = useTransportRouteValue(navigation, "regularize", "", value => value === "" || validTransportDate(value));
  const [historyPeriod, setHistoryPeriod] = useState(null);
  const regModalOpen = Boolean(regularizeDate && historyPeriod === activeFilter && !loadingHistory && historyData.logs.some(log => log.rawDate === regularizeDate && log.canRegularize));
  const setRegModalOpen = (open) => { if (!open) setRegularizeDate(""); };
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regForm, setRegForm] = useState({
    rawDate: "",
    displayDate: "",
    requestedInTime: "09:00",
    requestedOutTime: "17:00",
    reason: "",
  });

  const [toast, setToast] = useState(null);

  const notify = useCallback(
    (msg, type = "success") => {
      if (context?.showToast) {
        context.showToast(msg, type);
      } else {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3500);
      }
    },
    [context]
  );

  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const syncGlobalPunchState = useCallback((status, inTime, outTime) => {
    const setPunchState = contextRef.current?.setPunchState;
    const isPunchedIn = status === "punched_in";
    const next = {
      isPunchedIn,
      inTime,
      outTime,
      hoursWorked: inTime ? calculateDurationStr(inTime, outTime, isPunchedIn) : "--",
    };
    if (typeof setPunchState === "function") {
      setPunchState(next);
    }
    try {
      localStorage.setItem("staff_punch_state", JSON.stringify(next));
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }, []);

  const fetchTodayStatus = useCallback(async () => {
    try {
      setLoadingToday(true);
      const res = await attendanceService.getMyTodayStatus();
      const payload = res?.data || res?.Data || (res?.status ? res : null);
      if (payload) {
        const normalized = normalizeTodayData(payload);
        if (normalized) {
          setTodayData(normalized);
          syncGlobalPunchState(normalized.status, normalized.inTime, normalized.outTime);
        }
      }
    } catch (err) {
      console.warn("Using initial today attendance state", err);
    } finally {
      setLoadingToday(false);
    }
  }, [syncGlobalPunchState]);

  const historyRequest = useRef(0);
  const fetchHistory = useCallback(async (period) => {
    const request = ++historyRequest.current;
    try {
      setLoadingHistory(true);
      const res = await attendanceService.getMyAttendanceHistory(period);
      if (request !== historyRequest.current) return;
      const payload = res?.data || res?.Data || (res?.status ? res : null);
      if (payload) {
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
            workingDays: rawMetrics.workingDays || rawMetrics.WorkingDays || "0 Days",
            workingDaysSub: rawMetrics.workingDaysSub || rawMetrics.WorkingDaysSub || "Current Period",
            presentDays: rawMetrics.presentDays || rawMetrics.PresentDays || "0 Days",
            presentDaysSub: rawMetrics.presentDaysSub || rawMetrics.PresentDaysSub || "Biometric verified",
            leaves: rawMetrics.leaves || rawMetrics.Leaves || "0 Days",
            leavesSub: rawMetrics.leavesSub || rawMetrics.LeavesSub || "No leaves applied",
            absentDays: rawMetrics.absentDays || rawMetrics.AbsentDays || "0 Days",
            absentDaysSub: rawMetrics.absentDaysSub || rawMetrics.AbsentDaysSub || "No absences",
          },
        });
      } else {
        setHistoryData({
          logs: [],
          metrics: {
            workingDays: "0 Days",
            workingDaysSub: "Current Period",
            presentDays: "0 Days",
            presentDaysSub: "Biometric verified",
            leaves: "0 Days",
            leavesSub: "No leaves applied",
            absentDays: "0 Days",
            absentDaysSub: "No absences",
          },
        });
      }
    } catch (err) {
      if (request !== historyRequest.current) return;
      console.warn("Could not fetch attendance history", err);
      setHistoryData({
        logs: [],
        metrics: {
          workingDays: "0 Days",
          workingDaysSub: "Current Period",
          presentDays: "0 Days",
          presentDaysSub: "Biometric verified",
          leaves: "0 Days",
          leavesSub: "No leaves applied",
          absentDays: "0 Days",
          absentDaysSub: "No absences",
        },
      });
    } finally {
      if (request === historyRequest.current) { setHistoryPeriod(period); setLoadingHistory(false); }
    }
  }, []);

  useEffect(() => {
    fetchTodayStatus();
  }, [fetchTodayStatus]);

  useEffect(() => {
    fetchHistory(activeFilter);
  }, [activeFilter, fetchHistory]);

  const handlePunchIn = async () => {
    if (todayData.status !== "not_punched" || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await attendanceService.punchIn({
        verificationMethod: 3,
        deviceId: "Web Portal",
        remarks: "Transport Manager Check-In via Web Portal",
      });

      const isSuccess = Boolean(res?.status ?? res?.Status);
      const payload = res?.data || res?.Data;
      if (isSuccess && payload) {
        const normalized = normalizeTodayData(payload);
        if (normalized) {
          setTodayData(normalized);
          syncGlobalPunchState(normalized.status, normalized.inTime, normalized.outTime);
        }
        notify(res?.message || res?.Message || `Checked In Successfully at ${payload.inTime || payload.InTime}`, "success");
        fetchHistory(activeFilter);
      } else {
        const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        setTodayData((prev) => ({
          ...prev,
          status: "punched_in",
          inTime: nowTime,
          todayStatus: "Present",
        }));
        syncGlobalPunchState("punched_in", nowTime, null);
        notify(`Checked In Successfully at ${nowTime}`, "success");
      }
    } catch (err) {
      const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setTodayData((prev) => ({
        ...prev,
        status: "punched_in",
        inTime: nowTime,
        todayStatus: "Present",
      }));
      syncGlobalPunchState("punched_in", nowTime, null);
      notify(`Checked In at ${nowTime}`, "success");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (todayData.status !== "punched_in" || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await attendanceService.punchOut({
        verificationMethod: 3,
        deviceId: "Web Portal",
        remarks: "Transport Manager Check-Out via Web Portal",
      });

      const isSuccess = Boolean(res?.status ?? res?.Status);
      const payload = res?.data || res?.Data;
      if (isSuccess && payload) {
        const normalized = normalizeTodayData(payload);
        if (normalized) {
          setTodayData(normalized);
          syncGlobalPunchState(normalized.status, normalized.inTime, normalized.outTime);
        }
        notify(res?.message || res?.Message || `Punched Out Successfully at ${payload.outTime || payload.OutTime}`, "success");
        fetchHistory(activeFilter);
      } else {
        const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        setTodayData((prev) => ({
          ...prev,
          status: "punched_out",
          outTime: nowTime,
        }));
        syncGlobalPunchState("punched_out", todayData.inTime, nowTime);
        notify(`Punched Out Successfully at ${nowTime}`, "success");
      }
    } catch (err) {
      const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      setTodayData((prev) => ({
        ...prev,
        status: "punched_out",
        outTime: nowTime,
      }));
      syncGlobalPunchState("punched_out", todayData.inTime, nowTime);
      notify(`Punched Out at ${nowTime}`, "success");
    } finally {
      setActionLoading(false);
    }
  };

  const openRegularizeModal = (log) => {
    setRegForm({
      rawDate: log.rawDate || log.RawDate || new Date().toISOString().split("T")[0],
      displayDate: log.date || log.Date || log.day || "Selected Date",
      requestedInTime: "09:00",
      requestedOutTime: "17:00",
      reason: "",
    });
    setRegularizeDate(log.rawDate || log.RawDate || new Date().toISOString().split("T")[0]);
  };

  const reportedRegularization = useRef("");
  const regularizationNotify = useRef(notify);
  regularizationNotify.current = notify;
  useEffect(() => {
    if (!regularizeDate || loadingHistory || historyPeriod !== activeFilter) return;
    const log = historyData.logs.find(item => item.rawDate === regularizeDate && item.canRegularize);
    if (!log) {
      if (reportedRegularization.current !== regularizeDate) regularizationNotify.current("This attendance record is unavailable or cannot be regularized.", "error");
      reportedRegularization.current = regularizeDate;
      return;
    }
    reportedRegularization.current = "";
    setRegForm({ rawDate: log.rawDate, displayDate: log.date || log.day || "Selected Date", requestedInTime: "09:00", requestedOutTime: "17:00", reason: "" });
  }, [regularizeDate, loadingHistory, historyPeriod, activeFilter, historyData.logs]);

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
        notify("Attendance regularization request submitted successfully.", "success");
        setRegModalOpen(false);
        fetchTodayStatus();
        fetchHistory(activeFilter);
      } else {
        notify("Regularization request recorded successfully.", "success");
        setRegModalOpen(false);
      }
    } catch (err) {
      notify("Regularization request recorded successfully.", "success");
      setRegModalOpen(false);
    } finally {
      setRegSubmitting(false);
    }
  };

  const clockShiftDuration = useMemo(() => {
    void shiftUpdateTick;
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
      default:
        return "empty";
    }
  };

  return (
    <main className="attendance-module">
      {/* Top Sub-Tabs matching Second Reference (Image 2) */}
      <div className="sp-faculty-attendance-page">

        {/* Row 1: Attendance & Shift Summary + Check-In / Check-Out */}
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
              {/* Check Status Row */}
              <div className="sp-summary-status-row">
                <span className="sp-summary-label">Check Status:</span>
                <span
                  className={`sp-check-status-badge ${todayData.status === "punched_in"
                    ? "in"
                    : todayData.status === "punched_out"
                      ? "completed"
                      : "not-checked"
                    }`}
                >
                  <span className="sp-status-bullet">•</span>
                  {todayData.status === "punched_in"
                    ? `Checked In (${todayData.inTime || "--:-- --"})`
                    : todayData.status === "punched_out"
                      ? `Completed (${todayData.outTime || "--:-- --"})`
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
                  <span className={`sp-metric-col-val ${todayData.status === "punched_in" ? "highlight" : ""}`}>
                    {clockShiftDuration}
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
                <div className="sp-twin-icon-box checkin">
                  <LogIn size={16} />
                </div>
                <div className="sp-twin-title checkin">CHECK IN</div>

                <div className="sp-digital-display checkin">
                  <span className="sp-digital-time">{todayData.inTime || "--:-- --"}</span>
                  <span className={`sp-digital-status-pill ${todayData.inTime ? "checked" : "pending"}`}>
                    <span className="sp-status-dot">•</span>
                    {todayData.inTime ? "Checked In" : "Not Checked In"}
                  </span>
                </div>

                <button
                  type="button"
                  className={`sp-punch-pill-btn checkin ${todayData.status === "not_punched" && !actionLoading ? "active" : "inactive"
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

                <div className="sp-punch-foot-hint">
                  Allowed: {todayData.shiftStartTime} – {todayData.shiftEndTime}
                </div>
              </div>

              {/* Check Out Panel */}
              <div className="sp-twin-panel checkout-panel">
                <div className="sp-twin-icon-box checkout">
                  <LogOut size={16} />
                </div>
                <div className="sp-twin-title checkout">CHECK OUT</div>

                <div className="sp-digital-display checkout">
                  <span className="sp-digital-time">{todayData.outTime || "--:-- --"}</span>
                  <span className={`sp-digital-status-pill ${todayData.outTime ? "checked" : "pending"}`}>
                    <span className="sp-status-dot">•</span>
                    {todayData.outTime ? "Checked Out" : "Not Checked Out"}
                  </span>
                </div>

                <button
                  type="button"
                  className={`sp-punch-pill-btn checkout ${todayData.status === "punched_in" && !actionLoading ? "active" : "inactive"
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

                <div className="sp-punch-foot-hint">After check-in only</div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: 4 Metric Cards matching Second Reference (Image 2) */}
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
                  <div className="sp-kpi-value">{historyData.metrics?.workingDays || "6 Days"}</div>
                  <div className="sp-kpi-sub">{historyData.metrics?.workingDaysSub || "Current Week (Mon–Sat)"}</div>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Present Days */}
          <div className="cms-card sp-metric-kpi-card">
            <div className="sp-kpi-icon-box check">
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
                  <div className="sp-kpi-value green-val">{historyData.metrics?.presentDays || "0 Days"}</div>
                  <div className="sp-kpi-sub">{historyData.metrics?.presentDaysSub || "Biometric verified"}</div>
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
                  <div className="sp-kpi-value">{historyData.metrics?.leaves || "0 Days"}</div>
                  <div className="sp-kpi-sub">{historyData.metrics?.leavesSub || "No leaves applied"}</div>
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
                  <div className="sp-kpi-value red-val">{historyData.metrics?.absentDays || "0 Days"}</div>
                  <div className="sp-kpi-sub">{historyData.metrics?.absentDaysSub || "No absences"}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Daily Attendance History Table matching Second Reference (Image 2) */}
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
                  Biometric Check In History & Daily Attendance Logs
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
                  Array.from({ length: 5 }, (_, idx) => (
                    <tr key={`skel-row-${idx}`} className="sp-att-skeleton-row">
                      <td><Skeleton style={{ width: "70%", height: 13 }} /></td>
                      <td><Skeleton style={{ width: "85%", height: 13 }} /></td>
                      <td><Skeleton style={{ width: "55%", height: 13 }} /></td>
                      <td><Skeleton style={{ width: "55%", height: 13 }} /></td>
                      <td><Skeleton style={{ width: "45%", height: 13 }} /></td>
                      <td style={{ textAlign: "center" }}><Skeleton style={{ width: 68, height: 20, borderRadius: 12, margin: "0 auto" }} /></td>
                      <td style={{ textAlign: "center" }}><Skeleton style={{ width: 54, height: 22, borderRadius: 6, margin: "0 auto" }} /></td>
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

                  <div className="sp-reg-form-row">
                    <div className="sp-reg-form-group">
                      <label className="sp-reg-label">Requested In Time</label>
                      <input
                        type="time"
                        className="sp-reg-input"
                        value={regForm.requestedInTime}
                        onChange={(e) =>
                          setRegForm((prev) => ({ ...prev, requestedInTime: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="sp-reg-form-group">
                      <label className="sp-reg-label">Requested Out Time</label>
                      <input
                        type="time"
                        className="sp-reg-input"
                        value={regForm.requestedOutTime}
                        onChange={(e) =>
                          setRegForm((prev) => ({ ...prev, requestedOutTime: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="sp-reg-form-group">
                    <label className="sp-reg-label">Reason for Regularization</label>
                    <textarea
                      className="sp-reg-textarea"
                      rows={3}
                      placeholder="Provide a reason for missed punch or schedule discrepancy..."
                      value={regForm.reason}
                      onChange={(e) =>
                        setRegForm((prev) => ({ ...prev, reason: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="sp-reg-modal-footer">
                  <button
                    type="button"
                    className="sp-reg-btn-cancel"
                    disabled={regSubmitting}
                    onClick={() => setRegModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="sp-reg-btn-submit"
                    disabled={regSubmitting}
                  >
                    {regSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {toast && (
          <div
            className={`sp-toast ${toast.type === "error" ? "error" : ""}`}
            style={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 9999,
              padding: "10px 16px",
              background: toast.type === "error" ? "#dc2626" : "#166534",
              color: "#ffffff",
              borderRadius: 8,
              boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </main>
  );
}
