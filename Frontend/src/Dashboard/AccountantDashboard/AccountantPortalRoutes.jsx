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
import ReimbursementPage from "@/components/pages/ReimbursementPage.jsx";
import AccountantMyAttendance from "./pages/AccountantMyAttendance.jsx";
import AccountantLeave from "./pages/AccountantLeave.jsx";

export default function AccountantPortalRoutes() {
  return (
    <Routes>
      <Route element={<AccountantLayout />}>
        <Route index element={<AccountantDashboard />} />
        <Route path="fees" element={<AccountantFees />} />
        <Route path="payments" element={<AccountantPayments />} />
        <Route path="payroll" element={<AccountantPayroll />} />
        <Route path="payroll/attendance-impact" element={<AccountantAttendanceImpact />} />
        <Route path="reimbursement" element={<ReimbursementPage isAccountantView={true} />} />
        <Route path="reimbursements" element={<ReimbursementPage isAccountantView={true} />} />
        <Route path="reports" element={<AccountantReports />} />
        <Route path="profile" element={<AccountantProfile />} />
        <Route path="my-attendance" element={<AccountantMyAttendance />} />
        <Route path="leave" element={<AccountantLeave />} />
        <Route path="*" element={<Navigate to="/accountant-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
