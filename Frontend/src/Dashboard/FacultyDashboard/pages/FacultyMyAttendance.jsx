import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  CheckCircle2,
  Briefcase,
  UserX,
  AlertCircle,
  Fingerprint,
} from "lucide-react";
import "../styles/FacultyMyAttendance.css";
import { useFacultySafe } from "../FacultyContext.jsx";

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

const calculateDurationStr = (inTime, outTime, isActive = false) => {
  if (!inTime || inTime === "--") return "0h 0m";
  const inMins = parseTimeToMinutes(inTime);
  if (inMins === null) return "0h 0m";

  let targetMins;
  if (outTime && outTime !== "--") {
    targetMins = parseTimeToMinutes(outTime);
  } else if (isActive) {
    const now = new Date();
    targetMins = now.getHours() * 60 + now.getMinutes();
  } else {
    return "0h 0m";
  }

  if (targetMins === null) return "0h 0m";
  let diff = targetMins - inMins;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hours}h ${mins}m`;
};

export default function FacultyMyAttendance() {
  const context = useFacultySafe();
  // Shift duration updates on page load/refresh and periodically every minute
  const [shiftUpdateTick, setShiftUpdateTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setShiftUpdateTick((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Daily Punch State: resets every day, no localStorage used
  // Status lifecycle: "not_punched" -> "punched_in" -> "punched_out"
  const [dailyPunch, setDailyPunch] = useState({
    status: "not_punched",
    inTime: null,
    outTime: null,
  });

  // Regularization state for today: null | "pending" | "approved"
  const [todayRegularization, setTodayRegularization] = useState(null);

  // AM Shift start time is 09:00 AM (540 minutes from midnight)
  const SHIFT_START_MINUTES = 9 * 60; // 09:00 AM
  const isLateLogin = useMemo(() => {
    if (!dailyPunch.inTime) return false;
    const inMins = parseTimeToMinutes(dailyPunch.inTime);
    return inMins !== null && inMins > SHIFT_START_MINUTES;
  }, [dailyPunch.inTime]);

  // Today's attendance status in the table:
  const todayStatus = useMemo(() => {
    if (dailyPunch.status === "not_punched") return "Absent";
    if (todayRegularization === "approved") return "Present";
    if (isLateLogin) return "Late";
    return "Present";
  }, [dailyPunch.status, todayRegularization, isLateLogin]);

  // Can regularize if logged in late and not yet approved
  const canTodayRegularize = dailyPunch.status !== "not_punched" && isLateLogin && todayRegularization !== "approved";

  // Shift duration for Attendance & Shift Card:
  const clockShiftDuration = useMemo(() => {
    if (dailyPunch.status === "punched_out" && dailyPunch.inTime && dailyPunch.outTime) {
      return calculateDurationStr(dailyPunch.inTime, dailyPunch.outTime, false);
    }
    if (dailyPunch.status === "punched_in" && dailyPunch.inTime) {
      return calculateDurationStr(dailyPunch.inTime, null, true);
    }
    return "--";
  }, [dailyPunch, shiftUpdateTick]);

  // Finalized shift duration for attendance logs (table):
  const finalizedShiftDuration = useMemo(() => {
    if (dailyPunch.status === "punched_out" && dailyPunch.inTime && dailyPunch.outTime) {
      return calculateDurationStr(dailyPunch.inTime, dailyPunch.outTime, false);
    }
    if (dailyPunch.status === "punched_in" && dailyPunch.inTime) {
      return calculateDurationStr(dailyPunch.inTime, null, true);
    }
    return "--";
  }, [dailyPunch, shiftUpdateTick]);

  const [toast, setToast] = useState(null);

  const notify = (text, type = "success") => {
    if (context?.notify) {
      context.notify(text, type);
    } else {
      setToast({ text, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handlePunchIn = () => {
    if (dailyPunch.status !== "not_punched") return;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    setDailyPunch({
      status: "punched_in",
      inTime: timeStr,
      outTime: null,
    });
    if (context?.setPunchState) {
      context.setPunchState({ isPunchedIn: true, inTime: timeStr, outTime: null, hoursWorked: "Just punched in" });
    }
    const inMins = parseTimeToMinutes(timeStr);
    const isLate = inMins !== null && inMins > SHIFT_START_MINUTES;
    if (isLate) {
      notify(`Checked In at ${timeStr} (Late punch logged after 09:00 AM shift)`, "success");
    } else {
      notify(`Checked In Successfully at ${timeStr}`, "success");
    }
  };

  const handlePunchOut = () => {
    if (dailyPunch.status !== "punched_in") return;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    setDailyPunch((prev) => ({
      ...prev,
      status: "punched_out",
      outTime: timeStr,
    }));
    if (context?.setPunchState) {
      context.setPunchState({ isPunchedIn: false, inTime: dailyPunch.inTime, outTime: timeStr });
    }
    notify(`Punched Out Successfully at ${timeStr}`, "success");
  };

  // Formatted date string matching reference: e.g. "Wed, Oct 14, 2026"
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  // Attendance Filter: "week" | "last_week" | "month" | "last_month"
  const [activeFilter, setActiveFilter] = useState("week");

  // Dynamic datasets matching school operations (Mon–Sat)
  const thisWeekLogs = useMemo(() => [
    {
      id: "w-1",
      day: "Mon",
      date: "05/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "08:55 AM",
      outTime: "06:02 PM",
      hours: "9h 7m",
      device: "Bio-Station 01 (Main Gate)",
      status: "Present",
      canRegularize: false,
    },
    {
      id: "w-2",
      day: "Tue",
      date: "06/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "08:42 AM",
      outTime: "04:36 PM",
      hours: "7h 54m",
      device: "Bio-Station 01 (Main Gate)",
      status: "Present",
      canRegularize: false,
    },
    {
      id: "w-3",
      day: "Wed",
      date: "07/10/2026",
      rawDate: "2026-10-07",
      shift: "Morning (09:00–16:30)",
      inTime: dailyPunch.inTime || "--",
      outTime: dailyPunch.outTime || "--",
      hours: dailyPunch.status === "punched_out" ? finalizedShiftDuration : (dailyPunch.status === "punched_in" ? "--" : "0h 0m"),
      device: dailyPunch.status !== "not_punched" ? "Bio-Station 01 (Main Gate)" : "--",
      status: todayStatus,
      canRegularize: canTodayRegularize,
      isToday: true,
      regularizationState: todayRegularization,
    },
    {
      id: "w-4",
      day: "Thu",
      date: "08/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "--",
      outTime: "--",
      hours: "0h 0m",
      device: "--",
      status: "--",
      canRegularize: false,
    },
    {
      id: "w-5",
      day: "Fri",
      date: "09/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "--",
      outTime: "--",
      hours: "0h 0m",
      device: "--",
      status: "--",
      canRegularize: false,
    },
    {
      id: "w-6",
      day: "Sat",
      date: "10/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "--",
      outTime: "--",
      hours: "0h 0m",
      device: "--",
      status: "--",
      canRegularize: false,
    },
  ], [dailyPunch, finalizedShiftDuration, todayStatus, canTodayRegularize, todayRegularization]);

  const lastWeekLogs = useMemo(() => [
    {
      id: "lw-1",
      day: "Mon",
      date: "28/09/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "08:30 AM",
      outTime: "04:35 PM",
      hours: "8h 05m",
      device: "Bio-Station 01 (Main Gate)",
      status: "Present",
      canRegularize: false,
    },
    {
      id: "lw-2",
      day: "Tue",
      date: "29/09/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "08:28 AM",
      outTime: "04:31 PM",
      hours: "8h 03m",
      device: "Bio-Station 01 (Main Gate)",
      status: "Present",
      canRegularize: false,
    },
    {
      id: "lw-3",
      day: "Wed",
      date: "30/09/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "08:50 AM",
      outTime: "04:30 PM",
      hours: "7h 40m",
      device: "Bio-Station 02 (Academic Block)",
      status: "Late",
      canRegularize: true,
    },
    {
      id: "lw-4",
      day: "Thu",
      date: "01/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "08:32 AM",
      outTime: "04:30 PM",
      hours: "7h 58m",
      device: "Bio-Station 01 (Main Gate)",
      status: "Present",
      canRegularize: false,
    },
    {
      id: "lw-5",
      day: "Fri",
      date: "02/10/2026",
      shift: "General",
      inTime: "--",
      outTime: "--",
      hours: "0h 0m",
      device: "--",
      status: "Holiday",
      canRegularize: false,
    },
    {
      id: "lw-6",
      day: "Sat",
      date: "03/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "08:35 AM",
      outTime: "04:30 PM",
      hours: "7h 55m",
      device: "Bio-Station 01 (Main Gate)",
      status: "Present",
      canRegularize: false,
    },
  ], []);

  const monthLogs = useMemo(() => [
    { id: "m-01", day: "Thu", date: "01/10/2026", shift: "Morning (08:30–16:30)", inTime: "08:32 AM", outTime: "04:30 PM", hours: "7h 58m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "m-02", day: "Fri", date: "02/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-03", day: "Sat", date: "03/10/2026", shift: "Morning (08:30–16:30)", inTime: "08:35 AM", outTime: "04:30 PM", hours: "7h 55m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "m-04", day: "Sun", date: "04/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-05", day: "Mon", date: "05/10/2026", shift: "Morning (08:30–16:30)", inTime: "08:55 AM", outTime: "06:02 PM", hours: "9h 7m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "m-06", day: "Tue", date: "06/10/2026", shift: "Morning (08:30–16:30)", inTime: "08:42 AM", outTime: "04:36 PM", hours: "7h 54m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    {
      id: "m-07",
      day: "Wed",
      date: "07/10/2026",
      rawDate: "2026-10-07",
      shift: "Morning (09:00–16:30)",
      inTime: dailyPunch.inTime || "--",
      outTime: dailyPunch.outTime || "--",
      hours: dailyPunch.status === "punched_out" ? finalizedShiftDuration : (dailyPunch.status === "punched_in" ? "--" : "0h 0m"),
      device: dailyPunch.status !== "not_punched" ? "Bio-Station 01 (Main Gate)" : "--",
      status: todayStatus,
      canRegularize: canTodayRegularize,
      isToday: true,
      regularizationState: todayRegularization,
    },
    { id: "m-08", day: "Thu", date: "08/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-09", day: "Fri", date: "09/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-10", day: "Sat", date: "10/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-11", day: "Sun", date: "11/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-12", day: "Mon", date: "12/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-13", day: "Tue", date: "13/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-14", day: "Wed", date: "14/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-15", day: "Thu", date: "15/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-16", day: "Fri", date: "16/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-17", day: "Sat", date: "17/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-18", day: "Sun", date: "18/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-19", day: "Mon", date: "19/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-20", day: "Tue", date: "20/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-21", day: "Wed", date: "21/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-22", day: "Thu", date: "22/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-23", day: "Fri", date: "23/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-24", day: "Sat", date: "24/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-25", day: "Sun", date: "25/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-26", day: "Mon", date: "26/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-27", day: "Tue", date: "27/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-28", day: "Wed", date: "28/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-29", day: "Thu", date: "29/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-30", day: "Fri", date: "30/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
    { id: "m-31", day: "Sat", date: "31/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "--", canRegularize: false },
  ], [dailyPunch, finalizedShiftDuration, todayStatus, canTodayRegularize, todayRegularization]);

  const lastMonthLogs = useMemo(() => [
    { id: "lm-01", day: "Tue", date: "01/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:28 AM", outTime: "04:30 PM", hours: "8h 02m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-02", day: "Wed", date: "02/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:30 AM", outTime: "04:32 PM", hours: "8h 02m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-03", day: "Thu", date: "03/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:25 AM", outTime: "04:30 PM", hours: "8h 05m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-04", day: "Fri", date: "04/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:31 AM", outTime: "04:31 PM", hours: "8h 00m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-05", day: "Sat", date: "05/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:35 AM", outTime: "04:29 PM", hours: "7h 54m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-06", day: "Sun", date: "06/09/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "lm-07", day: "Mon", date: "07/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:29 AM", outTime: "04:30 PM", hours: "8h 01m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-08", day: "Tue", date: "08/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:30 AM", outTime: "04:30 PM", hours: "8h 00m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-09", day: "Wed", date: "09/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:27 AM", outTime: "04:32 PM", hours: "8h 05m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-10", day: "Thu", date: "10/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:33 AM", outTime: "04:35 PM", hours: "8h 02m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-11", day: "Fri", date: "11/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:54 AM", outTime: "04:30 PM", hours: "7h 36m", device: "Bio-Station 02 (Academic Block)", status: "Late", canRegularize: true },
    { id: "lm-12", day: "Sat", date: "12/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:32 AM", outTime: "04:30 PM", hours: "7h 58m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-13", day: "Sun", date: "13/09/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "lm-14", day: "Mon", date: "14/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:28 AM", outTime: "04:31 PM", hours: "8h 03m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-15", day: "Tue", date: "15/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:31 AM", outTime: "01:00 PM", hours: "4h 29m", device: "Bio-Station 01 (Main Gate)", status: "Half Day", canRegularize: true },
    { id: "lm-16", day: "Wed", date: "16/09/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Leave", canRegularize: false },
    { id: "lm-17", day: "Thu", date: "17/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:30 AM", outTime: "04:35 PM", hours: "8h 05m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-18", day: "Fri", date: "18/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:55 AM", outTime: "04:30 PM", hours: "7h 35m", device: "Bio-Station 02 (Academic Block)", status: "Late", canRegularize: true },
    { id: "lm-19", day: "Sat", date: "19/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:35 AM", outTime: "04:32 PM", hours: "7h 57m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-20", day: "Sun", date: "20/09/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "lm-21", day: "Mon", date: "21/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:26 AM", outTime: "04:33 PM", hours: "8h 07m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-22", day: "Tue", date: "22/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:29 AM", outTime: "04:30 PM", hours: "8h 01m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-23", day: "Wed", date: "23/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:32 AM", outTime: "04:30 PM", hours: "7h 58m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-24", day: "Thu", date: "24/09/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Absent", canRegularize: true },
    { id: "lm-25", day: "Fri", date: "25/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:28 AM", outTime: "04:31 PM", hours: "8h 03m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-26", day: "Sat", date: "26/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:34 AM", outTime: "04:30 PM", hours: "7h 56m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-27", day: "Sun", date: "27/09/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "lm-28", day: "Mon", date: "28/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:30 AM", outTime: "04:35 PM", hours: "8h 05m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-29", day: "Tue", date: "29/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:28 AM", outTime: "04:31 PM", hours: "8h 03m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "lm-30", day: "Wed", date: "30/09/2026", shift: "Morning (08:30–16:30)", inTime: "08:50 AM", outTime: "04:30 PM", hours: "7h 40m", device: "Bio-Station 02 (Academic Block)", status: "Present", canRegularize: false },
  ], []);

  const activeLogs = useMemo(() => {
    switch (activeFilter) {
      case "week":
        return thisWeekLogs;
      case "last_week":
        return lastWeekLogs;
      case "month":
        return monthLogs;
      case "last_month":
        return lastMonthLogs;
      default:
        return thisWeekLogs;
    }
  }, [activeFilter, thisWeekLogs, lastWeekLogs, monthLogs, lastMonthLogs]);

  // Dynamic analytics cards depending on selected tab (Week / Last Week / Month / Last Month)
  const analyticsMetrics = useMemo(() => {
    const isTodayPresent = dailyPunch.status !== "not_punched";
    const isLateToday = isLateLogin && todayRegularization !== "approved";
    switch (activeFilter) {
      case "week":
        return {
          workingDays: "6 Days",
          workingDaysSub: "Current Week (Mon–Sat)",
          presentDays: isTodayPresent ? "3 Days" : "2 Days",
          presentDaysSub: "Biometric verified to date",
          leaves: "0 Days",
          leavesSub: isLateToday ? "1 Late punch logged" : "No leaves applied",
          absentDays: isTodayPresent ? "0 Days" : "1 Day",
          absentDaysSub: isTodayPresent ? "No absences this week" : "Current day unpunched",
        };
      case "last_week":
        return {
          workingDays: "5 Days",
          workingDaysSub: "Mon–Sat (1 Holiday)",
          presentDays: "4 Days",
          presentDaysSub: "Biometric verified",
          leaves: "0 Days",
          leavesSub: "1 Late punch logged",
          absentDays: "0 Days",
          absentDaysSub: "No unexcused absences",
        };
      case "month":
        return {
          workingDays: "25 Days",
          workingDaysSub: "Current Month (Oct 2026)",
          presentDays: isTodayPresent ? "5 Days" : "4 Days",
          presentDaysSub: "Biometric verified to date",
          leaves: "0 Days",
          leavesSub: isLateToday ? "1 Late punch logged" : "0 CL applied",
          absentDays: isTodayPresent ? "0 Days" : "1 Day",
          absentDaysSub: isTodayPresent ? "No unexcused absences" : "1 Unexcused absence",
        };
      case "last_month":
        return {
          workingDays: "26 Days",
          workingDaysSub: "September 2026 (30 Days)",
          presentDays: "22 Days",
          presentDaysSub: "Biometric verified",
          leaves: "2 Days",
          leavesSub: "1 CL, 1 OD approved",
          absentDays: "1 Day",
          absentDaysSub: "1 Unexcused absence (24 Sep)",
        };
      default:
        return {
          workingDays: "6 Days",
          workingDaysSub: "Current Week (Mon–Sat)",
          presentDays: isTodayPresent ? "3 Days" : "2 Days",
          presentDaysSub: "Biometric verified",
          leaves: "0 Days",
          leavesSub: isLateToday ? "1 Late punch logged" : "No leaves applied",
          absentDays: isTodayPresent ? "0 Days" : "1 Day",
          absentDaysSub: isTodayPresent ? "No absences this week" : "Current day unpunched",
        };
    }
  }, [activeFilter, dailyPunch.status, isLateLogin, todayRegularization]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Present":
        return "present";
      case "Late":
        return "late";
      case "Half Day":
        return "half-day";
      case "Leave":
        return "leave";
      case "Absent":
        return "absent";
      case "Holiday":
        return "holiday";
      case "-":
      case "--":
        return "empty";
      default:
        return "empty";
    }
  };

  return (
    <div className="sp-faculty-attendance-page">
      {/* Top Punch & Shift Grid */}
      <div className="sp-attendance-top-grid">
        {/* Left Card: Attendance & Shift Summary */}
        <div className="cms-card sp-shift-summary-card">
          <div className="sp-card-header">
            <h3 className="sp-card-title">Attendance & Shift Summary</h3>
            <p className="sp-card-desc">
              Campus shift schedule, check-in status & calculated shift duration.
            </p>
          </div>

          <div className="sp-summary-inner-box">
            {/* Check Status Row - Centered in middle */}
            <div className="sp-summary-status-row">
              <span className="sp-summary-label">Check Status:</span>
              <span
                className={`sp-check-status-badge ${
                  dailyPunch.status === "punched_in"
                    ? "in"
                    : dailyPunch.status === "punched_out"
                    ? "completed"
                    : "not-checked"
                }`}
              >
                <span className="sp-status-bullet">•</span>
                {dailyPunch.status === "punched_in"
                  ? `Checked In (${dailyPunch.inTime})`
                  : dailyPunch.status === "punched_out"
                  ? `Completed (${dailyPunch.outTime})`
                  : "Not Checked In"}
              </span>
            </div>

            {/* 3 Metric Columns: CHECK IN, CHECK OUT, SHIFT DURATION */}
            <div className="sp-summary-metric-cols">
              <div className="sp-summary-col">
                <span className="sp-metric-col-label">CHECK IN</span>
                <span className={`sp-metric-col-val ${dailyPunch.inTime ? "highlight" : ""}`}>
                  {dailyPunch.inTime || "--:-- --"}
                </span>
              </div>
              <div className="sp-summary-col">
                <span className="sp-metric-col-label">CHECK OUT</span>
                <span className="sp-metric-col-val">
                  {dailyPunch.outTime || "--:-- --"}
                </span>
              </div>
              <div className="sp-summary-col">
                <span className="sp-metric-col-label">SHIFT DURATION</span>
                <span className={`sp-metric-col-val ${dailyPunch.status === "punched_in" ? "highlight" : ""}`}>
                  {clockShiftDuration === "--" ? "--:--" : clockShiftDuration}
                </span>
              </div>
            </div>

            {/* Bottom Shift & Date Info */}
            <div className="sp-summary-foot-row">
              <div className="sp-summary-foot-left">
                <span className="sp-foot-label">Campus Shift:</span>
                <Clock size={13} className="sp-foot-icon" />
                <span className="sp-foot-val">09:00 AM – 04:30 PM</span>
              </div>
              <div className="sp-summary-foot-right">
                <Calendar size={13} className="sp-foot-icon" />
                <span className="sp-foot-val">{formattedToday}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Check-In / Check-Out */}
        <div className="cms-card sp-punch-action-card">
          <div className="sp-card-header">
            <h3 className="sp-card-title">Check-In / Check-Out</h3>
            <p className="sp-card-desc">
              Click below to record your campus entry or exit timestamp.<br />
              Instant biometric verification enabled.
            </p>
          </div>

          <div className="sp-punch-twin-grid">
            {/* Check In Panel */}
            <div className="sp-twin-panel checkin-panel">
              <div className="sp-twin-icon-box checkin">
                <LogIn size={16} />
              </div>
              <div className="sp-twin-title checkin">CHECK IN</div>

              {/* Dotted Arc Gauge */}
              <div className="sp-arc-gauge-container">
                <svg viewBox="0 0 160 82" className="sp-arc-svg checkin-arc" fill="none">
                  <path
                    d="M 22 72 A 58 58 0 0 1 138 72"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="sp-gauge-center">
                  <span className="sp-gauge-time">{dailyPunch.inTime || "--:-- --"}</span>
                  <span className="sp-gauge-sub">{dailyPunch.inTime ? "Checked In" : "Not Checked In"}</span>
                </div>
              </div>

              {/* Check In Button */}
              <button
                type="button"
                className={`sp-punch-pill-btn checkin ${
                  dailyPunch.status === "not_punched" ? "active" : "disabled"
                }`}
                disabled={dailyPunch.status !== "not_punched"}
                onClick={handlePunchIn}
              >
                <Fingerprint size={15} />
                <span>Check In</span>
              </button>

              <div className="sp-punch-foot-hint">Allowed: 09:00 AM – 04:30 PM</div>
            </div>

            {/* Check Out Panel */}
            <div className="sp-twin-panel checkout-panel">
              <div className="sp-twin-icon-box checkout">
                <LogOut size={16} />
              </div>
              <div className="sp-twin-title checkout">CHECK OUT</div>

              {/* Dotted Arc Gauge */}
              <div className="sp-arc-gauge-container">
                <svg viewBox="0 0 160 82" className="sp-arc-svg checkout-arc" fill="none">
                  <path
                    d="M 22 72 A 58 58 0 0 1 138 72"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="2 7"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="sp-gauge-center">
                  <span className="sp-gauge-time">{dailyPunch.outTime || "--:-- --"}</span>
                  <span className="sp-gauge-sub">{dailyPunch.outTime ? "Checked Out" : "Not Checked Out"}</span>
                </div>
              </div>

              {/* Check Out Button */}
              <button
                type="button"
                className={`sp-punch-pill-btn checkout ${
                  dailyPunch.status === "punched_in" ? "active" : "inactive"
                }`}
                disabled={dailyPunch.status !== "punched_in"}
                onClick={handlePunchOut}
              >
                <LogOut size={15} />
                <span>Check Out</span>
              </button>

              <div className="sp-punch-foot-hint">After check-in only</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 4 Metric Cards */}
      <div className="sp-metric-cards-grid">
        {/* Card 1: Working Days */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box green">
            <Calendar size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Working Days</div>
            <div className="sp-kpi-value">{analyticsMetrics.workingDays}</div>
            <div className="sp-kpi-sub">{analyticsMetrics.workingDaysSub}</div>
          </div>
        </div>

        {/* Card 2: Present Days */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box green">
            <CheckCircle2 size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Present Days</div>
            <div className="sp-kpi-value green-val">{analyticsMetrics.presentDays}</div>
            <div className="sp-kpi-sub">{analyticsMetrics.presentDaysSub}</div>
          </div>
        </div>

        {/* Card 3: Approved Leaves */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box purple">
            <Briefcase size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Approved Leaves</div>
            <div className="sp-kpi-value">{analyticsMetrics.leaves}</div>
            <div className="sp-kpi-sub">{analyticsMetrics.leavesSub}</div>
          </div>
        </div>

        {/* Card 4: Absent Days */}
        <div className="cms-card sp-metric-kpi-card">
          <div className="sp-kpi-icon-box red">
            <UserX size={20} />
          </div>
          <div className="sp-kpi-content">
            <div className="sp-kpi-label">Absent Days</div>
            <div className="sp-kpi-value red-val">{analyticsMetrics.absentDays}</div>
            <div className="sp-kpi-sub">{analyticsMetrics.absentDaysSub}</div>
          </div>
        </div>
      </div>

      {/* Row 3: Daily Attendance History Table */}
      <div className="cms-card sp-attendance-history-card">
        <div className="sp-attendance-card-head">
          <div className="sp-table-head-left">
            <div className="sp-att-cal-icon">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="sp-table-title">
                {activeFilter === "week"
                  ? "This Week"
                  : activeFilter === "last_week"
                  ? "Last Week"
                  : activeFilter === "month"
                  ? "This Month"
                  : "Last Month"}
              </h2>
              <span className="sp-table-subtitle">
                Biometric Check-In History & Daily Attendance Logs
              </span>
            </div>
          </div>

          {/* Filter Pills matching Screenshot: Week | Last Week | Month | Last Month */}
          <div className="sp-att-filter-tabs">
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "week" ? "active" : ""}`}
              onClick={() => setActiveFilter("week")}
            >
              Week
            </button>
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "last_week" ? "active" : ""}`}
              onClick={() => setActiveFilter("last_week")}
            >
              Last Week
            </button>
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "month" ? "active" : ""}`}
              onClick={() => setActiveFilter("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={`sp-att-filter-btn ${activeFilter === "last_month" ? "active" : ""}`}
              onClick={() => setActiveFilter("last_month")}
            >
              Last Month
            </button>
          </div>
        </div>

        <div className="cms-table-wrap">
          <table className="sp-attendance-table">
            <thead>
              <tr>
                <th style={{ width: "16%" }}>DAY</th>
                <th style={{ width: "24%" }}>SHIFT</th>
                <th style={{ width: "15%" }}>CHECK IN</th>
                <th style={{ width: "15%" }}>CHECK OUT</th>
                <th style={{ width: "15%" }}>HOURS</th>
                <th style={{ width: "15%", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {activeLogs.map((log) => {
                const isUpcoming = log.status === "-" || log.status === "--";
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="sp-day-name">{log.day}</div>
                      <div className="sp-day-date">{log.date}</div>
                    </td>
                    <td>
                      <span className="sp-shift-text">{log.shift}</span>
                    </td>
                    <td>
                      <span className={`sp-time-text ${log.inTime !== "--" && !isUpcoming ? "highlight" : ""}`}>
                        {log.inTime}
                      </span>
                    </td>
                    <td>
                      <span className="sp-time-text">
                        {log.outTime}
                      </span>
                    </td>
                    <td>
                      <span className="sp-hours-text">
                        {log.hours}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {isUpcoming ? (
                        <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>--</span>
                      ) : (
                        <span className={`sp-status-badge ${getStatusBadgeClass(log.status)}`}>
                          {log.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`sp-toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
