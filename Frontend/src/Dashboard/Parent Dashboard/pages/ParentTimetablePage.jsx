import { useState } from "react";
import { Clock, Printer, Users, Calendar, BookOpen } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal, timetableData } from "../parentData.js";
import "../ParentDashboard.css";

export default function ParentTimetablePage() {
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    dataKey,
    currentAcademicYear,
  } = useParentPortal();

  const isCurrentYear = currentAcademicYear === "2026-2027";
  const schedule = child ? (timetableData[dataKey] || (isCurrentYear ? timetableData[child.id] : [])) || [] : [];

  const handleSelectChild = (id) => {
    setActiveChildId(id);
  };

  if (availableChildren.length === 0 || !child) {
    return (
      <DashboardLayout
        title="Timetable"
        subtitle="Weekly Class Schedule"
        breadcrumb={["Parent Portal", "Timetable"]}
      >
        <div className="parent-dashboard-wrapper">
          <div className="parent-card" style={{ padding: 48, textAlign: "center" }}>
            <Users size={48} style={{ color: "var(--cms-muted)", margin: "0 auto 16px" }} />
            <h3>No Children Associated</h3>
            <p style={{ color: "var(--cms-muted)", fontSize: 14 }}>
              No enrolled student records were found linked to your parent account.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Timetable"
      subtitle={`Weekly Class Schedule • ${child.name} • ${child.programme} (${child.section}) • Academic Year ${currentAcademicYear}`}
      breadcrumb={["Parent Portal", "Timetable"]}
      actions={
        <button type="button" className="cms-btn cms-btn-outline cms-btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> Print Timetable
        </button>
      }
    >
      <div className="parent-dashboard-wrapper">
        {/* Child Switcher */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>{child.name} ({child.group})</h2>
              <p>Section {child.section} Schedule • Classroom: Room 203 • Class Teacher: {child.mentor}</p>
            </div>
          </div>
          <div className="parent-child-switch-buttons">
            {availableChildren.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`parent-child-switch-btn ${child.id === c.id ? "is-active" : ""}`}
                onClick={() => handleSelectChild(c.id)}
              >
                <Users size={14} /> {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="parent-card">
          <div className="parent-card-header">
            <h3 className="parent-card-title">
              <Clock size={18} /> Monday to Saturday Period Timings
            </h3>
            <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>College Hours: 09:00 AM – 04:00 PM</span>
          </div>
          <div className="parent-card-body" style={{ padding: 0 }}>
            <div className="parent-timetable-table-wrap" style={{ border: "none" }}>
              <table className="parent-timetable-table">
                <thead>
                  <tr>
                    <th>Period / Time</th>
                    <th>Monday</th>
                    <th>Tuesday</th>
                    <th>Wednesday</th>
                    <th>Thursday</th>
                    <th>Friday</th>
                    <th>Saturday</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.length > 0 ? (
                    schedule.map((row, idx) => (
                      <tr key={idx} className={row.isBreak ? "parent-break-row" : ""}>
                        <td style={{ background: "var(--cms-bg)", fontWeight: 700, whiteSpace: "nowrap" }}>
                          <div>{row.period}</div>
                          <div style={{ fontSize: 11.5, color: "var(--cms-muted)", fontWeight: 400 }}>{row.time}</div>
                        </td>
                        <td>{row.mon}</td>
                        <td>{row.tue}</td>
                        <td>{row.wed}</td>
                        <td>{row.thu}</td>
                        <td>{row.fri}</td>
                        <td>{row.sat}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "48px 16px", color: "var(--cms-muted)" }}>
                        <Calendar size={32} style={{ margin: "0 auto 8px", opacity: 0.5, display: "block" }} />
                        No timetable scheduled for Academic Year {currentAcademicYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
