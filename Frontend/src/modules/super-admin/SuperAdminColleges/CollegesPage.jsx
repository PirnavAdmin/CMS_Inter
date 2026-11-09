import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import superAdminApi from "@/api/superAdminApi.js";
import { activeAccountCount } from "../superAdminPreview.js";
import CollegeDetailDrawer from "./CollegeDetailDrawer.jsx";
import {
  Home,
  Building2,
  CheckCircle2,
  PauseCircle,
  Users,
  UserPlus,
  Plus,
  Search,
  Download,
  RotateCw,
  RotateCcw,
  Eye,
  Pencil,
  Power,
  MoreVertical,
  ArrowUpDown,
  Filter,
  List,
  LayoutGrid,
  X,
  SearchX,
  Sparkles,
} from "lucide-react";
import "./CollegesPage.css";

const blankEdit = { name: "", code: "", email: "", phone: "", address: "", logo: "" };

export default function CollegesPage() {
  const { data, update } = useSuperAdmin();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // Edit modal state
  const [editCollege, setEditCollege] = useState(null);
  const [editError, setEditError] = useState("");

  // Drawer detail state
  const [detailCollege, setDetailCollege] = useState(null);

  // Confirmation dialog state
  const [confirm, setConfirm] = useState(null);

  // Filter, search & view mode state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [openMoreId, setOpenMoreId] = useState(null);

  // Sorting state
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleDocClick = () => setOpenMoreId(null);
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, []);

  const source = useMemo(() => {
    return [...(data.colleges || [])].sort((a, b) => {
      const idA = Number(a.collegeId ?? a.id ?? 0);
      const idB = Number(b.collegeId ?? b.id ?? 0);
      return idA - idB;
    });
  }, [data.colleges]);

  // Find admins for each college
  const getAdminsForCollege = (row) => {
    const cidStr = String(row.collegeId ?? row.id ?? "");
    const cidNum = Number(row.collegeId ?? row.id ?? 0);
    return (data.users || []).filter((u) => {
      const role = (u.role || "").toLowerCase().replace(/[\s_-]/g, "");
      const isAdminRole = role === "collegeadmin" || role === "admin";
      if (!isAdminRole) return false;
      const userCid = String(u.collegeId || "");
      return (
        (userCid && (userCid === cidStr || Number(userCid) === cidNum)) ||
        (u.collegeName && row.name && u.collegeName.toLowerCase() === row.name.toLowerCase())
      );
    });
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return source
      .map((row) => {
        const admins = getAdminsForCollege(row);
        return {
          ...row,
          adminsList: admins,
          adminNames: admins.map((a) => a.fullName || a.name).join(", "),
          adminEmails: admins.map((a) => a.email).filter(Boolean).join(", "),
          displayStatus: row.status || row.collegeStatus || "Active",
          adminSetup: admins.length > 0 ? "Admin Assigned" : "Admin Not Assigned",
        };
      })
      .filter((row) => {
        const query = searchTerm.trim().toLowerCase();
        const matchSearch =
          !query ||
          (row.name && row.name.toLowerCase().includes(query)) ||
          (row.code && row.code.toLowerCase().includes(query)) ||
          (row.adminNames && row.adminNames.toLowerCase().includes(query)) ||
          (row.adminEmails && row.adminEmails.toLowerCase().includes(query)) ||
          (row.email && row.email.toLowerCase().includes(query));

        const matchStatus = !statusFilter || row.displayStatus.toLowerCase() === statusFilter.toLowerCase();
        const matchAdmin = !adminFilter || (row.adminSetup === "Admin Assigned" ? adminFilter === "assigned" : adminFilter === "unassigned");
        return matchSearch && matchStatus && matchAdmin;
      });
  }, [source, data.users, searchTerm, statusFilter, adminFilter]);

  // Handle column sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Sorted rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === "students") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return sortDir === "asc" ? valA - valB : valB - valA;
      }
      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortField, sortDir]);

  // Pagination calculation
  const totalRecords = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const currentRows = sortedRows.slice(start, start + pageSize);

  // KPI Calculations strictly from real DB
  const allCollegesCount = data.colleges?.length || 0;
  const activeCollegesCount = data.colleges?.filter((c) => (c.status || c.collegeStatus) === "Active").length || 0;
  const inactiveCollegesCount = data.colleges?.filter((c) => (c.status || c.collegeStatus) === "Inactive").length || 0;
  const totalAdminsCount = (data.users || []).filter((u) => {
    const role = (u.role || "").toLowerCase().replace(/[\s_-]/g, "");
    return (role === "collegeadmin" || role === "admin") && u.collegeId != null && u.collegeId !== "";
  }).length;

  // Active filter count
  const activeFilterCount =
    (statusFilter ? 1 : 0) +
    (adminFilter ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  // Open Details Drawer
  const openDetails = async (row) => {
    setDetailCollege(row);
    if (!row?.id && !row?.collegeId) return;
    const cid = row.collegeId || row.id;
    try {
      const full = await superAdminApi.getCollegeById(cid);
      if (full) setDetailCollege((prev) => ({ ...prev, ...full }));
    } catch {
      // Use existing record
    }
  };

  // Open Edit Profile
  const openEdit = (row) => {
    setEditError("");
    setEditCollege({ ...blankEdit, ...row });
  };

  // Save Edit Profile
  const saveEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    const cid = editCollege.collegeId || editCollege.id;
    const payload = {
      name: editCollege.name,
      phone: editCollege.phone || editCollege.contact || "",
      address: editCollege.address || "",
      logo: editCollege.logo || editCollege.logoUrl || "",
    };

    const ok = await update("Updated college profile", null, {
      module: "Colleges",
      actionType: "Update",
      collegeId: cid,
      payload,
    });

    if (ok) {
      setEditCollege(null);
      if (detailCollege && (detailCollege.id === cid || detailCollege.collegeId === cid)) {
        setDetailCollege((prev) => ({ ...prev, ...payload }));
      }
    } else {
      setEditError("Could not update college profile. Please check inputs.");
    }
  };

  // Toggle Status
  const handleStatusToggle = (college) => {
    const isCurrentlyActive = (college.status || college.collegeStatus) === "Active";
    const nextStatus = isCurrentlyActive ? "Inactive" : "Active";
    const cid = college.collegeId || college.id;

    setConfirm({
      title: `${isCurrentlyActive ? "Suspend" : "Activate"} College?`,
      message: `Are you sure you want to ${isCurrentlyActive ? "suspend operations for" : "reactivate"} "${college.name}"? ${isCurrentlyActive ? "Logins for students and staff under this college will be paused." : ""}`,
      run: async () => {
        await update(`Updated college status to ${nextStatus}`, null, {
          module: "Colleges",
          actionType: "Status change",
          collegeId: cid,
          status: nextStatus,
        });
      },
    });
  };

  // Reset Password for Admin
  const handleResetPassword = async (college) => {
    const cid = college.collegeId || college.id;
    const ok = await update("Sent admin reset link", null, {
      module: "Colleges",
      actionType: "Password reset",
      collegeId: cid,
    });
    if (ok) alert("Password reset successfully!");
  };

  const assignLink = (collegeId) => `/super-admin/add-college-admin?collegeId=${encodeURIComponent(collegeId)}`;

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setAdminFilter("");
    setPage(1);
  };

  // Export to CSV
  const handleExport = () => {
    const csvHeader = "#,College Name,Code,College Admins,Students,Status\n";
    const csvRows = filteredRows
      .map((r, i) =>
        `"${i + 1}","${(r.name || "").replace(/"/g, '""')}","${r.code || ""}","${(r.adminNames || "Not Assigned").replace(/"/g, '""')}","${r.students || 0}","${r.displayStatus}"`
      )
      .join("\n");
    const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `colleges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rnp-page">
      {/* ── BREADCRUMB (Matching Renewals Module) ── */}
      <nav className="rnp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/super-admin/dashboard" title="Home">
          <Home size={14} />
        </Link>
        <span className="rnp-breadcrumb-sep">/</span>
        <Link to="/super-admin/dashboard">Platform Workspace</Link>
        <span className="rnp-breadcrumb-sep">/</span>
        <span>College Management</span>
      </nav>

      {/* ── PAGE HEADER (Matching Renewals Module) ── */}
      <header className="rnp-page-header">
        <div className="rnp-header-left">
          <div className="rnp-title-icon-badge">
            <Building2 size={20} />
          </div>
          <div className="rnp-title-wrap">
            <h1 className="rnp-page-title">College Management</h1>
            <p className="rnp-page-desc">
              Manage all colleges under your organisation, configure modules, and control access.
            </p>
          </div>
        </div>

        <div className="rnp-header-actions">
          <button
            type="button"
            className="rnp-btn-export"
            onClick={handleExport}
            title="Export colleges to CSV"
          >
            <Download size={14} />
            <span>Export</span>
          </button>

          <button
            type="button"
            className="rnp-btn-primary"
            onClick={() => navigate("/super-admin/register-college")}
          >
            <Plus size={14} />
            <span>Add College</span>
          </button>
        </div>
      </header>

      {/* ── TOP KPI METRIC CARDS (Exact Match to Renewals Module) ── */}
      <section className="rnp-kpi-grid">
        {/* Card 1: All Colleges (Purple) */}
        <button
          type="button"
          className={`rnp-kpi-card card-purple ${!statusFilter && !adminFilter ? "is-selected" : ""}`}
          onClick={() => { setStatusFilter(""); setAdminFilter(""); setPage(1); }}
          title="Click to view all colleges"
        >
          <div className="rnp-kpi-icon-badge">
            <Building2 size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>All Colleges</small>
            <strong>{allCollegesCount}</strong>
          </div>
        </button>

        {/* Card 2: Active Colleges (Green) */}
        <button
          type="button"
          className={`rnp-kpi-card card-green ${statusFilter === "Active" && !adminFilter ? "is-selected" : ""}`}
          onClick={() => {
            setAdminFilter("");
            setStatusFilter((prev) => (prev === "Active" ? "" : "Active"));
            setPage(1);
          }}
          title="Filter active colleges"
        >
          <div className="rnp-kpi-icon-badge">
            <CheckCircle2 size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>Active Colleges</small>
            <strong>{activeCollegesCount}</strong>
          </div>
        </button>

        {/* Card 3: Inactive Colleges (Amber) */}
        <button
          type="button"
          className={`rnp-kpi-card card-amber ${statusFilter === "Inactive" && !adminFilter ? "is-selected" : ""}`}
          onClick={() => {
            setAdminFilter("");
            setStatusFilter((prev) => (prev === "Inactive" ? "" : "Inactive"));
            setPage(1);
          }}
          title="Filter inactive colleges"
        >
          <div className="rnp-kpi-icon-badge">
            <PauseCircle size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>Inactive Colleges</small>
            <strong>{inactiveCollegesCount}</strong>
          </div>
        </button>

        {/* Card 4: Total College Admins (Red) */}
        <button
          type="button"
          className={`rnp-kpi-card card-red ${adminFilter === "assigned" ? "is-selected" : ""}`}
          onClick={() => {
            setStatusFilter("");
            setAdminFilter((prev) => (prev === "assigned" ? "" : "assigned"));
            setPage(1);
          }}
          title="Filter colleges with assigned administrators"
        >
          <div className="rnp-kpi-icon-badge">
            <Users size={22} />
          </div>
          <div className="rnp-kpi-content">
            <small>Total College Admins</small>
            <strong>{totalAdminsCount}</strong>
          </div>
        </button>
      </section>

      {/* ── TOOLBAR / FILTERS (Exact Match to Renewals Module) ── */}
      <section className="rnp-toolbar">
        <div className="rnp-toolbar-left">
          {/* Search Box */}
          <div className="rnp-search-box">
            <Search size={14} className="rnp-search-icon" />
            <input
              type="text"
              className="rnp-search-input"
              placeholder="Search by college name, code, or admin..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="rnp-search-clear"
                onClick={() => setSearchTerm("")}
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="rnp-filter-group">
            {/* Status Filter */}
            <div className="rnp-select-wrap">
              <select
                className="rnp-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Admin Assigned Filter */}
            <div className="rnp-select-wrap">
              <select
                className="rnp-select"
                value={adminFilter}
                onChange={(e) => {
                  setAdminFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Admins</option>
                <option value="assigned">Admin Assigned</option>
                <option value="unassigned">Admin Not Assigned</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rnp-toolbar-right">
          {/* Reset button */}
          <button
            type="button"
            className="rnp-icon-btn"
            onClick={resetFilters}
            title="Reset filters & reload"
          >
            <RotateCw size={14} />
          </button>

          {/* Filter badge button */}
          <button
            type="button"
            className={`rnp-icon-btn ${activeFilterCount > 0 ? "is-active" : ""}`}
            onClick={resetFilters}
            title={`${activeFilterCount} filter(s) active. Click to clear.`}
          >
            <Filter size={14} />
            {activeFilterCount > 0 && <span className="rnp-icon-badge">{activeFilterCount}</span>}
          </button>

          {/* View switcher */}
          <div className="rnp-view-toggle">
            <button
              type="button"
              className={`rnp-view-btn ${viewMode === "table" ? "is-active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table view"
            >
              <List size={14} />
            </button>
            <button
              type="button"
              className={`rnp-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Card view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── TABLE CONTAINER (Exact Match to Renewals Module) ── */}
      {viewMode === "table" ? (
        <div className="rnp-table-card">
          <div className="rnp-table-wrap">
            <table className="rnp-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>#</th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("name")}>
                      COLLEGE NAME <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="rnp-th-content" onClick={() => handleSort("adminNames")}>
                      COLLEGE ADMINS <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>
                    <span className="rnp-th-content" onClick={() => handleSort("students")}>
                      STUDENTS <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>
                    <span className="rnp-th-content" onClick={() => handleSort("displayStatus")}>
                      STATUS <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <Building2 size={32} color="#94a3b8" />
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>No matching colleges found</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          Try clearing search or filters to view all colleges.
                        </span>
                        <button
                          type="button"
                          className="rnp-btn-primary"
                          style={{ marginTop: 8 }}
                          onClick={resetFilters}
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentRows.map((row, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const isActive = (row.displayStatus || row.status || "Active").toLowerCase() === "active";
                    const isMoreOpen = openMoreId === (row.collegeId || row.id);

                    return (
                      <tr key={row.collegeId || row.id || idx}>
                        {/* Row # */}
                        <td className="rnp-cell-index">{rowNumber}</td>

                        {/* College Name & Code (Matching Renewals style) */}
                        <td>
                          <div className="rnp-cell-college">
                            <div className="rnp-college-icon">
                              <Building2 size={16} />
                            </div>
                            <div className="rnp-college-meta">
                              <button
                                type="button"
                                className="rnp-college-title-btn"
                                onClick={() => openDetails(row)}
                                title="Click to view details"
                              >
                                {row.name}
                              </button>
                              <span className="rnp-college-code">({row.code || "—"})</span>
                            </div>
                          </div>
                        </td>

                        {/* College Admins */}
                        <td>
                          {row.adminsList && row.adminsList.length > 0 ? (
                            <div className="rnp-admin-cell">
                              {row.adminsList.map((admin, aIdx) => (
                                <div key={admin.id || admin.userId || aIdx} className="rnp-admin-entry">
                                  <span className="rnp-admin-name">{admin.name || admin.fullName}</span>
                                  {admin.email && admin.email !== "-" && (
                                    <span className="rnp-admin-email">{admin.email}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="rnp-dash-val">Not Assigned</span>
                          )}
                        </td>

                        {/* Students */}
                        <td style={{ textAlign: "center" }}>
                          <span className="rnp-students-pill">
                            <Users size={13} />
                            <strong>{(Number(row.students) || 0).toLocaleString()}</strong>
                          </span>
                        </td>

                        {/* Status (Matching Renewals status pill) */}
                        <td style={{ textAlign: "center" }}>
                          <span className={`rnp-status-pill ${isActive ? "is-active" : "is-inactive"}`}>
                            <span className="rnp-status-dot" />
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions: 4 Colored Pill Buttons matching Renewals */}
                        <td style={{ textAlign: "center" }}>
                          <div className="rnp-actions-group">
                            {/* 1. View Button (Blue Pill) */}
                            <button
                              type="button"
                              className="rnp-action-btn view"
                              title="View Details"
                              onClick={() => openDetails(row)}
                            >
                              <Eye size={14} />
                            </button>

                            {/* 2. Key / Status Toggle (Amber/Suspended Pill) */}
                            <button
                              type="button"
                              className={`rnp-action-btn ${isActive ? "key" : "suspended"}`}
                              title={isActive ? "Suspend College" : "Activate College"}
                              onClick={() => handleStatusToggle(row)}
                            >
                              <Power size={14} />
                            </button>

                            {/* 3. Edit Button (Green Pill) */}
                            <button
                              type="button"
                              className="rnp-action-btn edit"
                              title="Edit College Information"
                              onClick={() => openEdit(row)}
                            >
                              <Pencil size={14} />
                            </button>

                            {/* 4. More Options (Purple Pill) */}
                            <div className="rnp-more-wrap">
                              <button
                                type="button"
                                className={`rnp-action-btn more ${isMoreOpen ? "is-open" : ""}`}
                                title="More actions"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMoreId(isMoreOpen ? null : (row.collegeId || row.id));
                                }}
                              >
                                <MoreVertical size={14} />
                              </button>

                              {isMoreOpen && (
                                <div className="rnp-more-popover" onClick={(e) => e.stopPropagation()}>
                                  <div className="rnp-popover-header">
                                    <span className="rnp-popover-name">{row.name}</span>
                                    <span className="rnp-popover-email">{row.code ? `Code: ${row.code}` : "No Code"}</span>
                                  </div>
                                  <div className="rnp-popover-divider" />
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => { setOpenMoreId(null); openDetails(row); }}
                                  >
                                    <Eye size={13} color="#2563eb" />
                                    <span>View Profile</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => { setOpenMoreId(null); openEdit(row); }}
                                  >
                                    <Pencil size={13} color="#16a34a" />
                                    <span>Edit College</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => {
                                      setOpenMoreId(null);
                                      const cid = row.collegeId || row.id;
                                      navigate(assignLink(cid));
                                    }}
                                  >
                                    <UserPlus size={13} color="#7c3aed" />
                                    <span>Assign Admin</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    onClick={() => { setOpenMoreId(null); handleResetPassword(row); }}
                                  >
                                    <RotateCcw size={13} color="#d97706" />
                                    <span>Reset Password</span>
                                  </button>
                                  <div className="rnp-popover-divider" />
                                  <button
                                    type="button"
                                    className="rnp-popover-item"
                                    style={{ color: isActive ? "#dc2626" : "#16a34a" }}
                                    onClick={() => { setOpenMoreId(null); handleStatusToggle(row); }}
                                  >
                                    <Power size={13} />
                                    <span>{isActive ? "Suspend College" : "Activate College"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination matching Renewals */}
          <footer className="rnp-footer">
            <span className="rnp-footer-info">
              Showing {totalRecords > 0 ? start + 1 : 0} – {Math.min(start + pageSize, totalRecords)} of {totalRecords} colleges
            </span>

            <div className="rnp-footer-right">
              <div className="rnp-rows-selector">
                <span>Rows per page:</span>
                <select
                  className="rnp-rows-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <div className="rnp-pagination">
                <button
                  type="button"
                  className="rnp-page-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`rnp-page-btn ${currentPage === num ? "is-active" : ""}`}
                    onClick={() => setPage(num)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="rnp-page-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  &gt;
                </button>
              </div>
            </div>
          </footer>
        </div>
      ) : (
        /* Card / Grid View */
        <div className="rnp-grid-wrap">
          {currentRows.length === 0 ? (
            <div className="rnp-empty-state">
              <Building2 size={36} color="#94a3b8" />
              <h3>No matching colleges</h3>
              <p>Try clearing search or filters to view all colleges.</p>
              <button type="button" className="rnp-btn-primary" onClick={resetFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="rnp-cards-grid">
              {currentRows.map((row) => {
                const isActive = (row.displayStatus || row.status || "Active").toLowerCase() === "active";
                return (
                  <div key={row.collegeId || row.id} className="rnp-grid-card">
                    <div className="rnp-card-header">
                      <div className="rnp-card-college-left">
                        <div className="rnp-college-icon">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h4 className="rnp-card-title">{row.name}</h4>
                          <span className="rnp-card-code">Code: {row.code || "—"}</span>
                        </div>
                      </div>
                      <span className={`rnp-status-pill ${isActive ? "is-active" : "is-inactive"}`}>
                        <span className="rnp-status-dot" />
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="rnp-card-stats-row">
                      <div className="rnp-card-stat">
                        <span className="label">Admins:</span>
                        <strong className="val">{row.adminsList?.length || 0} Assigned</strong>
                      </div>
                      <div className="rnp-card-stat">
                        <span className="label">Students:</span>
                        <strong className="val">{(Number(row.students) || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="rnp-card-actions">
                      <button
                        type="button"
                        className="rnp-action-btn view"
                        title="View Details"
                        onClick={() => openDetails(row)}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="rnp-action-btn edit"
                        title="Edit College"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={`rnp-action-btn ${isActive ? "key" : "suspended"}`}
                        title={isActive ? "Suspend College" : "Activate College"}
                        onClick={() => handleStatusToggle(row)}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* College Health & Details Drawer */}
      <CollegeDetailDrawer
        college={detailCollege}
        onClose={() => setDetailCollege(null)}
        onEdit={(col) => {
          setDetailCollege(null);
          openEdit(col);
        }}
        onStatusToggle={handleStatusToggle}
        onAssignAdmin={(cid) => {
          setDetailCollege(null);
          window.location.href = assignLink(cid);
        }}
        onResetPassword={handleResetPassword}
        activeAccountCount={
          detailCollege ? activeAccountCount(data.users, detailCollege.id || detailCollege.collegeId) : 0
        }
        plans={data.plans}
      />

      {/* Edit Profile Modal */}
      {editCollege && (
        <Modal
          title={`Edit College Profile: ${editCollege.name}`}
          onClose={() => setEditCollege(null)}
        >
          <form className="sa-form" onSubmit={saveEdit}>
            <div className="sa-form-grid">
              <label>
                College Name *
                <input
                  type="text"
                  required
                  value={editCollege.name || ""}
                  onChange={(e) => setEditCollege({ ...editCollege, name: e.target.value })}
                />
              </label>

              <label>
                College Code (Read-Only)
                <input
                  type="text"
                  disabled
                  value={editCollege.code || ""}
                />
              </label>

              <label>
                Phone / Helpline
                <input
                  type="tel"
                  value={editCollege.phone || editCollege.contact || ""}
                  onChange={(e) => setEditCollege({ ...editCollege, phone: e.target.value })}
                />
              </label>

              <label>
                Official Email
                <input
                  type="email"
                  disabled
                  value={editCollege.email || ""}
                />
              </label>

              <label className="full-width">
                Registered Address
                <input
                  type="text"
                  value={editCollege.address || ""}
                  onChange={(e) => setEditCollege({ ...editCollege, address: e.target.value })}
                />
              </label>

              <label className="full-width">
                Logo Asset URL
                <input
                  type="url"
                  value={editCollege.logo || editCollege.logoUrl || ""}
                  onChange={(e) => setEditCollege({ ...editCollege, logo: e.target.value })}
                />
              </label>
            </div>

            {editError && <p className="sa-wizard-error" role="alert">{editError}</p>}

            <div className="sa-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setEditCollege(null)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            confirm.run();
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
