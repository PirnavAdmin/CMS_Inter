import { Outlet } from "react-router-dom";
import DashboardLayout, { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import "../../StudentDashboard/StudentDashboard.css";
import "../AccountantDashboard.css";

const accountantMenu = [
  {
    section: "ACCOUNTANT PORTAL",
    items: [
      { to: "/accountant-dashboard", label: "Dashboard", icon: adminIconAssets.dashboard },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { to: "/accountant-dashboard/fees", label: "Fee Management", icon: adminIconAssets.feeManagement },
      { to: "/accountant-dashboard/payments", label: "Payment History", icon: adminIconAssets.paymentHistory },
      { to: "/accountant-dashboard/payroll", label: "Payroll", icon: adminIconAssets.payroll },
      { to: "/accountant-dashboard/payroll/attendance-impact", label: "Attendance Impact", icon: adminIconAssets.attendanceImpact },
      { to: "/accountant-dashboard/reports", label: "Financial Reports", icon: adminIconAssets.financialReports },
    ],
  },
  {
    section: "ACCOUNT",
    items: [
      { to: "/accountant-dashboard/profile", label: "My Profile", icon: adminIconAssets.profile },
    ],
  },
];

export default function AccountantLayout() {
  return (
    <DashboardLayout
      menuOverride={accountantMenu}
      profilePath="/accountant-dashboard/profile"
      settingsPath={null}
      showSettingsAction={false}
    >
      <div className="accountant-shell">
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
