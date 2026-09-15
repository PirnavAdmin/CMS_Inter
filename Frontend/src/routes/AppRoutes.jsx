import { Navigate, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import LandingPage from "@/components/pages/LandingPage.jsx";
import DashboardPage from "@/components/pages/DashboardPage.jsx";
import ListPage from "@/components/pages/ListPage.jsx";
import FormPage from "@/components/pages/FormPage.jsx";
import BoardManagementPage, { pageConfig as boardManagementConfig } from "@/components/pages/BoardManagementPage.jsx";
import AcademicYearPage, { pageConfig as academicYearConfig } from "@/components/pages/AcademicYearPage.jsx";
import BoardAcademicYearManagementPage from "@/components/pages/BoardAcademicYearManagementPage.jsx";
import CourseGroupPage, { CourseGroupFormRoute, pageConfig as courseGroupConfig } from "@/components/pages/CourseGroupPage.jsx";
import SubjectManagementPage from "@/components/pages/SubjectManagementPage.jsx";
import SectionManagementPage, { pageConfig as sectionManagementConfig } from "@/components/pages/SectionManagementPage.jsx";
import StaffManagementPage from "@/components/pages/StaffManagementPage.jsx";
import DepartmentManagementPage, { DepartmentDetailsPage, DesignationDetailsPage, MasterFormPage, MasterImportPage } from "@/components/pages/DepartmentManagementPage.jsx";
import StudentAdmissionPage from "@/components/pages/StudentAdmissionPage.jsx";
import StudentManagementPage, { pageConfig as studentManagementConfig } from "@/components/pages/StudentManagementPage.jsx";
import SectionAllocationPage from "@/components/pages/SectionAllocationPage.jsx";
import TimetablePage from "@/components/pages/TimetablePage.jsx";
import AttendancePage from "@/components/pages/AttendancePage.jsx";
import AttendanceOverviewPage from "@/components/pages/AttendanceOverviewPage.jsx";
import LeaveManagementPage from "@/components/pages/LeaveManagementPage.jsx";
import ExaminationPage, { pageConfig as examinationConfig } from "@/components/pages/ExaminationPage.jsx";
import MarksEntryPage from "@/components/pages/MarksEntryPage.jsx";
import ResultProcessingPage from "@/components/pages/ResultProcessingPage.jsx";
import PromotionPage from "@/components/pages/PromotionPage.jsx";
import FeeManagementPage from "@/components/pages/FeeManagementPage.jsx";
import CertificatesPage, { pageConfig as certificatesConfig } from "@/components/pages/CertificatesPage.jsx";
import ReportsAnalyticsPage from "@/components/pages/ReportsAnalyticsPage.jsx";
import StudentProfilePage from "@/components/pages/StudentProfilePage.jsx";
import StudentEnrollmentPage from "@/components/pages/StudentEnrollmentPage.jsx";
import SettingsPage from "@/components/pages/SettingsPage.jsx";
import LeaveTypesPage from "@/components/pages/LeaveTypesPage.jsx";
import NumberSeriesPage from "@/components/pages/NumberSeriesPage.jsx";
import TemplatesPage from "@/components/pages/TemplatesPage.jsx";
import CredentialsGeneratorPage from "@/components/pages/CredentialsGeneratorPage.jsx";
import SalaryManagementPage from "@/components/pages/SalaryManagementPage.jsx";
import Login from "@/features/auth/pages/Login.jsx";
import Register from "@/features/auth/pages/Register.jsx";
import ForgotPassword from "@/features/auth/pages/ForgotPassword.jsx";
import VerifyOTP from "@/features/auth/pages/VerifyOTP.jsx";
import ResetPassword from "@/features/auth/pages/ResetPassword.jsx";
import StudentDashboard from "@/Dashboard/StudentDashboard/StudentDashboard.jsx";
import FacultyDashboard from "@/Dashboard/Facultydashboard.jsx";
import ProtectedRoute, { PublicOnlyRoute } from "./ProtectedRoute.jsx";

const moduleConfigs = {
  courses: courseGroupConfig,
  subjects: SubjectManagementPage.pageConfig,
  sections: sectionManagementConfig,
  faculty: StaffManagementPage.pageConfig,
  "faculty-allocation": StaffManagementPage.facultySubjectAllocationConfig,
  examinations: examinationConfig,
  certificates: certificatesConfig,
  students: studentManagementConfig,
};

const listSlugs = Object.keys(moduleConfigs);

function ModuleListRoute({ slug }) {
  const config = moduleConfigs[slug];
  if (!config) return <Navigate to="/dashboard" replace />;
  return <ListPage slug={slug} config={config} />;
}

function ModuleFormRoute({ slug }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const secondary = searchParams.get("section") === "secondary";
  const config = moduleConfigs[slug];
  if (!config) return <Navigate to="/dashboard" replace />;
  return <FormPage slug={slug} config={config} id={id || null} secondary={secondary} listPath={`/dashboard/${slug}`} />;
}

function StudentProfileRoute() {
  const { id } = useParams();
  return <StudentProfilePage id={id} />;
}
function StudentEnrollmentRoute() {
  const { id } = useParams();
  return <StudentEnrollmentPage id={id} />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute requireAdmin />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/board-academic-year" element={<BoardAcademicYearManagementPage />} />
        <Route path="/dashboard/boards" element={<Navigate to="/dashboard/board-academic-year" replace />} />
        <Route path="/dashboard/academic-years" element={<Navigate to="/dashboard/board-academic-year" replace />} />
        <Route path="/dashboard/courses" element={<CourseGroupPage />} />
        <Route path="/dashboard/courses/add" element={<CourseGroupFormRoute />} />
        <Route path="/dashboard/courses/:id/edit" element={<CourseGroupFormRoute />} />
        <Route path="/dashboard/subjects" element={<SubjectManagementPage />} />
        <Route path="/dashboard/subjects/add" element={<SubjectManagementPage screen="assign" />} />
        <Route path="/dashboard/subjects/assign" element={<SubjectManagementPage screen="assign" />} />
        <Route path="/dashboard/sections" element={<SectionManagementPage />} />
        <Route path="/dashboard/faculty" element={<Navigate to="/dashboard/staff" replace />} />
        <Route path="/dashboard/faculty/add" element={<Navigate to="/dashboard/staff/add" replace />} />
        <Route path="/dashboard/faculty/:id/edit" element={<Navigate to="/dashboard/staff" replace />} />
        <Route path="/dashboard/staff" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/list" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/teaching" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/non-teaching" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/pending" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/completed" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/add" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/add-teaching" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/add-non-teaching" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/:id/send-link" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/:id/edit" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/:id/review" element={<StaffManagementPage />} />
        <Route path="/dashboard/staff/:id" element={<StaffManagementPage />} />
        <Route path="/dashboard/departments" element={<DepartmentManagementPage />} />
        <Route path="/dashboard/departments/add" element={<MasterFormPage kind="department" />} />
        <Route path="/dashboard/departments/:id/edit" element={<MasterFormPage kind="department" />} />
        <Route path="/dashboard/departments/:id/view" element={<DepartmentDetailsPage />} />
        <Route path="/dashboard/departments/import" element={<MasterImportPage kind="department" />} />
        <Route path="/dashboard/designations/add" element={<MasterFormPage kind="designation" />} />
        <Route path="/dashboard/designations/:id/edit" element={<MasterFormPage kind="designation" />} />
        <Route path="/dashboard/designations/:id/view" element={<DesignationDetailsPage />} />
        <Route path="/dashboard/designations/import" element={<MasterImportPage kind="designation" />} />
        <Route path="/dashboard/faculty-allocation" element={<Navigate to="/dashboard/faculty" replace />} />
        <Route path="/dashboard/admission" element={<StudentAdmissionPage />} />
        <Route path="/dashboard/section-allocation" element={<SectionAllocationPage />} />
        <Route path="/dashboard/students" element={<StudentManagementPage />} />
        <Route path="/dashboard/students/:id/enroll" element={<StudentEnrollmentRoute />} />
        <Route path="/dashboard/timetable" element={<TimetablePage />} />
        <Route path="/dashboard/timetable/setup" element={<TimetablePage screen="setup" />} />
        <Route path="/dashboard/timetable/draft" element={<TimetablePage screen="draft" />} />
        <Route path="/dashboard/timetable/generate" element={<TimetablePage screen="generate" />} />
        <Route path="/dashboard/timetable/faculty" element={<Navigate to="/dashboard/timetable/generate" replace />} />
        <Route path="/dashboard/attendance" element={<Navigate to="/dashboard/attendance/student" replace />} />
        <Route path="/dashboard/attendance/student/:studentId/overview" element={<AttendanceOverviewPage />} />
        <Route path="/dashboard/attendance/staff/:staffId/overview" element={<AttendanceOverviewPage />} />
        <Route path="/dashboard/attendance/:area" element={<AttendancePage />} />
        <Route path="/dashboard/leave-management" element={<LeaveManagementPage />} />
        <Route path="/dashboard/examinations" element={<ExaminationPage />} />
        <Route path="/dashboard/examinations/add" element={<ExaminationPage />} />
        <Route path="/dashboard/marks-entry" element={<MarksEntryPage />} />
        <Route path="/dashboard/results" element={<ResultProcessingPage />} />
        <Route path="/dashboard/promotion" element={<PromotionPage screen="promotion" />} />
        <Route path="/dashboard/promotions/eligible" element={<PromotionPage screen="promotion" />} />
        <Route path="/dashboard/promotions/single" element={<PromotionPage screen="single" />} />
        <Route path="/dashboard/promotions/allocation" element={<PromotionPage screen="allocation" />} />
        <Route path="/dashboard/promotions/history" element={<PromotionPage screen="history" />} />
        <Route path="/dashboard/promotions/report" element={<PromotionPage screen="report" />} />
        <Route path="/dashboard/fee-structure" element={<FeeManagementPage />} />
        <Route path="/dashboard/certificates" element={<CertificatesPage />} />
        <Route path="/dashboard/reports" element={<ReportsAnalyticsPage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
        <Route path="/dashboard/settings/general" element={<SettingsPage />} />
        <Route path="/dashboard/settings/leave-types" element={<LeaveTypesPage />} />
        <Route path="/dashboard/settings/number-series" element={<NumberSeriesPage mode="dashboard" />} />
        <Route path="/dashboard/settings/number-series/:seriesId/edit" element={<NumberSeriesPage mode="edit" />} />
        <Route path="/dashboard/settings/number-series/:seriesId" element={<NumberSeriesPage mode="detail" />} />

        {/* Templates Management Module Routes */}
        <Route path="/dashboard/settings/templates" element={<TemplatesPage />} />
        <Route path="/dashboard/settings/templates/certificates/:id/edit" element={<TemplatesPage />} />
        <Route path="/dashboard/settings/templates/reports/:id/edit" element={<TemplatesPage />} />
        <Route path="/dashboard/settings/templates/letters/:id/edit" element={<TemplatesPage />} />
        <Route path="/dashboard/settings/templates/upload" element={<TemplatesPage />} />
        <Route path="/dashboard/settings/templates/add" element={<TemplatesPage />} />
        <Route path="/dashboard/settings/templates/:id/preview" element={<TemplatesPage />} />

        {/* Credentials Generator Module Routes */}
        <Route path="/dashboard/settings/credentials" element={<CredentialsGeneratorPage />} />
        <Route path="/dashboard/settings/credentials/faculty" element={<CredentialsGeneratorPage />} />
        <Route path="/dashboard/settings/credentials/students" element={<CredentialsGeneratorPage />} />
        <Route path="/dashboard/settings/credentials/history" element={<CredentialsGeneratorPage />} />
        <Route path="/dashboard/settings/credentials/settings" element={<CredentialsGeneratorPage />} />
        <Route path="/dashboard/settings/credentials/faculty/generate" element={<CredentialsGeneratorPage />} />
        <Route path="/dashboard/settings/credentials/students/generate" element={<CredentialsGeneratorPage />} />

        {/* Staff Salary Management Module Routes */}
        <Route path="/dashboard/staff-salary" element={<SalaryManagementPage mode="dashboard" />} />
        <Route path="/dashboard/staff-salary/structures" element={<SalaryManagementPage mode="structures-list" />} />
        <Route path="/dashboard/staff-salary/structures/add" element={<SalaryManagementPage mode="structures-add" />} />
        <Route path="/dashboard/staff-salary/structures/:id" element={<SalaryManagementPage mode="structures-view" />} />
        <Route path="/dashboard/staff-salary/structures/:id/edit" element={<SalaryManagementPage mode="structures-edit" />} />
        <Route path="/dashboard/staff-salary/assignments" element={<SalaryManagementPage mode="assignments-list" />} />
        <Route path="/dashboard/staff-salary/assign/teaching" element={<SalaryManagementPage mode="assign-teaching" />} />
        <Route path="/dashboard/staff-salary/assign/non-teaching" element={<SalaryManagementPage mode="assign-non-teaching" />} />
        <Route path="/dashboard/staff-salary/assignments/:id" element={<SalaryManagementPage mode="assignments-view" />} />
        <Route path="/dashboard/staff-salary/assignments/:id/edit" element={<SalaryManagementPage mode="assignments-edit" />} />
        <Route path="/dashboard/staff-salary/payroll" element={<SalaryManagementPage mode="payroll-list" />} />
        <Route path="/dashboard/staff-salary/payroll/:month" element={<SalaryManagementPage mode="payroll-month-view" />} />
        <Route path="/dashboard/staff-salary/payroll/:month/:staffId" element={<SalaryManagementPage mode="payroll-indiv-view" />} />
        <Route path="/dashboard/staff-salary/payslips" element={<SalaryManagementPage mode="payslips-list" />} />
        <Route path="/dashboard/staff-salary/payslips/:staffId/:month" element={<SalaryManagementPage mode="payslip-preview" />} />
        <Route path="/dashboard/staff-salary/revisions" element={<SalaryManagementPage mode="revisions-list" />} />
        <Route path="/dashboard/staff-salary/revisions/add" element={<SalaryManagementPage mode="revisions-add" />} />
        <Route path="/dashboard/staff-salary/attendance-impact" element={<SalaryManagementPage mode="attendance-impact" />} />
        <Route path="/dashboard/staff-salary/bonus" element={<SalaryManagementPage mode="bonus-list" />} />
        <Route path="/dashboard/staff-salary/bonus/add" element={<SalaryManagementPage mode="bonus-add" />} />
        <Route path="/dashboard/staff-salary/overtime" element={<SalaryManagementPage mode="overtime-list" />} />
        <Route path="/dashboard/staff-salary/advances" element={<SalaryManagementPage mode="advances-list" />} />
        <Route path="/dashboard/staff-salary/advances/add" element={<SalaryManagementPage mode="advances-add" />} />
        <Route path="/dashboard/staff-salary/reimbursements" element={<SalaryManagementPage mode="reimbursements-list" />} />
        <Route path="/dashboard/staff-salary/reimbursements/add" element={<SalaryManagementPage mode="reimbursements-add" />} />
        <Route path="/dashboard/staff-salary/approvals" element={<SalaryManagementPage mode="approvals-list" />} />
        <Route path="/dashboard/staff-salary/reports" element={<SalaryManagementPage mode="reports" />} />
        <Route path="/dashboard/staff-salary/settings" element={<SalaryManagementPage mode="settings" />} />
        <Route path="/dashboard/staff-salary/import" element={<SalaryManagementPage mode="import" />} />
        {listSlugs.filter((slug) => !["faculty", "courses", "subjects"].includes(slug)).map((slug) => <Route key={`${slug}-add`} path={`/dashboard/${slug}/add`} element={<ModuleFormRoute slug={slug} />} />)}
        {listSlugs.filter((slug) => !["faculty", "courses", "subjects"].includes(slug)).map((slug) => <Route key={`${slug}-edit`} path={`/dashboard/${slug}/:id/edit`} element={<ModuleFormRoute slug={slug} />} />)}
        <Route path="/dashboard/students/:id" element={<StudentProfileRoute />} />
      </Route>

      <Route element={<ProtectedRoute requireStudent />}>
        <Route path="/student-dashboard" element={<StudentDashboard />} />
      </Route>
      <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
      <Route path="/mock-staff-portal/:id" element={<StaffManagementPage />} />
      <Route path="/mock-staff-portal/:id/complete-profile" element={<StaffManagementPage />} />
      <Route path="/mock-staff-portal/:id/review" element={<StaffManagementPage />} />
      <Route path="/staff-portal/:id" element={<StaffManagementPage />} />
      <Route path="/staff-portal/:id/complete-profile" element={<StaffManagementPage />} />
      <Route path="/staff-portal/:id/review" element={<StaffManagementPage />} />

      {listSlugs.map((slug) => <Route key={`${slug}-redirect`} path={`/${slug}`} element={<Navigate to={`/dashboard/${slug}`} replace />} />)}
      {listSlugs.map((slug) => <Route key={`${slug}-add-redirect`} path={`/${slug}/add`} element={<Navigate to={`/dashboard/${slug}/add`} replace />} />)}
      {listSlugs.map((slug) => <Route key={`${slug}-edit-redirect`} path={`/${slug}/:id/edit`} element={<Navigate to={`/dashboard/${slug}`} replace />} />)}
      <Route path="/admission" element={<Navigate to="/dashboard/admission" replace />} />
      <Route path="/attendance" element={<Navigate to="/dashboard/attendance" replace />} />
      <Route path="/timetable" element={<Navigate to="/dashboard/timetable" replace />} />
      <Route path="/marks-entry" element={<Navigate to="/dashboard/marks-entry" replace />} />
      <Route path="/results" element={<Navigate to="/dashboard/results" replace />} />
      <Route path="/promotion" element={<Navigate to="/dashboard/promotion" replace />} />
      <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
      <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
