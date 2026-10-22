import React, { useState } from "react";
import {
  Building,
  Briefcase,
  Users,
  FileText,
  Package,
  Truck,
  ShieldCheck,
  Wrench,
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
      { label: "Today's Visitors", val: "0", sub: "Gate passes verified" },
      { label: "Inward Couriers", val: "0", sub: "Delivered & pending" },
      { label: "Stationery Requests", val: "0", sub: "Approved requests" },
      { label: "Files Dispatched", val: "0", sub: "Outward dispatches" },
    ],
    records: [],
  },
  TRANSPORT: {
    name: "Transport & Fleet Management",
    code: "TRANSPORT",
    icon: Truck,
    metrics: [
      { label: "Active Buses", val: "0", sub: "Operational fleet" },
      { label: "Morning Trips", val: "0", sub: "Trips completed" },
      { label: "Fuel Slips Verified", val: "0", sub: "Fuel vouchers" },
      { label: "Maintenance Due", val: "0", sub: "Vehicles in service" },
    ],
    records: [],
  },
  SECURITY: {
    name: "Security & Campus Vigilance",
    code: "SECURITY",
    icon: ShieldCheck,
    metrics: [
      { label: "Guards on Duty", val: "0", sub: "Active shift" },
      { label: "Vehicles Checked", val: "0", sub: "Entry gate logs" },
      { label: "Incident Reports", val: "0", sub: "Campus security" },
      { label: "CCTV Cameras Live", val: "0", sub: "Control room feeds" },
    ],
    records: [],
  },
  MAINTENANCE: {
    name: "Maintenance & Facilities",
    code: "MAINTENANCE",
    icon: Wrench,
    metrics: [
      { label: "Open Work Orders", val: "0", sub: "Active work orders" },
      { label: "Resolved Today", val: "0", sub: "Maintenance resolved" },
      { label: "Generator Fuel", val: "--", sub: "Backup fuel" },
      { label: "Water Level", val: "--", sub: "Storage status" },
    ],
    records: [],
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
              {deptData.records.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px 16px", color: "var(--nts-muted)" }}>
                    No department operational logs found for today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
