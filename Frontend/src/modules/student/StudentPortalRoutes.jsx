import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.jsx";
import StudentLayout from "./layout/StudentLayout.jsx";
import StudentDashboard from "./StudentDashboard.jsx";
import StudentProfile from "./pages/StudentProfile.jsx";
import StudentTimetable from "./pages/StudentTimetable.jsx";
import StudentAttendance from "./pages/StudentAttendance.jsx";
import StudentExaminations from "./pages/StudentExaminations.jsx";
import StudentResults from "./pages/StudentResults.jsx";
import StudentFees from "./pages/StudentFees.jsx";
import StudentTransport from "./pages/StudentTransport.jsx";
import StudentHostel from "./pages/StudentHostel.jsx";
import StudentCertificates from "./pages/StudentCertificates.jsx";
import StudentHolidays from "./pages/StudentHolidays.jsx";
import StudentSettings from "./pages/StudentSettings.jsx";

export default function StudentPortalRoutes() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<StudentDashboard />} />
        <Route path="profile" element={<ProtectedRoute requiredModule="profile"><StudentProfile /></ProtectedRoute>} />
        <Route path="timetable" element={<ProtectedRoute requiredModule="timetable"><StudentTimetable /></ProtectedRoute>} />
        <Route path="attendance" element={<ProtectedRoute requiredModule="attendance"><StudentAttendance /></ProtectedRoute>} />
        <Route path="examinations" element={<ProtectedRoute requiredModule="examinations"><StudentExaminations /></ProtectedRoute>} />
        <Route path="results" element={<ProtectedRoute requiredModule="results"><StudentResults /></ProtectedRoute>} />
        <Route path="fees" element={<ProtectedRoute requiredModule="fee-management"><StudentFees /></ProtectedRoute>} />
        <Route path="transport" element={<ProtectedRoute requiredModule="transport"><StudentTransport /></ProtectedRoute>} />
        <Route path="hostel" element={<ProtectedRoute requiredModule="hostel-management"><StudentHostel /></ProtectedRoute>} />
        <Route path="certificates" element={<ProtectedRoute requiredModule="certificates"><StudentCertificates /></ProtectedRoute>} />
        <Route path="holidays" element={<ProtectedRoute requiredModule="holiday-management"><StudentHolidays /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute requiredModule="settings"><StudentSettings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/student-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
