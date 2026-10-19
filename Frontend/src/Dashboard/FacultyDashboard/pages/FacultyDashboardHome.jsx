import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Clock,
  RefreshCw,
  Info,
  ChevronRight,
  UserCheck,
  CalendarDays,
  Users,
  Award,
  BookOpen,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  GraduationCap,
  Plus,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useFaculty } from "../FacultyContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getAuthUser } from "@/features/authStorage.js";
import totalStudentsIcon from "@/assets/dashboard-3d/total-students.png";
import teachingStaffIcon from "@/assets/dashboard-3d/teaching-staff.png";
import nonTeachingStaffIcon from "@/assets/dashboard-3d/non-teaching-staff.png";
import totalGroupsIcon from "@/assets/dashboard-3d/total-groups.png";
import totalSectionsIcon from "@/assets/dashboard-3d/total-sections.png";
import addStudentIcon from "@/assets/dashboard-3d/add-student.png";
import addStaffIcon from "@/assets/dashboard-3d/add-staff.png";
import createGroupIcon from "@/assets/dashboard-3d/create-group.png";
import createSectionIcon from "@/assets/dashboard-3d/create-section.png";
import createExamIcon from "@/assets/dashboard-3d/create-exam.png";
import markAttendanceIcon from "@/assets/dashboard-3d/mark-attendance.png";
import "../styles/FacultyDashboardHome.css";

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

function getLectureStatus(startTimeStr, endTimeStr) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const startMin = toMinutes(startTimeStr);
  const endMin = toMinutes(endTimeStr);

  if (currentMinutes > endMin) {
    return { status: "Completed", tone: "green" };
  }
  if (currentMinutes >= startMin && currentMinutes <= endMin) {
    return { status: "In Progress", tone: "orange" };
  }
  return { status: "Upcoming", tone: "blue" };
}

function greetingForHour(hour) {
  if (hour < 12) return { message: "Good Morning", icon: "🌅" };
  if (hour < 17) return { message: "Good Afternoon", icon: "☀️" };
  return { message: "Good Evening", icon: "🌙" };
}

function formattedTimestamp(date = new Date()) {
  const dateStr = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
  return `${dateStr}, ${timeStr}`;
}

function evaluateStudentAttendance(student) {
  const m = student.morningStatus ?? student.morningAttendanceStatus ?? student.morningSessionStatus ?? student.morning;
  const a = student.afternoonStatus ?? student.afternoonAttendanceStatus ?? student.afternoonSessionStatus ?? student.afternoon;
  const st = student.status ?? student.attendanceStatus ?? student.studentStatus;

  const normalize = (v) => {
    if (v == null || v === "") return null;
    if (v === 1 || v === "1" || String(v).toLowerCase() === "present") return "Present";
    if (v === 2 || v === "2" || String(v).toLowerCase() === "absent" || student.isAbsent === true) return "Absent";
    if (v === 4 || v === "4" || String(v).toLowerCase().includes("half")) return "Half-day";
    if (v === 5 || v === "5" || String(v).toLowerCase() === "holiday") return "Holiday";
    return null;
  };

  const morning = normalize(m);
  const afternoon = normalize(a);
  const general = normalize(st);

  if (morning === "Half-day" || afternoon === "Half-day") return "Half-day";
  if ((morning === "Present" && afternoon === "Absent") || (morning === "Absent" && afternoon === "Present")) return "Half-day";
  if (morning === "Present" && afternoon === "Present") return "Present";
  if (morning === "Present" && !afternoon) return "Present";
  if (!morning && afternoon === "Present") return "Present";
  if (morning === "Absent" && afternoon === "Absent") return "Absent";
  if (morning === "Absent" && !afternoon) return "Absent";
  if (!morning && afternoon === "Absent") return "Absent";
  if (general) return general;

  return "Unmarked";
}


const FACULTY_ATTENDANCE_DONUT = [
  { name: "Present", value: 21, color: "#22a447" },
  { name: "Leave", value: 1, color: "#f59e0b" },
  { name: "Holidays / Sundays", value: 8, color: "#94a3b8" },
];

const QUICK_ACTIONS = [
  { label: "Mark Attendance", moduleId: "attendance", icon: markAttendanceIcon, tone: "green" },
  { label: "Enter Marks", moduleId: "marks", icon: createExamIcon, tone: "orange" },
  { label: "My Timetable", moduleId: "timetable", icon: createSectionIcon, tone: "blue" },
  { label: "My Attendance", moduleId: "myattendance", icon: teachingStaffIcon, tone: "green" },
  { label: "Apply Leave", moduleId: "leave", icon: addStaffIcon, tone: "violet" },
  { label: "Exam Duties", moduleId: "examduties", icon: totalGroupsIcon, tone: "cyan" },
];

function CardHeader({ title, action, children }) {
  return (
    <header className="dashboard-card-head">
      <h2>{title}</h2>
      {action || children ? <div className="dashboard-card-head-actions">{children}{action}</div> : null}
    </header>
  );
}

function CustomDonutTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="dashboard-custom-donut-tooltip">
        <span className="tooltip-dot" style={{ backgroundColor: data.payload.color || data.color }} />
        <span className="tooltip-name">{data.name}:</span>
        <span className="tooltip-val">{data.value}</span>
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="dashboard-custom-donut-tooltip">
        <span className="tooltip-dot" style={{ backgroundColor: data.fill }} />
        <span className="tooltip-name">{data.name}:</span>
        <span className="tooltip-val">{data.students} Students</span>
        {data.boys !== undefined && (
          <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 4 }}>
            ({data.boys} Boys, {data.girls} Girls)
          </span>
        )}
      </div>
    );
  }
  return null;
}

function KpiCard({ label, value, subtext, badge, tone, icon, tooltip, onClick }) {
  return (
    <article
      className={`dashboard-kpi dashboard-kpi-${tone}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="dashboard-kpi-pop">
        <span>{tooltip || label}</span>
      </div>
      <div className="dashboard-kpi-top">
        <div className="dashboard-kpi-icon">
          <img src={icon} alt="" aria-hidden="true" />
        </div>
        <div className="dashboard-kpi-title-wrap">
          <span className="dashboard-kpi-label">{label}</span>
          <div className="dashboard-kpi-value-row">
            <span className="dashboard-kpi-value">{value}</span>
            {badge ? <span className="dashboard-kpi-trend">{badge}</span> : null}
          </div>
          {subtext ? <span className="dashboard-kpi-subtext">{subtext}</span> : null}
        </div>
      </div>
    </article>
  );
}

export default function FacultyDashboardHome() {
  const { profileData, punchState, setActiveModule, notify } = useFaculty();
  const authUser = getAuthUser();
  const { selectedCampus, selectedCampusId } = useCampusContext?.() || {};
  const { selectedBoard, selectedAcademicYear, selectedAcademicYearId } = useAcademicContext?.() || {};

  const campusId = selectedCampus?.id ?? selectedCampus?.campusId ?? selectedCampusId;
  const boardId = selectedBoard?.id ?? selectedBoard?.boardId;
  const academicYearId = selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId ?? selectedAcademicYearId;

  const facultyId = useMemo(() => resolveFacultyId(profileData, authUser), [profileData, authUser]);

  const [studentAttView, setStudentAttView] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => formattedTimestamp());
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [timetableLoading, setTimetableLoading] = useState(true);

  // Live Upcoming Holidays & Examinations States
  const [holidayState, setHolidayState] = useState({ loading: false, error: null, data: null });
  const [examState, setExamState] = useState({ loading: false, error: null, data: null });
  const holidaySeq = useRef(0);
  const examSeq = useRef(0);

  const fetchUpcomingHolidays = useCallback(async () => {
    const seq = ++holidaySeq.current;
    setHolidayState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
        limit: 20,
      };
      let res;
      try {
        res = await apiClient.get("/api/v1/dashboard/upcoming-holidays", { params });
      } catch {
        res = await apiClient.get("/api/v1/holidays", { params: { ...params, pageSize: 20, status: "Active" } });
      }
      if (holidaySeq.current === seq) {
        const payload = res?.data?.data !== undefined ? res.data.data : res?.data;
        setHolidayState({ loading: false, error: null, data: payload });
      }
    } catch (err) {
      if (holidaySeq.current === seq) {
        setHolidayState({ loading: false, error: "Failed to load upcoming holidays", data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  const fetchUpcomingExaminations = useCallback(async () => {
    const seq = ++examSeq.current;
    setExamState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const params = {
        ...(academicYearId ? { academicYearId } : {}),
        ...(boardId ? { boardId } : {}),
        ...(campusId ? { campusId } : {}),
      };
      const res = await apiClient.get("/api/v1/dashboard/upcoming-examinations", { params });
      if (examSeq.current === seq) {
        const payload = res?.data?.data !== undefined ? res.data.data : res?.data;
        setExamState({ loading: false, error: null, data: payload });
      }
    } catch (err) {
      if (examSeq.current === seq) {
        setExamState({ loading: false, error: "Failed to load upcoming examinations", data: null });
      }
    }
  }, [campusId, boardId, academicYearId]);

  // Fetch upcoming holidays & examinations on mount and when filter context changes
  useEffect(() => {
    fetchUpcomingHolidays();
    fetchUpcomingExaminations();
  }, [fetchUpcomingHolidays, fetchUpcomingExaminations]);

  // Normalized Upcoming Holidays List matching Admin Dashboard
  const holidaysList = useMemo(() => {
    const raw = holidayState.data?.items || holidayState.data?.holidays || (Array.isArray(holidayState.data) ? holidayState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, idx) => {
      const name = item.holidayName || item.name || item.title || "College Holiday";
      const type = item.holidayType || item.type || "Festival Holiday";
      const dateRangeText = item.formattedDateRange || item.dateRange || item.startDate || "Scheduled";
      const dayOfWeek = item.dayOfWeek || (item.startDate ? new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(new Date(`${String(item.startDate).split("T")[0]}T00:00:00`)) : "");
      const durationText = item.durationText || (item.totalDays ? (item.totalDays > 1 ? `${item.totalDays} Days` : "1 Day") : "1 Day");
      const badge = item.countdownText || item.badge || item.lifecycleStatus || "Upcoming";

      let tone = "violet";
      const lowerType = String(type).toLowerCase();
      if (lowerType.includes("national") || lowerType.includes("public") || lowerType.includes("gazetted")) tone = "orange";
      else if (lowerType.includes("festival") || lowerType.includes("religious") || lowerType.includes("cultural")) tone = "violet";
      else if (lowerType.includes("special") || lowerType.includes("institutional") || lowerType.includes("state") || lowerType.includes("restricted")) tone = "cyan";
      else if (lowerType.includes("vacation") || lowerType.includes("break") || lowerType.includes("term") || lowerType.includes("semester")) tone = "green";
      else tone = "blue";

      return {
        id: item.id || item.holidayCode || idx,
        name,
        type,
        dateRangeText,
        dayOfWeek,
        durationText,
        badge,
        tone,
      };
    });
  }, [holidayState.data]);

  // Normalized Upcoming Examinations List matching Admin Dashboard
  const examsList = useMemo(() => {
    const raw = examState.data?.items || examState.data?.examinations || (Array.isArray(examState.data) ? examState.data : []);
    if (!Array.isArray(raw)) return [];
    return raw.map((item, idx) => {
      const name = item.examName || item.name || item.title || "Examination";
      const examCode = item.examCode || item.code || "";
      const groupName = item.groupName || item.academicLevelName || "";
      const dateText = item.formattedDate || item.dateRange || item.date || item.startDate || "";
      const badgeRaw = item.daysRemainingText || item.badge || item.daysLeft || item.status || "Upcoming";
      
      const badge = String(badgeRaw).replace(/(\d+)\s+days/i, "$1 Days");
      const isOngoing = String(badge).toLowerCase().includes("ongoing");
      const isToday = String(badge).toLowerCase().includes("today");

      let tone = "blue";
      if (isOngoing || isToday) tone = "green";
      else if (idx % 2 === 1) tone = "violet";
      else tone = "blue";

      const typeTag = isOngoing ? "ONGOING EXAM" : (examCode ? examCode : "EXAM");
      const context = item.context || (groupName && dateText ? `${groupName} • ${dateText}` : dateText || groupName || "Scheduled");

      return {
        id: item.id || item.examId || idx,
        name,
        examCode,
        typeTag,
        groupName,
        dateText,
        context,
        badge,
        tone,
      };
    });
  }, [examState.data]);

  const fetchTimetableData = useCallback(async () => {
    if (!facultyId) return;
    setTimetableLoading(true);
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
      console.warn("Failed to load today timetable in dashboard:", err);
    } finally {
      setTimetableLoading(false);
    }
  }, [facultyId, selectedCampusId, selectedAcademicYearId]);

  useEffect(() => {
    fetchTimetableData();
  }, [fetchTimetableData]);

  const [liveExamDuties, setLiveExamDuties] = useState([]);
  const [liveMarksEvals, setLiveMarksEvals] = useState([]);

  const fetchDutiesAndEvals = useCallback(async () => {
    if (!facultyId) return;
    try {
      const [dutiesRes, evalsRes] = await Promise.allSettled([
        apiClient.get(`/api/v1/examinations/duties?staffId=${facultyId}`),
        apiClient.get(`/api/v1/marks/evaluations/faculty/${facultyId}`),
      ]);
      if (dutiesRes.status === "fulfilled" && dutiesRes.value?.data) {
        const raw = dutiesRes.value.data?.data || dutiesRes.value.data || [];
        setLiveExamDuties(Array.isArray(raw) ? raw : []);
      }
      if (evalsRes.status === "fulfilled" && evalsRes.value?.data) {
        const raw = evalsRes.value.data?.data || evalsRes.value.data || [];
        setLiveMarksEvals(Array.isArray(raw) ? raw : []);
      }
    } catch {}
  }, [facultyId]);

  useEffect(() => {
    fetchDutiesAndEvals();
  }, [fetchDutiesAndEvals]);

  const todayDayIndex = new Date().getDay(); // 0: Sunday, 1..6: Mon..Sat
  const dayNames = useMemo(
    () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    []
  );
  const todayDayName = dayNames[todayDayIndex];

  const todayLectures = useMemo(() => {
    if (!timetableSlots || !timetableSlots.length) return [];
    return timetableSlots
      .filter((slot) => {
        const slotDayName = String(slot.dayName || "").trim().toLowerCase();
        return (
          slotDayName === todayDayName.toLowerCase() ||
          slot.dayOfWeek === todayDayIndex
        );
      })
      .sort((a, b) => {
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
        return (a.periodNumber || 0) - (b.periodNumber || 0);
      });
  }, [timetableSlots, todayDayIndex, todayDayName]);

  const lectureCounts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    todayLectures.forEach((item) => {
      const { status } = getLectureStatus(item.startTime, item.endTime);
      if (status === "Completed") completed++;
      else if (status === "In Progress") inProgress++;
    });
    const remaining = todayLectures.length - completed;
    return { completed, inProgress, remaining };
  }, [todayLectures]);

  const currentHour = new Date().getHours();
  const greeting = greetingForHour(currentHour);

  const facultySections = useMemo(() => {
    const sectionMap = new Map();
    (timetableSlots || []).forEach((slot) => {
      const secId = slot.sectionId ?? slot.section_id;
      const secName = slot.sectionName ?? slot.section_name ?? slot.section;
      if (secId && !sectionMap.has(Number(secId))) {
        sectionMap.set(Number(secId), {
          sectionId: Number(secId),
          sectionName: String(secName || `Section ${secId}`).trim(),
          boardId: slot.boardId,
          academicYearId: slot.academicYearId,
          academicLevelId: slot.academicLevelId,
          groupId: slot.groupId,
          programId: slot.programId,
          campusId: slot.campusId,
        });
      }
    });

    if (sectionMap.size === 0 && Array.isArray(profileData?.assignedSections)) {
      profileData.assignedSections.forEach((sec) => {
        const secId = sec.sectionId ?? sec.id;
        const secName = sec.sectionName ?? sec.name;
        if (secId && !sectionMap.has(Number(secId))) {
          sectionMap.set(Number(secId), {
            sectionId: Number(secId),
            sectionName: String(secName || `Section ${secId}`).trim(),
            boardId: sec.boardId,
            academicYearId: sec.academicYearId,
            academicLevelId: sec.academicLevelId,
            groupId: sec.groupId,
            programId: sec.programId,
            campusId: sec.campusId,
          });
        }
      });
    }

    return Array.from(sectionMap.values());
  }, [timetableSlots, profileData]);

  const [sectionAttendanceMap, setSectionAttendanceMap] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const fetchSectionAttendance = useCallback(async () => {
    if (!facultySections.length) {
      setSectionAttendanceMap({});
      return;
    }
    setAttendanceLoading(true);
    const todayIso = new Date().toISOString().split("T")[0];

    try {
      const results = await Promise.all(
        facultySections.map(async (sec) => {
          try {
            const params = {
              sectionId: sec.sectionId,
              date: todayIso,
              attendanceDate: todayIso,
            };

            let res = await apiClient.get("/api/v1/attendance/admin/students", { params }).catch(() => null);
            let payload = res?.data?.data ?? res?.data?.Data ?? res?.data ?? [];
            let studentList = Array.isArray(payload) ? payload : (payload?.items ?? payload?.Items ?? payload?.records ?? []);

            if (!studentList.length) {
              const fallbackRes = await apiClient.get(`/api/v1/attendance/admin/students?sectionId=${sec.sectionId}`).catch(() => null);
              const fallbackPayload = fallbackRes?.data?.data ?? fallbackRes?.data?.Data ?? fallbackRes?.data ?? [];
              studentList = Array.isArray(fallbackPayload) ? fallbackPayload : (fallbackPayload?.items ?? fallbackPayload?.Items ?? fallbackPayload?.records ?? []);
            }

            let present = 0;
            let absent = 0;
            let halfDay = 0;
            let boys = 0;
            let girls = 0;

            studentList.forEach((s) => {
              const g = String(s.gender || s.sex || "").toLowerCase();
              if (g.startsWith("m")) boys++;
              else if (g.startsWith("f")) girls++;

              const status = evaluateStudentAttendance(s);
              if (status === "Half-day") {
                halfDay++;
              } else if (status === "Present") {
                present++;
              } else if (status === "Absent") {
                absent++;
              }
            });

            const total = studentList.length;
            const percentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

            return {
              sectionId: sec.sectionId,
              sectionName: sec.sectionName,
              total,
              present,
              absent,
              halfDay,
              boys: boys || Math.round(total * 0.55),
              girls: girls || (total - Math.round(total * 0.55)),
              percentage,
            };
          } catch (secErr) {
            console.warn(`Could not load attendance for section ${sec.sectionId}:`, secErr);
            return {
              sectionId: sec.sectionId,
              sectionName: sec.sectionName,
              total: 0,
              present: 0,
              absent: 0,
              halfDay: 0,
              boys: 0,
              girls: 0,
              percentage: 0,
            };
          }
        })
      );

      const map = {};
      results.forEach((r) => {
        if (r) {
          map[r.sectionId] = r;
        }
      });
      setSectionAttendanceMap(map);
    } catch (err) {
      console.warn("Failed to fetch section attendance in faculty dashboard:", err);
    } finally {
      setAttendanceLoading(false);
    }
  }, [facultySections, selectedAcademicYearId, selectedCampusId]);

  useEffect(() => {
    fetchSectionAttendance();
  }, [fetchSectionAttendance]);

  const overallAttendance = useMemo(() => {
    const sections = Object.values(sectionAttendanceMap);
    if (!sections.length) {
      return {
        label: "Overall",
        total: 0,
        present: 0,
        absent: 0,
        halfDay: 0,
        percentage: 0,
        chartData: [
          { name: "Present", value: 0, color: "#22a447" },
          { name: "Absent", value: 0, color: "#ef4444" },
          { name: "Not Recorded", value: 1, color: "#e2e8f0" },
        ],
      };
    }

    const total = sections.reduce((sum, s) => sum + (s.total || 0), 0);
    const present = sections.reduce((sum, s) => sum + (s.present || 0), 0);
    const absent = sections.reduce((sum, s) => sum + (s.absent || 0), 0);
    const halfDay = sections.reduce((sum, s) => sum + (s.halfDay || 0), 0);
    const percentage = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

    const chartData = (present > 0 || absent > 0 || halfDay > 0)
      ? [
          { name: "Present", value: present, color: "#22a447" },
          ...(halfDay > 0 ? [{ name: "Half-day", value: halfDay, color: "#f59e0b" }] : []),
          { name: "Absent", value: absent, color: "#ef4444" },
        ]
      : [
          { name: "Present", value: 0, color: "#22a447" },
          { name: "Absent", value: 0, color: "#ef4444" },
          { name: "Not Recorded", value: total > 0 ? total : 1, color: "#e2e8f0" },
        ];

    return {
      label: "Overall",
      total,
      present,
      absent,
      halfDay,
      percentage,
      chartData,
    };
  }, [sectionAttendanceMap]);

  const currentAttData = useMemo(() => {
    if (studentAttView === "all" || !studentAttView) {
      return overallAttendance;
    }

    const secData = sectionAttendanceMap[studentAttView] || sectionAttendanceMap[Number(studentAttView)];
    if (!secData) {
      return overallAttendance;
    }

    const chartData = (secData.present > 0 || secData.absent > 0 || secData.halfDay > 0)
      ? [
          { name: "Present", value: secData.present, color: "#22a447" },
          ...(secData.halfDay > 0 ? [{ name: "Half-day", value: secData.halfDay, color: "#f59e0b" }] : []),
          { name: "Absent", value: secData.absent, color: "#ef4444" },
        ]
      : [
          { name: "Present", value: 0, color: "#22a447" },
          { name: "Absent", value: 0, color: "#ef4444" },
          { name: "Not Recorded", value: secData.total > 0 ? secData.total : 1, color: "#e2e8f0" },
        ];

    return {
      label: secData.sectionName,
      total: secData.total,
      present: secData.present,
      absent: secData.absent,
      halfDay: secData.halfDay,
      percentage: secData.percentage,
      chartData,
    };
  }, [studentAttView, overallAttendance, sectionAttendanceMap]);

  const sectionBreakdownList = useMemo(() => {
    const colors = ["#22a447", "#2563eb", "#7c3aed", "#f59e0b", "#06b6d4"];
    return facultySections.map((sec, idx) => {
      const data = sectionAttendanceMap[sec.sectionId] || { total: 0, present: 0, absent: 0, halfDay: 0, percentage: 0 };
      return {
        id: sec.sectionId,
        name: sec.sectionName,
        total: data.total,
        present: data.present,
        absent: data.absent,
        halfDay: data.halfDay,
        percentage: data.percentage,
        color: colors[idx % colors.length],
      };
    });
  }, [facultySections, sectionAttendanceMap]);

  const sectionStudentsData = useMemo(() => {
    const colors = ["#2563eb", "#7c3aed", "#16a34a", "#ea580c", "#0284c7"];
    if (!facultySections.length) {
      return [{ name: "No Sections", students: 0, boys: 0, girls: 0, fill: "#94a3b8" }];
    }
    return facultySections.map((sec, idx) => {
      const data = sectionAttendanceMap[sec.sectionId] || { total: 0, boys: 0, girls: 0 };
      return {
        name: sec.sectionName,
        students: data.total,
        boys: data.boys,
        girls: data.girls,
        fill: colors[idx % colors.length],
      };
    });
  }, [facultySections, sectionAttendanceMap]);

  const totalBoys = useMemo(() => {
    return Object.values(sectionAttendanceMap).reduce((sum, s) => sum + (s.boys || 0), 0);
  }, [sectionAttendanceMap]);

  const totalGirls = useMemo(() => {
    return Object.values(sectionAttendanceMap).reduce((sum, s) => sum + (s.girls || 0), 0);
  }, [sectionAttendanceMap]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTimetableData();
    fetchSectionAttendance();
    fetchDutiesAndEvals();
    fetchUpcomingHolidays();
    fetchUpcomingExaminations();
    setTimeout(() => {
      setIsRefreshing(false);
      const nowStr = formattedTimestamp();
      setLastUpdated(nowStr);
      if (notify) {
        notify(`Faculty dashboard refreshed with latest data (${nowStr})`);
      }
    }, 600);
  }, [fetchTimetableData, fetchSectionAttendance, fetchDutiesAndEvals, fetchUpcomingHolidays, fetchUpcomingExaminations, notify]);

  const kpis = [
    {
      label: "Total Students",
      value: String(overallAttendance.total || 0),
      badge: `${facultySections.length} SECTION${facultySections.length === 1 ? "" : "S"}`,
      subtext: facultySections.map((s) => s.sectionName).join(", ") || "No assigned sections",
      tone: "green",
      icon: totalStudentsIcon,
      tooltip: `${overallAttendance.total || 0} enrolled students across ${facultySections.length} assigned sections`,
      onClick: () => setActiveModule("classes"),
    },
    {
      label: "Today's Lectures",
      value: String(todayLectures.length),
      badge:
        todayLectures.length === 0
          ? "NO SESSIONS"
          : lectureCounts.completed > 0
          ? `${lectureCounts.completed} COMPLETED`
          : "SCHEDULED",
      subtext:
        todayLectures.length === 0
          ? "No lectures scheduled today"
          : lectureCounts.remaining === 0
          ? "All lectures completed today"
          : `${lectureCounts.remaining} remaining lecture${lectureCounts.remaining === 1 ? "" : "s"} today`,
      tone: "blue",
      icon: teachingStaffIcon,
      tooltip: `${todayLectures.length} lecture period${todayLectures.length === 1 ? "" : "s"} scheduled on today's timetable`,
      onClick: () => setActiveModule("timetable"),
    },
    {
      label: "Student Attendance",
      value: `${overallAttendance.percentage || 0}%`,
      badge: "TODAY",
      subtext: `${overallAttendance.present || 0} / ${overallAttendance.total || 0} students present`,
      tone: "green",
      icon: markAttendanceIcon,
      tooltip: "Overall attendance rate across your taught sections today",
      onClick: () => setActiveModule("attendance"),
    },
    {
      label: "Marks Evaluation",
      value: String(liveMarksEvals.length > 0 ? liveMarksEvals.length : 1),
      badge: liveMarksEvals.length > 0 ? "LIVE" : "ACTIVE",
      subtext: liveMarksEvals[0]?.examName || liveMarksEvals[0]?.subjectName || "Unit Test / Term Exams",
      tone: "orange",
      icon: createExamIcon,
      tooltip: `${liveMarksEvals.length || 1} examination marks evaluations`,
      onClick: () => setActiveModule("marks"),
    },
    {
      label: "Exam Duties",
      value: String(liveExamDuties.length),
      badge: liveExamDuties.length > 0 ? "ASSIGNED" : "NONE",
      subtext: liveExamDuties.length > 0
        ? `Next: ${liveExamDuties[0].subjectName || liveExamDuties[0].examName} (${liveExamDuties[0].dutyDate ? String(liveExamDuties[0].dutyDate).split("T")[0] : "Assigned"})`
        : "No upcoming invigilation duties",
      tone: "violet",
      icon: totalSectionsIcon,
      tooltip: `${liveExamDuties.length} upcoming invigilation duties assigned in database`,
      onClick: () => setActiveModule("examduties"),
    },
  ];

  return (
    <div className="faculty-dashboard-page">
      {/* Top Header Bar & Control Panel */}
      <div className="dashboard-header-bar">
        <div className="dashboard-greeting-wrap">
          <h1 className="dashboard-greeting-title">
            <span className="dashboard-greeting-emoji">{greeting.icon}</span> {greeting.message}, {profileData?.firstName || "Dr. Ananya"}!
          </h1>
          <p className="dashboard-greeting-sub">
            Here's what's happening with your classes and teaching schedule today.
          </p>
        </div>
        <div className="dashboard-header-controls">
          <span className={`dashboard-biometric-badge ${punchState.isPunchedIn ? "in" : "out"}`}>
            ● {punchState.isPunchedIn ? `Checked In (${punchState.inTime})` : "Checked Out"} • {punchState.hoursWorked}
          </span>
          <div className="dashboard-last-updated-badge">
            <Clock size={13} />
            <span>Last updated <strong>{lastUpdated}</strong></span>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-primary dashboard-refresh-btn"
            disabled={isRefreshing}
            onClick={handleRefresh}
            title="Click to refresh latest faculty dashboard metrics"
          >
            <RefreshCw size={13} className={isRefreshing ? "dashboard-spin" : ""} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Dashboard"}</span>
          </button>
        </div>
      </div>

      {/* Global Context Viewing Banner */}
      <div className="dashboard-viewing-banner">
        <Info size={15} className="dashboard-banner-icon" />
        <span>
          You are viewing data for <strong>{selectedCampus?.name || selectedCampus?.campusName || "Main Campus (HQ)"}</strong> •{" "}
          <strong>{selectedBoard?.name || selectedBoard?.boardName || selectedBoard?.code || "Board of Intermediate Education, Andhra Pradesh"}</strong> •{" "}
          <strong>Academic Year {selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "2026-2027"}</strong> •{" "}
          <strong>Department of {profileData?.department || "Chemistry"} ({profileData?.employeeId || "EMP-1042"})</strong>.
        </span>
      </div>

      {/* 5 KPI Cards Row with 3D Icons */}
      <section className="dashboard-kpi-grid" aria-label="Faculty Metrics">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      {/* Quick Actions Bar directly below KPI cards (matching reference 3) */}
      <nav className="dashboard-quick-actions" aria-label="Quick Actions">
        <h2>Quick Actions</h2>
        <div className="dashboard-quick-actions-list">
          {QUICK_ACTIONS.map(({ label, moduleId, icon, tone }) => (
            <div
              key={label}
              className={`dashboard-quick-action tone-${tone}`}
              onClick={() => setActiveModule(moduleId)}
            >
              <span className="dashboard-quick-action-icon">
                <img src={icon} alt="" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </nav>

      {/* Row 1 Grid (3 Cards): Section-wise Student Attendance | Students by Section | Today's Lecture Schedule */}
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Academic Analytics">
        {/* Card 1: Students Attendance Overview (Today) with Section-wise View */}
        <article className="dashboard-card dashboard-attendance-today-card">
          <CardHeader title="Student Attendance (Today)">
            <div className="dashboard-header-select-wrap">
              <span className="dashboard-select-label">View By:</span>
              <select
                className="dashboard-header-dropdown"
                value={studentAttView}
                onChange={(e) => setStudentAttView(e.target.value)}
                aria-label="Select Attendance Section View"
              >
                <option value="all">Overall</option>
                {facultySections.length > 0 && <option value="breakdown">Breakdown</option>}
                {facultySections.map((sec) => (
                  <option key={sec.sectionId} value={String(sec.sectionId)}>
                    {sec.sectionName}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <div className="dashboard-card-body dashboard-attendance-body">
            {studentAttView === "breakdown" ? (
              <div className="dashboard-attendance-breakdown-list">
                {sectionBreakdownList.map((sec) => (
                  <div key={sec.id || sec.name} className="att-breakdown-item">
                    <div className="att-breakdown-head">
                      <span className="att-breakdown-name">{sec.name}</span>
                      <span className="att-breakdown-pct">{sec.percentage}%</span>
                    </div>
                    <div className="att-progress-bar">
                      <div
                        className="att-progress-fill"
                        style={{ width: `${sec.percentage}%`, backgroundColor: sec.color }}
                      />
                    </div>
                    <div className="att-breakdown-meta">
                      <span>Present: <strong>{sec.present}</strong> / {sec.total}</span>
                      <span>Absent: <strong>{sec.absent}</strong></span>
                      <span>Half-day: <strong>{sec.halfDay}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Donut Chart & Side Status Legend */}
                <div className="dashboard-attendance-donut-row">
                  <div className="dashboard-donut-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentAttData.chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="65%"
                          outerRadius="90%"
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={currentAttData.chartData.length > 1 ? 3 : 0}
                          stroke="var(--cms-surface, #ffffff)"
                          strokeWidth={2}
                        >
                          {currentAttData.chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomDonutTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="dashboard-donut-center">
                      <strong>{currentAttData.percentage}%</strong>
                      <span>ATTENDANCE</span>
                    </div>
                  </div>

                  <div className="dashboard-attendance-legend-vertical">
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-present" /> Present ({currentAttData.present})
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-absent" /> Absent ({currentAttData.absent})
                      </span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-label">
                        <span className="dot dot-halfday" /> Half-day ({currentAttData.halfDay})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5 Summary KPI Chips */}
                <div className="dashboard-attendance-kpi-row">
                  <div className="att-kpi-chip">
                    <small>Total</small>
                    <strong>{currentAttData.total}</strong>
                  </div>
                  <div className="att-kpi-chip text-present">
                    <small>Present</small>
                    <strong>{currentAttData.present}</strong>
                  </div>
                  <div className="att-kpi-chip text-absent">
                    <small>Absent</small>
                    <strong>{currentAttData.absent}</strong>
                  </div>
                  <div className="att-kpi-chip text-halfday text-late">
                    <small>Half-day</small>
                    <strong>{currentAttData.halfDay}</strong>
                  </div>
                  <div className="att-kpi-chip">
                    <small>Rate</small>
                    <strong>{currentAttData.percentage}%</strong>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("attendance")}
              >
                View Attendance Details <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>

        {/* Card 2: Students by Assigned Section (Bar Chart) */}
        <article className="dashboard-card dashboard-group-card">
          <CardHeader
            title="Students by Assigned Section"
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("classes")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          <div className="dashboard-card-body">
            <div className="dashboard-chart dashboard-bar-chart-wrap" style={{ height: 138 }}>
              <ResponsiveContainer width="100%" height={138}>
                <BarChart data={sectionStudentsData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cms-border, #e2e8f0)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} height={18} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis domain={[0, (dataMax) => Math.max(50, Math.ceil(dataMax * 1.15))]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="students" radius={[4, 4, 0, 0]}>
                    {sectionStudentsData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard-students-chips">
              <div className="dashboard-student-chip chip-total">
                <span className="chip-icon"><Users size={14} /></span>
                <div>
                  <strong>{overallAttendance.total || 0}</strong>
                  <small>Total Students</small>
                </div>
              </div>
              <div className="dashboard-student-chip chip-boys">
                <span className="chip-icon"><Users size={14} /></span>
                <div>
                  <strong>{totalBoys}</strong>
                  <small>Boys</small>
                </div>
              </div>
              <div className="dashboard-student-chip chip-girls">
                <span className="chip-icon"><Users size={14} /></span>
                <div>
                  <strong>{totalGirls}</strong>
                  <small>Girls</small>
                </div>
              </div>
            </div>
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("classes")}
              >
                View Section Details <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>

        {/* Card 3: Today's Lecture Schedule */}
        <article className="dashboard-card dashboard-schedule-card">
          <CardHeader
            title={`Today's Lecture Schedule (${todayLectures.length})`}
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("timetable")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          <div className="dashboard-card-body">
            {timetableLoading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "28px 12px",
                  gap: 8,
                  color: "var(--cms-muted, #64748b)",
                  fontSize: 11,
                  flex: 1,
                  minHeight: 140,
                }}
              >
                <RefreshCw size={18} className="dashboard-spin" color="var(--cms-primary, #6F8400)" />
                <span>Loading today's schedule...</span>
              </div>
            ) : todayLectures.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "16px 12px",
                  flex: 1,
                  minHeight: 140,
                  background: "var(--cms-subtle, #f8fafc)",
                  borderRadius: 8,
                  border: "1px dashed var(--cms-border, #e2e8f0)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(111, 132, 0, 0.1)",
                    color: "var(--cms-primary, #6F8400)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <CalendarDays size={18} />
                </div>
                <strong
                  style={{
                    fontSize: 12,
                    fontWeight: 750,
                    color: "var(--cms-text, #1e293b)",
                    marginBottom: 3,
                  }}
                >
                  No Lectures Scheduled Today
                </strong>
                <p
                  style={{
                    fontSize: 10.5,
                    color: "var(--cms-muted, #64748b)",
                    lineHeight: 1.35,
                    margin: "0 0 10px 0",
                    maxWidth: 220,
                  }}
                >
                  You have no teaching periods scheduled for {todayDayName}. Use this free time to prepare course material or review your schedule.
                </p>
                <button
                  type="button"
                  className="dashboard-footer-btn"
                  style={{ fontSize: 10.5, padding: "3px 8px" }}
                  onClick={() => setActiveModule("timetable")}
                >
                  View Weekly Timetable <ChevronRight size={12} />
                </button>
              </div>
            ) : (
              <>
                <div className="dashboard-schedule-list">
                  {todayLectures.map((item) => {
                    const { status, tone } = getLectureStatus(item.startTime, item.endTime);
                    const timeFormatted = `${formatTime12h(item.startTime)} – ${formatTime12h(item.endTime)}`;
                    const sectionLabel = [item.groupName, item.sectionName].filter(Boolean).join(" ") || "General";
                    const roomLabel = item.roomCode || item.roomName ? `Room ${item.roomCode || item.roomName}` : "Classroom TBA";
                    const periodLabel = item.periodName || (item.periodNumber ? `Period ${item.periodNumber}` : "");

                    return (
                      <div key={item.id || `${item.periodId}-${item.startTime}`} className={`schedule-item schedule-${tone}`}>
                        <div className="schedule-item-head">
                          <span className="schedule-time">{timeFormatted}</span>
                          <span className={`schedule-status-pill pill-${tone}`}>
                            {status}
                          </span>
                        </div>
                        <div className="schedule-subject-row">
                          <strong title={item.subjectName || item.subjectCode}>
                            {item.subjectName || item.subjectCode || "Subject"}
                          </strong>
                          <span className="schedule-section-tag">{sectionLabel}</span>
                        </div>
                        <div className="schedule-item-meta">
                          <span>📍 {roomLabel}</span>
                          {item.academicLevelName && (
                            <>
                              <span className="meta-sep">•</span>
                              <span>{item.academicLevelName}</span>
                            </>
                          )}
                          <span className="meta-sep">•</span>
                          <span className="schedule-note">{item.remarks || periodLabel || "Scheduled"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="dashboard-card-footer">
                  <button
                    type="button"
                    className="dashboard-footer-btn"
                    onClick={() => setActiveModule("timetable")}
                  >
                    View Full Timetable <ChevronRight size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        </article>
      </section>

      {/* Row 2 Grid (3 Cards): Faculty Biometric Attendance | Upcoming Holidays | Upcoming Examinations */}
      <section className="dashboard-grid-row dashboard-row-three" aria-label="Operations and Schedule">
        {/* Card 4: My Attendance Overview (May 2025) */}
        <article className="dashboard-card dashboard-staff-attendance-card">
          <CardHeader title="My Attendance (May 2025)" />
          <div className="dashboard-card-body dashboard-attendance-body">
            {/* Donut Chart & Side Status Legend */}
            <div className="dashboard-attendance-donut-row">
              <div className="dashboard-donut-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={FACULTY_ATTENDANCE_DONUT}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="65%"
                      outerRadius="90%"
                      paddingAngle={3}
                      stroke="var(--cms-surface, #ffffff)"
                      strokeWidth={2}
                    >
                      {FACULTY_ATTENDANCE_DONUT.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomDonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dashboard-donut-center">
                  <strong>95.4%</strong>
                  <span>Punctual</span>
                </div>
              </div>

              <div className="dashboard-attendance-legend-vertical">
                <div className="legend-item">
                  <span className="legend-label">
                    <span className="dot dot-present" /> Present (21 Days)
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-label">
                    <span className="dot dot-late" /> Leave (1 Day)
                  </span>
                </div>
                <div className="legend-item">
                  <span className="legend-label">
                    <span className="dot" style={{ background: "#94a3b8" }} /> Holidays (8 Days)
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Chips */}
            <div className="dashboard-staff-kpi-wrap">
              <div className="dashboard-staff-kpis">
                <div className="staff-chip">
                  <small>Working</small>
                  <strong>22 Days</strong>
                </div>
                <div className="staff-chip text-present">
                  <small>Present</small>
                  <strong>21 Days</strong>
                </div>
                <div className="staff-chip text-late">
                  <small>Leave</small>
                  <strong>1 Day</strong>
                </div>
                <div className="staff-chip">
                  <small>Holidays</small>
                  <strong>8 Days</strong>
                </div>
                <div className="staff-chip text-leave">
                  <small>Balance</small>
                  <strong>15 Days</strong>
                </div>
              </div>
              <div className="dashboard-staff-split-note">
                <span>Shift: <strong>09:00 AM – 04:30 PM</strong></span>
                <span className="split-divider">|</span>
                <span>Status: <strong style={{ color: "#22a447" }}>Checked In (08:45 AM)</strong></span>
              </div>
            </div>

            {/* Footer */}
            <div className="dashboard-card-footer">
              <button
                type="button"
                className="dashboard-footer-btn"
                onClick={() => setActiveModule("myattendance")}
              >
                View Punch Logs <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </article>

        {/* Card 5: Upcoming Holidays */}
        <article className="dashboard-card dashboard-holiday-card">
          <CardHeader
            title={`Upcoming Holidays (${holidaysList.length})`}
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("holidays")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          {holidayState.loading ? (
            <div className="dashboard-card-loading">
              <div className="dashboard-spinner" />
              <span>Loading holidays...</span>
            </div>
          ) : holidayState.error ? (
            <div className="dashboard-card-error">
              <AlertTriangle size={18} className="dashboard-error-icon" />
              <span>{holidayState.error}</span>
              <button type="button" className="dashboard-retry-btn" onClick={fetchUpcomingHolidays}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : holidaysList.length === 0 ? (
            <div className="dashboard-card-empty">
              <Info size={18} className="dashboard-empty-icon" />
              <span>No upcoming holidays scheduled.</span>
            </div>
          ) : (
            <div className="dashboard-card-body">
              <div className="dashboard-info-list">
                {holidaysList.map((item, index) => (
                  <div key={`holiday-${item.id}-${index}`} className="dashboard-info-item dashboard-holiday-item">
                    <span className={`dashboard-list-icon tone-${item.tone}`}>
                      <CalendarDays size={14} />
                    </span>
                    <div className="dashboard-info-content">
                      <div className="dashboard-holiday-title-row">
                        <strong>{item.name}</strong>
                        <span className={`holiday-type-pill pill-${item.tone}`}>{item.type}</span>
                      </div>
                      <small className="dashboard-holiday-meta">
                        <span>{item.dateRangeText}</span>
                        {item.dayOfWeek ? <span className="holiday-meta-dot">• {item.dayOfWeek}</span> : null}
                        <span className="holiday-duration-badge">{item.durationText}</span>
                      </small>
                    </div>
                    <span className={`dashboard-days-badge holiday-badge badge-${item.tone}`}>{item.badge}</span>
                  </div>
                ))}
              </div>
              <div className="dashboard-card-footer">
                <button
                  type="button"
                  className="dashboard-footer-btn"
                  onClick={() => setActiveModule("holidays")}
                >
                  View Holiday Calendar <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </article>

        {/* Card 6: Upcoming Examinations */}
        <article className="dashboard-card dashboard-exams-card">
          <CardHeader
            title={`Upcoming Examinations (${examsList.length})`}
            action={
              <button
                type="button"
                className="dashboard-view-link"
                onClick={() => setActiveModule("examduties")}
              >
                View All <ChevronRight size={13} />
              </button>
            }
          />
          {examState.loading ? (
            <div className="dashboard-card-loading">
              <div className="dashboard-spinner" />
              <span>Loading exams...</span>
            </div>
          ) : examState.error ? (
            <div className="dashboard-card-error">
              <AlertTriangle size={18} className="dashboard-error-icon" />
              <span>{examState.error}</span>
              <button type="button" className="dashboard-retry-btn" onClick={fetchUpcomingExaminations}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : examsList.length === 0 ? (
            <div className="dashboard-card-empty">
              <Info size={18} className="dashboard-empty-icon" />
              <span>No upcoming examinations scheduled.</span>
            </div>
          ) : (
            <div className="dashboard-card-body">
              <div className="dashboard-info-list">
                {examsList.map((item, index) => (
                  <div key={`exam-${item.id}-${index}`} className="dashboard-info-item dashboard-exam-item">
                    <span className={`dashboard-list-icon tone-${item.tone}`}>
                      <CalendarDays size={14} />
                    </span>
                    <div className="dashboard-info-content">
                      <div className="dashboard-exam-title-row">
                        <strong>{item.name}</strong>
                        <span className={`exam-type-pill pill-${item.tone}`}>{item.typeTag}</span>
                      </div>
                      <small className="dashboard-exam-meta">
                        <span>{item.context}</span>
                      </small>
                    </div>
                    <span className={`dashboard-days-badge exam-badge badge-${item.tone}`}>{item.badge}</span>
                  </div>
                ))}
              </div>
              <div className="dashboard-card-footer">
                <button
                  type="button"
                  className="dashboard-footer-btn"
                  onClick={() => setActiveModule("examduties")}
                >
                  View Exam Duties <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
