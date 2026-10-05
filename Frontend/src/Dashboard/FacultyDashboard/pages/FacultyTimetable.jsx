import React, { useState } from "react";
import { X } from "lucide-react";
import "../styles/FacultyTimetable.css";
import { facultyMockData, MOCK_TT_DAYS } from "../data/facultyMockData.js";
import { useFacultySafe } from "../FacultyContext.jsx";

export default function FacultyTimetable() {
  const [timetable] = useState(facultyMockData.timetable);
  const [selectedClassSlot, setSelectedClassSlot] = useState(null);
  const context = useFacultySafe();
  const profileData = context?.profileData || facultyMockData.user;

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>My Timetable</h1>
          <p>Click on any period slot to view class syllabus, enrolled students, and attendance.</p>
        </div>
      </div>

      <div className="cms-card">
        <div className="cms-table-wrap">
          <table className="sp-tt-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                {MOCK_TT_DAYS.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timetable.map((slot, i) => (
                <tr key={i}>
                  <td className="time-col">{slot.time}</td>
                  {MOCK_TT_DAYS.map((d) => {
                    const item = slot[d];
                    return (
                      <td key={d}>
                        {item ? (
                          <div
                            className="sp-tt-cell"
                            onClick={() => setSelectedClassSlot({ ...item, day: d, time: slot.time })}
                          >
                            <strong>{item.sub}</strong>
                            <span>{item.cls}</span>
                            <span style={{ display: "block", fontSize: 10, color: "var(--cms-muted)" }}>
                              {item.room}
                            </span>
                          </div>
                        ) : (
                          <div className="sp-tt-free">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Details Centered Modal Dialog */}
      {selectedClassSlot && (
        <div className="cms-overlay" onClick={() => setSelectedClassSlot(null)}>
          <div className="cms-modal sp-class-modal-card" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Class & Venue Allocation</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                  {selectedClassSlot.day} · {selectedClassSlot.time}
                </span>
              </div>
              <button className="cms-icon-btn" onClick={() => setSelectedClassSlot(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cms-modal-body" style={{ padding: 22 }}>
              <div
                style={{
                  background: "var(--cms-primary-soft)",
                  padding: "16px 18px",
                  borderRadius: 12,
                  marginBottom: 18,
                  border: "1px solid var(--cms-primary-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="cms-badge cms-badge-info" style={{ fontWeight: 800 }}>
                    {selectedClassSlot.code}
                  </span>
                  <span className="cms-badge cms-badge-active">
                    {selectedClassSlot.group} — {selectedClassSlot.cls}
                  </span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--cms-primary-dark)", marginTop: 8 }}>
                  {selectedClassSlot.sub}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--cms-text-secondary)", marginTop: 4 }}>
                  Intermediate / +2 Junior College · Scheduled Lecture
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 10,
                    background: "var(--cms-surface)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Classroom / Venue</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>📍 {selectedClassSlot.room}</div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 10,
                    background: "var(--cms-surface)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Floor Location</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>
                    🏢 {selectedClassSlot.floor || "2nd Floor"}
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 10,
                    background: "var(--cms-surface)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Block / Building</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>
                    🏛️ {selectedClassSlot.block || "Main Academic Block"}
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 10,
                    background: "var(--cms-surface)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Academic Group</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>
                    📚 {selectedClassSlot.group || "MPC"}
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 10,
                    background: "var(--cms-surface)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Faculty In-Charge</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>
                    👤 {profileData.fullName} ({profileData.employeeId})
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    border: "1px solid var(--cms-border)",
                    borderRadius: 10,
                    background: "var(--cms-surface)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--cms-muted)" }}>Room Setup & Capacity</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 3 }}>🪑 Lecture Hall (60 Seater)</div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="cms-btn cms-btn-ghost"
                  style={{ minWidth: 100, justifyContent: "center" }}
                  onClick={() => setSelectedClassSlot(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
