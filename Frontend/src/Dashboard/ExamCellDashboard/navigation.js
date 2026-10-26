import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Ticket,
  PencilLine,
  GraduationCap,
  UserCheck,
  LogIn,
  Award,
  ArrowUpCircle,
  CalendarOff,
  BarChart3,
  UserRound,
  ShieldAlert,
} from "lucide-react";

import { SHOW_HALL_TICKETS } from "./hallTicketsConfig.js";

export const examCellBase = "/exam-cell-dashboard";

export const examCellMenu = [
  ["Overview", [["", "Dashboard", LayoutDashboard]]],
  [
    "Examinations",
    [
      ["exams", "Examination", CalendarDays],
      ["hall-allocation", "Hall Allocation", Building2],
      ["invigilation-duties", "Invigilation Duties", ShieldAlert],
      ...(SHOW_HALL_TICKETS ? [["hall-tickets", "Hall Tickets", Ticket]] : []),
    ],
  ],
  [
    "Marks & Results",
    [
      ["marks-entry", "Marks Entry", PencilLine],
      ["results", "Results", GraduationCap],
    ],
  ],
  [
    "Student Operations",
    [
      ["attendance", "Attendance", UserCheck],
      ["check-in-out", "My Attendance", LogIn],
      ["certificates", "Certificates", Award],
      ["promotions", "Promotions", ArrowUpCircle],
      ["holidays", "Holiday Management", CalendarOff],
    ],
  ],
  ["Reports", [["reports", "Exam Reports", BarChart3]]],
  ["Account", [["profile", "My Profile", UserRound]]],
];

export const isExamCellRole = (role) =>
  /^exam(?:ination)?cell(?:staff|officer|coordinator)?$/.test(
    String(role || "").replace(/[^a-z]/gi, "").toLowerCase()
  );
