import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import FacultyDashboard from "./FacultyDashboard.jsx";
import { FacultyProvider } from "./FacultyContext.jsx";
import { useEffectivePermissions } from "@/features/rolesPermissions/EffectivePermissionsContext.jsx";

import FacultyDashboardHome from "./pages/FacultyDashboardHome.jsx";
import FacultyProfile from "./pages/FacultyProfile.jsx";
import FacultyTimetable from "./pages/FacultyTimetable.jsx";
import FacultyClasses from "./pages/FacultyClasses.jsx";
import FacultyStudentAttendance from "./pages/FacultyStudentAttendance.jsx";
import FacultyMarks from "./pages/FacultyMarks.jsx";
import FacultyExamDuties from "./pages/FacultyExamDuties.jsx";
import FacultyMyAttendance from "./pages/FacultyMyAttendance.jsx";
import FacultyLeave from "./pages/FacultyLeave.jsx";
import FacultyPayslips from "./pages/FacultyPayslips.jsx";
import FacultyReimbursements from "./pages/FacultyReimbursements.jsx";
import FacultyHolidays from "./pages/FacultyHolidays.jsx";
import FacultySettings from "./pages/FacultySettings.jsx";

const routeModules = {
  "": "dashboard",
  profile: "dashboard",
  timetable: "timetable",
  classes: "section-room",
  attendance: "attendance",
  marks: "marks-evaluation",
  "exam-duties": "examination",
  "my-attendance": "staff-attendance",
  leave: "staff-leave-management",
  payslips: "payroll",
  reimbursements: "payroll",
  holidays: "holiday-management",
  settings: "settings",
};

function PermissionRoute({ moduleKey, children }) {
  const { status, canAccess } = useEffectivePermissions();
  if (status === "idle" || status === "loading") return <main>Loading permissions...</main>;
  return status === "ready" && canAccess(moduleKey)
    ? children
    : <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Access denied</main>;
}

export function FacultyPortalContent() {
  return (
    <Routes>
      <Route path="/" element={<FacultyDashboard />}>
        <Route index element={<PermissionRoute moduleKey={routeModules[""]}><FacultyDashboardHome /></PermissionRoute>} />
        <Route path="profile" element={<PermissionRoute moduleKey={routeModules.profile}><FacultyProfile /></PermissionRoute>} />
        <Route path="timetable" element={<PermissionRoute moduleKey={routeModules.timetable}><FacultyTimetable /></PermissionRoute>} />
        <Route path="classes" element={<PermissionRoute moduleKey={routeModules.classes}><FacultyClasses /></PermissionRoute>} />
        <Route path="attendance" element={<PermissionRoute moduleKey={routeModules.attendance}><FacultyStudentAttendance /></PermissionRoute>} />
        <Route path="monthly-report" element={<PermissionRoute moduleKey={routeModules.attendance}><FacultyStudentAttendance initialView="monthly" /></PermissionRoute>} />
        <Route path="marks" element={<PermissionRoute moduleKey={routeModules.marks}><FacultyMarks /></PermissionRoute>} />
        <Route path="exam-duties" element={<PermissionRoute moduleKey={routeModules["exam-duties"]}><FacultyExamDuties /></PermissionRoute>} />
        <Route path="my-attendance" element={<PermissionRoute moduleKey={routeModules["my-attendance"]}><FacultyMyAttendance /></PermissionRoute>} />
        <Route path="leave" element={<PermissionRoute moduleKey={routeModules.leave}><FacultyLeave /></PermissionRoute>} />
        <Route path="payslips" element={<PermissionRoute moduleKey={routeModules.payslips}><FacultyPayslips /></PermissionRoute>} />
        <Route path="reimbursements" element={<PermissionRoute moduleKey={routeModules.reimbursements}><FacultyReimbursements /></PermissionRoute>} />
        <Route path="holidays" element={<PermissionRoute moduleKey={routeModules.holidays}><FacultyHolidays /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute moduleKey={routeModules.settings}><FacultySettings /></PermissionRoute>} />
        <Route path="*" element={<Navigate to="/faculty-dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function FacultyPortalRoutes() {
  return (
    <FacultyProvider>
      <FacultyPortalContent />
    </FacultyProvider>
  );
}

