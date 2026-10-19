import React, { useState } from "react";
import {
  Building,
  Briefcase,
  Users,
  FileText,
  Package,
  Truck,
  BookOpen,
  ShieldCheck,
  Wrench,
  Monitor,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Eye,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";
import { normalizeDepartmentCode } from "@/data/nonTeachingRolesConfig.js";

// Specific department module data
const DEPARTMENT_MODULES = {
  ADMINISTRATION: {
    name: "Administration & Office Support",
    code: "ADMINISTRATION",
    icon: Building,
    metrics: [
      { label: "Today's Visitors", val: "18", sub: "Gate passes verified" },
      { label: "Inward Couriers", val: "6", sub: "4 delivered, 2 pending" },
      { label: "Stationery Requests", val: "3", sub: "Approved by AO" },
      { label: "Files Dispatched", val: "12", sub: "To Registrar / Dean" },
    ],
    records: [
      { id: "VIS-2026-88", title: "Parent Inquiry — Inter 1st Year Admission", party: "Mr. R. V. Sharma", time: "10:15 AM", status: "Completed" },
      { id: "CR-2026-42", title: "University Speed Post Envelope (Marks Memo)", party: "Andhra University", time: "11:30 AM", status: "Logged" },
      { id: "VIS-2026-89", title: "Vendor Meeting — Campus Biometric AMC", party: "SecureTech Solutions", time: "02:00 PM", status: "In Progress" },
      { id: "STN-2026-19", title: "A4 Paper Ream Box (Qty: 10)", party: "Central Stores", time: "03:45 PM", status: "Approved" },
    ],
  },
  LIBRARY: {
    name: "Library & Information Center",
    code: "LIBRARY",
    icon: BookOpen,
    metrics: [
      { label: "Books Issued Today", val: "42", sub: "Student barcode scan" },
      { label: "Returns Received", val: "38", sub: "Returned to rack" },
      { label: "Overdue Reminders", val: "14", sub: "Email sent" },
      { label: "Digital Access Users", val: "89", sub: "E-journal lounge" },
    ],
    records: [
      { id: "LIB-BK-102", title: "Concepts of Physics (Vol 1) - H.C. Verma", party: "Rahul Kumar (MPC-A)", time: "09:30 AM", status: "Issued" },
      { id: "LIB-BK-105", title: "Intermediate Organic Chemistry", party: "Sneha Reddy (BiPC-B)", time: "11:15 AM", status: "Returned" },
      { id: "LIB-BK-110", title: "Advanced Calculus for Higher Secondary", party: "P. Vignesh (MEC)", time: "01:20 PM", status: "Overdue" },
    ],
  },
  TRANSPORT: {
    name: "Transport & Fleet Management",
    code: "TRANSPORT",
    icon: Truck,
    metrics: [
      { label: "Active Buses", val: "16", sub: "All routes operational" },
      { label: "Morning Trips", val: "16 / 16", sub: "100% on-time" },
      { label: "Fuel Slips Verified", val: "8", sub: "IOCL Petrol Bunk" },
      { label: "Maintenance Due", val: "2", sub: "Bus #04 & #11" },
    ],
    records: [
      { id: "TR-RT-01", title: "Route 1: Gajuwaka Junction to Campus", party: "Driver: M. Appa Rao (Bus #01)", time: "08:15 AM", status: "Completed" },
      { id: "TR-RT-04", title: "Route 4: MVP Colony via Highway", party: "Driver: K. Venkat (Bus #04)", time: "08:22 AM", status: "Completed" },
      { id: "TR-MN-09", title: "Brake Pad Replacement & Oil Top-up", party: "Authorized Tata Garage", time: "02:30 PM", status: "In Progress" },
    ],
  },
  SECURITY: {
    name: "Security & Campus Vigilance",
    code: "SECURITY",
    icon: ShieldCheck,
    metrics: [
      { label: "Guards on Duty", val: "14", sub: "Shift A (Morning)" },
      { label: "Vehicles Checked", val: "142", sub: "Staff & Visitor cars" },
      { label: "Incident Reports", val: "0", sub: "All gates clear" },
      { label: "CCTV Cameras Live", val: "64 / 64", sub: "Control room active" },
    ],
    records: [
      { id: "SEC-LOG-01", title: "Main Gate Entry Inspection — Delivery Van", party: "Driver D. Naidu (AP31 TV 4412)", time: "09:10 AM", status: "Verified" },
      { id: "SEC-LOG-02", title: "Visitor Badge Issue #V-188", party: "BIEAP Inspection Officer", time: "10:00 AM", status: "Escorted" },
    ],
  },
  MAINTENANCE: {
    name: "Maintenance & Facilities",
    code: "MAINTENANCE",
    icon: Wrench,
    metrics: [
      { label: "Open Work Orders", val: "4", sub: "Assigned to technicians" },
      { label: "Resolved Today", val: "5", sub: "Electrical & plumbing" },
      { label: "Generator Fuel", val: "85%", sub: "Backup ready" },
      { label: "Water Level", val: "92%", sub: "Overhead tanks full" },
    ],
    records: [
      { id: "WO-2026-11", title: "Physics Lab 2 Exhaust Fan Servicing", party: "Technician: R. Satyam", time: "10:30 AM", status: "Completed" },
      { id: "WO-2026-12", title: "Auditorium Stage Light Fuse Inspection", party: "Electrician: P. Rao", time: "01:00 PM", status: "In Progress" },
    ],
  },
  IT_SUPPORT: {
    name: "IT Infrastructure & Support",
    code: "IT_SUPPORT",
    icon: Monitor,
    metrics: [
      { label: "Workstations Live", val: "220", sub: "Computer Labs 1-4" },
      { label: "Network Bandwidth", val: "1 Gbps", sub: "Fiber line optimal" },
      { label: "Open Helpdesk Tickets", val: "3", sub: "Average resolution: 2h" },
      { label: "Server Uptime", val: "99.9%", sub: "Cloud CMS synced" },
    ],
    records: [
      { id: "IT-2026-44", title: "Lab 3 System #18 RAM Upgrade (16GB)", party: "Hardware Tech: B. Kiran", time: "11:00 AM", status: "Completed" },
      { id: "IT-2026-45", title: "Accounts Printer IP Reconfiguration", party: "Network Tech: L. Mohan", time: "02:15 PM", status: "Completed" },
    ],
  },
};

export default function NonTeachingDepartment() {
  const profile = nonTeachingService.getProfile();
  const defaultDeptCode = normalizeDepartmentCode(profile.departmentName || profile.department);
  const [activeDept, setActiveDept] = useState(defaultDeptCode in DEPARTMENT_MODULES ? defaultDeptCode : "ADMINISTRATION");

  const deptData = DEPARTMENT_MODULES[activeDept] || DEPARTMENT_MODULES.ADMINISTRATION;
  const DeptIcon = deptData.icon;

  return (
    <>
      {/* Department Selector / Previewer */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--nts-muted)" }}>
            DEPARTMENT MODULE:
          </span>
          <div className="nts-tabs-strip">
            {Object.keys(DEPARTMENT_MODULES).map((key) => {
              const item = DEPARTMENT_MODULES[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={`nts-tab-btn ${activeDept === key ? "active" : ""}`}
                  onClick={() => setActiveDept(key)}
                >
                  {item.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--nts-muted)" }}>
          Active Role: <strong>{profile.designationName || profile.designation}</strong> ({profile.departmentName || profile.department})
        </div>
      </section>

      {/* Department Banner */}
      <section className="nts-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--nts-primary) 15%, var(--nts-surface))",
              color: "var(--nts-primary)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <DeptIcon size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--nts-text)" }}>
              {deptData.name}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--nts-muted)" }}>
              Department operational workflows, daily logs, register management, and resource coordination.
            </p>
          </div>
        </div>
      </section>

      {/* Department Metrics Grid */}
      <section className="nts-kpi-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {deptData.metrics.map((m, idx) => {
          const tones = ["green", "blue", "purple", "cyan"];
          const tone = tones[idx % tones.length];
          return (
            <div key={m.label} className={`nts-kpi nts-kpi-${tone}`}>
              <div className="nts-kpi-top">
                <div className="nts-kpi-meta">
                  <span className="nts-kpi-label">{m.label}</span>
                  <span className="nts-kpi-val">{m.val}</span>
                </div>
              </div>
              <span className="nts-kpi-sub">{m.sub}</span>
            </div>
          );
        })}
      </section>

      {/* Department Daily Operations Table */}
      <section className="nts-card">
        <div className="nts-card-head">
          <h3>
            <FileText size={16} style={{ color: "var(--nts-primary)" }} /> Active Operational Register & Daily Logs
          </h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="nts-table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Activity / Item Description</th>
                <th>Party / Assigned Person</th>
                <th>Logged Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deptData.records.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700 }}>{r.id}</td>
                  <td><strong>{r.title}</strong></td>
                  <td>{r.party}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.time}</td>
                  <td>
                    <span className={`nts-status-badge ${r.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {r.status === "Completed" && <CheckCircle2 size={12} />}
                      {r.status === "In Progress" && <Clock size={12} />}
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
