import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  BedDouble,
  PieChart,
  UserRound,
  Users,
  IndianRupee,
  ShieldCheck,
  Search,
  Check,
  X,
  Phone,
  DoorClosed,
  Layers,
  CircleCheck,
  TriangleAlert,
  Clock,
  ChevronRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import {
  useHostelStore,
  computeHostelMetrics,
  updateHostelOutpassStatus,
} from "./data/hostelData.js";
import "./styles/hostel.css";
import "./HostelModule.css";

export default function HostelDashboard() {
  const store = useHostelStore();
  const blocks = store.blocks || [];
  const allocations = store.allocations || [];
  const outpasses = store.outpasses || [];
  const metrics = computeHostelMetrics(store);

  const [selectedBlockName, setSelectedBlockName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toastMessage, setToastMessage] = useState("");
  const pageSize = 4;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const handleApproveOutpass = (id, name) => {
    updateHostelOutpassStatus(id, "Approved");
    showToast(`Outpass approved for ${name}`);
  };

  const handleRejectOutpass = (id, name) => {
    updateHostelOutpassStatus(id, "Rejected");
    showToast(`Outpass rejected for ${name}`);
  };

  // Search input handler
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setSelectedBlockName("");
    setCurrentPage(1);
  };

  // Dropdown select handler
  const handleBlockSelect = (e) => {
    setSelectedBlockName(e.target.value);
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Filtered blocks based on search and selected block
  const filteredBlocks = useMemo(() => {
    let result = blocks;
    if (selectedBlockName) {
      result = result.filter((b) => b.name === selectedBlockName);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.code?.toLowerCase().includes(q) ||
          b.warden?.toLowerCase().includes(q) ||
          b.type?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [blocks, selectedBlockName, searchQuery]);

  // Active block displayed in the top analytics strip
  const activeBlock = useMemo(() => {
    if (selectedBlockName) {
      const found = blocks.find((b) => b.name === selectedBlockName);
      if (found) return found;
    }
    if (filteredBlocks.length > 0) {
      return filteredBlocks[0];
    }
    return blocks[0] || null;
  }, [selectedBlockName, filteredBlocks, blocks]);

  // Paged blocks for table view
  const totalPages = Math.max(1, Math.ceil(filteredBlocks.length / pageSize));
  const pagedBlocks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredBlocks.slice(startIndex, startIndex + pageSize);
  }, [filteredBlocks, currentPage, pageSize]);

  return (
    <DashboardLayout
      title={null}
      subtitle={null}
      breadcrumb={["Hostel Management", "Dashboard"]}
    >
      <div className="hostel-dashboard-page">
        {/* Toast feedback banner */}
        {toastMessage && (
          <div className="hostel-toast-banner" role="status">
            <CircleCheck size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. TOP HEADER BAR — Compact like Reference Image 1 */}
        <header className="hostel-header-bar">
          <div className="hostel-greeting-wrap">
            <h1 className="hostel-greeting-title">
              <Building2 size={20} className="hostel-title-icon" /> Hostel Management Dashboard
            </h1>
            <p className="hostel-greeting-sub">
              Monitor bed occupancy, manage block capacities, and process student outpass permissions.
            </p>
          </div>
          <div className="hostel-header-controls">
            <div className="hostel-last-updated-badge">
              <Clock size={12} />
              <span>Live Status • <strong>All Blocks Operational</strong></span>
            </div>
          </div>
        </header>

        {/* Global Context Banner */}
        <div className="hostel-viewing-banner">
          <Info size={15} className="hostel-banner-icon" />
          <span>
            Hostel Facilities Overview • Tracking live occupancy for <strong>{metrics.totalHostels} Hostel Blocks</strong> with <strong>{metrics.totalCapacity} Total Beds</strong>.
          </span>
        </div>

        {/* 2. COMPACT 8-KPI GRID — Strict 4 Columns, Clean & Professional */}
        <section className="hostel-kpi-grid" aria-label="Hostel Key Metrics">
          {/* Card 1: TOTAL HOSTELS */}
          <article className="hostel-kpi tone-primary">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <Building2 size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Total Hostels</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">{metrics.totalHostels}</strong>
                  <span className="hostel-kpi-trend">Active</span>
                </div>
                <span className="hostel-kpi-subtext">Operational blocks</span>
              </div>
            </div>
          </article>

          {/* Card 2: TOTAL CAPACITY */}
          <article className="hostel-kpi tone-cyan">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <BedDouble size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Total Capacity</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">
                    {metrics.totalCapacity} <small>Beds</small>
                  </strong>
                  <span className="hostel-kpi-trend">Max Cap</span>
                </div>
                <span className="hostel-kpi-subtext">Registered capacity</span>
              </div>
            </div>
          </article>

          {/* Card 3: OCCUPANCY RATE */}
          <article className="hostel-kpi tone-violet">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <PieChart size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Occupancy Rate</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">{metrics.occupancyRate}%</strong>
                  <span className="hostel-kpi-trend">Optimal</span>
                </div>
                <span className="hostel-kpi-subtext">Live allocation</span>
              </div>
            </div>
          </article>

          {/* Card 4: OCCUPIED BEDS */}
          <article className="hostel-kpi tone-orange">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <UserRound size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Occupied Beds</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">{metrics.occupiedBeds}</strong>
                  <span className="hostel-kpi-trend">Assigned</span>
                </div>
                <span className="hostel-kpi-subtext">Allotted to students</span>
              </div>
            </div>
          </article>

          {/* Card 5: VACANT BEDS */}
          <article className="hostel-kpi tone-green">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <BedDouble size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Vacant Beds</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">{metrics.vacantBeds}</strong>
                  <span className="hostel-kpi-trend">Available</span>
                </div>
                <span className="hostel-kpi-subtext">Ready for allocation</span>
              </div>
            </div>
          </article>

          {/* Card 6: HOSTELLERS */}
          <article className="hostel-kpi tone-blue">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <Users size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Hostellers</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">{metrics.hostellers}</strong>
                  <span className="hostel-kpi-trend">Students</span>
                </div>
                <span className="hostel-kpi-subtext">Active residents</span>
              </div>
            </div>
          </article>

          {/* Card 7: MONTHLY REVENUE */}
          <article className="hostel-kpi tone-green">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <IndianRupee size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Monthly Revenue</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">₹{metrics.monthlyRevenue.toLocaleString()}</strong>
                  <span className="hostel-kpi-trend">Billed</span>
                </div>
                <span className="hostel-kpi-subtext">Hostel fees billing</span>
              </div>
            </div>
          </article>

          {/* Card 8: ACTIVE WARDENS */}
          <article className="hostel-kpi tone-red">
            <div className="hostel-kpi-top">
              <span className="hostel-kpi-icon">
                <ShieldCheck size={16} strokeWidth={2.2} />
              </span>
              <div className="hostel-kpi-title-wrap">
                <span className="hostel-kpi-label">Active Wardens</span>
                <div className="hostel-kpi-value-row">
                  <strong className="hostel-kpi-value">{metrics.activeWardens}</strong>
                  <span className="hostel-kpi-trend">Supervising</span>
                </div>
                <span className="hostel-kpi-subtext">Staff on duty</span>
              </div>
            </div>
          </article>
        </section>

        {/* Quick Actions Row — Matching Reference Image 1 */}
        <nav className="hostel-quick-actions" aria-label="Quick Actions">
          <h2>Quick Actions</h2>
          <div className="hostel-quick-actions-list">
            <Link to="/hostel/master-setup" className="hostel-quick-action tone-primary">
              <span className="hostel-quick-action-icon"><Building2 size={13} /></span>
              <span>Setup Blocks</span>
            </Link>
            <Link to="/hostel/students" className="hostel-quick-action tone-blue">
              <span className="hostel-quick-action-icon"><Users size={13} /></span>
              <span>Hostel Students</span>
            </Link>
            <Link to="/hostel/student-allocation" className="hostel-quick-action tone-green">
              <span className="hostel-quick-action-icon"><BedDouble size={13} /></span>
              <span>Bed Allocation</span>
            </Link>
            <Link to="/hostel/attendance" className="hostel-quick-action tone-orange">
              <span className="hostel-quick-action-icon"><CheckCircle2 size={13} /></span>
              <span>Mark Attendance</span>
            </Link>
            <Link to="/hostel/reports" className="hostel-quick-action tone-violet">
              <span className="hostel-quick-action-icon"><PieChart size={13} /></span>
              <span>Hostel Reports</span>
            </Link>
          </div>
        </nav>

        {/* 3. OVERALL HOSTEL BED OCCUPANCY — Compact & Aligned */}
        <article className="hostel-card" aria-label="Bed Occupancy">
          <header className="hostel-card-head">
            <h2>
              <Clock size={14} className="hostel-title-icon" />
              OVERALL HOSTEL BED OCCUPANCY
            </h2>
            <span className="hostel-card-sub-metric">
              {metrics.occupiedBeds} Occupied / {metrics.vacantBeds} Vacant ({metrics.totalCapacity} Total Capacity)
            </span>
          </header>
          <div className="hostel-card-body">
            <div className="hostel-progress-track">
              <div
                className="hostel-progress-fill-occupied"
                style={{ width: `${Math.max(metrics.occupancyRate, metrics.occupiedBeds > 0 ? 3 : 0)}%` }}
              />
              <div
                className="hostel-progress-fill-vacant"
                style={{ width: `${100 - Math.max(metrics.occupancyRate, metrics.occupiedBeds > 0 ? 3 : 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--cms-muted)" }}>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: "var(--cms-primary)" }}
                  />
                  <span>Occupied Beds ({metrics.occupancyRate}%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: "#22a447" }}
                  />
                  <span>Vacant Beds ({100 - metrics.occupancyRate}%)</span>
                </span>
              </div>
              <span className="font-semibold">Live Status</span>
            </div>
          </div>
        </article>

        {/* 4. HOSTEL BLOCK OVERVIEW — Top Analytics Strip & Data in Table Format */}
        <article className="hostel-card" aria-label="Block Overview">
          <header className="hostel-card-head">
            <h2>
              <Building2 size={14} className="hostel-title-icon" />
              Hostel Block Overview &amp; Analytics
            </h2>
            <div className="hostel-card-head-actions">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search block, code, warden..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="hostel-input"
                  style={{ width: "190px", paddingLeft: "22px" }}
                />
                <Search
                  size={12}
                  className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--cms-muted)" }}
                />
              </div>
              <select
                value={selectedBlockName}
                onChange={handleBlockSelect}
                className="hostel-select"
                style={{ width: "170px" }}
              >
                <option value="">All Hostel Blocks ({blocks.length})</option>
                {blocks.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </header>

          <div className="hostel-card-body">
            {/* Top Analytics Strip for Block Overview */}
            {activeBlock ? (
              <div className="hostel-block-analytics-strip">
                <div className="hostel-block-analytics-info">
                  <strong>
                    {activeBlock.name} ({activeBlock.code}) • <span style={{ color: "var(--cms-primary)" }}>{activeBlock.type}</span>
                  </strong>
                  <span>{activeBlock.description}</span>
                </div>
                <div className="hostel-block-analytics-chips">
                  <span className="hostel-block-chip">
                    Floors: <strong>{activeBlock.floors}</strong>
                  </span>
                  <span className="hostel-block-chip">
                    Rooms: <strong>{activeBlock.totalRooms}</strong>
                  </span>
                  <span className="hostel-block-chip">
                    Occupied: <strong style={{ color: "#d97706" }}>{activeBlock.occupiedBeds}</strong>
                  </span>
                  <span className="hostel-block-chip">
                    Vacant: <strong style={{ color: "#15803d" }}>{activeBlock.vacantBeds}</strong>
                  </span>
                  <span className="hostel-block-chip">
                    Warden: <strong>{activeBlock.warden}</strong> ({activeBlock.wardenPhone})
                  </span>
                  <span className="cms-badge cms-badge-active">
                    Active Status
                  </span>
                </div>
              </div>
            ) : null}

            {/* Block Data in Table Format */}
            <div className="hostel-block-table-wrap">
              <table className="hostel-block-table">
                <thead>
                  <tr>
                    <th>Block Name &amp; Code</th>
                    <th>Type</th>
                    <th>Floors</th>
                    <th>Rooms</th>
                    <th>Total Beds</th>
                    <th>Occupied</th>
                    <th>Vacant</th>
                    <th>Warden &amp; Contact</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlocks.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "16px", color: "var(--cms-muted)" }}>
                        No hostel blocks match your search query.
                      </td>
                    </tr>
                  ) : (
                    pagedBlocks.map((b) => {
                      const isSelected = activeBlock && activeBlock.id === b.id;
                      return (
                        <tr
                          key={b.id || b.name}
                          className={isSelected ? "is-selected-row" : ""}
                          onClick={() => {
                            setSelectedBlockName(b.name);
                          }}
                          title="Click row to view block analytics on top"
                        >
                          <td>
                            <div className="flex items-center gap-1.5">
                              <span className={`hostel-table-dot ${isSelected ? "is-active" : ""}`} />
                              <strong style={{ color: "var(--cms-text)" }}>{b.name}</strong>
                              <small style={{ color: "var(--cms-muted)" }}>({b.code})</small>
                            </div>
                          </td>
                          <td>
                            <span className={`cms-badge no-dot ${b.type === "Boys" ? "tone-blue" : "tone-violet"}`}>
                              {b.type}
                            </span>
                          </td>
                          <td>{b.floors}</td>
                          <td>{b.totalRooms}</td>
                          <td>{b.totalBeds || (b.occupiedBeds + b.vacantBeds)}</td>
                          <td style={{ color: "#d97706", fontWeight: 700 }}>{b.occupiedBeds}</td>
                          <td style={{ color: "#15803d", fontWeight: 700 }}>{b.vacantBeds}</td>
                          <td>
                            <div className="flex flex-col text-xs leading-tight">
                              <span className="font-semibold">{b.warden}</span>
                              <span style={{ color: "var(--cms-muted)", fontSize: "10px" }}>{b.wardenPhone}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="cms-badge cms-badge-active">{b.status || "Active"}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              className="flex items-center justify-between pt-2 mt-2 border-t"
              style={{ borderColor: "var(--cms-border)" }}
            >
              <span className="text-[11px]" style={{ color: "var(--cms-muted)" }}>
                Showing {filteredBlocks.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
                {Math.min(currentPage * pageSize, filteredBlocks.length)} of {filteredBlocks.length} records
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="hostel-pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  title="First Page"
                >
                  «
                </button>
                <button
                  type="button"
                  className="hostel-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Previous Page"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const page = idx + 1;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`hostel-pagination-btn ${currentPage === page ? "is-active" : ""}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="hostel-pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  title="Next Page"
                >
                  ›
                </button>
                <button
                  type="button"
                  className="hostel-pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  title="Last Page"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* 5. BOTTOM TWO-COLUMN GRID — Vertical Layout matching Reference Image 2 */}
        <section className="hostel-bottom-grid" aria-label="Recent Activities">
          {/* RECENT BED ALLOCATIONS — Vertical List like Certificate Requests & Exams */}
          <article className="hostel-card">
            <header className="hostel-card-head">
              <h2>
                <CheckCircle2 size={14} className="text-emerald-600" />
                RECENT BED ALLOCATIONS
              </h2>
              <Link to="/hostel/students" className="hostel-view-link">
                View All <ChevronRight size={12} />
              </Link>
            </header>
            <div className="hostel-card-body" style={{ padding: "8px 10px" }}>
              <div
                className="hostel-info-list"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                {allocations.slice(0, 4).map((alloc) => (
                  <div
                    key={alloc.id}
                    className="hostel-info-item"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    <span className="hostel-list-icon tone-green">
                      <BedDouble size={14} />
                    </span>
                    <div className="hostel-info-content">
                      <strong>{alloc.name || alloc.studentName}</strong>
                      <small>
                        {alloc.admissionNo || alloc.admNo || alloc.id} • {alloc.block || alloc.blockName} • {alloc.roomBed || alloc.roomBadge || (alloc.room ? `Room #${alloc.room} (${alloc.bed || 'BED-1'})` : 'BED-1')}
                      </small>
                    </div>
                    <span className="hostel-days-badge" title={`Joined: ${alloc.joinDate}`}>
                      {alloc.joinDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* ACTIVE OUTPASS & LEAVE REQUESTS — Vertical List like Examinations */}
          <article className="hostel-card">
            <header className="hostel-card-head">
              <h2>
                <TriangleAlert size={14} className="text-amber-500" />
                ACTIVE OUTPASS &amp; LEAVE REQUESTS
              </h2>
              <Link to="/hostel/reports" className="hostel-view-link">
                View All <ChevronRight size={12} />
              </Link>
            </header>
            <div className="hostel-card-body" style={{ padding: "8px 10px" }}>
              <div
                className="hostel-info-list"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                {outpasses.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="hostel-info-item"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      width: "100%",
                      minWidth: 0,
                      boxSizing: "border-box",
                    }}
                  >
                    <span className="hostel-list-icon tone-orange">
                      <Clock size={14} />
                    </span>
                    <div className="hostel-info-content">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong>{req.studentName}</strong>
                        <span
                          className={`dashboard-status-badge ${
                            req.status === "Approved"
                              ? "badge-approved"
                              : req.status === "Rejected"
                              ? "badge-rejected"
                              : "badge-pending"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <small>
                        {req.requestType} • {req.roomNo}
                      </small>
                    </div>
                    <div className="hostel-outpass-right">
                      <div className="hostel-mini-actions">
                        <button
                          type="button"
                          onClick={() => handleApproveOutpass(req.id, req.studentName)}
                          disabled={req.status === "Approved"}
                          className="cms-btn cms-btn-primary hostel-mini-btn"
                          title="Approve Outpass"
                        >
                          <Check size={11} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectOutpass(req.id, req.studentName)}
                          disabled={req.status === "Rejected"}
                          className="cms-btn cms-btn-ghost danger hostel-mini-btn"
                          title="Reject Outpass"
                        >
                          <X size={11} /> Reject
                        </button>
                      </div>
                      <span className="hostel-days-badge" title={`Return: ${req.returnDate}`}>
                        {req.returnDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      </div>
    </DashboardLayout>
  );
}
