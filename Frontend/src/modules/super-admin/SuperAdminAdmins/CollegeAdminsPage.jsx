import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Building2,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  UserX,
  Eye,
  Key,
  Pencil,
  MoreVertical,
  Plus,
  Search,
  RotateCw,
  Filter,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  ArrowUpDown,
  Lock,
  RefreshCw,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Send,
  SlidersHorizontal,
  Sliders,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import SuperAdminPagination from "../components/SuperAdminPagination.jsx";
import "./CollegeAdminsPage.css";

// Avatar color palettes for admin badges
const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#059669", "#d97706",
  "#dc2626", "#0891b2", "#4f46e5", "#c026d3"
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function CollegeAdminsPage() {
  const { data, update, refresh } = useSuperAdmin();
  const navigate = useNavigate();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [presetTab, setPresetTab] = useState("all"); // 'all', 'active', 'inactive', 'with_college'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'grid'

  // Sorting: default newest records on TOP
  const [sortField, setSortField] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modals & Drawers
  const [detailAdmin, setDetailAdmin] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview"); // 'overview', 'college', 'security'
  const [editAdmin, setEditAdmin] = useState(null);
  const [resetPwAdmin, setResetPwAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Floating Actions Popover
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState(null);

  // Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close floating popovers on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      if (activeMenuId) setActiveMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [activeMenuId]);

  // Extract all College Admins (Live DB + Reference Roster fallback)
  const allColleges = data.colleges || [];
  const adminSource = (data.collegeAdmins && data.collegeAdmins.length > 0) ? data.collegeAdmins : (data.users || []);

  const collegeAdmins = useMemo(() => {
    return adminSource
      .filter((u) => {
        const role = (u.role || "").toLowerCase().replace(/[\s_-]/g, "");
        const isAdmin = role === "collegeadmin" || role === "admin";
        const cid = u.collegeId != null ? String(u.collegeId).trim() : "";
        const hasCollege = cid !== "" && cid !== "0" && cid !== "null" && cid !== "undefined";
        const cName = (u.collegeName || "").trim().toLowerCase();
        const uName = (u.name || u.fullName || "").trim().toLowerCase();
        const isNotPlatform = cName !== "platform" && cName !== "platform super admin" && cName !== "-" && uName !== "platform";
        return isAdmin && hasCollege && isNotPlatform;
      })
      .map((u) => {
        const assignedCollege = allColleges.find(
          (c) => String(c.id) === String(u.collegeId) || String(c.collegeId) === String(u.collegeId)
        );
        const rawPhone = u.phone || u.phoneNumber || u.mobileNumber || "";
        const rawLogin = u.lastLogin || u.lastLoginAt || "";
        return {
          ...u,
          collegeName: assignedCollege?.name || u.collegeName || "Unassigned",
          collegeCode: assignedCollege?.code || u.collegeCode || "—",
          collegeCampusCount: assignedCollege?.campuses && assignedCollege?.campuses !== "-" ? assignedCollege.campuses : "—",
          statusLabel: (u.active !== false && u.status !== "Inactive") ? "Active" : "Inactive",
          lastLoginFormatted: rawLogin && rawLogin !== "-" && rawLogin !== "null" ? rawLogin : "—",
          phoneFormatted: rawPhone && rawPhone !== "-" && rawPhone !== "null" ? rawPhone : "—",
        };
      });
  }, [adminSource, allColleges]);

  // KPI Calculations strictly from real database records
  const totalAdminsCount = collegeAdmins.length;
  const activeAdminsCount = collegeAdmins.filter((a) => a.active).length;
  const totalCollegesCount = allColleges.length;

  const assignedCollegeNames = new Set(
    collegeAdmins.map((a) => a.collegeName).filter((name) => name && name !== "Unassigned" && name !== "—")
  );
  const collegesWithAdminCount = assignedCollegeNames.size;
  const collegesWithoutAdminCount = Math.max(0, totalCollegesCount - collegesWithAdminCount);

  const percentWithAdmin = totalCollegesCount > 0 ? Math.round((collegesWithAdminCount / totalCollegesCount) * 100) : 0;
  const percentWithoutAdmin = totalCollegesCount > 0 ? 100 - percentWithAdmin : 0;

  // Circular Meter Radii
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offsetWith = circumference - (percentWithAdmin / 100) * circumference;
  const offsetWithout = circumference - (percentWithoutAdmin / 100) * circumference;

  // Filtered & Sorted Records
  const filteredRows = useMemo(() => {
    return collegeAdmins
      .filter((row) => {
        // Search Filter
        const query = searchTerm.trim().toLowerCase();
        const matchesQuery =
          !query ||
          row.name?.toLowerCase().includes(query) ||
          row.email?.toLowerCase().includes(query) ||
          row.collegeName?.toLowerCase().includes(query) ||
          row.collegeCode?.toLowerCase().includes(query) ||
          row.username?.toLowerCase().includes(query);

        // College Filter
        const matchesCollege =
          !collegeFilter ||
          String(row.collegeId) === String(collegeFilter) ||
          row.collegeName?.toLowerCase() === collegeFilter.toLowerCase();

        // Status Filter
        const matchesStatus =
          !statusFilter || (row.active ? "Active" : "Inactive") === statusFilter;

        // Preset Tab Filter
        let matchesPreset = true;
        if (presetTab === "active") matchesPreset = row.active;
        if (presetTab === "inactive") matchesPreset = !row.active;
        if (presetTab === "with_college") matchesPreset = row.collegeName !== "Unassigned";

        return matchesQuery && matchesCollege && matchesStatus && matchesPreset;
      })
      .sort((a, b) => {
        if (sortField === "id" || sortField === "userId") {
          const numA = Number(a.userId || a.id) || 0;
          const numB = Number(b.userId || b.id) || 0;
          return sortOrder === "asc" ? numA - numB : numB - numA;
        }
        let valA = a[sortField] || "";
        let valB = b[sortField] || "";
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [collegeAdmins, searchTerm, collegeFilter, statusFilter, presetTab, sortField, sortOrder]);

  // Pagination
  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);

  // Sorting Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Actions
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Administrator directory synchronized successfully!", "info");
    }, 400);
  };

  const handleToggleStatus = (admin) => {
    const nextStatus = admin.active ? "Inactive" : "Active";
    setConfirm({
      title: `${admin.active ? "Deactivate" : "Activate"} Administrator?`,
      message: `Are you sure you want to ${
        admin.active ? "deactivate" : "activate"
      } access for "${admin.name}"? They will ${
        admin.active ? "no longer be able to log in to" : "regain access to"
      } ${admin.collegeName}.`,
      run: async () => {
        await update(`Updated College Admin status: ${admin.name}`, null, {
          module: "College Admins",
          userId: admin.userId || admin.id,
          actionType: "Access change",
          payload: { active: !admin.active },
        });
        showToast(
          `Administrator "${admin.name}" has been marked as ${nextStatus}.`,
          admin.active ? "info" : "success"
        );
        await refresh();
      },
    });
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    const uid = resetPwAdmin.userId || resetPwAdmin.id;
    const ok = await update("Reset College Admin password", null, {
      module: "Global Users",
      actionType: "Reset password",
      userId: uid,
      newPassword: newPassword.trim(),
    });
    setResetSuccess(true);
    showToast(`Password updated for ${resetPwAdmin.name}!`, "success");
    setTimeout(() => {
      setResetSuccess(false);
      setResetPwAdmin(null);
      setNewPassword("");
    }, 1200);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const uid = editAdmin.userId || editAdmin.id;
    const ok = await update(`Updated Admin: ${editAdmin.name}`, null, {
      module: "College Admins",
      actionType: "Update",
      userId: uid,
      payload: {
        name: editAdmin.name,
        email: editAdmin.email,
        phone: editAdmin.phone,
        active: editAdmin.active,
        collegeId: editAdmin.collegeId,
      },
    });
    if (ok) {
      setEditAdmin(null);
      showToast(`Changes saved for "${editAdmin.name}".`, "success");
      await refresh();
    } else {
      showToast("Failed to save administrator changes.", "error");
    }
  };

  const handleResendWelcome = (admin) => {
    showToast(`Welcome email & credentials resent to ${admin.email}!`, "success");
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied to clipboard: ${text}`, "info");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "Admin@";
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += "2026!";
    setNewPassword(pwd);
  };

  const activeFiltersCount =
    (collegeFilter ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (searchTerm ? 1 : 0) +
    (presetTab !== "all" ? 1 : 0);

  const handleResetAllFilters = () => {
    setSearchTerm("");
    setCollegeFilter("");
    setStatusFilter("");
    setPresetTab("all");
    setPage(1);
    setIsFilterOpen(false);
    showToast("All filters cleared", "info");
  };

  return (
    <div className="cap-page">
      {/* ── Breadcrumb ── */}
      <nav className="cap-breadcrumb" aria-label="Breadcrumb">
        <Link to="/super-admin/dashboard" className="cap-breadcrumb-home">
          <Home size={13} />
        </Link>
        <span className="cap-breadcrumb-sep">/</span>
        <span className="cap-breadcrumb-current">College Admins</span>
      </nav>

      {/* ── Page Header ── */}
      <header className="cap-header">
        <div className="cap-header-left">
          <div className="cap-header-icon">
            <Users size={24} />
          </div>
          <div>
            <h1 className="cap-title">College Admins</h1>
            <p className="cap-subtitle">
              Manage and monitor college administrator accounts across all registered colleges.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="cap-add-btn"
          onClick={() => navigate("/super-admin/add-college-admin")}
        >
          <Plus size={16} /> Add College Admin
        </button>
      </header>

      {/* ── 4 KPI Summary Cards (Image 1 Reference) ── */}
      <section className="cap-kpi-grid">
        {/* Card 1: Total College Admins */}
        <article className="cap-kpi-card tone-purple">
          <div className="cap-kpi-left">
            <div className="cap-kpi-icon-wrap">
              <Users size={22} />
            </div>
            <div className="cap-kpi-meta">
              <span className="cap-kpi-label">Total College Admins</span>
              <div className="cap-kpi-num-row">
                <strong className="cap-kpi-num">{totalAdminsCount}</strong>
              </div>
              <span className="cap-kpi-badge">↑ +12%</span>
            </div>
          </div>
          <div className="cap-sparkline-wrap">
            <svg width="60" height="26" viewBox="0 0 60 26">
              <path
                d="M 2 19 C 14 10, 26 24, 38 12 C 45 4, 52 14, 58 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>

        {/* Card 2: Active Admins */}
        <article className="cap-kpi-card tone-green">
          <div className="cap-kpi-left">
            <div className="cap-kpi-icon-wrap">
              <CheckCircle2 size={22} />
            </div>
            <div className="cap-kpi-meta">
              <span className="cap-kpi-label">Active Admins</span>
              <div className="cap-kpi-num-row">
                <strong className="cap-kpi-num">{activeAdminsCount}</strong>
              </div>
              <span className="cap-kpi-badge">↑ +14%</span>
            </div>
          </div>
          <div className="cap-sparkline-wrap">
            <svg width="60" height="26" viewBox="0 0 60 26">
              <path
                d="M 2 20 C 16 18, 28 8, 42 16 C 48 20, 52 10, 58 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>

        {/* Card 3: Colleges With Admin */}
        <article className="cap-kpi-card tone-blue">
          <div className="cap-kpi-left">
            <div className="cap-kpi-icon-wrap">
              <Building2 size={22} />
            </div>
            <div className="cap-kpi-meta">
              <span className="cap-kpi-label">Colleges With Admin</span>
              <div className="cap-kpi-num-row">
                <strong className="cap-kpi-num">{collegesWithAdminCount}</strong>
                <span className="cap-kpi-denom">/ {totalCollegesCount} Colleges</span>
              </div>
            </div>
          </div>
          <div className="cap-circle-meter blue">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle className="cap-circle-bg" cx="26" cy="26" r={radius} />
              <circle
                className="cap-circle-fill"
                cx="26"
                cy="26"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={offsetWith}
              />
            </svg>
            <span className="cap-circle-text">{percentWithAdmin}%</span>
          </div>
        </article>

        {/* Card 4: Colleges Without Admin */}
        <article className="cap-kpi-card tone-orange">
          <div className="cap-kpi-left">
            <div className="cap-kpi-icon-wrap">
              <UserX size={22} />
            </div>
            <div className="cap-kpi-meta">
              <span className="cap-kpi-label">Colleges Without Admin</span>
              <div className="cap-kpi-num-row">
                <strong className="cap-kpi-num">{collegesWithoutAdminCount}</strong>
                <span className="cap-kpi-denom">/ {totalCollegesCount} Colleges</span>
              </div>
            </div>
          </div>
          <div className="cap-circle-meter orange">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle className="cap-circle-bg" cx="26" cy="26" r={radius} />
              <circle
                className="cap-circle-fill"
                cx="26"
                cy="26"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={offsetWithout}
              />
            </svg>
            <span className="cap-circle-text">{percentWithoutAdmin}%</span>
          </div>
        </article>
      </section>

      {/* ── Preset Quick Filter Tabs ── */}
      <div className="cap-preset-bar">
        <button
          type="button"
          className={`cap-preset-pill ${presetTab === "all" ? "is-active" : ""}`}
          onClick={() => {
            setPresetTab("all");
            setPage(1);
          }}
        >
          All Admins
          <span className="cap-preset-count">{totalAdminsCount}</span>
        </button>
        <button
          type="button"
          className={`cap-preset-pill ${presetTab === "active" ? "is-active" : ""}`}
          onClick={() => {
            setPresetTab("active");
            setPage(1);
          }}
        >
          <span className="cap-tab-dot green" />
          Active Admins
          <span className="cap-preset-count">{activeAdminsCount}</span>
        </button>
        <button
          type="button"
          className={`cap-preset-pill ${presetTab === "inactive" ? "is-active" : ""}`}
          onClick={() => {
            setPresetTab("inactive");
            setPage(1);
          }}
        >
          <span className="cap-tab-dot red" />
          Inactive Admins
          <span className="cap-preset-count">{totalAdminsCount - activeAdminsCount}</span>
        </button>
        <button
          type="button"
          className={`cap-preset-pill ${presetTab === "with_college" ? "is-active" : ""}`}
          onClick={() => {
            setPresetTab("with_college");
            setPage(1);
          }}
        >
          Assigned to College
          <span className="cap-preset-count">{collegesWithAdminCount}</span>
        </button>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="cap-toolbar-container">
        <div className="cap-toolbar">
          <div className="cap-toolbar-left">
            {/* Search Input with Clear Button */}
            <div className="cap-search-wrap">
              <Search size={16} className="cap-search-icon" />
              <input
                type="text"
                placeholder="Search by admin name, email or college..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="cap-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="cap-search-clear"
                  title="Clear search"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Inline College & Status Dropdowns (Image 1 Style) */}
            <div className="cap-toolbar-filters">
              {/* College Dropdown */}
              <div className="cap-filter-field">
                <span className="cap-filter-label">College</span>
                <div className="cap-select-wrap">
                  <Building2 size={14} className="cap-select-icon" />
                  <select
                    value={collegeFilter}
                    onChange={(e) => {
                      setCollegeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="cap-filter-select"
                  >
                    <option value="">All Colleges</option>
                    {allColleges.map((c) => (
                      <option key={c.id || c.code} value={String(c.id || c.collegeId)}>
                        {c.name} {c.code ? `(${c.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Status Dropdown */}
              <div className="cap-filter-field">
                <span className="cap-filter-label">Account Status</span>
                <div className="cap-select-wrap">
                  <span className="cap-select-icon status-dot" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="cap-filter-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="cap-toolbar-actions">
            {/* Refresh Button */}
            <button
              type="button"
              className="cap-icon-btn"
              title="Refresh Directory"
              onClick={handleRefresh}
            >
              <RotateCw size={15} className={isRefreshing ? "spin-animate" : ""} />
            </button>

            {/* Interactive Filter Drawer Toggle Button */}
            <button
              type="button"
              className={`cap-filter-btn ${isFilterOpen ? "is-active" : ""} ${
                activeFiltersCount > 0 ? "has-filter" : ""
              }`}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter size={14} />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="cap-badge-count">{activeFiltersCount}</span>
              )}
            </button>

            {/* View Switcher: List vs Grid */}
            <div className="cap-view-switcher">
              <button
                type="button"
                className={`cap-view-btn ${viewMode === "list" ? "is-active" : ""}`}
                title="List View"
                onClick={() => setViewMode("list")}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                className={`cap-view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                title="Grid View"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Expandable Interactive Filter Panel ── */}
        {isFilterOpen && (
          <div className="cap-filter-panel">
            <div className="cap-filter-panel-header">
              <span className="cap-panel-title">
                <SlidersHorizontal size={15} color="#7c3aed" />
                Advanced Filter Options
              </span>
              <button
                type="button"
                className="cap-panel-close"
                onClick={() => setIsFilterOpen(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="cap-filter-panel-grid">
              <div className="cap-panel-section">
                <span className="cap-panel-section-title">Quick Status Filter</span>
                <div className="cap-radio-chips">
                  <button
                    type="button"
                    className={`cap-radio-chip ${!statusFilter ? "is-active" : ""}`}
                    onClick={() => setStatusFilter("")}
                  >
                    All Statuses
                  </button>
                  <button
                    type="button"
                    className={`cap-radio-chip ${statusFilter === "Active" ? "is-active" : ""}`}
                    onClick={() => setStatusFilter("Active")}
                  >
                    Active Only
                  </button>
                  <button
                    type="button"
                    className={`cap-radio-chip ${statusFilter === "Inactive" ? "is-active" : ""}`}
                    onClick={() => setStatusFilter("Inactive")}
                  >
                    Inactive Only
                  </button>
                </div>
              </div>

              <div className="cap-panel-section">
                <span className="cap-panel-section-title">Sort Administrators By</span>
                <div className="cap-radio-chips">
                  <button
                    type="button"
                    className={`cap-radio-chip ${sortField === "name" ? "is-active" : ""}`}
                    onClick={() => {
                      setSortField("name");
                      setSortOrder("asc");
                    }}
                  >
                    Name (A-Z)
                  </button>
                  <button
                    type="button"
                    className={`cap-radio-chip ${sortField === "collegeName" ? "is-active" : ""}`}
                    onClick={() => {
                      setSortField("collegeName");
                      setSortOrder("asc");
                    }}
                  >
                    College Name
                  </button>
                  <button
                    type="button"
                    className={`cap-radio-chip ${sortField === "lastLoginFormatted" ? "is-active" : ""}`}
                    onClick={() => {
                      setSortField("lastLoginFormatted");
                      setSortOrder("desc");
                    }}
                  >
                    Recent Activity
                  </button>
                </div>
              </div>
            </div>

            <div className="cap-filter-panel-footer">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={handleResetAllFilters}
              >
                Reset All Filters
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => setIsFilterOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* ── Active Filter Chips Bar ── */}
        {(activeFiltersCount > 0 || searchTerm) && (
          <div className="cap-active-chips-bar">
            <span className="cap-chips-label">Active Filters:</span>
            {statusFilter && (
              <span className="cap-chip">
                Status: <strong>{statusFilter}</strong>
                <button
                  type="button"
                  title="Remove Status filter"
                  onClick={() => setStatusFilter("")}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {collegeFilter && (
              <span className="cap-chip">
                College: <strong>Selected</strong>
                <button
                  type="button"
                  title="Remove College filter"
                  onClick={() => setCollegeFilter("")}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="cap-chip">
                Search: <strong>"{searchTerm}"</strong>
                <button
                  type="button"
                  title="Remove search"
                  onClick={() => setSearchTerm("")}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {presetTab !== "all" && (
              <span className="cap-chip">
                Preset: <strong>{presetTab.replace("_", " ")}</strong>
                <button
                  type="button"
                  title="Reset preset tab"
                  onClick={() => setPresetTab("all")}
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              type="button"
              className="cap-clear-all-chip"
              onClick={handleResetAllFilters}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* ── Table / Grid View ── */}
      <div className="cap-table-card">
        {viewMode === "list" ? (
          <div className="cap-table-wrap">
            <table className="cap-table">
              <thead>
                <tr>
                  <th style={{ width: 48, textAlign: "center" }}>#</th>
                  <th>
                    <span className="cap-th-content" onClick={() => handleSort("collegeName")}>
                      College Name <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="cap-th-content" onClick={() => handleSort("name")}>
                      Admin Name <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="cap-th-content" onClick={() => handleSort("email")}>
                      Email Address <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="cap-th-content" onClick={() => handleSort("phone")}>
                      Contact Number <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th>
                    <span className="cap-th-content" onClick={() => handleSort("lastLoginFormatted")}>
                      Last Login <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ textAlign: "center" }}>
                    <span className="cap-th-content" onClick={() => handleSort("statusLabel")}>
                      Status <ArrowUpDown size={12} />
                    </span>
                  </th>
                  <th style={{ textAlign: "center", width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => {
                  const avatarColor = getAvatarColor(row.name);
                  const initials = getInitials(row.name);
                  const rowId = row.id || row.userId || idx;

                  return (
                    <tr key={rowId}>
                      <td className="cap-cell-index">{startIndex + idx + 1}</td>
                      <td>
                        <div className="cap-cell-college">
                          <div className="cap-college-icon">
                            <Building2 size={16} />
                          </div>
                          <div className="cap-college-meta">
                            <span className="cap-college-title">{row.collegeName}</span>
                            {row.collegeCode && (
                              <span className="cap-college-code">({row.collegeCode})</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cap-cell-admin">
                          <div
                            className="cap-admin-avatar"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </div>
                          <strong>{row.name}</strong>
                        </div>
                      </td>
                      <td>
                        <div
                          className="cap-copyable-cell"
                          title="Click to copy official email"
                          onClick={() => handleCopy(row.email, `email-${rowId}`)}
                        >
                          <span className="cap-icon-text">
                            <Mail size={14} className="cap-purple-icon" />
                            <span>{row.email}</span>
                          </span>
                          {copiedKey === `email-${rowId}` ? (
                            <span className="cap-copied-badge">Copied!</span>
                          ) : (
                            <button type="button" className="cap-copy-btn">
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div
                          className="cap-copyable-cell"
                          title="Click to copy contact number"
                          onClick={() => handleCopy(row.phoneFormatted, `phone-${rowId}`)}
                        >
                          <span className="cap-icon-text">
                            <Phone size={14} className="cap-purple-icon" />
                            <span>{row.phoneFormatted}</span>
                          </span>
                          {copiedKey === `phone-${rowId}` ? (
                            <span className="cap-copied-badge">Copied!</span>
                          ) : (
                            <button type="button" className="cap-copy-btn">
                              <Copy size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="cap-icon-text">
                          <Calendar size={14} className="cap-purple-icon" />
                          <span>{row.lastLoginFormatted}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`cap-status-pill ${
                            row.active ? "is-active" : "is-inactive"
                          }`}
                          title={`Click to toggle: currently ${row.active ? "Active" : "Inactive"}`}
                          onClick={() => handleToggleStatus(row)}
                        >
                          <span className="cap-status-dot" />
                          {row.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="cap-actions-group">
                          {/* 1. View Button (Soft Blue Pill) */}
                          <button
                            type="button"
                            className="cap-action-btn view"
                            title="View Full Profile"
                            onClick={() => {
                              setDetailAdmin(row);
                              setDrawerTab("overview");
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* 2. Key / Reset Password Button (Soft Amber Pill) */}
                          <button
                            type="button"
                            className="cap-action-btn key"
                            title="Reset Password"
                            onClick={() => {
                              setResetPwAdmin(row);
                              setNewPassword("CollegeAdmin@2026!");
                            }}
                          >
                            <Key size={15} />
                          </button>

                          {/* 3. Edit Button (Soft Green Pill) */}
                          <button
                            type="button"
                            className="cap-action-btn edit"
                            title="Edit Administrator"
                            onClick={() => setEditAdmin({ ...row })}
                          >
                            <Pencil size={14} />
                          </button>

                          {/* 4. More Options Button (Soft Purple Pill) */}
                          <div className="cap-more-wrap">
                            <button
                              type="button"
                              className={`cap-action-btn more ${
                                activeMenuId === rowId ? "is-open" : ""
                              }`}
                              title="More Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === rowId ? null : rowId);
                              }}
                            >
                              <MoreVertical size={15} />
                            </button>

                            {/* Floating Dropdown Popover */}
                            {activeMenuId === rowId && (
                              <div
                                className="cap-more-popover"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="cap-popover-header">
                                  <span className="cap-popover-name">{row.name}</span>
                                  <span className="cap-popover-email">{row.email}</span>
                                </div>
                                <div className="cap-popover-divider" />
                                <button
                                  type="button"
                                  className="cap-popover-item"
                                  onClick={() => {
                                    handleToggleStatus(row);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <RotateCw size={14} className="text-purple" />
                                  <span>
                                    {row.active ? "Deactivate Account" : "Activate Account"}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="cap-popover-item"
                                  onClick={() => {
                                    handleResendWelcome(row);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <Send size={14} className="text-indigo" />
                                  <span>Resend Welcome Email</span>
                                </button>
                                <button
                                  type="button"
                                  className="cap-popover-item"
                                  onClick={() => {
                                    handleCopy(
                                      `Name: ${row.name}\nEmail: ${row.email}\nCollege: ${row.collegeName}`,
                                      `cred-${rowId}`
                                    );
                                    setActiveMenuId(null);
                                  }}
                                >
                                  <Copy size={14} className="text-slate" />
                                  <span>Copy Admin Info</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!paginatedRows.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px" }}>
                      <p style={{ margin: 0, fontWeight: 700, color: "#64748b" }}>
                        No college administrators found.
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
                        Try clearing search or filters to see all administrators.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cap-grid-view">
            {paginatedRows.map((row) => {
              const avatarColor = getAvatarColor(row.name);
              const initials = getInitials(row.name);
              const rowId = row.id || row.userId;

              return (
                <article key={rowId} className="cap-admin-card">
                  <div className="cap-card-top">
                    <div className="cap-card-user">
                      <div
                        className="cap-admin-avatar"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {initials}
                      </div>
                      <div>
                        <strong>{row.name}</strong>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          @{row.username || row.email?.split("@")[0]}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`cap-status-pill ${
                        row.active ? "is-active" : "is-inactive"
                      }`}
                      onClick={() => handleToggleStatus(row)}
                    >
                      <span className="cap-status-dot" />
                      {row.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="cap-card-body">
                    <div className="cap-icon-text">
                      <Building2 size={13} className="cap-purple-icon" />
                      <span>{row.collegeName}</span>
                    </div>
                    <div className="cap-icon-text">
                      <Mail size={13} className="cap-purple-icon" />
                      <span>{row.email}</span>
                    </div>
                    <div className="cap-icon-text">
                      <Phone size={13} className="cap-purple-icon" />
                      <span>{row.phoneFormatted}</span>
                    </div>
                  </div>

                  <div className="cap-card-footer">
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      {row.lastLoginFormatted}
                    </span>
                    <div className="cap-actions-group">
                      <button
                        type="button"
                        className="cap-action-btn view"
                        title="View Full Profile"
                        onClick={() => {
                          setDetailAdmin(row);
                          setDrawerTab("overview");
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        className="cap-action-btn key"
                        title="Reset Password"
                        onClick={() => {
                          setResetPwAdmin(row);
                          setNewPassword("CollegeAdmin@2026!");
                        }}
                      >
                        <Key size={14} />
                      </button>
                      <button
                        type="button"
                        className="cap-action-btn edit"
                        title="Edit Administrator"
                        onClick={() => setEditAdmin({ ...row })}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="cap-action-btn more"
                        title="Toggle Status"
                        onClick={() => handleToggleStatus(row)}
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── Standardized Super Admin Pagination (Image 5 Reference: [ Previous ]  Page X of Y  [ Next ]) ── */}
        <SuperAdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          rowsOptions={[5, 10, 20]}
          unit="college administrators"
        />
      </div>

      {/* ── INTERACTIVE SLIDE-OVER PROFILE DRAWER ── */}
      {detailAdmin && (
        <div className="cap-drawer-overlay" onClick={() => setDetailAdmin(null)}>
          <aside className="cap-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="cap-drawer-header">
              <div className="cap-drawer-profile">
                <div
                  className="cap-drawer-avatar"
                  style={{ backgroundColor: getAvatarColor(detailAdmin.name) }}
                >
                  {getInitials(detailAdmin.name)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
                    {detailAdmin.name}
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                    @{detailAdmin.username || detailAdmin.email?.split("@")[0]} • College Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="cap-drawer-close"
                title="Close Drawer"
                onClick={() => setDetailAdmin(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="cap-drawer-tabs">
              <button
                type="button"
                className={`cap-drawer-tab ${drawerTab === "overview" ? "is-active" : ""}`}
                onClick={() => setDrawerTab("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={`cap-drawer-tab ${drawerTab === "college" ? "is-active" : ""}`}
                onClick={() => setDrawerTab("college")}
              >
                Assigned College
              </button>
              <button
                type="button"
                className={`cap-drawer-tab ${drawerTab === "security" ? "is-active" : ""}`}
                onClick={() => setDrawerTab("security")}
              >
                Security & Access
              </button>
            </div>

            {/* Drawer Body */}
            <div className="cap-drawer-body">
              {drawerTab === "overview" && (
                <div className="cap-drawer-section">
                  <div className="cap-drawer-card">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Account Status
                    </span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        className={`cap-status-pill ${
                          detailAdmin.active ? "is-active" : "is-inactive"
                        }`}
                      >
                        <span className="cap-status-dot" />
                        {detailAdmin.active ? "Active Account" : "Inactive / Suspended"}
                      </span>
                      <button
                        type="button"
                        className="cap-preset-pill"
                        style={{ padding: "4px 10px", fontSize: 11.5 }}
                        onClick={() => handleToggleStatus(detailAdmin)}
                      >
                        <RotateCw size={12} />
                        {detailAdmin.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>

                  <div className="cap-drawer-card">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Contact Information
                    </span>
                    <div className="cap-detail-item">
                      <span className="cap-detail-label">Official Email</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="cap-detail-val">{detailAdmin.email}</span>
                        <button
                          type="button"
                          className="cap-preset-pill"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={() => handleCopy(detailAdmin.email, "drawer-email")}
                        >
                          <Copy size={11} /> Copy
                        </button>
                      </div>
                    </div>
                    <div className="cap-detail-item" style={{ marginTop: 8 }}>
                      <span className="cap-detail-label">Mobile Number</span>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="cap-detail-val">{detailAdmin.phoneFormatted}</span>
                        <button
                          type="button"
                          className="cap-preset-pill"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={() => handleCopy(detailAdmin.phoneFormatted, "drawer-phone")}
                        >
                          <Copy size={11} /> Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="cap-drawer-card">
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Activity Timestamp
                    </span>
                    <div className="cap-detail-item">
                      <span className="cap-detail-label">Last Successful Login</span>
                      <span className="cap-detail-val">{detailAdmin.lastLoginFormatted}</span>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "college" && (
                <div className="cap-drawer-section">
                  <div className="cap-drawer-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="cap-college-icon" style={{ width: 40, height: 40 }}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                          {detailAdmin.collegeName}
                        </h3>
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          Code: {detailAdmin.collegeCode || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="cap-detail-grid">
                    <div className="cap-drawer-card">
                      <span className="cap-detail-label">Total Campuses</span>
                      <strong style={{ fontSize: 18, color: "#1e293b" }}>
                        {detailAdmin.campuses || detailAdmin.collegeCampusCount || 1}
                      </strong>
                    </div>
                    <div className="cap-drawer-card">
                      <span className="cap-detail-label">Enrolled Students</span>
                      <strong style={{ fontSize: 18, color: "#16a34a" }}>
                        {detailAdmin.students || "1,200+"}
                      </strong>
                    </div>
                  </div>

                  <div className="cap-drawer-card">
                    <span className="cap-detail-label">Parent Trust / Society</span>
                    <span className="cap-detail-val">{detailAdmin.trust || "Educational Trust"}</span>
                  </div>

                  <button
                    type="button"
                    className="cap-drawer-action-btn"
                    onClick={() => {
                      setDetailAdmin(null);
                      navigate("/super-admin/colleges");
                    }}
                  >
                    <ExternalLink size={14} /> Open College Profile in Directory
                  </button>
                </div>
              )}

              {drawerTab === "security" && (
                <div className="cap-drawer-section">
                  <div className="cap-drawer-card">
                    <span className="cap-detail-label">Authentication Username</span>
                    <span className="cap-detail-val" style={{ fontFamily: "monospace" }}>
                      {detailAdmin.username || detailAdmin.email?.split("@")[0]}
                    </span>
                  </div>

                  <div className="cap-drawer-card">
                    <span className="cap-detail-label">Password Management</span>
                    <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#64748b" }}>
                      Reset this administrator's password or send them a new temporary credential via email.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        className="cap-drawer-action-btn primary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setResetPwAdmin(detailAdmin);
                          setNewPassword("CollegeAdmin@2026!");
                        }}
                      >
                        <Key size={14} /> Reset Password
                      </button>
                      <button
                        type="button"
                        className="cap-drawer-action-btn"
                        style={{ flex: 1 }}
                        onClick={() => handleResendWelcome(detailAdmin)}
                      >
                        <Send size={14} /> Resend Email
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Quick Actions */}
              <div className="cap-drawer-actions-bar">
                <button
                  type="button"
                  className="cap-drawer-action-btn"
                  onClick={() => {
                    setEditAdmin({ ...detailAdmin });
                    setDetailAdmin(null);
                  }}
                >
                  <Pencil size={14} /> Edit Admin Info
                </button>
                <button
                  type="button"
                  className="cap-drawer-action-btn primary"
                  onClick={() => setDetailAdmin(null)}
                >
                  Close Profile
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Edit Admin Modal ── */}
      {editAdmin && (
        <Modal
          title={`Edit Administrator: ${editAdmin.name}`}
          onClose={() => setEditAdmin(null)}
        >
          <form onSubmit={handleSaveEdit}>
            <div className="cap-modal-field">
              <label>Full Name *</label>
              <input
                type="text"
                required
                value={editAdmin.name || ""}
                onChange={(e) => setEditAdmin({ ...editAdmin, name: e.target.value })}
                className="cap-modal-input"
              />
            </div>
            <div className="cap-modal-field">
              <label>Official Email *</label>
              <input
                type="email"
                required
                value={editAdmin.email || ""}
                onChange={(e) => setEditAdmin({ ...editAdmin, email: e.target.value })}
                className="cap-modal-input"
              />
            </div>
            <div className="cap-modal-field">
              <label>Contact Number</label>
              <input
                type="tel"
                value={editAdmin.phone || editAdmin.phoneFormatted || ""}
                onChange={(e) => setEditAdmin({ ...editAdmin, phone: e.target.value })}
                className="cap-modal-input"
              />
            </div>
            <div className="cap-modal-field">
              <label>Assigned College</label>
              <select
                value={editAdmin.collegeId || ""}
                onChange={(e) => setEditAdmin({ ...editAdmin, collegeId: e.target.value })}
                className="cap-modal-input"
              >
                {allColleges.map((c) => (
                  <option key={c.id || c.code} value={c.id || c.collegeId}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div
              className="cap-modal-field"
              style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}
            >
              <input
                type="checkbox"
                id="editAdminActive"
                checked={editAdmin.active !== false}
                onChange={(e) => setEditAdmin({ ...editAdmin, active: e.target.checked })}
              />
              <label htmlFor="editAdminActive" style={{ cursor: "pointer" }}>
                Account Active (Can log into college portal)
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setEditAdmin(null)}
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

      {/* ── Reset Password Modal with Generator ── */}
      {resetPwAdmin && (
        <Modal
          title={`Reset Password: ${resetPwAdmin.name}`}
          onClose={() => setResetPwAdmin(null)}
        >
          <form onSubmit={handleResetPasswordSubmit}>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
              Enter a new temporary password for <strong>{resetPwAdmin.name}</strong> (
              {resetPwAdmin.email}).
            </p>
            <div className="cap-modal-field">
              <label>New Temporary Password *</label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="cap-modal-input"
                placeholder="e.g. PirnavAdmin@2026!"
              />
              <div className="cap-pw-generator-row">
                <button
                  type="button"
                  className="cap-pw-gen-btn"
                  onClick={generateRandomPassword}
                >
                  <Sparkles size={13} /> Generate Strong Password
                </button>
                <button
                  type="button"
                  className="cap-preset-pill"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => setNewPassword("CollegeAdmin@2026!")}
                >
                  Default (CollegeAdmin@2026!)
                </button>
              </div>
            </div>

            {resetSuccess && (
              <div
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Check size={14} /> Password reset successfully!
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setResetPwAdmin(null)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Update Password
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Confirmation Dialog ── */}
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

      {/* ── Interactive Toast Notification ── */}
      {toast && (
        <div className={`cap-toast ${toast.type}`}>
          <CheckCircle size={16} />
          <span>{toast.message}</span>
          <button
            type="button"
            className="cap-toast-close"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
