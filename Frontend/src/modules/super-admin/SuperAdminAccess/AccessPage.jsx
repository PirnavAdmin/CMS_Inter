import ThreeDIcon from "@/components/common/ThreeDIcon.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { STANDARD_CRUD_ACTIONS } from "@/modules/admin/AdminRolesPermissions/rolesPermissions.constants.js";
import { Eye, Pencil, Power, ShieldCheck, KeyRound, UserCheck, Plus } from "lucide-react";
import { Modal, ConfirmDialog } from "@/shared/components/Ui.jsx";
import { useSuperAdmin } from "../SuperAdminProvider.jsx";
import { MODULES } from "../superAdminPreview.js";
import superAdminApi from "@/api/superAdminApi.js";
import SuperAdminTable, { SuperAdminBadge } from "../components/SuperAdminTable.jsx";
import CollegeAdminsPage from "../SuperAdminAdmins/CollegeAdminsPage.jsx";
import "./AccessPage.css";

const roles = ["SuperAdmin", "CollegeAdmin", "Accountant", "Faculty", "HOD", "Receptionist", "Librarian", "Transport Admin", "Student"];

function AccessPageContent({ section = "users" }) {
  const { data, update, refresh, session } = useSuperAdmin();
  const [params, setParams] = useSearchParams();
  const accessModule = section === "roles-permissions";
  const tab = params.get("tab") === "permissions" ? "permissions" : "roles";
  const permissionRole = roles.includes(params.get("role")) ? params.get("role") : "SuperAdmin";
  const selectTab = (value) => setParams((current) => { const next = new URLSearchParams(current); next.set("tab", value); return next; });

  const [collegeId, setCollegeId] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const accountStatus = (user) => user.status || (user.active ? "Active" : "Inactive");
  const userRows = data.users.map((user) => ({
    ...user,
    collegeName: data.colleges.find((c) => String(c.id) === String(user.collegeId) || String(c.collegeId) === String(user.collegeId))?.name || "Platform",
    accountStatus: accountStatus(user)
  })).filter((user) =>
    (!collegeId || String(user.collegeId) === String(collegeId)) &&
    (!role || user.role === role) &&
    (!status || user.accountStatus === status) &&
    (section !== "college-admins" || user.role === "CollegeAdmin")
  );

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(`Enter a new temporary password for ${user.name}:`);
    if (!newPassword || newPassword.trim().length < 6) {
      if (newPassword) alert("Password must be at least 6 characters long.");
      return;
    }
    const uid = user.userId || user.id;
    const ok = await update("Reset user password", null, {
      module: "Global Users",
      actionType: "Reset password",
      userId: uid,
      newPassword: newPassword.trim(),
    });
    if (ok) {
      alert(`Password successfully updated for ${user.name}.`);
      await refresh();
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.active ? "Inactive" : "Active";
    const uid = user.userId || user.id;
    await update(`Updated user account status to ${nextStatus}`, null, {
      module: "Global Users",
      actionType: "Status change",
      userId: uid,
      status: nextStatus,
    });
    await refresh();
  };

  const title = { users: "Global Users", "roles-permissions": "Roles & Permissions" }[section] || "Global Directory";
  const roleRows = roles.map((roleName) => ({
    id: roleName,
    name: roleName,
    scope: roleName === "SuperAdmin" ? "Platform" : "College",
    access: roleName === "SuperAdmin"
      ? "Manage platform colleges, subscription tiers and global configuration"
      : roleName === "CollegeAdmin"
      ? "Manage assigned college campuses, academic staff, students and modules"
      : "Campus operations: Assigned college modules and student actions only"
  }));

  return (
    <div className="sa-page">
      <header className="sa-page-head">
        <div>
          <span className="sa-eyebrow">Platform Access Control</span>
          <h1>
            <span className="sa-page-title-icon">
              <ThreeDIcon name={accessModule ? "roles-permissions" : "total-students"} size={27}/>
            </span>
            {title}
          </h1>
          <p>
            {section === "users"
              ? "Platform-wide user directory across all registered colleges and campuses."
              : "Platform vs College operational permission boundaries."}
          </p>
        </div>
      </header>

      {accessModule ? (
        <>
          <div className="sa-access-tabs" role="tablist" aria-label="Roles and permissions">
            {[["roles", "System Roles"], ["permissions", "Permission Matrix"]].map(([value, label]) => (
              <button
                type="button"
                key={value}
                role="tab"
                aria-selected={tab === value}
                className={tab === value ? "is-active" : ""}
                onClick={() => selectTab(value)}
              >
                <ThreeDIcon name="roles-permissions" size={19}/>
                {label}
              </button>
            ))}
          </div>

          <section className="sa-access-tab-panel">
            {tab === "roles" ? (
              <SuperAdminTable
                title="System Role Hierarchy"
                searchPlaceholder="Search roles or scope..."
                rows={roleRows}
                columns={[
                  { key: "name", label: "Role Name" },
                  { key: "scope", label: "Hierarchy Scope", render: (row) => <SuperAdminBadge value={row.scope}/> },
                  { key: "access", label: "Authorized Operational Scope" }
                ]}
              />
            ) : (
              <>
                <section className="sa-panel sa-permission-role">
                  <label htmlFor="sa-permission-role-select">
                    Select Target Role
                    <select
                      id="sa-permission-role-select"
                      value={permissionRole}
                      onChange={(e) => setParams((current) => {
                        const next = new URLSearchParams(current);
                        next.set("role", e.target.value);
                        return next;
                      })}
                    >
                      {roles.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <div>
                    <strong>{permissionRole}</strong>
                    <SuperAdminBadge value={permissionRole === "SuperAdmin" ? "Platform Level" : "College Level"}/>
                    <p className="sa-muted">
                      {permissionRole === "SuperAdmin"
                        ? "Platform role: Super Admin operates strictly on Colleges and Global Settings."
                        : "College-scoped role: College Admins operate on Campuses, Sections, Students, Staff, and Fees."}
                    </p>
                  </div>
                </section>

                <SuperAdminTable
                  key={permissionRole}
                  title="Permission Scope Matrix"
                  searchPlaceholder="Search categories..."
                  rows={[
                    ...["Colleges Management", "Subscription Plans", "B2B Billing", "Platform Settings", "Audit Logs"].map((name) => ({ id: "platform-" + name, name, scope: "Platform" })),
                    ...MODULES.map((name) => ({ id: "college-" + name, name, scope: "College" })),
                  ]}
                  columns={[
                    { key: "name", label: "Functional Area" },
                    { key: "scope", label: "Boundary Scope", render: (row) => <SuperAdminBadge value={row.scope}/> },
                    ...STANDARD_CRUD_ACTIONS.map((action) => ({
                      key: action,
                      label: action[0].toUpperCase() + action.slice(1),
                      render: (row) => (
                        <span className="sa-permission-status">
                          {row.scope === (permissionRole === "SuperAdmin" ? "Platform" : "College") ? "Authorized" : "Out of Scope"}
                        </span>
                      )
                    }))
                  ]}
                />
              </>
            )}
          </section>
        </>
      ) : (
        <>
          <SuperAdminTable
            title="Cross-College User Directory"
            searchPlaceholder="Search by name or email…"
            rows={userRows}
            filterKey={[collegeId, role, status].filter(Boolean).join("|")}
            toolbar={
              <div className="sa-user-filters">
                <label>
                  College
                  <select aria-label="Filter by College" value={collegeId} onChange={(e) => setCollegeId(e.target.value)}>
                    <option value="">All Colleges</option>
                    {data.colleges.map((c) => (
                      <option key={c.id} value={String(c.collegeId || c.id)}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Role
                  <select aria-label="Filter by Role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="">All Roles</option>
                    {roles.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>

                <label>
                  Status
                  <select aria-label="Account Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    {["Active", "Inactive", "Suspended"].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>

                {(collegeId || role || status) && (
                  <button type="button" className="cms-btn cms-btn-ghost" onClick={() => { setCollegeId(""); setRole(""); setStatus(""); }}>
                    Reset Filters
                  </button>
                )}
              </div>
            }
            columns={[
              {
                key: "name",
                label: "User Name",
                render: (user) => (
                  <span className="sa-user-name">
                    <span className="sa-user-initials">{(user.name || "U").slice(0, 2).toUpperCase()}</span>
                    <strong>{user.name}</strong>
                  </span>
                ),
              },
              { key: "email", label: "Email Address" },
              { key: "collegeName", label: "Associated College" },
              {
                key: "role",
                label: "Role",
                render: (user) => <span className="sa-role-chip">{user.role}</span>,
              },
              {
                key: "accountStatus",
                label: "Status",
                render: (user) => <SuperAdminBadge value={user.accountStatus}/>,
              },
              {
                key: "actions",
                label: "Actions",
                render: (user) => (
                  <div className="sa-actions">
                    <button
                      type="button"
                      className="cms-action-btn view"
                      title="View user details"
                      onClick={async () => {
                        try {
                          setSelectedUser(await superAdminApi.getGlobalUserById(user.userId || user.id));
                        } catch {
                          setSelectedUser(user);
                        }
                      }}
                    >
                      <Eye size={15}/>
                    </button>

                    <button
                      type="button"
                      className="cms-action-btn"
                      title="Force reset password"
                      onClick={() => handleResetPassword(user)}
                    >
                      <KeyRound size={15}/>
                    </button>

                    <button
                      type="button"
                      className={`cms-action-btn status ${user.active ? "" : "activate"}`}
                      title={user.active ? "Deactivate account" : "Activate account"}
                      onClick={() => handleToggleStatus(user)}
                    >
                      <Power size={15}/>
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      {selectedUser && (
        <Modal
          title="User Account Details"
          className="sa-user-modal"
          onClose={() => setSelectedUser(null)}
          footer={
            <button type="button" className="cms-btn cms-btn-primary" onClick={() => setSelectedUser(null)}>
              Close Details
            </button>
          }
        >
          <div className="sa-user-detail-hero">
            <span className="sa-user-initials">{(selectedUser.name ?? "U").slice(0, 2).toUpperCase()}</span>
            <div>
              <h3>{selectedUser.name ?? selectedUser.fullName ?? "User"}</h3>
              <p>{selectedUser.email}</p>
            </div>
            <SuperAdminBadge value={selectedUser.accountStatus ?? selectedUser.status ?? "Active"}/>
          </div>
          <div className="cms-kv">
            {[
              ["Full Name", selectedUser.name ?? selectedUser.fullName],
              ["Email Address", selectedUser.email],
              ["Associated College", selectedUser.collegeName || "Platform Wide"],
              ["Role", selectedUser.role],
              ["Account Status", selectedUser.accountStatus ?? selectedUser.status ?? "Active"],
              ["User ID", selectedUser.userId ?? selectedUser.id],
              ["Contact Phone", selectedUser.phone || "Not recorded"],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value ?? "Not recorded"}</strong>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function LegacyCollegeAdminsPage() {
  const { data, update, refresh, session } = useSuperAdmin();
  const [params, setParams] = useSearchParams();
  const targetCollegeId = params.get("collegeId") || "";

  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [collegeFilter, setCollegeFilter] = useState(targetCollegeId);
  const [statusFilter, setStatusFilter] = useState("");

  const eligibleColleges = data.colleges.filter((c) => (c.status || c.collegeStatus) === "Active");
  const admins = data.users.filter((user) => user.role === "CollegeAdmin");

  const openCreateModal = () => {
    setError("");
    setForm({
      name: "",
      email: "",
      phone: "",
      collegeId: targetCollegeId || (eligibleColleges[0]?.collegeId || eligibleColleges[0]?.id || ""),
      password: "AdminPassword@123",
      active: true,
      loginEnabled: true,
    });
  };

  const handleSaveAdmin = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Administrator Name and Email are required.");
      return;
    }
    if (!form.collegeId) {
      setError("Please select a target college.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone ? form.phone.trim() : "",
      collegeId: Number(form.collegeId),
      password: form.password,
    };

    const ok = await update("Created College Administrator", null, {
      module: "College Admins",
      actionType: "Create",
      collegeId: form.collegeId,
      payload,
    });

    if (ok) {
      setForm(null);
      await refresh();
    } else {
      setError("Could not provision College Admin. Verify email uniqueness.");
    }
  };

  const handleResetPassword = async (admin) => {
    const newPassword = window.prompt(`Enter a new temporary password for ${admin.name}:`);
    if (!newPassword || newPassword.trim().length < 6) {
      if (newPassword) alert("Password must be at least 6 characters long.");
      return;
    }
    const uid = admin.userId || admin.id;
    const ok = await update("Reset College Admin password", null, {
      module: "Global Users",
      actionType: "Reset password",
      userId: uid,
      newPassword: newPassword.trim(),
    });
    if (ok) {
      alert(`Password successfully updated for ${admin.name}.`);
      await refresh();
    }
  };

  const handleToggleAdminStatus = (admin) => {
    const nextStatus = admin.active ? "Inactive" : "Active";
    setConfirm({
      title: `${admin.active ? "Deactivate" : "Activate"} Administrator?`,
      message: `Are you sure you want to ${admin.active ? "deactivate" : "activate"} access for ${admin.name}?`,
      run: async () => {
        await update("Updated College Admin status", null, {
          module: "College Admins",
          userId: admin.userId || admin.id,
          actionType: "Access change",
          newValues: { active: !admin.active },
        });
        await refresh();
      },
    });
  };

  const rows = admins
    .map((user) => ({
      ...user,
      collegeName:
        data.colleges.find((c) => String(c.id) === String(user.collegeId) || String(c.collegeId) === String(user.collegeId))?.name || "Unassigned",
    }))
    .filter((user) => {
      const matchCol = !collegeFilter || String(user.collegeId) === String(collegeFilter);
      const matchStatus = !statusFilter || (user.active ? "Active" : "Inactive") === statusFilter;
      return matchCol && matchStatus;
    });

  const counts = [
    ["Total Admins", admins.length],
    ["Active Admins", admins.filter((u) => u.active).length],
    ["Colleges Assigned", new Set(admins.map((u) => u.collegeId).filter(Boolean)).size],
    ["Colleges Without Admin", data.colleges.filter((c) => !admins.some((a) => String(a.collegeId) === String(c.id || c.collegeId))).length],
  ];

  return (
    <div className="sa-page">
      <header className="sa-page-head">
        <div>
          <span className="sa-eyebrow">Institutional Governance</span>
          <h1>
            <span className="sa-page-title-icon">
              <ThreeDIcon name="teaching-staff" size={27}/>
            </span>
            Central College Admin Directory
          </h1>
          <p>Manage and provision primary institutional administrators across all registered colleges.</p>
        </div>
        <button
          type="button"
          className="cms-btn cms-btn-primary"
          onClick={openCreateModal}
        >
          <Plus size={16} /> Add College Admin
        </button>
      </header>

      {/* KPI Stats */}
      <div className="sa-registration-summary">
        {counts.map(([label, count], index) => (
          <article
            className={`sa-registration-stat tone-${["blue", "green", "amber", "red"][index]}`}
            key={label}
          >
            <span className="sa-registration-stat-icon">
              <ThreeDIcon name="teaching-staff" size={25}/>
            </span>
            <span>
              <small>{label}</small>
              <strong>{count}</strong>
            </span>
          </article>
        ))}
      </div>

      {/* Main College Admins Table */}
      <SuperAdminTable
        title="College Administrators"
        rows={rows}
        filterKey={`${collegeFilter}:${statusFilter}`}
        toolbar={
          <div className="sa-user-filters">
            <label>
              College
              <select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)}>
                <option value="">All Colleges</option>
                {data.colleges.map((c) => (
                  <option key={c.id} value={String(c.collegeId || c.id)}>{c.name}</option>
                ))}
              </select>
            </label>

            <label>
              Account Status
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            {(collegeFilter || statusFilter) && (
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => { setCollegeFilter(""); setStatusFilter(""); }}
              >
                Reset Filters
              </button>
            )}
          </div>
        }
        columns={[
          {
            key: "name",
            label: "Administrator Name",
            render: (admin) => (
              <span className="sa-user-name">
                <span className="sa-user-initials">{(admin.name || "A").slice(0, 2).toUpperCase()}</span>
                <strong>{admin.name}</strong>
              </span>
            ),
          },
          { key: "email", label: "Email Address" },
          { key: "phone", label: "Contact Phone", render: (admin) => admin.phone || "—" },
          {
            key: "collegeName",
            label: "Assigned College",
            render: (admin) => <strong>{admin.collegeName}</strong>,
          },
          {
            key: "accountStatus",
            label: "Status",
            render: (admin) => <SuperAdminBadge value={admin.active ? "Active" : "Inactive"}/>,
          },
          {
            key: "actions",
            label: "Actions",
            render: (admin) => (
              <div className="sa-actions">
                <button
                  type="button"
                  className="cms-action-btn view"
                  title="View details"
                  onClick={() => setDetail(admin)}
                >
                  <Eye size={15}/>
                </button>

                <button
                  type="button"
                  className="cms-action-btn"
                  title="Force reset password"
                  onClick={() => handleResetPassword(admin)}
                >
                  <KeyRound size={15}/>
                </button>

                <button
                  type="button"
                  className={`cms-action-btn status ${admin.active ? "" : "activate"}`}
                  title={admin.active ? "Deactivate administrator" : "Activate administrator"}
                  onClick={() => handleToggleAdminStatus(admin)}
                >
                  <Power size={15}/>
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Create College Admin Modal */}
      {form && (
        <Modal
          title="Create College Administrator"
          onClose={() => setForm(null)}
        >
          <form className="sa-form" onSubmit={handleSaveAdmin}>
            <div className="sa-form-grid">
              <label>
                Full Name *
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label>
                Email Address *
                <input
                  type="email"
                  required
                  placeholder="ramesh@college.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label>
                Contact Phone
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>

              <label>
                Target College *
                <select
                  required
                  value={form.collegeId}
                  onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                >
                  <option value="">Select College</option>
                  {eligibleColleges.map((c) => (
                    <option key={c.id} value={String(c.collegeId || c.id)}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </label>

              <label className="full-width">
                Initial Temporary Password
                <input
                  type="text"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
            </div>

            {error && <p className="sa-wizard-error" role="alert">{error}</p>}

            <div className="sa-actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button type="submit" className="cms-btn cms-btn-primary">
                Provision Administrator
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Admin Details Modal */}
      {detail && (
        <Modal
          title="College Administrator Profile"
          onClose={() => setDetail(null)}
          footer={
            <button type="button" className="cms-btn cms-btn-primary" onClick={() => setDetail(null)}>
              Close
            </button>
          }
        >
          <dl className="sa-onboarding-details">
            {[
              ["Administrator Name", detail.name],
              ["Email Address", detail.email],
              ["Contact Phone", detail.phone || "Not recorded"],
              ["Assigned College", detail.collegeName],
              ["Role Scope", "College Administrator"],
              ["Account Status", detail.active ? "Active" : "Inactive"],
              ["User ID", detail.userId || detail.id],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
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

export default function AccessPage(props) {
  return props.section === "college-admins" ? <CollegeAdminsPage/> : <AccessPageContent {...props}/>;
}
