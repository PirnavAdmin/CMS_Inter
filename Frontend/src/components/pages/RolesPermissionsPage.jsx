import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreVertical,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import {
  ACTION_LABELS,
  ACTIONS,
  ALL_PERMISSION_MODULES,
} from "@/features/rolesPermissions/rolesPermissions.constants.js";
import {
  assignRoleToUser,
  getModulesAndPermissions,
  getRolePermissions,
  getRoles,
  getRoleMembers,
  getUserPermissions,
  getUserRoleDetails,
  getUserRoleAssignments,
  removeRoleFromUser,
  rolesPermissionsApiConfig,
  updateRolePermissions,
  updateUserPermissions,
} from "@/features/rolesPermissions/rolesPermissions.service.js";
import { normalizePermissionPayload, togglePermissionAction } from "@/features/rolesPermissions/permissionUtils.jsx";
import "./RolesPermissionsPage.css";

const PAGE_SIZE = 8;
const REQUIRED_MANAGEMENT_ROLE_CODES = [
  "HOD",
  "FACULTY",
  "STUDENT",
  "PARENT",
  "ACCOUNTS",
  "EXAMINATION_CELL",
  "LIBRARIAN",
  "HOSTEL_WARDEN",
  "PLACEMENT_OFFICER",
  "BUS_DRIVER",
];
const ROLE_CODES_HIDDEN_FROM_ASSIGNMENT = new Set(["SUPER_ADMIN", "ADMIN"]);
const MATRIX_ACTION_COLUMNS = [
  { key: ACTIONS.VIEW, label: "View" },
  { key: ACTIONS.CREATE, label: "Add" },
  { key: ACTIONS.EDIT, label: "Edit" },
  { key: ACTIONS.DELETE, label: "Delete" },
];
const MATRIX_ACTION_KEYS = MATRIX_ACTION_COLUMNS.map((action) => action.key);

function getManageableRoles(roles = []) {
  const rolesByCode = new Map();
  roles.forEach((role) => {
    if (role?.code && !rolesByCode.has(role.code)) rolesByCode.set(role.code, role);
  });
  return REQUIRED_MANAGEMENT_ROLE_CODES
    .map((code) => rolesByCode.get(code))
    .filter(Boolean);
}

function getEditablePermissionTargets(modules = [], selectedRole, busy = false) {
  if (!selectedRole || selectedRole.isProtected || busy) return [];
  return modules.flatMap((module) => (
    MATRIX_ACTION_KEYS.map((action) => ({ moduleId: module.id, action }))
  ));
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

function SearchBox({ value, onChange, placeholder, label }) {
  return (
    <label className="rbac-search" aria-label={label}>
      <Search size={16} aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
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

function PermissionToggle({ checked, disabled, disabledReason, onChange, label }) {
  const isChecked = Boolean(checked);
  const isDisabled = Boolean(disabled);

  return (
    <button
      type="button"
      className={`rbac-switch ${isChecked ? "is-on" : ""}`}
      role="switch"
      aria-checked={isChecked}
      aria-label={label}
      disabled={isDisabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!isDisabled) onChange(!isChecked);
      }}
      title={isDisabled ? disabledReason : label}
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
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RoleList({ roles, selectedRoleId, onSelect, query, onQuery }) {
  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) =>
      [role.name, role.code, role.description].some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [roles, query]);

  return (
    <section className="rbac-panel rbac-role-panel">
      <div className="rbac-panel-head">
        <h2>Roles</h2>
      </div>
      <SearchBox value={query} onChange={onQuery} placeholder="Search roles..." label="Search roles" />
      <div className="rbac-role-list">
        {filteredRoles.length ? filteredRoles.map((role) => {
          const selected = String(role.id) === String(selectedRoleId);
          return (
            <button
              type="button"
              className={`rbac-role-item ${selected ? "is-selected" : ""}`}
              key={role.id}
              onClick={() => onSelect(role)}
            >
              <RoleIcon role={role} selected={selected} />
              <span className="rbac-role-copy">
                <strong>{role.name}</strong>
                <span className="rbac-role-flags">
                  {role.isProtected ? <em>Protected</em> : null}
                  {role.discoveredFrom ? <em>Configured</em> : null}
                </span>
              </span>
              <span className="rbac-user-count" title="Assigned users">{role.assignedUserCount ?? 0}</span>
            </button>
          );
        }) : (
          <EmptyState title="No roles found" message="Try a different role name or code." />
        )}
      </div>
    </section>
  );
}

function RoleMembersDialog({ role, members, loading, selectedMember, onSelectMember, onUseRolePermissions, onClose }) {
  if (!role) return null;
  return createPortal(
    <div className="rbac-modal-layer" role="presentation">
      <section className="rbac-member-dialog" role="dialog" aria-modal="true" aria-label={`${role.name} members`}>
        <div className="rbac-member-dialog-head">
          <div>
            <h3>{role.name} Members</h3>
            <p>Select one member to configure individual permissions.</p>
          </div>
          <button type="button" className="rbac-icon-action" onClick={onClose} aria-label="Close members dialog">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="rbac-member-dialog-actions">
          <button
            type="button"
            className={`rbac-member-role-default ${!selectedMember ? "is-selected" : ""}`}
            onClick={onUseRolePermissions}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Configure role default permissions</span>
            {!selectedMember ? <Check size={15} aria-hidden="true" /> : null}
          </button>
        </div>
        <div className="rbac-member-list">
          {loading ? <Loader label="Loading role members..." /> : null}
          {!loading && members.length ? members.map((member) => {
            const selected = String(member.id) === String(selectedMember?.id);
            return (
              <button
                type="button"
                key={member.id}
                className={`rbac-member-item ${selected ? "is-selected" : ""}`}
                onClick={() => onSelectMember(member)}
              >
                <span className="rbac-member-avatar">{initials(member.name)}</span>
                <span className="rbac-member-copy">
                  <strong>{member.name}</strong>
                  <small>{member.userId} - {[member.department, member.designation].filter(Boolean).join(" / ") || "No department"}</small>
                </span>
                <StatusBadge value={member.status || "Active"} />
              </button>
            );
          }) : null}
          {!loading && !members.length ? (
            <div className="rbac-member-empty">
              <Users size={24} aria-hidden="true" />
              <strong>No members found</strong>
              <span>This role does not have static members configured yet.</span>
            </div>
          ) : null}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function PermissionMatrix({ modules, permissionRows, selectedRole, saving, query, onQuery, onToggle, markAllState, onMarkAll }) {
  const permissionMap = useMemo(() => new Map(permissionRows.map((row) => [row.module, row.actions || []])), [permissionRows]);
  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((module) =>
      [module.name, module.id, module.section, ...MATRIX_ACTION_COLUMNS.map((action) => action.label), ...(module.availableActions || []).map((action) => ACTION_LABELS[action] || action)]
        .some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [modules, query]);

  return (
    <div className="rbac-permission-wrap">
      <div className="rbac-permission-toolbar">
        <h3>Permissions</h3>
        <SearchBox value={query} onChange={onQuery} placeholder="Search permissions..." label="Search permissions" />
        <MarkAllControl
          checked={markAllState.checked}
          indeterminate={markAllState.indeterminate}
          disabled={markAllState.disabled}
          roleName={selectedRole?.name}
          onChange={onMarkAll}
        />
      </div>
      {filteredModules.length ? (
        <div className="rbac-matrix" role="table" aria-label={`${selectedRole?.name || "Role"} permissions`}>
          <div className="rbac-matrix-row rbac-matrix-head" role="row">
            <span role="columnheader">Module</span>
            {MATRIX_ACTION_COLUMNS.map((action) => (
              <span role="columnheader" key={action.key}>{action.label}</span>
            ))}
          </div>
          {filteredModules.map((module) => {
            const Icon = module.icon || ShieldCheck;
            const selectedActions = permissionMap.get(module.id) || [];
            return (
              <div className="rbac-matrix-row" role="row" key={module.id}>
                <div className="rbac-module-cell" role="cell">
                  <span className="rbac-module-icon"><Icon size={19} aria-hidden="true" /></span>
                  <span>
                    <strong>{module.name}</strong>
                    <small>{module.section}</small>
                  </span>
                </div>
                {MATRIX_ACTION_COLUMNS.map((action) => {
                  const restriction = getPermissionRestriction({ selectedRole, saving });
                  const checked = restriction.supported && (selectedRole?.isProtected || selectedActions.includes(action.key));
                  return (
                    <div className="rbac-matrix-action-cell" role="cell" key={`${module.id}-${action.key}`}>
                      <PermissionToggle
                        checked={checked}
                        disabled={restriction.disabled}
                        disabledReason={restriction.reason}
                        label={`${action.label} ${module.name}`}
                        onChange={(next) => {
                          if (!restriction.disabled) {
                            onToggle({
                              roleId: selectedRole?.id,
                              moduleId: module.id,
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
        </div>
      ) : (
        <EmptyState title="No permissions found" message="Try searching by module, section or action." />
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

function UserRoleDetailsPanel({ user, permissions, roles, loading, error, onBack, onRetry }) {
  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [role.code, role.name])), [roles]);
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
                      <em key={code}>{roleNameByCode.get(code) || code}</em>
                    )) : <small>No role assigned</small>}
                  </dd>
                </div>
                <div><dt>Assigned Role</dt><dd>{assignedRoleCode ? roleNameByCode.get(assignedRoleCode) || assignedRoleCode : "Not assigned"}</dd></div>
                <div><dt>Role Status</dt><dd><StatusBadge value={user.status || "Active"} /></dd></div>
              </dl>
            </section>
          </div>

          <section className="rbac-user-detail-card rbac-user-permission-card">
            <h4>Permission Information</h4>
            <div className="rbac-detail-permission-table">
              <div className="rbac-detail-permission-row rbac-detail-permission-head">
                <span>Module Name</span>
                {MATRIX_ACTION_COLUMNS.map((action) => <span key={action.key}>{action.label}</span>)}
              </div>
              {ALL_PERMISSION_MODULES.map((module) => {
                const actions = permissionMap.get(module.id) || [];
                return (
                  <div className="rbac-detail-permission-row" key={module.id}>
                    <span className="rbac-detail-module-name">
                      <strong>{module.name}</strong>
                      <small>{module.section}</small>
                    </span>
                    {MATRIX_ACTION_COLUMNS.map((action) => (
                      <span key={action.key}>
                        <PermissionStateMark enabled={actions.includes(action.key)} label={`${module.name} ${action.label}`} />
                      </span>
                    ))}
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
  onPersistPermissions,
  onOpenMembers,
  onUseRolePermissions,
  loading,
  saving,
  dirty,
  query,
  setQuery,
  onSave,
  onReset,
}) {
  const updateAction = useCallback(({ roleId, moduleId, action, checked }) => {
    if (!selectedRole || String(roleId) !== String(selectedRole.id) || selectedRole.isProtected || loading || saving) return;
    if (!modules.some((module) => module.id === moduleId) || !MATRIX_ACTION_KEYS.includes(action)) return;

    const previousPermissions = permissions;
    const existing = previousPermissions.find((row) => row.module === moduleId);
    const nextActions = togglePermissionAction(existing?.actions || [], action, Boolean(checked));
    const withoutModule = previousPermissions.filter((row) => row.module !== moduleId);
    const nextPermissions = normalizePermissionPayload([...withoutModule, { module: moduleId, actions: nextActions }]);
    setPermissions(nextPermissions);
    onPersistPermissions({ type: selectedMember ? "user" : "role", role: selectedRole, user: selectedMember }, nextPermissions, previousPermissions);
  }, [loading, modules, onPersistPermissions, permissions, saving, selectedMember, selectedRole, setPermissions]);

  const editablePermissionTargets = useMemo(
    () => getEditablePermissionTargets(modules, selectedRole, loading || saving),
    [loading, modules, saving, selectedRole],
  );

  const markAllState = useMemo(() => {
    if (!selectedRole || loading || saving || !editablePermissionTargets.length) {
      return { checked: false, indeterminate: false, disabled: true };
    }
    const permissionMap = new Map(permissions.map((row) => [row.module, row.actions || []]));
    const selectedCount = editablePermissionTargets.filter(({ moduleId, action }) =>
      (permissionMap.get(moduleId) || []).includes(action),
    ).length;
    return {
      checked: selectedCount === editablePermissionTargets.length,
      indeterminate: selectedCount > 0 && selectedCount < editablePermissionTargets.length,
      disabled: false,
    };
  }, [editablePermissionTargets, loading, permissions, saving, selectedRole]);

  const toggleMarkAll = () => {
    if (markAllState.disabled) return;
    const shouldEnable = !markAllState.checked;
    const previousPermissions = permissions;
    const byModule = new Map(previousPermissions.map((row) => [row.module, row.actions || []]));
    modules.forEach((module) => {
      const editableActions = MATRIX_ACTION_KEYS;
      let nextActions = byModule.get(module.id) || [];
      if (shouldEnable) {
        nextActions = [...new Set([...nextActions, ...editableActions])];
      } else {
        editableActions.forEach((action) => {
          nextActions = togglePermissionAction(nextActions, action, false);
        });
      }
      byModule.set(module.id, nextActions);
    });
    const nextPermissions = normalizePermissionPayload([...byModule.entries()].map(([module, actions]) => ({ module, actions })));
    setPermissions(nextPermissions);
    onPersistPermissions({ type: selectedMember ? "user" : "role", role: selectedRole, user: selectedMember }, nextPermissions, previousPermissions);
  };

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
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onOpenMembers} disabled={loading || saving}>
            <Users size={15} /> Members
          </button>
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

function UserRoleAssignment({ roles }) {
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
      const response = await getUserRoleAssignments({ search: query, page, pageSize: PAGE_SIZE });
      setResult(response.data);
    } catch (err) {
      setError(err?.message || "Unable to load user role assignments.");
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const totalPages = Math.max(1, Math.ceil((result.total || 0) / PAGE_SIZE));
  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [role.code, role.name])), [roles]);
  const assignableRoles = useMemo(
    () => roles.filter((role) => !ROLE_CODES_HIDDEN_FROM_ASSIGNMENT.has(role.code)),
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
    if (roleCode === "SUPER_ADMIN" || roleCode === "ADMIN") {
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

  const assignRole = async (user, roleCode) => {
    if (!roleCode) return;
    if ((user.roleCodes || []).includes(roleCode)) {
      setToast({ type: "info", message: "This user already has that role." });
      return;
    }
    setSavingUserId(user.id);
    try {
      await assignRoleToUser(user.id, roleCode);
      setToast({ type: "success", message: "Role assignment updated." });
      closeActionMenu();
      await loadAssignments();
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
    const removeDisabled = !currentRoleCode || ROLE_CODES_HIDDEN_FROM_ASSIGNMENT.has(currentRoleCode) || savingUserId === activeMenu.user.id;

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
                const isCurrent = (activeMenu.user.roleCodes || []).includes(role.code);
                return (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isCurrent}
                    key={role.code}
                    className={`rbac-role-submenu-item ${isCurrent ? "is-current" : ""}`}
                    disabled={savingUserId === activeMenu.user.id}
                    onClick={() => assignRole(activeMenu.user, role.code)}
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
                      <em key={code}>{roleNameByCode.get(code) || code}</em>
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
          message={`${removalCandidate.user.name} currently has ${roleNameByCode.get(removalCandidate.roleCode) || removalCandidate.roleCode}. This role will be removed from the user.`}
          onCancel={() => setRemovalCandidate(null)}
          onConfirm={confirmRemoveRole}
        />
      ) : null}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </section>
  );
}

export default function RolesPermissionsPage() {
  const [activeTab, setActiveTab] = useState("permissions");
  const [allRoles, setAllRoles] = useState([]);
  const [manageableRoles, setManageableRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [roleMembers, setRoleMembers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [lastSavedPermissions, setLastSavedPermissions] = useState([]);
  const [roleQuery, setRoleQuery] = useState("");
  const [permissionQuery, setPermissionQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const permissionSaveInFlightRef = useRef(false);

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
    if (openDialog) setMembersDialogOpen(true);
    try {
      const response = await getRoleMembers(role.id, role.code);
      setRoleMembers(response.data);
    } catch (err) {
      setRoleMembers([]);
      setToast({ type: "error", message: err?.message || "Unable to load role members." });
    } finally {
      setMembersLoading(false);
    }
  }, []);

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
    setLoading(true);
    setError("");
    try {
      const [rolesResponse, modulesResponse] = await Promise.all([
        getRoles(),
        getModulesAndPermissions(),
      ]);
      const nextAllRoles = rolesResponse.data;
      const nextManageableRoles = getManageableRoles(nextAllRoles);
      setAllRoles(nextAllRoles);
      setManageableRoles(nextManageableRoles);
      setModules(modulesResponse.data.length ? modulesResponse.data : ALL_PERMISSION_MODULES);
      const role = nextManageableRoles[0] || null;
      setSelectedRole(role);
      if (rolesResponse.meta?.usingFallback) {
        setToast({ type: "info", message: "Roles & Permissions is using local fallback data until RBAC endpoints are connected." });
      }
      if (role) {
        await loadPermissions(role);
        await loadRoleMembers(role);
      }
    } catch (err) {
      setError(err?.message || "Unable to load roles and permissions.");
    } finally {
      setLoading(false);
    }
  }, [loadPermissions, loadRoleMembers]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

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
    if (String(role.id) === String(selectedRole?.id)) return;
    if (!guardDirty()) return;
    setSelectedRole(role);
    setSelectedMember(null);
    await loadPermissions(role);
    await loadRoleMembers(role, true);
  };

  const openMembersForSelectedRole = async () => {
    if (!selectedRole) return;
    await loadRoleMembers(selectedRole, true);
  };

  const useRolePermissions = async () => {
    if (!selectedRole) return;
    if (!guardDirty()) return;
    setSelectedMember(null);
    await loadPermissions(selectedRole);
    setMembersDialogOpen(false);
  };

  const selectMember = async (member) => {
    if (!selectedRole || String(member.id) === String(selectedMember?.id)) {
      setMembersDialogOpen(false);
      return;
    }
    if (!guardDirty()) return;
    await loadMemberPermissions(member, selectedRole);
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
      setToast({
        type: response.meta?.usingFallback ? "info" : "success",
        message: response.meta?.usingFallback
          ? `${member ? "Member" : "Role"} permissions saved in local fallback. Backend permission API is not available/connected yet.`
          : `${member ? "Member" : "Role"} permissions saved.`,
      });
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

  const routeNote = rolesPermissionsApiConfig.updateRolePermissions
    ? "Connected to RBAC service"
    : "Local fallback active";

  return (
    <DashboardLayout
      title="Roles & Permissions"
      subtitle="Manage system roles and module-level permissions to control access across the college management system."
      breadcrumb={["Home", "Administration", "Roles & Permissions"]}
    >
      <main className="rbac-page">
        <div className="rbac-tabs" role="tablist" aria-label="Roles and permissions sections">
          <button type="button" role="tab" aria-selected={activeTab === "permissions"} className={activeTab === "permissions" ? "is-active" : ""} onClick={() => selectTab("permissions")}>
            <ShieldCheck size={16} /> Roles & Permissions
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "assignments"} className={activeTab === "assignments" ? "is-active" : ""} onClick={() => selectTab("assignments")}>
            <UserPlus size={16} /> User Role Assignment
          </button>
          <span className="rbac-route-note"><Check size={14} /> {routeNote}</span>
        </div>

        {loading ? <div className="rbac-loading-card"><Loader label="Loading RBAC configuration..." /></div> : null}
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
              roles={manageableRoles}
              selectedRoleId={selectedRole?.id}
              onSelect={selectRole}
              query={roleQuery}
              onQuery={setRoleQuery}
            />
            <RoleDetails
              selectedRole={selectedRole}
              selectedMember={selectedMember}
              modules={modules}
              permissions={permissions}
              setPermissions={setPermissions}
              onPersistPermissions={persistPermissions}
              onOpenMembers={openMembersForSelectedRole}
              onUseRolePermissions={useRolePermissions}
              loading={permissionLoading}
              saving={saving}
              dirty={dirty}
              query={permissionQuery}
              setQuery={setPermissionQuery}
              onSave={savePermissions}
              onReset={() => setPermissions(lastSavedPermissions)}
            />
          </div>
        ) : null}

        {!loading && !error && activeTab === "assignments" ? <UserRoleAssignment roles={allRoles} /> : null}
        {membersDialogOpen ? (
          <RoleMembersDialog
            role={selectedRole}
            members={roleMembers}
            loading={membersLoading}
            selectedMember={selectedMember}
            onSelectMember={selectMember}
            onUseRolePermissions={useRolePermissions}
            onClose={() => setMembersDialogOpen(false)}
          />
        ) : null}
      </main>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </DashboardLayout>
  );
}
