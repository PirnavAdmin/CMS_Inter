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
import { usePermissions } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";
import { AccessDeniedNotice } from "@/modules/faculty/FacultyPortalRoutes.jsx";

function StudentPermissionRoute({ moduleKey, screenKey = null, moduleName = "this screen", children }) {
  const { canView } = usePermissions();
  const hasAccess = canView(moduleKey, screenKey);
  return hasAccess ? children : <AccessDeniedNotice moduleName={moduleName} />;
}

export default function StudentPortalRoutes() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="timetable" element={<StudentPermissionRoute moduleKey="timetable" moduleName="Timetable"><StudentTimetable /></StudentPermissionRoute>} />
        <Route path="attendance" element={<StudentPermissionRoute moduleKey="attendance" moduleName="Attendance"><StudentAttendance /></StudentPermissionRoute>} />
        <Route path="examinations" element={<StudentPermissionRoute moduleKey="examinations" moduleName="Examinations"><StudentExaminations /></StudentPermissionRoute>} />
        <Route path="results" element={<StudentPermissionRoute moduleKey="results" moduleName="Results"><StudentResults /></StudentPermissionRoute>} />
        <Route path="fees" element={<StudentPermissionRoute moduleKey="fee-management" moduleName="Fees"><StudentFees /></StudentPermissionRoute>} />
        <Route path="transport" element={<StudentPermissionRoute moduleKey="transport" moduleName="Transport"><StudentTransport /></StudentPermissionRoute>} />
        <Route path="hostel" element={<StudentPermissionRoute moduleKey="hostel-management" moduleName="Hostel"><StudentHostel /></StudentPermissionRoute>} />
        <Route path="certificates" element={<StudentPermissionRoute moduleKey="certificates" moduleName="Certificates"><StudentCertificates /></StudentPermissionRoute>} />
        <Route path="holidays" element={<StudentPermissionRoute moduleKey="holiday-management" moduleName="Holidays"><StudentHolidays /></StudentPermissionRoute>} />
        <Route path="*" element={<Navigate to="/student-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
