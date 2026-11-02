import { Navigate, Route, Routes } from "react-router-dom";
import AccountantDashboard from "./AccountantDashboard.jsx";
import AccountantLayout from "./layout/AccountantLayout.jsx";
import {
  AccountantAttendanceImpact,
  AccountantFees,
  AccountantPayments,
  AccountantPayroll,
  AccountantProfile,
  AccountantReports,
} from "./pages/AccountantPages.jsx";
import ReimbursementPage from "@/modules/admin/AdminReimbursements/ReimbursementPage.jsx";
import AccountantMyAttendance from "./pages/AccountantMyAttendance.jsx";
import AccountantLeave from "./pages/AccountantLeave.jsx";
import AccountantHolidays from "./pages/AccountantHolidays.jsx";
import AccountantSettingsPage from "./pages/AccountantSettingsPage.jsx";
import { usePermissions } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";

function AccessDeniedNotice({ moduleName = "this screen" }) {
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
    }}>
      <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔒</div>
      <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--cms-text-primary, #0f172a)", marginBottom: "8px" }}>
        Access Restricted
      </h2>
      <p style={{ fontSize: "14px", color: "var(--cms-text-secondary, #64748b)", lineHeight: "1.6", maxWidth: "420px" }}>
        You do not have permission to view {moduleName}. Please contact your administrator if you believe you should have access.
      </p>
    </div>
  );
}

function AccountantPermissionRoute({ moduleKey, screenKey = null, moduleName = "this screen", children }) {
  const { canView } = usePermissions();
  const hasAccess = canView(moduleKey, screenKey);
  return hasAccess ? children : <AccessDeniedNotice moduleName={moduleName} />;
}

export default function AccountantPortalRoutes() {
  return (
    <Routes>
      <Route element={<AccountantLayout />}>
        <Route index element={<AccountantDashboard />} />
        <Route path="fees" element={<AccountantPermissionRoute moduleKey="fee-management" screenKey="fee-structure" moduleName="Fee Management"><AccountantFees /></AccountantPermissionRoute>} />
        <Route path="payments" element={<AccountantPermissionRoute moduleKey="fee-management" screenKey="fee-collection" moduleName="Payment History"><AccountantPayments /></AccountantPermissionRoute>} />
        <Route path="payroll" element={<AccountantPermissionRoute moduleKey="payroll" moduleName="Payroll"><AccountantPayroll /></AccountantPermissionRoute>} />
        <Route path="payroll/attendance-impact" element={<AccountantPermissionRoute moduleKey="payroll" screenKey="attendance-impact" moduleName="Attendance Impact"><AccountantAttendanceImpact /></AccountantPermissionRoute>} />
        <Route path="reimbursement" element={<AccountantPermissionRoute moduleKey="reimbursement" moduleName="Staff Reimbursements"><ReimbursementPage isAccountantView={true} /></AccountantPermissionRoute>} />
        <Route path="reimbursements" element={<AccountantPermissionRoute moduleKey="reimbursement" moduleName="Staff Reimbursements"><ReimbursementPage isAccountantView={true} /></AccountantPermissionRoute>} />
        <Route path="reports" element={<AccountantPermissionRoute moduleKey="reports-analytics" moduleName="Financial Reports"><AccountantReports /></AccountantPermissionRoute>} />
        <Route path="profile" element={<AccountantProfile />} />
        <Route path="my-attendance" element={<AccountantPermissionRoute moduleKey="staff-attendance" screenKey="my-attendance" moduleName="My Attendance"><AccountantMyAttendance /></AccountantPermissionRoute>} />
        <Route path="leave" element={<AccountantPermissionRoute moduleKey="staff-leave-management" screenKey="staff-leave" moduleName="Staff Leave"><AccountantLeave /></AccountantPermissionRoute>} />
        <Route path="holidays" element={<AccountantPermissionRoute moduleKey="holiday-management" moduleName="Holidays"><AccountantHolidays /></AccountantPermissionRoute>} />
        <Route path="settings" element={<AccountantSettingsPage />} />
        <Route path="*" element={<Navigate to="/accountant-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
