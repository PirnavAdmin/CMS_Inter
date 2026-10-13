import dashboard from "@/assets/sidebar-3d/dashboard.png";
import exams from "@/assets/dashboard-3d/create-exam.png";
import timetable from "@/assets/sidebar-3d/timetable.png";
import halls from "@/assets/dashboard-3d/total-sections.png";
import tickets from "@/assets/settings-3d/templates.png";
import marks from "@/assets/sidebar-3d/marks-evaluation.png";
import verification from "@/assets/settings-3d/audit-logs.png";
import results from "@/assets/sidebar-3d/results.png";
import attendance from "@/assets/dashboard-3d/mark-attendance.png";
import clock from "@/assets/settings-3d/attendance-timing.png";
import certificates from "@/assets/sidebar-3d/certificates.png";
import promotions from "@/assets/sidebar-3d/promotion.png";
import holidays from "@/assets/sidebar-3d/holiday-management.svg";
import reports from "@/assets/sidebar-3d/reports-analytics.png";
import profile from "@/assets/dashboard-3d/non-teaching-staff.png";
import campus from "@/assets/settings-3d/campus-configuration.png";
import board from "@/assets/navbar-3d/board.png";
import year from "@/assets/navbar-3d/academic-year.png";
import menu from "@/assets/navbar-3d/menu.png";
import search from "@/assets/navbar-3d/search.png";
import notifications from "@/assets/navbar-3d/notifications.png";

const images = {
  "": dashboard, exams, "exam-timetable": timetable, "hall-allocation": halls,
  "hall-tickets": tickets, "marks-entry": marks, "marks-verification": verification,
  results, "publish-results": results, attendance, "attendance-timing": clock,
  "check-in-out": clock, certificates, promotions, holidays, reports, profile,
  Campus: campus, Board: board, "Academic Year": year, menu, search, notifications,
};

export default function ExamCellVisual({ name, className = "" }) {
  const source = images[name];
  return source ? <img className={`ec-3d-icon ${className}`} src={source} alt="" aria-hidden="true" /> : null;
}
