import React, { useState, useMemo, useEffect } from "react";
import apiClient from "@/api/apiClient.js";
import {
  Building,
  Truck,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  Clock,
  FileText,
  Search,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";

// Department module configurations
const DEPARTMENT_MODULES = {
  ADMINISTRATION: {
    name: "Administration & Office Support",
    code: "ADMINISTRATION",
    icon: Building,
    description: "Department operational workflows, daily logs, register management, and resource coordination.",
    metrics: [
      { label: "Today's Visitors", val: "24", sub: "Gate passes verified" },
      { label: "Inward Couriers", val: "12", sub: "Delivered & pending" },
      { label: "Stationery Requests", val: "8", sub: "Approved requests" },
      { label: "Files Dispatched", val: "16", sub: "Outward dispatches" },
    ],
    records: [],
  },
  TRANSPORT: {
    name: "Transport & Fleet Management",
    code: "TRANSPORT",
    icon: Truck,
    description: "Bus routes, vehicle fleet status, driver duty schedules, and maintenance tracking.",
    metrics: [
      { label: "Active Buses", val: "18", sub: "Operational fleet" },
      { label: "Morning Trips", val: "18 / 18", sub: "Trips completed" },
      { label: "Fuel Slips Verified", val: "14", sub: "Fuel vouchers" },
      { label: "Maintenance Due", val: "2", sub: "Vehicles in service" },
    ],
    records: [],
  },
  SECURITY: {
    name: "Security & Campus Vigilance",
    code: "SECURITY",
    icon: ShieldCheck,
    description: "Main gate monitoring, visitor access logs, parking regulation, and surveillance feeds.",
    metrics: [
      { label: "Guards on Duty", val: "14", sub: "Active shift" },
      { label: "Vehicles Checked", val: "156", sub: "Entry gate logs" },
      { label: "Incident Reports", val: "0", sub: "Campus security" },
      { label: "CCTV Cameras Live", val: "48 / 48", sub: "Control room feeds" },
    ],
    records: [],
  },
  MAINTENANCE: {
    name: "Maintenance & Facilities",
    code: "MAINTENANCE",
    icon: Wrench,
    description: "Electrical systems, plumbing, classroom audio-visual support, and campus infrastructure.",
    metrics: [
      { label: "Open Work Orders", val: "3", sub: "Active work orders" },
      { label: "Resolved Today", val: "7", sub: "Maintenance resolved" },
      { label: "Generator Fuel", val: "88%", sub: "Backup fuel" },
      { label: "Water Level", val: "94%", sub: "Storage status" },
    ],
    records: [],
  },
};

export default function NonTeachingDepartment() {
  const profile = nonTeachingService.getProfile();
  const [activeDept, setActiveDept] = useState("ADMINISTRATION");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get("/api/v1/non-teaching/department-portal/data", {
        params: { department: activeDept },
      })
      .then((res) => {
        if (active && res?.data?.data) {
          setLiveData(res.data.data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeDept]);

  const defaultData = DEPARTMENT_MODULES[activeDept] || DEPARTMENT_MODULES.ADMINISTRATION;
  const deptData = useMemo(() => {
    if (!liveData || (liveData.code && liveData.code.toUpperCase() !== activeDept.toUpperCase())) {
      return defaultData;
    }
    return {
      name: liveData.name || defaultData.name,
      code: liveData.code || defaultData.code,
      icon: defaultData.icon,
      description: liveData.description || defaultData.description,
      metrics: liveData.metrics && liveData.metrics.length > 0 ? liveData.metrics : defaultData.metrics,
      records: liveData.records || defaultData.records,
    };
  }, [liveData, activeDept, defaultData]);

  const filteredRecords = useMemo(() => {
    const list = deptData.records || [];
    return list.filter((r) => {
      const matchStatus = statusFilter === "ALL" || r.status.toLowerCase() === statusFilter.toLowerCase();
      const matchSearch =
        !searchQuery ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.party.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [deptData.records, statusFilter, searchQuery]);

  return (
    <>
      {/* Department Selector / Filter Bar */}
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
                  onClick={() => {
                    setActiveDept(key);
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                >
                  {item.name.split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--nts-muted)" }}>
          Active Role: <strong>{profile.designationName || profile.designation || "Office Assistant"}</strong> ({profile.departmentName || profile.department || "Administration"})
        </div>
      </section>

      {/* Department Header Banner */}
      <section className="nts-dept-banner">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div className="nts-dept-icon-box">
            {React.createElement(deptData.icon || Building, { size: 24 })}
          </div>
          <div>
            <h2 className="nts-dept-title">{deptData.name}</h2>
            <p className="nts-dept-desc">{deptData.description}</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="nts-badge-pill active">
            <CheckCircle2 size={12} /> Live Active Register
          </span>
          <span className="nts-badge-pill subtle">
            Code: <strong>{deptData.code}</strong>
          </span>
        </div>
      </section>

      {/* Department Metrics Grid */}
      <section className="nts-dept-metrics">
        {deptData.metrics.map((m, idx) => (
          <div key={idx} className="nts-dept-metric-card">
            <div className="nts-dept-metric-val">{m.val}</div>
            <div className="nts-dept-metric-label">{m.label}</div>
            <div className="nts-dept-metric-sub">{m.sub}</div>
          </div>
        ))}
      </section>

      {/* Operational Register Table Card */}
      <section className="nts-card">
        <div className="nts-card-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3>
              <FileText size={16} style={{ color: "var(--nts-primary)" }} /> Daily Operational Register
            </h3>
            <span style={{ fontSize: 11.5, color: "var(--nts-muted)" }}>
              Official transaction log for {deptData.name} ({filteredRecords.length} records)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="nts-search-wrap" style={{ width: 220 }}>
              <Search size={14} className="nts-search-icon" />
              <input
                type="text"
                placeholder="Search log entries..."
                className="nts-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  height: 32,
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--nts-border)",
                  padding: "0 10px 0 28px",
                  background: "var(--nts-surface)",
                  color: "var(--nts-text)",
                  width: "100%",
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: 32,
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid var(--nts-border)",
                padding: "0 8px",
                background: "var(--nts-surface)",
                color: "var(--nts-text)",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="nts-table">
            <thead>
              <tr>
                <th>ENTRY ID</th>
                <th>ACTIVITY / ITEM DESCRIPTION</th>
                <th>PARTY / ASSIGNED PERSON</th>
                <th>LOGGED TIME</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "var(--nts-primary, #5c7c2f)" }}>{r.id}</td>
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
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px 16px", color: "var(--nts-muted)" }}>
                    No department operational logs match your search or filter.
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
