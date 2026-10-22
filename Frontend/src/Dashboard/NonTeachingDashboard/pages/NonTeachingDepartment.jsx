import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Building,
  Truck,
  ShieldCheck,
  Wrench,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import { nonTeachingService } from "../services/nonTeachingService.js";
import { getAuthUser } from "@/features/authStorage.js";

// ==========================================================================
// 1. Department Configurations & Mock Operational Data
// ==========================================================================

export const ADMINISTRATION_CONFIG = {
  code: "ADMINISTRATION",
  name: "Administration & Office Support",
  shortName: "Administration",
  description: "Department operational workflows, daily logs, register management, and resource coordination.",
  icon: Building,
  idPrefix: "ADM",
  metrics: [
    { label: "Today's Visitors", val: "24", sub: "Gate passes verified", tone: "green" },
    { label: "Inward Couriers", val: "12", sub: "Delivered & pending", tone: "blue" },
    { label: "Stationery Requests", val: "8", sub: "Approved requests", tone: "purple" },
    { label: "Files Dispatched", val: "16", sub: "Outward dispatches", tone: "cyan" },
  ],
  initialRecords: [
    {
      id: "ADM-2026-108",
      title: "Visitor Gate Pass - Parent Inquiry for Intermediate MPC & BiPC Admissions",
      party: "Mr. K. V. Rao (Parent) / Officer Rajesh",
      time: "10:15 AM",
      status: "Completed",
    },
    {
      id: "ADM-2026-107",
      title: "Inward Speed Post - BIE Telangana Annual Affiliation Inspection Notice",
      party: "Principal's Secretarial Desk",
      time: "09:45 AM",
      status: "Completed",
    },
    {
      id: "ADM-2026-106",
      title: "Stationery Indent - Whiteboard Markers, A4 Reams & Examination Registers",
      party: "Dept. of Chemistry / Lab Store",
      time: "09:30 AM",
      status: "In Progress",
    },
    {
      id: "ADM-2026-105",
      title: "Outward Dispatch - Migration Certificates batch sent via BlueDart",
      party: "Student Records Cell (Staff S. Anitha)",
      time: "08:50 AM",
      status: "Completed",
    },
    {
      id: "ADM-2026-104",
      title: "Meeting Room Booking - Academic Council & Principal Coordination Hall",
      party: "Vice Principal / Admin Secretary",
      time: "08:15 AM",
      status: "Completed",
    },
    {
      id: "ADM-2026-103",
      title: "Inward Courier - Practical Answer Booklets consignment from Regional Center",
      party: "Chief Exam Superintendent Room",
      time: "Yesterday",
      status: "Pending",
    },
    {
      id: "ADM-2026-102",
      title: "Student Bonafide & Transfer Certificate (TC) Attestation Register",
      party: "Office Assistant / Clerical Desk",
      time: "Yesterday",
      status: "Completed",
    },
  ],
};

export const TRANSPORT_CONFIG = {
  code: "TRANSPORT",
  name: "Transport & Fleet Management",
  shortName: "Transport",
  description: "Bus routes, vehicle fleet status, driver duty schedules, and maintenance tracking.",
  icon: Truck,
  idPrefix: "TRN",
  metrics: [
    { label: "Active Buses", val: "18", sub: "Operational fleet", tone: "green" },
    { label: "Morning Trips", val: "18 / 18", sub: "Trips completed", tone: "blue" },
    { label: "Fuel Slips Verified", val: "14", sub: "Fuel vouchers", tone: "purple" },
    { label: "Maintenance Due", val: "2", sub: "Vehicles in service", tone: "cyan" },
  ],
  initialRecords: [
    {
      id: "TRN-2026-051",
      title: "Route #4 (Dilsukhnagar - LB Nagar - Campus) Morning Trip Completion",
      party: "Driver M. Krishna (Bus TS09-UB-4412)",
      time: "08:35 AM",
      status: "Completed",
    },
    {
      id: "TRN-2026-050",
      title: "Route #9 (Kukatpally - Miyapur) Driver Morning Attendance & Breathalyzer Check",
      party: "Driver S. Naidu / Transport Supv.",
      time: "07:10 AM",
      status: "Completed",
    },
    {
      id: "TRN-2026-049",
      title: "Diesel Fuel Refill Slip Verified - 65 Litres (Indian Oil Outlet)",
      party: "Bus #07 / Staff Driver R. Prasad",
      time: "09:05 AM",
      status: "Completed",
    },
    {
      id: "TRN-2026-048",
      title: "Scheduled 10,000 KM Brake Pad & Oil Filter Servicing",
      party: "Bus #12 / Sri Ram Motors Workshop",
      time: "10:00 AM",
      status: "In Progress",
    },
    {
      id: "TRN-2026-047",
      title: "Route #15 Student Boarding Count Verification & Route Compliance",
      party: "Transport Coordinator N. Srinivas",
      time: "08:45 AM",
      status: "Completed",
    },
    {
      id: "TRN-2026-046",
      title: "Fitness Certificate (FC) Renewal Filing with RTA Regional Office",
      party: "Transport Desk / Legal Liaison",
      time: "Yesterday",
      status: "Pending",
    },
  ],
};

export const SECURITY_CONFIG = {
  code: "SECURITY",
  name: "Security & Campus Vigilance",
  shortName: "Security",
  description: "Main gate monitoring, visitor access logs, parking regulation, and surveillance feeds.",
  icon: ShieldCheck,
  idPrefix: "SEC",
  metrics: [
    { label: "Guards on Duty", val: "14", sub: "Active shift", tone: "green" },
    { label: "Vehicles Checked", val: "156", sub: "Entry gate logs", tone: "blue" },
    { label: "Incident Reports", val: "0", sub: "Campus security", tone: "purple" },
    { label: "CCTV Cameras Live", val: "48 / 48", sub: "Control room feeds", tone: "cyan" },
  ],
  initialRecords: [
    {
      id: "SEC-2026-214",
      title: "Main Gate Inward Entry - Commercial Vendor Delivery (Cafeteria Supplies)",
      party: "Head Guard Balraj (Gate 1)",
      time: "10:10 AM",
      status: "Completed",
    },
    {
      id: "SEC-2026-213",
      title: "Student ID & Uniform Protocol Inspection at Academic Block Turnstiles",
      party: "Security Officer Prakash",
      time: "08:55 AM",
      status: "Completed",
    },
    {
      id: "SEC-2026-212",
      title: "Campus Two-Wheeler Parking Lot Audit & Pass Verification",
      party: "Patrol Guard K. Chandran",
      time: "09:20 AM",
      status: "Completed",
    },
    {
      id: "SEC-2026-211",
      title: "CCTV Central Room Routine Perimeter & Exam Corridor Health Check",
      party: "Control Room Tech / Lead Guard",
      time: "07:30 AM",
      status: "Completed",
    },
    {
      id: "SEC-2026-210",
      title: "Visitor Badge Return & Exit Verification - Guest Lecturer",
      party: "Reception Security Desk",
      time: "10:45 AM",
      status: "In Progress",
    },
    {
      id: "SEC-2026-209",
      title: "Night Shift Reliever Handover Log & Campus Seal Inspection",
      party: "Night Shift Incharge (R. Gowd)",
      time: "06:00 AM",
      status: "Completed",
    },
  ],
};

export const MAINTENANCE_CONFIG = {
  code: "MAINTENANCE",
  name: "Maintenance & Facilities",
  shortName: "Maintenance",
  description: "Electrical systems, plumbing, classroom audio-visual support, and campus infrastructure.",
  icon: Wrench,
  idPrefix: "MNT",
  metrics: [
    { label: "Open Work Orders", val: "3", sub: "Active work orders", tone: "green" },
    { label: "Resolved Today", val: "7", sub: "Maintenance resolved", tone: "blue" },
    { label: "Generator Fuel", val: "88%", sub: "Backup fuel", tone: "purple" },
    { label: "Water Level", val: "94%", sub: "Storage status", tone: "cyan" },
  ],
  initialRecords: [
    {
      id: "MNT-2026-088",
      title: "Physics Lab #2 - Overhead LED Tube Replacement & MCB Switch Check",
      party: "Electrician J. Venkatesh",
      time: "09:30 AM",
      status: "Completed",
    },
    {
      id: "MNT-2026-087",
      title: "Auditorium Projector & PA System Calibration for Guest Seminar",
      party: "AV Tech S. Riaz / Facilities",
      time: "10:00 AM",
      status: "In Progress",
    },
    {
      id: "MNT-2026-086",
      title: "Block-B 2nd Floor Water Cooler Filter Flushing & TDS Quality Test",
      party: "Plumbing Team (K. Babu)",
      time: "08:40 AM",
      status: "Completed",
    },
    {
      id: "MNT-2026-085",
      title: "Classroom 204 Air Conditioner Servicing & Gas Pressure Top-up",
      party: "HVAC Tech / External Vendor",
      time: "10:30 AM",
      status: "In Progress",
    },
    {
      id: "MNT-2026-084",
      title: "Diesel Generator 125 KVA Routine Battery Test & Auto-Start Trial",
      party: "Lead Maintenance Supervisor",
      time: "07:45 AM",
      status: "Completed",
    },
    {
      id: "MNT-2026-083",
      title: "Girls Hostel Common Room Door Lock Replacement",
      party: "Carpenter G. Mahesh",
      time: "Yesterday",
      status: "Completed",
    },
  ],
};

const DEPARTMENT_TABS = [
  { key: "Administration", label: "Administration", config: ADMINISTRATION_CONFIG },
  { key: "Transport", label: "Transport", config: TRANSPORT_CONFIG },
  { key: "Security", label: "Security", config: SECURITY_CONFIG },
  { key: "Maintenance", label: "Maintenance", config: MAINTENANCE_CONFIG },
];

function getDepartmentStorageKey(deptCode) {
  return `cms_nonteaching_dept_logs_${deptCode}_v1`;
}

function loadDepartmentRecords(deptCode, fallbackRecords) {
  try {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(getDepartmentStorageKey(deptCode));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn(`Could not load records for ${deptCode}`, e);
  }
  return fallbackRecords || [];
}

function saveDepartmentRecords(deptCode, records) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getDepartmentStorageKey(deptCode), JSON.stringify(records));
    }
  } catch (e) {
    console.warn(`Could not save records for ${deptCode}`, e);
  }
}

// Normalizer to detect department string
function normalizeDepartmentName(dept) {
  if (!dept || typeof dept !== "string") return "Administration";
  const clean = dept.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
  if (clean.includes("transp") || clean.includes("fleet") || clean.includes("bus")) return "Transport";
  if (clean.includes("secur") || clean.includes("guard") || clean.includes("vigil")) return "Security";
  if (clean.includes("maint") || clean.includes("facilit") || clean.includes("repair")) return "Maintenance";
  return "Administration";
}

// ==========================================================================
// 2. Department Module View Component
// ==========================================================================

export function DepartmentModuleView({ deptConfig, profile }) {
  const DeptIcon = deptConfig.icon;
  const deptCode = deptConfig.code;

  const [records] = useState(() => loadDepartmentRecords(deptCode, deptConfig.initialRecords));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.party.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "ALL" ||
        r.status.toLowerCase().replace(/\s+/g, "") === statusFilter.toLowerCase().replace(/\s+/g, "");

      return matchSearch && matchStatus;
    });
  }, [records, searchTerm, statusFilter]);

  return (
    <>
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
              flexShrink: 0,
            }}
          >
            <DeptIcon size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--nts-text)" }}>
              {deptConfig.name}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--nts-muted)" }}>
              {deptConfig.description}
            </p>
          </div>
        </div>
      </section>

      {/* Department-Specific Metrics Grid */}
      <section className="nts-kpi-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {deptConfig.metrics.map((m) => {
          return (
            <div key={m.label} className={`nts-kpi nts-kpi-${m.tone}`}>
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

      {/* Active Operational Register & Daily Logs Table */}
      <section className="nts-card">
        <div className="nts-card-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={16} style={{ color: "var(--nts-primary)" }} />
            <h3 style={{ margin: 0 }}>Active Operational Register & Daily Logs</h3>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--nts-subtle)",
                color: "var(--nts-muted)",
              }}
            >
              {filteredRecords.length} records
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="nts-search-box" style={{ minWidth: 220, padding: "4px 10px" }}>
              <Search size={14} style={{ color: "var(--nts-muted)" }} />
              <input
                type="text"
                placeholder={`Search ${deptConfig.shortName} logs or personnel...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
                  aria-label="Clear search"
                >
                  <X size={13} style={{ color: "var(--nts-muted)" }} />
                </button>
              )}
            </div>

            <select
              className="nts-form-control"
              style={{ fontSize: 12, padding: "4px 8px", height: 32 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
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
              {filteredRecords.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "var(--nts-primary)" }}>{r.id}</td>
                  <td>
                    <strong>{r.title}</strong>
                  </td>
                  <td>{r.party}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.time}</td>
                  <td>
                    <span className={`nts-status-badge ${r.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {r.status === "Completed" && <CheckCircle2 size={12} />}
                      {r.status === "In Progress" && <Clock size={12} />}
                      {r.status === "Pending" && <AlertCircle size={12} />}
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "36px 16px", color: "var(--nts-muted)" }}>
                    <FileText size={28} style={{ margin: "0 auto 8px", opacity: 0.3, display: "block" }} />
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

// ==========================================================================
// 3. Dedicated Department Module Components
// ==========================================================================

export function AdministrationModule({ profile }) {
  return <DepartmentModuleView deptConfig={ADMINISTRATION_CONFIG} profile={profile} />;
}

export function TransportModule({ profile }) {
  return <DepartmentModuleView deptConfig={TRANSPORT_CONFIG} profile={profile} />;
}

export function SecurityModule({ profile }) {
  return <DepartmentModuleView deptConfig={SECURITY_CONFIG} profile={profile} />;
}

export function MaintenanceModule({ profile }) {
  return <DepartmentModuleView deptConfig={MAINTENANCE_CONFIG} profile={profile} />;
}

// ==========================================================================
// 4. Root Tab-Based Department Portal Component
// ==========================================================================

export default function NonTeachingDepartment() {
  const [searchParams] = useSearchParams();
  const params = useParams();

  const profile = useMemo(() => nonTeachingService.getProfile(), []);
  const authUser = useMemo(() => getAuthUser() || {}, []);

  // Determine starting department tab from user's assigned department or URL param
  const initialDepartment = useMemo(() => {
    const urlDept = params.dept || searchParams.get("dept") || searchParams.get("module");
    if (urlDept) {
      return normalizeDepartmentName(urlDept);
    }
    const staffDept = profile.departmentName || profile.department || authUser.departmentName || authUser.department;
    return normalizeDepartmentName(staffDept);
  }, [params.dept, searchParams, profile, authUser]);

  // Tab State: tracks the currently selected department tab
  const [activeDepartment, setActiveDepartment] = useState(initialDepartment);

  // Sync if URL route or query param changes
  useEffect(() => {
    const urlDept = params.dept || searchParams.get("dept") || searchParams.get("module");
    if (urlDept) {
      setActiveDepartment(normalizeDepartmentName(urlDept));
    }
  }, [params.dept, searchParams]);

  return (
    <>
      {/* Department Tab Switcher Bar */}
      <section className="nts-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--nts-muted)", letterSpacing: "0.5px" }}>
            DEPARTMENT MODULE:
          </span>
          <div className="nts-tabs-strip">
            {DEPARTMENT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`nts-tab-btn ${activeDepartment === tab.key ? "active" : ""}`}
                onClick={() => setActiveDepartment(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--nts-muted)" }}>
          Active Role: <strong>{profile.designationName || profile.designation || "Staff"}</strong> ({profile.departmentName || profile.department || "General"})
        </div>
      </section>

      {/* Conditionally Render ONLY the Selected Department's Content */}
      {activeDepartment === "Administration" && (
        <AdministrationModule profile={profile} />
      )}

      {activeDepartment === "Transport" && (
        <TransportModule profile={profile} />
      )}

      {activeDepartment === "Security" && (
        <SecurityModule profile={profile} />
      )}

      {activeDepartment === "Maintenance" && (
        <MaintenanceModule profile={profile} />
      )}
    </>
  );
}
