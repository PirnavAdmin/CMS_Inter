import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Users,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Info,
  User,
  Coffee,
  Sun,
} from "lucide-react";
import "../styles/FacultyTimetable.css";
import { useFacultySafe } from "../FacultyContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser, getAuthToken } from "@/modules/auth/authStorage.js";
import { getStaffSubjectAllocations } from "@/api/staffApi.js";

// Standard College Working Days (Monday through Saturday, matching Admin Timetable)
export const COLLEGE_WORKING_DAYS = [
  { dayOfWeek: 1, key: "MON", full: "Monday" },
  { dayOfWeek: 2, key: "TUE", full: "Tuesday" },
  { dayOfWeek: 3, key: "WED", full: "Wednesday" },
  { dayOfWeek: 4, key: "THU", full: "Thursday" },
  { dayOfWeek: 5, key: "FRI", full: "Friday" },
  { dayOfWeek: 6, key: "SAT", full: "Saturday" },
];

// Admin Portal Timetable Canonical Period Structure (Periods 1-8 + Break Slots)
// Derived authoritatively from Admin Timetable Management (Period Structure 12 / Periods table)
// Academic Day: 08:30 AM – 04:10 PM (Campus shift window 09:00 AM – 04:30 PM)
export const ADMIN_CANONICAL_PERIODS = [
  { id: 806, periodId: 806, periodNumber: 1, name: "Period 1", startTime: "08:30:00", endTime: "09:20:00", timeRange: "08:30 AM – 09:20 AM", isBreak: false },
  { id: 807, periodId: 807, periodNumber: 2, name: "Period 2", startTime: "09:20:00", endTime: "10:10:00", timeRange: "09:20 AM – 10:10 AM", isBreak: false },
  { id: 808, periodId: 808, periodNumber: null, name: "Tea Break", startTime: "10:10:00", endTime: "10:20:00", timeRange: "10:10 AM – 10:20 AM", isBreak: true },
  { id: 809, periodId: 809, periodNumber: 3, name: "Period 3", startTime: "10:20:00", endTime: "11:10:00", timeRange: "10:20 AM – 11:10 AM", isBreak: false },
  { id: 810, periodId: 810, periodNumber: 4, name: "Period 4", startTime: "11:10:00", endTime: "12:00:00", timeRange: "11:10 AM – 12:00 PM", isBreak: false },
  { id: 814, periodId: 814, periodNumber: null, name: "Lunch Break", startTime: "12:00:00", endTime: "12:40:00", timeRange: "12:00 PM – 12:40 PM", isBreak: true },
  { id: 815, periodId: 815, periodNumber: 5, name: "Period 5", startTime: "12:40:00", endTime: "13:30:00", timeRange: "12:40 PM – 01:30 PM", isBreak: false },
  { id: 811, periodId: 811, periodNumber: 6, name: "Period 6", startTime: "13:30:00", endTime: "14:20:00", timeRange: "01:30 PM – 02:20 PM", isBreak: false },
  { id: 812, periodId: 812, periodNumber: null, name: "Tea Break", startTime: "14:20:00", endTime: "14:30:00", timeRange: "02:20 PM – 02:30 PM", isBreak: true },
  { id: 813, periodId: 813, periodNumber: 7, name: "Period 7", startTime: "14:30:00", endTime: "15:20:00", timeRange: "02:30 PM – 03:20 PM", isBreak: false },
  { id: 816, periodId: 816, periodNumber: 8, name: "Period 8", startTime: "15:20:00", endTime: "16:10:00", timeRange: "03:20 PM – 04:10 PM", isBreak: false },
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

  // 3. Fallback
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
  const [canonicalPeriods, setCanonicalPeriods] = useState(ADMIN_CANONICAL_PERIODS);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const navigate = useNavigate();

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

  // Current calendar day state: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentCalendarDay = useMemo(() => new Date().getDay(), []);
  const isSundayToday = currentCalendarDay === 0;

  const currentDayName = useMemo(() => {
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return names[currentCalendarDay];
  }, [currentCalendarDay]);

  const fetchTimetable = useCallback(async (isManualRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Structure preservation: keep grid mounted on subsequent refreshes
    if (isManualRefresh || timetableSlots.length > 0) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      if (!staffId) {
        setTimetableSlots([]);
        setAllocatedSubjects([]);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }

      const endpoint = apiEndpoints?.timetable?.getByFaculty
        ? apiEndpoints.timetable.getByFaculty(staffId)
        : `/api/v1/timetable/faculty/${staffId}`;

      const params = {};
      if (selectedCampusId) params.campusId = selectedCampusId;
      if (selectedAcademicYearId) params.academicYearId = selectedAcademicYearId;

      // Query primary endpoint with StaffId alongside profile subject allocations and dynamic periods
      const [res, allocRes, periodRes] = await Promise.allSettled([
        apiClient.get(endpoint, { params }),
        getStaffSubjectAllocations(staffId),
        apiClient.get(apiEndpoints.periods.getAll, { params }),
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

      if (periodRes.status === "fulfilled") {
        const rawPeriods = Array.isArray(periodRes.value?.data)
          ? periodRes.value.data
          : Array.isArray(periodRes.value?.data?.data)
          ? periodRes.value.data.data
          : [];
        if (rawPeriods.length >= 8) {
          const sorted = [...rawPeriods].sort((a, b) => {
            const ordA = Number(a.displayOrder ?? a.DisplayOrder ?? a.periodId ?? a.PeriodId ?? 0);
            const ordB = Number(b.displayOrder ?? b.DisplayOrder ?? b.periodId ?? b.PeriodId ?? 0);
            return ordA - ordB;
          });
          const mappedPeriods = sorted.map((p, idx) => {
            const isBrk = Boolean(p.isBreak ?? p.IsBreak);
            const pName = p.periodName || p.PeriodName || p.name || p.Name;
            const sTime = p.startTime || p.StartTime;
            const eTime = p.endTime || p.EndTime;
            const numMatch = String(pName).match(/\d+/);
            const pId = Number(p.periodId ?? p.PeriodId ?? p.id ?? idx + 1);
            return {
              id: pId,
              periodId: pId,
              periodNumber: isBrk ? null : (numMatch ? parseInt(numMatch[0], 10) : idx + 1),
              name: pName,
              startTime: sTime,
              endTime: eTime,
              timeRange: formatSlotTimeRange(sTime, eTime),
              isBreak: isBrk,
            };
          });
          setCanonicalPeriods(mappedPeriods);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch faculty timetable:", err);
      setError("Unable to connect to timetable service. Please try refreshing.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [staffId, selectedCampusId, selectedAcademicYearId, timetableSlots.length]);

  useEffect(() => {
    fetchTimetable(false);
  }, [fetchTimetable]);

  // Working days matching Admin Portal Timetable
  const workingDays = COLLEGE_WORKING_DAYS;

  // Count lectures scheduled for today
  const todayLectures = useMemo(() => {
    if (!timetableSlots || !timetableSlots.length) return [];
    return timetableSlots.filter((slot) => {
      const slotDayName = String(slot.dayName || "").trim().toLowerCase();
      const slotDayNum = Number(slot.dayOfWeek);
      return (
        slotDayName === currentDayName.toLowerCase() ||
        slotDayNum === currentCalendarDay ||
        (currentCalendarDay === 0 && (slotDayNum === 7 || slotDayName === "sunday"))
      );
    });
  }, [timetableSlots, currentCalendarDay, currentDayName]);

  // Matrix lookup: Day + Period -> Slot (aligned by PeriodId, PeriodName, and StartTime)
  const findSlotForDayAndPeriod = useCallback(
    (day, period) => {
      if (period.isBreak || !timetableSlots || !timetableSlots.length) return null;

      // 1. Filter day slots by dayOfWeek or dayName
      const daySlots = timetableSlots.filter((s) => {
        const slotDay = String(s.dayName || "").trim().toLowerCase();
        const slotNum = Number(s.dayOfWeek);
        return slotDay === day.full.toLowerCase() || slotNum === day.dayOfWeek;
      });

      if (!daySlots.length) return null;

      // Priority 1: Match by exact PeriodId (period.periodId or period.id)
      const targetPeriodId = Number(period.periodId || period.id);
      if (targetPeriodId > 0) {
        const matchById = daySlots.find((s) => Number(s.periodId) === targetPeriodId);
        if (matchById) return matchById;
      }

      // Priority 2: Match by exact Period Name (e.g. "Period 6" === "Period 6")
      if (period.name) {
        const targetName = String(period.name).trim().toLowerCase();
        const matchByName = daySlots.find(
          (s) => s.periodName && String(s.periodName).trim().toLowerCase() === targetName
        );
        if (matchByName) return matchByName;
      }

      // Priority 3: Match by Start Time (e.g. "13:30")
      if (period.startTime) {
        const pStartPrefix = String(period.startTime).slice(0, 5);
        const matchByStart = daySlots.find(
          (s) => s.startTime && String(s.startTime).slice(0, 5) === pStartPrefix
        );
        if (matchByStart) return matchByStart;
      }

      // Priority 4: Match by period number extracted from Period Name (e.g. "Period 6" -> 6)
      if (period.periodNumber) {
        const matchByExtractedNum = daySlots.find((s) => {
          if (s.periodName) {
            const numMatch = String(s.periodName).match(/\d+/);
            if (numMatch && parseInt(numMatch[0], 10) === period.periodNumber) return true;
          }
          return false;
        });
        if (matchByExtractedNum) return matchByExtractedNum;
      }

      return null;
    },
    [timetableSlots]
  );

  // Close slot details modal on escape key
  useEffect(() => {
    if (!selectedSlot) return undefined;
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedSlot(null);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedSlot]);

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

  return (
    <div className="faculty-tt-container timetable-module">
      {/* Header Card with Stat Chips & Subtle Refresh Action */}
      <div className="faculty-tt-head-card">
        <div className="faculty-tt-head-info">
          <div className="faculty-tt-title-row">
            <div className="faculty-tt-icon-badge">
              <Calendar size={22} />
            </div>
            <div>
              <div className="faculty-tt-title-wrap">
                <h1 className="faculty-tt-title">My Timetable</h1>
                <span className="faculty-tt-status-pill">Published</span>
              </div>
              <p className="faculty-tt-subtitle">
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
                    ? ` | Allocated: ${allocatedSubjects.map((a) => a.subjectName || a.name).join(", ")}`
                    : ""
                }`}
              >
                <BookOpen size={14} />
                <span className="stat-number">{stats.totalSubjects}</span>
                <span className="stat-label">Subjects</span>
              </div>
            )}
          </div>

          {/* Subtle, secondary Refresh action */}
          <button
            type="button"
            className={`faculty-tt-refresh-btn ${isRefreshing ? "is-refreshing" : ""}`}
            onClick={() => fetchTimetable(true)}
            disabled={loading || isRefreshing}
            title="Refresh authentic timetable data from Admin Management"
          >
            <RefreshCw size={13} className={isRefreshing ? "dashboard-spin" : ""} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Main Timetable Card */}
      <div className={`faculty-tt-main-card ${isRefreshing ? "is-refreshing-grid" : ""}`}>
        {isRefreshing && <div className="faculty-tt-refresh-progress-bar" />}

        {/* State 1: Network / API Failure */}
        {!loading && !isRefreshing && error && timetableSlots.length === 0 ? (
          <div className="faculty-tt-empty-state state-error">
            <div className="faculty-tt-empty-icon icon-error">
              <AlertCircle size={32} />
            </div>
            <h3>Unable to Load Timetable</h3>
            <p>{error}</p>
            <button className="faculty-tt-action-btn btn-primary" onClick={() => fetchTimetable(true)}>
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        ) : !loading && !isRefreshing && timetableSlots.length === 0 ? (
          /* State 2: No Timetable Assigned / Generated Yet */
          <div className="faculty-tt-empty-state">
            <div className="faculty-tt-empty-icon">
              <Calendar size={36} />
            </div>
            <h3>Your Timetable Has Not Been Assigned Yet</h3>
            <p className="empty-desc">
              The academic timetable for your faculty profile has not been assigned or published yet by the administration.
              Once generated and published in Timetable Management, your assigned classes will automatically appear here.
            </p>
            <div className="faculty-tt-empty-note">
              <Info size={16} />
              <span>
                Timetables are centrally authored in <strong>Admin Timetable Management</strong>. Contact your department administrator if your schedule is pending.
              </span>
            </div>
            <button className="faculty-tt-action-btn btn-subtle" onClick={() => fetchTimetable(true)}>
              <RefreshCw size={13} /> Check Again
            </button>
          </div>
        ) : loading && timetableSlots.length === 0 ? (
          /* State 3: Structure-Preserving Initial Skeleton Table */
          <div className="ttm-grid-wrap faculty-tt-skeleton-table-wrap">
            <table className="ttm-grid">
              <thead>
                <tr>
                  <th>Day</th>
                  {canonicalPeriods.map((period) => (
                    <th key={period.id}>
                      {period.name}
                      {period.timeRange ? <small>{period.timeRange.replace(" – ", " - ").replace("–", "-")}</small> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COLLEGE_WORKING_DAYS.map((day) => (
                  <tr key={day.key}>
                    <th>{day.full}</th>
                    {canonicalPeriods.map((period) => (
                      <td key={period.id} className={period.isBreak ? "break" : "slot"}>
                        {period.isBreak ? (
                          String(period.name).toLowerCase().includes("lunch") ? "Lunch Break" : "Tea Break"
                        ) : (
                          <div className="faculty-tt-cell-skeleton" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* State 4 & 5: Timetable Available - Grid STAYS INTACT DURING REFRESH! */
          <>
            {/* Sunday / Scheduled Non-Working Day Banner */}
            {isSundayToday && (
              <div className="faculty-tt-sunday-banner">
                <div className="faculty-tt-sunday-icon">
                  <Calendar size={22} />
                </div>
                <div className="faculty-tt-sunday-content">
                  <h3 className="faculty-tt-sunday-title">No Classes Scheduled Today</h3>
                  <p className="faculty-tt-sunday-desc">
                    Enjoy your day off! Your weekly timetable is available below for the upcoming working days.
                  </p>
                </div>
                <div className="faculty-tt-sunday-badge">
                  <span>Weekly Off (Sunday)</span>
                </div>
              </div>
            )}

            {/* Regular Working Day with 0 lectures today */}
            {!isSundayToday && todayLectures.length === 0 && (
              <div className="faculty-tt-weekday-off-banner">
                <div className="faculty-tt-weekday-off-icon">
                  <Sun size={20} />
                </div>
                <div className="faculty-tt-weekday-off-content">
                  <h3 className="faculty-tt-weekday-off-title">No Lectures Scheduled Today</h3>
                  <p className="faculty-tt-weekday-off-desc">
                    No lectures are scheduled for you today ({currentDayName}). Review your complete weekly schedule below.
                  </p>
                </div>
              </div>
            )}

            {/* Admin Portal Exact Structure Timetable Grid */}
            <div className={`ttm-grid-wrap ${isRefreshing ? "is-refreshing-opacity" : ""}`}>
              <table className="ttm-grid">
                <thead>
                  <tr>
                    <th>Day</th>
                    {canonicalPeriods.map((period) => (
                      <th key={period.id}>
                        {period.name}
                        {period.timeRange ? <small>{period.timeRange.replace(" – ", " - ").replace("–", "-")}</small> : null}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workingDays.map((day) => {
                    const isToday = currentCalendarDay === day.dayOfWeek;
                    return (
                      <tr key={day.key} className={isToday ? "is-today-row" : ""}>
                        <th>{day.full}</th>

                        {canonicalPeriods.map((period) => {
                          if (period.isBreak) {
                            const breakTitle = String(period.name).toLowerCase().includes("lunch")
                              ? "Lunch Break"
                              : "Tea Break";
                            return (
                              <td className="break" key={period.id}>
                                {breakTitle}
                              </td>
                            );
                          }

                          const slot = findSlotForDayAndPeriod(day, period);
                          return (
                            <td className="slot" key={period.id}>
                              {slot ? (
                                <button
                                  type="button"
                                  className="ttm-slot-btn"
                                  onClick={() => setSelectedSlot({ ...slot, dayName: day.full, periodName: period.name })}
                                  title={`${slot.subjectName || slot.subjectCode} · ${slot.sectionName} · Room: ${slot.roomName || slot.roomCode || "—"}`}
                                >
                                  <b>{slot.subjectName || slot.subjectCode}</b>
                                  <span>
                                    {slot.groupName ? `${slot.groupName} - ` : ""}
                                    {slot.sectionName || "Section"}
                                  </span>
                                  <small>
                                    {slot.roomName || slot.roomCode
                                      ? (String(slot.roomName || slot.roomCode).startsWith("Room")
                                          ? slot.roomName || slot.roomCode
                                          : `Room ${slot.roomName || slot.roomCode}`)
                                      : "Room —"}
                                  </small>
                                </button>
                              ) : (
                                <span className="ttm-empty-slot" aria-label="No class assigned">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Authentic Lecture Details Modal Dialog (Project Structure & Aligned CSS) */}
      {selectedSlot && createPortal(
        <div
          className="faculty-tt-modal-backdrop"
          onClick={() => setSelectedSlot(null)}
          role="presentation"
        >
          <div
            className="faculty-tt-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Lecture Details"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="faculty-tt-modal-header">
              <div className="modal-header-info">
                <div className="modal-header-icon">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="modal-title">Lecture Details</h3>
                  <span className="modal-subtitle">
                    {selectedSlot.dayName} · {selectedSlot.periodName || `Period ${selectedSlot.periodNumber || ""}`} ({formatSlotTimeRange(selectedSlot.startTime, selectedSlot.endTime) || `${formatTime12h(selectedSlot.startTime)} – ${formatTime12h(selectedSlot.endTime)}`})
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedSlot(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="faculty-tt-modal-body">
              {/* Subject Banner */}
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
                    <CheckCircle2 size={12} /> Scheduled Lecture
                  </span>
                </div>
                <h4 className="modal-subject-name">{selectedSlot.subjectName || "Subject"}</h4>
                {(selectedSlot.academicLevelName || selectedSlot.programName || selectedSlot.boardName) && (
                  <div className="modal-academic-path">
                    {selectedSlot.academicLevelName && <span>{selectedSlot.academicLevelName}</span>}
                    {selectedSlot.academicLevelName && (selectedSlot.programName || selectedSlot.groupName) && (
                      <ChevronRight size={12} />
                    )}
                    {(selectedSlot.groupName || selectedSlot.programName) && (
                      <span>{selectedSlot.groupName || selectedSlot.programName}</span>
                    )}
                    {selectedSlot.boardName && <ChevronRight size={12} />}
                    {selectedSlot.boardName && <span>{selectedSlot.boardName}</span>}
                  </div>
                )}
              </div>

              {/* 2-Column Details Grid with Clean Alignments */}
              <div className="modal-details-grid">
                <div className="modal-detail-item">
                  <span className="detail-label">Classroom / Venue</span>
                  <strong className="detail-value">
                    <span className="detail-icon">📍</span>
                    <span>
                      {String(selectedSlot.roomName || selectedSlot.roomCode || "").startsWith("Room")
                        ? selectedSlot.roomName || selectedSlot.roomCode
                        : `Room ${selectedSlot.roomName || selectedSlot.roomCode || "—"}`}
                    </span>
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Period Timing</span>
                  <strong className="detail-value">
                    <span className="detail-icon">⏱️</span>
                    <span>
                      {selectedSlot.periodName || `Period ${selectedSlot.periodNumber || ""}`} (
                      {formatTime12h(selectedSlot.startTime)} – {formatTime12h(selectedSlot.endTime)})
                    </span>
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Group & Section</span>
                  <strong className="detail-value">
                    <span className="detail-icon">📚</span>
                    <span>
                      {selectedSlot.groupName ? `${selectedSlot.groupName} — ` : ""}
                      {selectedSlot.sectionName || "Section"}
                    </span>
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Academic Year</span>
                  <strong className="detail-value">
                    <span className="detail-icon">🗓️</span>
                    <span>{selectedSlot.academicYearName || "2026-2027"}</span>
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Faculty Member</span>
                  <strong className="detail-value">
                    <span className="detail-icon">👤</span>
                    <span>
                      {selectedSlot.facultyName || effectiveFacultyName}
                      {profileData.employeeId ? ` (${profileData.employeeId})` : ""}
                    </span>
                  </strong>
                </div>

                <div className="modal-detail-item">
                  <span className="detail-label">Lecture Type / Remarks</span>
                  <strong className="detail-value">
                    <span className="detail-icon">📝</span>
                    <span>{selectedSlot.remarks || "Theory Lecture"}</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="faculty-tt-modal-footer">
              <button
                type="button"
                className="faculty-tt-modal-btn btn-primary"
                onClick={() => {
                  setSelectedSlot(null);
                  navigate("/faculty-dashboard/classes");
                }}
              >
                Go to Class →
              </button>
              <button
                type="button"
                className="faculty-tt-modal-btn btn-secondary"
                onClick={() => setSelectedSlot(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
