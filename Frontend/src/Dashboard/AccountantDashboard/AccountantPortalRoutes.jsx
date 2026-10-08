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

export default function AccountantPortalRoutes() {
  return (
    <Routes>
      <Route element={<AccountantLayout />}>
        <Route index element={<AccountantDashboard />} />
        <Route path="fees" element={<AccountantFees />} />
        <Route path="payments" element={<AccountantPayments />} />
        <Route path="payroll" element={<AccountantPayroll />} />
        <Route path="payroll/attendance-impact" element={<AccountantAttendanceImpact />} />
        <Route path="reports" element={<AccountantReports />} />
        <Route path="profile" element={<AccountantProfile />} />
        <Route path="*" element={<Navigate to="/accountant-dashboard" replace />} />
      </Route>
    </Routes>
  );
}
