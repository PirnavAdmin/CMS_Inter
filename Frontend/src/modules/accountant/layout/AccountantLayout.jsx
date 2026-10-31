import staffLeaveIcon from "@/assets/settings-3d/leave-types.png";
import holidayManagementIcon from "@/assets/sidebar-3d/holiday-management.svg";
import { Outlet } from "react-router-dom";
import DashboardLayout, { adminIconAssets } from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import "../../student/StudentDashboard.css";
import "../AccountantDashboard.css";

const accountantMenu = [
  {
    section: "ACCOUNTANT PORTAL",
    items: [
      { to: "/accountant-dashboard", label: "Dashboard", icon: adminIconAssets.dashboard, moduleKey: "dashboard" },
    ],
  },
  {
    section: "FINANCE",
    items: [
      { to: "/accountant-dashboard/fees", label: "Fee Management", icon: adminIconAssets.feeManagement, moduleKey: "fee-management", screenKey: "fee-structure" },
      { to: "/accountant-dashboard/payments", label: "Payment History", icon: adminIconAssets.paymentHistory, moduleKey: "fee-management", screenKey: "fee-collection" },
      { to: "/accountant-dashboard/reimbursements", label: "Staff Reimbursements", icon: adminIconAssets.financialReports, moduleKey: "reimbursement" },
      { to: "/accountant-dashboard/payroll", label: "Payroll", icon: adminIconAssets.payroll, moduleKey: "payroll" },
      { to: "/accountant-dashboard/payroll/attendance-impact", label: "Attendance Impact", icon: adminIconAssets.attendanceImpact, moduleKey: "payroll", screenKey: "attendance-impact" },
      { to: "/accountant-dashboard/reports", label: "Financial Reports", icon: adminIconAssets.financialReports, moduleKey: "reports-analytics" },
    ],
  },
  {
    section: "ACCOUNT",
    items: [
      { to: "/accountant-dashboard/my-attendance", label: "My Attendance", icon: adminIconAssets.attendanceImpact, moduleKey: "staff-attendance", screenKey: "my-attendance" },
      { to: "/accountant-dashboard/leave", label: "Staff Leave", icon: staffLeaveIcon, moduleKey: "staff-leave-management", screenKey: "staff-leave" },
      { to: "/accountant-dashboard/holidays", label: "Holidays", icon: holidayManagementIcon, moduleKey: "holiday-management" },
      { to: "/accountant-dashboard/profile", label: "My Profile", icon: adminIconAssets.profile, moduleKey: "profile" },
      { to: "/accountant-dashboard/settings", label: "Settings", icon: adminIconAssets.board, moduleKey: "settings" },
    ],
  },
];

export default function AccountantLayout() {
  return (
    <DashboardLayout
      menuOverride={accountantMenu}
      profilePath="/accountant-dashboard/profile"
      settingsPath="/accountant-dashboard/settings"
      showSettingsAction={true}
    >
      <div className="accountant-shell">
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
