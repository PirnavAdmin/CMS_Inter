import { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  Printer,
  Users,
  GraduationCap,
  Clock,
  BookOpen,
  MapPin,
  CheckCircle2,
  Filter,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useParentPortal } from "../parentData.js";
import "@/components/pages/TimetablePage.css";
import "../ParentDashboard.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_KEYS = {
  Monday: "mon",
  Tuesday: "tue",
  Wednesday: "wed",
  Thursday: "thu",
  Friday: "fri",
  Saturday: "sat",
  Sunday: "sun",
};

const resolveFaculty = (subjectName, child) => {
  const s = String(subjectName || "").toLowerCase();
  if (s.includes("math")) return "Dr. Anitha Rao";
  if (s.includes("phys")) return "Mr. Suresh Kumar";
  if (s.includes("chem")) return "Mrs. Lakshmi Devi";
  if (s.includes("botan") || s.includes("zool") || s.includes("biol")) return "Dr. Karthik Nair";
  if (s.includes("eng")) return "Ms. Priya Sharma";
  if (s.includes("comp") || s.includes("csc") || s.includes("python")) return "Mr. Ravi Teja";
  return child?.mentor || "Faculty In-Charge";
};

const getSlotForDay = (col, dayName, child) => {
  const dayKey = DAY_KEYS[dayName] || dayName.toLowerCase().slice(0, 3);
  const cellVal = col[dayKey];
  if (!cellVal || cellVal === "—") return null;

  if (typeof cellVal === "object" && cellVal.subject) {
    return {
      subject: cellVal.subject,
      room: cellVal.room || (child?.group === "BiPC" ? "Room 104" : "Room 203"),
      faculty: cellVal.faculty || resolveFaculty(cellVal.subject, child),
    };
  }

  const str = String(cellVal).trim();
  const match = str.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const subject = match[1].trim();
    const room = match[2].trim();
    const faculty = resolveFaculty(subject, child);
    return { subject, room, faculty };
  }

  return {
    subject: str,
    room: child?.group === "BiPC" ? "Room 104" : "Room 203",
    faculty: resolveFaculty(str, child),
  };
};

export default function ParentTimetablePage() {
  const {
    availableChildren,
    activeChildId,
    setActiveChildId,
    child,
    childTimetable,
    currentAcademicYear,
    loading,
  } = useParentPortal();

  const [selectedDay, setSelectedDay] = useState("all");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slotPopupStyle, setSlotPopupStyle] = useState({});

  const schedule = childTimetable || [];

  const handleSelectChild = (id) => {
    setActiveChildId(id);
    setSelectedSlot(null);
  };

  const periodColumns = useMemo(() => {
    if (!Array.isArray(schedule) || schedule.length === 0) return [];
    return schedule.map((row, idx) => ({
      id: `period-${idx}`,
      period: row.period || `Period ${idx + 1}`,
      time: row.time || "",
      isBreak: Boolean(row.isBreak),
      mon: row.mon,
      tue: row.tue,
      wed: row.wed,
      thu: row.thu,
      fri: row.fri,
      sat: row.sat,
    }));
  }, [schedule]);

  const daysToRender = useMemo(() => {
    if (selectedDay === "all") return DAYS;
    return DAYS.filter((d) => d.toLowerCase() === selectedDay.toLowerCase());
  }, [selectedDay]);

  const currentDayName = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  }, []);

  const handleSlotClick = (e, slot, col, dayName) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 210;
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    const top = rect.bottom + 6 > window.innerHeight - 150 ? Math.max(16, rect.top - 120) : rect.bottom + 6;
    setSlotPopupStyle({
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 1001,
    });
    setSelectedSlot({
      ...slot,
      period: col.period,
      time: col.time,
      day: dayName,
    });
  };

  // Close slot details on outside click or escape
  useEffect(() => {
    if (!selectedSlot) return undefined;
    const handleOutside = (e) => {
      if (e.target.closest(".ttm-published-slot-details, .ttm-published-slot")) return;
      setSelectedSlot(null);
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedSlot(null);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedSlot]);

  if ((loading && availableChildren.length === 0) || !child) {
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
      subtitle={`Weekly Class Schedule • ${child.name} • ${child.programme || child.group} (${child.section}) • Academic Year ${currentAcademicYear}`}
      breadcrumb={["Parent Portal", "Timetable"]}
      actions={
        <button
          type="button"
          className="cms-btn cms-btn-outline cms-btn-sm"
          onClick={() => window.print()}
          title="Print Weekly Timetable"
        >
          <Printer size={14} /> Print Timetable
        </button>
      }
    >
      <div className="parent-dashboard-wrapper">
        {/* Child Switcher Banner - Supports 1, 2, or multiple children */}
        <div className="parent-child-banner">
          <div className="parent-child-meta">
            <img src={child.avatar} alt={child.name} className="parent-child-avatar" />
            <div className="parent-child-title">
              <h2>
                {child.name} ({child.group})
              </h2>
              <p>
                Section {child.section} Schedule • Classroom: {child.group === "BiPC" ? "Room 104" : "Room 203"} • Class Teacher: {child.mentor}
              </p>
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
                <GraduationCap size={15} /> {c.name} ({c.group || c.className || "Class"})
              </button>
            ))}
          </div>
        </div>

        {/* Admin Timetable Layout & Styles */}
        <div className="timetable-module">
          <section className="ttm-card">
            {/* Header Toolbar matching Admin Timetable */}
            <div className="ttm-grid-head">
              <div className="ttm-grid-title">
                <div className="ttm-toolbar-heading">
                  <i>
                    <CalendarDays size={20} aria-hidden="true" />
                  </i>
                  <div>
                    <b>Weekly Class Timetable</b>
                    <span>
                      Published schedule for {child.name} • Section {child.section} • {child.programme || child.group}
                    </span>
                  </div>
                </div>
                <div className="ttm-toolbar-workflow-actions">
                  <label className="ttm-inline-filter">
                    <span>Day Filter</span>
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      aria-label="Filter timetable by day"
                    >
                      <option value="all">All Working Days (Mon – Sat)</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="ttm-badge active">Published</span>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} aria-hidden="true" /> Print
                  </button>
                </div>
              </div>
            </div>

            {/* Timetable Table Grid */}
            <div className="ttm-grid-wrap">
              <table className="ttm-grid">
                <thead>
                  <tr>
                    <th>Day</th>
                    {periodColumns.map((col) => (
                      <th key={col.id}>
                        {col.period}
                        {col.time ? <small>{col.time}</small> : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodColumns.length > 0 ? (
                    daysToRender.map((dayName) => {
                      const isToday = dayName === currentDayName;
                      return (
                        <tr key={dayName} className={isToday ? "is-today" : ""}>
                          <th>
                            {dayName}
                            {isToday ? (
                              <small
                                style={{
                                  display: "block",
                                  marginTop: 3,
                                  color: "var(--cms-primary)",
                                  fontWeight: 700,
                                }}
                              >
                                Today
                              </small>
                            ) : null}
                          </th>
                          {periodColumns.map((col) => {
                            if (col.isBreak) {
                              return (
                                <td className="break" key={col.id}>
                                  {col.period === "Lunch" ? "Lunch Break" : "Short Break"}
                                </td>
                              );
                            }

                            const slot = getSlotForDay(col, dayName, child);

                            if (!slot || !slot.subject) {
                              return (
                                <td className="slot" key={col.id}>
                                  <button
                                    className="ttm-published-slot"
                                    disabled
                                    type="button"
                                    aria-label="No class scheduled"
                                  >
                                    <span className="ttm-empty-slot">—</span>
                                  </button>
                                </td>
                              );
                            }

                            return (
                              <td className="slot" key={col.id}>
                                <button
                                  className="ttm-published-slot"
                                  type="button"
                                  onClick={(e) => handleSlotClick(e, slot, col, dayName)}
                                  title={`${slot.subject} • ${slot.faculty} (${slot.room})`}
                                >
                                  <b>{slot.subject}</b>
                                  <span>{slot.faculty}</span>
                                  <small>{slot.room}</small>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="9"
                        style={{
                          textAlign: "center",
                          padding: "48px 16px",
                          color: "var(--cms-muted)",
                        }}
                      >
                        <Clock
                          size={36}
                          style={{ margin: "0 auto 8px", opacity: 0.5, display: "block" }}
                        />
                        No timetable slots scheduled for Academic Year {currentAcademicYear}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Interactive Published Slot Details Tooltip */}
        {selectedSlot && (
          <aside
            className="ttm-published-slot-details"
            style={slotPopupStyle}
            aria-label="Timetable slot details"
          >
            <button
              type="button"
              className="ttm-published-slot-close"
              aria-label="Close slot details"
              onClick={() => setSelectedSlot(null)}
            >
              ×
            </button>
            <h3>{selectedSlot.subject}</h3>
            <p>
              <strong>Faculty:</strong> {selectedSlot.faculty}
            </p>
            <p>
              <strong>Classroom:</strong> {selectedSlot.room}
            </p>
            <p style={{ marginTop: 4, fontSize: 11.5, color: "var(--cms-muted)" }}>
              {selectedSlot.day} • {selectedSlot.period} {selectedSlot.time ? `(${selectedSlot.time})` : ""}
            </p>
          </aside>
        )}

        {/* Academic Schedule Highlights Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div className="parent-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                className="parent-stat-icon-wrap"
                style={{ width: 36, height: 36, background: "var(--cms-primary-soft)" }}
              >
                <Clock size={18} style={{ color: "var(--cms-primary)" }} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  College Timings
                </span>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750 }}>09:00 AM – 04:00 PM</h4>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--cms-muted)" }}>
              6 Teaching periods with Morning Short Break & Lunch Break
            </p>
          </div>

          <div className="parent-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                className="parent-stat-icon-wrap"
                style={{ width: 36, height: 36, background: "var(--cms-green-soft)" }}
              >
                <CheckCircle2 size={18} style={{ color: "var(--cms-green)" }} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Working Days
                </span>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750 }}>Monday to Saturday</h4>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--cms-muted)" }}>
              Sunday is weekly holiday. Special labs on Friday & Saturday.
            </p>
          </div>

          <div className="parent-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                className="parent-stat-icon-wrap"
                style={{ width: 36, height: 36, background: "#f5f3ff" }}
              >
                <MapPin size={18} style={{ color: "#7c3aed" }} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Assigned Classroom
                </span>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750 }}>
                  {child.group === "BiPC" ? "Room 104 (Bio Wing)" : "Room 203 (Main Block)"}
                </h4>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--cms-muted)" }}>
              Laboratories in Science Block (Labs 1, 2, and 3).
            </p>
          </div>

          <div className="parent-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                className="parent-stat-icon-wrap"
                style={{ width: 36, height: 36, background: "#ecfdf5" }}
              >
                <GraduationCap size={18} style={{ color: "#0f766e" }} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--cms-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                  Class Teacher
                </span>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 750 }}>{child.mentor}</h4>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--cms-muted)" }}>
              Contact: {child.mentorMobile || "+91 98480 12345"}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
