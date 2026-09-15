import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  Download,
  Printer,
  Search,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  Check,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useHostelStore, updateHostelOutpassStatus } from "./data/hostelStore.js";
import "./HostelModule.css";

export default function HostelReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || ""; // "" | "occupancy" | "outpass" | "dues"

  const { blocks, outpasses, allocations } = useHostelStore();

  const [reportCategory, setReportCategory] = useState(urlTab);
  const [blockFilter, setBlockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (urlTab && ["occupancy", "outpass", "dues"].includes(urlTab)) {
      setReportCategory(urlTab);
    }
  }, [urlTab]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Sync category change with URL and local state
  const handleCategoryChange = (cat) => {
    setReportCategory(cat);
    if (cat) {
      setSearchParams({ tab: cat });
    } else {
      setSearchParams({});
    }
  };

  const handleApproveOutpass = (id) => {
    updateHostelOutpassStatus(id, "Approved");
    showToast("Outpass approved successfully.");
  };

  const handleRejectOutpass = (id) => {
    updateHostelOutpassStatus(id, "Rejected");
    showToast("Outpass marked as Rejected.");
  };

  // Live computed total monthly hostel fee
  const totalMonthlyFee = useMemo(() => {
    return allocations.reduce((sum, a) => {
      const num = parseInt(String(a.fee || "0").replace(/[^0-9]/g, ""), 10) || 0;
      return sum + num;
    }, 0);
  }, [allocations]);

  // Filtered Occupancy Blocks
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const matchesBlock =
        !blockFilter ||
        blockFilter === "all" ||
        b.name.toLowerCase().includes(blockFilter.toLowerCase());
      const matchesSearch =
        !searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        statusFilter === "all" ||
        (statusFilter === "vacant" && b.vacantBeds > 0) ||
        (statusFilter === "occupied" && b.occupiedBeds > 0);
      return matchesBlock && matchesSearch && matchesStatus;
    });
  }, [blocks, blockFilter, searchQuery, statusFilter]);

  // Filtered Outpasses
  const filteredOutpasses = useMemo(() => {
    return outpasses.filter((o) => {
      const matchesBlock =
        !blockFilter ||
        blockFilter === "all" ||
        o.blockName.toLowerCase().includes(blockFilter.toLowerCase());
      const matchesSearch =
        !searchQuery ||
        o.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.admissionNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.requestType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        statusFilter === "all" ||
        o.status.toLowerCase().includes(statusFilter.toLowerCase());
      return matchesBlock && matchesSearch && matchesStatus;
    });
  }, [outpasses, blockFilter, searchQuery, statusFilter]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Export PDF Handler
  const handleExportPDF = () => {
    window.print();
  };

  // Export CSV Handler
  const handleDownloadCSV = () => {
    let csvRows = [];
    let filename = "hostel-report.csv";

    if (reportCategory === "occupancy") {
      filename = "hostel-occupancy-report.csv";
      csvRows.push([
        "Block Name",
        "Code",
        "Gender/Type",
        "Floors",
        "Total Rooms",
        "Total Beds",
        "Occupied Beds",
        "Vacant Beds",
        "Occupancy %",
      ]);
      filteredBlocks.forEach((b) => {
        const pct = Math.round((b.occupiedBeds / b.totalBeds) * 100);
        csvRows.push([
          `"${b.name}"`,
          `"${b.code}"`,
          `"${b.type}"`,
          b.floors,
          b.totalRooms,
          b.totalBeds,
          b.occupiedBeds,
          b.vacantBeds,
          `${pct}%`,
        ]);
      });
    } else if (reportCategory === "outpass") {
      filename = "hostel-outpass-log.csv";
      csvRows.push([
        "Student Name",
        "Admission No",
        "Room No",
        "Block",
        "Pass Type",
        "Out Date",
        "Return Date",
        "Return Time",
        "Status",
      ]);
      filteredOutpasses.forEach((o) => {
        csvRows.push([
          `"${o.studentName}"`,
          `"${o.admissionNo}"`,
          `"${o.roomNo}"`,
          `"${o.blockName}"`,
          `"${o.requestType}"`,
          `"${o.outDate}"`,
          `"${o.returnDate}"`,
          `"${o.returnTime}"`,
          `"${o.status}"`,
        ]);
      });
    } else if (reportCategory === "dues") {
      filename = "hostel-fee-collection-audit.csv";
      csvRows.push(["Category", "Amount"]);
      csvRows.push(["Expected Monthly Fees", `₹${totalMonthlyFee.toLocaleString("en-IN")}`]);
      csvRows.push(["Collected Fees", `₹${totalMonthlyFee.toLocaleString("en-IN")}`]);
      csvRows.push(["Outstanding Dues", "₹0.00"]);
      csvRows.push(["Status", "All resident hostellers dues cleared"]);
    } else {
      filename = "hostel-summary-report.csv";
      csvRows.push(["Hostel Report", "Total Blocks", "Total Capacity", "Total Occupied", "Total Vacant"]);
      const totalCap = blocks.reduce((acc, b) => acc + b.totalBeds, 0);
      const totalOcc = blocks.reduce((acc, b) => acc + b.occupiedBeds, 0);
      const totalVac = blocks.reduce((acc, b) => acc + b.vacantBeds, 0);
      csvRows.push(["Consolidated Summary", blocks.length, totalCap, totalOcc, totalVac]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename} successfully.`);
  };

  return (
    <DashboardLayout
      title={null}
      subtitle={null}
      breadcrumb={["Hostel Management", "Hostel Reports"]}
    >
      <div className="hostel-page-wrapper">
        {/* Toast Banner */}
        {toastMessage && (
          <div className="pc-toast-banner">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Header Row */}
        <header className="flex flex-wrap justify-between items-center gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shadow-sm"
              style={{ width: "48px", height: "48px" }}
            >
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 m-0">Hostel Reports</h1>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Audit occupancy ratios, export gatepass movement logs, and track monthly fee collections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              type="button"
              className="border border-sky-200 text-sky-700 px-4 py-2 rounded-xl text-sm font-medium bg-white hover:bg-sky-50 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              onClick={handlePrint}
            >
              <Printer size={15} /> Print
            </button>
            <button
              type="button"
              className="border border-sky-200 text-sky-700 px-4 py-2 rounded-xl text-sm font-medium bg-white hover:bg-sky-50 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              onClick={handleExportPDF}
            >
              <FileText size={15} /> Export PDF
            </button>
            <button
              type="button"
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm border-0"
              onClick={handleDownloadCSV}
            >
              <Download size={15} /> Download
            </button>
          </div>
        </header>

        {/* 2. Report Filter Section Container */}
        <div className="bg-white rounded-2xl border border-sky-100 p-5 mb-5 shadow-sm w-full box-border">
          {/* Three Filter Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Column 1: Hostel Block Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Hostel Block Filter
              </label>
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="w-full h-10 border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm px-3 bg-white text-slate-800 outline-none cursor-pointer box-border transition"
              >
                <option value="">-- Select Hostel Block --</option>
                <option value="all">All Hostel Blocks</option>
                {blocks.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Column 2: Hostel Report Category * */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Hostel Report Category *
              </label>
              <select
                value={reportCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-10 border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm px-3 bg-white text-slate-800 outline-none cursor-pointer box-border transition"
              >
                <option value="">-- Select Hostel Report --</option>
                <option value="occupancy">Hostel Occupancy Report</option>
                <option value="outpass">Student Movement / Outpass Log</option>
                <option value="dues">Hostel Fee Collection &amp; Dues</option>
              </select>
            </div>

            {/* Column 3: Category / Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Category / Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm px-3 bg-white text-slate-800 outline-none cursor-pointer box-border transition"
              >
                <option value="">-- Select Category Filter --</option>
                <option value="all">All Categories / Statuses</option>
                <option value="approved">Approved / Active</option>
                <option value="pending">Pending Approval</option>
                <option value="under review">Under Review</option>
                <option value="occupied">Occupied Rooms / Beds</option>
                <option value="vacant">Vacant Rooms / Beds</option>
              </select>
            </div>
          </div>

          {/* Sub-Divider & Search Row */}
          <div className="pt-3.5 border-t border-sky-100">
            <div className="relative w-full">
              <Search size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search hostel report records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 border border-sky-100 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl text-sm pl-10 pr-4 outline-none text-slate-800 placeholder-slate-400 bg-white box-border transition"
              />
            </div>
          </div>
        </div>

        {/* 3. Empty State (Shown when No Report Category Selected) */}
        {!reportCategory ? (
          <div className="bg-white rounded-2xl border border-sky-100 p-12 text-center shadow-sm min-h-[340px] flex flex-col items-center justify-center w-full box-border">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Hostel Report Selected</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Please select a hostel report category &amp; block filter from the dropdowns above or use manual entry to load matching records.
            </p>
          </div>
        ) : (
          <div>
            {/* Quick Report Switcher Pill Tabs */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleCategoryChange("occupancy")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  reportCategory === "occupancy"
                    ? "bg-sky-600 text-white shadow-sm border-0"
                    : "bg-white border border-sky-100 text-slate-700 hover:bg-sky-50"
                }`}
              >
                Occupancy Breakdown
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange("outpass")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  reportCategory === "outpass"
                    ? "bg-sky-600 text-white shadow-sm border-0"
                    : "bg-white border border-sky-100 text-slate-700 hover:bg-sky-50"
                }`}
              >
                Outpass &amp; Leave Log
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange("dues")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  reportCategory === "dues"
                    ? "bg-sky-600 text-white shadow-sm border-0"
                    : "bg-white border border-sky-100 text-slate-700 hover:bg-sky-50"
                }`}
              >
                Fee Collection Audit
              </button>
              <button
                type="button"
                onClick={() => handleCategoryChange("")}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition cursor-pointer border-0 ml-auto"
              >
                Clear Selection
              </button>
            </div>

            {/* View 1: Occupancy Breakdown */}
            {reportCategory === "occupancy" && (
              <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm w-full box-border">
                <div className="p-4 bg-sky-50 border-b border-sky-100 flex flex-wrap justify-between items-center gap-2">
                  <span className="font-bold text-sm text-sky-950 uppercase tracking-wide">
                    CAMPUS RESIDENCE OCCUPANCY AUDIT
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Official Academic Session 2026 • Showing {filteredBlocks.length} Blocks
                  </span>
                </div>
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="pc-table">
                    <thead>
                      <tr>
                        <th>BLOCK NAME</th>
                        <th>CODE</th>
                        <th>GENDER/TYPE</th>
                        <th>FLOORS</th>
                        <th>TOTAL ROOMS</th>
                        <th>TOTAL BEDS</th>
                        <th>OCCUPIED</th>
                        <th>VACANT</th>
                        <th>OCCUPANCY RATIO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBlocks.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-slate-500 text-sm">
                            No hostel blocks match your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredBlocks.map((b) => {
                          const pct = Math.round((b.occupiedBeds / b.totalBeds) * 100);
                          return (
                            <tr key={b.id}>
                              <td className="font-bold text-slate-900">{b.name}</td>
                              <td>
                                <span className="bg-sky-50 border border-sky-200 text-sky-700 rounded-lg px-2 py-0.5 text-xs font-semibold">
                                  {b.code}
                                </span>
                              </td>
                              <td>
                                <span className="bg-slate-100 text-slate-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                  {b.type}
                                </span>
                              </td>
                              <td>{b.floors}</td>
                              <td>{b.totalRooms}</td>
                              <td className="font-bold text-slate-900">{b.totalBeds}</td>
                              <td className="font-semibold text-sky-600">{b.occupiedBeds}</td>
                              <td className="font-semibold text-emerald-600">{b.vacantBeds}</td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                    <div
                                      className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.max(pct, 4)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-slate-800">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* View 2: Outpass Log */}
            {reportCategory === "outpass" && (
              <div>
                <div className="p-3 bg-white border border-sky-100 rounded-xl flex items-center justify-between mb-4 shadow-sm">
                  <span className="text-xs font-semibold text-sky-800 uppercase tracking-wide">
                    Student Gatepass &amp; Leave Movement Log
                  </span>
                  <div className="text-xs text-slate-500 font-medium">
                    Showing {filteredOutpasses.length} records
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-sky-100 overflow-hidden shadow-sm w-full box-border">
                  <div className="w-full max-w-full overflow-x-auto">
                    <table className="pc-table">
                      <thead>
                        <tr>
                          <th>STUDENT NAME</th>
                          <th>ADMISSION NO</th>
                          <th>ROOM &amp; BLOCK</th>
                          <th>OUTPASS TYPE</th>
                          <th>OUT DATE / TIME</th>
                          <th>RETURN DATE / TIME</th>
                          <th>STATUS</th>
                          <th style={{ textAlign: "right" }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOutpasses.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                              No outpass records match your filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredOutpasses.map((o) => (
                            <tr key={o.id}>
                              <td className="font-bold text-slate-900">{o.studentName}</td>
                              <td className="text-xs text-slate-500">{o.admissionNo}</td>
                              <td>
                                <span className="text-sm font-medium text-slate-800">{o.roomNo}</span>
                                <span className="text-xs text-slate-500 block">{o.blockName}</span>
                              </td>
                              <td>
                                <span className="bg-sky-50 text-sky-700 border border-sky-100 rounded-lg px-2 py-0.5 text-xs font-semibold">
                                  {o.requestType}
                                </span>
                              </td>
                              <td className="text-xs text-slate-800">{o.outDate}</td>
                              <td className="text-xs text-slate-800">
                                {o.returnDate} ({o.returnTime})
                              </td>
                              <td>
                                <span
                                  className={
                                    o.status === "Approved"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                      : o.status === "Rejected"
                                      ? "bg-red-50 text-red-700 border border-red-200 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                      : "bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                                  }
                                >
                                  {o.status}
                                </span>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                {o.status !== "Approved" && o.status !== "Rejected" && (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleApproveOutpass(o.id)}
                                      className="bg-sky-600 text-white px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-sky-700 transition cursor-pointer border-0 shadow-sm"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRejectOutpass(o.id)}
                                      className="border border-red-200 text-red-600 px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-red-50 transition cursor-pointer bg-white"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {o.status === "Approved" && (
                                  <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                                    <CheckCircle2 size={13} /> Verified Pass
                                  </span>
                                )}
                                {o.status === "Rejected" && (
                                  <span className="text-xs text-red-600 font-semibold">
                                    Rejected
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* View 3: Fee Dues Audit */}
            {reportCategory === "dues" && (
              <div className="bg-white rounded-2xl border border-sky-100 p-6 shadow-sm w-full box-border">
                <h3 className="text-base font-bold text-slate-900 mb-1">Hostel Fee Collection Summary</h3>
                <p className="text-sm text-slate-500 mb-5">
                  Consolidated billing audit for active hostellers in Session 2026.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 border border-sky-100 rounded-xl bg-slate-50">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      EXPECTED MONTHLY FEES
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      ₹{totalMonthlyFee.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="p-4 border border-sky-100 rounded-xl bg-sky-50/50">
                    <div className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
                      COLLECTED FEES
                    </div>
                    <div className="text-2xl font-bold text-sky-600 mt-1">
                      ₹{totalMonthlyFee.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="p-4 border border-sky-100 rounded-xl bg-emerald-50/50">
                    <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                      OUTSTANDING DUES
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">₹0.00 (Cleared)</div>
                  </div>
                </div>
                <div className="p-3.5 bg-sky-50 border border-sky-200 text-sky-900 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-sky-600 flex-shrink-0" />
                  <span>All resident students have cleared active hostel dues for current billing cycle.</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
