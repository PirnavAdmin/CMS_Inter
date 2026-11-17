import CampusBrandImage from "@/shared/components/CampusBrandImage.jsx";
import { NavLink } from "react-router-dom";
import logo from "@/assets/pirnav-colleges-logo.png";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { can, ACTIONS } from "@/modules/admin/AdminRolesPermissions/permissionUtils.jsx";

const groups = [
  ["ACCOUNTANT PORTAL", [["Dashboard", "", "dashboard", "dashboard"]]],
  ["FINANCE", [
    ["Fee Management", "fees", "fee-management", "fee-management", "fee-structure"],
    ["Payment History", "payments", "fee", "fee-management", "fee-collection"],
    ["Payroll", "payroll", "payroll", "payroll"],
    ["Reimbursements", "reimbursement", "reimbursement", "reimbursement"],
    ["Attendance Impact", "payroll/attendance-impact", "staff-attendance", "payroll", "attendance-impact"],
    ["Financial Reports", "reports", "reports-analytics", "reports-analytics"],
  ]],
  ["ACCOUNT", [
    ["My Profile", "profile", "staff", "profile"],
    ["Settings", "settings", "settings", "settings"],
  ]],
];

export default function AccountantSidebar({ open, onClose }) {
  const authUser = getAuthUser();
  return (
    <aside className={`sp-sidebar ${open ? "is-open" : ""}`}>
      <div className="sp-brand"><CampusBrandImage src={logo} alt="Pirnav Colleges"  /></div>
      <nav>
        {groups.map(([heading, links]) => {
          const visibleLinks = links.filter(([, , , moduleKey, screenKey]) => {
            if (!moduleKey || moduleKey === "dashboard") return true;
            if (authUser?.permissions || authUser?.rolePermissions) {
              return can(moduleKey, ACTIONS.VIEW, authUser?.permissions, authUser, screenKey);
            }
            return true;
          });
          if (!visibleLinks.length) return null;
          return (
            <section key={heading}>
              <h2>{heading}</h2>
              {visibleLinks.map(([label, path, iconName]) => (
              <NavLink
                key={label}
                end={!path || path === "payroll"}
                to={`/accountant-dashboard${path ? `/${path}` : ""}`}
                onClick={onClose}
                className={({ isActive }) => isActive ? "is-active" : ""}
              >
                <ThreeDIcon name={iconName} size={20} className="accountant-nav-icon" />
                <span>{label}</span>
              </NavLink>
            ))}
            </section>
          );
        })}
      </nav>
    </aside>
  );
}
