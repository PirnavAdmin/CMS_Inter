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
    <div className="faculty-tt-container">
      <div className="cms-page-head faculty-tt-head">
        <div>
          <h1>My Timetable</h1>
          <p>Click on any period slot to view class syllabus, enrolled students, and attendance.</p>
        </div>
      </div>

      <div className="cms-card faculty-tt-card">
        <div className="cms-table-wrap faculty-tt-wrap">
          <table className="sp-tt-table faculty-tt-table">
            <thead>
              <tr>
                <th className="faculty-tt-th-time">Time Slot</th>
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
                            title={`${item.sub} · ${item.cls} · ${item.room}`}
                          >
                            <strong className="sp-tt-sub">{item.sub}</strong>
                            <span className="sp-tt-cls">{item.cls}</span>
                            <span className="sp-tt-room">{item.room}</span>
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Class & Venue Allocation</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                  {selectedClassSlot.day} · {selectedClassSlot.time}
                </span>
              </div>
              <button className="cms-icon-btn" onClick={() => setSelectedClassSlot(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cms-modal-body" style={{ padding: 20 }}>
              <div className="faculty-tt-modal-banner">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="cms-badge cms-badge-info" style={{ fontWeight: 800 }}>
                    {selectedClassSlot.code}
                  </span>
                  <span className="cms-badge cms-badge-active">
                    {selectedClassSlot.group} — {selectedClassSlot.cls}
                  </span>
                </div>
                <div className="faculty-tt-modal-banner-title">
                  {selectedClassSlot.sub}
                </div>
                <div className="faculty-tt-modal-banner-desc">
                  Intermediate / +2 Junior College · Scheduled Lecture
                </div>
              </div>

              <div className="faculty-tt-modal-grid">
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Classroom / Venue</div>
                  <div className="faculty-tt-modal-field-val">📍 {selectedClassSlot.room}</div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Floor Location</div>
                  <div className="faculty-tt-modal-field-val">
                    🏢 {selectedClassSlot.floor || "2nd Floor"}
                  </div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Block / Building</div>
                  <div className="faculty-tt-modal-field-val">
                    🏛️ {selectedClassSlot.block || "Main Academic Block"}
                  </div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Academic Group</div>
                  <div className="faculty-tt-modal-field-val">
                    📚 {selectedClassSlot.group || "MPC"}
                  </div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Faculty In-Charge</div>
                  <div className="faculty-tt-modal-field-val">
                    👤 {profileData.fullName} ({profileData.employeeId})
                  </div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Room Setup & Capacity</div>
                  <div className="faculty-tt-modal-field-val">🪑 Lecture Hall (60 Seater)</div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="cms-btn cms-btn-ghost"
                  style={{ minWidth: 90, justifyContent: "center" }}
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
