import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, LogOut, CheckCircle2, Briefcase, Award } from "lucide-react";
import { attendanceToday, attendanceHistory, punchAttendance, regularizeAttendance, attendanceRecords, punchTime, punchHours, getDriverStaffId } from "../data/driverAttendanceApi.js";
import { getApiErrorMessage } from "../../../api/apiClient.js";
import "./DriverAttendancePage.css";

const dateKey = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
const displayDate = (date) => date.toLocaleDateString("en-GB");
const displayTime = punchTime;
const duration = punchHours;
const filters = [
  { id: "week", label: "Week", title: "This Week" },
  { id: "last-week", label: "Last Week", title: "Last Week" },
  { id: "month", label: "Month", title: "This Month" },
  { id: "last-month", label: "Last Month", title: "Last Month" },
];

export default function DriverAttendancePage() {
  const [records, setRecords] = useState({});
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState({});
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState("week");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [regularizationOpen, setRegularizationOpen] = useState(false);
  const [request, setRequest] = useState({ attendanceDate: "", requestedInTime: "", requestedOutTime: "", reason: "" });
  const today = dateKey(now);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let count = 7;
  if (filter === "week" || filter === "last-week") {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7 - (filter === "last-week" ? 7 : 0));
  } else {
    start.setDate(1);
    if (filter === "last-month") start.setMonth(start.getMonth() - 1);
    count = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  }
  const days = Array.from({ length: count }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));

  const fromDate = dateKey(days[0]);
  const toDate = dateKey(days[days.length - 1]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        getDriverStaffId();
        const [metrics, history, current] = await Promise.all([
          attendanceToday(controller.signal),
          attendanceHistory(fromDate, toDate, controller.signal),
          attendanceHistory(today, today, controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setSummary(metrics);
          setRecords(attendanceRecords(history.punches));
          setTodayRecord(attendanceRecords(current.punches)[today] || null);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(getApiErrorMessage(failure));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [fromDate, toDate, today, revision]);

  useEffect(() => {
    if (!regularizationOpen) return;
    const trigger = document.activeElement;
    dialogRef.current?.querySelector("input")?.focus();
    const keydown = (event) => {
      if (event.key === "Escape" && !busy) setRegularizationOpen(false);
      if (event.key === "Tab") {
        const elements = dialogRef.current?.querySelectorAll("input, textarea, button:not(:disabled)");
        const first = elements?.[0], last = elements?.[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); trigger?.focus(); };
  }, [regularizationOpen, busy]);

  const markAttendance = async (action) => {
    if (busy || loading) return;
    setBusy(true); setActionError(""); setMessage("");
    try {
      getDriverStaffId();
      if (!navigator.geolocation) throw new Error("Location is unavailable in this browser. Attendance requires your location.");
      const location = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error("Allow location access to record attendance, then try again.")), { timeout: 15000, maximumAge: 0 }));
      const result = await punchAttendance(action === "checkIn" ? "check-in" : "check-out", { lat: location.coords.latitude, lng: location.coords.longitude });
      setMessage(typeof result === "string" ? result : "Attendance recorded successfully.");
      setLoading(true); setRevision((value) => value + 1);
    } catch (failure) { setActionError(getApiErrorMessage(failure)); setLoading(true); setRevision((value) => value + 1); }
    finally { setBusy(false); }
  };
  const submitRegularization = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!request.reason.trim() || (!request.requestedInTime && !request.requestedOutTime)) { setActionError("Enter a reason and at least one corrected punch time."); return; }
    if (request.requestedInTime && request.requestedOutTime && request.requestedOutTime <= request.requestedInTime) { setActionError("Requested punch-out must be later than punch-in."); return; }
    setBusy(true); setActionError("");
    try {
      const result = await regularizeAttendance({ attendanceDate: request.attendanceDate + "T00:00:00Z", requestedInTime: request.requestedInTime ? request.requestedInTime + ":00" : null, requestedOutTime: request.requestedOutTime ? request.requestedOutTime + ":00" : null, reason: request.reason.trim() });
      setMessage(typeof result === "string" ? result : "Regularization requested successfully.");
      setRegularizationOpen(false); setRevision((value) => value + 1);
    } catch (failure) { setActionError(getApiErrorMessage(failure)); }
    finally { setBusy(false); }
  };

  const presentDays = summary.presentDays;
  const checkedIn = !!todayRecord?.checkIn && !todayRecord?.checkOut;
  const periodLabel = filters.find((item) => item.id === filter).title;
  const punchStatus = todayRecord?.checkOut ? "Checked Out" : checkedIn ? "Checked In" : "Not Punched In";

  return (
    <div className="dp-page dp-attendance">
      <div className="dp-page-header">
        <div><h1 className="dp-page-title">My Attendance &amp; Punch</h1><p className="dp-page-subtitle">Daily check-in, punch times, shift logs &amp; attendance history.</p></div>
        <button type="button" className="dp-btn dp-btn-primary" disabled={busy} onClick={() => { setActionError(""); setRequest({ attendanceDate: today, requestedInTime: "", requestedOutTime: "", reason: "" }); setRegularizationOpen(true); }}><Clock size={18} /> Request Attendance Regularization</button>
      </div>
      <div className="dp-attendance-punch-grid">
        <section className="dp-attendance-panel dp-attendance-clock-card" aria-label="Attendance clock">
          <span className="dp-attendance-clock-label">CAMPUS ATTENDANCE CLOCK</span>
          <div className="dp-attendance-live-clock">{now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</div>
          <p className="dp-attendance-long-date">{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          <div className="dp-attendance-clock-details">
            <div><span>Punch Status:</span><strong className={checkedIn ? "dp-attendance-pill is-active" : "dp-attendance-pill"}>{punchStatus}{todayRecord?.checkIn && ` (${displayTime(todayRecord.checkOut || todayRecord.checkIn)})`}</strong></div>
            <div><span>Shift Timings:</span><strong>{todayRecord?.shift || "Not available"}</strong></div>
            <div><span>Hours Worked:</span><strong>{duration(todayRecord, now)}</strong></div>
          </div>
        </section>
        <section className="dp-attendance-panel dp-attendance-action-card" aria-labelledby="driver-mark-attendance">
          <h2 id="driver-mark-attendance">Punch Terminal Action</h2>
          <p className="dp-attendance-description">Click below to record your entry or exit timestamp.</p>
          <div className="dp-attendance-current-status">
            <span>Current Punch Status</span>
            <strong className={checkedIn ? "is-active" : ""}>{checkedIn ? `Active — Punched In at ${displayTime(todayRecord.checkIn)}` : todayRecord?.checkOut ? `Completed — Punched Out at ${displayTime(todayRecord.checkOut)}` : "Inactive — Not Punched In"}</strong>
            <small>Terminal: <b>Driver Portal (Manual Punch)</b></small>
          </div>
          <p className="dp-attendance-feedback" role="status">{message || "Punch records refresh automatically from the server."}</p>
          {(error || actionError) && <p className="dp-attendance-error" role="alert">{error || actionError}</p>}
          <div className="dp-attendance-actions">
            <button type="button" className="dp-btn dp-btn-primary" disabled={busy || loading || !!error || !!todayRecord?.checkIn} onClick={() => markAttendance("checkIn")}><Clock size={19} /> Punch In (Check-In)</button>
            <button type="button" className="dp-btn dp-attendance-checkout" disabled={busy || loading || !!error || !todayRecord?.checkIn || !!todayRecord?.checkOut} onClick={() => markAttendance("checkOut")}><LogOut size={19} /> Punch Out (Check-Out)</button>
          </div>
        </section>
      </div>
      <div className="dp-attendance-summary">
        <div className="dp-attendance-summary-card"><span className="dp-attendance-summary-icon"><CalendarDays size={27} /></span><div><span>Working Days</span><strong>{summary.workingDays ?? "--"} Days</strong><small>Today?s summary</small></div></div>
        <div className="dp-attendance-summary-card"><span className="dp-attendance-summary-icon is-green"><CheckCircle2 size={27} /></span><div><span>Present Days</span><strong className="is-active">{presentDays ?? "--"} {presentDays === 1 ? "Day" : "Days"}</strong><small>Today?s summary</small></div></div>
        <div className="dp-attendance-summary-card"><span className="dp-attendance-summary-icon is-purple"><Briefcase size={27} /></span><div><span>Approved Leaves</span><strong>{summary.approvedLeaves ?? "--"} Days</strong><small>Approved leave summary</small></div></div>
        <div className="dp-attendance-summary-card"><span className="dp-attendance-summary-icon is-green"><Award size={27} /></span><div><span>Punctuality Rate</span><strong>{summary.punctualityRate != null ? summary.punctualityRate + "%" : "--"}</strong><small>Today?s summary</small></div></div>
      </div>
      <section className="dp-attendance-panel dp-attendance-history" aria-labelledby="driver-attendance-history">
        <div className="dp-attendance-history-header">
          <div className="dp-attendance-history-title"><span className="dp-attendance-history-icon"><CalendarDays size={24} /></span><div><h2 id="driver-attendance-history">{periodLabel}</h2><p>Punch History &amp; Daily Attendance Logs</p></div></div>
          <div className="dp-attendance-filters" role="group" aria-label="Attendance period">
            {filters.map((item) => <button type="button" key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? "is-active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
          </div>
        </div>
        <div className="dp-attendance-table-wrap">
          <table className="dp-attendance-table">
            <thead><tr>{["DAY", "SHIFT", "PUNCH IN", "PUNCH OUT", "HOURS", "DEVICE / SOURCE", "STATUS", "REGULARIZATION"].map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead>
            <tbody>{days.map((date) => {
              const key = dateKey(date);
              const record = records[key];
              return <tr key={key} className={key === today ? "is-today" : ""}><td><strong>{date.toLocaleDateString("en-GB", { weekday: "short" })}</strong><small>{displayDate(date)}</small></td><td className="dp-attendance-muted">{record?.shift || "--"}</td><td className="dp-attendance-in-time">{displayTime(record?.checkIn)}</td><td>{displayTime(record?.checkOut)}</td><td>{duration(record, now)}{key === today && record?.checkIn && !record?.checkOut && <small>(Active)</small>}</td><td className="dp-attendance-muted">{record?.source || "--"}</td><td><span className={`dp-attendance-status ${record?.checkIn ? "is-present" : "is-empty"}`}>{record?.status || "--"}</span></td><td className="dp-attendance-muted">{record?.regularizationStatus || "--"}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p className="dp-attendance-storage-note">{loading ? "Loading attendance records..." : "Attendance punches and hours are retrieved from the server."}</p>
      </section>
      {regularizationOpen && <div className="dp-modal-backdrop"><div ref={dialogRef} className="dp-modal-card dp-attendance-regularization" role="dialog" aria-modal="true" aria-labelledby="driver-regularization-title"><form onSubmit={submitRegularization}>
        <h2 id="driver-regularization-title">Request Attendance Regularization</h2>
        <label>Attendance Date<input autoFocus required type="date" max={today} value={request.attendanceDate} onChange={(event) => setRequest({ ...request, attendanceDate: event.target.value })} /></label>
        <label>Requested Punch In<input type="time" value={request.requestedInTime} onChange={(event) => setRequest({ ...request, requestedInTime: event.target.value })} /></label>
        <label>Requested Punch Out<input type="time" value={request.requestedOutTime} onChange={(event) => setRequest({ ...request, requestedOutTime: event.target.value })} /></label>
        <label>Reason<textarea required maxLength={2000} rows={3} value={request.reason} onChange={(event) => setRequest({ ...request, reason: event.target.value })} /></label>
        {actionError && <p role="alert" className="dp-attendance-error">{actionError}</p>}
        <div className="dp-attendance-actions"><button type="button" className="dp-btn dp-btn-outline" disabled={busy} onClick={() => setRegularizationOpen(false)}>Cancel</button><button className="dp-btn dp-btn-primary" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit Request"}</button></div>
      </form></div></div>}
    </div>
  );
}