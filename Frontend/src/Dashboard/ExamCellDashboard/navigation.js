import { LayoutDashboard, CalendarDays, CalendarClock, Building2, Ticket, PencilLine, ClipboardCheck, GraduationCap, UserCheck, LogIn, Award, ArrowUpCircle, CalendarOff, BarChart3, UserRound } from "lucide-react";

export const examCellBase = "/exam-cell-dashboard";
export const examCellMenu = [
  ["Overview", [["", "Dashboard", LayoutDashboard]]],
  ["Examinations", [["exams", "Exam Management", CalendarDays], ["exam-timetable", "Exam Timetable", CalendarClock], ["hall-allocation", "Hall Allocation", Building2], ["hall-tickets", "Hall Tickets", Ticket]]],
  ["Marks & Results", [["marks-entry", "Marks Entry", PencilLine], ["marks-verification", "Marks Verification", ClipboardCheck], ["results", "Results", GraduationCap]]],
  ["Student Operations", [["attendance", "Attendance", UserCheck], ["check-in-out", "Check-In / Check-Out", LogIn], ["certificates", "Certificates", Award], ["promotions", "Promotions", ArrowUpCircle], ["holidays", "Holidays", CalendarOff]]],
  ["Reports", [["reports", "Exam Reports", BarChart3]]],
  ["Account", [["profile", "My Profile", UserRound]]],
];

export const isExamCellRole = (role) => /^exam(?:ination)?cell(?:staff|officer|coordinator)?$/.test(String(role || "").replace(/[^a-z]/gi, "").toLowerCase());
