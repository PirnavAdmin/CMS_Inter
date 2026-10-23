import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ExamCellLayout from "./layout/ExamCellLayout.jsx";
import { usePermissions } from "@/features/rolesPermissions/permissionUtils.jsx";
import { AccessDeniedNotice } from "@/Dashboard/FacultyDashboard/FacultyPortalRoutes.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Examinations = lazy(() => import("./pages/ExaminationPage.jsx"));
const HallAllocation = lazy(() => import("./pages/HallAllocation.jsx"));
const HallTickets = lazy(() => import("./pages/HallTickets.jsx"));
const Marks = lazy(() => import("./pages/MarksEntryPage.jsx"));
const Results = lazy(() => import("./pages/ResultsPage.jsx"));
const Attendance = lazy(() => import("./pages/AttendancePage.jsx"));
const AttendanceOverview = lazy(() => import("./pages/AttendanceOverviewPage.jsx"));
const AttendanceTiming = lazy(() => import("./pages/AttendanceTimingConfigPage.jsx"));
const Certificates = lazy(() => import("./pages/CertificatesPage.jsx"));
const Promotions = lazy(() => import("./pages/PromotionPage.jsx"));
const Holidays = lazy(() => import("./pages/HolidayManagementPage.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const CheckInOut = lazy(() => import("./pages/CheckInOut.jsx"));
const Reports = lazy(() => import("./pages/ExamReports.jsx"));
const Settings = lazy(() => import("./pages/ExamCellSettingsPage.jsx"));

function ExamTimetable() {
  const location = useLocation();
  return <Examinations initialTab="schedule" initialExamId={location.state?.examId || ""} />;
}

function ExamCellPermissionRoute({ moduleKey, screenKey = null, moduleName = "this screen", children }) {
  const { canView } = usePermissions();
  const hasAccess = canView(moduleKey, screenKey);
  return hasAccess ? children : <AccessDeniedNotice moduleName={moduleName} />;
}

export default function ExamCellPortalRoutes() {
  return (
    <Suspense fallback={<p className="ec-empty" role="status">Loading Exam Cell Portal…</p>}>
      <Routes>
        <Route element={<ExamCellLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Navigate to="/exam-cell-dashboard" replace />} />
          <Route path="exams" element={<ExamCellPermissionRoute moduleKey="examination" moduleName="Examinations"><Examinations key="management" /></ExamCellPermissionRoute>} />
          <Route path="exam-timetable" element={<ExamCellPermissionRoute moduleKey="examination" moduleName="Exam Timetable"><ExamTimetable key="timetable" /></ExamCellPermissionRoute>} />
          <Route path="hall-allocation" element={<ExamCellPermissionRoute moduleKey="examination" screenKey="hall-allocation" moduleName="Hall Allocation"><HallAllocation /></ExamCellPermissionRoute>} />
          <Route path="hall-tickets" element={<ExamCellPermissionRoute moduleKey="examination" screenKey="hall-tickets" moduleName="Hall Tickets"><HallTickets /></ExamCellPermissionRoute>} />
          <Route path="marks-entry" element={<ExamCellPermissionRoute moduleKey="marks-evaluation" moduleName="Marks Entry"><Marks key="entry" initialTab="entry" /></ExamCellPermissionRoute>} />
          <Route path="marks-verification" element={<ExamCellPermissionRoute moduleKey="marks-evaluation" moduleName="Marks Verification"><Marks key="verification" initialTab="evaluation" /></ExamCellPermissionRoute>} />
          <Route path="results" element={<ExamCellPermissionRoute moduleKey="results" moduleName="Results"><Results key="results" /></ExamCellPermissionRoute>} />
          <Route path="publish-results" element={<ExamCellPermissionRoute moduleKey="results" moduleName="Publish Results"><Results key="publish" initialView="published" pageTitle="Publish Results" pageSubtitle="Check readiness, process results and confirm section publication using the existing workflow." /></ExamCellPermissionRoute>} />
          <Route path="attendance" element={<ExamCellPermissionRoute moduleKey="attendance" moduleName="Attendance"><Attendance /></ExamCellPermissionRoute>} />
          <Route path="attendance/:area" element={<ExamCellPermissionRoute moduleKey="attendance" moduleName="Attendance"><Attendance /></ExamCellPermissionRoute>} />
          <Route path="attendance/student/:studentId/overview" element={<ExamCellPermissionRoute moduleKey="attendance" moduleName="Attendance"><AttendanceOverview /></ExamCellPermissionRoute>} />
          <Route path="attendance/staff/:staffId/overview" element={<ExamCellPermissionRoute moduleKey="staff-attendance" moduleName="Staff Attendance Overview"><AttendanceOverview /></ExamCellPermissionRoute>} />
          <Route path="attendance-timing" element={<ExamCellPermissionRoute moduleKey="settings" screenKey="attendance-timing" moduleName="Attendance Timing"><AttendanceTiming /></ExamCellPermissionRoute>} />
          <Route path="check-in-out" element={<ExamCellPermissionRoute moduleKey="staff-attendance" screenKey="my-attendance" moduleName="My Attendance"><CheckInOut /></ExamCellPermissionRoute>} />
          <Route path="my-attendance" element={<Navigate to="/exam-cell-dashboard/check-in-out" replace />} />
          <Route path="certificates" element={<ExamCellPermissionRoute moduleKey="certificates" moduleName="Certificates"><Certificates initialTab="certificates" /></ExamCellPermissionRoute>} />
          <Route path="promotions" element={<ExamCellPermissionRoute moduleKey="promotion" moduleName="Promotions"><Promotions /></ExamCellPermissionRoute>} />
          <Route path="promotions/eligible" element={<ExamCellPermissionRoute moduleKey="promotion" moduleName="Promotions"><Promotions screen="promotion" /></ExamCellPermissionRoute>} />
          <Route path="promotions/single" element={<ExamCellPermissionRoute moduleKey="promotion" moduleName="Promotions"><Promotions screen="single" /></ExamCellPermissionRoute>} />
          <Route path="promotions/allocation" element={<ExamCellPermissionRoute moduleKey="promotion" moduleName="Promotions"><Promotions screen="allocation" /></ExamCellPermissionRoute>} />
          <Route path="promotions/history" element={<ExamCellPermissionRoute moduleKey="promotion" moduleName="Promotions"><Promotions screen="history" /></ExamCellPermissionRoute>} />
          <Route path="holidays" element={<ExamCellPermissionRoute moduleKey="holiday-management" moduleName="Holidays"><Holidays /></ExamCellPermissionRoute>} />
          <Route path="profile" element={<Profile />} />
          <Route path="reports" element={<ExamCellPermissionRoute moduleKey="reports-analytics" moduleName="Exam Reports"><Reports /></ExamCellPermissionRoute>} />
          <Route path="exam-reports" element={<ExamCellPermissionRoute moduleKey="reports-analytics" moduleName="Exam Reports"><Reports /></ExamCellPermissionRoute>} />
          <Route path="settings" element={<ExamCellPermissionRoute moduleKey="settings" moduleName="Settings"><Settings /></ExamCellPermissionRoute>} />
          <Route path="*" element={<Navigate to="/exam-cell-dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
