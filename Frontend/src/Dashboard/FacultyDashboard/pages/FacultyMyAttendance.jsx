import React, { useState, useEffect } from "react";
import { Clock, LogOut, Calendar, CheckCircle2, Briefcase, Award, X, AlertCircle } from "lucide-react";
import "../styles/FacultyMyAttendance.css";

export default function FacultyMyAttendance() {
  const [liveClock, setLiveClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [punchState, setPunchState] = useState(() => {
    try {
      const saved = localStorage.getItem("staff_punch_state");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { isPunchedIn: true, inTime: "08:45 AM", outTime: null, hoursWorked: "4 hrs 32 mins" };
  });

  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePunchIn = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const next = { isPunchedIn: true, inTime: timeStr, outTime: null, hoursWorked: "Just punched in" };
    setPunchState(next);
    localStorage.setItem("staff_punch_state", JSON.stringify(next));
    notify(`Checked In Successfully at ${timeStr}`, "success");
  };

  const handlePunchOut = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const next = { ...punchState, isPunchedIn: false, outTime: timeStr };
    setPunchState(next);
    localStorage.setItem("staff_punch_state", JSON.stringify(next));
    notify(`Punched Out Successfully at ${timeStr}`, "success");
  };

  const [punchLogs] = useState([
    { id: 1, date: "21 Sep 2026", day: "Monday", shift: "Morning (08:30–16:30)", inTime: "08:45 AM", outTime: "--", hours: "4h 32m (Active)", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: 2, date: "20 Sep 2026", day: "Sunday", shift: "General", inTime: "--", outTime: "--", hours: "0h 00m", device: "--", status: "Holiday", canRegularize: false },
    { id: 3, date: "19 Sep 2026", day: "Saturday", shift: "Morning (08:30–16:30)", inTime: "08:35 AM", outTime: "04:32 PM", hours: "7h 57m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: 4, date: "18 Sep 2026", day: "Friday", shift: "Morning (08:30–16:30)", inTime: "08:55 AM", outTime: "04:30 PM", hours: "7h 35m", device: "Bio-Station 02 (Academic Block)", status: "Late", canRegularize: true },
    { id: 5, date: "17 Sep 2026", day: "Thursday", shift: "Morning (08:30–16:30)", inTime: "08:30 AM", outTime: "04:35 PM", hours: "8h 05m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: 6, date: "16 Sep 2026", day: "Wednesday", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 00m", device: "--", status: "Leave", canRegularize: false },
    { id: 7, date: "15 Sep 2026", day: "Tuesday", shift: "Morning (08:30–16:30)", inTime: "08:31 AM", outTime: "01:00 PM", hours: "4h 29m", device: "Bio-Station 01 (Main Gate)", status: "Half Day", canRegularize: true },
    { id: 8, date: "14 Sep 2026", day: "Monday", shift: "Morning (08:30–16:30)", inTime: "08:28 AM", outTime: "04:31 PM", hours: "8h 03m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
  ]);

  const [showRegularizeModal, setShowRegularizeModal] = useState(false);
  const [regularizeForm, setRegularizeForm] = useState({ date: "", reason: "Forgot Biometric Punch", inTime: "08:30 AM", outTime: "04:30 PM", notes: "" });

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>My Attendance & Biometric Punch</h1>
          <p>Daily biometric check-in, punch times, shift logs & monthly attendance calendar.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setShowRegularizeModal(true)}>
          <Clock size={14} /> Request Attendance Regularization
        </button>
      </div>

      {/* Punch In / Out Grid */}
      <div className="sp-attendance-punch-grid">
        {/* Live Digital Clock Card */}
        <div
          className="sp-live-clock-card"
          style={{
            background: "linear-gradient(135deg, #090d16 0%, #111827 100%)",
            color: "#ffffff",
            border: "1px solid #1f2937",
            boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
            padding: "24px 26px",
            borderRadius: 14,
          }}
        >
          <div>
            <span
              className="sp-live-badge"
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                fontWeight: 800,
              }}
            >
              CAMPUS BIOMETRIC CLOCK
            </span>
            <div
              className="sp-live-clock-time"
              style={{
                color: "#ffffff",
                fontSize: 40,
                fontWeight: 800,
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                margin: "12px 0 6px",
                fontFamily: "monospace",
              }}
            >
              {liveClock}
            </div>
            <div
              className="sp-live-clock-date"
              style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 600 }}
            >
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          <div
            className="sp-clock-status-box"
            style={{
              marginTop: 20,
              padding: "14px 16px",
              background: "rgba(255, 255, 255, 0.06)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="sp-clock-sublabel" style={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 600 }}>Punch Status:</span>
              <span className={`sp-punch-status-badge ${punchState.isPunchedIn ? "in" : "out"}`} style={{ fontWeight: 800 }}>
                ● {punchState.isPunchedIn ? `Checked In (${punchState.inTime})` : "Checked Out"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span className="sp-clock-sublabel" style={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 600 }}>Shift Timings:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>08:30 AM – 04:30 PM (Morning Shift)</span>
            </div>
          </div>
        </div>

        {/* Punch Actions Form Card */}
        <div className="sp-punch-form-card">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Punch Terminal Action</h3>
            <p style={{ fontSize: 12.5, color: "var(--cms-muted)", marginBottom: 16 }}>
              Click below to record your campus entry or exit timestamp. Instant biometric verification enabled.
            </p>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--cms-surface)", border: "1px solid var(--cms-border)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>Current Punch Status</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: punchState.isPunchedIn ? "var(--cms-green)" : "var(--cms-text)", marginTop: 4 }}>
                {punchState.isPunchedIn ? `Active — Punched In at ${punchState.inTime}` : "Inactive — Currently Punched Out"}
              </div>
              <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 4 }}>
                Terminal: <strong>Main Campus Gate 01 Bio-Station</strong>
              </div>
            </div>
          </div>

          <div className="sp-punch-actions-row">
            <button
              className="cms-btn cms-btn-primary"
              style={{ flex: 1, justifyContent: "center", padding: "13px 18px", fontSize: 14 }}
              disabled={punchState.isPunchedIn}
              onClick={handlePunchIn}
            >
              <Clock size={16} /> Punch In (Check-In)
            </button>
            <button
              className="cms-btn"
              style={{ flex: 1, justifyContent: "center", padding: "13px 18px", fontSize: 14, background: "#dc2626", color: "#fff" }}
              disabled={!punchState.isPunchedIn}
              onClick={handlePunchOut}
            >
              <LogOut size={16} /> Punch Out (Check-Out)
            </button>
          </div>
        </div>
      </div>

      {/* 4 Essential Monthly Attendance Metric Cards */}
      <div className="sp-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-blue"><Calendar size={22} /></div>
          <div>
            <div className="cms-stat-label">Working Days</div>
            <div className="cms-stat-value">24 Days</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Current Month</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><CheckCircle2 size={22} /></div>
          <div>
            <div className="cms-stat-label">Present Days</div>
            <div className="cms-stat-value" style={{ color: "var(--cms-green)" }}>22 Days</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Biometric verified</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-violet"><Briefcase size={22} /></div>
          <div>
            <div className="cms-stat-label">Approved Leaves</div>
            <div className="cms-stat-value">1 Day</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>1 CL applied</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><Award size={22} /></div>
          <div>
            <div className="cms-stat-label">Punctuality Rate</div>
            <div className="cms-stat-value" style={{ color: "var(--cms-green)" }}>95.8%</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>Target: &ge; 90%</div>
          </div>
        </div>
      </div>

      {/* Daily Punch History Table */}
      <div className="cms-card">
        <div className="cms-card-head">
          <div>
            <h2>Biometric Punch History & Daily Attendance Logs</h2>
            <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>
              Records recorded from Campus Bio-Terminals & Web Punch
            </div>
          </div>
          <span className="cms-badge cms-badge-active">Verified Records</span>
        </div>

        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Shift</th>
                <th>Punch In</th>
                <th>Punch Out</th>
                <th>Logged Hours</th>
                <th>Biometric Device</th>
                <th>Status</th>
                <th>Regularization</th>
              </tr>
            </thead>
            <tbody>
              {punchLogs.map((log) => (
                <tr key={log.id}>
                  <td className="cms-strong">{log.date}</td>
                  <td>{log.day}</td>
                  <td>{log.shift}</td>
                  <td><strong style={{ color: log.inTime !== "--" ? "var(--cms-green)" : "inherit" }}>{log.inTime}</strong></td>
                  <td><strong>{log.outTime}</strong></td>
                  <td>{log.hours}</td>
                  <td style={{ fontSize: 12, color: "var(--cms-muted)" }}>{log.device}</td>
                  <td>
                    <span className={`cms-badge ${
                      log.status === "Present" ? "cms-badge-active" :
                      log.status === "Late" || log.status === "Half Day" ? "cms-badge-warn" :
                      log.status === "Leave" ? "cms-badge-danger" : "cms-badge-inactive"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td>
                    {log.canRegularize ? (
                      <button
                        className="cms-btn cms-btn-ghost"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => {
                          setRegularizeForm((p) => ({ ...p, date: log.date }));
                          setShowRegularizeModal(true);
                        }}
                      >
                        Regularize
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Regularization Modal */}
      {showRegularizeModal && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setShowRegularizeModal(false)}>
          <div className="cms-modal sm faculty-regularization-modal">
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Request Attendance Regularization</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Submit adjustment for missed or late punch</span>
              </div>
              <button className="cms-icon-btn" onClick={() => setShowRegularizeModal(false)}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label>Date of Incident <span className="req">*</span></label>
                  <input
                    type="date"
                    value={regularizeForm.date || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, date: e.target.value })}
                  />
                </div>
                <div className="cms-field full">
                  <label>Reason for Regularization <span className="req">*</span></label>
                  <select
                    value={regularizeForm.reason}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, reason: e.target.value })}
                  >
                    <option>Forgot Biometric Punch</option>
                    <option>Biometric Scanner / Power Outage</option>
                    <option>On-Duty / Board Examination Duty</option>
                    <option>Official Campus Assignment</option>
                    <option>Emergency Late Arrival</option>
                  </select>
                </div>
                <div className="cms-field">
                  <label>Proposed Punch In</label>
                  <input
                    type="text"
                    value={regularizeForm.inTime}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, inTime: e.target.value })}
                  />
                </div>
                <div className="cms-field">
                  <label>Proposed Punch Out</label>
                  <input
                    type="text"
                    value={regularizeForm.outTime}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, outTime: e.target.value })}
                  />
                </div>
                <div className="cms-field full">
                  <label>Explanation & Notes <span className="req">*</span></label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state reason for attendance adjustment..."
                    value={regularizeForm.notes}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setShowRegularizeModal(false)}>Cancel</button>
              <button
                className="cms-btn cms-btn-primary"
                onClick={() => {
                  notify("Attendance Regularization request submitted to Principal office!");
                  setShowRegularizeModal(false);
                }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

