import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Boxes,
  Plus,
  Search,
  Trash2,
  Edit2,
  ShieldAlert,
  ArrowLeft,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import { can, hasRole } from "@/features/rolesPermissions/permissionUtils.jsx";
import { ACTIONS } from "@/features/rolesPermissions/rolesPermissions.constants.js";
import {
  addScreen,
  getModulesAndPermissions,
} from "@/features/rolesPermissions/rolesPermissions.service.js";

export default function CustomModulePage() {
  const { moduleCode, screenCode } = useParams();
  const navigate = useNavigate();
  const user = getAuthUser();

  const [loading, setLoading] = useState(true);
  const [moduleMetadata, setModuleMetadata] = useState(null);
  const [modulesList, setModulesList] = useState([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Local storage dynamic records for this custom module/screen
  const storageKey = `cms_custom_data_${moduleCode}_${screenCode || "main"}`;
  const [records, setRecords] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [newEntryData, setNewEntryData] = useState({ title: "", description: "", category: "General", status: "Active" });
  const [isAddScreenOpen, setIsAddScreenOpen] = useState(false);
  const [newScreenName, setNewScreenName] = useState("");
  const [newScreenDescription, setNewScreenDescription] = useState("");

  const showToast = (message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  // Load module metadata
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getModulesAndPermissions()
      .then((res) => {
        if (!mounted) return;
        const catalog = res?.data || [];
        setModulesList(catalog);
        const cleanMod = String(moduleCode || "").toLowerCase().trim();
        const found = catalog.find((m) => m.id?.toLowerCase() === cleanMod);
        setModuleMetadata(found || null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [moduleCode]);

  // Sync records from localStorage when screen or module changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setRecords(raw ? JSON.parse(raw) : []);
    } catch {
      setRecords([]);
    }
  }, [storageKey]);

  // Active Screen
  const screens = moduleMetadata?.screens || [];
  const activeScreen = useMemo(() => {
    if (!screens.length) return null;
    if (screenCode) {
      return screens.find((s) => s.id?.toLowerCase() === screenCode.toLowerCase()) || screens[0];
    }
    return screens[0];
  }, [screens, screenCode]);

  // Permission Checks
  const effectiveScreenId = activeScreen?.id || screenCode || null;
  const isSuperAdmin = hasRole("SUPER_ADMIN", user);
  const canView = isSuperAdmin || can(moduleCode, ACTIONS.VIEW, undefined, user, effectiveScreenId);
  const canCreate = isSuperAdmin || can(moduleCode, ACTIONS.CREATE, undefined, user, effectiveScreenId);
  const canEdit = isSuperAdmin || can(moduleCode, ACTIONS.EDIT, undefined, user, effectiveScreenId);
  const canDelete = isSuperAdmin || can(moduleCode, ACTIONS.DELETE, undefined, user, effectiveScreenId);

  // Save new entry
  const handleSaveEntry = (e) => {
    e.preventDefault();
    if (!newEntryData.title.trim()) {
      showToast("Please provide an entry title", "error");
      return;
    }
    const newRecord = {
      id: Date.now().toString(),
      ...newEntryData,
      createdAt: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      createdBy: user?.fullName || user?.name || user?.username || "Admin",
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
    setIsNewEntryOpen(false);
    setNewEntryData({ title: "", description: "", category: "General", status: "Active" });
    showToast("Record added successfully");
  };

  // Delete an entry
  const handleDeleteEntry = (id) => {
    if (!canDelete) {
      showToast("You do not have permission to delete records", "error");
      return;
    }
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
    showToast("Record removed");
  };

  // Add screen to this module
  const handleAddScreen = async (e) => {
    e.preventDefault();
    if (!newScreenName.trim()) {
      showToast("Screen name is required", "error");
      return;
    }
    const sId = newScreenName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
    try {
      await addScreen(moduleCode, {
        id: sId,
        name: newScreenName.trim(),
        description: newScreenDescription.trim(),
        availableActions: ["view", "create", "edit", "delete"],
      });
      showToast("Screen added to module");
      setIsAddScreenOpen(false);
      setNewScreenName("");
      setNewScreenDescription("");

      // Refresh metadata
      const res = await getModulesAndPermissions();
      const catalog = res?.data || [];
      const cleanMod = String(moduleCode || "").toLowerCase().trim();
      const found = catalog.find((m) => m.id?.toLowerCase() === cleanMod);
      setModuleMetadata(found || null);
      navigate(`/dashboard/custom/${cleanMod}/${sId}`);
    } catch (err) {
      showToast(err.message || "Failed to add screen", "error");
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || r.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const moduleName = moduleMetadata?.name || moduleCode?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const screenName = activeScreen?.name || effectiveScreenId?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Render Access Denied state
  if (!loading && !canView) {
    return (
      <DashboardLayout
        title="Access Denied"
        subtitle="Custom Module Authorization"
        breadcrumb={["Dashboard", moduleName, "Restricted"]}
      >
        <div style={{ padding: "48px 16px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px" }}>Module Access Restricted</h2>
          <p style={{ color: "var(--cms-muted, #64748b)", fontSize: "14px", lineHeight: "1.6", marginBottom: "24px" }}>
            You do not have the necessary <strong>View</strong> permission for module{" "}
            <code>{moduleCode}</code>
            {effectiveScreenId ? <> (Screen: <code>{effectiveScreenId}</code>)</> : null}. Contact your system administrator to update role permissions.
          </p>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard")}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={screenName ? `${moduleName} — ${screenName}` : moduleName}
      subtitle={moduleMetadata?.description || `Custom Module Management for ${moduleName}`}
      breadcrumb={["Dashboard", moduleName, ...(screenName && screenName !== moduleName ? [screenName] : [])]}
    >
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Screen Tabs Bar if module has multiple screens */}
      {screens.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--cms-border, #e2e8f0)",
            overflowX: "auto",
          }}
        >
          {screens.map((screen) => {
            const isSelected = activeScreen?.id === screen.id;
            return (
              <button
                key={screen.id}
                type="button"
                onClick={() => navigate(`/dashboard/custom/${moduleCode}/${screen.id}`)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: isSelected ? "600" : "500",
                  background: isSelected ? "var(--cms-primary, #3b82f6)" : "var(--cms-card-bg, #ffffff)",
                  color: isSelected ? "#ffffff" : "var(--cms-text, #334155)",
                  border: isSelected ? "1px solid var(--cms-primary, #3b82f6)" : "1px solid var(--cms-border, #e2e8f0)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {screen.name}
              </button>
            );
          })}

          {(isSuperAdmin || hasRole("ADMIN", user)) && (
            <button
              type="button"
              onClick={() => setIsAddScreenOpen(true)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "500",
                background: "transparent",
                color: "var(--cms-primary, #3b82f6)",
                border: "1px dashed var(--cms-border, #cbd5e1)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} /> Add Screen
            </button>
          )}
        </div>
      )}

      {/* Module Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="cms-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--cms-muted, #64748b)", fontWeight: "600", textTransform: "uppercase" }}>Total Records</span>
            <Boxes size={18} style={{ color: "var(--cms-primary, #3b82f6)" }} />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700" }}>{records.length}</div>
          <div style={{ fontSize: "11px", color: "#10b981", marginTop: "4px" }}>Screen: {screenName || "Default"}</div>
        </div>

        <div className="cms-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--cms-muted, #64748b)", fontWeight: "600", textTransform: "uppercase" }}>Active Items</span>
            <CheckCircle2 size={18} style={{ color: "#10b981" }} />
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700" }}>{records.filter((r) => r.status === "Active").length}</div>
          <div style={{ fontSize: "11px", color: "var(--cms-muted, #64748b)", marginTop: "4px" }}>Operational</div>
        </div>

        <div className="cms-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--cms-muted, #64748b)", fontWeight: "600", textTransform: "uppercase" }}>Section</span>
            <ExternalLink size={18} style={{ color: "#f59e0b" }} />
          </div>
          <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "4px" }}>{moduleMetadata?.section || "Custom"}</div>
          <div style={{ fontSize: "11px", color: "var(--cms-muted, #64748b)", marginTop: "4px" }}>RBAC Controlled</div>
        </div>

        <div className="cms-card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--cms-muted, #64748b)", fontWeight: "600", textTransform: "uppercase" }}>Permissions</span>
            <Clock size={18} style={{ color: "#8b5cf6" }} />
          </div>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
            {canCreate && <span className="cms-badge cms-badge-active" style={{ fontSize: "10px" }}>Create</span>}
            {canEdit && <span className="cms-badge cms-badge-warn" style={{ fontSize: "10px" }}>Edit</span>}
            {canDelete && <span className="cms-badge cms-badge-danger" style={{ fontSize: "10px" }}>Delete</span>}
          </div>
        </div>
      </div>

      {/* Action Toolbar & Search */}
      <div className="cms-card" style={{ padding: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "12px", flex: "1 1 300px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={16}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--cms-muted, #94a3b8)" }}
              />
              <input
                type="text"
                placeholder={`Search ${screenName || moduleName}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cms-input"
                style={{ paddingLeft: "36px", width: "100%" }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cms-input"
              style={{ width: "130px" }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {canCreate && (
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                onClick={() => setIsNewEntryOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={16} /> New Entry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="cms-card" style={{ overflow: "hidden" }}>
        <div className="cms-table-container">
          <table className="cms-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cms-bg, #f8fafc)", textAlign: "left", fontSize: "12px", color: "var(--cms-muted, #64748b)" }}>
                <th style={{ padding: "12px 16px" }}>Title & Details</th>
                <th style={{ padding: "12px 16px" }}>Category</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Created At</th>
                <th style={{ padding: "12px 16px" }}>Created By</th>
                {(canEdit || canDelete) && <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={canEdit || canDelete ? 6 : 5} style={{ textAlign: "center", padding: "48px 16px" }}>
                    <div style={{ color: "var(--cms-muted, #94a3b8)", marginBottom: "12px" }}>
                      <Boxes size={40} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                      <p style={{ fontSize: "14px", fontWeight: "500" }}>No records found in this module screen</p>
                      <p style={{ fontSize: "12px" }}>
                        {canCreate ? "Click \"New Entry\" above to add the first record." : "You currently have read-only access to this module."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid var(--cms-border, #f1f5f9)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: "600", fontSize: "13px", color: "var(--cms-text, #1e293b)" }}>{item.title}</div>
                      {item.description && (
                        <div style={{ fontSize: "12px", color: "var(--cms-muted, #64748b)", marginTop: "2px" }}>{item.description}</div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "13px" }}>
                      <span className="cms-badge" style={{ background: "var(--cms-bg, #f1f5f9)", color: "var(--cms-text, #475569)" }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        className={`cms-badge ${
                          item.status === "Active" ? "cms-badge-active" : item.status === "Pending" ? "cms-badge-warn" : "cms-badge-inactive"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--cms-muted, #64748b)" }}>{item.createdAt}</td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--cms-muted, #64748b)" }}>{item.createdBy}</td>
                    {(canEdit || canDelete) && (
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {canDelete && (
                            <button
                              type="button"
                              className="cms-action-btn danger"
                              title="Delete record"
                              onClick={() => handleDeleteEntry(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Entry Modal */}
      {isNewEntryOpen && (
        <Modal
          title={`Add Entry to ${screenName || moduleName}`}
          onClose={() => setIsNewEntryOpen(false)}
        >
          <form onSubmit={handleSaveEntry} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Title <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                required
                className="cms-input"
                style={{ width: "100%" }}
                placeholder="Enter title or record identifier"
                value={newEntryData.title}
                onChange={(e) => setNewEntryData({ ...newEntryData, title: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Category</label>
                <input
                  type="text"
                  className="cms-input"
                  style={{ width: "100%" }}
                  placeholder="e.g. General, Operational, Academic"
                  value={newEntryData.category}
                  onChange={(e) => setNewEntryData({ ...newEntryData, category: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Status</label>
                <select
                  className="cms-input"
                  style={{ width: "100%" }}
                  value={newEntryData.status}
                  onChange={(e) => setNewEntryData({ ...newEntryData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Description / Notes</label>
              <textarea
                className="cms-input"
                style={{ width: "100%", minHeight: "80px", resize: "vertical" }}
                placeholder="Optional details or remarks about this record..."
                value={newEntryData.description}
                onChange={(e) => setNewEntryData({ ...newEntryData, description: e.target.value })}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                onClick={() => setIsNewEntryOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Save Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Screen Modal */}
      {isAddScreenOpen && (
        <Modal
          title={`Add New Screen to ${moduleName}`}
          onClose={() => setIsAddScreenOpen(false)}
        >
          <form onSubmit={handleAddScreen} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>
                Screen Name <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                required
                className="cms-input"
                style={{ width: "100%" }}
                placeholder="e.g. Activity Log, Document Vault, Reports"
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "6px" }}>Description</label>
              <input
                type="text"
                className="cms-input"
                style={{ width: "100%" }}
                placeholder="Brief summary of screen purpose"
                value={newScreenDescription}
                onChange={(e) => setNewScreenDescription(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                onClick={() => setIsAddScreenOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Add Screen
              </button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
