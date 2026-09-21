import { Navigate, Route, Routes } from "react-router-dom";
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

export default function StudentPortalRoutes() {
  return <Routes><Route element={<StudentLayout/>}><Route index element={<StudentDashboard/>}/><Route path="profile" element={<StudentProfile/>}/><Route path="timetable" element={<StudentTimetable/>}/><Route path="attendance" element={<StudentAttendance/>}/><Route path="examinations" element={<StudentExaminations/>}/><Route path="results" element={<StudentResults/>}/><Route path="fees" element={<StudentFees/>}/><Route path="transport" element={<StudentTransport/>}/><Route path="hostel" element={<StudentHostel/>}/><Route path="certificates" element={<StudentCertificates/>}/><Route path="holidays" element={<StudentHolidays/>}/><Route path="*" element={<Navigate to="/student-dashboard" replace/>}/></Route></Routes>;
}
