import React, { useState, useEffect, useMemo } from "react";
import { Clock, LogOut, Calendar, CheckCircle2, Briefcase, Award, X, AlertCircle } from "lucide-react";
import "../styles/FacultyMyAttendance.css";

import { useFacultySafe } from "../FacultyContext.jsx";

export default function FacultyMyAttendance() {
  const context = useFacultySafe();
  const [liveClock, setLiveClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [localPunchState, setLocalPunchState] = useState(() => {
    try {
      const saved = localStorage.getItem("staff_punch_state");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { isPunchedIn: true, inTime: "08:45 AM", outTime: null, hoursWorked: "4 hrs 32 mins" };
  });

  const punchState = context?.punchState || localPunchState;
  const setPunchState = (updater) => {
    if (typeof updater === "function") {
      setLocalPunchState((prev) => {
        const next = updater(prev);
        if (context?.setPunchState) context.setPunchState(next);
        return next;
      });
    } else {
      setLocalPunchState(updater);
      if (context?.setPunchState) context.setPunchState(updater);
    }
  };

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
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const next = { isPunchedIn: true, inTime: timeStr, outTime: null, hoursWorked: "Just punched in" };
    setPunchState(next);
    localStorage.setItem("staff_punch_state", JSON.stringify(next));
    notify(`Checked In Successfully at ${timeStr}`, "success");
  };

  const handlePunchOut = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const next = { ...punchState, isPunchedIn: false, outTime: timeStr };
    setPunchState(next);
    localStorage.setItem("staff_punch_state", JSON.stringify(next));
    notify(`Punched Out Successfully at ${timeStr}`, "success");
  };

  // Attendance Filter: "week" | "last_week" | "month" | "last_month"
  // Attendance Filter: "week" | "last_week" | "month" | "last_month"
  const [activeFilter, setActiveFilter] = useState("week");

  // Dynamic datasets for Week, Last Week, Month, Last Month
  // Intermediate school operates 6 days a week (Mon–Sat)
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
      inTime: punchState.isPunchedIn ? punchState.inTime : "08:55 AM",
      outTime: punchState.outTime || "--",
      hours: punchState.isPunchedIn ? "7h 17m (Active)" : "7h 17m",
      device: "Bio-Station 01 (Main Gate)",
      status: "Present",
      canRegularize: false,
    },
    {
      id: "w-3",
      day: "Wed",
      date: "07/10/2026",
      shift: "Morning (08:30–16:30)",
      inTime: "--",
      outTime: "--",
      hours: "0h 0m",
      device: "--",
      status: "-",
      canRegularize: false,
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
      status: "-",
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
      status: "-",
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
      status: "-",
      canRegularize: false,
    },
  ], [punchState]);

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

  // Full Month - October 2026 (Oct 1 to Oct 31, with Oct 2 & Oct 20 & Sundays as Holiday, Mon-Sat as school days)
  const monthLogs = useMemo(() => [
    { id: "m-01", day: "Thu", date: "01/10/2026", shift: "Morning (08:30–16:30)", inTime: "08:32 AM", outTime: "04:30 PM", hours: "7h 58m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "m-02", day: "Fri", date: "02/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-03", day: "Sat", date: "03/10/2026", shift: "Morning (08:30–16:30)", inTime: "08:35 AM", outTime: "04:30 PM", hours: "7h 55m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "m-04", day: "Sun", date: "04/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-05", day: "Mon", date: "05/10/2026", shift: "Morning (08:30–16:30)", inTime: "08:55 AM", outTime: "06:02 PM", hours: "9h 7m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "m-06", day: "Tue", date: "06/10/2026", shift: "Morning (08:30–16:30)", inTime: punchState.isPunchedIn ? punchState.inTime : "08:55 AM", outTime: punchState.outTime || "--", hours: punchState.isPunchedIn ? "7h 17m (Active)" : "7h 17m", device: "Bio-Station 01 (Main Gate)", status: "Present", canRegularize: false },
    { id: "m-07", day: "Wed", date: "07/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-08", day: "Thu", date: "08/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-09", day: "Fri", date: "09/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-10", day: "Sat", date: "10/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-11", day: "Sun", date: "11/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-12", day: "Mon", date: "12/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-13", day: "Tue", date: "13/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-14", day: "Wed", date: "14/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-15", day: "Thu", date: "15/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-16", day: "Fri", date: "16/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-17", day: "Sat", date: "17/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-18", day: "Sun", date: "18/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-19", day: "Mon", date: "19/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-20", day: "Tue", date: "20/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-21", day: "Wed", date: "21/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-22", day: "Thu", date: "22/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-23", day: "Fri", date: "23/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-24", day: "Sat", date: "24/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-25", day: "Sun", date: "25/10/2026", shift: "General", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "Holiday", canRegularize: false },
    { id: "m-26", day: "Mon", date: "26/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-27", day: "Tue", date: "27/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-28", day: "Wed", date: "28/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-29", day: "Thu", date: "29/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-30", day: "Fri", date: "30/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
    { id: "m-31", day: "Sat", date: "31/10/2026", shift: "Morning (08:30–16:30)", inTime: "--", outTime: "--", hours: "0h 0m", device: "--", status: "-", canRegularize: false },
  ], [punchState]);

  // Full Month - September 2026 (All 30 days: Sundays as Holiday, Mon-Sat intermediate school working days with Present, Absent, Late, Half Day)
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
    switch (activeFilter) {
      case "week":
        return {
          workingDays: "6 Days",
          workingDaysSub: "Current Week (Mon–Sat)",
          presentDays: "2 Days",
          presentDaysSub: "Biometric verified to date",
          leaves: "0 Days",
          leavesSub: "No leaves applied",
          punctuality: "100%",
          punctualitySub: "Target: ≥ 90%",
        };
      case "last_week":
        return {
          workingDays: "5 Days",
          workingDaysSub: "Mon–Sat (1 Holiday)",
          presentDays: "4 Days",
          presentDaysSub: "Biometric verified",
          leaves: "0 Days",
          leavesSub: "1 Late punch logged",
          punctuality: "92.4%",
          punctualitySub: "Target: ≥ 90%",
        };
      case "month":
        return {
          workingDays: "25 Days",
          workingDaysSub: "Current Month (Oct 2026)",
          presentDays: "4 Days",
          presentDaysSub: "Biometric verified to date",
          leaves: "0 Days",
          leavesSub: "0 CL applied",
          punctuality: "98.0%",
          punctualitySub: "Target: ≥ 90%",
        };
      case "last_month":
        return {
          workingDays: "26 Days",
          workingDaysSub: "September 2026 (30 Days)",
          presentDays: "22 Days",
          presentDaysSub: "Biometric verified",
          leaves: "2 Days",
          leavesSub: "1 CL, 1 OD approved",
          punctuality: "95.8%",
          punctualitySub: "Target: ≥ 90%",
        };
      default:
        return {
          workingDays: "6 Days",
          workingDaysSub: "Current Week (Mon–Sat)",
          presentDays: "2 Days",
          presentDaysSub: "Biometric verified",
          leaves: "0 Days",
          leavesSub: "No leaves applied",
          punctuality: "100%",
          punctualitySub: "Target: ≥ 90%",
        };
    }
  }, [activeFilter]);

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

  const [showRegularizeModal, setShowRegularizeModal] = useState(false);
  const [regularizeForm, setRegularizeForm] = useState({ date: "", reason: "Forgot Biometric Punch", inTime: "08:30 AM", outTime: "04:30 PM", notes: "" });

  return (
    <div>
      <div className="cms-page-head">
        <div>
          <h1>My Attendance & Biometric Punch</h1>
          <p>Daily biometric check-in, punch times, shift logs & monthly attendance calendar.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setShowRegularizeModal(true)}>
          <Clock size={14} /> Request Attendance Regularization
        </button>
      </div>

      {/* Punch In / Out Grid */}
      <div className="sp-attendance-punch-grid">
        {/* Live Digital Clock Card */}
        <div
          className="sp-live-clock-card"
          style={{
            background: "linear-gradient(135deg, #090d16 0%, #111827 100%)",
            color: "#ffffff",
            border: "1px solid #1f2937",
            boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
            padding: "24px 26px",
            borderRadius: 14,
          }}
        >
          <div>
            <span
              className="sp-live-badge"
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                fontWeight: 800,
              }}
            >
              CAMPUS BIOMETRIC CLOCK
            </span>
            <div
              className="sp-live-clock-time"
              style={{
                color: "#ffffff",
                fontSize: 40,
                fontWeight: 800,
                textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                margin: "12px 0 6px",
                fontFamily: "monospace",
              }}
            >
              {liveClock}
            </div>
            <div
              className="sp-live-clock-date"
              style={{ color: "#94a3b8", fontSize: 13.5, fontWeight: 600 }}
            >
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          <div
            className="sp-clock-status-box"
            style={{
              marginTop: 20,
              padding: "14px 16px",
              background: "rgba(255, 255, 255, 0.06)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="sp-clock-sublabel" style={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 600 }}>Punch Status:</span>
              <span className={`sp-punch-status-badge ${punchState.isPunchedIn ? "in" : "out"}`} style={{ fontWeight: 800 }}>
                ● {punchState.isPunchedIn ? `Checked In (${punchState.inTime})` : "Checked Out"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span className="sp-clock-sublabel" style={{ color: "#cbd5e1", fontSize: 12.5, fontWeight: 600 }}>Shift Timings:</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>08:30 AM – 04:30 PM (Morning Shift)</span>
            </div>
          </div>
        </div>

        {/* Punch Actions Form Card */}
        <div className="sp-punch-form-card">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Punch Terminal Action</h3>
            <p style={{ fontSize: 12.5, color: "var(--cms-muted)", marginBottom: 16 }}>
              Click below to record your campus entry or exit timestamp. Instant biometric verification enabled.
            </p>

            <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--cms-surface)", border: "1px solid var(--cms-border)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--cms-muted)" }}>Current Punch Status</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: punchState.isPunchedIn ? "var(--cms-green)" : "var(--cms-text)", marginTop: 4 }}>
                {punchState.isPunchedIn ? `Active — Punched In at ${punchState.inTime}` : "Inactive — Currently Punched Out"}
              </div>
              <div style={{ fontSize: 12, color: "var(--cms-muted)", marginTop: 4 }}>
                Terminal: <strong>Main Campus Gate 01 Bio-Station</strong>
              </div>
            </div>
          </div>

          <div className="sp-punch-actions-row">
            <button
              className="cms-btn cms-btn-primary"
              style={{ flex: 1, justifyContent: "center", padding: "13px 18px", fontSize: 14 }}
              disabled={punchState.isPunchedIn}
              onClick={handlePunchIn}
            >
              <Clock size={16} /> Punch In (Check-In)
            </button>
            <button
              className="cms-btn"
              style={{ flex: 1, justifyContent: "center", padding: "13px 18px", fontSize: 14, background: "#dc2626", color: "#fff" }}
              disabled={!punchState.isPunchedIn}
              onClick={handlePunchOut}
            >
              <LogOut size={16} /> Punch Out (Check-Out)
            </button>
          </div>
        </div>
      </div>

      {/* 4 Attendance Metric Cards (Dynamically tied to selected tab) */}
      <div className="sp-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-blue"><Calendar size={22} /></div>
          <div>
            <div className="cms-stat-label">Working Days</div>
            <div className="cms-stat-value">{analyticsMetrics.workingDays}</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>{analyticsMetrics.workingDaysSub}</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><CheckCircle2 size={22} /></div>
          <div>
            <div className="cms-stat-label">Present Days</div>
            <div className="cms-stat-value" style={{ color: "var(--cms-green)" }}>{analyticsMetrics.presentDays}</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>{analyticsMetrics.presentDaysSub}</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-violet"><Briefcase size={22} /></div>
          <div>
            <div className="cms-stat-label">Approved Leaves</div>
            <div className="cms-stat-value">{analyticsMetrics.leaves}</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>{analyticsMetrics.leavesSub}</div>
          </div>
        </div>
        <div className="cms-stat">
          <div className="cms-stat-icon tone-green"><Award size={22} /></div>
          <div>
            <div className="cms-stat-label">Punctuality Rate</div>
            <div className="cms-stat-value" style={{ color: "var(--cms-green)" }}>{analyticsMetrics.punctuality}</div>
            <div style={{ fontSize: 11.5, color: "var(--cms-muted)", marginTop: 2 }}>{analyticsMetrics.punctualitySub}</div>
          </div>
        </div>
      </div>

      {/* Daily Punch History Table (Matching Screenshot 2 layout and user-clarified 8 columns) */}
      <div className="cms-card sp-attendance-history-card">
        <div className="sp-attendance-card-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="sp-att-cal-icon">
              <Calendar size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                {activeFilter === "week"
                  ? "This Week"
                  : activeFilter === "last_week"
                  ? "Last Week"
                  : activeFilter === "month"
                  ? "This Month"
                  : "Last Month"}
              </h2>
              <span style={{ fontSize: 12, color: "var(--cms-muted)", display: "block", marginTop: 2 }}>
                Biometric Punch History & Daily Attendance Logs
              </span>
            </div>
          </div>

          {/* Filter Pills matching Screenshot 2: Week | Last Week | Month | Last Month */}
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
                <th style={{ width: "13%" }}>DAY</th>
                <th style={{ width: "18%" }}>SHIFT</th>
                <th style={{ width: "12%" }}>PUNCH IN</th>
                <th style={{ width: "12%" }}>PUNCH OUT</th>
                <th style={{ width: "11%" }}>HOURS</th>
                <th style={{ width: "16%" }}>BIOMETRIC DEVICE</th>
                <th style={{ width: "10%", textAlign: "center" }}>STATUS</th>
                <th style={{ width: "8%", textAlign: "center" }}>REGULARIZATION</th>
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
                    <td>
                      <span className="sp-device-text">
                        {log.device}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`sp-status-badge ${getStatusBadgeClass(log.status)}`}>
                        {isUpcoming ? "-" : log.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {log.canRegularize ? (
                        <button
                          type="button"
                          className="sp-regularize-btn"
                          onClick={() => {
                            setRegularizeForm((p) => ({ ...p, date: log.rawDate || log.date }));
                            setShowRegularizeModal(true);
                          }}
                        >
                          Regularize
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Regularization Modal */}
      {showRegularizeModal && (
        <div className="cms-overlay" onClick={(e) => e.target === e.currentTarget && setShowRegularizeModal(false)}>
          <div className="cms-modal sm faculty-regularization-modal">
            <div className="cms-modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Request Attendance Regularization</h3>
                <span style={{ fontSize: 12, color: "var(--cms-muted)" }}>Submit adjustment for missed or late punch</span>
              </div>
              <button className="cms-icon-btn" onClick={() => setShowRegularizeModal(false)}><X size={16} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-grid">
                <div className="cms-field full">
                  <label>Date of Incident <span className="req">*</span></label>
                  <input
                    type="date"
                    value={regularizeForm.date || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, date: e.target.value })}
                  />
                </div>
                <div className="cms-field full">
                  <label>Reason for Regularization <span className="req">*</span></label>
                  <select
                    value={regularizeForm.reason}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, reason: e.target.value })}
                  >
                    <option>Forgot Biometric Punch</option>
                    <option>Biometric Scanner / Power Outage</option>
                    <option>On-Duty / Board Examination Duty</option>
                    <option>Official Campus Assignment</option>
                    <option>Emergency Late Arrival</option>
                  </select>
                </div>
                <div className="cms-field">
                  <label>Proposed Punch In</label>
                  <input
                    type="text"
                    value={regularizeForm.inTime}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, inTime: e.target.value })}
                  />
                </div>
                <div className="cms-field">
                  <label>Proposed Punch Out</label>
                  <input
                    type="text"
                    value={regularizeForm.outTime}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, outTime: e.target.value })}
                  />
                </div>
                <div className="cms-field full">
                  <label>Explanation & Notes <span className="req">*</span></label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state reason for attendance adjustment..."
                    value={regularizeForm.notes}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="cms-modal-foot">
              <button className="cms-btn cms-btn-ghost" onClick={() => setShowRegularizeModal(false)}>Cancel</button>
              <button
                className="cms-btn cms-btn-primary"
                onClick={() => {
                  notify("Attendance Regularization request submitted to Principal office!");
                  setShowRegularizeModal(false);
                }}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

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

