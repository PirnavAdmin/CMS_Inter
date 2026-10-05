import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import FacultyDashboard from "./FacultyDashboard.jsx";
import { PermissionProvider, useFacultyPermissions } from "./PermissionContext.jsx";
import { FacultyProvider } from "./FacultyContext.jsx";

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

const routePermissions = {
  "": "VIEW_DASHBOARD",
  profile: "VIEW_PROFILE",
  timetable: "VIEW_TIMETABLE",
  classes: "VIEW_CLASSES",
  attendance: "MARK_ATTENDANCE",
  marks: "ENTER_MARKS",
  "exam-duties": "VIEW_EXAM_DUTIES",
  "my-attendance": "VIEW_SELF_ATTENDANCE",
  leave: "APPLY_LEAVE",
  payslips: "VIEW_PAYSLIPS",
  reimbursements: "VIEW_PAYSLIPS",
  holidays: "VIEW_HOLIDAYS",
};

function PermissionRoute({ permission, children }) {
  const permissions = useFacultyPermissions();
  return permissions.includes(permission) ? children : <Navigate to="/faculty-dashboard" replace />;
}

export function FacultyPortalContent() {
  return (
    <Routes>
      <Route path="/" element={<FacultyDashboard />}>
        <Route index element={<PermissionRoute permission={routePermissions[""]}><FacultyDashboardHome /></PermissionRoute>} />
        <Route path="profile" element={<PermissionRoute permission={routePermissions["profile"]}><FacultyProfile /></PermissionRoute>} />
        <Route path="timetable" element={<PermissionRoute permission={routePermissions["timetable"]}><FacultyTimetable /></PermissionRoute>} />
        <Route path="classes" element={<PermissionRoute permission={routePermissions["classes"]}><FacultyClasses /></PermissionRoute>} />
        <Route path="attendance" element={<PermissionRoute permission={routePermissions["attendance"]}><FacultyStudentAttendance /></PermissionRoute>} />
        <Route path="marks" element={<PermissionRoute permission={routePermissions["marks"]}><FacultyMarks /></PermissionRoute>} />
        <Route path="exam-duties" element={<PermissionRoute permission={routePermissions["exam-duties"]}><FacultyExamDuties /></PermissionRoute>} />
        <Route path="my-attendance" element={<PermissionRoute permission={routePermissions["my-attendance"]}><FacultyMyAttendance /></PermissionRoute>} />
        <Route path="leave" element={<PermissionRoute permission={routePermissions["leave"]}><FacultyLeave /></PermissionRoute>} />
        <Route path="payslips" element={<PermissionRoute permission={routePermissions["payslips"]}><FacultyPayslips /></PermissionRoute>} />
        <Route path="reimbursements" element={<PermissionRoute permission={routePermissions["reimbursements"]}><FacultyReimbursements /></PermissionRoute>} />
        <Route path="holidays" element={<PermissionRoute permission={routePermissions["holidays"]}><FacultyHolidays /></PermissionRoute>} />
        <Route path="*" element={<Navigate to="/faculty-dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function FacultyPortalRoutes() {
  return (
    <PermissionProvider>
      <FacultyProvider>
        <FacultyPortalContent />
      </FacultyProvider>
    </PermissionProvider>
  );
}

