import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.jsx";
import ExamCellLayout from "./layout/ExamCellLayout.jsx";

import { SHOW_HALL_TICKETS } from "./hallTicketsConfig.js";

import Dashboard from "./pages/Dashboard.jsx";
import Examinations from "./pages/ExaminationPage.jsx";
import HallAllocation from "./pages/HallAllocation.jsx";
import HallTickets from "./pages/HallTickets.jsx";
import Marks from "./pages/MarksEntryPage.jsx";
import Results from "./pages/ResultsPage.jsx";
import Attendance from "./pages/AttendancePage.jsx";
import AttendanceOverview from "./pages/AttendanceOverviewPage.jsx";
import AttendanceTiming from "./pages/AttendanceTimingConfigPage.jsx";
import Certificates from "./pages/CertificatesPage.jsx";
import Promotions from "./pages/PromotionPage.jsx";
import Holidays from "./pages/HolidayManagementPage.jsx";
import Profile from "./pages/Profile.jsx";
import CheckInOut from "./pages/CheckInOut.jsx";
import Reports from "./pages/ExamReports.jsx";
import Settings from "./pages/ExamCellSettingsPage.jsx";

function ExamTimetable() {
  const location = useLocation();
  return <Examinations initialTab="schedule" initialExamId={location.state?.examId || ""} />;
}

export default function ExamCellPortalRoutes() {
  return (
    <Routes>
      <Route element={<ExamCellLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Navigate to="/exam-cell-dashboard" replace />} />
        <Route path="exams" element={<ProtectedRoute requiredModule="examination"><Examinations /></ProtectedRoute>} />
        <Route path="exams/create" element={<ProtectedRoute requiredModule="examination"><Examinations initialView="create" /></ProtectedRoute>} />
        <Route path="exams/add" element={<ProtectedRoute requiredModule="examination"><Examinations initialView="create" /></ProtectedRoute>} />
        <Route path="exam-timetable" element={<ProtectedRoute requiredModule="examination"><ExamTimetable /></ProtectedRoute>} />
        <Route path="hall-allocation" element={<ProtectedRoute requiredModule="examination"><HallAllocation initialTab="rooms" /></ProtectedRoute>} />
        <Route path="invigilation-duties" element={<ProtectedRoute requiredModule="examination"><HallAllocation initialTab="duties" /></ProtectedRoute>} />
        <Route path="duties" element={<ProtectedRoute requiredModule="examination"><HallAllocation initialTab="duties" /></ProtectedRoute>} />
        <Route path="hall-tickets" element={<ProtectedRoute requiredModule="examination">{SHOW_HALL_TICKETS ? <HallTickets /> : <Navigate to="/exam-cell-dashboard" replace />}</ProtectedRoute>} />
        <Route path="marks-entry" element={<ProtectedRoute requiredModule="marks-evaluation"><Marks initialTab="entry" /></ProtectedRoute>} />
        <Route path="marks-verification" element={<ProtectedRoute requiredModule="marks-evaluation"><Marks initialTab="evaluation" /></ProtectedRoute>} />
        <Route path="results" element={<ProtectedRoute requiredModule="results"><Results /></ProtectedRoute>} />
        <Route path="publish-results" element={<ProtectedRoute requiredModule="results"><Results initialView="published" pageTitle="Publish Results" pageSubtitle="Check readiness, process results and confirm section publication using the existing workflow." /></ProtectedRoute>} />
        <Route path="attendance" element={<ProtectedRoute requiredModule="attendance"><Attendance /></ProtectedRoute>} />
        <Route path="attendance/staff" element={<Navigate to="/exam-cell-dashboard/check-in-out" replace />} />
        <Route path="attendance/:area" element={<ProtectedRoute requiredModule="attendance"><Attendance /></ProtectedRoute>} />
        <Route path="attendance/student/:studentId/overview" element={<ProtectedRoute requiredModule="attendance"><AttendanceOverview /></ProtectedRoute>} />
        <Route path="attendance/staff/:staffId/overview" element={<ProtectedRoute requiredModule="staff-attendance"><AttendanceOverview /></ProtectedRoute>} />
        <Route path="attendance-timing" element={<ProtectedRoute requiredModule="attendance"><AttendanceTiming /></ProtectedRoute>} />
        <Route path="check-in-out" element={<ProtectedRoute requiredModule="staff-attendance"><CheckInOut /></ProtectedRoute>} />
        <Route path="my-attendance" element={<Navigate to="/exam-cell-dashboard/check-in-out" replace />} />
        <Route path="certificates" element={<ProtectedRoute requiredModule="certificates"><Certificates initialTab="certificates" /></ProtectedRoute>} />
        <Route path="promotions" element={<ProtectedRoute requiredModule="promotion"><Promotions /></ProtectedRoute>} />
        <Route path="promotions/eligible" element={<ProtectedRoute requiredModule="promotion"><Promotions screen="promotion" /></ProtectedRoute>} />
        <Route path="promotions/single" element={<ProtectedRoute requiredModule="promotion"><Promotions screen="single" /></ProtectedRoute>} />
        <Route path="promotions/allocation" element={<ProtectedRoute requiredModule="promotion"><Promotions screen="allocation" /></ProtectedRoute>} />
        <Route path="promotions/transfer" element={<ProtectedRoute requiredModule="promotion"><Promotions screen="transfer" /></ProtectedRoute>} />
        <Route path="promotions/history" element={<ProtectedRoute requiredModule="promotion"><Promotions screen="history" /></ProtectedRoute>} />
        <Route path="holidays" element={<ProtectedRoute requiredModule="holiday-management"><Holidays /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute requiredModule="profile"><Profile /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute requiredModule="reports-analytics"><Reports /></ProtectedRoute>} />
        <Route path="exam-reports" element={<ProtectedRoute requiredModule="reports-analytics"><Reports /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute requiredModule="settings"><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/exam-cell-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
