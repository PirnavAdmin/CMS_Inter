import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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

// Department module data matching Screenshots 11, 12, 13, 14
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
    records: [
      { id: "ADM-2026-108", title: "Visitor Gate Pass - Parent Inquiry for Intermediate MPC & BiPC Admissions", party: "Mr. K. V. Rao (Parent) / Officer Rajesh", time: "10:15 AM", status: "Completed" },
      { id: "ADM-2026-107", title: "Inward Speed Post - BIE Telangana Annual Affiliation Inspection Notice", party: "Principal's Secretarial Desk", time: "09:45 AM", status: "Completed" },
      { id: "ADM-2026-106", title: "Stationery Indent - Whiteboard Markers, A4 Reams & Examination Registers", party: "Dept. of Chemistry / Lab Store", time: "09:30 AM", status: "In Progress" },
      { id: "ADM-2026-105", title: "Student Transfer Certificate (TC) Application Verification & Clearance", party: "Student Affairs / Desk 2", time: "09:10 AM", status: "Completed" },
      { id: "ADM-2026-104", title: "Govt. Scholarship Notification & Merit List Dispatch to Social Welfare Dept", party: "Scholarship Cell / Officer K. Naidu", time: "08:45 AM", status: "Completed" },
      { id: "ADM-2026-103", title: "Staff Identity Card & Biometric RFID Punch Card Issuance", party: "HR Section / New Joiner Desk", time: "08:30 AM", status: "Completed" },
      { id: "ADM-2026-102", title: "College Examination Paper Printing & Confidential Store Deposit", party: "Chief Supdt. / Confidential Room", time: "08:00 AM", status: "Completed" },
    ],
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
    records: [
      { id: "TRN-2026-051", title: "Route #4 (Dilsukhnagar - LB Nagar - Campus) Morning Trip Completion", party: "Driver M. Krishna (Bus TS09-UB-4412)", time: "08:35 AM", status: "Completed" },
      { id: "TRN-2026-050", title: "Route #9 (Kukatpally - Miyapur) Driver Morning Attendance & Breathalyzer Check", party: "Driver S. Naidu / Transport Supv.", time: "07:10 AM", status: "Completed" },
      { id: "TRN-2026-049", title: "Diesel Fuel Refill Slip Verified - 65 Litres (Indian Oil Outlet)", party: "Bus #07 / Staff Driver R. Prasad", time: "09:05 AM", status: "Completed" },
      { id: "TRN-2026-048", title: "Scheduled 10,000 KM Brake Pad & Oil Filter Servicing", party: "Bus #12 / Sri Ram Motors Workshop", time: "10:00 AM", status: "In Progress" },
      { id: "TRN-2026-047", title: "Vehicle Pollution Under Control (PUC) & RTO Fitness Renewal", party: "Transport Desk / RTO Inspector", time: "09:45 AM", status: "Completed" },
      { id: "TRN-2026-046", title: "Student Route Pass Verification & Fleet GPS Tracking Health Check", party: "Central Control Room", time: "07:45 AM", status: "Completed" },
    ],
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
    records: [
      { id: "SEC-2026-214", title: "Main Gate Inward Entry - Commercial Vendor Delivery (Cafeteria Supplies)", party: "Head Guard Balraj (Gate 1)", time: "10:10 AM", status: "Completed" },
      { id: "SEC-2026-213", title: "Student ID & Uniform Protocol Inspection at Academic Block Turnstiles", party: "Security Officer Prakash", time: "08:55 AM", status: "Completed" },
      { id: "SEC-2026-212", title: "Campus Two-Wheeler Parking Lot Audit & Pass Verification", party: "Patrol Guard K. Chandran", time: "09:20 AM", status: "Completed" },
      { id: "SEC-2026-211", title: "CCTV Central Room Routine Perimeter & Exam Corridor Health Check", party: "Control Room Tech / Lead Guard", time: "07:30 AM", status: "Completed" },
      { id: "SEC-2026-210", title: "Night Shift Turnover Log & Gate Register Sign-off", party: "Shift Incharge B. Venkanna", time: "06:00 AM", status: "Completed" },
      { id: "SEC-2026-209", title: "Emergency Exit Door & Fire Hose Reel Inspection Check", party: "Safety Guard M. Srinivas", time: "08:15 AM", status: "Completed" },
    ],
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
    records: [
      { id: "MNT-2026-088", title: "Physics Lab #2 - Overhead LED Tube Replacement & MCB Switch Check", party: "Electrician J. Venkatesh", time: "09:30 AM", status: "Completed" },
      { id: "MNT-2026-087", title: "Auditorium Projector & PA System Calibration for Guest Seminar", party: "AV Tech S. Riaz / Facilities", time: "10:00 AM", status: "In Progress" },
      { id: "MNT-2026-086", title: "Block-B 2nd Floor Water Cooler Filter Flushing & TDS Quality Test", party: "Plumbing Team (K. Babu)", time: "08:40 AM", status: "Completed" },
      { id: "MNT-2026-085", title: "Classroom 204 Air Conditioner Servicing & Gas Pressure Top-up", party: "HVAC Tech / External Vendor", time: "10:30 AM", status: "In Progress" },
      { id: "MNT-2026-084", title: "Administrative Block DG Set Diesel Level & Battery Voltage Audit", party: "Power House Supv. / Mohan", time: "07:15 AM", status: "Completed" },
      { id: "MNT-2026-083", title: "Campus Garden Sprinkler Pipeline Valve Joint Leakage Repair", party: "Grounds & Estate Crew", time: "08:00 AM", status: "Completed" },
    ],
  },
};

export default function NonTeachingDepartment() {
  const profile = nonTeachingService.getProfile();
  const [searchParams, setSearchParams] = useSearchParams();

  const deptParam = (searchParams.get("dept") || searchParams.get("department") || "ADMINISTRATION").toUpperCase();
  const validDept = DEPARTMENT_MODULES[deptParam] ? deptParam : "ADMINISTRATION";
  const statusParam = (searchParams.get("status") || "ALL").toUpperCase();
  const searchParam = searchParams.get("search") || "";

  const [activeDept, setActiveDept] = useState(validDept);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [statusFilter, setStatusFilter] = useState(statusParam);
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    const d = (searchParams.get("dept") || searchParams.get("department") || "ADMINISTRATION").toUpperCase();
    if (DEPARTMENT_MODULES[d] && d !== activeDept) {
      setActiveDept(d);
    }
    const st = (searchParams.get("status") || "ALL").toUpperCase();
    if (st !== statusFilter) {
      setStatusFilter(st);
    }
    const q = searchParams.get("search") || "";
    if (q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const handleDeptChange = (key) => {
    setActiveDept(key);
    setSearchQuery("");
    setStatusFilter("ALL");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("dept", key);
      next.delete("search");
      next.delete("status");
      return next;
    });
  };

  const handleStatusFilterChange = (st) => {
    setStatusFilter(st);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (st && st !== "ALL") next.set("status", st);
      else next.delete("status");
      return next;
    });
  };

  const handleSearchChange = (q) => {
    setSearchQuery(q);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (q) next.set("search", q);
      else next.delete("search");
      return next;
    });
  };

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
      metrics: liveData.metrics || defaultData.metrics,
      records: liveData.records || defaultData.records,
    };
  }, [liveData, activeDept, defaultData]);
  const DeptIcon = deptData.icon;

  const filteredRecords = useMemo(() => {
    return deptData.records.filter((r) => {
      const matchStatus = statusFilter === "ALL" || r.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.party.toLowerCase().includes(q);
      return matchStatus && matchQuery;
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
                  onClick={() => handleDeptChange(key)}
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

      {/* Department Banner Card */}
      <section className="nts-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--nts-primary, #5c7c2f) 15%, var(--nts-surface))",
              color: "var(--nts-primary, #5c7c2f)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <DeptIcon size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--nts-text)" }}>
              {deptData.name}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--nts-muted)" }}>
              {deptData.description}
            </p>
          </div>
        </div>
      </section>

      {/* Department Metrics Grid (Screens 11, 12, 13, 14) */}
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
        <div
          className="nts-card-head"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={16} style={{ color: "var(--nts-primary, #5c7c2f)" }} />
            <h3 style={{ margin: 0 }}>Active Operational Register &amp; Daily Logs</h3>
            <span
              style={{
                fontSize: 11,
                background: "var(--nts-subtle)",
                padding: "2px 8px",
                borderRadius: 12,
                color: "var(--nts-muted)",
                fontWeight: 600,
              }}
            >
              {filteredRecords.length} records
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--nts-muted)",
                }}
              />
              <input
                type="text"
                placeholder={`Search ${deptData.name.split(" ")[0]} logs or person...`}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  paddingLeft: 30,
                  paddingRight: 10,
                  height: 32,
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--nts-border)",
                  minWidth: 220,
                  background: "var(--nts-surface)",
                  color: "var(--nts-text)",
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
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
