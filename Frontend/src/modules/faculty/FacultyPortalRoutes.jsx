import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import FacultyDashboard from "./FacultyDashboard.jsx";
import { PermissionProvider, useFacultyPermissions } from "./PermissionContext.jsx";
import { FacultyProvider } from "./FacultyContext.jsx";
import ProtectedRoute from "@/routes/ProtectedRoute.jsx";
import ErrorBoundary from "@/shared/components/ErrorBoundary.jsx";

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
import FacultyHolidays from "./pages/FacultyHolidays.jsx";
import FacultySettings from "./pages/FacultySettings.jsx";
import FacultyReimbursement from "./pages/FacultyReimbursement.jsx";

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
  holidays: "VIEW_HOLIDAYS",
  reimbursements: "VIEW_REIMBURSEMENTS",
};

export function AccessDeniedNotice({ moduleName = "this screen" }) {
  return (
    <div style={{
      display: "grid",
      placeItems: "center",
      minHeight: "360px",
      padding: "48px 24px",
      textAlign: "center",
      background: "var(--cms-surface, #fff)",
      borderRadius: "12px",
      border: "1px solid var(--cms-border, #e2e8f0)",
      margin: "24px auto",
      maxWidth: "600px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
    }}>
      <div style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "rgba(239, 68, 68, 0.1)",
        color: "#dc2626",
        display: "grid",
        placeItems: "center",
        marginBottom: 16
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: 18, color: "var(--cms-text, #1e293b)", fontWeight: 700 }}>
        Access Restricted
      </h3>
      <p style={{ margin: 0, fontSize: 14, color: "var(--cms-muted, #64748b)", lineHeight: 1.5, maxWidth: 420 }}>
        Your account does not currently have permission to access {moduleName}. Please contact your system administrator if you require access.
      </p>
    </div>
  );
}

function PermissionRoute({ permission, moduleName, children }) {
  const permissions = useFacultyPermissions();
  const hasAccess = typeof permissions?.includes === "function" ? permissions.includes(permission) : true;
  return hasAccess ? children : <AccessDeniedNotice moduleName={moduleName || "this module"} />;
}

export function FacultyPortalContent() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<FacultyDashboard />}>
          <Route index element={<PermissionRoute permission={routePermissions[""]} moduleName="Faculty Dashboard"><FacultyDashboardHome /></PermissionRoute>} />
          <Route path="profile" element={<PermissionRoute permission={routePermissions["profile"]} moduleName="My Profile"><FacultyProfile /></PermissionRoute>} />
          <Route path="timetable" element={<PermissionRoute permission={routePermissions["timetable"]} moduleName="Timetable"><FacultyTimetable /></PermissionRoute>} />
          <Route path="classes" element={<PermissionRoute permission={routePermissions["classes"]} moduleName="My Classes"><FacultyClasses /></PermissionRoute>} />
          <Route path="attendance" element={<PermissionRoute permission={routePermissions["attendance"]} moduleName="Student Attendance"><FacultyStudentAttendance /></PermissionRoute>} />
          <Route path="monthly-report" element={<PermissionRoute permission={routePermissions["monthly-report"]} moduleName="Attendance Monthly Report"><FacultyStudentAttendance initialView="monthly" /></PermissionRoute>} />
          <Route path="marks" element={<PermissionRoute permission={routePermissions["marks"]} moduleName="Marks Entry"><FacultyMarks /></PermissionRoute>} />
          <Route path="exam-duties" element={<PermissionRoute permission={routePermissions["exam-duties"]} moduleName="Exam Duties"><FacultyExamDuties /></PermissionRoute>} />
          <Route path="my-attendance" element={<PermissionRoute permission={routePermissions["my-attendance"]} moduleName="My Attendance"><FacultyMyAttendance /></PermissionRoute>} />
          <Route path="leave" element={<PermissionRoute permission={routePermissions["leave"]} moduleName="Staff Leave"><FacultyLeave /></PermissionRoute>} />
          <Route path="payslips" element={<PermissionRoute permission={routePermissions["payslips"]} moduleName="Salary & Payslips"><FacultyPayslips /></PermissionRoute>} />
          <Route path="holidays" element={<PermissionRoute permission={routePermissions["holidays"]} moduleName="Holidays"><FacultyHolidays /></PermissionRoute>} />
          <Route path="settings" element={<PermissionRoute permission={routePermissions["settings"]} moduleName="Settings"><FacultySettings /></PermissionRoute>} />
          <Route path="reimbursements" element={<PermissionRoute permission={routePermissions["reimbursements"]} moduleName="Reimbursements"><FacultyReimbursement /></PermissionRoute>} />
          <Route path="*" element={<Navigate to="/faculty-dashboard" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default function FacultyPortalRoutes() {
  return (
    <ProtectedRoute requireFaculty>
      <PermissionProvider>
        <FacultyProvider>
          <FacultyPortalContent />
        </FacultyProvider>
      </PermissionProvider>
    </ProtectedRoute>
  );
}
