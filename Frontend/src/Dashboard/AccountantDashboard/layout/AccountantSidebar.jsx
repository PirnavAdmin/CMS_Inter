import CampusBrandImage from "@/components/common/CampusBrandImage.jsx";
import { NavLink } from "react-router-dom";
import logo from "@/assets/pirnav-colleges-logo.png";
import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";

const groups = [
  ["ACCOUNTANT PORTAL", [["Dashboard", "", "dashboard"]]],
  ["FINANCE", [
    ["Fee Management", "fees", "fee-management"],
    ["Payment History", "payments", "fee"],
    ["Payroll", "payroll", "payroll"],
    ["Reimbursements", "reimbursement", "reimbursement"],
    ["Attendance Impact", "payroll/attendance-impact", "staff-attendance"],
    ["Financial Reports", "reports", "reports-analytics"],
  ]],
  ["ACCOUNT", [["My Profile", "profile", "staff"]]],
];

export default function AccountantSidebar({ open, onClose }) {
  return (
    <aside className={`sp-sidebar ${open ? "is-open" : ""}`}>
      <div className="sp-brand"><CampusBrandImage src={logo} alt="Pirnav Colleges"  /></div>
      <nav>
        {groups.map(([heading, links]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            {links.map(([label, path, iconName]) => (
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
        ))}
      </nav>
    </aside>
  );
}
