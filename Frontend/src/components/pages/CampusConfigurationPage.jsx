import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  ArrowLeft, 
  Building, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  Radio, 
  Landmark, 
  ChevronDown,
  RefreshCw
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import * as campusApi from "@/api/campusApi.js";
import "./CampusConfigurationPage.css";

const FALLBACK_BOARDS = [
  { id: 1, boardId: 1, code: "BIEAP", name: "Board of Intermediate Education, Andhra Pradesh", boardName: "Board of Intermediate Education, Andhra Pradesh" },
  { id: 2, boardId: 2, code: "TGBIE", name: "Telangana Board of Intermediate Education", boardName: "Telangana Board of Intermediate Education" },
  { id: 3, boardId: 3, code: "CBSE", name: "Central Board of Secondary Education", boardName: "Central Board of Secondary Education" },
  { id: 4, boardId: 4, code: "CISCE", name: "Council for the Indian School Certificate Examinations", boardName: "Council for the Indian School Certificate Examinations" },
  { id: 5, boardId: 5, code: "PUC-KA", name: "Karnataka Pre-University Education", boardName: "Karnataka Pre-University Education" },
  { id: 6, boardId: 6, code: "DGE-TN", name: "Tamil Nadu State Board – Higher Secondary", boardName: "Tamil Nadu State Board – Higher Secondary" },
];

export default function CampusConfigurationPage() {
  const { 
    campuses, 
    selectedCampus, 
    setSelectedCampus, 
    addCampus, 
    updateCampus, 
    deleteCampus,
    toggleCampusStatus,
    fetchCampuses,
    loading: contextLoading 
  } = useCampusContext();

  const { boards: contextBoards } = useAcademicContext();

  // Combine and deduplicate available boards with IDs
  const availableBoards = useMemo(() => {
    const combined = [...(contextBoards || []), ...FALLBACK_BOARDS];
    const map = new Map();
    combined.forEach((b, idx) => {
      const name = b.name || b.boardName || b.code;
      const code = b.code || b.boardCode || name;
      const id = Number(b.id || b.boardId || idx + 1);
      if (name && !map.has(name)) {
        map.set(name, { id, boardId: id, code, name });
      }
    });
    return Array.from(map.values());
  }, [contextBoards]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);

  // Backend Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    boards: ["Board of Intermediate Education, Andhra Pradesh"],
    status: "Active (Displays in Header Selector)",
  });

  const [formError, setFormError] = useState("");

  // Load live statistics from /api/v1/campuses/stats
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const selectedId = selectedCampus?.campusId || selectedCampus?.id;
      const statsData = await campusApi.getCampusStats(selectedId);
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.warn("Could not load campus stats from API:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedCampus]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Filtered Campuses
  const filteredCampuses = useMemo(() => {
    return campuses.filter((c) => {
      const boardsText = (c.boards || []).join(" ").toLowerCase();
      const matchSearch =
        (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        boardsText.includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && (c.status === "Active" || c.status === "Active (Displays in Header Selector)" || c.isActive === true)) ||
        (statusFilter === "Inactive" && (c.status === "Inactive" || c.isActive === false));

      return matchSearch && matchStatus;
    });
  }, [campuses, searchTerm, statusFilter]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingCampus(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      phone: "",
      email: "",
      boards: ["Board of Intermediate Education, Andhra Pradesh"],
      status: "Active (Displays in Header Selector)",
    });
    setBoardDropdownOpen(false);
    setFormError("");
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (campus) => {
    setEditingCampus(campus);
    const existingBoards = Array.isArray(campus.affiliatedBoards) && campus.affiliatedBoards.length > 0
      ? campus.affiliatedBoards.map((b) => b.boardName || b.name || b.boardCode || b.code)
      : Array.isArray(campus.boards) && campus.boards.length > 0
      ? campus.boards
      : ["Board of Intermediate Education, Andhra Pradesh"];

    setFormData({
      name: campus.name || campus.campusName || "",
      code: campus.code || campus.campusCode || "",
      address: campus.address || "",
      phone: campus.phone || campus.contactPhone || "",
      email: campus.email || "",
      boards: existingBoards,
      status: (campus.status?.includes("Active") || campus.isActive) ? "Active (Displays in Header Selector)" : "Inactive",
    });
    setBoardDropdownOpen(false);
    setFormError("");
    setModalOpen(true);
  };

  // Toggle Board Selection
  const handleToggleBoard = (boardName) => {
    setFormData((prev) => {
      const exists = prev.boards.includes(boardName);
      if (exists) {
        if (prev.boards.length === 1) {
          setFormError("At least one board must be selected for the campus.");
          return prev;
        }
        setFormError("");
        return {
          ...prev,
          boards: prev.boards.filter((b) => b !== boardName),
        };
      } else {
        setFormError("");
        return {
          ...prev,
          boards: [...prev.boards, boardName],
        };
      }
    });
  };

  const handleSelectAllBoards = () => {
    setFormData((prev) => ({
      ...prev,
      boards: availableBoards.map((b) => b.name),
    }));
  };

  // Submit Modal Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Campus Name is required.");
      return;
    }
    if (!formData.code.trim()) {
      setFormError("Campus Code is required.");
      return;
    }
    if (!formData.boards || formData.boards.length === 0) {
      setFormError("Please select at least one affiliated board.");
      return;
    }

    // Resolve Board IDs from selected board names
    const resolvedBoardIds = formData.boards
      .map((bName) => {
        const found = availableBoards.find((b) => b.name === bName || b.boardName === bName || b.code === bName);
        return found ? Number(found.id || found.boardId) : null;
      })
      .filter((id) => id != null && !isNaN(id));

    const payload = {
      campusName: formData.name.trim(),
      campusCode: formData.code.trim().toUpperCase(),
      address: formData.address.trim(),
      contactPhone: formData.phone.trim(),
      email: formData.email.trim(),
      isHQ: editingCampus ? Boolean(editingCampus.isHQ) : false,
      isActive: formData.status.includes("Active"),
      boardIds: resolvedBoardIds.length > 0 ? resolvedBoardIds : [1],
    };

    try {
      setSubmitting(true);
      if (editingCampus) {
        const targetId = editingCampus.campusId ?? editingCampus.id;
        await updateCampus(targetId, payload);
      } else {
        await addCampus(payload);
      }
      setModalOpen(false);
      await loadStats();
      await fetchCampuses();
    } catch (err) {
      setFormError(err.message || "Failed to save campus branch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Handler
  const handleDelete = async (campus) => {
    if (campuses.length <= 1) {
      alert("Cannot delete the only configured campus branch.");
      return;
    }
    const targetId = campus.campusId ?? campus.id;
    if (window.confirm(`Are you sure you want to delete the campus "${campus.name || campus.campusName}"?`)) {
      try {
        await deleteCampus(targetId);
        await loadStats();
        await fetchCampuses();
      } catch (err) {
        alert(err.message || "Failed to delete campus.");
      }
    }
  };

  // Status Toggle Handler
  const handleToggleStatus = async (campus) => {
    const targetId = campus.campusId ?? campus.id;
    try {
      await toggleCampusStatus(targetId);
      await loadStats();
      await fetchCampuses();
    } catch (err) {
      alert(err.message || "Failed to toggle status.");
    }
  };

  // Helper to extract short code for board
  const getBoardCode = (boardName) => {
    const found = availableBoards.find((b) => b.name === boardName || b.boardName === boardName);
    if (found?.code) return found.code;
    if (boardName.includes("Andhra Pradesh")) return "BIEAP";
    if (boardName.includes("Telangana")) return "TGBIE";
    if (boardName.includes("Secondary Education")) return "CBSE";
    if (boardName.includes("Certificate Examinations")) return "CISCE";
    if (boardName.includes("Karnataka")) return "PUC-KA";
    if (boardName.includes("Tamil Nadu")) return "DGE-TN";
    return boardName.slice(0, 6).toUpperCase();
  };

  // Stats calculation with backend fallback
  const totalCount = stats?.totalCampuses ?? campuses.length;
  const activeCount = stats?.activeInHeader ?? campuses.filter((c) => c.status === "Active" || c.status === "Active (Displays in Header Selector)" || c.isActive).length;
  const inactiveCount = stats?.inactiveBranches ?? (totalCount - activeCount);

  return (
    <DashboardLayout
      title="Campus Configuration"
      subtitle="Manage multi-campus branches, branch codes, address, affiliated boards and active header branch selector."
      breadcrumb={["Home", "Settings", "Campus Configuration"]}
      backLink={
        <Link to="/dashboard/settings" className="campus-back-btn">
          <ArrowLeft size={16} /> Back to Settings
        </Link>
      }
    >
      <div className="campus-config-container">
        {/* Banner matching Image 2 */}
        <div className="campus-master-banner">
          <div className="campus-master-title-group">
            <div className="campus-master-icon">
              <Building2 size={22} />
            </div>
            <h2>Campus &amp; Branch Master</h2>
          </div>
          <button type="button" className="campus-btn-add-primary" onClick={handleOpenAdd}>
            <Plus size={16} /> Add Campus Branch
          </button>
        </div>

        {/* Stats Cards */}
        <div className="campus-stats-grid">
          <div className="campus-stat-card">
            <div className="campus-stat-icon purple">
              <Building2 size={22} />
            </div>
            <div className="campus-stat-info">
              <h4>Total Campuses</h4>
              <p>{totalCount}</p>
            </div>
          </div>

          <div className="campus-stat-card">
            <div className="campus-stat-icon green">
              <CheckCircle2 size={22} />
            </div>
            <div className="campus-stat-info">
              <h4>Active in Header</h4>
              <p>{activeCount}</p>
            </div>
          </div>

          <div className="campus-stat-card">
            <div className="campus-stat-icon slate">
              <Radio size={22} />
            </div>
            <div className="campus-stat-info">
              <h4>Inactive Branches</h4>
              <p>{inactiveCount}</p>
            </div>
          </div>

          <div className="campus-stat-card">
            <div className="campus-stat-icon blue">
              <Building size={22} />
            </div>
            <div className="campus-stat-info">
              <h4>Selected Branch</h4>
              <p style={{ fontSize: 14 }}>{selectedCampus?.name || selectedCampus?.campusName || "Main Campus"}</p>
              <small>{selectedCampus?.code || selectedCampus?.campusCode || "MAIN"}</small>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="campus-toolbar">
          <div className="campus-search-box">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search by campus name, code, board or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="campus-filter-tabs">
            {["All", "Active", "Inactive"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`campus-filter-btn ${statusFilter === tab ? "is-active" : ""}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Campuses Table */}
        <div className="campus-table-card">
          <table className="campus-table">
            <thead>
              <tr>
                <th>Campus / Branch Name</th>
                <th>Branch Code</th>
                <th>Affiliated Boards</th>
                <th>Address</th>
                <th>Contact Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampuses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No campus branches found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCampuses.map((campus) => {
                  const isSelected = String(selectedCampus?.id) === String(campus.id) || 
                                     String(selectedCampus?.campusId) === String(campus.campusId) ||
                                     selectedCampus?.code === campus.code;
                  const isActive = campus.isActive ?? (campus.status === "Active" || campus.status === "Active (Displays in Header Selector)");
                  const campusBoards = Array.isArray(campus.affiliatedBoards) && campus.affiliatedBoards.length > 0
                    ? campus.affiliatedBoards.map((b) => b.boardName || b.name || b.boardCode || b.code)
                    : Array.isArray(campus.boards) && campus.boards.length > 0 
                    ? campus.boards 
                    : ["Board of Intermediate Education, Andhra Pradesh"];

                  return (
                    <tr key={campus.campusId || campus.id} className={isSelected ? "is-selected" : ""}>
                      <td>
                        <div className="campus-name-cell">
                          <span className="campus-name-title">
                            {campus.name || campus.campusName}
                            {(campus.isHQ || campus.isDefault) && <span className="campus-active-badge">HQ</span>}
                            {isSelected && (
                              <span className="campus-active-badge" style={{ background: "#edf5ea", color: "var(--cms-primary, #5a6e38)", borderColor: "#cce8d1" }}>
                                Active in Header
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="campus-code-tag">{campus.code || campus.campusCode}</span>
                      </td>
                      <td>
                        <div className="campus-boards-cell">
                          {campusBoards.map((bName) => (
                            <span 
                              key={bName} 
                              className="campus-board-tag"
                              title={bName}
                            >
                              <Landmark size={11} style={{ marginRight: 3, opacity: 0.8 }} />
                              {getBoardCode(bName)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
                          <MapPin size={13} color="#94a3b8" />
                          <span>{campus.address || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
                          <Phone size={13} color="#94a3b8" />
                          <span>{campus.phone || campus.contactPhone || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569" }}>
                          <Mail size={13} color="#94a3b8" />
                          <span>{campus.email || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(campus)}
                          className={`campus-status-pill ${isActive ? "active" : "inactive"}`}
                          style={{ border: "none", cursor: "pointer", background: "none", padding: 0 }}
                          title="Click to toggle active status in header selector"
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isActive ? "#16a34a" : "#94a3b8" }} />
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="campus-actions-row" style={{ justifyContent: "flex-end" }}>
                          {!isSelected && (
                            <button
                              type="button"
                              className="campus-action-btn select-branch"
                              onClick={() => setSelectedCampus(campus)}
                              title="Select this branch in topbar"
                              aria-label="Select Branch"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="campus-action-btn edit"
                            onClick={() => handleOpenEdit(campus)}
                            title="Edit Campus Details"
                            aria-label="Edit Campus Details"
                          >
                            <Edit3 size={15} />
                          </button>
                          {campuses.length > 1 && (
                            <button
                              type="button"
                              className="campus-action-btn delete"
                              onClick={() => handleDelete(campus)}
                              title="Delete Campus"
                              aria-label="Delete Campus"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal matching Image 1 with Board Multi-Select */}
        {modalOpen && (
          <div className="campus-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="campus-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="campus-modal-header">
                <h3>{editingCampus ? "Edit Campus Branch" : "Add Campus Branch"}</h3>
                <button
                  type="button"
                  className="campus-modal-close-btn"
                  onClick={() => setModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {formError && (
                <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#b91c1c", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="campus-modal-form">
                <div className="campus-modal-field">
                  <label htmlFor="campusName">
                    Campus Name <span className="star">*</span>
                  </label>
                  <input
                    id="campusName"
                    type="text"
                    className="campus-modal-input"
                    placeholder="e.g. North Branch"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="campus-modal-field">
                  <label htmlFor="campusCode">
                    Campus Code <span className="star">*</span>
                  </label>
                  <input
                    id="campusCode"
                    type="text"
                    className="campus-modal-input"
                    placeholder="e.g. NORTH"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>

                {/* Board Multi-Selection */}
                <div className="campus-modal-field">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <label>
                      Affiliated Board(s) <span className="star">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllBoards}
                      style={{ background: "none", border: "none", color: "var(--cms-primary, #5a6e38)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}
                    >
                      Select All
                    </button>
                  </div>

                  {/* Dropdown / Multi-Select Picker */}
                  <div className="campus-board-selector-wrap">
                    <button
                      type="button"
                      className={`campus-board-dropdown-trigger ${boardDropdownOpen ? "is-open" : ""}`}
                      onClick={() => setBoardDropdownOpen((v) => !v)}
                    >
                      <div className="campus-board-selected-chips">
                        {formData.boards.length === 0 ? (
                          <span style={{ color: "#94a3b8", fontSize: 13 }}>Select affiliated education boards...</span>
                        ) : (
                          formData.boards.map((bName) => (
                            <span key={bName} className="campus-board-pill-chip">
                              {getBoardCode(bName)}
                              <span
                                className="chip-remove-x"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleBoard(bName);
                                }}
                              >
                                &times;
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                      <ChevronDown size={15} style={{ color: "#64748b", flexShrink: 0 }} />
                    </button>

                    {boardDropdownOpen && (
                      <div className="campus-board-dropdown-menu">
                        <div className="campus-board-menu-header">Select one or more education boards:</div>
                        <div className="campus-board-options-list">
                          {availableBoards.map((b) => {
                            const isChecked = formData.boards.includes(b.name) || formData.boards.includes(b.boardName);
                            return (
                              <label
                                key={b.name}
                                className={`campus-board-option-item ${isChecked ? "is-checked" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleBoard(b.name)}
                                />
                                <div className="campus-board-option-info">
                                  <strong>{b.code}</strong>
                                  <span>{b.name}</span>
                                </div>
                                {isChecked && <Check size={14} className="campus-board-check-icon" />}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="campus-modal-field">
                  <label htmlFor="campusAddress">Address</label>
                  <input
                    id="campusAddress"
                    type="text"
                    className="campus-modal-input"
                    placeholder="Full street address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="campus-modal-two-col">
                  <div className="campus-modal-field">
                    <label htmlFor="campusPhone">Contact Phone</label>
                    <input
                      id="campusPhone"
                      type="tel"
                      className="campus-modal-input"
                      placeholder="+1 555-..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="campus-modal-field">
                    <label htmlFor="campusEmail">Email</label>
                    <input
                      id="campusEmail"
                      type="email"
                      className="campus-modal-input"
                      placeholder="campus@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="campus-modal-field">
                  <label htmlFor="campusStatus">Initial Status</label>
                  <select
                    id="campusStatus"
                    className="campus-modal-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active (Displays in Header Selector)">
                      Active (Displays in Header Selector)
                    </option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="campus-modal-actions">
                  <button
                    type="button"
                    className="campus-btn-cancel"
                    onClick={() => setModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="campus-btn-save" disabled={submitting}>
                    {submitting ? "Saving..." : editingCampus ? "Save Changes" : "Save Campus"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
