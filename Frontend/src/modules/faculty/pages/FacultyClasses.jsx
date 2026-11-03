import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Users,
  AlertCircle,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import "../styles/FacultyClasses.css";
import { useFaculty } from "../FacultyContext.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { getStaffWorkload } from "@/api/staffApi.js";
import apiClient from "@/api/axios.js";

// Helper to format time strings (e.g., "09:00:00" -> "09:00 AM")
const formatTime = (t) => {
  if (!t) return "";
  const parts = String(t).split(":");
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return t;
};

const formatTimeRange = (start, end) => {
  if (!start && !end) return "";
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e}`;
  return s || e;
};

export default function FacultyClasses() {
  const { profileData } = useFaculty() || {};
  const authUser = useMemo(() => getAuthUser() || {}, []);

  const staffId = useMemo(() => {
    return (
      profileData?.id ||
      profileData?.facultyId ||
      profileData?.staffId ||
      authUser.staffId ||
      authUser.id ||
      null
    );
  }, [profileData, authUser]);

  // Current day of week info
  const todayDate = useMemo(() => new Date(), []);
  const dayNames = useMemo(
    () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    []
  );
  const todayDayName = dayNames[todayDate.getDay()];
  const todayDayIndex = todayDate.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, ...

  const [workload, setWorkload] = useState(null);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters: Search, Group, and Day (defaults strictly to "TODAY")
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedDay, setSelectedDay] = useState("TODAY");

  const loadClassesData = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [workloadRes, ttRes] = await Promise.allSettled([
        getStaffWorkload(staffId),
        apiClient.get(`/api/v1/timetable/faculty/${staffId}`).catch(() => ({ data: [] })),
      ]);

      let workloadData = null;
      if (workloadRes.status === "fulfilled" && workloadRes.value?.data) {
        workloadData = workloadRes.value.data?.data ?? workloadRes.value.data;
      }
      if (!workloadData) {
        try {
          const directWl = await apiClient.get(`/api/v1/staff/workload/${staffId}`).catch(() => null);
          if (directWl?.data) {
            workloadData = directWl.data?.data ?? directWl.data;
          }
        } catch (e) {
          // ignore
        }
      }

      let ttData = [];
      if (ttRes.status === "fulfilled" && ttRes.value?.data) {
        const raw = ttRes.value.data?.data ?? ttRes.value.data;
        ttData = Array.isArray(raw) ? raw : [];
      }
      if (!ttData.length) {
        try {
          const directTt = await apiClient.get(`/api/v1/timetable/faculty/${staffId}`).catch(() => null);
          const raw = directTt?.data?.data ?? directTt?.data;
          if (Array.isArray(raw)) ttData = raw;
        } catch (e) {
          // ignore
        }
      }

      setWorkload(workloadData);
      setTimetableSlots(ttData);
    } catch (err) {
      console.warn("[FacultyClasses] Error fetching classes data:", err);
      setError("Unable to load class assignments from the server.");
    } finally {
      setIsLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    loadClassesData();
  }, [loadClassesData]);

  // Available groups for filter dropdown
  const groupOptions = useMemo(() => {
    const set = new Set();
    timetableSlots.forEach((slot) => {
      const g = slot.groupName || slot.groupCode;
      if (g) set.add(g);
    });
    return Array.from(set);
  }, [timetableSlots]);

  // Available days present in timetable schedule
  const availableDays = useMemo(() => {
    const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const present = new Set(timetableSlots.map((s) => s.dayName).filter(Boolean));
    return order.filter((d) => present.has(d));
  }, [timetableSlots]);

  // Derived filtered classes to display (strictly Today's scheduled classes by default)
  const displayedClasses = useMemo(() => {
    return timetableSlots
      .filter((slot) => {
        // 1. Day of week filter (Defaults to TODAY)
        if (selectedDay === "TODAY") {
          const matchDayName =
            slot.dayName && slot.dayName.toLowerCase() === todayDayName.toLowerCase();
          const matchDayNum =
            slot.dayOfWeek != null &&
            ((todayDayIndex === 0 && (slot.dayOfWeek === 0 || slot.dayOfWeek === 7)) ||
              slot.dayOfWeek === todayDayIndex);
          if (!matchDayName && !matchDayNum) return false;
        } else if (selectedDay !== "ALL") {
          const matchDayName =
            slot.dayName && slot.dayName.toLowerCase() === selectedDay.toLowerCase();
          if (!matchDayName) return false;
        }

        // 2. Group filter
        if (selectedGroup !== "ALL") {
          const grp = slot.groupName || slot.groupCode || "";
          if (grp !== selectedGroup) return false;
        }

        // 3. Search filter
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const match =
            (slot.subjectName && slot.subjectName.toLowerCase().includes(term)) ||
            (slot.subjectCode && slot.subjectCode.toLowerCase().includes(term)) ||
            (slot.sectionName && slot.sectionName.toLowerCase().includes(term)) ||
            (slot.groupName && slot.groupName.toLowerCase().includes(term)) ||
            (slot.academicLevelName && slot.academicLevelName.toLowerCase().includes(term)) ||
            (slot.roomName && slot.roomName.toLowerCase().includes(term)) ||
            (slot.roomCode && slot.roomCode.toLowerCase().includes(term)) ||
            (slot.periodName && slot.periodName.toLowerCase().includes(term));
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // If "ALL" days selected, sort by dayOfWeek first
        if (selectedDay === "ALL" && a.dayOfWeek !== b.dayOfWeek) {
          return (a.dayOfWeek || 0) - (b.dayOfWeek || 0);
        }
        // Otherwise sort chronologically by startTime or periodNumber
        const timeA = a.startTime || "";
        const timeB = b.startTime || "";
        if (timeA && timeB) return timeA.localeCompare(timeB);
        return (a.periodNumber || 0) - (b.periodNumber || 0);
      });
  }, [timetableSlots, selectedDay, todayDayName, todayDayIndex, selectedGroup, searchTerm]);

  // Classes count for today specifically
  const todayClassesCount = useMemo(() => {
    return timetableSlots.filter((slot) => {
      const matchDayName =
        slot.dayName && slot.dayName.toLowerCase() === todayDayName.toLowerCase();
      const matchDayNum =
        slot.dayOfWeek != null &&
        ((todayDayIndex === 0 && (slot.dayOfWeek === 0 || slot.dayOfWeek === 7)) ||
          slot.dayOfWeek === todayDayIndex);
      return matchDayName || matchDayNum;
    }).length;
  }, [timetableSlots, todayDayName, todayDayIndex]);

  // Authoritative KPI Metrics Sourced from http://localhost:5173/api/v1/staff/workload/{staffId}
  const totalWeeklyHours = useMemo(() => {
    if (workload?.totalAllocatedWeeklyHours != null) return workload.totalAllocatedWeeklyHours;
    if (workload?.totalWorkloadHours != null) return workload.totalWorkloadHours;
    if (workload?.weeklyClasses != null) return workload.weeklyClasses;
    return timetableSlots.length || 0;
  }, [workload, timetableSlots]);

  const totalAllocatedSubjects = useMemo(() => {
    if (workload?.totalAllocatedSubjects != null) return workload.totalAllocatedSubjects;
    if (workload?.totalAssignedSubjects != null) return workload.totalAssignedSubjects;
    const distinct = new Set(timetableSlots.map((s) => s.subjectId || s.subjectName).filter(Boolean));
    return distinct.size || 0;
  }, [workload, timetableSlots]);

  const assignedSectionsCount = useMemo(() => {
    if (workload?.totalSections != null) return workload.totalSections;
    const distinct = new Set(timetableSlots.map((s) => s.sectionName || s.sectionId).filter(Boolean));
    return distinct.size || 0;
  }, [workload, timetableSlots]);

  const departmentName = useMemo(() => {
    return workload?.department || profileData?.department || authUser.department || "Chemistry";
  }, [workload, profileData, authUser]);

  return (
    <div className="faculty-classes-container">
      {/* Page Header */}
      <div className="cms-page-head">
        <div>
          <h1 className="cms-page-title">My Assigned Classes</h1>
          <p className="cms-page-subtitle">
            Today's scheduled classes, assigned sections, and classroom venues from the institutional database.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="cms-btn cms-btn-outline"
            onClick={loadClassesData}
            disabled={isLoading}
            title="Refresh class assignments from database"
          >
            <RefreshCw size={15} className={isLoading ? "cms-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Sourced from Staff Workload API http://localhost:5173/api/v1/staff/workload/{staffId} */}
      <div className="faculty-classes-kpis">
        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "rgba(79, 70, 229, 0.12)", color: "#4f46e5" }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div className="kpi-value">{totalAllocatedSubjects}</div>
            <div className="kpi-label">Allocated Subjects</div>
          </div>
        </div>

        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "rgba(5, 150, 105, 0.12)", color: "#059669" }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="kpi-value">{totalWeeklyHours} hrs</div>
            <div className="kpi-label">Weekly Contact Hours</div>
          </div>
        </div>

        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "rgba(217, 119, 6, 0.12)", color: "#d97706" }}>
            <Users size={22} />
          </div>
          <div>
            <div className="kpi-value">{assignedSectionsCount}</div>
            <div className="kpi-label">Assigned Sections</div>
          </div>
        </div>

        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "rgba(147, 51, 234, 0.12)", color: "#9333ea" }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="kpi-value">{departmentName}</div>
            <div className="kpi-label">Department</div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="cms-card">
        {/* Controls: Search, Day Selector, & Group Filter */}
        <div
          className="cms-card-head"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flex: 1,
              minWidth: "260px",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div className="faculty-classes-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search subject, section, room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="faculty-classes-search-input"
              />
            </div>

            {/* Day Selector (Defaults to Today) */}
            <select
              className="faculty-classes-select"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              title="Filter classes by day"
            >
              <option value="TODAY">Today ({todayDayName})</option>
              <option value="ALL">All Days</option>
              {availableDays.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Group Filter */}
            {groupOptions.length > 0 && (
              <select
                className="faculty-classes-select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                title="Filter by Group / Stream"
              >
                <option value="ALL">All Groups</option>
                {groupOptions.map((grp) => (
                  <option key={grp} value={grp}>
                    {grp}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="faculty-classes-count">
            Showing <strong>{displayedClasses.length}</strong>{" "}
            {selectedDay === "TODAY" ? `classes for today (${todayDayName})` : "classes"}
          </div>
        </div>

        <div className="cms-card-body">
          {isLoading ? (
            <div className="faculty-classes-loading">
              <RefreshCw size={26} className="cms-spin" style={{ color: "var(--cms-primary, #6F8400)" }} />
              <p>Fetching scheduled classes from institutional timetable...</p>
            </div>
          ) : error ? (
            <div className="faculty-classes-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : displayedClasses.length === 0 ? (
            <div className="faculty-classes-empty">
              <Layers size={40} style={{ opacity: 0.4, marginBottom: "12px" }} />
              <h3>
                {selectedDay === "TODAY"
                  ? `No Classes Scheduled for Today (${todayDayName})`
                  : "No Scheduled Classes Found"}
              </h3>
              <p>
                {selectedDay === "TODAY"
                  ? `You have no lectures scheduled for today (${todayDayName}) in the timetable database.`
                  : searchTerm || selectedGroup !== "ALL"
                  ? "No classes match your search or filter criteria."
                  : "No timetable slots are recorded in the institutional database for your faculty account."}
              </p>
              {selectedDay === "TODAY" && timetableSlots.length > 0 && (
                <button
                  type="button"
                  className="cms-btn cms-btn-outline"
                  style={{ marginTop: "12px" }}
                  onClick={() => setSelectedDay("ALL")}
                >
                  View Full Weekly Schedule ({timetableSlots.length} Classes)
                </button>
              )}
            </div>
          ) : (
            <div className="cms-table-wrap">
              <table className="cms-table faculty-classes-table">
                <thead>
                  <tr>
                    <th>Period / Time</th>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Group / Stream</th>
                    <th>Academic Level</th>
                    <th>Section</th>
                    <th>Room</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedClasses.map((item, idx) => (
                    <tr key={item.id || `${item.dayName}-${item.periodNumber}-${item.sectionId}-${idx}`}>
                      {/* Period / Time Column */}
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--cms-text-primary, #1e293b)" }}>
                          {item.periodName || (item.periodNumber ? `Period ${item.periodNumber}` : "Period")}
                        </div>
                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "var(--cms-text-secondary, #64748b)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "2px",
                          }}
                        >
                          <Clock size={11} />
                          <span>{formatTimeRange(item.startTime, item.endTime)}</span>
                        </div>
                        {selectedDay === "ALL" && item.dayName && (
                          <span className="cms-badge cms-badge-day" style={{ marginTop: "4px" }}>
                            {item.dayName}
                          </span>
                        )}
                      </td>

                      {/* Subject */}
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--cms-text-primary, #1e293b)" }}>
                          {item.subjectName || "Subject"}
                        </div>
                        {item.boardName && (
                          <div style={{ fontSize: "11px", color: "var(--cms-text-secondary, #64748b)" }}>
                            {item.boardName}
                          </div>
                        )}
                      </td>

                      {/* Code */}
                      <td>
                        <span className="cms-badge cms-badge-code">
                          {item.subjectCode || "N/A"}
                        </span>
                      </td>

                      {/* Group / Stream */}
                      <td>
                        <span className="cms-badge cms-badge-group">
                          {item.groupName || item.groupCode || "General"}
                        </span>
                      </td>

                      {/* Academic Level */}
                      <td>{item.academicLevelName || item.levelName || "Intermediate"}</td>

                      {/* Section (Displays the exact section the faculty is going to teach) */}
                      <td>
                        <span className="cms-badge cms-badge-section">
                          {item.sectionName || `Section #${item.sectionId}`}
                        </span>
                      </td>

                      {/* Room */}
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "var(--cms-text-secondary, #64748b)",
                            fontSize: "12.5px",
                          }}
                        >
                          <MapPin size={13} style={{ color: "var(--cms-primary, #6F8400)" }} />
                          <span>Room {item.roomName || item.roomCode || item.roomId || "101"}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className="cms-badge cms-badge-status-active">
                          <CheckCircle2 size={11} style={{ marginRight: "4px" }} />
                          {item.slotType || (item.isPublished ? "Scheduled" : "Active")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
