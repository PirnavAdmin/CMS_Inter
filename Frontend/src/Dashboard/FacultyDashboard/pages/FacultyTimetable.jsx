import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, Calendar, Clock, MapPin, BookOpen, Users, AlertCircle, RefreshCw, CheckCircle2, ChevronRight, Info } from "lucide-react";
import "../styles/FacultyTimetable.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser, getAuthToken } from "@/features/authStorage.js";

// Standard college weekly timetable days (Monday - Saturday)
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAYS = [
  { key: "MON", full: "Monday", dayOfWeek: 1 },
  { key: "TUE", full: "Tuesday", dayOfWeek: 2 },
  { key: "WED", full: "Wednesday", dayOfWeek: 3 },
  { key: "THU", full: "Thursday", dayOfWeek: 4 },
  { key: "FRI", full: "Friday", dayOfWeek: 5 },
  { key: "SAT", full: "Saturday", dayOfWeek: 6 },
];

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

function formatSlotTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const parsePart = (t) => {
    const parts = String(t).split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return { h12: String(h12).padStart(2, "0"), m, ampm };
  };
  const s = parsePart(startTime);
  const e = parsePart(endTime);
  return `${s.h12}:${s.m}–${e.h12}:${e.m} ${e.ampm}`;
}

function getFacultyStaffId(profile, auth) {
  // 1. Check explicit StaffId from JWT token claims
  try {
    const token = getAuthToken();
    if (token) {
      const parts = token.split(".");
      if (parts.length >= 2) {
        const decoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const claimStaffId = Number(decoded?.StaffId || decoded?.staffId);
        if (claimStaffId > 0) return claimStaffId;
      }
    }
  } catch {
    /* ignore parsing errors */
  }

  // 2. Check profile or auth staffId
  const candidate = Number(profile?.staffId || auth?.staffId || profile?.facultyId || auth?.facultyId);
  if (candidate > 0) return candidate;

  // 3. If role is Faculty/Staff/Teacher and id is set
  const fallbackId = Number(profile?.id || auth?.id);
  if (fallbackId > 0 && (auth?.role === "Faculty" || auth?.role === "Staff" || auth?.role === "Teacher")) {
    return fallbackId;
  }

  return null;
}

export default function FacultyTimetable() {
  const context = useFacultySafe();
  const profileData = context?.profileData || {};
  const authUser = getAuthUser();
  const { selectedCampusId } = useCampusContext?.() || {};
  const { selectedAcademicYearId } = useAcademicContext?.() || {};

  const [timetableSlots, setTimetableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const isFetchingRef = useRef(false);

  // Derive authentic StaffId strictly (e.g. 1108 for Tanjiro Kamado)
  const staffId = useMemo(() => {
    return getFacultyStaffId(profileData, authUser);
  }, [
    profileData?.staffId,
    profileData?.id,
    profileData?.facultyId,
    authUser?.staffId,
    authUser?.id,
    authUser?.facultyId,
  ]);

  // Determine current day of week (1 = Monday, ..., 6 = Saturday, 0 = Sunday)
  const currentDayOfWeek = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 7 : day;
  }, []);

  const fetchTimetable = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      if (!staffId) {
        setTimetableSlots([]);
        setLoading(false);
        return;
      }

      const endpoint = apiEndpoints?.timetable?.getByFaculty
        ? apiEndpoints.timetable.getByFaculty(staffId)
        : `/api/v1/timetable/faculty/${staffId}`;

      const params = {};
      if (selectedCampusId) params.campusId = selectedCampusId;
      if (selectedAcademicYearId) params.academicYearId = selectedAcademicYearId;

      // Query primary endpoint strictly with StaffId
      let res = await apiClient.get(endpoint, { params }).catch(() => null);
      let items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res)
        ? res
        : [];

      // Fallback: Query without contextual filters if campus/year filter excluded slots
      if (!items.length && (selectedCampusId || selectedAcademicYearId)) {
        const fallbackRes = await apiClient.get(endpoint).catch(() => null);
        items = Array.isArray(fallbackRes?.data)
          ? fallbackRes.data
          : Array.isArray(fallbackRes?.data?.data)
          ? fallbackRes.data.data
          : Array.isArray(fallbackRes)
          ? fallbackRes
          : [];
      }

      setTimetableSlots(items);
    } catch (err) {
      console.warn("Failed to fetch faculty timetable:", err);
      setError("Unable to connect to timetable service. Please try refreshing.");
      setTimetableSlots([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [staffId, selectedCampusId, selectedAcademicYearId]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  // Extract authentic periods dynamically from the slots returned by Admin Timetable
  const periodRows = useMemo(() => {
    const map = new Map();

    timetableSlots.forEach((slot) => {
      const timeLabel = formatSlotTimeRange(slot.startTime, slot.endTime);
      const key = slot.periodId || (timeLabel ? `time-${timeLabel}` : null);
      if (key && !map.has(key)) {
        map.set(key, {
          key: `p-${slot.periodId || key}`,
          periodId: slot.periodId,
          periodNumber: slot.periodNumber || (slot.periodId ? Number(slot.periodId) : 0),
          periodName: slot.periodName || `Period ${slot.periodNumber || ""}`,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeLabel: timeLabel || slot.periodName || `Period ${slot.periodId}`,
        });
      } else if (key && map.has(key)) {
        const existing = map.get(key);
        if (slot.periodName && !existing.periodName) existing.periodName = slot.periodName;
        if (slot.startTime && !existing.startTime) existing.startTime = slot.startTime;
        if (slot.endTime && !existing.endTime) existing.endTime = slot.endTime;
        if (timeLabel) existing.timeLabel = timeLabel;
      }
    });

    // If no slots exist yet, provide standard period structures
    if (map.size === 0) {
      const fallbackStandards = [
        { key: "p1", periodId: 801, periodNumber: 1, periodName: "Period 1", startTime: "09:00:00", endTime: "10:00:00", timeLabel: "09:00–10:00 AM" },
        { key: "p2", periodId: 841, periodNumber: 2, periodName: "Period 2", startTime: "10:00:00", endTime: "11:00:00", timeLabel: "10:00–11:00 AM" },
        { key: "p3", periodId: 842, periodNumber: 3, periodName: "Period 3", startTime: "11:15:00", endTime: "12:15:00", timeLabel: "11:15–12:15 PM" },
        { key: "p4", periodId: 843, periodNumber: 4, periodName: "Period 4", startTime: "14:00:00", endTime: "15:00:00", timeLabel: "02:00–03:00 PM" },
        { key: "p5", periodId: 844, periodNumber: 5, periodName: "Period 5", startTime: "15:00:00", endTime: "16:00:00", timeLabel: "03:00–04:00 PM" },
      ];
      fallbackStandards.forEach((p) => map.set(p.key, p));
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.startTime && b.startTime) return String(a.startTime).localeCompare(String(b.startTime));
      return (a.periodNumber || 0) - (b.periodNumber || 0);
    });
  }, [timetableSlots]);

  // Lookup class slot for a given day and period
  const getSlotForDayAndPeriod = useCallback(
    (dayName, period, dayIndex) => {
      return timetableSlots.find((s) => {
        const dayMatches =
          String(s.dayName || "").trim().toLowerCase() === dayName.toLowerCase() ||
          s.dayOfWeek === dayIndex + 1;

        const periodMatches =
          (s.periodId && period.periodId && Number(s.periodId) === Number(period.periodId)) ||
          (s.periodNumber && period.periodNumber && Number(s.periodNumber) === Number(period.periodNumber)) ||
          (s.startTime && period.startTime && String(s.startTime).slice(0, 5) === String(period.startTime).slice(0, 5));

        return dayMatches && periodMatches;
      });
    },
    [timetableSlots]
  );

  // Statistics
  const stats = useMemo(() => {
    const sections = new Set();
    const subjects = new Set();
    const rooms = new Set();
    timetableSlots.forEach((s) => {
      if (s.sectionName) sections.add(s.sectionName);
      if (s.subjectName) subjects.add(s.subjectName);
      if (s.roomName || s.roomCode) rooms.add(s.roomName || s.roomCode);
    });
    return {
      totalPeriods: timetableSlots.length,
      totalSections: sections.size,
      totalSubjects: subjects.size,
      totalRooms: rooms.size,
    };
  }, [timetableSlots]);

  const effectiveFacultyName =
    timetableSlots[0]?.facultyName ||
    timetableSlots[0]?.staffName ||
    profileData.fullName ||
    profileData.name ||
    authUser?.name ||
    "Faculty Member";

  const effectiveEmployeeId =
    timetableSlots[0]?.facultyEmployeeId ||
    timetableSlots[0]?.staffEmployeeId ||
    profileData.employeeId ||
    authUser?.employeeId ||
    "";

  return (
    <div className="faculty-tt-container">
      {/* Page Header with Stats Chips */}
      <div className="faculty-tt-head-card">
        <div className="faculty-tt-head-info">
          <div className="faculty-tt-title-row">
            <div className="faculty-tt-icon-badge">
              <Calendar size={22} />
            </div>
            <div>
              <h1 className="faculty-tt-title">My Timetable</h1>
              <p className="faculty-tt-subtitle">
                Weekly academic lecture schedule, assigned sections, and classroom venues.
              </p>
            </div>
          </div>
        </div>

        <div className="faculty-tt-toolbar">
          <div className="faculty-tt-stat-chips">
            <div className="faculty-tt-stat-chip chip-periods" title="Total teaching periods per week">
              <Clock size={14} />
              <span className="stat-number">{stats.totalPeriods}</span>
              <span className="stat-label">Periods / Week</span>
            </div>

            {stats.totalSections > 0 && (
              <div className="faculty-tt-stat-chip chip-sections" title="Assigned sections">
                <Users size={14} />
                <span className="stat-number">{stats.totalSections}</span>
                <span className="stat-label">Sections</span>
              </div>
            )}

            {stats.totalSubjects > 0 && (
              <div className="faculty-tt-stat-chip chip-subjects" title="Active subjects">
                <BookOpen size={14} />
                <span className="stat-number">{stats.totalSubjects}</span>
                <span className="stat-label">Subjects</span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="faculty-tt-refresh-btn"
            onClick={fetchTimetable}
            disabled={loading}
            title="Refresh authentic timetable data from Admin Management"
          >
            <RefreshCw size={14} className={loading ? "dashboard-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Timetable Content */}
      <div className="faculty-tt-main-card">
        {loading ? (
          <div className="faculty-tt-loading-wrap">
            <div className="faculty-tt-spinner-box">
              <RefreshCw size={28} className="dashboard-spin" />
            </div>
            <h3>Loading Timetable</h3>
            <p>Fetching scheduled academic sessions from Timetable Management...</p>
          </div>
        ) : error ? (
          <div className="faculty-tt-empty-state state-error">
            <div className="faculty-tt-empty-icon icon-error">
              <AlertCircle size={32} />
            </div>
            <h3>Unable to Load Timetable</h3>
            <p>{error}</p>
            <button className="faculty-tt-action-btn btn-primary" onClick={fetchTimetable}>
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        ) : timetableSlots.length === 0 ? (
          <div className="faculty-tt-empty-state">
            <div className="faculty-tt-empty-icon">
              <Calendar size={36} />
            </div>
            <h3>No Timetable Allocated Yet</h3>
            <p className="empty-desc">
              There are currently no scheduled lecture periods or class sessions assigned to your faculty profile
              for this academic session.
            </p>
            <div className="faculty-tt-empty-note">
              <Info size={16} />
              <span>
                Timetables are managed centrally in the <strong>Admin Timetable Management</strong> module.
                Once your department administrator allocates your subjects, periods, and classrooms, your schedule
                will automatically synchronize here.
              </span>
            </div>
            <button className="faculty-tt-action-btn btn-outline" onClick={fetchTimetable}>
              <RefreshCw size={14} /> Refresh Schedule
            </button>
          </div>
        ) : (
          <div className="faculty-tt-table-wrap">
            <table className="faculty-tt-grid-table">
              <thead>
                <tr>
                  <th className="th-time-col">
                    <div className="th-time-header">
                      <Clock size={13} />
                      <span>TIME SLOT</span>
                    </div>
                  </th>
                  {SHORT_DAYS.map((d) => {
                    const isToday = currentDayOfWeek === d.dayOfWeek;
                    return (
                      <th key={d.key} className={`th-day-col ${isToday ? "is-today" : ""}`}>
                        <div className="th-day-box">
                          <span className="th-day-code">{d.key}</span>
                          <span className="th-day-name">{d.full}</span>
                          {isToday && <span className="today-badge">TODAY</span>}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {periodRows.map((period) => (
                  <tr key={period.key || period.timeLabel}>
                    <td className="td-time-col">
                      <div className="period-time-cell">
                        <span className="period-badge-name">
                          {period.periodName || `Period ${period.periodNumber || ""}`}
                        </span>
                        <span className="period-badge-time">{period.timeLabel}</span>
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map((day, dayIdx) => {
                      const item = getSlotForDayAndPeriod(day, period, dayIdx);
                      const isToday = currentDayOfWeek === dayIdx + 1;
                      return (
                        <td key={day} className={`td-day-cell ${isToday ? "is-today-col" : ""}`}>
                          {item ? (
                            <div
                              className="faculty-slot-card"
                              onClick={() => setSelectedSlot(item)}
                              title={`${item.subjectName} · Section: ${item.sectionName} · Room: ${item.roomName || item.roomCode || ""}`}
                            >
                              <div className="slot-card-header">
                                <span className="slot-subject-title">{item.subjectName || item.subjectCode}</span>
                              </div>

                              <div className="slot-card-meta">
                                <span className="slot-chip chip-section">
                                  <Users size={10} />
                                  <span>
                                    {item.groupName && !item.sectionName?.includes(item.groupName)
                                      ? `${item.groupName} - `
                                      : ""}
                                    {item.sectionName}
                                  </span>
                                </span>

                                <span className="slot-chip chip-room">
                                  <MapPin size={10} />
                                  <span>
                                    {String(item.roomName || item.roomCode || "").startsWith("Room")
                                      ? item.roomName || item.roomCode
                                      : `Room ${item.roomName || item.roomCode || "—"}`}
                                  </span>
                                </span>
                              </div>

                              {item.remarks && (
                                <div className="slot-card-remarks">
                                  <span className="slot-tag-remark">{item.remarks}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="faculty-free-slot" title="No class scheduled for this period">
                              <span className="free-dot">·</span>
                            </div>
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
        <div className="faculty-tt-modal-backdrop" onClick={() => setSelectedSlot(null)}>
          <div className="faculty-tt-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-tt-modal-head">
              <div className="modal-head-title">
                <div className="modal-head-icon">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3>Class Details</h3>
                  <span className="modal-head-subtitle">
                    {selectedSlot.dayName} · {selectedSlot.periodName || "Period"} (
                    {formatTime12h(selectedSlot.startTime)} – {formatTime12h(selectedSlot.endTime)})
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedSlot(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="faculty-tt-modal-body">
              <div className="modal-subject-banner">
                <div className="modal-badges-row">
                  <span className="modal-badge badge-code">{selectedSlot.subjectCode || "SUBJECT"}</span>
                  <span className="modal-badge badge-section">
                    {selectedSlot.groupName ? `${selectedSlot.groupName} — ` : ""}
                    {selectedSlot.sectionName}
                  </span>
                  {selectedSlot.approvalStatusName && (
                    <span className="modal-badge badge-status">
                      <CheckCircle2 size={11} /> {selectedSlot.approvalStatusName}
                    </span>
                  )}
                </div>
                <h4 className="modal-subject-name">{selectedSlot.subjectName}</h4>
                <div className="modal-academic-path">
                  <span>{selectedSlot.academicLevelName || "Intermediate"}</span>
                  <ChevronRight size={12} />
                  <span>{selectedSlot.programName || "Regular"}</span>
                  <ChevronRight size={12} />
                  <span>{selectedSlot.boardName || "Board of Intermediate Education"}</span>
                </div>
              </div>

              <div className="modal-details-grid">
                <div className="modal-detail-item">
                  <span className="detail-label">Classroom / Venue</span>
                  <strong className="detail-value">
                    📍{" "}
                    {String(selectedSlot.roomName || selectedSlot.roomCode || "").startsWith("Room")
                      ? selectedSlot.roomName || selectedSlot.roomCode
                      : `Room ${selectedSlot.roomName || selectedSlot.roomCode || "—"}`}
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Period Timing</span>
                  <strong className="detail-value">
                    ⏱️ {selectedSlot.periodName || `Period ${selectedSlot.periodNumber || ""}`} (
                    {formatTime12h(selectedSlot.startTime)} – {formatTime12h(selectedSlot.endTime)})
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Group & Section</span>
                  <strong className="detail-value">
                    📚 {selectedSlot.groupName ? `${selectedSlot.groupName} — ` : ""}
                    {selectedSlot.sectionName}
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Academic Year</span>
                  <strong className="detail-value">
                    🗓️ {selectedSlot.academicYearName || "2026-2027"}
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Faculty Member</span>
                  <strong className="detail-value">
                    👤 {selectedSlot.facultyName || effectiveFacultyName}
                    {effectiveEmployeeId ? ` (${effectiveEmployeeId})` : ""}
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Lecture Type / Remarks</span>
                  <strong className="detail-value">
                    📝 {selectedSlot.remarks || "Regular teaching lecture slot"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="faculty-tt-modal-footer">
              <button
                type="button"
                className="faculty-tt-action-btn btn-outline"
                onClick={() => setSelectedSlot(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
