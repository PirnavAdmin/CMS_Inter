import React, { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useParams, useSearchParams } from "react-router-dom";
import LandingPage from "@/modules/landing/LandingPage.jsx";
import ExamCellPortalRoutes from "@/modules/exam-cell/ExamCellPortalRoutes.jsx";
import DashboardPage from "@/modules/admin/AdminDashboard/DashboardPage.jsx";
import PrincipalDashboard from "@/modules/principal/PrincipalDashboard.jsx";
import ListPage from "@/modules/admin/AdminCommon/ListPage.jsx";
import FormPage from "@/modules/admin/AdminCommon/FormPage.jsx";
import BoardManagementPage, { pageConfig as boardManagementConfig } from "@/modules/admin/AdminBoards/BoardManagementPage.jsx";
import AcademicYearPage, { pageConfig as academicYearConfig } from "@/modules/admin/AdminAcademicYears/AcademicYearPage.jsx";
import BoardAcademicYearManagementPage from "@/modules/admin/AdminBoards/BoardAcademicYearManagementPage.jsx";
import CourseGroupPage, { CourseGroupFormRoute, pageConfig as courseGroupConfig } from "@/modules/admin/AdminCourses/CourseGroupPage.jsx";
import SubjectManagementPage from "@/modules/admin/AdminSubjects/SubjectManagementPage.jsx";
import SectionManagementPage, { pageConfig as sectionManagementConfig } from "@/modules/admin/AdminSections/SectionManagementPage.jsx";
import StaffManagementPage from "@/modules/admin/AdminFaculty/StaffManagementPage.jsx";
import DepartmentManagementPage, { DepartmentDetailsPage, DesignationDetailsPage, MasterFormPage, MasterImportPage } from "@/modules/admin/AdminDepartments/DepartmentManagementPage.jsx";
import StudentAdmissionPage from "@/modules/admin/AdminAdmissions/StudentAdmissionPage.jsx";
import StudentManagementPage, { pageConfig as studentManagementConfig } from "@/modules/admin/AdminStudents/StudentManagementPage.jsx";
import SectionAllocationPage from "@/modules/admin/AdminSections/SectionAllocationPage.jsx";
import TimetablePage from "@/modules/admin/AdminTimetable/TimetablePage.jsx";
import HolidayManagementPage from "@/modules/admin/AdminAcademicCalendar/HolidayManagementPage.jsx";
import AcademicCalendarPage from "@/modules/admin/AdminAcademicCalendar/AcademicCalendarPage.jsx";
import AttendancePage from "@/modules/admin/AdminAttendance/AttendancePage.jsx";
import AttendanceOverviewPage from "@/modules/admin/AdminAttendance/AttendanceOverviewPage.jsx";
import LeaveManagementPage from "@/modules/admin/AdminLeave/LeaveManagementPage.jsx";
import ExaminationPage, { pageConfig as examinationConfig } from "@/modules/admin/AdminExaminations/ExaminationPage.jsx";
import MarksEntryPage from "@/modules/admin/AdminMarksEntry/MarksEntryPage.jsx";
import ResultProcessingPage from "@/modules/admin/AdminResults/ResultProcessingPage.jsx";
import PromotionPage from "@/modules/admin/AdminPromotion/PromotionPage.jsx";
import FeeManagementPage from "@/modules/admin/AdminFees/FeeManagementPage.jsx";
import TransportPage from "@/modules/admin/AdminTransport/TransportPage.jsx";
import CertificatesPage, { pageConfig as certificatesConfig } from "@/modules/admin/AdminCertificates/CertificatesPage.jsx";
import ReportsAnalyticsPage from "@/modules/admin/AdminReports/ReportsAnalyticsPage.jsx";
import InventoryManagementPage from "@/modules/admin/AdminInventory/InventoryManagementPage.jsx";
import StudentProfilePage from "@/modules/admin/AdminStudents/StudentProfilePage.jsx";
import StudentEnrollmentPage from "@/modules/admin/AdminStudents/StudentEnrollmentPage.jsx";
// Code-split Settings & Admin configurations for bundle optimization
const SettingsPage = lazy(() => import("@/modules/admin/AdminSettings/SettingsPage.jsx"));
const LOPConfigurationPage = lazy(() => import("@/modules/admin/AdminLOPConfiguration/LOPConfigurationPage.jsx"));
const CampusImagesConfigurationPage = lazy(() => import("@/modules/admin/AdminSettings/CampusImagesConfigurationPage.jsx"));
const RolesPermissionsPage = lazy(() => import("@/modules/admin/AdminRolesPermissions/RolesPermissionsPage.jsx"));
const LeaveTypesPage = lazy(() => import("@/modules/admin/AdminLeave/LeaveTypesPage.jsx"));
const AttendanceTimingConfigPage = lazy(() => import("@/modules/admin/AdminAttendance/AttendanceTimingConfigPage.jsx"));
const NumberSeriesPage = lazy(() => import("@/modules/admin/AdminNumberSeries/NumberSeriesPage.jsx"));
const TemplatesPage = lazy(() => import("@/modules/admin/AdminTemplates/TemplatesPage.jsx"));
const CredentialsGeneratorPage = lazy(() => import("@/modules/admin/AdminCredentialsGenerator/CredentialsGeneratorPage.jsx"));
import PayrollPage from "@/modules/admin/AdminPayroll/PayrollPage.jsx";
import ReimbursementPage from "@/modules/admin/AdminReimbursements/ReimbursementPage.jsx";
import AdminProfilePage from "@/modules/admin/AdminProfile/AdminProfilePage.jsx";
const CampusConfigurationPage = lazy(() => import("@/modules/admin/AdminSettings/CampusConfigurationPage.jsx"));
const AuditLogsPage = lazy(() => import("@/modules/admin/AdminAuditLogs/AuditLogsPage.jsx"));

const SettingsFallback = () => (
  <div className="p-8 text-sm text-slate-500 flex items-center justify-center min-h-[300px]">
    <div className="flex flex-col items-center gap-2">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span>Loading settings module...</span>
    </div>
  </div>
);
import Login from "@/modules/auth/pages/Login.jsx";
import Register from "@/modules/auth/pages/Register.jsx";
import ForgotPassword from "@/modules/auth/pages/ForgotPassword.jsx";
import VerifyOTP from "@/modules/auth/pages/VerifyOTP.jsx";
import ResetPassword from "@/modules/auth/pages/ResetPassword.jsx";
import StudentPortalRoutes from "@/modules/student/StudentPortalRoutes.jsx";
import AccountantPortalRoutes from "@/modules/accountant/AccountantPortalRoutes.jsx";
import FacultyPortalRoutes from "@/modules/faculty/FacultyPortalRoutes.jsx";
import NonTeachingPortalRoutes from "@/modules/non-teaching/NonTeachingPortalRoutes.jsx";
import DriverDashboard from "@/modules/driver/DriverDashboard.jsx";
import TransportManagerRoutes from "@/modules/transport-manager/TransportManagerRoutes.jsx";
import InventoryDashboard from "@/modules/inventory/InventoryDashboard.jsx";
import ParentDashboard from "@/modules/parent/ParentDashboard.jsx";
import ParentChildrenPage, { ParentChildDetailsRoute } from "@/modules/parent/pages/ParentChildrenPage.jsx";
import ParentAttendancePage from "@/modules/parent/pages/ParentAttendancePage.jsx";
import ParentAcademicsPage from "@/modules/parent/pages/ParentAcademicsPage.jsx";
import ParentExaminationsPage from "@/modules/parent/pages/ParentExaminationsPage.jsx";
import ParentFeesPage from "@/modules/parent/pages/ParentFeesPage.jsx";
import ParentTimetablePage from "@/modules/parent/pages/ParentTimetablePage.jsx";
import ParentCommunicationPage from "@/modules/parent/pages/ParentCommunicationPage.jsx";
import ParentAnnouncementsPage from "@/modules/parent/pages/ParentAnnouncementsPage.jsx";
import ParentDocumentsPage from "@/modules/parent/pages/ParentDocumentsPage.jsx";
import ParentNotificationsPage from "@/modules/parent/pages/ParentNotificationsPage.jsx";
import ParentProfilePage from "@/modules/parent/pages/ParentProfilePage.jsx";
import ParentSettingsPage from "@/modules/parent/pages/ParentSettingsPage.jsx";
import { ParentPortalProvider } from "@/modules/parent/context/ParentPortalContext.jsx";
import ErrorBoundary from "@/shared/components/ErrorBoundary.jsx";
import ProtectedRoute, { PublicOnlyRoute } from "./ProtectedRoute.jsx";
import {
  HostelDashboard,
  HostelMasterSetup,
  HostelStudentManagement,
  HostelAttendanceRegister,
  HostelReports,
} from "@/modules/admin/AdminHostel/index.js";

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
        <Route path="/register" element={<Navigate to="/login" replace />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/warden-login" element={<Navigate to="/login" replace />} />

      <Route element={<ProtectedRoute requireWarden />}>
        <Route path="/warden-dashboard" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/overview" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/students" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/rooms" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/beds" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/allocations" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/leave-requests" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/complaints" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/attendance" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/profile" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/reports" element={<HostelDashboard />} />
        <Route path="/warden-dashboard/*" element={<HostelDashboard />} />

        {/* Legacy /warden Aliases redirect to /warden-dashboard */}
        <Route path="/warden" element={<Navigate to="/warden-dashboard" replace />} />
        <Route path="/warden/dashboard" element={<Navigate to="/warden-dashboard" replace />} />
        <Route path="/warden/overview" element={<Navigate to="/warden-dashboard/overview" replace />} />
        <Route path="/warden/rooms" element={<Navigate to="/warden-dashboard/rooms" replace />} />
        <Route path="/warden/beds" element={<Navigate to="/warden-dashboard/beds" replace />} />
        <Route path="/warden/students" element={<Navigate to="/warden-dashboard/students" replace />} />
        <Route path="/warden/attendance" element={<Navigate to="/warden-dashboard/attendance" replace />} />
        <Route path="/warden/leave-requests" element={<Navigate to="/warden-dashboard/leave-requests" replace />} />
        <Route path="/warden/reports" element={<Navigate to="/warden-dashboard/reports" replace />} />
        <Route path="/warden/*" element={<Navigate to="/warden-dashboard" replace />} />
      </Route>

      <Route element={<ProtectedRoute requirePrincipal />}>
        <Route path="/principal-dashboard" element={<PrincipalDashboard />} />
      </Route>

      <Route element={<ProtectedRoute requireAdmin />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/academic-calendar" element={<AcademicCalendarPage />} />
        {/* Board & Academic Year */}
        <Route element={<ProtectedRoute requiredModule="board-academic-year" />}>
          <Route path="/dashboard/board-academic-year" element={<BoardAcademicYearManagementPage />} />
          <Route path="/dashboard/boards" element={<Navigate to="/dashboard/board-academic-year" replace />} />
          <Route path="/dashboard/academic-years" element={<Navigate to="/dashboard/board-academic-year" replace />} />
        </Route>
        {/* Group Management */}
        <Route element={<ProtectedRoute requiredModule="group-management" />}>
          <Route path="/dashboard/courses" element={<CourseGroupPage />} />
          <Route path="/dashboard/courses/add" element={<CourseGroupFormRoute />} />
          <Route path="/dashboard/courses/:id/edit" element={<CourseGroupFormRoute />} />
        </Route>

        {/* Subject Management */}
        <Route element={<ProtectedRoute requiredModule="subject-management" />}>
          <Route path="/dashboard/subjects" element={<SubjectManagementPage />} />
          <Route path="/dashboard/subjects/add" element={<SubjectManagementPage screen="assign" />} />
          <Route path="/dashboard/subjects/assign" element={<SubjectManagementPage screen="assign" />} />
        </Route>

        {/* Section & Room */}
        <Route element={<ProtectedRoute requiredModule="section-room" />}>
          <Route path="/dashboard/sections" element={<SectionManagementPage />} />
        </Route>
        {/* Staff Management */}
        <Route element={<ProtectedRoute requiredModule="staff-management" />}>
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
          <Route path="/dashboard/faculty-allocation" element={<Navigate to="/dashboard/faculty" replace />} />
        </Route>

        {/* Department & Designation */}
        <Route element={<ProtectedRoute requiredModule="department-designation" />}>
          <Route path="/dashboard/departments" element={<DepartmentManagementPage />} />
          <Route path="/dashboard/departments/add" element={<MasterFormPage kind="department" />} />
          <Route path="/dashboard/departments/:id/edit" element={<MasterFormPage kind="department" />} />
          <Route path="/dashboard/departments/:id/view" element={<DepartmentDetailsPage />} />
          <Route path="/dashboard/departments/import" element={<MasterImportPage kind="department" />} />
          <Route path="/dashboard/designations/add" element={<MasterFormPage kind="designation" />} />
          <Route path="/dashboard/designations/:id/edit" element={<MasterFormPage kind="designation" />} />
          <Route path="/dashboard/designations/:id/view" element={<DesignationDetailsPage />} />
          <Route path="/dashboard/designations/import" element={<MasterImportPage kind="designation" />} />
        </Route>

        {/* Student Admission */}
        <Route element={<ProtectedRoute requiredModule="student-admission" />}>
          <Route path="/dashboard/admission" element={<StudentAdmissionPage />} />
        </Route>

        {/* Section Allocation */}
        <Route element={<ProtectedRoute requiredModule="section-allocation" />}>
          <Route path="/dashboard/section-allocation" element={<SectionAllocationPage />} />
          <Route path="/dashboard/section-allocation/allocated" element={<SectionAllocationPage />} />
          <Route path="/dashboard/section-allocation/roll-numbers" element={<SectionAllocationPage />} />
        </Route>

        {/* Student Management */}
        <Route element={<ProtectedRoute requiredModule="student-management" />}>
          <Route path="/dashboard/students" element={<StudentManagementPage />} />
          <Route path="/dashboard/students/:id/enroll" element={<StudentEnrollmentRoute />} />
        </Route>
        {/* Timetable */}
        <Route element={<ProtectedRoute requiredModule="timetable" />}>
          <Route path="/dashboard/timetable" element={<TimetablePage />} />
          <Route path="/dashboard/timetable/setup" element={<TimetablePage screen="setup" />} />
          <Route path="/dashboard/timetable/draft" element={<TimetablePage screen="draft" />} />
          <Route path="/dashboard/timetable/generate" element={<TimetablePage screen="generate" />} />
          <Route path="/dashboard/timetable/faculty" element={<Navigate to="/dashboard/timetable/generate" replace />} />
        </Route>

        {/* Holiday Management */}
        <Route element={<ProtectedRoute requiredModule="holiday-management" />}>
          <Route path="/dashboard/holidays" element={<HolidayManagementPage />} />
        </Route>

        {/* Inventory Management */}
        <Route element={<ProtectedRoute requiredModule="inventory-management" />}>
          <Route path="/dashboard/inventory-management/*" element={<InventoryManagementPage />} />
          <Route path="/dashboard/inventory-management" element={<InventoryManagementPage />} />
          <Route path="/dashboard/inventory/*" element={<Navigate to="/dashboard/inventory-management" replace />} />
          <Route path="/dashboard/inventory" element={<Navigate to="/dashboard/inventory-management" replace />} />
        </Route>

        {/* Attendance (Student & Staff) */}
        <Route path="/dashboard/attendance" element={<Navigate to="/dashboard/attendance/student" replace />} />
        <Route element={<ProtectedRoute requiredModule="attendance" />}>
          <Route path="/dashboard/attendance/student" element={<AttendancePage area="student" />} />
          <Route path="/dashboard/attendance/student/:studentId/overview" element={<AttendanceOverviewPage />} />
        </Route>
        <Route element={<ProtectedRoute requiredModule="staff-attendance" />}>
          <Route path="/dashboard/attendance/staff" element={<AttendancePage area="staff" />} />
          <Route path="/dashboard/attendance/staff/:staffId/overview" element={<AttendanceOverviewPage />} />
        </Route>
        <Route path="/dashboard/attendance/:area" element={<AttendancePage />} />

        {/* Staff Leave Management */}
        <Route element={<ProtectedRoute requiredModule="staff-leave-management" />}>
          <Route path="/dashboard/leave-management" element={<LeaveManagementPage />} />
        </Route>

        {/* Examination */}
        <Route element={<ProtectedRoute requiredModule="examination" />}>
          <Route path="/dashboard/examinations" element={<ExaminationPage />} />
          <Route path="/dashboard/examinations/add" element={<ExaminationPage />} />
        </Route>

        {/* Marks Evaluation */}
        <Route element={<ProtectedRoute requiredModule="marks-evaluation" />}>
          <Route path="/dashboard/marks-entry" element={<MarksEntryPage />} />
        </Route>

        {/* Results */}
        <Route element={<ProtectedRoute requiredModule="results" />}>
          <Route path="/dashboard/results" element={<ResultProcessingPage />} />
        </Route>

        {/* Promotion */}
        <Route element={<ProtectedRoute requiredModule="promotion" />}>
          <Route path="/dashboard/promotion" element={<PromotionPage screen="promotion" />} />
          <Route path="/dashboard/promotions/eligible" element={<PromotionPage screen="promotion" />} />
          <Route path="/dashboard/promotions/single" element={<PromotionPage screen="single" />} />
          <Route path="/dashboard/promotions/allocation" element={<PromotionPage screen="allocation" />} />
          <Route path="/dashboard/promotions/transfer" element={<PromotionPage screen="transfer" />} />
          <Route path="/dashboard/promotions/history" element={<PromotionPage screen="history" />} />
          <Route path="/dashboard/promotions/report" element={<PromotionPage screen="report" />} />
        </Route>

        {/* Transport */}
        <Route element={<ProtectedRoute requiredModule="transport" />}>
          <Route path="/dashboard/transport" element={<TransportPage />} />
        </Route>

        {/* Fee Management */}
        <Route element={<ProtectedRoute requiredModule="fee-management" />}>
          <Route path="/dashboard/fee-structure" element={<FeeManagementPage />} />
        </Route>

        {/* Certificates */}
        <Route element={<ProtectedRoute requiredModule="certificates" />}>
          <Route path="/dashboard/certificates" element={<CertificatesPage />} />
        </Route>

        {/* Reports */}
        <Route element={<ProtectedRoute requiredModule="reports-analytics" />}>
          <Route path="/dashboard/reports" element={<ReportsAnalyticsPage />} />
          <Route path="/dashboard/reports-analytics" element={<Navigate to="/dashboard/reports" replace />} />
        </Route>
        {/* Settings General & Admin Profile */}
        <Route path="/dashboard/settings" element={<Suspense fallback={<SettingsFallback />}><SettingsPage /></Suspense>} />
        <Route path="/dashboard/settings/general" element={<SettingsPage />} />
        <Route path="/dashboard/settings/my-profile" element={<AdminProfilePage />} />
        <Route path="/dashboard/settings/profile" element={<AdminProfilePage />} />
        <Route path="/dashboard/my-profile" element={<AdminProfilePage />} />

        {/* Settings Sub-Modules */}
        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="lop-configuration" />}>
          <Route path="/dashboard/settings/lop-configuration" element={<Suspense fallback={<SettingsFallback />}><LOPConfigurationPage /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="campus-images" />}>
          <Route path="/dashboard/settings/campus-images" element={<Suspense fallback={<SettingsFallback />}><CampusImagesConfigurationPage /></Suspense>} />
          <Route path="/dashboard/settings/landing-page" element={<Suspense fallback={<SettingsFallback />}><CampusImagesConfigurationPage page="landing" /></Suspense>} />
          <Route path="/dashboard/settings/login-page" element={<Suspense fallback={<SettingsFallback />}><CampusImagesConfigurationPage page="login" /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="campus-configuration" />}>
          <Route path="/dashboard/settings/campus-configuration" element={<Suspense fallback={<SettingsFallback />}><CampusConfigurationPage /></Suspense>} />
          <Route path="/dashboard/settings/campus" element={<CampusConfigurationPage />} />
        </Route>

        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="audit-logs" />}>
          <Route path="/dashboard/settings/audit-logs" element={<Suspense fallback={<SettingsFallback />}><AuditLogsPage /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute requiredModule="roles-permissions" requiredScreen="role-management" />}>
          <Route path="/dashboard/settings/roles-permissions" element={<Suspense fallback={<SettingsFallback />}><RolesPermissionsPage /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="leave-types" />}>
          <Route path="/dashboard/settings/leave-types" element={<Suspense fallback={<SettingsFallback />}><LeaveTypesPage /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="attendance-timing" />}>
          <Route path="/dashboard/settings/attendance-timing" element={<Suspense fallback={<SettingsFallback />}><AttendanceTimingConfigPage /></Suspense>} />
        </Route>

        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="number-series" />}>
          <Route path="/dashboard/settings/number-series" element={<Suspense fallback={<SettingsFallback />}><NumberSeriesPage mode="dashboard" /></Suspense>} />
          <Route path="/dashboard/settings/number-series/:seriesId/edit" element={<Suspense fallback={<SettingsFallback />}><NumberSeriesPage mode="edit" /></Suspense>} />
          <Route path="/dashboard/settings/number-series/:seriesId" element={<Suspense fallback={<SettingsFallback />}><NumberSeriesPage mode="detail" /></Suspense>} />
        </Route>

        {/* Templates Management Module Routes */}
        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="templates" />}>
          <Route path="/dashboard/settings/templates" element={<Suspense fallback={<SettingsFallback />}><TemplatesPage /></Suspense>} />
          <Route path="/dashboard/settings/templates/certificates/:id/edit" element={<Suspense fallback={<SettingsFallback />}><TemplatesPage /></Suspense>} />
          <Route path="/dashboard/settings/templates/reports/:id/edit" element={<Suspense fallback={<SettingsFallback />}><TemplatesPage /></Suspense>} />
          <Route path="/dashboard/settings/templates/letters/:id/edit" element={<Suspense fallback={<SettingsFallback />}><TemplatesPage /></Suspense>} />
          <Route path="/dashboard/settings/templates/upload" element={<Suspense fallback={<SettingsFallback />}><TemplatesPage /></Suspense>} />
          <Route path="/dashboard/settings/templates/add" element={<Suspense fallback={<SettingsFallback />}><TemplatesPage /></Suspense>} />
          <Route path="/dashboard/settings/templates/:id/preview" element={<Suspense fallback={<SettingsFallback />}><TemplatesPage /></Suspense>} />
        </Route>

        {/* Credentials Generator Module Routes */}
        <Route element={<ProtectedRoute requiredModule="settings" requiredScreen="credentials" />}>
          <Route path="/dashboard/settings/credentials" element={<Suspense fallback={<SettingsFallback />}><CredentialsGeneratorPage /></Suspense>} />
          <Route path="/dashboard/settings/credentials/faculty" element={<Suspense fallback={<SettingsFallback />}><CredentialsGeneratorPage /></Suspense>} />
          <Route path="/dashboard/settings/credentials/students" element={<Suspense fallback={<SettingsFallback />}><CredentialsGeneratorPage /></Suspense>} />
          <Route path="/dashboard/settings/credentials/history" element={<Suspense fallback={<SettingsFallback />}><CredentialsGeneratorPage /></Suspense>} />
          <Route path="/dashboard/settings/credentials/settings" element={<Suspense fallback={<SettingsFallback />}><CredentialsGeneratorPage /></Suspense>} />
          <Route path="/dashboard/settings/credentials/faculty/generate" element={<Suspense fallback={<SettingsFallback />}><CredentialsGeneratorPage /></Suspense>} />
          <Route path="/dashboard/settings/credentials/students/generate" element={<Suspense fallback={<SettingsFallback />}><CredentialsGeneratorPage /></Suspense>} />
        </Route>

        {/* Payroll (Finance) Canonical Routes */}
        <Route element={<ProtectedRoute requiredModule="payroll" />}>
          <Route path="/dashboard/payroll" element={<PayrollPage mode="payroll" />} />
          <Route path="/dashboard/payroll/employees" element={<PayrollPage mode="payroll-employees" />} />
          <Route path="/dashboard/payroll/structures" element={<PayrollPage mode="structures-list" />} />
          <Route path="/dashboard/payroll/structures/add" element={<PayrollPage mode="structures-add" />} />
          <Route path="/dashboard/payroll/structures/:id" element={<PayrollPage mode="structures-view" />} />
          <Route path="/dashboard/payroll/structures/:id/edit" element={<PayrollPage mode="structures-edit" />} />
          <Route path="/dashboard/payroll/generate" element={<PayrollPage mode="payroll-generate" />} />
          <Route path="/dashboard/payroll/history" element={<PayrollPage mode="payroll-history" />} />
          <Route path="/dashboard/payroll/assignments" element={<PayrollPage mode="assignments-list" />} />
          <Route path="/dashboard/payroll/assign/teaching" element={<PayrollPage mode="assign-teaching" />} />
          <Route path="/dashboard/payroll/assign/non-teaching" element={<PayrollPage mode="assign-non-teaching" />} />
          <Route path="/dashboard/payroll/assignments/:id" element={<PayrollPage mode="assignments-view" />} />
          <Route path="/dashboard/payroll/assignments/:id/edit" element={<PayrollPage mode="assignments-edit" />} />
          <Route path="/dashboard/payroll/process" element={<PayrollPage mode="payroll-list" />} />
          <Route path="/dashboard/payroll/month/:month" element={<PayrollPage mode="payroll-month-view" />} />
          <Route path="/dashboard/payroll/month/:month/:staffId" element={<PayrollPage mode="payroll-indiv-view" />} />
          <Route path="/dashboard/payroll/payslips" element={<PayrollPage mode="payslips-list" />} />
          <Route path="/dashboard/payroll/payslips/:staffId/:month" element={<PayrollPage mode="payslip-preview" />} />
          <Route path="/dashboard/payroll/revisions" element={<PayrollPage mode="revisions-list" />} />
          <Route path="/dashboard/payroll/revisions/add" element={<PayrollPage mode="revisions-add" />} />
          <Route path="/dashboard/payroll/attendance-impact" element={<PayrollPage mode="attendance-impact" />} />
          <Route path="/dashboard/payroll/bonus" element={<PayrollPage mode="bonus-list" />} />
          <Route path="/dashboard/payroll/bonus/add" element={<PayrollPage mode="bonus-add" />} />
          <Route path="/dashboard/payroll/overtime" element={<PayrollPage mode="overtime-list" />} />
          <Route path="/dashboard/payroll/advances" element={<PayrollPage mode="advances-list" />} />
          <Route path="/dashboard/payroll/advances/add" element={<PayrollPage mode="advances-add" />} />
          <Route path="/dashboard/payroll/reimbursements" element={<PayrollPage mode="reimbursements-list" />} />
          <Route path="/dashboard/payroll/reimbursements/add" element={<PayrollPage mode="reimbursements-add" />} />
          <Route path="/dashboard/payroll/approvals" element={<PayrollPage mode="approvals-list" />} />
          <Route path="/dashboard/payroll/reports" element={<PayrollPage mode="reports" />} />
          <Route path="/dashboard/payroll/settings" element={<PayrollPage mode="settings" />} />
          <Route path="/dashboard/payroll/import" element={<PayrollPage mode="import" />} />
          {/* Backward-Compatible Staff Salary Aliases */}
          <Route path="/dashboard/staff-salary" element={<PayrollPage mode="payroll" />} />
          <Route path="/dashboard/staff-salary/structures" element={<PayrollPage mode="structures-list" />} />
          <Route path="/dashboard/staff-salary/structures/add" element={<PayrollPage mode="structures-add" />} />
          <Route path="/dashboard/staff-salary/structures/:id" element={<PayrollPage mode="structures-view" />} />
          <Route path="/dashboard/staff-salary/structures/:id/edit" element={<PayrollPage mode="structures-edit" />} />
          <Route path="/dashboard/staff-salary/assignments" element={<PayrollPage mode="assignments-list" />} />
          <Route path="/dashboard/staff-salary/assign/teaching" element={<PayrollPage mode="assign-teaching" />} />
          <Route path="/dashboard/staff-salary/assign/non-teaching" element={<PayrollPage mode="assign-non-teaching" />} />
          <Route path="/dashboard/staff-salary/assignments/:id" element={<PayrollPage mode="assignments-view" />} />
          <Route path="/dashboard/staff-salary/assignments/:id/edit" element={<PayrollPage mode="assignments-edit" />} />
          <Route path="/dashboard/staff-salary/payroll" element={<PayrollPage mode="payroll-list" />} />
          <Route path="/dashboard/staff-salary/payroll/:month" element={<PayrollPage mode="payroll-month-view" />} />
          <Route path="/dashboard/staff-salary/payroll/:month/:staffId" element={<PayrollPage mode="payroll-indiv-view" />} />
          <Route path="/dashboard/staff-salary/payslips" element={<PayrollPage mode="payslips-list" />} />
          <Route path="/dashboard/staff-salary/payslips/:staffId/:month" element={<PayrollPage mode="payslip-preview" />} />
          <Route path="/dashboard/staff-salary/revisions" element={<PayrollPage mode="revisions-list" />} />
          <Route path="/dashboard/staff-salary/revisions/add" element={<PayrollPage mode="revisions-add" />} />
          <Route path="/dashboard/staff-salary/attendance-impact" element={<PayrollPage mode="attendance-impact" />} />
          <Route path="/dashboard/staff-salary/bonus" element={<PayrollPage mode="bonus-list" />} />
          <Route path="/dashboard/staff-salary/bonus/add" element={<PayrollPage mode="bonus-add" />} />
          <Route path="/dashboard/staff-salary/overtime" element={<PayrollPage mode="overtime-list" />} />
          <Route path="/dashboard/staff-salary/advances" element={<PayrollPage mode="advances-list" />} />
          <Route path="/dashboard/staff-salary/advances/add" element={<PayrollPage mode="advances-add" />} />
          <Route path="/dashboard/staff-salary/reimbursements" element={<PayrollPage mode="reimbursements-list" />} />
          <Route path="/dashboard/staff-salary/reimbursements/add" element={<PayrollPage mode="reimbursements-add" />} />
          <Route path="/dashboard/staff-salary/approvals" element={<PayrollPage mode="approvals-list" />} />
          <Route path="/dashboard/staff-salary/reports" element={<PayrollPage mode="reports" />} />
          <Route path="/dashboard/staff-salary/settings" element={<PayrollPage mode="settings" />} />
          <Route path="/dashboard/staff-salary/import" element={<PayrollPage mode="import" />} />
        </Route>

        {/* Finance Reimbursement Routes */}
        <Route element={<ProtectedRoute requiredModule="reimbursement" />}>
          <Route path="/dashboard/reimbursement" element={<ReimbursementPage />} />
          <Route path="/dashboard/finance/reimbursement" element={<ReimbursementPage />} />
          <Route path="/dashboard/finance/reimbursements" element={<ReimbursementPage />} />
        </Route>

        {/* Hostel Management Module Routes */}
        <Route element={<ProtectedRoute requiredModule="hostel-management" />}>
          <Route path="/hostel" element={<HostelDashboard />} />
          <Route path="/hostel/master-setup" element={<HostelMasterSetup />} />
          <Route path="/hostel/students" element={<HostelStudentManagement />} />
          <Route path="/hostel/student-allocation" element={<HostelStudentManagement />} />
          <Route path="/hostel/attendance" element={<HostelAttendanceRegister />} />
          <Route path="/hostel/reports" element={<HostelReports />} />

          <Route path="/dashboard/hostel" element={<HostelDashboard />} />
          <Route path="/dashboard/hostel/master" element={<HostelMasterSetup />} />
          <Route path="/dashboard/hostel/master-setup" element={<HostelMasterSetup />} />
          <Route path="/dashboard/hostel/students" element={<HostelStudentManagement />} />
          <Route path="/dashboard/hostel/student-allocation" element={<HostelStudentManagement />} />
          <Route path="/dashboard/hostel/attendance" element={<HostelAttendanceRegister />} />
          <Route path="/dashboard/hostel/reports" element={<HostelReports />} />
        </Route>

        {listSlugs.filter((slug) => !["faculty", "courses", "subjects"].includes(slug)).map((slug) => <Route key={`${slug}-add`} path={`/dashboard/${slug}/add`} element={<ModuleFormRoute slug={slug} />} />)}
        {listSlugs.filter((slug) => !["faculty", "courses", "subjects"].includes(slug)).map((slug) => <Route key={`${slug}-edit`} path={`/dashboard/${slug}/:id/edit`} element={<ModuleFormRoute slug={slug} />} />)}
        <Route path="/dashboard/students/:id" element={<StudentProfileRoute />} />
      </Route>

      <Route element={<ProtectedRoute requireStudent />}>
        <Route path="/student-dashboard/*" element={<StudentPortalRoutes />} />
      </Route>

      <Route element={<ProtectedRoute requireAccountant />}>
        <Route path="/accountant-dashboard/*" element={<AccountantPortalRoutes />} />
      </Route>

      {/* Parent Portal Module Routes */}
      <Route element={<ProtectedRoute requireParent />}>
        <Route element={<ParentPortalProvider><ErrorBoundary><Outlet /></ErrorBoundary></ParentPortalProvider>}>
          <Route path="/parent-dashboard" element={<ParentDashboard />} />
          <Route path="/parent-dashboard/children" element={<ParentChildrenPage />} />
          <Route path="/parent-dashboard/children/:id" element={<ParentChildDetailsRoute />} />
          <Route path="/parent-dashboard/attendance" element={<ParentAttendancePage />} />
          <Route path="/parent-dashboard/academics" element={<ParentAcademicsPage />} />
          <Route path="/parent-dashboard/examinations" element={<ParentExaminationsPage />} />
          <Route path="/parent-dashboard/results" element={<Navigate to="/parent-dashboard/academics?tab=results" replace />} />
          <Route path="/parent-dashboard/fees" element={<ParentFeesPage />} />
          <Route path="/parent-dashboard/timetable" element={<ParentTimetablePage />} />
          <Route path="/parent-dashboard/leave" element={<Navigate to="/parent-dashboard" replace />} />
          <Route path="/parent-dashboard/communication" element={<ParentCommunicationPage />} />
          <Route path="/parent-dashboard/announcements" element={<ParentAnnouncementsPage />} />
          <Route path="/parent-dashboard/events" element={<Navigate to="/parent-dashboard/announcements?tab=events" replace />} />
          <Route path="/parent-dashboard/documents" element={<ParentDocumentsPage />} />
          <Route path="/parent-dashboard/notifications" element={<ParentNotificationsPage />} />
          <Route path="/parent-dashboard/profile" element={<ParentProfilePage />} />
          <Route path="/parent-dashboard/settings" element={<ParentSettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requireExamCell />}>
        <Route path="/exam-cell-dashboard/*" element={<ExamCellPortalRoutes />} />
      </Route>

      <Route element={<ProtectedRoute requireFaculty />}>
        <Route path="/faculty-dashboard/*" element={<FacultyPortalRoutes />} />
      </Route>

      <Route element={<ProtectedRoute requireNonTeaching />}>
        <Route path="/non-teaching-dashboard/*" element={<NonTeachingPortalRoutes />} />
        <Route path="/non-teaching/*" element={<Navigate to="/non-teaching-dashboard" replace />} />
        <Route path="/non-teaching" element={<Navigate to="/non-teaching-dashboard" replace />} />
      </Route>
      {/* Transport Manager Module Routes */}
      <Route element={<ProtectedRoute requireTransportManager />}>
        <Route path="/transport-manager" element={<Navigate to="/transport-manager/overview" replace />} />
        <Route path="/transport-manager/*" element={<TransportManagerRoutes />} />
      </Route>
      <Route path="/driver" element={<DriverDashboard />} />
      <Route path="/inventory-dashboard/*" element={<InventoryDashboard />} />
      <Route path="/driver/*" element={<DriverDashboard />} />
      <Route path="/driver-dashboard" element={<Navigate to="/driver" replace />} />
      <Route path="/driver-dashboard/*" element={<DriverDashboard />} />
      <Route path="/staff/onboarding/:id" element={<StaffManagementPage />} />
      <Route path="/staff/onboarding/:id/complete-profile" element={<StaffManagementPage />} />
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
      <Route path="/transport" element={<Navigate to="/dashboard/transport" replace />} />
      <Route path="/certificates" element={<Navigate to="/dashboard/certificates" replace />} />
      <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
      <Route path="/reports-analytics" element={<Navigate to="/dashboard/reports" replace />} />
      <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
