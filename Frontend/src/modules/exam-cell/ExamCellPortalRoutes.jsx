import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
        <Route path="exams" element={<Examinations />} />
        <Route path="exams/create" element={<Examinations initialView="create" />} />
        <Route path="exams/add" element={<Examinations initialView="create" />} />
        <Route path="exam-timetable" element={<ExamTimetable />} />
        <Route path="hall-allocation" element={<HallAllocation initialTab="rooms" />} />
        <Route path="invigilation-duties" element={<HallAllocation initialTab="duties" />} />
        <Route path="duties" element={<HallAllocation initialTab="duties" />} />
        <Route path="hall-tickets" element={SHOW_HALL_TICKETS ? <HallTickets /> : <Navigate to="/exam-cell-dashboard" replace />} />
        <Route path="marks-entry" element={<Marks initialTab="entry" />} />
        <Route path="marks-verification" element={<Marks initialTab="evaluation" />} />
        <Route path="results" element={<Results />} />
        <Route path="publish-results" element={<Results initialView="published" pageTitle="Publish Results" pageSubtitle="Check readiness, process results and confirm section publication using the existing workflow." />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="attendance/:area" element={<Attendance />} />
        <Route path="attendance/student/:studentId/overview" element={<AttendanceOverview />} />
        <Route path="attendance/staff/:staffId/overview" element={<AttendanceOverview />} />
        <Route path="attendance-timing" element={<AttendanceTiming />} />
        <Route path="check-in-out" element={<CheckInOut />} />
        <Route path="my-attendance" element={<Navigate to="/exam-cell-dashboard/check-in-out" replace />} />
        <Route path="certificates" element={<Certificates initialTab="certificates" />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="promotions/eligible" element={<Promotions screen="promotion" />} />
        <Route path="promotions/single" element={<Promotions screen="single" />} />
        <Route path="promotions/allocation" element={<Promotions screen="allocation" />} />
        <Route path="promotions/transfer" element={<Promotions screen="transfer" />} />
        <Route path="promotions/history" element={<Promotions screen="history" />} />
        <Route path="holidays" element={<Holidays />} />
        <Route path="profile" element={<Profile />} />
        <Route path="reports" element={<Reports />} />
        <Route path="exam-reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/exam-cell-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
