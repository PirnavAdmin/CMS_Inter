import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ExamCellLayout from "./layout/ExamCellLayout.jsx";

import { SHOW_HALL_TICKETS } from "./hallTicketsConfig.js";

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

export default function ExamCellPortalRoutes() {
  return <Suspense fallback={<p className="ec-empty" role="status">Loading Exam Cell Portal…</p>}><Routes>
    <Route element={<ExamCellLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="dashboard" element={<Navigate to="/exam-cell-dashboard" replace />} />
      <Route path="exams" element={<Examinations key="management" />} />
      <Route path="exam-timetable" element={<ExamTimetable key="timetable" />} />
      <Route path="hall-allocation" element={<HallAllocation key="hall-allocation" initialTab="rooms" />} />
      <Route path="invigilation-duties" element={<HallAllocation key="invigilation-duties" initialTab="duties" />} />
      <Route path="duties" element={<HallAllocation key="duties" initialTab="duties" />} />
      <Route path="hall-tickets" element={SHOW_HALL_TICKETS ? <HallTickets /> : <Navigate to="/exam-cell-dashboard" replace />} />
      <Route path="marks-entry" element={<Marks key="entry" initialTab="entry" />} />
      <Route path="marks-verification" element={<Marks key="verification" initialTab="evaluation" />} />
      <Route path="results" element={<Results key="results" />} />
      <Route path="publish-results" element={<Results key="publish" initialView="published" pageTitle="Publish Results" pageSubtitle="Check readiness, process results and confirm section publication using the existing workflow." />} />
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
      <Route path="promotions/history" element={<Promotions screen="history" />} />
      <Route path="holidays" element={<Holidays />} />
      <Route path="profile" element={<Profile />} />
      <Route path="reports" element={<Reports />} />
      <Route path="exam-reports" element={<Reports />} />
      <Route path="settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/exam-cell-dashboard" replace />} />
    </Route>
  </Routes></Suspense>;
}
