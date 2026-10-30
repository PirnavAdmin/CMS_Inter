import { SkeletonPage } from "@/shared/components/Skeleton.jsx";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Boxes,
  LayoutDashboard,
  List,
  ArrowDownToLine,
  ArrowUpFromLine,
  Truck,
  Tags,
  ShoppingCart,
  RotateCcw,
  BarChart3,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  FileText,
  Wallet,
} from "lucide-react";
import logo from "@/assets/pirnav-colleges-logo.png";
import { inventoryLogout } from "../data/inventorySession.js";
import { useInventory } from "../InventoryDataContext.jsx";
const menu = [
  ["", "Dashboard", LayoutDashboard],
  ["items", "Items", List],
  ["stock-in", "Stock In", ArrowDownToLine],
  ["stock-out", "Stock Out", ArrowUpFromLine],
  ["suppliers", "Suppliers", Truck],
  ["categories", "Categories", Tags],
  ["orders", "Purchase Orders", ShoppingCart],
  ["returns", "Returns", RotateCcw],
  ["reports", "Reports", BarChart3],
  ["leave", "Leave Management", FileText],
  ["payslips", "My Payslips", Wallet],
  ["notifications", "Notifications", Bell],
  ["profile", "Profile", User],
  ["settings", "Settings", Settings],
];
export default function InventoryLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { state, message, dismiss, errors, loading } = useInventory();
  const navigate = useNavigate();
  const unread =
    (state.preferences.lowStock
      ? state.items.filter(
          (i) =>
            i.status === "Active" &&
            i.quantity < i.minStock &&
            !state.readNotifications.includes(i.id),
        ).length
      : 0) +
    (state.preferences.orderUpdates
      ? state.orders.filter(
          (o) => o.status === "Pending" && !state.readNotifications.includes(o.id),
        ).length
      : 0);
  return (
    <div className="ip-shell">
      {open && (
        <button
          className="ip-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`ip-sidebar ${open ? "is-open" : ""}`}>
        <div className="ip-brand">
          <img src={logo} alt="Pirnav College" />
          <button className="ip-mobile" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="ip-portal">
          <Boxes size={19} />
          <div>
            <strong>INVENTORY PORTAL</strong>
            <small>Stores & Asset Management</small>
          </div>
        </div>
        <nav aria-label="Inventory navigation">
          {menu.map(([path, label, Icon]) => (
            <NavLink
              key={label}
              end
              to={`/inventory-dashboard${path ? `/${path}` : ""}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="ip-sidebar-foot">
          <strong>{state.profile.name}</strong>
          <small>{state.profile.employeeId} · Store Manager</small>
          <button
            onClick={() => {
              inventoryLogout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
      <div className="ip-workspace">
        <header className="ip-topbar">
          <button className="ip-mobile" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </button>
          <strong>
            Pirnav College <span>/ Inventory Management</span>
          </strong>
          <div className="ip-topbar-right">
            <span className="ip-date">
              {new Date().toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <NavLink
              to="/inventory-dashboard/notifications"
              aria-label={`${unread} unread notifications`}
            >
              <Bell size={19} />
              {unread > 0 && <b>{unread}</b>}
            </NavLink>
            <NavLink to="/inventory-dashboard/profile" className="ip-user">
              <span>IM</span>
              <div>
                <strong>{state.profile.name}</strong>
                <small>Inventory Manager</small>
              </div>
            </NavLink>
          </div>
        </header>
        <main className="ip-content">
          <div className="ip-demo">
            Inventory portal · Connected to the college inventory server
          </div>
          {message && (
            <div className="ip-toast" role="status">
              {message}
              <button aria-label="Dismiss message" onClick={dismiss}>
                <X size={16} />
              </button>
            </div>
          )}
          {loading && <SkeletonPage variant="dashboard" columns={4} rows={4} />}
          {Object.entries(errors).map(([service, error]) => (
            <p key={service} className="ip-error" role="alert">
              {service}: {error}
            </p>
          ))}
          <div style={{ display: loading ? "none" : "contents" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
