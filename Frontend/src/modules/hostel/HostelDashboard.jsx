import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Home,
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
  ChevronDown,
  Clock,
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

  // Filtered block for overview
  const activeBlock = useMemo(() => {
    if (selectedBlockName) {
      return blocks.find((b) => b.name === selectedBlockName) || null;
    }
    if (searchQuery.trim()) {
      return (
        blocks.find(
          (b) =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase())
        ) || null
      );
    }
    return null;
  }, [selectedBlockName, searchQuery, blocks]);

  return (
    <DashboardLayout
      title={null}
      subtitle={null}
      breadcrumb={["Hostel Management", "Dashboard"]}
    >
      <div
        className="hostel-dashboard-page min-h-screen bg-[#f2f6ed] p-6 text-[#1f2913]"
        style={{ backgroundColor: "#f2f6ed", minHeight: "100vh" }}
      >
        {/* Toast feedback banner */}
        {toastMessage && (
          <div
            className="mb-4 p-3.5 rounded-xl border border-[#e2ebd8] bg-[#f0f4e8] text-[#476323] text-sm font-semibold flex items-center gap-2 shadow-sm animate-in fade-in"
            role="status"
          >
            <CircleCheck size={18} className="text-[#5b7a2b]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. TOP HEADER - NO EXTRA BUTTONS, NO DATE, NO TABS */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl border border-[#e2ebd8] bg-white flex items-center justify-center text-[#5b7a2b] shadow-xs flex-shrink-0"
            style={{ width: "40px", height: "40px" }}
          >
            <Home size={22} className="text-[#5b7a2b]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1f2913] tracking-tight m-0">Hostel Dashboard</h1>
          </div>
        </div>

        {/* 2. STRICT 4-COLUMN GRID (4 CARDS SIDE-BY-SIDE IN 2 ROWS) */}
        <div
          className="grid grid-cols-4 gap-4 mb-5"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "16px",
          }}
        >
          {/* Card 1: TOTAL HOSTELS */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">TOTAL HOSTELS</span>
              <div className="w-8 h-8 rounded-lg bg-[#f0f4e8] text-[#4d6b2c] flex items-center justify-center flex-shrink-0">
                <Building2 size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">{metrics.totalHostels}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                ↗ Active
              </span>
            </div>
          </div>

          {/* Card 2: TOTAL CAPACITY */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">TOTAL CAPACITY</span>
              <div className="w-8 h-8 rounded-lg bg-[#f0f4e8] text-[#4d6b2c] flex items-center justify-center flex-shrink-0">
                <BedDouble size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">
                {metrics.totalCapacity} <span className="text-sm font-semibold text-[#5b7a2b]">Beds</span>
              </span>
              <span className="inline-flex items-center text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                Max Cap
              </span>
            </div>
          </div>

          {/* Card 3: OCCUPANCY RATE */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">OCCUPANCY RATE</span>
              <div className="w-8 h-8 rounded-lg bg-[#f0f4e8] text-[#4d6b2c] flex items-center justify-center flex-shrink-0">
                <PieChart size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">{metrics.occupancyRate}%</span>
              <span className="inline-flex items-center text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                Optimal
              </span>
            </div>
          </div>

          {/* Card 4: OCCUPIED BEDS */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">OCCUPIED BEDS</span>
              <div className="w-8 h-8 rounded-lg bg-[#fef3c7] text-[#d97706] flex items-center justify-center flex-shrink-0">
                <UserRound size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">{metrics.occupiedBeds}</span>
              <span className="inline-flex items-center text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                Assigned
              </span>
            </div>
          </div>

          {/* Card 5: VACANT BEDS */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">VACANT BEDS</span>
              <div className="w-8 h-8 rounded-lg bg-[#dcfce7] text-[#16a34a] flex items-center justify-center flex-shrink-0">
                <BedDouble size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">{metrics.vacantBeds}</span>
              <span className="inline-flex items-center text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                Available
              </span>
            </div>
          </div>

          {/* Card 6: HOSTELLERS */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">HOSTELLERS</span>
              <div className="w-8 h-8 rounded-lg bg-[#f0f4e8] text-[#4d6b2c] flex items-center justify-center flex-shrink-0">
                <Users size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">{metrics.hostellers}</span>
              <span className="inline-flex items-center text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                Students
              </span>
            </div>
          </div>

          {/* Card 7: MONTHLY REVENUE */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">MONTHLY REVENUE</span>
              <div className="w-8 h-8 rounded-lg bg-[#dcfce7] text-[#16a34a] flex items-center justify-center flex-shrink-0">
                <IndianRupee size={18} strokeWidth={2.2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">₹{metrics.monthlyRevenue.toLocaleString()}</span>
              <span className="inline-flex items-center text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                Billed
              </span>
            </div>
          </div>

          {/* Card 8: ACTIVE WARDENS */}
          <div className="p-4 bg-white rounded-xl border border-[#e2ebd8] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">ACTIVE WARDENS</span>
              <div className="w-8 h-8 rounded-lg bg-[#fee2e2] text-[#dc2626] flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={18} strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-neutral-900">{metrics.activeWardens}</span>
              <span className="inline-flex items-center text-xs font-semibold bg-[#e9f2dd] text-[#476323] px-2 py-0.5 rounded-md">
                Supervising
              </span>
            </div>
          </div>
        </div>

        {/* 3. OVERALL HOSTEL BED OCCUPANCY COMPONENT */}
        <section className="bg-white border border-[#e2ebd8] rounded-2xl shadow-xs p-5 mb-5" aria-label="Bed Occupancy">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold tracking-wide uppercase text-[#1f2913] flex items-center gap-2">
              <Clock size={16} className="text-[#476323]" />
              <span>OVERALL HOSTEL BED OCCUPANCY</span>
            </div>
            <span className="text-xs md:text-sm font-semibold text-[#5b7a2b]">
              {metrics.occupiedBeds} Occupied / {metrics.vacantBeds} Vacant ({metrics.totalCapacity} Total Capacity)
            </span>
          </div>

          {/* Middle Row (Horizontal Visible Progress Bar) */}
          <div className="w-full h-3 rounded-full overflow-hidden flex my-3 bg-[#c8e6a6]">
            <div
              className="h-full bg-gradient-to-r from-[#5b7a2b] to-[#739938] rounded-l-full"
              style={{ width: `${Math.max(metrics.occupancyRate, metrics.occupiedBeds > 0 ? 3 : 0)}%` }}
            />
            <div
              className="h-full bg-[#c8e6a6]"
              style={{ width: `${100 - Math.max(metrics.occupancyRate, metrics.occupiedBeds > 0 ? 3 : 0)}%` }}
            />
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <div className="flex items-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#5b7a2b] mr-1.5" />
              <span>Occupied Beds ({metrics.occupancyRate}%)</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#5b7a2b] mr-1.5 ml-4" />
              <span>Vacant Beds ({100 - metrics.occupancyRate}%)</span>
            </div>
            <span>Live Status</span>
          </div>
        </section>

        {/* 4. HOSTEL BLOCK OVERVIEW COMPONENT */}
        <section className="bg-white border border-[#e2ebd8] rounded-2xl shadow-xs p-5 mb-5" aria-label="Block Overview">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-base font-bold text-[#1f2913] flex items-center gap-2">
              <Building2 size={20} className="text-[#5b7a2b]" />
              <span>Hostel Block Overview</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search block name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-60 text-xs px-3 rounded-xl border border-[#e2ebd8] bg-white placeholder-slate-400 focus:outline-none focus:border-[#5b7a2b] text-[#1f2913]"
              />
              <select
                value={selectedBlockName}
                onChange={(e) => setSelectedBlockName(e.target.value)}
                className="h-9 w-48 text-xs px-3 rounded-xl border border-[#e2ebd8] bg-white text-[#1f2913] focus:outline-none focus:border-[#5b7a2b] cursor-pointer"
              >
                <option value="">Select Hostel Block...</option>
                {blocks.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center Placeholder Box */}
          {!activeBlock ? (
            <div className="border border-[#e2ebd8] rounded-2xl py-10 px-4 text-center my-4 bg-[#f0f4e8]">
              <Building2 className="w-12 h-12 text-[#5b7a2b] mx-auto mb-2" strokeWidth={1.5} />
              <h3 className="text-sm font-bold text-[#1f2913] mb-1">
                Select a Hostel Block
              </h3>
              <p className="text-xs text-[#6b7e5d] max-w-md mx-auto">
                Please select a hostel block from the dropdown above or type a search query to render block details.
              </p>
            </div>
          ) : (
            <div className="space-y-4 my-2">
              <div className="p-4 rounded-xl bg-[#f0f4e8] border border-[#e2ebd8] flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-base font-bold text-[#1f2913] m-0">
                    {activeBlock.name} ({activeBlock.code})
                  </h4>
                  <p className="text-xs text-[#6b7e5d] m-0 mt-0.5">
                    {activeBlock.type} Accommodation • {activeBlock.description}
                  </p>
                </div>
                <span className="bg-[#e9f2dd] text-[#476323] border border-[#c8e6a6] rounded-md px-2.5 py-1 text-xs font-semibold">
                  ● Active Status
                </span>
              </div>

              {/* Metric Boxes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-white border border-[#e2ebd8] rounded-xl text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[#6b7e5d] mb-1">
                    <Layers size={15} />
                    <span className="text-xs font-medium uppercase text-[#6b7e5d]">Floors</span>
                  </div>
                  <div className="text-xl font-bold text-[#1f2913]">{activeBlock.floors}</div>
                </div>

                <div className="p-3.5 bg-white border border-[#e2ebd8] rounded-xl text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[#6b7e5d] mb-1">
                    <DoorClosed size={15} />
                    <span className="text-xs font-medium uppercase text-[#6b7e5d]">Total Rooms</span>
                  </div>
                  <div className="text-xl font-bold text-[#1f2913]">{activeBlock.totalRooms}</div>
                </div>

                <div className="p-3.5 bg-white border border-[#e2ebd8] rounded-xl text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[#6b7e5d] mb-1">
                    <UserRound size={15} />
                    <span className="text-xs font-medium uppercase text-[#6b7e5d]">Occupied Beds</span>
                  </div>
                  <div className="text-xl font-bold text-amber-600">{activeBlock.occupiedBeds}</div>
                </div>

                <div className="p-3.5 bg-white border border-[#e2ebd8] rounded-xl text-center shadow-xs">
                  <div className="flex items-center justify-center gap-1 text-[#6b7e5d] mb-1">
                    <BedDouble size={15} />
                    <span className="text-xs font-medium uppercase text-[#6b7e5d]">Vacant Beds</span>
                  </div>
                  <div className="text-xl font-bold text-[#476323]">{activeBlock.vacantBeds}</div>
                </div>

                <div className="p-3.5 bg-white border border-[#e2ebd8] rounded-xl text-center shadow-xs col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-center gap-1 text-[#6b7e5d] mb-1">
                    <ShieldCheck size={15} />
                    <span className="text-xs font-medium uppercase text-[#6b7e5d]">Warden</span>
                  </div>
                  <div className="text-xs font-bold text-[#1f2913] truncate" title={activeBlock.warden}>
                    {activeBlock.warden}
                  </div>
                  <div className="text-[11px] text-[#6b7e5d] flex items-center justify-center gap-1 mt-0.5">
                    <Phone size={11} /> {activeBlock.wardenPhone}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Row */}
          <div className="flex items-center justify-between mt-4 pt-2">
            <span className="text-xs text-[#6b7e5d]">
              Showing {blocks.length > 0 ? Math.min(currentPage, blocks.length) : 0} of {blocks.length} records
            </span>
            <div className="flex items-center gap-1 text-xs text-[#6b7e5d]">
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e2ebd8] hover:bg-[#f0f4e8] disabled:opacity-40 transition cursor-pointer"
                onClick={() => {
                  setCurrentPage(1);
                  if (blocks[0]) setSelectedBlockName(blocks[0].name);
                }}
                disabled={currentPage === 1 || blocks.length <= 1}
                title="First Page"
              >
                «
              </button>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e2ebd8] hover:bg-[#f0f4e8] disabled:opacity-40 transition cursor-pointer"
                onClick={() => {
                  const p = Math.max(1, currentPage - 1);
                  setCurrentPage(p);
                  if (blocks[p - 1]) setSelectedBlockName(blocks[p - 1].name);
                }}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                ‹
              </button>
              {Array.from({ length: Math.min(Math.max(blocks.length, 1), 4) }).map((_, idx) => {
                const page = idx + 1;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => {
                      setCurrentPage(page);
                      if (blocks[page - 1]) setSelectedBlockName(blocks[page - 1].name);
                    }}
                    className={`w-7 h-7 rounded font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                      currentPage === page
                        ? "bg-[#5b7a2b] text-white shadow-xs"
                        : "border border-[#e2ebd8] text-[#1f2913] hover:bg-[#f0f4e8]"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e2ebd8] hover:bg-[#f0f4e8] disabled:opacity-40 transition cursor-pointer"
                onClick={() => {
                  const maxP = Math.max(1, Math.min(blocks.length, 4));
                  const p = Math.min(maxP, currentPage + 1);
                  setCurrentPage(p);
                  if (blocks[p - 1]) setSelectedBlockName(blocks[p - 1].name);
                }}
                disabled={currentPage >= Math.max(1, Math.min(blocks.length, 4))}
                title="Next Page"
              >
                ›
              </button>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded border border-[#e2ebd8] hover:bg-[#f0f4e8] disabled:opacity-40 transition cursor-pointer"
                onClick={() => {
                  const maxP = Math.max(1, Math.min(blocks.length, 4));
                  setCurrentPage(maxP);
                  if (blocks[maxP - 1]) setSelectedBlockName(blocks[maxP - 1].name);
                }}
                disabled={currentPage >= Math.max(1, Math.min(blocks.length, 4))}
                title="Last Page"
              >
                »
              </button>
            </div>
          </div>
        </section>

        {/* 5. BOTTOM TWO-COLUMN GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* RECENT BED ALLOCATIONS */}
          <div className="bg-white border border-[#e2ebd8] rounded-xl shadow-xs p-5 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-1">
                <div className="flex items-center gap-2">
                  <CircleCheck size={18} className="text-emerald-500" />
                  <h3 className="text-sm font-bold tracking-wide text-slate-800 uppercase m-0">
                    RECENT BED ALLOCATIONS
                  </h3>
                </div>
                <Link
                  to="/hostel/students"
                  className="text-xs font-semibold text-[#5b7a2b] hover:text-[#465f1f] hover:underline no-underline"
                >
                  View All →
                </Link>
              </div>

              {/* Allocations List */}
              <div className="divide-y divide-slate-100">
                {allocations.slice(0, 4).map((alloc) => (
                  <div
                    key={alloc.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#f0f4e8]/40 px-2 rounded-xl transition"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900 m-0 leading-tight">
                        {alloc.name || alloc.studentName}
                      </p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        {alloc.admissionNo || alloc.admNo || alloc.id} • {alloc.block || alloc.blockName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="bg-[#f0f4e8] text-[#4d6b2c] border border-[#e2ebd8] rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap inline-block">
                        {alloc.roomBed || alloc.roomBadge || (alloc.room ? `${alloc.room} (${alloc.bed || 'BED-1'})` : 'BED-1')}
                      </span>
                      <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                        Joined: {alloc.joinDate}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ACTIVE OUTPASS & LEAVE REQUESTS */}
          <div className="bg-white border border-[#e2ebd8] rounded-xl shadow-xs p-5 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-1">
                <div className="flex items-center gap-2">
                  <TriangleAlert size={18} className="text-amber-500" />
                  <h3 className="text-sm font-bold tracking-wide text-slate-800 uppercase m-0">
                    ACTIVE OUTPASS &amp; LEAVE REQUESTS
                  </h3>
                </div>
                <Link
                  to="/hostel/reports"
                  className="text-xs font-semibold text-[#5b7a2b] hover:text-[#465f1f] hover:underline no-underline"
                >
                  View All →
                </Link>
              </div>

              {/* Requests List */}
              <div className="divide-y divide-slate-100">
                {outpasses.slice(0, 2).map((req) => (
                  <div
                    key={req.id}
                    className="py-3.5 flex items-center justify-between gap-3 hover:bg-[#f0f4e8]/40 px-2 rounded-xl transition flex-wrap sm:flex-nowrap"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 m-0 leading-tight">
                          {req.studentName}
                        </p>
                        <span
                          className={
                            req.status === "Approved"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                              : req.status === "Rejected"
                              ? "bg-red-50 text-red-700 border border-red-200 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                              : "bg-amber-50 text-amber-700 border border-amber-200 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                          }
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        {req.requestType} • {req.roomNo}
                      </p>
                      <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                        Return: {req.returnDate}
                      </p>
                    </div>

                    {/* Outpass Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                      <button
                        type="button"
                        onClick={() => handleApproveOutpass(req.id, req.studentName)}
                        disabled={req.status === "Approved"}
                        className="bg-[#5b7a2b] hover:bg-[#465f1f] text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50 border-0 shadow-2xs"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectOutpass(req.id, req.studentName)}
                        disabled={req.status === "Rejected"}
                        className="bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
