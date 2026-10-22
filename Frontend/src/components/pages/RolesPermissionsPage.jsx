const isSameRole = (a, b) => {
  if (!a || !b) return false;
  const aRoleId = Number(a.roleId ?? a.id);
  const bRoleId = Number(b.roleId ?? b.id);
  if (!Number.isNaN(aRoleId) && aRoleId > 0 && !Number.isNaN(bRoleId) && bRoleId > 0) {
    return aRoleId === bRoleId;
  }
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  if (a.code && b.code && String(a.code).toUpperCase() === String(b.code).toUpperCase()) return true;
  return false;
};

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Filter,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sliders,
  UserMinus,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import {
  ACTION_LABELS,
  ACTIONS,
  ALL_PERMISSION_MODULES,
  PERMISSION_PRESETS,
  PRESET_LABELS,
} from "@/features/rolesPermissions/rolesPermissions.constants.js";
import {
  addModule,
  addScreen,
  assignRoleToUser,
  cloneRole,
  createRole,
  deleteRole,
  updateRole,
  exportPermissionsToCsv,
  getModulesAndPermissions,
  getRolePermissions,
  getRoles,
  getRoleMembers,
  getUserPermissions,
  getUserRoleDetails,
  getUserRoleAssignments,
  removeRoleFromUser,
  updateRolePermissions,
  updateUserPermissions,
} from "@/features/rolesPermissions/rolesPermissions.service.js";
import {
  getPresetActions,
  normalizeActionKey,
  normalizePermissionPayload,
  normalizeRoleCode,
  togglePermissionAction,
} from "@/features/rolesPermissions/permissionUtils.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./RolesPermissionsPage.css";

const parseNumericId = (val) => {
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val === "number" && !isNaN(val)) return val;
  const digits = String(val).replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : undefined;
};

const PAGE_SIZE = 8;
const ROLE_CODES_HIDDEN_FROM_ASSIGNMENT = new Set(["SUPER_ADMIN", "ADMIN"]);
const MATRIX_ACTION_COLUMNS = [
  { key: ACTIONS.VIEW, label: "View" },
  { key: ACTIONS.CREATE, label: "Add" },
  { key: ACTIONS.EDIT, label: "Edit" },
  { key: ACTIONS.DELETE, label: "Delete" },
];
const MATRIX_ACTION_KEYS = MATRIX_ACTION_COLUMNS.map((action) => action.key);

function getManageableRoles(roles = []) {
  return roles.filter((role) => (
    !ROLE_CODES_HIDDEN_FROM_ASSIGNMENT.has(normalizeRoleCode(role?.code || role?.name))
  ));
}

const getUniqueMembers = (members = []) => {
  const identities = new Set();
  return members.filter((member) => {
    const identity = member?.id || member?.userCode || member?.userId;
    if (!identity) return true;
    const key = String(identity);
    if (identities.has(key)) return false;
    identities.add(key);
    return true;
  });
};

function getEditablePermissionTargets(modules = [], selectedRole, busy = false) {
  if (!selectedRole || selectedRole.isProtected || busy) return [];
  return modules.flatMap((module) => {
    const screens = module.screens || [];
    if (screens.length > 0) {
      return screens.flatMap((screen) =>
        (screen.availableActions || MATRIX_ACTION_KEYS).map((action) => ({
          moduleId: module.id,
          screenId: screen.id,
          action,
        })),
      );
    }
    return (module.availableActions || MATRIX_ACTION_KEYS).map((action) => ({
      moduleId: module.id,
      screenId: null,
      action,
    }));
  });
}

function getPermissionRestriction({ selectedRole, saving }) {
  if (selectedRole?.isProtected) {
    return { disabled: true, supported: true, reason: "This permission is protected for this role." };
  }
  if (saving) {
    return { disabled: true, supported: true, reason: "Permissions are being saved." };
  }
  return { disabled: false, supported: true, reason: "" };
}

function EmptyState({ title, message, action }) {
  return (
    <div className="rbac-empty">
      <ShieldCheck size={30} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder, label, inputRef }) {
  return (
    <label className="rbac-search" aria-label={label}>
      <Search size={16} aria-hidden="true" />
      <input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function RoleIcon({ role, selected = false }) {
  const Icon = role?.icon || ShieldCheck;
  return (
    <span className={`rbac-role-icon ${selected ? "is-selected" : ""}`}>
      <Icon size={22} aria-hidden="true" />
    </span>
  );
}

function PermissionToggle({ checked, indeterminate = false, disabled, disabledReason, onChange, label }) {
  const isChecked = Boolean(checked);
  const isPartial = Boolean(indeterminate && !isChecked);
  const isDisabled = Boolean(disabled);

  return (
    <button
      type="button"
      className={`rbac-switch ${isChecked ? "is-on" : isPartial ? "is-partial" : ""}`}
      role="switch"
      aria-checked={isChecked ? "true" : isPartial ? "mixed" : "false"}
      aria-label={label}
      disabled={isDisabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!isDisabled) onChange(!isChecked);
      }}
      title={isDisabled ? disabledReason : isPartial ? `${label} (Partially Enabled)` : label}
    >
      <span />
    </button>
  );
}

function MarkAllControl({ checked, indeterminate, disabled, roleName, onChange }) {
  const checkboxRef = useRef(null);

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const label = checked ? "Unmark All" : "Mark All";

  return (
    <label
      className={`rbac-mark-all ${checked ? "is-checked" : ""} ${indeterminate ? "is-partial" : ""} ${disabled ? "is-disabled" : ""}`}
      title={disabled ? "Permissions for this role cannot be modified right now." : `${label} editable permissions for ${roleName || "selected role"}`}
    >
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={`${label} editable permissions for ${roleName || "selected role"}`}
        onChange={onChange}
      />
      <span aria-hidden="true" />
      <strong>{label}</strong>
    </label>
  );
}

function initials(name = "User") {
  const clean = String(name || "").trim();
  if (!clean) return "U";
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}


function CreateRoleModal({ onClose, onCreateSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await createRole({
        name: name.trim(),
        description: description.trim(),
      });
      onCreateSuccess(res?.data || { name: name.trim() });
    } catch (err) {
      setError(err?.message || "Failed to create role.");
      setCreating(false);
    }
  };

  return createPortal(
    <div className="rbac-dialog-backdrop" onClick={onClose}>
      <section
        className="rbac-dialog rbac-clone-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-role-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rbac-dialog-head">
          <div>
            <h3 id="create-role-title">Create New Role</h3>
            <p>Define a new role and configure its module and screen permissions.</p>
          </div>
          <button type="button" className="rbac-dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rbac-clone-form">
          {error ? <div className="rbac-alert-error">{error}</div> : null}
          <div className="rbac-form-field">
            <label htmlFor="create-role-name">Role Name *</label>
            <input
              id="create-role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lab Technician, Deputy Warden"
              required
              autoFocus
            />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="create-role-desc">Description</label>
            <textarea
              id="create-role-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Responsibilities, scope, and access purpose of this role"
            />
          </div>

          <div className="rbac-dialog-actions">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={creating}>
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary" disabled={creating || !name.trim()}>
              {creating ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function EditRoleModal({ role, onClose, onEditSuccess }) {
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [isActive, setIsActive] = useState(role?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateRole(role.id, {
        name: name.trim(),
        description: description.trim(),
        isActive,
      });
      onEditSuccess(res?.data || { ...role, name: name.trim(), description: description.trim(), isActive });
    } catch (err) {
      setError(err?.message || "Failed to update role.");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="rbac-dialog-backdrop" onClick={onClose}>
      <section
        className="rbac-dialog rbac-clone-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-role-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rbac-dialog-head">
          <div>
            <h3 id="edit-role-title">Edit Role</h3>
            <p>Update title and description for <strong>{role?.name}</strong>.</p>
          </div>
          <button type="button" className="rbac-dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rbac-clone-form">
          {error ? <div className="rbac-alert-error">{error}</div> : null}
          <div className="rbac-form-field">
            <label htmlFor="edit-role-name">Role Name *</label>
            <input
              id="edit-role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="edit-role-desc">Description</label>
            <textarea
              id="edit-role-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Role description"
            />
          </div>
          <div className="rbac-form-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              id="edit-role-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: "16px", height: "16px" }}
            />
            <label htmlFor="edit-role-active" style={{ margin: 0, cursor: "pointer" }}>
              Active (Enabled in assignments and system logins)
            </label>
          </div>

          <div className="rbac-dialog-actions">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}


function AddModuleModal({ onClose, onAddSuccess }) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [section, setSection] = useState("Operations");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState(["view", "create", "edit", "delete"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleNameChange = (val) => {
    setName(val);
    if (!key || key === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
      setKey(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const toggleAction = (act) => {
    setActions((prev) => (prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const moduleData = {
        id: key.trim().toLowerCase(),
        name: name.trim(),
        section: section.trim(),
        description: description.trim(),
        availableActions: actions,
        screens: [],
      };
      await addModule(moduleData);
      onAddSuccess(moduleData);
    } catch (err) {
      setError(err?.message || "Failed to add module.");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="rbac-dialog-backdrop" onClick={onClose}>
      <section
        className="rbac-dialog rbac-clone-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-module-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rbac-dialog-head">
          <div>
            <h3 id="add-module-title">Add Permission Module</h3>
            <p>Create a new high-level functional module in the permissions matrix.</p>
          </div>
          <button type="button" className="rbac-dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rbac-clone-form">
          {error ? <div className="rbac-alert-error">{error}</div> : null}
          <div className="rbac-form-field">
            <label htmlFor="add-module-name">Module Name *</label>
            <input
              id="add-module-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Alumni Portal, Research & Publications"
              required
              autoFocus
            />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="add-module-key">Module Key / Identifier *</label>
            <input
              id="add-module-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. alumni-portal"
              required
            />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="add-module-section">Section Category</label>
            <select
              id="add-module-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="Administration">Administration</option>
              <option value="Academic">Academic</option>
              <option value="Student">Student</option>
              <option value="Staff">Staff</option>
              <option value="Examinations">Examinations</option>
              <option value="Finance">Finance</option>
              <option value="Documents & Reports">Documents & Reports</option>
              <option value="Hostel Management">Hostel Management</option>
              <option value="Operations">Operations</option>
              <option value="Overview">Overview</option>
            </select>
          </div>
          <div className="rbac-form-field">
            <label htmlFor="add-module-desc">Description</label>
            <input
              id="add-module-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope and purpose of this module"
            />
          </div>

          <div className="rbac-form-field">
            <label>Supported Actions</label>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
              {["view", "create", "edit", "delete"].map((act) => (
                <label key={act} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem", textTransform: "capitalize" }}>
                  <input
                    type="checkbox"
                    checked={actions.includes(act)}
                    onChange={() => toggleAction(act)}
                  />
                  {act === "create" ? "Add/Create" : act}
                </label>
              ))}
            </div>
          </div>

          <div className="rbac-dialog-actions">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || !name.trim() || !key.trim()}>
              {saving ? "Adding..." : "Add Module"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function AddScreenModal({ module, modules = [], onClose, onAddSuccess }) {
  const [selectedModuleId, setSelectedModuleId] = useState(module?.id || modules[0]?.id || "");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState(["view", "create", "edit", "delete"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const activeModule = module || modules.find((m) => m.id === selectedModuleId);

  const handleNameChange = (val) => {
    setName(val);
    if (!key || key === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
      setKey(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const toggleAction = (act) => {
    setActions((prev) => (prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || !selectedModuleId) return;
    setSaving(true);
    setError(null);
    try {
      const screenData = {
        id: key.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || name.trim(),
        availableActions: actions,
      };
      await addScreen(selectedModuleId, screenData);
      onAddSuccess(selectedModuleId, screenData);
    } catch (err) {
      setError(err?.message || "Failed to add screen.");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="rbac-dialog-backdrop" onClick={onClose}>
      <section
        className="rbac-dialog rbac-clone-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-screen-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rbac-dialog-head">
          <div>
            <h3 id="add-screen-title">Add Screen to Module</h3>
            <p>
              {module
                ? `Add a new sub-screen under ${module.name}.`
                : "Add a new sub-screen under a chosen module."}
            </p>
          </div>
          <button type="button" className="rbac-dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rbac-clone-form">
          {error ? <div className="rbac-alert-error">{error}</div> : null}

          {!module ? (
            <div className="rbac-form-field">
              <label htmlFor="add-screen-module-select">Target Module *</label>
              <select
                id="add-screen-module-select"
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                required
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.section})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="rbac-form-field">
              <label>Target Module</label>
              <input type="text" value={`${module.name} (${module.section})`} disabled style={{ background: "#f8fafc" }} />
            </div>
          )}

          <div className="rbac-form-field">
            <label htmlFor="add-screen-name">Screen Name *</label>
            <input
              id="add-screen-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. My Attendance, Apply Leave, Room Setup"
              required
              autoFocus
            />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="add-screen-key">Screen Key / Identifier *</label>
            <input
              id="add-screen-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. my-attendance"
              required
            />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="add-screen-desc">Description / Route</label>
            <input
              id="add-screen-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Staff individual check-in and monthly logs"
            />
          </div>

          <div className="rbac-form-field">
            <label>Supported Actions</label>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
              {["view", "create", "edit", "delete"].map((act) => (
                <label key={act} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.9rem", textTransform: "capitalize" }}>
                  <input
                    type="checkbox"
                    checked={actions.includes(act)}
                    onChange={() => toggleAction(act)}
                  />
                  {act === "create" ? "Add/Create" : act}
                </label>
              ))}
            </div>
          </div>

          <div className="rbac-dialog-actions">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary" disabled={saving || !name.trim() || !key.trim()}>
              {saving ? "Adding..." : "Add Screen"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function CloneRoleModal({ role, onClose, onCloneSuccess }) {
  const [name, setName] = useState(role ? `${role.name} (Copy)` : "");
  const [description, setDescription] = useState(role ? `Cloned permissions from ${role.name}` : "");
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCloning(true);
    setError(null);
    try {
      const res = await cloneRole(role.id, {
        newName: name.trim(),
        description: description.trim(),
      });
      onCloneSuccess(res?.data || { name: name.trim() });
    } catch (err) {
      setError(err?.message || "Failed to clone role.");
      setCloning(false);
    }
  };

  return createPortal(
    <div className="rbac-dialog-backdrop" onClick={onClose}>
      <section
        className="rbac-dialog rbac-clone-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clone-role-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rbac-dialog-head">
          <div>
            <h3 id="clone-role-title">Clone Role</h3>
            <p>Create a new role with permissions cloned from <strong>{role?.name}</strong>.</p>
          </div>
          <button type="button" className="rbac-dialog-close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rbac-clone-form">
          {error ? <div className="rbac-alert-error">{error}</div> : null}
          <div className="rbac-form-field">
            <label htmlFor="clone-role-source">Source Role</label>
            <input id="clone-role-source" type="text" value={role?.name || ""} disabled />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="clone-role-name">New Role Name *</label>
            <input
              id="clone-role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance Assistant"
              required
              autoFocus
            />
          </div>
          <div className="rbac-form-field">
            <label htmlFor="clone-role-desc">Description</label>
            <textarea
              id="clone-role-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the cloned role's responsibilities"
            />
          </div>

          <div className="rbac-dialog-actions">
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose} disabled={cloning}>
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn-primary" disabled={cloning || !name.trim()}>
              {cloning ? "Cloning..." : "Create Cloned Role"}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}

function RoleList({ roles, selectedRoleId, selectedRole, onSelect, onOpenMembers, onCloneRole, onNewRole, onEditRole, onDeleteRole, query, onQuery }) {
  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) =>
      [role.name, role.code, role.description].some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [roles, query]);

  return (
    <section className="rbac-panel rbac-role-panel">
      <div className="rbac-role-panel-header">
        <div className="rbac-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Roles</h2>
          <button
            type="button"
            className="cms-btn cms-btn-primary cms-btn-sm"
            onClick={onNewRole}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", padding: "4px 10px", height: "30px" }}
            title="Create a new custom role"
          >
            <Plus size={14} /> New Role
          </button>
        </div>
        <SearchBox value={query} onChange={onQuery} placeholder="Search roles..." label="Search roles" />
      </div>
      <div className="rbac-role-list">
        {filteredRoles.length ? filteredRoles.map((role) => {
          const selected = isSameRole(role, selectedRole) || (selectedRoleId != null && String(role.id) === String(selectedRoleId));
          return (
            <div
              className={`rbac-role-item ${selected ? "is-selected" : ""}`}
              key={role.id}
            >
              <button
                type="button"
                className="rbac-role-select"
                onClick={() => onSelect(role)}
                aria-pressed={selected}
              >
                <RoleIcon role={role} selected={selected} />
                <span className="rbac-role-copy">
                  <strong>{role.name}</strong>
                  <span className="rbac-role-flags">
                    {role.isProtected ? <em>Protected</em> : null}
                    {role.discoveredFrom ? <em>Configured</em> : null}
                  </span>
                </span>
              </button>
              <div className="rbac-role-item-actions">
                <button
                  type="button"
                  className="rbac-role-action-btn"
                  title={`Clone ${role.name}`}
                  aria-label={`Clone ${role.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCloneRole) onCloneRole(role);
                  }}
                >
                  <Copy size={13} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="rbac-user-count"
                  title={`View ${role.name} members`}
                  aria-label={`View ${role.assignedUserCount == null ? "loading" : role.assignedUserCount} members assigned to ${role.name}`}
                  onClick={() => onOpenMembers(role)}
                >
                  {role.assignedUserCount == null ? "—" : role.assignedUserCount}
                </button>
              </div>
            </div>
          );
        }) : (
          <EmptyState title="No roles found" message="Try a different role name or code." />
        )}
      </div>
    </section>
  );
}

function RoleMembersDialog({ role, members, loading, error, onRetry, onSelectMember, onClose }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return members;
    return members.filter((member) => [
      member.name,
      member.fullName,
      member.userId,
      member.userCode,
      member.employeeId,
      member.studentId,
      member.email,
      member.phoneNumber,
      member.mobile,
      member.department,
      member.designation,
      member.status,
    ].some((value) => String(value || "").toLowerCase().includes(normalizedQuery)));
  }, [members, query]);
  const dialogCount = loading || error
    ? (role?.assignedUserCount == null ? "—" : role.assignedUserCount)
    : members.length;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    searchRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!role) return null;
  return createPortal(
    <div
      className="rbac-modal-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="rbac-member-dialog" role="dialog" aria-modal="true" aria-labelledby="rbac-member-dialog-title">
        <div className="rbac-member-dialog-head">
          <div>
            <span className="rbac-member-dialog-title-row">
              <h3 id="rbac-member-dialog-title">{role.name} Members</h3>
              <strong className="rbac-member-dialog-count">{dialogCount}</strong>
            </span>
            <p>Members currently assigned to this role.</p>
          </div>
          <button type="button" className="rbac-icon-action" onClick={onClose} aria-label="Close members dialog">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <SearchBox
          inputRef={searchRef}
          value={query}
          onChange={setQuery}
          placeholder={`Search ${role.name.toLowerCase()} members...`}
          label={`Search ${role.name} members`}
        />
        <div className="rbac-member-list">
          {loading ? <Loader label="Loading role members..." /> : null}
          {!loading && !error && filteredMembers.length ? filteredMembers.map((member) => {
            const memberId = member.userCode || member.employeeId || member.studentId || member.userId;
            const contact = member.email || member.phoneNumber || member.mobile;
            return (
              <button
                type="button"
                key={member.id || member.userId}
                className="rbac-member-item"
                onClick={() => onSelectMember(member)}
              >
                <span className="rbac-member-avatar">{initials(member.name)}</span>
                <span className="rbac-member-copy">
                  <strong>{member.name}</strong>
                  <small>{[memberId, member.department, member.designation].filter(Boolean).join(" - ") || "Member details unavailable"}</small>
                  {contact ? <small>{contact}</small> : null}
                </span>
                <StatusBadge value={member.status || "Active"} />
              </button>
            );
          }) : null}
          {!loading && error ? (
            <div className="rbac-member-empty">
              <AlertTriangle size={24} aria-hidden="true" />
              <strong>Unable to load members.</strong>
              <span>{error}</span>
              {onRetry ? <button type="button" className="cms-btn cms-btn-ghost" onClick={onRetry}>Retry</button> : null}
            </div>
          ) : null}
          {!loading && !error && !members.length ? (
            <div className="rbac-member-empty">
              <Users size={24} aria-hidden="true" />
              <strong>No members assigned to this role.</strong>
            </div>
          ) : null}
          {!loading && members.length > 0 && !filteredMembers.length ? (
            <div className="rbac-member-empty">
              <Search size={24} aria-hidden="true" />
              <strong>No matching members found.</strong>
              <span>Try a different name, ID, department, or contact.</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function PermissionMatrix({
  modules,
  permissionRows,
  selectedRole,
  saving,
  query,
  onQuery,
  onToggle,
  markAllState,
  onMarkAll,
  onApplyPreset,
  onExportCsv,
  statusFilter = "all",
  onStatusFilterChange,
  onAddModule,
  onAddScreen,
}) {
  const permissionStructure = useMemo(() => {
    const map = new Map();
    (permissionRows || []).forEach((row) => {
      const modKey = String(row.module || "").trim().toLowerCase();
      if (!modKey) return;
      const modActions = new Set(row.actions || []);
      const screenMap = new Map();

      if (Array.isArray(row.screens)) {
        row.screens.forEach((s) => {
          const sId = String(s.screenId || s.id || "").trim().toLowerCase();
          if (sId) {
            screenMap.set(sId, new Set(s.actions || []));
          }
        });
      }

      map.set(modKey, { actions: modActions, screens: screenMap });
    });
    return map;
  }, [permissionRows]);

  const [expandedModules, setExpandedModules] = useState(() => new Set());
  const [sectionFilter, setSectionFilter] = useState("all");

  const availableSections = useMemo(() => {
    const set = new Set();
    modules.forEach((m) => {
      if (m.section) set.add(m.section);
    });
    return Array.from(set).sort();
  }, [modules]);

  // Auto-expand if search query matches a module or screen
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const matching = new Set();
    modules.forEach((mod) => {
      const matchMod = [mod.name, mod.id, mod.section].some((val) => String(val || "").toLowerCase().includes(q));
      const matchScr = (mod.screens || []).some((s) => [s.name, s.id, s.description].some((val) => String(val || "").toLowerCase().includes(q)));
      if (matchMod || matchScr) matching.add(mod.id);
    });
    if (matching.size > 0) {
      setExpandedModules(matching);
    }
  }, [modules, query]);

  const toggleExpand = (modId) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(modules.map((m) => m.id)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules
      .filter((module) => sectionFilter === "all" || module.section === sectionFilter)
      .map((module) => {
        const modData = permissionStructure.get(module.id);
        const modActions = modData?.actions || new Set();
        const screens = module.screens || [];

        const matchingScreens = screens.filter((screen) => {
          if (q) {
            const matchesScr = [screen.name, screen.id, screen.description].some((value) =>
              String(value || "").toLowerCase().includes(q),
            );
            if (!matchesScr && !module.name.toLowerCase().includes(q)) return false;
          }
          if (statusFilter && statusFilter !== "all") {
            const scrActions = modData?.screens?.get(screen.id) || modActions;
            const count = scrActions.size;
            const total = MATRIX_ACTION_KEYS.filter((act) =>
              (screen.availableActions || MATRIX_ACTION_KEYS).map(normalizeActionKey).includes(act)
            ).length;
            if (statusFilter === "granted" && count === 0) return false;
            if (statusFilter === "denied" && count > 0) return false;
            if (statusFilter === "partial" && (count === 0 || count === total)) return false;
          }
          return true;
        });

        const matchesModName = !q || [module.name, module.id, module.section].some((val) =>
          String(val || "").toLowerCase().includes(q),
        );

        if (statusFilter && statusFilter !== "all") {
          const modCount = modActions.size;
          const modTotal = MATRIX_ACTION_KEYS.length;
          const modMatchesStatus =
            (statusFilter === "granted" && modCount > 0) ||
            (statusFilter === "denied" && modCount === 0) ||
            (statusFilter === "partial" && modCount > 0 && modCount < modTotal);

          if (!modMatchesStatus && matchingScreens.length === 0) return null;
        } else if (!matchesModName && matchingScreens.length === 0) {
          return null;
        }

        return {
          ...module,
          screens: screens.length > 0 ? (q || statusFilter !== "all" ? matchingScreens : screens) : [],
        };
      })
      .filter(Boolean);
  }, [modules, query, statusFilter, sectionFilter, permissionStructure]);

  const allAreExpanded = filteredModules.length > 0 && filteredModules.every((m) => expandedModules.has(m.id));
  const restriction = getPermissionRestriction({ selectedRole, saving });

  return (
    <div className="rbac-permission-wrap">
      {/* Quick Presets Bar */}
      <div className="rbac-presets-bar">
        <span className="rbac-presets-label">Quick Presets:</span>
        <button
          type="button"
          className="rbac-preset-pill is-full"
          disabled={restriction.disabled}
          onClick={() => onApplyPreset && onApplyPreset(PERMISSION_PRESETS.FULL_ACCESS)}
          title="Grant all actions across all modules and screens"
        >
          <CheckCircle2 size={13} aria-hidden="true" /> {PRESET_LABELS[PERMISSION_PRESETS.FULL_ACCESS]}
        </button>
        <button
          type="button"
          className="rbac-preset-pill is-view"
          disabled={restriction.disabled}
          onClick={() => onApplyPreset && onApplyPreset(PERMISSION_PRESETS.VIEW_ONLY)}
          title="Grant View-only access across all modules and screens"
        >
          <Eye size={13} aria-hidden="true" /> {PRESET_LABELS[PERMISSION_PRESETS.VIEW_ONLY]}
        </button>
        <button
          type="button"
          className="rbac-preset-pill is-operational"
          disabled={restriction.disabled}
          onClick={() => onApplyPreset && onApplyPreset(PERMISSION_PRESETS.OPERATIONAL)}
          title="Grant View, Add, and Edit (exclude Delete) across all modules"
        >
          <Sliders size={13} aria-hidden="true" /> {PRESET_LABELS[PERMISSION_PRESETS.OPERATIONAL]}
        </button>
        <button
          type="button"
          className="rbac-preset-pill is-revoke"
          disabled={restriction.disabled}
          onClick={() => onApplyPreset && onApplyPreset(PERMISSION_PRESETS.REVOKE_ALL)}
          title="Clear all permissions across all modules and screens"
        >
          <XCircle size={13} aria-hidden="true" /> {PRESET_LABELS[PERMISSION_PRESETS.REVOKE_ALL]}
        </button>
      </div>

      <div className="rbac-permission-toolbar">
        <div className="rbac-permission-toolbar-top">
          <div className="rbac-permission-title-group">
            <h3>Permissions</h3>
            <span className="rbac-module-count-badge">
              {filteredModules.length} {filteredModules.length === 1 ? "module" : "modules"}
            </span>
          </div>
          <div className="rbac-toolbar-tools">
            <button
              type="button"
              className="rbac-expand-toggle-all"
              onClick={allAreExpanded ? collapseAll : expandAll}
              title={allAreExpanded ? "Collapse all modules" : "Expand all modules"}
            >
              <Layers size={14} aria-hidden="true" />
              <span>{allAreExpanded ? "Collapse All" : "Expand All"}</span>
            </button>
            <button
              type="button"
              className="rbac-export-btn"
              onClick={onExportCsv}
              title="Export permission matrix to CSV"
            >
              <Download size={14} aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              className="rbac-export-btn rbac-btn-add-module"
              onClick={onAddModule}
              title="Add a new functional module to permissions"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add Module</span>
            </button>
            <button
              type="button"
              className="rbac-export-btn rbac-btn-add-screen"
              onClick={() => onAddScreen && onAddScreen(null)}
              title="Add a new screen under a module"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Add Screen</span>
            </button>
          </div>
        </div>
        <div className="rbac-permission-toolbar-bottom">
          <div className="rbac-search-wrapper">
            <SearchBox value={query} onChange={onQuery} placeholder="Search modules & screens..." label="Search permissions" />
          </div>
          <div className="rbac-toolbar-filters">
            <select
              className="rbac-status-filter rbac-section-filter"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              title="Filter by functional category"
              aria-label="Filter permissions by section"
            >
              <option value="all">All Sections ({modules.length})</option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
            <select
              className="rbac-status-filter"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange && onStatusFilterChange(e.target.value)}
              title="Filter by permission grant status"
              aria-label="Filter permissions by status"
            >
              <option value="all">All Screens</option>
              <option value="granted">Granted Only</option>
              <option value="denied">Denied Only</option>
              <option value="partial">Partial Only</option>
            </select>
            <MarkAllControl
              checked={markAllState.checked}
              indeterminate={markAllState.indeterminate}
              disabled={markAllState.disabled}
              roleName={selectedRole?.name}
              onChange={onMarkAll}
            />
          </div>
        </div>
      </div>
      {filteredModules.length ? (
        <div className="rbac-matrix" role="table" aria-label={`${selectedRole?.name || "Role"} permissions`}>
          <div className="rbac-matrix-row rbac-matrix-head" role="row">
            <span role="columnheader">Module &amp; Screens</span>
            {MATRIX_ACTION_COLUMNS.map((action) => (
              <span role="columnheader" key={action.key}>{action.label}</span>
            ))}
          </div>
          {filteredModules.map((module) => {
            const Icon = module.icon || ShieldCheck;
            const screens = module.screens || [];
            const isExpanded = expandedModules.has(module.id);
            const modData = permissionStructure.get(module.id);
            const restriction = getPermissionRestriction({ selectedRole, saving });

            return (
              <div key={module.id} className="rbac-matrix-module-group">
                {/* Module Master Row */}
                <div className={`rbac-matrix-row rbac-matrix-module-row ${isExpanded ? "is-expanded" : ""}`} role="row">
                  <div
                    className="rbac-module-cell"
                    role="cell"
                    onClick={() => screens.length > 0 && toggleExpand(module.id)}
                  >
                    {screens.length > 0 ? (
                      <button
                        type="button"
                        className={`rbac-expand-btn ${isExpanded ? "is-expanded" : ""}`}
                        aria-label={isExpanded ? `Collapse ${module.name}` : `Expand ${module.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(module.id);
                        }}
                      >
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    ) : (
                      <span style={{ width: 26, flex: "0 0 26px" }} />
                    )}
                    <span className="rbac-module-icon"><Icon size={19} aria-hidden="true" /></span>
                    <div>
                      <strong>{module.name}</strong>
                      <small>
                        {module.section}
                        {screens.length > 0 ? (
                          <span className="rbac-screen-badge">
                            {screens.length} {screens.length === 1 ? "screen" : "screens"}
                          </span>
                        ) : null}
                      </small>
                    </div>
                  </div>

                  {MATRIX_ACTION_COLUMNS.map((action) => {
                    const supportedScreens = screens.filter((s) => (s.availableActions || MATRIX_ACTION_KEYS).map(normalizeActionKey).includes(action.key));
                    const isSupported = screens.length === 0
                      ? (module.availableActions || MATRIX_ACTION_KEYS).map(normalizeActionKey).includes(action.key)
                      : supportedScreens.length > 0;

                    let isChecked = false;
                    let isIndeterminate = false;
                    let enabledCount = 0;

                    if (selectedRole?.isProtected) {
                      isChecked = true;
                    } else if (screens.length === 0) {
                      isChecked = Boolean(modData?.actions?.has(action.key));
                    } else if (supportedScreens.length > 0) {
                      enabledCount = supportedScreens.filter((s) => {
                        const sActions = modData?.screens?.get(s.id);
                        if (sActions) return sActions.has(action.key);
                        return Boolean(modData?.actions?.has(action.key));
                      }).length;
                      isChecked = enabledCount === supportedScreens.length;
                      isIndeterminate = enabledCount > 0 && enabledCount < supportedScreens.length;
                    }

                    return (
                      <div className="rbac-matrix-action-cell" role="cell" key={`${module.id}-${action.key}`}>
                        <PermissionToggle
                          checked={isChecked}
                          indeterminate={isIndeterminate}
                          disabled={restriction.disabled || !isSupported}
                          disabledReason={!isSupported ? "Action not applicable for this module" : restriction.reason}
                          label={isIndeterminate ? `${action.label} ${module.name} (${enabledCount} of ${supportedScreens.length} screens)` : `${action.label} ${module.name} (All Screens)`}
                          onChange={(next) => {
                            if (!restriction.disabled && isSupported) {
                              onToggle({
                                roleId: selectedRole?.id,
                                moduleId: module.id,
                                screenId: null, // Master toggle
                                action: action.key,
                                checked: next,
                              });
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Screen Sub-Rows (When Expanded) */}
                {isExpanded && screens.map((screen) => {
                  return (
                    <div className="rbac-matrix-row rbac-matrix-screen-row" role="row" key={`${module.id}-${screen.id}`}>
                      <div className="rbac-screen-cell" role="cell">
                        <span className="rbac-screen-bullet" aria-hidden="true" />
                        <div className="rbac-screen-info">
                          <strong>{screen.name}</strong>
                          <small>{screen.description || screen.id}</small>
                        </div>
                      </div>

                      {MATRIX_ACTION_COLUMNS.map((action) => {
                        const isActionSupported = (screen.availableActions || MATRIX_ACTION_KEYS).map(normalizeActionKey).includes(action.key);
                        let isChecked = false;

                        if (selectedRole?.isProtected) {
                          isChecked = true;
                        } else {
                          const sActions = modData?.screens?.get(screen.id);
                          if (sActions) {
                            isChecked = sActions.has(action.key);
                          } else {
                            isChecked = Boolean(modData?.actions?.has(action.key));
                          }
                        }

                        return (
                          <div className="rbac-matrix-action-cell" role="cell" key={`${module.id}-${screen.id}-${action.key}`}>
                            <PermissionToggle
                              checked={isChecked}
                              disabled={restriction.disabled || !isActionSupported}
                              disabledReason={!isActionSupported ? "Action not supported for this screen" : restriction.reason}
                              label={`${action.label} ${screen.name}`}
                              onChange={(next) => {
                                if (!restriction.disabled && isActionSupported) {
                                  onToggle({
                                    roleId: selectedRole?.id,
                                    moduleId: module.id,
                                    screenId: screen.id,
                                    action: action.key,
                                    checked: next,
                                  });
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {isExpanded && (
                  <div className="rbac-matrix-add-screen-row">
                    <button
                      type="button"
                      className="rbac-add-screen-btn"
                      onClick={() => onAddScreen && onAddScreen(module)}
                      title={`Add a new screen under ${module.name}`}
                    >
                      <Plus size={13} aria-hidden="true" /> Add screen to {module.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No permissions found" message="Try searching by module, screen, section or action." />
      )}
    </div>
  );
}

function PermissionStateMark({ enabled, label }) {
  return (
    <span className={`rbac-permission-state ${enabled ? "is-enabled" : "is-disabled"}`} title={`${label}: ${enabled ? "Enabled" : "Disabled"}`}>
      {enabled ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
      <span>{enabled ? "Enabled" : "Disabled"}</span>
    </span>
  );
}

function UserRoleDetailsPanel({ user, permissions, roles, modules, loading, error, onBack, onRetry }) {
  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [normalizeRoleCode(role.code || role.name), role.name])), [roles]);
  const roleCodes = user?.roleCodes || [];
  const assignedRoleCode = roleCodes[0] || "";
  const permissionMap = useMemo(() => new Map((permissions || []).map((row) => [row.module, row.actions || []])), [permissions]);

  return (
    <div className="rbac-user-detail-view">
      <div className="rbac-user-detail-topbar">
        <button type="button" className="cms-btn cms-btn-ghost" onClick={onBack}>
          <ChevronLeft size={15} /> Back
        </button>
        <div>
          <h3>User Role Details</h3>
          <p>{user?.name || "Selected user"}</p>
        </div>
      </div>

      {loading ? <div className="rbac-loading-card"><Loader label="Loading user details..." /></div> : null}
      {error && !loading ? (
        <EmptyState
          title="Unable to load user details"
          message="Unable to load user details. Please try again."
          action={<button type="button" className="cms-btn cms-btn-primary" onClick={onRetry}>Retry</button>}
        />
      ) : null}

      {!loading && !error && user ? (
        <>
          <div className="rbac-user-detail-grid">
            <section className="rbac-user-detail-card">
              <h4>User Information</h4>
              <dl>
                <div><dt>Name</dt><dd>{user.name || "Not provided"}</dd></div>
                <div><dt>User ID</dt><dd>{user.userId || user.id || "Not provided"}</dd></div>
                <div><dt>User Type</dt><dd>{user.userType || "User"}</dd></div>
                <div><dt>Department</dt><dd>{user.department || "Not provided"}</dd></div>
                <div><dt>Designation</dt><dd>{user.designation || "Not provided"}</dd></div>
                <div><dt>Status</dt><dd><StatusBadge value={user.status || "Active"} /></dd></div>
              </dl>
            </section>

            <section className="rbac-user-detail-card">
              <h4>Role Information</h4>
              <dl>
                <div>
                  <dt>Current Role(s)</dt>
                  <dd className="rbac-role-chips">
                    {roleCodes.length ? roleCodes.map((code) => (
                      <em key={code}>{roleNameByCode.get(normalizeRoleCode(code)) || code}</em>
                    )) : <small>No role assigned</small>}
                  </dd>
                </div>
                <div><dt>Assigned Role</dt><dd>{assignedRoleCode ? roleNameByCode.get(normalizeRoleCode(assignedRoleCode)) || assignedRoleCode : "Not assigned"}</dd></div>
                <div><dt>Role Status</dt><dd><StatusBadge value={user.status || "Active"} /></dd></div>
              </dl>
            </section>
          </div>

          <section className="rbac-user-detail-card rbac-user-permission-card">
            <h4>Permission Information (Modules &amp; Screens)</h4>
            <div className="rbac-detail-permission-table">
              <div className="rbac-detail-permission-row rbac-detail-permission-head">
                <span>Module / Screen</span>
                {MATRIX_ACTION_COLUMNS.map((action) => <span key={action.key}>{action.label}</span>)}
              </div>
              {modules.map((module) => {
                const modActions = permissionMap.get(module.id) || [];
                const modScreens = module.screens || [];
                const moduleRow = (permissions || []).find((p) => p.module === module.id);
                const screenMap = new Map((moduleRow?.screens || []).map((s) => [s.screenId, s.actions || []]));

                return (
                  <div key={module.id} className="rbac-detail-module-group">
                    <div className="rbac-detail-permission-row" style={{ background: "color-mix(in srgb, var(--cms-primary-soft) 40%, var(--cms-surface))" }}>
                      <span className="rbac-detail-module-name">
                        <strong>{module.name}</strong>
                        <small>{module.section} • {modScreens.length} screens</small>
                      </span>
                      {MATRIX_ACTION_COLUMNS.map((action) => (
                        <span key={action.key}>
                          <PermissionStateMark enabled={modActions.includes(action.key)} label={`${module.name} ${action.label}`} />
                        </span>
                      ))}
                    </div>
                    {modScreens.map((screen) => {
                      const scrActions = screenMap.get(screen.id) || modActions;
                      return (
                        <div className="rbac-detail-permission-row" key={screen.id} style={{ paddingLeft: "32px", borderBottom: "1px solid var(--cms-border)" }}>
                          <span className="rbac-detail-module-name">
                            <span style={{ fontSize: "12px", color: "var(--cms-text)" }}>• {screen.name}</span>
                            <small>{screen.description || screen.id}</small>
                          </span>
                          {MATRIX_ACTION_COLUMNS.map((action) => (
                            <span key={action.key}>
                              <PermissionStateMark enabled={scrActions.includes(action.key)} label={`${screen.name} ${action.label}`} />
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function RoleDetails({
  selectedRole,
  selectedMember,
  modules,
  permissions,
  setPermissions,
  onUseRolePermissions,
  loading,
  saving,
  dirty,
  query,
  setQuery,
  onSave,
  onReset,
  onAddModule,
  onAddScreen,
}) {
  const updateAction = useCallback(({ roleId, moduleId, screenId, action, checked }) => {
    if (!selectedRole || String(roleId) !== String(selectedRole.id) || selectedRole.isProtected || loading || saving) return;
    const modConfig = modules.find((m) => m.id === moduleId);
    if (!modConfig || !MATRIX_ACTION_KEYS.includes(action)) return;

    const previousPermissions = [...permissions];
    const moduleIndex = previousPermissions.findIndex((row) => row.module === moduleId);
    const moduleEntry = moduleIndex !== -1
      ? { ...previousPermissions[moduleIndex] }
      : { module: moduleId, actions: [], screens: [] };

    const modScreens = modConfig.screens || [];
    const screenMap = new Map((moduleEntry.screens || []).map((s) => [s.screenId, [...(s.actions || [])]]));

    if (modScreens.length > 0) {
      modScreens.forEach((s) => {
        if (!screenMap.has(s.id)) {
          screenMap.set(s.id, [...(moduleEntry.actions || [])]);
        }
      });
    }

    if (screenId) {
      // Toggle for specific screen
      const currentActions = screenMap.get(screenId) || [];
      const nextActions = togglePermissionAction(currentActions, action, Boolean(checked));
      screenMap.set(screenId, nextActions);
    } else {
      // Master toggle across all screens
      modScreens.forEach((s) => {
        if ((s.availableActions || MATRIX_ACTION_KEYS).includes(action)) {
          const currentActions = screenMap.get(s.id) || [];
          const nextActions = togglePermissionAction(currentActions, action, Boolean(checked));
          screenMap.set(s.id, nextActions);
        }
      });
    }

    // Recompute module actions: an action is granted at module level if any screen has it
    const updatedScreens = [...screenMap.entries()].map(([sId, sActions]) => ({
      screenId: sId,
      actions: sActions,
    }));

    const aggregateActions = new Set();
    if (updatedScreens.length > 0) {
      updatedScreens.forEach((s) => s.actions.forEach((a) => aggregateActions.add(a)));
    } else {
      togglePermissionAction(moduleEntry.actions || [], action, Boolean(checked)).forEach((a) => aggregateActions.add(a));
    }

    const updatedModule = {
      ...moduleEntry,
      module: moduleId,
      actions: [...aggregateActions],
      screens: updatedScreens,
    };

    if (moduleIndex !== -1) {
      previousPermissions[moduleIndex] = updatedModule;
    } else {
      previousPermissions.push(updatedModule);
    }

    setPermissions(normalizePermissionPayload(previousPermissions));
  }, [loading, modules, permissions, saving, selectedRole, setPermissions]);

  const editablePermissionTargets = useMemo(
    () => getEditablePermissionTargets(modules, selectedRole, loading || saving),
    [loading, modules, saving, selectedRole],
  );

  const markAllState = useMemo(() => {
    if (!selectedRole || loading || saving || !editablePermissionTargets.length) {
      return { checked: false, indeterminate: false, disabled: true };
    }

    const permissionMap = new Map();
    (permissions || []).forEach((row) => {
      const modKey = row.module;
      const modActions = new Set(row.actions || []);
      const screenMap = new Map((row.screens || []).map((s) => [s.screenId, new Set(s.actions || [])]));
      permissionMap.set(modKey, { actions: modActions, screens: screenMap });
    });

    let selectedCount = 0;
    editablePermissionTargets.forEach(({ moduleId, screenId, action }) => {
      const mod = permissionMap.get(moduleId);
      if (!mod) return;
      if (screenId) {
        const scr = mod.screens.get(screenId);
        if (scr ? scr.has(action) : mod.actions.has(action)) {
          selectedCount++;
        }
      } else if (mod.actions.has(action)) {
        selectedCount++;
      }
    });

    return {
      checked: selectedCount === editablePermissionTargets.length,
      indeterminate: selectedCount > 0 && selectedCount < editablePermissionTargets.length,
      disabled: false,
    };
  }, [editablePermissionTargets, loading, permissions, saving, selectedRole]);

  const toggleMarkAll = () => {
    if (markAllState.disabled) return;
    const shouldEnable = !markAllState.checked;

    const nextPermissions = modules.map((module) => {
      const modScreens = module.screens || [];
      const screens = modScreens.map((screen) => {
        const available = screen.availableActions || MATRIX_ACTION_KEYS;
        return {
          screenId: screen.id,
          actions: shouldEnable ? MATRIX_ACTION_KEYS.filter((a) => available.includes(a)) : [],
        };
      });
      const actions = shouldEnable ? MATRIX_ACTION_KEYS : [];
      return {
        module: module.id,
        actions,
        screens,
      };
    });

    setPermissions(normalizePermissionPayload(nextPermissions));
  };

  const [statusFilter, setStatusFilter] = useState("all");

  const applyPreset = useCallback((presetKey) => {
    if (!selectedRole || selectedRole.isProtected || loading || saving) return;
    const nextPermissions = modules.map((module) => {
      const modScreens = module.screens || [];
      const screens = modScreens.map((screen) => {
        const available = screen.availableActions || MATRIX_ACTION_KEYS;
        return {
          screenId: screen.id,
          actions: getPresetActions(presetKey, available),
        };
      });
      const moduleAvailable = module.availableActions || MATRIX_ACTION_KEYS;
      const actions = getPresetActions(presetKey, moduleAvailable);
      return {
        module: module.id,
        actions,
        screens,
      };
    });
    setPermissions(normalizePermissionPayload(nextPermissions));
  }, [loading, modules, saving, selectedRole, setPermissions]);

  const handleExportCsv = useCallback(() => {
    if (!selectedRole) return;
    exportPermissionsToCsv(selectedRole, permissions, modules);
  }, [modules, permissions, selectedRole]);

  if (!selectedRole) {
    return (
      <section className="rbac-panel rbac-detail-panel">
        <EmptyState title="Select a role" message="Choose a role to view and stage permission changes." />
      </section>
    );
  }

  return (
    <section className="rbac-panel rbac-detail-panel">
      <div className="rbac-detail-header">
        <div className="rbac-selected-role">
          <RoleIcon role={selectedRole} selected />
          <div>
            <div className="rbac-selected-title">
              <h2>{selectedRole.name}</h2>
              {selectedRole.isProtected ? <span className="rbac-pill is-protected">Protected</span> : null}
              {selectedMember ? <span className="rbac-pill">Member Override</span> : null}
            </div>
            <p>{selectedMember ? `${selectedMember.name} - ${selectedMember.userId}` : selectedRole.description}</p>
          </div>
        </div>
        <div className="rbac-detail-actions">
          {selectedMember ? (
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onUseRolePermissions} disabled={loading || saving}>
              Role Default
            </button>
          ) : null}
        </div>
      </div>

      {selectedRole.isProtected ? (
        <div className="rbac-protected-note">
          <AlertTriangle size={16} aria-hidden="true" />
          Super Admin keeps full platform access. Critical permissions cannot be changed from this frontend screen.
        </div>
      ) : null}

      {loading ? (
        <div className="rbac-loading-card"><Loader label="Loading role permissions..." /></div>
      ) : (
        <>
          <PermissionMatrix
            modules={modules}
            permissionRows={permissions}
            selectedRole={selectedRole}
            saving={saving}
            query={query}
            onQuery={setQuery}
            onToggle={updateAction}
            markAllState={markAllState}
            onMarkAll={toggleMarkAll}
            onApplyPreset={applyPreset}
            onExportCsv={handleExportCsv}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onAddModule={onAddModule}
            onAddScreen={onAddScreen}
          />
          <div className="rbac-savebar">
            <span>{dirty ? "You have unsaved permission changes." : "Permissions are up to date."}</span>
            <div>
              <button type="button" className="cms-btn cms-btn-ghost" onClick={onReset} disabled={!dirty || saving}>
                <RotateCcw size={15} /> Reset
              </button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={onSave} disabled={!dirty || saving || selectedRole.isProtected}>
                {saving ? <RotateCcw className="rbac-spin" size={15} /> : <Save size={15} />} Save Permissions
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function UserRoleAssignment({ roles, modules, contextFilters, onRoleAssignmentsChanged }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  const [toast, setToast] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [assignMenuOpen, setAssignMenuOpen] = useState(false);
  const [removalCandidate, setRemovalCandidate] = useState(null);
  const [detailsView, setDetailsView] = useState({
    open: false,
    loading: false,
    user: null,
    permissions: [],
    error: "",
  });
  const menuRef = useRef(null);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getUserRoleAssignments({ search: query, page, pageSize: PAGE_SIZE, ...contextFilters });
      setResult(response.data);
    } catch (err) {
      setError(err?.message || "Unable to load user role assignments.");
    } finally {
      setLoading(false);
    }
  }, [page, query, contextFilters]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const totalPages = Math.max(1, Math.ceil((result.total || 0) / PAGE_SIZE));
  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [normalizeRoleCode(role.code || role.name), role.name])), [roles]);
  const assignableRoles = useMemo(
    () => roles.filter((role) => !ROLE_CODES_HIDDEN_FROM_ASSIGNMENT.has(normalizeRoleCode(role.code || role.name))),
    [roles],
  );

  const closeActionMenu = useCallback(() => {
    setActiveMenu(null);
    setAssignMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!activeMenu) return undefined;
    const onPointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      if (event.target.closest?.("[data-rbac-action-trigger='true']")) return;
      closeActionMenu();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeActionMenu();
    };
    const onReposition = () => closeActionMenu();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [activeMenu, closeActionMenu]);

  const toggleActionMenu = (user, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAssignMenuOpen(false);
    setActiveMenu((current) => (
      current?.user.id === user.id
        ? null
        : {
            user,
            rect: {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
          }
    ));
  };

  const removeRole = async (user, roleCode) => {
    setSavingUserId(user.id);
    try {
      await removeRoleFromUser(user.id, roleCode);
      setToast({ type: "success", message: "Role assignment updated." });
      await loadAssignments();
      await onRoleAssignmentsChanged?.();
    } catch (err) {
      setToast({ type: "error", message: err?.message || "Unable to remove role assignment." });
    } finally {
      setSavingUserId("");
    }
  };

  const requestRemoveRole = (user) => {
    const roleCode = (user.roleCodes || [])[0];
    if (!roleCode) {
      setToast({ type: "info", message: "This user does not have a role to remove." });
      closeActionMenu();
      return;
    }
    if (ROLE_CODES_HIDDEN_FROM_ASSIGNMENT.has(normalizeRoleCode(roleCode))) {
      setToast({ type: "error", message: "Protected administrator roles cannot be removed here." });
      closeActionMenu();
      return;
    }
    setRemovalCandidate({ user, roleCode });
    closeActionMenu();
  };

  const confirmRemoveRole = async () => {
    if (!removalCandidate) return;
    await removeRole(removalCandidate.user, removalCandidate.roleCode);
    setRemovalCandidate(null);
  };

  const assignRole = async (user, roleCode, roleId = null) => {
    if (!roleCode) return;
    if ((user.roleCodes || []).some((code) => normalizeRoleCode(code) === normalizeRoleCode(roleCode))) {
      setToast({ type: "info", message: "This user already has that role." });
      return;
    }
    setSavingUserId(user.id);
    try {
      await assignRoleToUser(user.id, roleCode, roleId);
      setToast({ type: "success", message: "Role assignment updated." });
      closeActionMenu();
      await loadAssignments();
      await onRoleAssignmentsChanged?.();
    } catch (err) {
      setToast({ type: "error", message: err?.message || "Unable to assign role." });
    } finally {
      setSavingUserId("");
    }
  };

  const openUserDetails = async (user) => {
    closeActionMenu();
    setDetailsView({
      open: true,
      loading: true,
      user,
      permissions: [],
      error: "",
    });
    try {
      const detailResponse = await getUserRoleDetails(user.id);
      const detailUser = detailResponse.data || user;
      if (!detailUser) throw new Error("Unable to load user details.");
      const assignedRoleCode = (detailUser.roleCodes || user.roleCodes || [])[0];
      const permissionResponse = assignedRoleCode
        ? await getUserPermissions(detailUser.id || user.id, assignedRoleCode)
        : { data: [] };
      setDetailsView({
        open: true,
        loading: false,
        user: detailUser,
        permissions: permissionResponse.data || [],
        error: "",
      });
    } catch {
      setDetailsView((current) => ({
        ...current,
        loading: false,
        error: "Unable to load user details. Please try again.",
      }));
    }
  };

  const closeUserDetails = () => {
    setDetailsView({
      open: false,
      loading: false,
      user: null,
      permissions: [],
      error: "",
    });
  };

  const renderActionMenu = () => {
    if (!activeMenu) return null;
    const menuWidth = 214;
    const submenuWidth = 260;
    const menuHeight = 130;
    const assignItemOffset = 6;
    const gap = 8;
    const margin = 10;
    const safeTop = Math.max(82, margin);
    const pairWidth = menuWidth + gap + submenuWidth;
    const submenuMaxHeight = Math.min(360, Math.max(190, window.innerHeight - safeTop - margin));
    const mainTop = Math.min(
      Math.max(safeTop, activeMenu.rect.top - 12),
      Math.max(safeTop, window.innerHeight - menuHeight - margin),
    );
    const canFitPairRight = activeMenu.rect.right + gap + pairWidth <= window.innerWidth - margin;
    const canFitPairLeft = activeMenu.rect.left - gap - pairWidth >= margin;
    let mainLeft;
    let submenuSide = "right";

    if (canFitPairRight) {
      mainLeft = activeMenu.rect.right + gap;
      submenuSide = "right";
    } else if (canFitPairLeft) {
      mainLeft = activeMenu.rect.left - gap - menuWidth;
      submenuSide = "left";
    } else {
      mainLeft = Math.min(
        Math.max(margin, activeMenu.rect.left - menuWidth - gap),
        window.innerWidth - menuWidth - margin,
      );
      const availableRight = window.innerWidth - (mainLeft + menuWidth) - margin - gap;
      const availableLeft = mainLeft - margin - gap;
      submenuSide = availableRight >= submenuWidth || availableRight >= availableLeft ? "right" : "left";
    }

    const submenuLeft = submenuSide === "right"
      ? Math.min(mainLeft + menuWidth + gap, window.innerWidth - submenuWidth - margin)
      : Math.max(margin, mainLeft - submenuWidth - gap);
    const submenuTop = Math.min(
      Math.max(safeTop, mainTop + assignItemOffset),
      Math.max(safeTop, window.innerHeight - submenuMaxHeight - margin),
    );
    const mainStyle = { top: mainTop, left: mainLeft };
    const submenuStyle = {
      top: submenuTop,
      left: submenuLeft,
      "--rbac-submenu-max-height": `${submenuMaxHeight}px`,
    };
    const currentRoleCode = (activeMenu.user.roleCodes || [])[0];
    const removeDisabled = !currentRoleCode || ROLE_CODES_HIDDEN_FROM_ASSIGNMENT.has(normalizeRoleCode(currentRoleCode)) || savingUserId === activeMenu.user.id;

    return createPortal(
      <div className="rbac-action-layer" ref={menuRef}>
        <div className="rbac-actions-menu" style={mainStyle} role="menu" aria-label={`Actions for ${activeMenu.user.name}`}>
          <button
            type="button"
            role="menuitem"
            className="rbac-action-menu-item"
            onMouseEnter={() => setAssignMenuOpen(true)}
            onFocus={() => setAssignMenuOpen(true)}
            onClick={() => setAssignMenuOpen((open) => !open)}
          >
            <UserPlus size={16} aria-hidden="true" />
            <span>Assign Role</span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            role="menuitem"
            className="rbac-action-menu-item is-danger"
            disabled={removeDisabled}
            onMouseEnter={() => setAssignMenuOpen(false)}
            onFocus={() => setAssignMenuOpen(false)}
            onClick={() => requestRemoveRole(activeMenu.user)}
          >
            <UserMinus size={16} aria-hidden="true" />
            <span>Remove Role</span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="rbac-action-menu-item"
            onMouseEnter={() => setAssignMenuOpen(false)}
            onFocus={() => setAssignMenuOpen(false)}
            onClick={() => openUserDetails(activeMenu.user)}
          >
            <Eye size={16} aria-hidden="true" />
            <span>View Details</span>
          </button>
        </div>

        {assignMenuOpen ? (
          <div
            className="rbac-role-submenu"
            style={submenuStyle}
            role="menu"
            aria-label={`Select role to assign to ${activeMenu.user.name}`}
            onMouseEnter={() => setAssignMenuOpen(true)}
          >
            <div className="rbac-role-submenu-title">Select Role to Assign</div>
            <div className="rbac-role-submenu-list">
              {assignableRoles.map((role) => {
                const isCurrent = (activeMenu.user.roleCodes || []).some((code) => normalizeRoleCode(code) === normalizeRoleCode(role.code));
                return (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isCurrent}
                    key={role.code}
                    className={`rbac-role-submenu-item ${isCurrent ? "is-current" : ""}`}
                    disabled={savingUserId === activeMenu.user.id}
                    onClick={() => assignRole(activeMenu.user, role.code, role.roleId || role.id)}
                  >
                    {role.name}
                    {isCurrent ? <Check size={14} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>,
      document.body,
    );
  };

  return (
    <section className="rbac-panel rbac-assignment-panel">
      {detailsView.open ? (
        <UserRoleDetailsPanel
          user={detailsView.user}
          permissions={detailsView.permissions}
          roles={roles}
          modules={modules}
          loading={detailsView.loading}
          error={detailsView.error}
          onBack={closeUserDetails}
          onRetry={() => detailsView.user && openUserDetails(detailsView.user)}
        />
      ) : (
        <>
      <div className="rbac-assignment-toolbar">
        <SearchBox
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="Search user, ID, type, department or role..."
          label="Search users"
        />
        <span className="rbac-api-note">Pagination-ready user role assignments</span>
      </div>

      {loading ? <div className="rbac-loading-card"><Loader label="Loading user assignments..." /></div> : null}
      {error && !loading ? (
        <EmptyState
          title="Unable to load assignments"
          message={error}
          action={<button type="button" className="cms-btn cms-btn-primary" onClick={loadAssignments}>Retry</button>}
        />
      ) : null}
      {!loading && !error ? (
        result.items.length ? (
          <>
            <div className="rbac-user-table">
              <div className="rbac-user-row rbac-user-head">
                <span>Name</span>
                <span>ID</span>
                <span>User Type</span>
                <span>Department / Designation</span>
                <span>Current Role(s)</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {result.items.map((user) => (
                <div className="rbac-user-row" key={user.id}>
                  <strong className="rbac-user-name"><span>{initials(user.name)}</span>{user.name}</strong>
                  <span>{user.userId || "Not provided"}</span>
                  <span>{user.userType || "User"}</span>
                  <span>{[user.department, user.designation].filter(Boolean).join(" / ") || "Not provided"}</span>
                  <span className="rbac-role-chips">
                    {(user.roleCodes || []).length ? user.roleCodes.map((code) => (
                      <em key={code}>{roleNameByCode.get(normalizeRoleCode(code)) || code}</em>
                    )) : <small>No role</small>}
                  </span>
                  <span><StatusBadge value={user.status || "Active"} /></span>
                  <span className="rbac-row-actions">
                    <button
                      type="button"
                      className={`rbac-row-menu-btn ${activeMenu?.user.id === user.id ? "is-open" : ""}`}
                      data-rbac-action-trigger="true"
                      aria-label={`Actions for ${user.name}`}
                      aria-haspopup="menu"
                      aria-expanded={activeMenu?.user.id === user.id}
                      disabled={savingUserId === user.id}
                      onClick={(event) => toggleActionMenu(user, event)}
                    >
                      <MoreVertical size={18} aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
            <div className="rbac-pagination">
              <button type="button" className="rbac-page-btn" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft size={15} /> Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="rbac-page-btn" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <EmptyState title="No users found" message="No matching user-role assignments are available from the current data source." />
        )
      ) : null}
        </>
      )}

      {renderActionMenu()}
      {removalCandidate ? (
        <ConfirmDialog
          title="Remove Role"
          danger
          loading={savingUserId === removalCandidate.user.id}
          confirmLabel="Remove Role"
          loadingLabel="Removing..."
          message={`${removalCandidate.user.name} currently has ${roleNameByCode.get(normalizeRoleCode(removalCandidate.roleCode)) || removalCandidate.roleCode}. This role will be removed from the user.`}
          onCancel={() => setRemovalCandidate(null)}
          onConfirm={confirmRemoveRole}
        />
      ) : null}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </section>
  );
}

export default function RolesPermissionsPage() {
  const { selectedCampus } = useCampusContext();
  const { selectedBoard, selectedAcademicYear, selectedBoardId, selectedAcademicYearId } = useAcademicContext();

  const activeCampusId = useMemo(() => parseNumericId(selectedCampus?.id ?? selectedCampus?.campusId), [selectedCampus]);
  const activeBoardId = useMemo(() => parseNumericId(selectedBoardId ?? selectedBoard?.id ?? selectedBoard?.boardId), [selectedBoardId, selectedBoard]);
  const activeAcademicYearId = useMemo(() => parseNumericId(selectedAcademicYearId ?? selectedAcademicYear?.id ?? selectedAcademicYear?.academicYearId), [selectedAcademicYearId, selectedAcademicYear]);

  const activeContextFilters = useMemo(() => ({
    campusId: activeCampusId,
    boardId: activeBoardId,
    academicYearId: activeAcademicYearId,
  }), [activeCampusId, activeBoardId, activeAcademicYearId]);

  const [activeTab, setActiveTab] = useState("permissions");
  const [allRoles, setAllRoles] = useState([]);
  const [manageableRoles, setManageableRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [roleMembers, setRoleMembers] = useState([]);
  const [membersError, setMembersError] = useState("");
  const [membersRole, setMembersRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [lastSavedPermissions, setLastSavedPermissions] = useState([]);
  const [roleQuery, setRoleQuery] = useState("");
  const [permissionQuery, setPermissionQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cloningRole, setCloningRole] = useState(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [addingModule, setAddingModule] = useState(false);
  const [addingScreen, setAddingScreen] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [deletingRole, setDeletingRole] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const permissionSaveInFlightRef = useRef(false);
  const selectedRoleIdRef = useRef(null);
  const selectedRoleRef = useRef(null);
  const pageRequestRef = useRef(0);
  const roleCountsRequestRef = useRef(0);

  useEffect(() => {
    selectedRoleRef.current = selectedRole;
    selectedRoleIdRef.current = selectedRole?.id;
  }, [selectedRole]);

  const refreshRoleCounts = useCallback(async () => {
    const requestId = roleCountsRequestRef.current + 1;
    roleCountsRequestRef.current = requestId;
    setAllRoles((roles) => roles.map((role) => ({ ...role, assignedUserCount: null })));
    setManageableRoles((roles) => roles.map((role) => ({ ...role, assignedUserCount: null })));
    try {
      const response = await getRoles(activeContextFilters);
      if (roleCountsRequestRef.current !== requestId) return;
      const nextAllRoles = response.data;
      setAllRoles(nextAllRoles);
      setManageableRoles(getManageableRoles(nextAllRoles));
      setSelectedRole((role) => (
        role
          ? nextAllRoles.find((nextRole) => isSameRole(nextRole, role)) || role
          : role
      ));
    } catch (err) {
      console.error("Failed to refresh role counts:", err);
    }
  }, [activeContextFilters]);

  const dirty = useMemo(
    () => JSON.stringify(normalizePermissionPayload(permissions)) !== JSON.stringify(normalizePermissionPayload(lastSavedPermissions)),
    [lastSavedPermissions, permissions],
  );

  const loadPermissions = useCallback(async (role) => {
    if (!role) return;
    setPermissionLoading(true);
    try {
      const response = await getRolePermissions(role.id, role.code);
      setPermissions(response.data);
      setLastSavedPermissions(response.data);
    } catch (err) {
      setToast({ type: "error", message: err?.message || "Unable to load role permissions." });
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  const loadRoleMembers = useCallback(async (role, openDialog = false) => {
    if (!role) return;
    setMembersLoading(true);
    if (openDialog) {
      setMembersRole(role);
      setRoleMembers([]);
      setMembersError("");
      setMembersDialogOpen(true);
    }
    try {
      const members = getUniqueMembers((await getRoleMembers(role.id, role.code, activeContextFilters)).data || []);
      setRoleMembers(members);
      setMembersError("");
      setMembersRole((current) => (
        current && isSameRole(current, role)
          ? { ...current, assignedUserCount: members.length }
          : current
      ));
      setAllRoles((prevRoles) =>
        prevRoles.map((r) =>
          isSameRole(r, role) ? { ...r, assignedUserCount: members.length } : r
        )
      );
    } catch (err) {
      setRoleMembers([]);
      setMembersError(err?.message || "Unable to load role members.");
      setToast({ type: "error", message: err?.message || "Unable to load role members." });
    } finally {
      setMembersLoading(false);
    }
  }, [activeContextFilters]);

  const loadMemberPermissions = useCallback(async (member, role = selectedRole) => {
    if (!member || !role) return;
    setPermissionLoading(true);
    try {
      const roleCode = (member.roleCodes || [role.code])[0] || role.code;
      const response = await getUserPermissions(member.id, roleCode);
      setSelectedMember(member);
      setPermissions(response.data);
      setLastSavedPermissions(response.data);
      setMembersDialogOpen(false);
    } catch (err) {
      setToast({ type: "error", message: err?.message || "Unable to load member permissions." });
    } finally {
      setPermissionLoading(false);
    }
  }, [selectedRole]);

  const loadPage = useCallback(async () => {
    const requestId = pageRequestRef.current + 1;
    pageRequestRef.current = requestId;
    setLoading(true);
    setError("");
    try {
      const [rolesResponse, modulesResponse] = await Promise.all([
        getRoles(activeContextFilters),
        getModulesAndPermissions(),
      ]);
      if (pageRequestRef.current !== requestId) return;
      const nextAllRoles = rolesResponse.data;
      const nextManageableRoles = getManageableRoles(nextAllRoles);
      setAllRoles(nextAllRoles);
      setManageableRoles(nextManageableRoles);
      setModules(modulesResponse.data);
      const role = nextAllRoles.find((r) => isSameRole(r, selectedRoleRef.current) || (selectedRoleIdRef.current != null && String(r.id) === String(selectedRoleIdRef.current))) || nextAllRoles[0] || null;
      setSelectedRole(role);
      if (role) {
        await loadPermissions(role);
        await loadRoleMembers(role);
      }
    } catch (err) {
      if (pageRequestRef.current === requestId) setError(err?.message || "Unable to load roles and permissions.");
    } finally {
      if (pageRequestRef.current === requestId) setLoading(false);
    }
  }, [activeContextFilters, loadPermissions, loadRoleMembers]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    const handleStaffRecordsUpdated = () => {
      refreshRoleCounts();
    };
    window.addEventListener("staff-records-updated", handleStaffRecordsUpdated);
    window.addEventListener("roles-updated", handleStaffRecordsUpdated);
    return () => {
      window.removeEventListener("staff-records-updated", handleStaffRecordsUpdated);
      window.removeEventListener("roles-updated", handleStaffRecordsUpdated);
    };
  }, [refreshRoleCounts]);

  useEffect(() => {
    if (!dirty) return undefined;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const guardDirty = () => !dirty || window.confirm("Discard unsaved permission changes?");

  const selectRole = async (role) => {
    if (isSameRole(role, selectedRole)) return;
    if (!guardDirty()) return;
    setSelectedRole(role);
    setSelectedMember(null);
    await loadPermissions(role);
    await loadRoleMembers(role);
  };

  const openRoleMembers = async (role) => {
    await loadRoleMembers(role, true);
  };

  const closeMembersDialog = useCallback(() => {
    setMembersDialogOpen(false);
    setMembersRole(null);
    setRoleMembers([]);
    setMembersError("");
  }, []);

  const useRolePermissions = async () => {
    if (!selectedRole) return;
    if (!guardDirty()) return;
    setSelectedMember(null);
    await loadPermissions(selectedRole);
    setMembersDialogOpen(false);
  };

  const selectMember = async (member) => {
    const role = membersRole || selectedRole;
    if (!role || (String(role.id) === String(selectedRole?.id) && String(member.id) === String(selectedMember?.id))) {
      closeMembersDialog();
      return;
    }
    if (!guardDirty()) return;
    setSelectedRole(role);
    await loadMemberPermissions(member, role);
  };

  const selectTab = (tab) => {
    if (tab === activeTab) return;
    if (!guardDirty()) return;
    setActiveTab(tab);
  };

  const persistPermissions = useCallback(async (target, nextPermissions, previousPermissions = lastSavedPermissions) => {
    const role = target?.role;
    const member = target?.user;
    const targetType = target?.type || "role";
    if (!role || role.isProtected || saving || permissionSaveInFlightRef.current) return false;
    permissionSaveInFlightRef.current = true;
    setSaving(true);
    try {
      const normalized = normalizePermissionPayload(nextPermissions);
      const response = targetType === "user" && member
        ? await updateUserPermissions(member.id, {
            userId: member.id,
            roleId: role.id,
            roleCode: role.code,
            permissions: normalized,
          })
        : await updateRolePermissions(role.id, {
            roleId: role.id,
            permissions: normalized,
          });
      const sameRole = String(selectedRole?.id) === String(role.id);
      const sameMember = !member || String(selectedMember?.id) === String(member.id);
      if (sameRole && sameMember) {
        setPermissions(response.data);
        setLastSavedPermissions(response.data);
      }
      setToast({ type: "success", message: `${member ? "Member" : "Role"} permissions saved.` });
      return true;
    } catch (err) {
      const sameRole = String(selectedRole?.id) === String(role.id);
      const sameMember = !member || String(selectedMember?.id) === String(member.id);
      if (sameRole && sameMember) setPermissions(previousPermissions);
      setToast({ type: "error", message: err?.message || "Unable to save permissions." });
      return false;
    } finally {
      permissionSaveInFlightRef.current = false;
      setSaving(false);
    }
  }, [lastSavedPermissions, saving, selectedMember, selectedRole]);

  const savePermissions = async () => {
    if (!selectedRole || selectedRole.isProtected) return;
    await persistPermissions({ type: selectedMember ? "user" : "role", role: selectedRole, user: selectedMember }, permissions, lastSavedPermissions);
  };

  // Always show ALL modules so admins can grant permissions for any module to any role.
  // Permission data is used only to set toggle states, not to filter module visibility.
  const visiblePermissionModules = modules;

  const routeNote = "";

  return (
    <DashboardLayout
      title="Roles & Permissions"
      subtitle="Configure system roles, module and screen-wise permissions, and user role assignments."
      breadcrumb={["Home", "Administration", "Roles & Permissions"]}
    >
      <main className="rbac-page">
        <div className="rbac-tabs" role="tablist" aria-label="Roles and permissions sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "permissions"}
            className={activeTab === "permissions" ? "is-active" : ""}
            onClick={() => selectTab("permissions")}
          >
            <ShieldCheck size={16} /> Permission Matrix
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "assignments"}
            className={activeTab === "assignments" ? "is-active" : ""}
            onClick={() => selectTab("assignments")}
          >
            <UserPlus size={16} /> User Role Assignment
          </button>
          {routeNote ? <span className="rbac-route-note"><Check size={14} /> {routeNote}</span> : null}
        </div>

        {loading ? <div className="rbac-loading-card"><Loader label="Loading roles and permissions..." /></div> : null}
        {error && !loading ? (
          <EmptyState
            title="Unable to load Roles & Permissions"
            message={error}
            action={<button type="button" className="cms-btn cms-btn-primary" onClick={loadPage}>Retry</button>}
          />
        ) : null}

        {!loading && !error && activeTab === "permissions" ? (
          <div className="rbac-grid">
            <RoleList
              roles={allRoles}
              selectedRoleId={selectedRole?.id}
              selectedRole={selectedRole}
              onSelect={selectRole}
              onOpenMembers={openRoleMembers}
              onCloneRole={(role) => setCloningRole(role)}
              onNewRole={() => setCreatingRole(true)}
              onEditRole={(role) => setEditingRole(role)}
              onDeleteRole={(role) => setDeletingRole(role)}
              query={roleQuery}
              onQuery={setRoleQuery}
            />
            <RoleDetails
              selectedRole={selectedRole}
              selectedMember={selectedMember}
              modules={visiblePermissionModules}
              permissions={permissions}
              setPermissions={setPermissions}
              onUseRolePermissions={useRolePermissions}
              loading={permissionLoading}
              saving={saving}
              dirty={dirty}
              query={permissionQuery}
              setQuery={setPermissionQuery}
              onSave={savePermissions}
              onReset={() => setPermissions(lastSavedPermissions)}
              onAddModule={() => setAddingModule(true)}
              onAddScreen={(targetMod) => setAddingScreen(targetMod || true)}
            />
          </div>
        ) : null}

        {!loading && !error && activeTab === "assignments" ? <UserRoleAssignment roles={allRoles} modules={modules} contextFilters={activeContextFilters} onRoleAssignmentsChanged={refreshRoleCounts} /> : null}
        {membersDialogOpen ? (
          <RoleMembersDialog
            role={membersRole}
            members={roleMembers}
            loading={membersLoading}
            error={membersError}
            onRetry={() => membersRole && loadRoleMembers(membersRole, true)}
            onSelectMember={selectMember}
            onClose={closeMembersDialog}
          />
        ) : null}

        {creatingRole ? (
          <CreateRoleModal
            onClose={() => setCreatingRole(false)}
            onCreateSuccess={async (newRole) => {
              setCreatingRole(false);
              setToast({ type: "success", message: `Role "${newRole.name || 'New Role'}" created successfully!` });
              await loadPage();
            }}
          />
        ) : null}
        {editingRole ? (
          <EditRoleModal
            role={editingRole}
            onClose={() => setEditingRole(null)}
            onEditSuccess={async (updated) => {
              setEditingRole(null);
              setToast({ type: "success", message: `Role "${updated.name}" updated successfully!` });
              await loadPage();
            }}
          />
        ) : null}
        {deletingRole ? (
          <ConfirmDialog
            isOpen={true}
            title="Delete Role"
            message={`Are you sure you want to delete "${deletingRole.name}"? This action cannot be undone.${deletingRole.assignedUserCount > 0 ? ` Note: ${deletingRole.assignedUserCount} user(s) currently have this role.` : ''}`}
            confirmText="Delete Role"
            confirmVariant="danger"
            onConfirm={async () => {
              try {
                await deleteRole(deletingRole.id);
                setToast({ type: "success", message: `Role "${deletingRole.name}" deleted successfully!` });
                setDeletingRole(null);
                await loadPage();
              } catch (err) {
                setToast({ type: "error", message: err?.message || "Failed to delete role." });
              }
            }}
            onCancel={() => setDeletingRole(null)}
          />
        ) : null}
        {cloningRole ? (
          <CloneRoleModal
            role={cloningRole}
            onClose={() => setCloningRole(null)}
            onCloneSuccess={async (newRole) => {
              setCloningRole(null);
              setToast({ type: "success", message: `Role "${newRole.name || 'Cloned Role'}" created successfully!` });
              await loadPage();
            }}
          />
        ) : null}
        {addingModule ? (
          <AddModuleModal
            onClose={() => setAddingModule(false)}
            onAddSuccess={async (newModule) => {
              setAddingModule(false);
              setToast({ type: "success", message: `Module "${newModule.name}" added successfully!` });
              await loadPage();
            }}
          />
        ) : null}
        {addingScreen ? (
          <AddScreenModal
            module={typeof addingScreen === "object" ? addingScreen : null}
            modules={modules}
            onClose={() => setAddingScreen(null)}
            onAddSuccess={async (modId, newScreen) => {
              setAddingScreen(null);
              setToast({ type: "success", message: `Screen "${newScreen.name}" added successfully!` });
              await loadPage();
            }}
          />
        ) : null}
      </main>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
