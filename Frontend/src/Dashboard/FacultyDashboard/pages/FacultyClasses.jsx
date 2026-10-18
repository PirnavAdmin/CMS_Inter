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
  Building,
  CheckCircle2,
} from "lucide-react";
import "../styles/FacultyClasses.css";
import { useFaculty } from "../FacultyContext.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import { getStaffSubjectAllocations, getStaffWorkload } from "@/api/staffApi.js";
import apiClient from "@/api/axios.js";

export default function FacultyClasses() {
  const { profileData } = useFaculty() || {};
  const authUser = useMemo(() => getAuthUser() || {}, []);

  const staffId = useMemo(() => {
    return (
      profileData?.id ||
      profileData?.facultyId ||
      authUser.staffId ||
      authUser.id ||
      null
    );
  }, [profileData, authUser]);

  const [allocations, setAllocations] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");

  const loadClassesData = useCallback(async () => {
    if (!staffId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [allocRes, workloadRes, ttRes] = await Promise.allSettled([
        getStaffSubjectAllocations(staffId),
        getStaffWorkload(staffId),
        apiClient.get(`/api/v1/timetable/faculty/${staffId}`).catch(() => ({ data: [] })),
      ]);

      let allocData = [];
      if (allocRes.status === "fulfilled" && allocRes.value?.data) {
        allocData = Array.isArray(allocRes.value.data) ? allocRes.value.data : [];
      }

      let workloadData = null;
      if (workloadRes.status === "fulfilled" && workloadRes.value?.data) {
        workloadData = workloadRes.value.data;
      }

      let ttData = [];
      if (ttRes.status === "fulfilled" && ttRes.value?.data) {
        ttData = Array.isArray(ttRes.value.data) ? ttRes.value.data : [];
      }

      setAllocations(allocData);
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

  // Merge timetable room info into allocations if available
  const mergedClasses = useMemo(() => {
    if (!allocations.length && timetableSlots.length) {
      // Derive unique classes from timetable slots if subject-allocations endpoint returned empty
      const seen = new Set();
      const derived = [];
      timetableSlots.forEach((slot) => {
        const key = `${slot.subjectCode || slot.subjectName}-${slot.sectionName || slot.sectionId}`;
        if (!seen.has(key) && (slot.subjectName || slot.subjectCode)) {
          seen.add(key);
          derived.push({
            id: slot.id,
            subjectId: slot.subjectId,
            subjectCode: slot.subjectCode || "SUB",
            subjectName: slot.subjectName || "Subject",
            sectionName: slot.sectionName || "Section A",
            groupName: slot.groupName || slot.groupCode || "General",
            academicLevelName: slot.academicLevelName || slot.levelName || "Intermediate",
            boardName: slot.boardName || "State Board",
            roomName: slot.roomName || slot.roomNumber || `Room ${slot.roomId || "101"}`,
            maxWeeklyHours: 6,
            status: "Active",
          });
        }
      });
      return derived;
    }

    return allocations.map((alloc) => {
      // Find matching timetable room if any
      const matchingSlot = timetableSlots.find(
        (tt) =>
          tt.subjectId === alloc.subjectId ||
          tt.subjectCode === alloc.subjectCode ||
          (tt.sectionName && alloc.sectionName && tt.sectionName.toLowerCase() === alloc.sectionName.toLowerCase())
      );
      return {
        ...alloc,
        roomName: matchingSlot?.roomName || matchingSlot?.roomNumber || "Assigned by Timetable",
      };
    });
  }, [allocations, timetableSlots]);

  // Group filter options
  const groupOptions = useMemo(() => {
    const set = new Set();
    mergedClasses.forEach((c) => {
      if (c.groupName) set.add(c.groupName);
    });
    return Array.from(set);
  }, [mergedClasses]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return mergedClasses.filter((item) => {
      const matchSearch =
        !searchTerm ||
        (item.subjectName && item.subjectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.subjectCode && item.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.sectionName && item.sectionName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.groupName && item.groupName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchGroup = selectedGroup === "ALL" || item.groupName === selectedGroup;

      return matchSearch && matchGroup;
    });
  }, [mergedClasses, searchTerm, selectedGroup]);

  // Derived KPI counters
  const totalSubjects = mergedClasses.length;
  const totalWeeklyHours = workload?.totalWeeklyHours ?? mergedClasses.reduce((sum, c) => sum + (c.maxWeeklyHours || 0), 0);
  const activeSections = useMemo(() => {
    const s = new Set();
    mergedClasses.forEach((c) => {
      if (c.sectionName) s.add(c.sectionName);
    });
    return s.size;
  }, [mergedClasses]);

  return (
    <div className="faculty-classes-container">
      {/* Page Header */}
      <div className="cms-page-head">
        <div>
          <h1 className="cms-page-title">My Assigned Classes</h1>
          <p className="cms-page-subtitle">
            Curriculum subjects, assigned sections, and weekly contact hours from the institutional database.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="cms-btn cms-btn-outline"
            onClick={loadClassesData}
            disabled={isLoading}
            title="Refresh class allocations from database"
          >
            <RefreshCw size={15} className={isLoading ? "cms-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="faculty-classes-kpis">
        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#eef2ff", color: "#4f46e5" }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div className="kpi-value">{totalSubjects}</div>
            <div className="kpi-label">Allocated Subjects</div>
          </div>
        </div>

        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="kpi-value">{totalWeeklyHours} hrs</div>
            <div className="kpi-label">Weekly Contact Hours</div>
          </div>
        </div>

        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
            <Users size={22} />
          </div>
          <div>
            <div className="kpi-value">{activeSections || totalSubjects}</div>
            <div className="kpi-label">Assigned Sections</div>
          </div>
        </div>

        <div className="faculty-class-kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#f3e8ff", color: "#9333ea" }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div className="kpi-value">{profileData?.department || authUser.department || "Science & Arts"}</div>
            <div className="kpi-label">Department</div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="cms-card">
        {/* Controls: Search & Group Filter */}
        <div className="cms-card-head" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1, minWidth: "260px" }}>
            <div className="faculty-classes-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search subject, code, section..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="faculty-classes-search-input"
              />
            </div>
            {groupOptions.length > 0 && (
              <select
                className="faculty-classes-select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
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
            Showing <strong>{filteredClasses.length}</strong> of {mergedClasses.length} assignments
          </div>
        </div>

        <div className="cms-card-body">
          {isLoading ? (
            <div className="faculty-classes-loading">
              <RefreshCw size={26} className="cms-spin" style={{ color: "var(--cms-primary, #6F8400)" }} />
              <p>Fetching class assignments from the database...</p>
            </div>
          ) : error ? (
            <div className="faculty-classes-alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="faculty-classes-empty">
              <Layers size={40} style={{ opacity: 0.4, marginBottom: "12px" }} />
              <h3>No Assigned Classes Found</h3>
              <p>
                {searchTerm || selectedGroup !== "ALL"
                  ? "No subjects match your search or filter criteria."
                  : "No subject allocations are recorded in the institutional database for your staff account yet. Allocations can be configured by the Academic Administrator."}
              </p>
            </div>
          ) : (
            <div className="cms-table-wrap">
              <table className="cms-table faculty-classes-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Group / Stream</th>
                    <th>Academic Level</th>
                    <th>Section</th>
                    <th>Weekly Contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((item, idx) => (
                    <tr key={item.id || `${item.subjectCode}-${idx}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--cms-text-primary, #1e293b)" }}>
                          {item.subjectName}
                        </div>
                        {item.boardName && (
                          <div style={{ fontSize: "11px", color: "var(--cms-text-secondary, #64748b)" }}>
                            {item.boardName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="cms-badge cms-badge-code">
                          {item.subjectCode || "N/A"}
                        </span>
                      </td>
                      <td>
                        <span className="cms-badge cms-badge-group">
                          {item.groupName || "General"}
                        </span>
                      </td>
                      <td>{item.academicLevelName || "Intermediate"}</td>
                      <td>
                        <span className="cms-badge cms-badge-section">
                          {item.sectionName || item.section || "All Sections"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={13} style={{ color: "#64748b" }} />
                          <span>{item.maxWeeklyHours || 4} hrs/wk</span>
                        </div>
                      </td>
                      <td>
                        <span className="cms-badge cms-badge-status-active">
                          <CheckCircle2 size={11} style={{ marginRight: "4px" }} />
                          {item.status || "Allocated"}
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
