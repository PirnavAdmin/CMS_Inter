import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { X, Calendar, Clock, MapPin, BookOpen, Users, AlertCircle, RefreshCw, CheckCircle2, ChevronRight, Info, User, FileText } from "lucide-react";
import "../styles/FacultyTimetable.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser, getAuthToken } from "@/features/authStorage.js";
import { getStaffSubjectAllocations } from "@/api/staffApi.js";

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

// Fixed canonical 8-period college timetable schema (permanent rows 1..8)
export const FIXED_COLLEGE_PERIODS = [
  {
    key: "period-1",
    periodNumber: 1,
    periodName: "Period 1",
    timeLabel: "09:00 AM – 10:00 AM",
    startTime: "09:00:00",
    endTime: "10:00:00",
  },
  {
    key: "period-2",
    periodNumber: 2,
    periodName: "Period 2",
    timeLabel: "10:00 AM – 11:00 AM",
    startTime: "10:00:00",
    endTime: "11:00:00",
  },
  {
    key: "period-3",
    periodNumber: 3,
    periodName: "Period 3",
    timeLabel: "11:15 AM – 12:15 PM",
    startTime: "11:15:00",
    endTime: "12:15:00",
  },
  {
    key: "period-4",
    periodNumber: 4,
    periodName: "Period 4",
    timeLabel: "12:40 PM – 01:20 PM",
    startTime: "12:40:00",
    endTime: "13:20:00",
  },
  {
    key: "period-5",
    periodNumber: 5,
    periodName: "Period 5",
    timeLabel: "01:20 PM – 02:00 PM",
    startTime: "13:20:00",
    endTime: "14:00:00",
  },
  {
    key: "period-6",
    periodNumber: 6,
    periodName: "Period 6",
    timeLabel: "02:00 PM – 03:00 PM",
    startTime: "14:00:00",
    endTime: "15:00:00",
  },
  {
    key: "period-7",
    periodNumber: 7,
    periodName: "Period 7",
    timeLabel: "03:00 PM – 04:00 PM",
    startTime: "15:00:00",
    endTime: "16:00:00",
  },
  {
    key: "period-8",
    periodNumber: 8,
    periodName: "Period 8",
    timeLabel: "04:00 PM – 05:00 PM",
    startTime: "16:00:00",
    endTime: "17:00:00",
  },
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
  const [allocatedSubjects, setAllocatedSubjects] = useState([]);
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
        setAllocatedSubjects([]);
        setLoading(false);
        return;
      }

      const endpoint = apiEndpoints?.timetable?.getByFaculty
        ? apiEndpoints.timetable.getByFaculty(staffId)
        : `/api/v1/timetable/faculty/${staffId}`;

      const params = {};
      if (selectedCampusId) params.campusId = selectedCampusId;
      if (selectedAcademicYearId) params.academicYearId = selectedAcademicYearId;

      // Query primary endpoint strictly with StaffId alongside profile subject allocations
      const [res, allocRes] = await Promise.allSettled([
        apiClient.get(endpoint, { params }),
        getStaffSubjectAllocations(staffId),
      ]);

      let items = [];
      if (res.status === "fulfilled") {
        const val = res.value;
        items = Array.isArray(val?.data)
          ? val.data
          : Array.isArray(val?.data?.data)
          ? val.data.data
          : Array.isArray(val)
          ? val
          : [];
      }

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

      if (allocRes.status === "fulfilled") {
        const rawAllocs = allocRes.value?.data?.data || allocRes.value?.data || [];
        setAllocatedSubjects(Array.isArray(rawAllocs) ? rawAllocs : []);
      }
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

  // Permanent fixed 8-period timetable rows (Fixed schema structure; data populates dynamically)
  const periodRows = FIXED_COLLEGE_PERIODS;

  // Lookup class slot for a given day and fixed period row
  const getSlotForDayAndPeriod = useCallback(
    (dayName, period, dayIndex) => {
      return timetableSlots.find((s) => {
        const dayMatches =
          String(s.dayName || "").trim().toLowerCase() === dayName.toLowerCase() ||
          s.dayOfWeek === dayIndex + 1;

        if (!dayMatches) return false;

        // Match by exact start time (e.g. "09:00", "10:00", "11:15", "12:40", "13:20", "14:00", "15:00", "16:00")
        if (s.startTime && period.startTime) {
          const slotStart = String(s.startTime).slice(0, 5);
          const periodStart = String(period.startTime).slice(0, 5);
          if (slotStart === periodStart) return true;
        }

        // Match by period number if explicitly aligned
        if (s.periodNumber && s.periodNumber === period.periodNumber) {
          return true;
        }

        return false;
      });
    },
    [timetableSlots]
  );

  // Statistics & aggregation
  const stats = useMemo(() => {
    const sections = new Set();
    const subjects = new Set();
    const rooms = new Set();
    const subjectPeriodCounts = {};

    timetableSlots.forEach((s) => {
      if (s.sectionName) sections.add(s.sectionName);
      if (s.subjectName) {
        subjects.add(s.subjectName);
        subjectPeriodCounts[s.subjectName] = (subjectPeriodCounts[s.subjectName] || 0) + 1;
      }
      if (s.roomName || s.roomCode) rooms.add(s.roomName || s.roomCode);
    });

    return {
      totalPeriods: timetableSlots.length,
      totalSections: sections.size,
      sectionList: Array.from(sections),
      totalSubjects: subjects.size,
      subjectList: Array.from(subjects),
      subjectPeriodCounts,
      totalRooms: rooms.size,
      totalAllocatedSubjects: allocatedSubjects.length,
    };
  }, [timetableSlots, allocatedSubjects]);

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
            <div className="faculty-tt-title-group">
              <h1 className="faculty-tt-title">My Timetable</h1>
              <p
                className="faculty-tt-subtitle"
                title="Weekly academic lecture schedule, assigned sections, and classroom venues."
              >
                Weekly academic lecture schedule, assigned sections, and classroom venues.
              </p>
            </div>
          </div>
        </div>

        <div className="faculty-tt-toolbar">
          <div className="faculty-tt-stat-chips">
            <div className="faculty-tt-stat-chip chip-periods" title="Total teaching periods scheduled per week">
              <Clock size={14} />
              <span className="stat-number">{stats.totalPeriods}</span>
              <span className="stat-label">Periods / Week</span>
            </div>

            {stats.totalSections > 0 && (
              <div
                className="faculty-tt-stat-chip chip-sections"
                title={`Assigned Sections (${stats.totalSections}): ${stats.sectionList.join(", ")}`}
              >
                <Users size={14} />
                <span className="stat-number">{stats.totalSections}</span>
                <span className="stat-label">Sections</span>
              </div>
            )}

            {(stats.totalSubjects > 0 || allocatedSubjects.length > 0) && (
              <div
                className="faculty-tt-stat-chip chip-subjects"
                title={`Active in Timetable: ${stats.subjectList.join(", ") || "None"}${
                  allocatedSubjects.length
                    ? ` | Profile Allocated: ${allocatedSubjects.map((a) => a.subjectName || a.name).join(", ")}`
                    : ""
                }`}
              >
                <BookOpen size={14} />
                <span className="stat-number">
                  {stats.totalSubjects}
                  {allocatedSubjects.length > 0 && stats.totalSubjects !== allocatedSubjects.length
                    ? ` / ${allocatedSubjects.length}`
                    : ""}
                </span>
                <span className="stat-label">
                  {allocatedSubjects.length > 0 && stats.totalSubjects !== allocatedSubjects.length
                    ? "Subjects (Active / Allocated)"
                    : "Subjects"}
                </span>
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

      {/* Allocated / Teaching Subjects Banner */}
      {allocatedSubjects.length > 0 && (
        <div className="faculty-tt-alloc-banner">
          <div className="faculty-tt-alloc-banner-left">
            <div className="faculty-tt-alloc-icon">
              <BookOpen size={16} />
            </div>
            <div className="faculty-tt-alloc-title">
              <span>Teaching Subjects ({allocatedSubjects.length})</span>
              <span className="faculty-tt-alloc-badge">
                {stats.totalSubjects} Active on Schedule
              </span>
            </div>
          </div>
          <div className="faculty-tt-alloc-pills">
            {allocatedSubjects.map((alloc) => {
              const subName = alloc.subjectName || alloc.name || `Subject #${alloc.subjectId}`;
              const count = stats.subjectPeriodCounts[subName] || 0;
              const isScheduled = count > 0;
              return (
                <div
                  key={alloc.id || alloc.subjectId}
                  className={`faculty-tt-alloc-pill ${isScheduled ? "pill-scheduled" : "pill-pending"}`}
                  title={
                    isScheduled
                      ? `${count} periods scheduled weekly across sections (${stats.sectionList.join(", ")})`
                      : `Allocated to ${effectiveFacultyName}; 0 class periods scheduled yet by Admin in Timetable Management.`
                  }
                >
                  <span className="alloc-pill-dot" />
                  <span className="alloc-pill-name">{subName}</span>
                  {alloc.subjectCode && <span className="alloc-pill-code">({alloc.subjectCode})</span>}
                  <span className="alloc-pill-meta">
                    {isScheduled ? `${count} periods/wk` : "0 scheduled"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Timetable Content */}
      <div className="faculty-tt-main-card">
        {!loading && error && timetableSlots.length === 0 ? (
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
        ) : !loading && timetableSlots.length === 0 ? (
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
                      const isToday = currentDayOfWeek === dayIdx + 1;

                      // Skeleton shimmer state matching Admin Dashboard aesthetics during loading or refresh
                      if (loading) {
                        return (
                          <td key={day} className={`td-day-cell ${isToday ? "is-today-col" : ""}`}>
                            <div className="faculty-slot-skeleton">
                              <div className="cms-skeleton skeleton-sub" />
                              <div className="faculty-slot-skeleton-meta">
                                <div className="cms-skeleton skeleton-badge" />
                                <div className="cms-skeleton skeleton-badge" />
                              </div>
                            </div>
                          </td>
                        );
                      }

                      const item = getSlotForDayAndPeriod(day, period, dayIdx);
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
                  {selectedSlot.subjectCode && (
                    <span className="modal-badge badge-code">{selectedSlot.subjectCode}</span>
                  )}
                  {selectedSlot.sectionName && (
                    <span className="modal-badge badge-section">
                      {selectedSlot.groupName ? `${selectedSlot.groupName} — ` : ""}
                      {selectedSlot.sectionName}
                    </span>
                  )}
                  <span className="modal-badge badge-status">
                    <CheckCircle2 size={11} /> Scheduled Lecture
                  </span>
                </div>
                <h4 className="modal-subject-name">{selectedSlot.subjectName}</h4>
                {(selectedSlot.academicLevelName || selectedSlot.programName || selectedSlot.boardName) && (
                  <div className="modal-academic-path">
                    {selectedSlot.academicLevelName && <span>{selectedSlot.academicLevelName}</span>}
                    {selectedSlot.academicLevelName && selectedSlot.programName && <ChevronRight size={12} />}
                    {selectedSlot.programName && <span>{selectedSlot.programName}</span>}
                    {(selectedSlot.academicLevelName || selectedSlot.programName) && selectedSlot.boardName && (
                      <ChevronRight size={12} />
                    )}
                    {selectedSlot.boardName && <span>{selectedSlot.boardName}</span>}
                  </div>
                )}
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
                    📝 {selectedSlot.remarks || "Theory Lecture"}
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
