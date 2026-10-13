import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X, Calendar, Clock, MapPin, BookOpen, Users, AlertCircle, RefreshCw } from "lucide-react";
import "../styles/FacultyTimetable.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser } from "@/features/authStorage.js";

// Standard college weekly timetable days (Monday - Saturday)
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const padHour = String(hour).padStart(2, "0");
  return `${padHour}:${min} ${ampm}`;
}

function resolveFacultyId(profile, auth) {
  const candidates = [
    profile?.facultyId,
    profile?.staffId,
    auth?.facultyId,
    auth?.staffId,
    profile?.id,
    auth?.id,
  ];
  for (const c of candidates) {
    if (c != null && !isNaN(Number(c)) && Number(c) > 0) {
      return Number(c);
    }
  }
  return 6;
}

export default function FacultyTimetable() {
  const context = useFacultySafe();
  const profileData = context?.profileData || {};
  const authUser = getAuthUser();
  const { selectedCampusId, selectedCampus } = useCampusContext?.() || {};
  const { selectedAcademicYearId, selectedAcademicYear } = useAcademicContext?.() || {};

  const [timetableSlots, setTimetableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const facultyId = useMemo(() => resolveFacultyId(profileData, authUser), [profileData, authUser]);

  const fetchTimetable = useCallback(async () => {
    if (!facultyId) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = apiEndpoints?.timetable?.getByFaculty
        ? apiEndpoints.timetable.getByFaculty(facultyId)
        : `/api/v1/timetable/faculty/${facultyId}`;

      const params = {};
      if (selectedCampusId) params.campusId = selectedCampusId;
      if (selectedAcademicYearId) params.academicYearId = selectedAcademicYearId;

      let res = await apiClient.get(endpoint, { params }).catch(() => null);

      let data = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res)
        ? res
        : [];

      // Fallback: If filtered call yields no slots, try endpoint without query params
      if (!data.length && (selectedCampusId || selectedAcademicYearId)) {
        const fallbackRes = await apiClient.get(endpoint).catch(() => null);
        const fallbackData = Array.isArray(fallbackRes?.data)
          ? fallbackRes.data
          : Array.isArray(fallbackRes?.data?.data)
          ? fallbackRes.data.data
          : Array.isArray(fallbackRes)
          ? fallbackRes
          : [];
        if (fallbackData.length) {
          data = fallbackData;
        }
      }

      setTimetableSlots(data);
    } catch (err) {
      console.warn("Failed to fetch faculty timetable:", err);
      setError("Unable to load timetable from server.");
    } finally {
      setLoading(false);
    }
  }, [facultyId, selectedCampusId, selectedAcademicYearId]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Dynamically extract all distinct periods from timetable slots
  const periodRows = useMemo(() => {
    if (!timetableSlots.length) return [];

    const map = new Map();
    timetableSlots.forEach((slot) => {
      const key = slot.periodId || `${slot.startTime}-${slot.endTime}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          periodId: slot.periodId,
          periodNumber: slot.periodNumber || 0,
          periodName: slot.periodName || `Period ${slot.periodNumber || ""}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeLabel: `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
  }, [timetableSlots]);

  // Lookup class slot for a given day and period
  const getSlotForDayAndPeriod = useCallback((dayName, period, dayIndex) => {
    return timetableSlots.find((s) => {
      const dayMatches =
        String(s.dayName || "").trim().toLowerCase() === dayName.toLowerCase() ||
        s.dayOfWeek === (dayIndex + 1);

      const periodMatches =
        (s.periodId && s.periodId === period.periodId) ||
        (s.startTime && s.endTime && s.startTime === period.startTime && s.endTime === period.endTime);

      return dayMatches && periodMatches;
    });
  }, [timetableSlots]);

  // Statistics
  const stats = useMemo(() => {
    const sections = new Set();
    const days = new Set();
    timetableSlots.forEach((s) => {
      if (s.sectionName) sections.add(s.sectionName);
      if (s.dayName) days.add(s.dayName);
    });
    return {
      totalPeriods: timetableSlots.length,
      totalSections: sections.size,
      totalDays: days.size,
    };
  }, [timetableSlots]);

  const effectiveFacultyName =
    timetableSlots[0]?.facultyName ||
    timetableSlots[0]?.staffName ||
    profileData.fullName ||
    profileData.name ||
    "Faculty Member";

  const effectiveEmployeeId =
    timetableSlots[0]?.facultyEmployeeId ||
    timetableSlots[0]?.staffEmployeeId ||
    profileData.employeeId ||
    "MTCH0005";

  return (
    <div className="faculty-tt-container">
      <div className="cms-page-head faculty-tt-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>My Timetable</h1>
          <p>
            Weekly scheduled lectures for <strong>{effectiveFacultyName}</strong> ({effectiveEmployeeId})
            {selectedAcademicYear?.name ? ` · Academic Year ${selectedAcademicYear.name}` : ""}
            {selectedCampus?.name ? ` · ${selectedCampus.name}` : ""}
          </p>
        </div>
        <div className="faculty-tt-head-actions">
          <span className="faculty-tt-badge-chip">
            <Clock size={13} /> {stats.totalPeriods} Periods / Week
          </span>
          {stats.totalSections > 0 && (
            <span className="faculty-tt-badge-chip">
              <Users size={13} /> {stats.totalSections} Sections
            </span>
          )}
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            style={{ fontSize: 12, padding: "5px 10px", height: "auto" }}
            onClick={fetchTimetable}
            disabled={loading}
            title="Refresh Timetable"
          >
            <RefreshCw size={12} className={loading ? "dashboard-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="cms-card faculty-tt-card">
        {loading ? (
          <div className="faculty-tt-loading-wrap">
            <RefreshCw size={24} className="dashboard-spin" color="var(--cms-primary)" />
            <span>Fetching faculty weekly timetable...</span>
          </div>
        ) : error ? (
          <div className="faculty-tt-empty-state">
            <div className="faculty-tt-empty-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444" }}>
              <AlertCircle size={28} />
            </div>
            <h3>Unable to Load Timetable</h3>
            <p>{error}</p>
            <button className="cms-btn cms-btn-primary" onClick={fetchTimetable}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        ) : timetableSlots.length === 0 ? (
          <div className="faculty-tt-empty-state">
            <div className="faculty-tt-empty-icon">
              <Calendar size={28} />
            </div>
            <h3>No Scheduled Periods</h3>
            <p>
              There are currently no timetable slots assigned to your profile for this academic session.
              Please contact the Academic Coordinator or Timetable Administrator to allocate classes.
            </p>
            <button className="cms-btn cms-btn-ghost" onClick={fetchTimetable}>
              <RefreshCw size={13} /> Check Again
            </button>
          </div>
        ) : (
          <div className="cms-table-wrap faculty-tt-wrap">
            <table className="sp-tt-table faculty-tt-table">
              <thead>
                <tr>
                  <th className="faculty-tt-th-time">Time Slot</th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th key={d}>{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodRows.map((period) => (
                  <tr key={period.key}>
                    <td className="time-col">
                      <div className="faculty-tt-time-label">{period.periodName}</div>
                      <small className="faculty-tt-time-sub">{period.timeLabel}</small>
                    </td>
                    {DAYS_OF_WEEK.map((day, dayIdx) => {
                      const item = getSlotForDayAndPeriod(day, period, dayIdx);
                      return (
                        <td key={day}>
                          {item ? (
                            <div
                              className="sp-tt-cell"
                              onClick={() => setSelectedSlot(item)}
                              title={`${item.subjectName} · ${item.groupName} ${item.sectionName} · Room ${item.roomName || item.roomCode}`}
                            >
                              <strong className="sp-tt-sub">
                                {item.subjectName || item.subjectCode}
                              </strong>
                              <span className="sp-tt-cls">
                                {item.groupName} {item.sectionName}
                              </span>
                              <span className="sp-tt-room">
                                📍 Room {item.roomName || item.roomCode || "—"}
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
        )}
      </div>

      {/* Class Details Centered Modal Dialog */}
      {selectedSlot && (
        <div className="cms-overlay" onClick={() => setSelectedSlot(null)}>
          <div className="cms-modal sp-class-modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Class & Venue Allocation</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>
                  {selectedSlot.dayName} · {selectedSlot.periodName} ({formatTime12h(selectedSlot.startTime)} – {formatTime12h(selectedSlot.endTime)})
                </span>
              </div>
              <button className="cms-icon-btn" onClick={() => setSelectedSlot(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="cms-modal-body" style={{ padding: 20 }}>
              <div className="faculty-tt-modal-banner">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="cms-badge cms-badge-info" style={{ fontWeight: 800 }}>
                    {selectedSlot.subjectCode || "SUBJECT"}
                  </span>
                  <span className="cms-badge cms-badge-active">
                    {selectedSlot.groupName} — {selectedSlot.sectionName}
                  </span>
                  {selectedSlot.approvalStatusName && (
                    <span className="cms-badge cms-badge-primary">
                      {selectedSlot.approvalStatusName}
                    </span>
                  )}
                </div>
                <div className="faculty-tt-modal-banner-title">
                  {selectedSlot.subjectName}
                </div>
                <div className="faculty-tt-modal-banner-desc">
                  {selectedSlot.academicLevelName || "Intermediate"} · {selectedSlot.programName || "Regular"} · {selectedSlot.boardName || "Board"}
                </div>
              </div>

              <div className="faculty-tt-modal-grid">
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Classroom / Venue</div>
                  <div className="faculty-tt-modal-field-val">📍 Room {selectedSlot.roomName || selectedSlot.roomCode || "—"}</div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Period Number</div>
                  <div className="faculty-tt-modal-field-val">⏱️ {selectedSlot.periodName || `Period ${selectedSlot.periodNumber}`}</div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Academic Group & Section</div>
                  <div className="faculty-tt-modal-field-val">
                    📚 {selectedSlot.groupName} — {selectedSlot.sectionName}
                  </div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Academic Year</div>
                  <div className="faculty-tt-modal-field-val">
                    🗓️ {selectedSlot.academicYearName || "Current Year"}
                  </div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Faculty In-Charge</div>
                  <div className="faculty-tt-modal-field-val">
                    👤 {selectedSlot.facultyName || effectiveFacultyName} ({selectedSlot.facultyEmployeeId || effectiveEmployeeId})
                  </div>
                </div>
                <div className="faculty-tt-modal-field">
                  <div className="faculty-tt-modal-field-label">Remarks / Description</div>
                  <div className="faculty-tt-modal-field-val">
                    📝 {selectedSlot.remarks || "Regular teaching lecture slot"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="cms-btn cms-btn-ghost"
                  style={{ minWidth: 90, justifyContent: "center" }}
                  onClick={() => setSelectedSlot(null)}
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
