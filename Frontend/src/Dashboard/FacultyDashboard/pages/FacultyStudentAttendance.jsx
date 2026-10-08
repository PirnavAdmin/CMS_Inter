import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  Save,
  Loader2,
  FileSpreadsheet,
  Download,
  CalendarDays,
  ClipboardCheck,
  Upload,
  AlertTriangle,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import { facultyMockData } from "../data/facultyMockData.js";
import { useFacultySafe } from "../FacultyContext.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import "../styles/FacultyStudentAttendance.css";

const MONTHLY_PAGE_SIZE = 5;

// Monthly Attendance Status Pill (matching Admin Component)
function MonthlyPill({ value }) {
  const raw = String(value ?? "-").trim().toUpperCase();
  const normalized =
    raw === "PRESENT" || raw === "P"
      ? "P"
      : raw === "ABSENT" || raw === "A"
      ? "A"
      : raw === "H" || raw === "HOLIDAY"
      ? "H"
      : raw === "HD" || raw === "HALFDAY" || raw === "HALF-DAY"
      ? "HD"
      : "-";

  const type =
    normalized === "P"
      ? "att-month-p"
      : normalized === "A"
      ? "att-month-a"
      : normalized === "HD"
      ? "att-month-hd"
      : normalized === "H"
      ? "att-month-h"
      : "att-month-off";

  return <span className={`att-month-status ${type}`}>{normalized}</span>;
}

// Validation Rule for Session Attendance:
// - Present in both sessions => "Present" (P)
// - Present in one session only => "Half Day" (HD)
// - Absent in both sessions => "Absent" (A)
export const getStudentDailyStatus = (morningStatus, afternoonStatus) => {
  const mP = morningStatus === "Present";
  const aP = afternoonStatus === "Present";
  const mA = morningStatus === "Absent";
  const aA = afternoonStatus === "Absent";

  if (mP && aP) return "Present";
  if (mA && aA) return "Absent";
  if (mP || aP) return "Half Day";
  return "-";
};

// Day Status Pill Display Helper
export const getStudentDayStatusDisplay = (morningStatus, afternoonStatus) => {
  const mP = morningStatus === "Present";
  const aP = afternoonStatus === "Present";
  const mA = morningStatus === "Absent";
  const aA = afternoonStatus === "Absent";

  if (mP && aP) return { code: "P", label: "Present (Full Day)", type: "present" };
  if (mA && aA) return { code: "A", label: "Absent", type: "absent" };
  if (mP || aP) return { code: "HD", label: "HD (Half Day)", type: "halfday" };
  if (mA || aA) return { code: "A", label: "Absent", type: "absent" };
  return { code: "-", label: "-", type: "unmarked" };
};

// Section Normalizer Helper
export const resolveSectionName = (secVal) => {
  if (secVal === "1" || secVal === "Section A") return "Section A";
  if (secVal === "2" || secVal === "Section B") return "Section B";
  if (secVal === "3" || secVal === "Section C") return "Section C";
  return "";
};

// Master student roster categorized by section
export const MASTER_STUDENTS = [
  // Section A (15 students)
  { studentId: "1", rollNo: "25MPC001", admissionNo: "ADM2025001", name: "Aarav Sharma", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 45, attendancePct: 93.8 },
  { studentId: "2", rollNo: "25MPC002", admissionNo: "ADM2025002", name: "Ananya Reddy", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 47, attendancePct: 97.9 },
  { studentId: "3", rollNo: "25MPC003", admissionNo: "ADM2025003", name: "Bhavya Rao", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 34, attendancePct: 70.8 },
  { studentId: "4", rollNo: "25MPC004", admissionNo: "ADM2025004", name: "Devendra Verma", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 44, attendancePct: 91.7 },
  { studentId: "5", rollNo: "25MPC005", admissionNo: "ADM2025005", name: "Gautam Krishna", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 32, attendancePct: 66.7 },
  { studentId: "6", rollNo: "25MPC006", admissionNo: "ADM2025006", name: "Ishita Nair", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 46, attendancePct: 95.8 },
  { studentId: "7", rollNo: "25MPC007", admissionNo: "ADM2025007", name: "Kiran Kumar", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 43, attendancePct: 89.6 },
  { studentId: "8", rollNo: "25MPC008", admissionNo: "ADM2025008", name: "Lakshmi Priya", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 45, attendancePct: 93.8 },
  { studentId: "9", rollNo: "25MPC009", admissionNo: "ADM2025009", name: "Manish Reddy", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 42, attendancePct: 87.5 },
  { studentId: "10", rollNo: "25MPC010", admissionNo: "ADM2025010", name: "Naveen Teja", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 40, attendancePct: 83.3 },
  { studentId: "862", rollNo: "862", admissionNo: "ADM-862", name: "Akshitar", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 41, attendancePct: 85.4 },
  { studentId: "550", rollNo: "550", admissionNo: "ADM-550", name: "Arshad M", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 38, attendancePct: 79.2 },
  { studentId: "570", rollNo: "570", admissionNo: "ADM-570", name: "Asha S", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 39, attendancePct: 81.3 },
  { studentId: "842", rollNo: "842", admissionNo: "ADM-842", name: "Monika K", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 45, attendancePct: 93.8 },
  { studentId: "517", rollNo: "517", admissionNo: "ADM-517", name: "ravi", group: "MPC", section: "Section A", totalClasses: 48, presentCount: 44, attendancePct: 91.7 },

  // Section B (12 students)
  { studentId: "11", rollNo: "25MPC011", admissionNo: "ADM2025011", name: "Pooja Hegde", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 46, attendancePct: 95.8 },
  { studentId: "12", rollNo: "25MPC012", admissionNo: "ADM2025012", name: "Rahul Varma", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 44, attendancePct: 91.7 },
  { studentId: "13", rollNo: "25MPC013", admissionNo: "ADM2025013", name: "Sai Charan", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 45, attendancePct: 93.8 },
  { studentId: "14", rollNo: "25MPC014", admissionNo: "ADM2025014", name: "Sneha Latha", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 43, attendancePct: 89.6 },
  { studentId: "15", rollNo: "25MPC015", admissionNo: "ADM2025015", name: "Tarun Goud", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 33, attendancePct: 68.8 },
  { studentId: "16", rollNo: "25MPC016", admissionNo: "ADM2025016", name: "Uday Kiran", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 42, attendancePct: 87.5 },
  { studentId: "17", rollNo: "25MPC017", admissionNo: "ADM2025017", name: "Vaishnavi M", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 46, attendancePct: 95.8 },
  { studentId: "18", rollNo: "25MPC018", admissionNo: "ADM2025018", name: "Vamsi Krishna", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 31, attendancePct: 64.6 },
  { studentId: "19", rollNo: "25MPC019", admissionNo: "ADM2025019", name: "Yashwanth R", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 44, attendancePct: 91.7 },
  { studentId: "20", rollNo: "25MPC020", admissionNo: "ADM2025020", name: "Abhinav B", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 45, attendancePct: 93.8 },
  { studentId: "21", rollNo: "25MPC021", admissionNo: "ADM2025021", name: "Bhanu Prakash", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 40, attendancePct: 83.3 },
  { studentId: "22", rollNo: "25MPC022", admissionNo: "ADM2025022", name: "Chaitanya K", group: "MPC", section: "Section B", totalClasses: 48, presentCount: 42, attendancePct: 87.5 },

  // Section C (13 students)
  { studentId: "23", rollNo: "25MPC023", admissionNo: "ADM2025023", name: "Deepika S", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 45, attendancePct: 93.8 },
  { studentId: "24", rollNo: "25MPC024", admissionNo: "ADM2025024", name: "Eswar Prasad", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 43, attendancePct: 89.6 },
  { studentId: "25", rollNo: "25MPC025", admissionNo: "ADM2025025", name: "Farooq Ali", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 42, attendancePct: 87.5 },
  { studentId: "26", rollNo: "25MPC026", admissionNo: "ADM2025026", name: "Girish Kumar", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 32, attendancePct: 66.7 },
  { studentId: "27", rollNo: "25MPC027", admissionNo: "ADM2025027", name: "Harika Devi", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 46, attendancePct: 95.8 },
  { studentId: "28", rollNo: "25MPC028", admissionNo: "ADM2025028", name: "Indu Priya", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 44, attendancePct: 91.7 },
  { studentId: "29", rollNo: "25MPC029", admissionNo: "ADM2025029", name: "Jagadeesh T", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 45, attendancePct: 93.8 },
  { studentId: "30", rollNo: "25MPC030", admissionNo: "ADM2025030", name: "Kavya Sree", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 30, attendancePct: 62.5 },
  { studentId: "31", rollNo: "25MPC031", admissionNo: "ADM2025031", name: "Lokesh Babu", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 43, attendancePct: 89.6 },
  { studentId: "32", rollNo: "25MPC032", admissionNo: "ADM2025032", name: "Madhav Rao", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 41, attendancePct: 85.4 },
  { studentId: "33", rollNo: "25MPC033", admissionNo: "ADM2025033", name: "Nandini K", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 46, attendancePct: 95.8 },
  { studentId: "34", rollNo: "25MPC034", admissionNo: "ADM2025034", name: "Omkar Nath", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 42, attendancePct: 87.5 },
  { studentId: "35", rollNo: "25MPC035", admissionNo: "ADM2025035", name: "Praneeth M", group: "MPC", section: "Section C", totalClasses: 48, presentCount: 44, attendancePct: 91.7 },
];

export default function FacultyStudentAttendance({ initialView = "daily" }) {
  const context = useFacultySafe();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Determine initial view independently from prop, path, or query
  const resolvedDefaultView = useMemo(() => {
    if (initialView === "monthly") return "monthly";
    const path = String(location?.pathname || "").toLowerCase();
    if (path.includes("monthly-report") || path.includes("monthly")) return "monthly";
    const tab = searchParams?.get("tab") || searchParams?.get("view");
    if (tab === "monthly" || tab === "monthly-report") return "monthly";
    if (tab === "defaulters") return "defaulters";
    return "daily";
  }, [initialView, location?.pathname, searchParams]);

  const [attView, setAttView] = useState(resolvedDefaultView); // "daily" | "monthly" | "defaulters"
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attBoard, setAttBoard] = useState("");
  const [attYear, setAttYear] = useState("");
  const [attLevel, setAttLevel] = useState("");
  const [attGroup, setAttGroup] = useState("");
  const [attProgram, setAttProgram] = useState("");
  const [attSection, setAttSection] = useState(""); // Manual entry: empty by default
  const [dailyStatusFilter, setDailyStatusFilter] = useState("");

  // Central Attendance Ledger for Continuity across Daily & Monthly
  // Stores manual records: { [dateStr]: { [studentId]: { morningStatus, afternoonStatus, remarks } } }
  const [attendanceLedger, setAttendanceLedger] = useState({});

  // Daily Attendance States
  const [attStudents, setAttStudents] = useState([]);
  const [dailyFetched, setDailyFetched] = useState(false);
  const [fetchingDaily, setFetchingDaily] = useState(false);
  const [attDirty, setAttDirty] = useState(false);
  const [attSaving, setAttSaving] = useState(false);
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyPageSize, setDailyPageSize] = useState(5);

  // Mark All Present Session Selection Modal States
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markSessionChoice, setMarkSessionChoice] = useState("morning"); // "morning" | "afternoon" | "both"

  // Cascading Academic Lists
  const [attBoards, setAttBoards] = useState([]);
  const [attYears, setAttYears] = useState([]);
  const [attLevels, setAttLevels] = useState([]);
  const [attGroups, setAttGroups] = useState([]);
  const [attPrograms, setAttPrograms] = useState([]);
  const [attSections, setAttSections] = useState([]);

  // Monthly Report States (100% Independent, no protected route dependencies)
  const [monthlyDateValue, setMonthlyDateValue] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today.slice(0, 7); // e.g. "2026-10"
  });
  const [monthlyStatusFilter, setMonthlyStatusFilter] = useState("");
  const [monthlySearch, setMonthlySearch] = useState("");
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [monthlyPageSize, setMonthlyPageSize] = useState(5);
  const [monthlyFetched, setMonthlyFetched] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    setAttBoards(facultyMockData.boards || []);
    setAttYears(facultyMockData.academicYears || []);
    setAttLevels(facultyMockData.levels || []);
    setAttGroups(facultyMockData.groups || []);
    setAttPrograms(facultyMockData.programs || []);
    setAttSections(facultyMockData.sections || []);

    if (facultyMockData.boards?.[0]) setAttBoard(facultyMockData.boards[0].id);
    if (facultyMockData.academicYears?.[0]) setAttYear(facultyMockData.academicYears[0].id);
    // Remaining details (Level, Group, Program, Section) require manual entry
  }, []);

  // Format month label like Admin component ("October, 2026")
  const monthlyMonthLabel = useMemo(() => {
    try {
      const dt = new Date(`${monthlyDateValue}-01T00:00:00`);
      return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" }).replace(" ", ", ");
    } catch {
      return monthlyDateValue;
    }
  }, [monthlyDateValue]);

  // Generate days array for the selected month
  const monthDays = useMemo(() => {
    const [year, month] = (monthlyDateValue || "2026-10").split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const list = [];
    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(year, month - 1, d);
      const weekday = dt.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
      const isSunday = dt.getDay() === 0;
      list.push({ day: d, weekday, isSunday });
    }
    return list;
  }, [monthlyDateValue]);

  // Handlers for Filter Changes (resets fetched state so user must click Get Records)
  const handleSectionChange = (val) => {
    setAttSection(val);
    setDailyFetched(false);
    setMonthlyFetched(false);
    setDailyPage(1);
    setMonthlyPage(1);
  };

  const handleDateChange = (val) => {
    setAttDate(val);
    setDailyFetched(false);
    setDailyPage(1);
  };

  const handleMonthChange = (val) => {
    setMonthlyDateValue(val);
    setMonthlyFetched(false);
    setMonthlyPage(1);
  };

  // 1. Fetch Students for Daily Attendance (Manual Entry - NOT Pre-filled)
  const handleGetDailyRecords = () => {
    if (!attSection) {
      notify("Please select a section first to fetch students.", "error");
      return;
    }
    setFetchingDaily(true);
    setTimeout(() => {
      const secName = resolveSectionName(attSection);
      const secStudents = MASTER_STUDENTS.filter((s) => s.section === secName);
      const dateRecords = attendanceLedger[attDate] || {};

      const initialized = secStudents.map((s) => {
        const rec = dateRecords[s.studentId];
        if (rec) {
          return {
            ...s,
            morningStatus: rec.morningStatus ?? null,
            afternoonStatus: rec.afternoonStatus ?? null,
            remarks: rec.remarks ?? "",
          };
        }
        // Manual entry: Fresh unselected session statuses
        return {
          ...s,
          morningStatus: null,
          afternoonStatus: null,
          remarks: "",
        };
      });

      setAttStudents(initialized);
      setDailyFetched(true);
      setFetchingDaily(false);
      setDailyPage(1);
      notify(`Fetched ${secStudents.length} students of ${secName} for ${attDate}. Ready for manual attendance.`);
    }, 200);
  };

  // 2. Fetch Records for Monthly Report
  const handleGetMonthlyRecords = () => {
    if (!attSection) {
      notify("Please select a section first to view monthly report.", "error");
      return;
    }
    setMonthlyLoading(true);
    setTimeout(() => {
      setMonthlyFetched(true);
      setMonthlyLoading(false);
      setMonthlyPage(1);
      notify(`Loaded monthly attendance report for ${resolveSectionName(attSection)} (${monthlyMonthLabel}).`);
    }, 200);
  };

  // 3. Generation of monthly rows with Continuous Sync to Daily Attendance
  const monthlyRows = useMemo(() => {
    if (!attSection) return [];
    const secName = resolveSectionName(attSection);
    const secStudents = MASTER_STUDENTS.filter((s) => s.section === secName);
    const [, targetMonth] = (monthlyDateValue || "2026-10").split("-").map(Number);
    const todayDateStr = attDate || new Date().toISOString().split("T")[0];

    return secStudents.map((seed, sIdx) => {
      const dailyStatus = monthDays.map((d) => {
        if (d.isSunday) return "-";
        if (targetMonth === 10 && (d.day === 2 || d.day === 3)) return "H"; // Gandhi Jayanti

        const dateStr = `${monthlyDateValue}-${String(d.day).padStart(2, "0")}`;

        // Rule 1: After days from today, attendance must be strictly empty!
        if (dateStr > todayDateStr) {
          return "-";
        }

        // Rule 2: Today's date attendance (synced from daily attendance inputs/ledger)
        if (dateStr === todayDateStr) {
          const ledgerRecord = attendanceLedger[dateStr]?.[seed.studentId];
          if (ledgerRecord) {
            const overall = getStudentDailyStatus(ledgerRecord.morningStatus, ledgerRecord.afternoonStatus);
            if (overall === "Present") return "P";
            if (overall === "Half Day") return "HD";
            if (overall === "Absent") return "A";
            return "-";
          }

          const inProgress = attStudents.find((x) => x.studentId === seed.studentId);
          if (inProgress && (inProgress.morningStatus || inProgress.afternoonStatus)) {
            const overall = getStudentDailyStatus(inProgress.morningStatus, inProgress.afternoonStatus);
            if (overall === "Present") return "P";
            if (overall === "Half Day") return "HD";
            if (overall === "Absent") return "A";
          }
          return "-";
        }

        // Rule 3: Past days (before today)
        const ledgerRecord = attendanceLedger[dateStr]?.[seed.studentId];
        if (ledgerRecord) {
          const overall = getStudentDailyStatus(ledgerRecord.morningStatus, ledgerRecord.afternoonStatus);
          if (overall === "Present") return "P";
          if (overall === "Half Day") return "HD";
          if (overall === "Absent") return "A";
          return "-";
        }

        // Historical distribution for past working days
        const isDefaulterSeed =
          seed.name === "Bhavya Rao" ||
          seed.name === "Gautam Krishna" ||
          seed.name === "Tarun Goud" ||
          seed.name === "Vamsi Krishna" ||
          seed.name === "Girish Kumar" ||
          seed.name === "Kavya Sree";

        if (isDefaulterSeed) {
          if (d.day % 3 === 0) return "A";
          if (d.day % 2 === 0) return "HD";
          return "P";
        }

        if (d.day === 1 && (seed.name === "Arshad M" || seed.name === "Asha S")) return "HD";
        const hash = (seed.name.charCodeAt(0) + d.day * 7 + sIdx * 3) % 100;
        if (hash < 80) return "P";
        if (hash < 92) return "HD";
        return "A";
      });

      const p = dailyStatus.filter((x) => x === "P").length;
      const a = dailyStatus.filter((x) => x === "A").length;
      const hd = dailyStatus.filter((x) => x === "HD").length;
      const totalClasses = p + a + hd;
      const classesAttended = Number((p + 0.5 * hd).toFixed(1));
      const pct = totalClasses > 0 ? Math.round((classesAttended * 100) / totalClasses) : 0;

      return {
        ...seed,
        id: seed.studentId,
        dailyStatus,
        presentCount: p,
        absentCount: a,
        halfDayCount: hd,
        totalClasses,
        classesAttended,
        attendancePct: pct,
      };
    });
  }, [monthDays, monthlyDateValue, attSection, attendanceLedger, attDate, attStudents]);

  // Filtered monthly rows by search
  const filteredMonthlyRows = useMemo(() => {
    let list = monthlyRows;
    const q = monthlySearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          String(r.name || "").toLowerCase().includes(q) ||
          String(r.rollNo || "").toLowerCase().includes(q) ||
          String(r.studentId || "").toLowerCase().includes(q) ||
          String(r.admissionNo || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [monthlyRows, monthlySearch]);

  const totalMonthlyPages = Math.max(1, Math.ceil(filteredMonthlyRows.length / monthlyPageSize));
  const pagedMonthlyRows = useMemo(() => {
    const pageIndex = Math.min(monthlyPage, totalMonthlyPages);
    return filteredMonthlyRows.slice((pageIndex - 1) * monthlyPageSize, pageIndex * monthlyPageSize);
  }, [filteredMonthlyRows, monthlyPage, monthlyPageSize, totalMonthlyPages]);

  // End-of-Day Summary Counters for Daily Attendance
  const dailyCounts = useMemo(() => {
    let fullDay = 0;
    let halfDay = 0;
    let absent = 0;
    let unmarked = 0;

    attStudents.forEach((s) => {
      const st = getStudentDailyStatus(s.morningStatus, s.afternoonStatus);
      if (st === "Present") fullDay++;
      else if (st === "Half Day") halfDay++;
      else if (st === "Absent") absent++;
      else unmarked++;
    });

    return {
      fullDay,
      halfDay,
      absent,
      unmarked,
      total: attStudents.length,
    };
  }, [attStudents]);

  // Daily Pagination Slicing
  const totalDailyPages = Math.max(1, Math.ceil(attStudents.length / dailyPageSize));
  const pagedDailyStudents = useMemo(() => {
    const pageIndex = Math.min(dailyPage, totalDailyPages);
    return attStudents.slice((pageIndex - 1) * dailyPageSize, pageIndex * dailyPageSize);
  }, [attStudents, dailyPage, dailyPageSize, totalDailyPages]);

  // Defaulters List based directly on Monthly Report of that section (< 75% attendance)
  const defaultersList = useMemo(() => {
    if (!attSection) return [];
    return monthlyRows.filter((s) => s.totalClasses > 0 && s.attendancePct < 75);
  }, [attSection, monthlyRows]);

  // Session toggle with immediate continuous sync to ledger
  const toggleSessionStatus = (studentId, session, status) => {
    setAttStudents((prev) => {
      const updated = prev.map((s) => {
        if (s.studentId === studentId) {
          const currentVal = s[`${session}Status`];
          const newVal = currentVal === status ? null : status;
          return { ...s, [`${session}Status`]: newVal };
        }
        return s;
      });

      // Synchronize immediately to attendance ledger
      const targetStudent = updated.find((x) => x.studentId === studentId);
      if (targetStudent) {
        setAttendanceLedger((ledger) => ({
          ...ledger,
          [attDate]: {
            ...(ledger[attDate] || {}),
            [studentId]: {
              morningStatus: targetStudent.morningStatus,
              afternoonStatus: targetStudent.afternoonStatus,
              remarks: targetStudent.remarks || "",
            },
          },
        }));
      }

      return updated;
    });
    setAttDirty(true);
  };

  // Mark All Present (asks for session selection; preserves existing absent students)
  const applyMarkAllPresent = () => {
    setAttStudents((prev) => {
      const updated = prev.map((s) => {
        let nextMorning = s.morningStatus;
        let nextAfternoon = s.afternoonStatus;

        if (markSessionChoice === "morning" || markSessionChoice === "both") {
          if (s.morningStatus !== "Absent") {
            nextMorning = "Present";
          }
        }

        if (markSessionChoice === "afternoon" || markSessionChoice === "both") {
          if (s.afternoonStatus !== "Absent") {
            nextAfternoon = "Present";
          }
        }

        return {
          ...s,
          morningStatus: nextMorning,
          afternoonStatus: nextAfternoon,
        };
      });

      // Sync to ledger
      setAttendanceLedger((ledger) => {
        const currentMap = { ...(ledger[attDate] || {}) };
        updated.forEach((s) => {
          currentMap[s.studentId] = {
            morningStatus: s.morningStatus,
            afternoonStatus: s.afternoonStatus,
            remarks: s.remarks || "",
          };
        });
        return { ...ledger, [attDate]: currentMap };
      });

      return updated;
    });

    setAttDirty(true);
    setShowMarkModal(false);

    const label =
      markSessionChoice === "both"
        ? "Both Sessions (Full Day)"
        : markSessionChoice === "morning"
        ? "Morning Session"
        : "Afternoon Session";
    notify(`Marked students Present for ${label} (absent students preserved).`);
  };

  // Save Attendance to Ledger
  const saveAttendance = async () => {
    setAttSaving(true);
    window.setTimeout(() => {
      setAttendanceLedger((ledger) => {
        const currentMap = { ...(ledger[attDate] || {}) };
        attStudents.forEach((s) => {
          currentMap[s.studentId] = {
            morningStatus: s.morningStatus,
            afternoonStatus: s.afternoonStatus,
            remarks: s.remarks || "",
          };
        });
        return { ...ledger, [attDate]: currentMap };
      });
      setAttDirty(false);
      setAttSaving(false);
      notify(`Attendance for ${resolveSectionName(attSection)} on ${attDate} saved successfully!`);
    }, 250);
  };

  // Export Class Attendance Sheet
  const handleExportAttendanceSheet = () => {
    if (!attStudents.length) return notify("No attendance records to export.", "error");
    const exportData = attStudents.map((s, idx) => ({
      "S.No": idx + 1,
      "Roll No": s.rollNo,
      "Admission No": s.admissionNo,
      "Student Name": s.name,
      Date: attDate,
      "Morning Session": s.morningStatus || "Unmarked",
      "Afternoon Session": s.afternoonStatus || "Unmarked",
      "Day Attendance Status": getStudentDailyStatus(s.morningStatus, s.afternoonStatus),
      "Total Classes": s.totalClasses || 48,
      "Classes Attended": s.presentCount || 45,
      "Attendance %": `${s.attendancePct || 90}%`,
      Remarks: s.remarks || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Attendance");
    XLSX.writeFile(workbook, `Student_Attendance_${attDate}_${resolveSectionName(attSection)}.xlsx`);
    notify("Class attendance sheet downloaded as Excel file.");
  };

  // Export Monthly Report
  const handleExportMonthlyReport = () => {
    if (!filteredMonthlyRows.length) return notify("No monthly records to export.", "error");
    const exportData = filteredMonthlyRows.map((s, idx) => {
      const row = {
        "S.No": idx + 1,
        "Student ID": s.studentId,
        "Student Name": s.name,
        "Roll No": s.rollNo,
      };
      monthDays.forEach((d, i) => {
        row[`Day ${d.day} (${d.weekday})`] = s.dailyStatus?.[i] ?? "-";
      });
      row["Present"] = s.presentCount;
      row["Absent"] = s.absentCount;
      row["Half Day"] = s.halfDayCount;
      row["Attendance %"] = `${s.attendancePct}%`;
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, `Student_Monthly_Attendance_${monthlyDateValue}_${resolveSectionName(attSection)}.xlsx`);
    notify("Monthly student attendance sheet downloaded as Excel file.");
  };

  // Download Individual Attendance Slip
  const handleDownloadStudentSlip = (student) => {
    const slipText = [
      "================================================================================",
      "                    PIRNAV COLLEGES - STUDENT ATTENDANCE SLIP                   ",
      "================================================================================",
      `Date of Record   : ${attDate}`,
      `Generated Time   : ${new Date().toLocaleTimeString()}`,
      "",
      "STUDENT DETAILS:",
      "--------------------------------------------------------------------------------",
      `Student Name     : ${student.name}`,
      `Roll Number      : ${student.rollNo}`,
      `Admission Number : ${student.admissionNo}`,
      `Section / Class  : ${resolveSectionName(attSection)}`,
      `Academic Year    : 2026-2027`,
      "",
      "DAILY SESSION STATUS:",
      "--------------------------------------------------------------------------------",
      `Morning Session  : ${student.morningStatus || "Unmarked"}`,
      `Afternoon Session: ${student.afternoonStatus || "Unmarked"}`,
      `Day Overall Status: ${getStudentDailyStatus(student.morningStatus, student.afternoonStatus)}`,
      `Daily Remarks    : ${student.remarks || "Regular Attendance"}`,
      "",
      "MONTHLY CUMULATIVE METRICS:",
      "--------------------------------------------------------------------------------",
      `Total Classes    : ${student.totalClasses || 48}`,
      `Classes Present  : ${student.presentCount || 45}`,
      `Overall Attendance: ${student.attendancePct || 90}%`,
      `Hall Ticket Eligibility: ${(student.attendancePct || 90) >= 75 ? "ELIGIBLE (>= 75%)" : "SHORTAGE CONDONATION REQUIRED"}`,
      "",
      "Authorized Signatory / Faculty In-Charge: ______________________",
      "================================================================================",
    ].join("\n");
    const blob = new Blob([slipText.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Slip_${student.rollNo}_${attDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Attendance slip downloaded for ${student.name}.`);
  };

  return (
    <div>
      {/* 1. Page Header (Matching Third Reference Layout) */}
      <div className="cms-page-head" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="sp-att-header-icon">
            <ClipboardCheck size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Student Attendance</h1>
            <p style={{ margin: "2px 0 0 0", color: "var(--cms-muted, #7B8275)", fontSize: 13 }}>
              View and manage student attendance records
            </p>
          </div>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          style={{ height: 38, padding: "0 16px", borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => notify("Import Attendance template downloaded.")}
        >
          <Upload size={14} /> Import Attendance
        </button>
      </div>

      {/* 2. Cascading Filter Card (Placed ABOVE tabs, matching Third Reference) */}
      <div className="cms-card" style={{ marginBottom: 16 }}>
        <div className="cms-card-body">
          <div className="cms-filters">
            {attView === "monthly" ? (
              <div className="cms-field">
                <label>Month</label>
                <div className="att-month-picker" title="Select attendance month">
                  <span>{monthlyMonthLabel}</span>
                  <CalendarDays size={18} style={{ color: "var(--cms-muted)" }} />
                  <input
                    type="month"
                    value={monthlyDateValue}
                    onChange={(e) => {
                      if (e.target.value) handleMonthChange(e.target.value);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="cms-field">
                <label>Date</label>
                <input type="date" value={attDate} onChange={(e) => handleDateChange(e.target.value)} />
              </div>
            )}

            <div className="cms-field">
              <label>Academic Level</label>
              <select value={attLevel} onChange={(e) => setAttLevel(e.target.value)}>
                <option value="">Select Academic Level</option>
                {attLevels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cms-field">
              <label>Group</label>
              <select value={attGroup} onChange={(e) => setAttGroup(e.target.value)}>
                <option value="">Select Group</option>
                {attGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cms-field">
              <label>Program</label>
              <select value={attProgram} onChange={(e) => setAttProgram(e.target.value)}>
                <option value="">Select Program</option>
                {attPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cms-field">
              <label>Section</label>
              <select value={attSection} onChange={(e) => handleSectionChange(e.target.value)}>
                <option value="">Select Section</option>
                <option value="1">Section A</option>
                <option value="2">Section B</option>
                <option value="3">Section C</option>
              </select>
            </div>

            {/* Fetch Action Button at the end of the filter row */}
            <div className="att-filter-action">
              {attView === "monthly" ? (
                <>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={handleGetMonthlyRecords}
                    disabled={monthlyLoading}
                  >
                    {monthlyLoading ? <Loader2 size={14} className="spin" /> : null}
                    {monthlyLoading ? "Fetching records…" : "Get Records"}
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={handleExportMonthlyReport}
                    disabled={monthlyLoading || !monthlyFetched}
                  >
                    Export
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  onClick={handleGetDailyRecords}
                  disabled={fetchingDaily}
                >
                  {fetchingDaily ? <Loader2 size={14} className="spin" /> : null}
                  {fetchingDaily ? "Fetching records…" : "Get Records"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. View Switcher Tabs (Placed BELOW Filter Card, matching Third Reference) */}
      <div className="sp-att-views-container">
        <div className="sp-att-views-bar">
          <button
            className={`sp-att-view-btn ${attView === "daily" ? "active" : ""}`}
            onClick={() => setAttView("daily")}
          >
            Attendance
          </button>
          <button
            className={`sp-att-view-btn ${attView === "monthly" ? "active" : ""}`}
            onClick={() => setAttView("monthly")}
          >
            Monthly Report
          </button>
          <button
            className={`sp-att-view-btn ${attView === "defaulters" ? "active" : ""}`}
            onClick={() => setAttView("defaulters")}
          >
            Defaulters
          </button>
        </div>
      </div>

      {/* 4. Content Areas with Before-Click Prompts */}

      {/* View 1: Daily Attendance */}
      {attView === "daily" && !dailyFetched && (
        <div className="cms-card">
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)", fontSize: 13.5 }}>
            Please select Academic Level, Group, Program, and Section from the filters above, then click <strong>Get Records</strong> to mark attendance.
          </div>
        </div>
      )}

      {attView === "daily" && dailyFetched && (
        <div className="cms-card">
          <div className="cms-card-head">
            <div>
              <h2 style={{ margin: 0 }}>
                Student Attendance Sheet — {attDate} ({resolveSectionName(attSection)})
              </h2>
              <div className="sp-daily-summary-stats" style={{ marginTop: 6 }}>
                <span className="sp-stat-badge sp-stat-present" title="Students present for both sessions (Full Day)">
                  <span className="sp-stat-dot"></span>
                  <b>{dailyCounts.fullDay}</b> Full Day
                </span>
                <span className="sp-stat-badge sp-stat-halfday" title="Students present for one session only (Half Day)">
                  <span className="sp-stat-dot"></span>
                  <b>{dailyCounts.halfDay}</b> Half Day
                </span>
                <span className="sp-stat-badge sp-stat-absent" title="Students absent for both sessions">
                  <span className="sp-stat-dot"></span>
                  <b>{dailyCounts.absent}</b> Absent
                </span>
                <span className="sp-stat-badge sp-stat-total" title="Total section strength">
                  <b>{dailyCounts.total}</b> Students
                </span>
              </div>
            </div>
            <div className="sp-att-card-actions">
              {attDirty && <span className="sp-unsaved-badge">● Unsaved Changes</span>}

              {/* Mark All Present with session choice modal */}
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                style={{ padding: "5px 12px", fontSize: 12.5 }}
                onClick={() => setShowMarkModal(true)}
                title="Choose session to mark all students present"
              >
                <CheckCircle size={14} /> Mark All Present
              </button>

              <button
                type="button"
                className="cms-btn cms-btn-primary"
                style={{ padding: "5px 12px", fontSize: 12.5 }}
                onClick={saveAttendance}
                disabled={attSaving}
                title="Save attendance records"
              >
                {attSaving ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save Attendance
              </button>

              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                style={{ padding: "5px 12px", fontSize: 12.5 }}
                onClick={handleExportAttendanceSheet}
                title="Download whole class attendance sheet as Excel file"
              >
                <FileSpreadsheet size={14} /> Export Sheet
              </button>
            </div>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Morning Session</th>
                  <th>Afternoon Session</th>
                  <th>Day Status</th>
                  <th>Remarks</th>
                  <th style={{ width: 75, textAlign: "center" }}>Report</th>
                </tr>
              </thead>
              <tbody>
                {pagedDailyStudents.map((s, idx) => {
                  const dailyStatus = getStudentDailyStatus(s.morningStatus, s.afternoonStatus);
                  const rowClass =
                    dailyStatus === "Absent"
                      ? "sp-absent-row"
                      : dailyStatus === "Half Day"
                      ? "sp-halfday-row"
                      : "";
                  const statusDisp = getStudentDayStatusDisplay(s.morningStatus, s.afternoonStatus);
                  const globalIdx = (dailyPage - 1) * dailyPageSize + idx + 1;

                  return (
                    <tr key={s.studentId} className={rowClass}>
                      <td className="cms-strong">{globalIdx}</td>
                      <td className="cms-strong">{s.rollNo}</td>
                      <td>{s.admissionNo}</td>
                      <td>
                        <strong>{s.name}</strong>
                      </td>
                      <td>
                        <div className="sp-session-toggle">
                          {["Present", "Absent"].map((st) => {
                            const isActive = s.morningStatus === st;
                            const keyCls = st.toLowerCase();
                            const code = st[0];
                            return (
                              <button
                                key={st}
                                type="button"
                                className={`sp-session-btn ${keyCls} ${isActive ? "active" : ""}`}
                                onClick={() => toggleSessionStatus(s.studentId, "morning", st)}
                                title={`Mark Morning as ${st}`}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="sp-session-toggle">
                          {["Present", "Absent"].map((st) => {
                            const isActive = s.afternoonStatus === st;
                            const keyCls = st.toLowerCase();
                            const code = st[0];
                            return (
                              <button
                                key={st}
                                type="button"
                                className={`sp-session-btn ${keyCls} ${isActive ? "active" : ""}`}
                                onClick={() => toggleSessionStatus(s.studentId, "afternoon", st)}
                                title={`Mark Afternoon as ${st}`}
                              >
                                {code}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <span className={`sp-day-status-pill ${statusDisp.type}`}>
                          {statusDisp.label}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="sp-daily-remarks-input"
                          value={s.remarks || ""}
                          placeholder="Optional"
                          onChange={(e) => {
                            const val = e.target.value;
                            setAttStudents((prev) =>
                              prev.map((x) => (x.studentId === s.studentId ? { ...x, remarks: val } : x))
                            );
                            setAttDirty(true);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="sp-tooltip-wrap">
                          <button
                            type="button"
                            className="cms-action-btn"
                            onClick={() => handleDownloadStudentSlip(s)}
                            aria-label={`Download Attendance Report for ${s.name}`}
                          >
                            <Download size={13} />
                          </button>
                          <span className="sp-tooltip-bubble">Download Report</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Daily Attendance Pagination (matching Second Reference layout) */}
          <nav className="att-pagination">
            <span className="att-pagination-summary">
              Showing{" "}
              {attStudents.length === 0
                ? "0–0 of 0 records"
                : `${(dailyPage - 1) * dailyPageSize + 1}–${Math.min(dailyPage * dailyPageSize, attStudents.length)} of ${attStudents.length} records`}
            </span>
            <div className="att-pagination-controls">
              <div className="att-per-page-wrap">
                <span>Per page:</span>
                <select
                  value={dailyPageSize}
                  onChange={(e) => {
                    setDailyPageSize(Number(e.target.value));
                    setDailyPage(1);
                  }}
                  className="att-per-page-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>
              <button
                type="button"
                disabled={dailyPage === 1}
                onClick={() => setDailyPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="att-page-number">
                {dailyPage} / {totalDailyPages}
              </span>
              <button
                type="button"
                disabled={dailyPage >= totalDailyPages || totalDailyPages === 0}
                onClick={() => setDailyPage((p) => Math.min(totalDailyPages, p + 1))}
              >
                Next
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Mark All Present Session Selection Modal */}
      {showMarkModal && (
        <div className="sp-modal-overlay" onClick={() => setShowMarkModal(false)}>
          <div className="sp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-head">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="sp-modal-icon-badge">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <h3 className="sp-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Mark All Present</h3>
                  <p className="sp-modal-subtitle" style={{ margin: "2px 0 0 0", fontSize: 12.5 }}>
                    Select session attendance to apply for all students
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setShowMarkModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sp-modal-body">
              <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "var(--cms-text)", fontWeight: 600 }}>
                Which session would you like to mark students Present for?
              </p>

              <div className="sp-session-select-grid">
                <label
                  className={`sp-session-option ${markSessionChoice === "morning" ? "active" : ""}`}
                  onClick={() => setMarkSessionChoice("morning")}
                >
                  <input
                    type="radio"
                    name="markSessionChoice"
                    checked={markSessionChoice === "morning"}
                    onChange={() => setMarkSessionChoice("morning")}
                  />
                  <div className="sp-session-option-text">
                    <strong>Morning Session Only</strong>
                    <span>Mark all students present for Morning session only</span>
                  </div>
                </label>

                <label
                  className={`sp-session-option ${markSessionChoice === "afternoon" ? "active" : ""}`}
                  onClick={() => setMarkSessionChoice("afternoon")}
                >
                  <input
                    type="radio"
                    name="markSessionChoice"
                    checked={markSessionChoice === "afternoon"}
                    onChange={() => setMarkSessionChoice("afternoon")}
                  />
                  <div className="sp-session-option-text">
                    <strong>Afternoon Session Only</strong>
                    <span>Mark all students present for Afternoon session only</span>
                  </div>
                </label>

                <label
                  className={`sp-session-option ${markSessionChoice === "both" ? "active" : ""}`}
                  onClick={() => setMarkSessionChoice("both")}
                >
                  <input
                    type="radio"
                    name="markSessionChoice"
                    checked={markSessionChoice === "both"}
                    onChange={() => setMarkSessionChoice("both")}
                  />
                  <div className="sp-session-option-text">
                    <strong>Both Sessions (Full Day)</strong>
                    <span>Mark all students present for both Morning & Afternoon sessions</span>
                  </div>
                </label>
              </div>

              <div className="sp-modal-notice-box">
                <span>ℹ️</span>
                <span>
                  Students already marked as <strong>Absent</strong> in the selected session(s) will be preserved.
                </span>
              </div>
            </div>

            <div className="sp-modal-foot">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setShowMarkModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={applyMarkAllPresent}
              >
                Apply Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Monthly Report */}
      {attView === "monthly" && !monthlyFetched && (
        <div className="cms-card">
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)", fontSize: 13.5 }}>
            Please select Section and Month from the filters above, then click <strong>Get Records</strong> to view the monthly report.
          </div>
        </div>
      )}

      {attView === "monthly" && monthlyFetched && (
        <div className="cms-card att-month-card">
          <header className="att-month-header">
            <div>
              <h3>
                Student Monthly Attendance — {resolveSectionName(attSection)} ({monthlyMonthLabel})
              </h3>
              <p>
                {monthDays.length} days · {filteredMonthlyRows.length} students
              </p>
            </div>
            {/* Legend matching Admin Component exactly */}
            <div className="att-month-legend">
              <span>
                <i className="att-month-p">P</i> Present
              </span>
              <span>
                <i className="att-month-a">A</i> Absent
              </span>
              <span>
                <i className="att-month-hd">HD</i> Half Day
              </span>
              <span>
                <i className="att-month-h">H</i> Holiday
              </span>
              <span>
                <i className="att-month-off">-</i> Non-working day
              </span>
            </div>
          </header>

          {/* Search Toolbar */}
          <div className="att-month-search-toolbar">
            <div className="att-student-search-box">
              <Search3DIcon size={18} />
              <input
                type="search"
                value={monthlySearch}
                onChange={(e) => {
                  setMonthlySearch(e.target.value);
                  setMonthlyPage(1);
                }}
                placeholder="Search by student name, roll no, or admission no..."
              />
            </div>
          </div>

          {/* 31-Day Attendance Calendar Grid Table */}
          <div className="att-month-scroll">
            <table className="cms-table att-month-table">
              <thead>
                <tr>
                  <th className="att-sticky-roll">STUDENT ID</th>
                  <th className="att-sticky-name">STUDENT NAME</th>
                  {monthDays.map((d) => (
                    <th key={d.day} className={`att-month-day ${d.isSunday ? "is-sunday" : ""}`}>
                      <b>{d.day}</b>
                      <small>{d.weekday}</small>
                    </th>
                  ))}
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Half Day</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {pagedMonthlyRows.length ? (
                  pagedMonthlyRows.map((r) => (
                    <tr key={r.id || r.studentId}>
                      <td className="att-sticky-roll">{r.studentId || r.rollNo}</td>
                      <td className="att-sticky-name">
                        <span style={{ fontWeight: 600 }}>{r.name}</span>
                      </td>
                      {monthDays.map((d, idx) => (
                        <td key={d.day} className={`att-month-day ${d.isSunday ? "is-sunday" : ""}`}>
                          <MonthlyPill value={r.dailyStatus?.[idx] ?? "-"} />
                        </td>
                      ))}
                      <td style={{ color: "var(--cms-green)", fontWeight: 700 }}>{r.presentCount}</td>
                      <td style={{ color: "var(--cms-red)", fontWeight: 700 }}>{r.absentCount}</td>
                      <td style={{ color: "var(--cms-amber)", fontWeight: 700 }}>{r.halfDayCount}</td>
                      <td style={{ fontWeight: 800 }}>{r.attendancePct}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={monthDays.length + 6} style={{ textAlign: "center", padding: 32 }}>
                      <div className="cms-empty">No attendance records match the selected filters.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <nav className="att-pagination">
            <span className="att-pagination-summary">
              Showing{" "}
              {filteredMonthlyRows.length
                ? `${(monthlyPage - 1) * monthlyPageSize + 1}–${Math.min(monthlyPage * monthlyPageSize, filteredMonthlyRows.length)} of ${filteredMonthlyRows.length} records`
                : "0–0 of 0 records"}
            </span>
            <div className="att-pagination-controls">
              <div className="att-per-page-wrap">
                <span>Per page:</span>
                <select
                  value={monthlyPageSize}
                  onChange={(e) => {
                    setMonthlyPageSize(Number(e.target.value));
                    setMonthlyPage(1);
                  }}
                  className="att-per-page-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                </select>
              </div>
              <button
                type="button"
                disabled={monthlyPage === 1}
                onClick={() => setMonthlyPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="att-page-number">
                {monthlyPage} / {totalMonthlyPages}
              </span>
              <button
                type="button"
                disabled={monthlyPage >= totalMonthlyPages || totalMonthlyPages === 0}
                onClick={() => setMonthlyPage((p) => Math.min(totalMonthlyPages, p + 1))}
              >
                Next
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* View 3: Defaulters */}
      {attView === "defaulters" && !attSection && (
        <div className="cms-card">
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--cms-muted)", fontSize: 13.5 }}>
            Please select a section from the filters above to view attendance defaulters (&lt; 75%).
          </div>
        </div>
      )}

      {attView === "defaulters" && attSection && (
        <div className="cms-card">
          <div className="cms-card-head">
            <div>
              <h2 style={{ margin: 0 }}>
                Attendance Defaulters (&lt; 75% Attendance) — {resolveSectionName(attSection)}
              </h2>
              <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 2 }}>
                Students with attendance below 75% based on monthly class attendance ({monthlyMonthLabel})
              </div>
            </div>
            <span className="cms-badge cms-badge-danger">
              {defaultersList.length} Defaulters
            </span>
          </div>
          <div className="cms-table-wrap">
            <table className="cms-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Classes Attended</th>
                  <th>Attendance %</th>
                  <th>Shortage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {defaultersList.length ? (
                  defaultersList.map((s) => (
                    <tr key={s.studentId}>
                      <td className="cms-strong">{s.rollNo}</td>
                      <td>
                        <strong>{s.name}</strong>
                      </td>
                      <td>
                        {s.classesAttended} / {s.totalClasses}
                      </td>
                      <td style={{ color: "var(--cms-red)", fontWeight: 800 }}>{s.attendancePct}%</td>
                      <td style={{ color: "var(--cms-red)" }}>{(75 - s.attendancePct).toFixed(1)}% Shortage</td>
                      <td>
                        <button
                          className="cms-btn cms-btn-ghost"
                          style={{ fontSize: 11.5, padding: "4px 8px" }}
                          onClick={() => notify(`Notice SMS sent to parent of ${s.name}`)}
                        >
                          Send Notice
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 28 }}>
                      <div className="cms-empty">No attendance defaulters (&lt; 75%) in this section for this month.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
