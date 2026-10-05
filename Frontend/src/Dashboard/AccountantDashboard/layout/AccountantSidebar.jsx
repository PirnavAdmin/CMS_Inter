import { NavLink } from "react-router-dom";
import { BarChart3, CalendarCheck, CircleUserRound, History, LayoutDashboard, ReceiptText, WalletCards } from "lucide-react";
import logo from "@/assets/pirnav-colleges-logo.png";

const groups = [
  ["ACCOUNTANT PORTAL", [["Dashboard", "", LayoutDashboard]]],
  ["FINANCE", [
    ["Fee Management", "fees", ReceiptText],
    ["Payment History", "payments", History],
    ["Payroll", "payroll", WalletCards],
    ["Attendance Impact", "payroll/attendance-impact", CalendarCheck],
    ["Financial Reports", "reports", BarChart3],
  ]],
  ["ACCOUNT", [["My Profile", "profile", CircleUserRound]]],
];

export default function AccountantSidebar({ open, onClose }) {
  return (
    <aside className={`sp-sidebar ${open ? "is-open" : ""}`}>
      <div className="sp-brand"><img src={logo} alt="Pirnav Colleges" /></div>
      <nav>
        {groups.map(([heading, links]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            {links.map(([label, path, Icon]) => (
              <NavLink
                key={label}
                end={!path || path === "payroll"}
                to={`/accountant-dashboard${path ? `/${path}` : ""}`}
                onClick={onClose}
                className={({ isActive }) => isActive ? "is-active" : ""}
              >
                <Icon className="accountant-nav-icon" size={19} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>
    </aside>
  );
}
