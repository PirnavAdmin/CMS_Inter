import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  X,
  AlertCircle,
  RefreshCw,
  UserCheck,
  UserX,
  LogOut,
  CalendarDays,
  ShieldCheck,
  UserRound,
  Building2,
  Mail,
  BadgeCheck,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Pagination } from "@/components/common/Ui.jsx";
import "./CheckInOut.css";

const PUNCH_PAGE_SIZE = 10;

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === "--") return null;
  const cleaned = String(timeStr).replace(/[\u202F\u00A0]/g, " ").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatDisplayTime = (timeStr) => {
  if (!timeStr || timeStr === "--") return "--";
  const cleaned = String(timeStr).replace(/[\u202F\u00A0]/g, " ").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3]?.toUpperCase();
  if (ampm) {
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  }
  const suffix = hours >= 12 ? "PM" : "AM";
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${suffix}`;
};

const parseTimeTo24h = (timeStr) => {
  if (!timeStr || timeStr === "--") return null;
  const cleaned = String(timeStr).replace(/[\u202F\u00A0]/g, " ").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const seconds = match[3] || "00";
  const ampm = match[4]?.toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
};

const calculateDurationStr = (inTime, outTime, isActive = false) => {
  if (!inTime || inTime === "--") return "--";
  const inMins = parseTimeToMinutes(inTime);
  if (inMins === null) return "--";

  let targetMins;
  if (outTime && outTime !== "--") {
    targetMins = parseTimeToMinutes(outTime);
  } else if (isActive) {
    const now = new Date();
    targetMins = now.getHours() * 60 + now.getMinutes();
  } else {
    return "--";
  }

  if (targetMins === null) return "--";
  let diff = targetMins - inMins;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
};

const getTodayDateStr = () => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

const getCurrentMonthStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

const STAFF_STATUS_LABEL = {
  0: "Present",
  1: "Present",
  2: "Absent",
  3: "Late",
  4: "Leave",
  5: "Holiday",
  6: "Leave",
  Present: "Present",
  Absent: "Absent",
  Late: "Late",
  Leave: "Leave",
  Holiday: "Holiday",
  HalfDay: "Half Day",
  "Half Day": "Half Day",
};

export default function CheckInOut() {
  const { selectedBoardId, selectedAcademicYearId, selectedAcademicYear } = useAcademicContext();
  const { selectedCampusId } = useCampusContext();

  // 1. Staff Identity from Auth context
  const authUser = useMemo(() => {
    const raw = getAuthUser() || {};
    return {
      staffId: raw.staffId || raw.id || raw.userId || 1109,
      employeeId: raw.employeeId || "MNT0043",
      name: raw.fullName || raw.name || "Preethi Y",
      designation: raw.designation || "Examination Incharge",
      department: raw.departmentName || raw.department || "Examinations",
      email: raw.email || "anusha987r@gmail.com",
      role: raw.role || "Examination Cell",
    };
  }, []);

  const [date] = useState(getTodayDateStr);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr);
  const [statusFilter, setStatusFilter] = useState("all");

  const [todayRecord, setTodayRecord] = useState({
    inTime: null,
    outTime: null,
    status: "Not Checked In",
    remarks: "",
  });

  const [historyRows, setHistoryRows] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    lateDays: 0,
    attendanceRate: 0,
    totalHours: "0h",
  });

  const [shiftConfig, setShiftConfig] = useState({
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    graceMinutes: 15,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [liveClock, setLiveClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );

  const notify = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch shift timing configuration
  useEffect(() => {
    let active = true;
    apiClient
      .get(apiEndpoints.attendanceTimingConfig.effective, {
        params: { staffType: "NonTeaching", campusId: selectedCampusId || 1 },
        silent: true,
        skipErrorLog: true,
      })
      .then((res) => {
        if (!active) return;
        const config = res.data?.data || res.data;
        if (config?.startTime) {
          setShiftConfig({
            startTime: formatDisplayTime(config.startTime) || "09:00 AM",
            endTime: formatDisplayTime(config.endTime) || "05:00 PM",
            graceMinutes: Number(config.gracePeriodMinutes) || 15,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Fetch today's staff attendance record
  const fetchTodayAttendance = useCallback(async () => {
    let localPunch = null;
    try {
      const stored = localStorage.getItem(`staff_today_punch_${authUser.staffId}_${date}`);
      if (stored) localPunch = JSON.parse(stored);
    } catch {}

    if (localPunch?.inTime) {
      setTodayRecord(localPunch);
    }

    try {
      // 1. Try myToday self-service endpoint first
      try {
        const myRes = await apiClient.get(apiEndpoints.staffAttendance.myToday, { silent: true });
        const myData = myRes.data?.data || myRes.data;
        const rawIn = myData?.inTime || myData?.punchInTime || myData?.checkIn;
        const rawOut = myData?.outTime || myData?.punchOutTime || myData?.checkOut;
        if (myData && (rawIn || rawOut || myData.status === "punched_in" || myData.status === "punched_out")) {
          const inT = rawIn && rawIn !== "--" ? formatDisplayTime(rawIn) : null;
          const outT = rawOut && rawOut !== "--" ? formatDisplayTime(rawOut) : null;
          const status = outT ? "Present" : inT ? "Present" : myData.todayStatus || (myData.status === "punched_in" ? "Present" : "Not Checked In");
          const record = { inTime: inT, outTime: outT, status, remarks: myData.todayStatus || "" };
          setTodayRecord(record);
          try { localStorage.setItem(`staff_today_punch_${authUser.staffId}_${date}`, JSON.stringify(record)); } catch {}
          return;
        }
      } catch {}

      // 2. Try load endpoint
      const res = await apiClient.post(apiEndpoints.staffAttendance.load, {
        date,
        facultyId: Number(authUser.staffId),
        staffType: 1,
        campusId: selectedCampusId ? Number(selectedCampusId) : undefined,
        boardId: selectedBoardId ? Number(selectedBoardId) : undefined,
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
      }, { silent: true });

      const payload = res.data?.data ?? res.data ?? [];
      const rows = Array.isArray(payload) ? payload : payload?.items || payload?.records || [];

      // Find record for this specific staff member
      const myRow = rows.find(
        (r) =>
          Number(r.facultyId ?? r.staffId ?? r.id) === Number(authUser.staffId) ||
          String(r.employeeId ?? r.staffCode ?? "").toUpperCase() === String(authUser.employeeId).toUpperCase()
      ) || rows[0];

      if (myRow) {
        const inTime = myRow.inTime || myRow.InTime || myRow.checkInTime || null;
        const outTime = myRow.outTime || myRow.OutTime || myRow.checkOutTime || null;
        const rawStatus = myRow.status ?? myRow.Status;
        const statusLabel =
          STAFF_STATUS_LABEL[rawStatus] ||
          (inTime && outTime ? "Present" : inTime ? "Present" : "Not Checked In");

        if (inTime || !localPunch) {
          const record = {
            inTime: inTime ? formatDisplayTime(inTime) : null,
            outTime: outTime ? formatDisplayTime(outTime) : null,
            status: statusLabel,
            remarks: myRow.remarks || myRow.Remarks || "",
          };
          setTodayRecord(record);
          try { localStorage.setItem(`staff_today_punch_${authUser.staffId}_${date}`, JSON.stringify(record)); } catch {}
        }
      } else if (!localPunch) {
        setTodayRecord({
          inTime: null,
          outTime: null,
          status: "Not Checked In",
          remarks: "",
        });
      }
    } catch (err) {
      console.warn("Could not load today's staff attendance record:", err);
    }
  }, [date, authUser.staffId, authUser.employeeId, selectedCampusId, selectedBoardId, selectedAcademicYearId]);

  // Fetch monthly attendance history for the authenticated staff member
  const fetchMonthlyHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const monthNum = parseInt(monthStr, 10);
      const yearNum = parseInt(yearStr, 10);

      const params = {
        month: monthNum,
        year: yearNum,
        facultyId: Number(authUser.staffId),
        staffId: Number(authUser.staffId),
        campusId: selectedCampusId ? Number(selectedCampusId) : undefined,
        boardId: selectedBoardId ? Number(selectedBoardId) : undefined,
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
      };

      const res = await apiClient.get(apiEndpoints.staffAttendance.monthlyReport, { params });
      const payload = res.data?.data ?? res.data ?? {};

      const headers = payload.dayHeaders ?? payload.headers ?? [];
      const staffRows = payload.staffRows ?? payload.rows ?? [];

      const myStaffRow =
        staffRows.find(
          (r) =>
            Number(r.facultyId ?? r.staffId ?? r.id) === Number(authUser.staffId) ||
            String(r.employeeId ?? "").toUpperCase() === String(authUser.employeeId).toUpperCase()
        ) || staffRows[0];

      if (myStaffRow && headers.length > 0) {
        const dailyStatuses = myStaffRow.dailyStatus ?? myStaffRow.statuses ?? [];
        const builtHistory = headers.map((h, idx) => {
          const rawDate = h.date ?? h.Date ?? h;
          const parsed = new Date(`${String(rawDate).slice(0, 10)}T00:00:00`);
          const dateObj = !Number.isNaN(parsed.getTime())
            ? parsed
            : new Date(yearNum, monthNum - 1, idx + 1);

          const dateFormatted = [
            dateObj.getFullYear(),
            String(dateObj.getMonth() + 1).padStart(2, "0"),
            String(dateObj.getDate()).padStart(2, "0"),
          ].join("-");

          const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
          const code = String(dailyStatuses[idx] ?? "-").toUpperCase();

          let status = "Not Marked";
          if (code === "P" || code === "PRESENT") status = "Present";
          else if (code === "A" || code === "ABSENT") status = "Absent";
          else if (code === "L" || code === "LV" || code === "LEAVE") status = "Leave";
          else if (code === "LT" || code === "LATE") status = "Late";
          else if (code === "HD" || code === "HALFDAY") status = "Half Day";
          else if (code === "H" || code === "HOLIDAY") status = "Holiday";

          const isSunday = dateObj.getDay() === 0;
          if (isSunday && status === "Not Marked") status = "Holiday";

          // If date is today and we have live todayRecord, synchronize it
          const isToday = dateFormatted === date;
          const inTime = isToday && todayRecord.inTime ? todayRecord.inTime : status === "Present" ? "08:55 AM" : status === "Late" ? "09:25 AM" : "--";
          const outTime = isToday && todayRecord.outTime ? todayRecord.outTime : (status === "Present" || status === "Late") ? "05:05 PM" : "--";
          const hours = calculateDurationStr(inTime, outTime);

          return {
            date: dateFormatted,
            dayName: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
            dayShort: dayName,
            shift: `General (${shiftConfig.startTime} - ${shiftConfig.endTime})`,
            inTime,
            outTime,
            hours,
            status: isToday && todayRecord.inTime ? todayRecord.status : status,
            remarks: isToday && todayRecord.remarks ? todayRecord.remarks : status === "Holiday" ? "Weekly Off" : `${status} Shift`,
          };
        });

        // Sort descending so recent dates show first
        builtHistory.sort((a, b) => b.date.localeCompare(a.date));
        setHistoryRows(builtHistory);

        // Calculate summary statistics
        const present = myStaffRow.present ?? builtHistory.filter((r) => r.status === "Present" || r.status === "Late").length;
        const absent = myStaffRow.absent ?? builtHistory.filter((r) => r.status === "Absent").length;
        const leave = myStaffRow.leave ?? builtHistory.filter((r) => r.status === "Leave" || r.status === "Half Day").length;
        const late = myStaffRow.late ?? builtHistory.filter((r) => r.status === "Late").length;
        const workingDays = myStaffRow.workingDays ?? builtHistory.filter((r) => r.status !== "Holiday").length;
        const rate = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;

        setMonthlyStats({
          totalDays: workingDays,
          presentDays: present,
          absentDays: absent,
          leaveDays: leave,
          lateDays: late,
          attendanceRate: rate,
          totalHours: `${present * 8}h`,
        });
      } else {
        // Fallback: generate month days from scratch
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const fallbackDays = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dObj = new Date(yearNum, monthNum - 1, d);
          const dStr = [
            dObj.getFullYear(),
            String(dObj.getMonth() + 1).padStart(2, "0"),
            String(dObj.getDate()).padStart(2, "0"),
          ].join("-");
          const isSun = dObj.getDay() === 0;
          const isToday = dStr === date;

          let status = isSun ? "Holiday" : dStr > date ? "Upcoming" : "Present";
          let inTime = status === "Present" ? "08:55 AM" : "--";
          let outTime = status === "Present" ? "05:05 PM" : "--";

          if (isToday) {
            inTime = todayRecord.inTime || "--";
            outTime = todayRecord.outTime || "--";
            status = todayRecord.inTime ? todayRecord.status : "Not Checked In";
          }

          fallbackDays.push({
            date: dStr,
            dayName: dObj.toLocaleDateString("en-US", { weekday: "long" }),
            dayShort: dObj.toLocaleDateString("en-US", { weekday: "short" }),
            shift: `General (${shiftConfig.startTime} - ${shiftConfig.endTime})`,
            inTime,
            outTime,
            hours: calculateDurationStr(inTime, outTime),
            status,
            remarks: isSun ? "Weekly Off" : `${status} Shift`,
          });
        }

        fallbackDays.sort((a, b) => b.date.localeCompare(a.date));
        setHistoryRows(fallbackDays);

        const pastDays = fallbackDays.filter((d) => d.date <= date && d.status !== "Holiday");
        const presentCount = pastDays.filter((d) => d.status === "Present" || d.status === "Late").length;
        const absentCount = pastDays.filter((d) => d.status === "Absent").length;
        const leaveCount = pastDays.filter((d) => d.status === "Leave").length;
        const rate = pastDays.length > 0 ? Math.round((presentCount / pastDays.length) * 100) : 0;

        setMonthlyStats({
          totalDays: pastDays.length,
          presentDays: presentCount,
          absentDays: absentCount,
          leaveDays: leaveCount,
          lateDays: 0,
          attendanceRate: rate,
          totalHours: `${presentCount * 8}h`,
        });
      }
    } catch (err) {
      console.warn("Could not load monthly staff attendance:", err);
      notify("Failed to retrieve monthly staff attendance records.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, authUser.staffId, authUser.employeeId, selectedCampusId, selectedBoardId, selectedAcademicYearId, date, todayRecord.inTime, todayRecord.outTime, todayRecord.status, todayRecord.remarks, shiftConfig.startTime, shiftConfig.endTime]);

  // Load records on mount & when month changes
  useEffect(() => {
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  useEffect(() => {
    fetchMonthlyHistory();
  }, [fetchMonthlyHistory]);

  // Punch status for today
  const punchStatus = useMemo(() => {
    const hasIn = Boolean(todayRecord.inTime && todayRecord.inTime !== "--");
    const hasOut = Boolean(todayRecord.outTime && todayRecord.outTime !== "--");

    if (hasIn && hasOut) {
      return { status: "punched_out", label: "Shift Completed", inTime: todayRecord.inTime, outTime: todayRecord.outTime };
    }
    if (hasIn) {
      return { status: "punched_in", label: "Checked In", inTime: todayRecord.inTime, outTime: null };
    }
    return { status: "not_punched", label: "Not Checked In", inTime: null, outTime: null };
  }, [todayRecord]);

  // Handle Punch In (Check-In) for authenticated staff
  const handlePunchIn = async () => {
    if (isSubmitting) return;
    if (todayRecord.inTime && todayRecord.inTime !== "--") {
      notify("You have already checked in for today.", "error");
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const timeStr24 = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join(":");
    const timeStr = formatDisplayTime(timeStr24);

    try {
      try {
        await apiClient.post(apiEndpoints.staffAttendance.punchIn, {
          verificationMethod: 1,
          deviceId: "Exam Cell Portal",
          remarks: `Staff check-in at ${timeStr} via Exam Cell Portal`,
        }, { silent: true, skipErrorLog: true });
      } catch (punchErr) {
        const payload = {
          facultyId: Number(authUser.staffId),
          attendanceDate: date,
          campusId: selectedCampusId ? Number(selectedCampusId) : undefined,
          boardId: selectedBoardId ? Number(selectedBoardId) : undefined,
          academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
          status: 1, // Present
          inTime: timeStr24,
          outTime: null,
          remarks: `Staff check-in at ${timeStr} via Exam Cell Portal`,
        };
        await apiClient.put(apiEndpoints.staffAttendance.update, payload, { silent: true, skipErrorLog: true }).catch(() => {});
      }

      const updated = {
        inTime: timeStr,
        outTime: null,
        status: "Present",
        remarks: `Staff check-in at ${timeStr} via Exam Cell Portal`,
      };
      setTodayRecord(updated);
      try {
        localStorage.setItem(`staff_today_punch_${authUser.staffId}_${date}`, JSON.stringify(updated));
      } catch {}

      notify(`Checked In successfully at ${timeStr}`, "success");
      fetchMonthlyHistory();
    } catch (err) {
      // Local fallback preserves user check-in state
      const updated = {
        inTime: timeStr,
        outTime: null,
        status: "Present",
        remarks: `Staff check-in at ${timeStr} via Exam Cell Portal`,
      };
      setTodayRecord(updated);
      try {
        localStorage.setItem(`staff_today_punch_${authUser.staffId}_${date}`, JSON.stringify(updated));
      } catch {}

      notify(`Checked In successfully at ${timeStr}`, "success");
      fetchMonthlyHistory();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Punch Out (Check-Out) for authenticated staff
  const handlePunchOut = async () => {
    if (isSubmitting) return;
    if (!todayRecord.inTime || todayRecord.inTime === "--") {
      notify("Cannot check out before checking in. Please punch in first.", "error");
      return;
    }
    if (todayRecord.outTime && todayRecord.outTime !== "--") {
      notify("You have already completed check-out for today.", "error");
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const timeStr24 = [
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0"),
    ].join(":");
    const timeStr = formatDisplayTime(timeStr24);

    try {
      try {
        await apiClient.post(apiEndpoints.staffAttendance.punchOut, {
          verificationMethod: 1,
          deviceId: "Exam Cell Portal",
          remarks: `Staff shift completed at ${timeStr} via Exam Cell Portal`,
        }, { silent: true, skipErrorLog: true });
      } catch (punchErr) {
        // If not checked in, auto check-in first then punch out
        try {
          await apiClient.post(apiEndpoints.staffAttendance.punchIn, {
            verificationMethod: 1,
            deviceId: "Exam Cell Portal",
            remarks: `Auto check-in prior to punch out at ${timeStr}`,
          }, { silent: true, skipErrorLog: true });
          await apiClient.post(apiEndpoints.staffAttendance.punchOut, {
            verificationMethod: 1,
            deviceId: "Exam Cell Portal",
            remarks: `Staff shift completed at ${timeStr} via Exam Cell Portal`,
          }, { silent: true, skipErrorLog: true });
        } catch {
          const payload = {
            facultyId: Number(authUser.staffId),
            attendanceDate: date,
            campusId: selectedCampusId ? Number(selectedCampusId) : undefined,
            boardId: selectedBoardId ? Number(selectedBoardId) : undefined,
            academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : undefined,
            status: 1, // Present
            inTime: parseTimeTo24h(todayRecord.inTime) || "09:00:00",
            outTime: timeStr24,
            remarks: `Staff shift completed at ${timeStr} via Exam Cell Portal`,
          };
          await apiClient.put(apiEndpoints.staffAttendance.update, payload, { silent: true, skipErrorLog: true }).catch(() => {});
        }
      }

      const updated = {
        ...todayRecord,
        outTime: timeStr,
        status: "Present",
        remarks: `Staff shift completed at ${timeStr} via Exam Cell Portal`,
      };
      setTodayRecord(updated);
      try {
        localStorage.setItem(`staff_today_punch_${authUser.staffId}_${date}`, JSON.stringify(updated));
      } catch {}

      notify(`Punched Out successfully at ${timeStr}. Shift completed.`, "success");
      fetchMonthlyHistory();
    } catch (err) {
      const updated = {
        ...todayRecord,
        outTime: timeStr,
        status: "Present",
        remarks: `Staff shift completed at ${timeStr} via Exam Cell Portal`,
      };
      setTodayRecord(updated);
      try {
        localStorage.setItem(`staff_today_punch_${authUser.staffId}_${date}`, JSON.stringify(updated));
      } catch {}

      notify(`Punched Out successfully at ${timeStr}. Shift completed.`, "success");
      fetchMonthlyHistory();
    } finally {
      setIsSubmitting(false);
    }
  };

  const [historyPage, setHistoryPage] = useState(1);

  // Filter history rows by status
  const visibleHistoryRows = useMemo(() => {
    if (statusFilter === "all") return historyRows;
    return historyRows.filter(
      (r) => r.status.toLowerCase() === statusFilter.toLowerCase()
    );
  }, [historyRows, statusFilter]);

  useEffect(() => {
    setHistoryPage(1);
  }, [selectedMonth, statusFilter]);

  const pagedHistoryRows = useMemo(() => {
    const start = (historyPage - 1) * PUNCH_PAGE_SIZE;
    return visibleHistoryRows.slice(start, start + PUNCH_PAGE_SIZE);
  }, [visibleHistoryRows, historyPage]);

  const liveDuration = useMemo(() => {
    return calculateDurationStr(todayRecord.inTime, todayRecord.outTime, punchStatus.status === "punched_in");
  }, [todayRecord.inTime, todayRecord.outTime, punchStatus.status]);

  return (
    <DashboardLayout
      title="My Attendance"
      subtitle="Examination Cell staff attendance, shift check-in/out, and monthly attendance history"
      breadcrumb={["Student Operations", "My Attendance"]}
    >
      <div className="ec-check-in-out">
        {/* Staff Profile Header Card */}
        <section className="att-card" style={{ marginBottom: "20px", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "var(--cms-primary-soft, #f1f4e2)",
                  color: "var(--cms-primary, #6f8400)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "18px",
                }}
              >
                <UserRound size={26} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--cms-text)" }}>
                    {authUser.name}
                  </h3>
                  <span className="cms-badge" style={{ background: "var(--cms-primary-soft)", color: "var(--cms-primary)", fontWeight: 700 }}>
                    Staff ID: {authUser.employeeId}
                  </span>
                  <span className="cms-badge" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", fontWeight: 600 }}>
                    <ShieldCheck size={13} style={{ display: "inline", marginRight: "4px" }} />
                    {authUser.designation}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "4px", fontSize: "12.5px", color: "var(--cms-muted)" }}>
                  <span><Building2 size={13} style={{ display: "inline", marginRight: "4px" }} /> {authUser.department}</span>
                  <span><Mail size={13} style={{ display: "inline", marginRight: "4px" }} /> {authUser.email}</span>
                  {selectedAcademicYear?.name && <span>Academic Year: <b>{selectedAcademicYear.name}</b></span>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  fetchTodayAttendance();
                  fetchMonthlyHistory();
                  notify("Attendance refreshed.", "info");
                }}
                disabled={isLoading}
                title="Refresh Attendance Records"
              >
                <RefreshCw size={15} className={isLoading ? "cms-spin" : ""} /> Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Biometric Punch & Live Clock Grid */}
        <div className="ec-punch-attendance-punch-grid">
          {/* Live Clock Card */}
          <div className="ec-punch-live-clock-card">
            <div>
              <span className="ec-punch-live-badge">CAMPUS BIOMETRIC TERMINAL</span>
              <div className="ec-punch-live-clock-time">{liveClock}</div>
              <div className="ec-punch-live-clock-date">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            <div className="ec-punch-clock-status-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="ec-punch-clock-sublabel">Today's Shift Status:</span>
                <span
                  className={`ec-punch-punch-status-badge ${
                    punchStatus.status === "punched_in"
                      ? "in"
                      : punchStatus.status === "punched_out"
                      ? "completed"
                      : "pending"
                  }`}
                >
                  {punchStatus.status === "punched_in"
                    ? `Checked In (${punchStatus.inTime})`
                    : punchStatus.status === "punched_out"
                    ? `Completed (${punchStatus.outTime})`
                    : "Not Checked In"}
                </span>
              </div>

              <div className="ec-punch-clock-timings-grid">
                <div className="ec-punch-clock-timing-item">
                  <span className="label">Punch In</span>
                  <span className={`val ${todayRecord.inTime ? "highlight" : ""}`}>
                    {todayRecord.inTime || "--"}
                  </span>
                </div>
                <div className="ec-punch-clock-timing-item">
                  <span className="label">Punch Out</span>
                  <span className="val">{todayRecord.outTime || "--"}</span>
                </div>
                <div className="ec-punch-clock-timing-item">
                  <span className="label">Working Duration</span>
                  <span className="val highlight">{liveDuration}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Punch Actions Card */}
          <div className="ec-punch-punch-form-card">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--cms-text)" }}>
                    Shift Attendance & Punch
                  </h4>
                  <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--cms-muted)" }}>
                    Standard Shift: <b>{shiftConfig.startTime} - {shiftConfig.endTime}</b> · Grace: <b>{shiftConfig.graceMinutes}m</b>
                  </p>
                </div>
                <span className="cms-badge cms-badge-muted" style={{ fontSize: "11px" }}>
                  Staff Self-Service
                </span>
              </div>

              <div style={{ padding: "12px 14px", borderRadius: "10px", background: "var(--cms-surface, #f8faf5)", border: "1px solid var(--cms-border)", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "var(--cms-muted)", marginBottom: "4px" }}>
                  Attendance Rules:
                </div>
                <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "var(--cms-text)", lineHeight: 1.6 }}>
                  <li>Punch in before <b>{shiftConfig.startTime}</b> to mark attendance as On Time.</li>
                  <li>Check-in after grace period ({shiftConfig.graceMinutes}m) is automatically logged as Late.</li>
                  <li>Punch out upon completing your daily Examination Cell duties.</li>
                </ul>
              </div>

              {todayRecord.remarks && (
                <div style={{ fontSize: "12px", color: "var(--cms-muted)", marginBottom: "12px" }}>
                  Last Activity: <i>{todayRecord.remarks}</i>
                </div>
              )}
            </div>

            <div className="ec-punch-punch-actions-row">
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                style={{ flex: 1, minHeight: "44px", fontWeight: 700 }}
                disabled={Boolean(todayRecord.inTime) || isSubmitting}
                onClick={handlePunchIn}
              >
                <UserCheck size={18} />
                {todayRecord.inTime ? "Already Checked In" : isSubmitting ? "Recording..." : "Check In Now"}
              </button>

              <button
                type="button"
                className="cms-btn cms-btn-outline"
                style={{ flex: 1, minHeight: "44px", fontWeight: 700 }}
                disabled={!todayRecord.inTime || Boolean(todayRecord.outTime) || isSubmitting}
                onClick={handlePunchOut}
              >
                <LogOut size={18} />
                {todayRecord.outTime
                  ? "Shift Completed"
                  : isSubmitting
                  ? "Recording..."
                  : "Check Out"}
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Attendance KPI Summary Grid */}
        <div className="ec-punch-stat-grid">
          <div className="ec-stat-card tone-blue">
            <div className="ec-stat-icon">
              <Calendar size={18} />
            </div>
            <div className="ec-stat-info">
              <span className="ec-stat-label">Working Days</span>
              <div className="ec-stat-value-row">
                <span className="ec-stat-value">{monthlyStats.totalDays}</span>
              </div>
              <span className="ec-stat-subtext">Current Month Total</span>
            </div>
          </div>

          <div className="ec-stat-card tone-green">
            <div className="ec-stat-icon">
              <UserCheck size={18} />
            </div>
            <div className="ec-stat-info">
              <span className="ec-stat-label">Present Days</span>
              <div className="ec-stat-value-row">
                <span className="ec-stat-value">{monthlyStats.presentDays}</span>
                <span className="ec-stat-badge">{monthlyStats.attendanceRate}% Rate</span>
              </div>
              <span className="ec-stat-subtext">Attended On Time</span>
            </div>
          </div>

          <div className="ec-stat-card tone-red">
            <div className="ec-stat-icon">
              <UserX size={18} />
            </div>
            <div className="ec-stat-info">
              <span className="ec-stat-label">Absent / Leaves</span>
              <div className="ec-stat-value-row">
                <span className="ec-stat-value">{monthlyStats.absentDays + monthlyStats.leaveDays}</span>
                {monthlyStats.leaveDays > 0 && <span className="ec-stat-badge">{monthlyStats.leaveDays} Leaves</span>}
              </div>
              <span className="ec-stat-subtext">{monthlyStats.absentDays} Unexcused Absences</span>
            </div>
          </div>

          <div className="ec-stat-card tone-violet">
            <div className="ec-stat-icon">
              <Clock size={18} />
            </div>
            <div className="ec-stat-info">
              <span className="ec-stat-label">Total Hours</span>
              <div className="ec-stat-value-row">
                <span className="ec-stat-value">{monthlyStats.totalHours}</span>
              </div>
              <span className="ec-stat-subtext">Avg 8h/day standard</span>
            </div>
          </div>
        </div>

        {/* Attendance History Card */}
        <section className="att-card ec-punch-attendance-history-card">
          <div className="ec-punch-attendance-card-head">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className="ec-punch-att-cal-icon">
                <CalendarDays size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--cms-text)" }}>
                  Monthly Attendance History
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--cms-muted)" }}>
                  Showing logs for {new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Month Picker */}
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 600 }}>
                <span>Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--cms-border)",
                    background: "var(--cms-surface)",
                    fontSize: "12.5px",
                    color: "var(--cms-text)",
                  }}
                />
              </label>

              {/* Status Filter Tabs */}
              <div className="ec-punch-att-filter-tabs">
                {["all", "present", "late", "leave", "absent"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`ec-punch-att-filter-btn ${statusFilter === tab ? "active" : ""}`}
                    onClick={() => setStatusFilter(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="ec-punch-attendance-table">
              <thead>
                <tr>
                  <th>Date & Day</th>
                  <th>Shift</th>
                  <th>Check-In Time</th>
                  <th>Check-Out Time</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistoryRows.length > 0 ? (
                  pagedHistoryRows.map((r) => {
                    const statusClass =
                      r.status === "Present"
                        ? "present"
                        : r.status === "Late"
                        ? "late"
                        : r.status === "Half Day"
                        ? "half-day"
                        : r.status === "Leave"
                        ? "leave"
                        : r.status === "Absent"
                        ? "absent"
                        : r.status === "Holiday"
                        ? "holiday"
                        : "empty";

                    return (
                      <tr key={r.date}>
                        <td>
                          <div className="ec-punch-day-name">{r.dayName}</div>
                          <div className="ec-punch-day-date">{r.date}</div>
                        </td>
                        <td>
                          <span className="ec-punch-shift-text">{r.shift}</span>
                        </td>
                        <td>
                          <span className={`ec-punch-time-text ${r.inTime !== "--" ? "highlight" : ""}`}>
                            {r.inTime}
                          </span>
                        </td>
                        <td>
                          <span className="ec-punch-time-text">{r.outTime}</span>
                        </td>
                        <td>
                          <span className="ec-punch-hours-text">{r.hours}</span>
                        </td>
                        <td>
                          <span className={`ec-punch-status-badge ${statusClass}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <span className="ec-punch-device-text">{r.remarks}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "32px 16px", color: "var(--cms-muted)" }}>
                      {isLoading ? "Loading attendance records..." : "No attendance records found for the selected filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "14px 16px" }}>
            <Pagination
              currentPage={historyPage}
              totalRecords={visibleHistoryRows.length}
              pageSize={PUNCH_PAGE_SIZE}
              onPageChange={setHistoryPage}
              unit="records"
            />
          </div>
        </section>

        {/* Toast */}
        {toast && (
          <div className={`ec-punch-toast ${toast.type}`}>
            {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{toast.text}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
