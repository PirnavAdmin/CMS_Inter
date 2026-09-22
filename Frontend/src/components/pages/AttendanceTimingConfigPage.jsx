import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Plus, Pencil, Trash2, ShieldAlert, ArrowLeft, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import attendanceTimingApi from "@/api/attendanceTimingApi.js";
import "./AttendanceTimingConfigPage.css";

const STAFF_TYPE_OPTIONS = [
  { label: "All Staff", value: "" },
  { label: "Teaching Faculty", value: "1" },
  { label: "Non-Teaching / Admin", value: "2" },
];

const INITIAL_FORM = {
  configName: "",
  staffType: "",
  departmentId: "",
  workStartTime: "09:00",
  workEndTime: "17:00",
  lateThreshold: "09:15",
  earlyCheckoutThreshold: "16:30",
  gracePeriodMinutes: 5,
  minWorkingHours: 7.0,
  description: "",
  isActive: true,
};

export default function AttendanceTimingConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [notice, setNotice] = useState({ message: "", type: "success" });

  const notify = (message, type = "success") => setNotice({ message, type });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await attendanceTimingApi.getConfigs();
      setConfigs(Array.isArray(data) ? data : []);
    } catch (err) {
      notify("Failed to load timing configurations.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setModalOpen(true);
  };

  const openEditModal = (config) => {
    setEditingId(config.id);
    setForm({
      configName: config.configName || "",
      staffType: config.staffType != null ? String(config.staffType) : "",
      departmentId: config.departmentId ? String(config.departmentId) : "",
      workStartTime: config.workStartTime || "09:00",
      workEndTime: config.workEndTime || "17:00",
      lateThreshold: config.lateThreshold || "09:15",
      earlyCheckoutThreshold: config.earlyCheckoutThreshold || "16:30",
      gracePeriodMinutes: config.gracePeriodMinutes ?? 5,
      minWorkingHours: config.minWorkingHours ?? 7.0,
      description: config.description || "",
      isActive: config.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.configName.trim()) {
      notify("Configuration Name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        configName: form.configName.trim(),
        staffType: form.staffType === "" ? null : Number(form.staffType),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        workStartTime: form.workStartTime,
        workEndTime: form.workEndTime,
        lateThreshold: form.lateThreshold,
        earlyCheckoutThreshold: form.earlyCheckoutThreshold,
        gracePeriodMinutes: Number(form.gracePeriodMinutes) || 0,
        minWorkingHours: Number(form.minWorkingHours) || 7.0,
        description: form.description?.trim() || null,
        isActive: Boolean(form.isActive),
      };

      if (editingId) {
        await attendanceTimingApi.updateConfig(editingId, payload);
        notify("Timing configuration updated successfully.");
      } else {
        await attendanceTimingApi.createConfig(payload);
        notify("Timing configuration created successfully.");
      }
      setModalOpen(false);
      fetchConfigs();
    } catch (err) {
      notify(err?.response?.data?.message || "Failed to save configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await attendanceTimingApi.deleteConfig(id);
      notify("Timing configuration removed.");
      setDeleteConfirm(null);
      fetchConfigs();
    } catch (err) {
      notify("Failed to delete configuration.", "error");
    }
  };

  const staffTypeBadge = (st) => {
    if (st === 1 || st === "Teaching") return <span className="att-tag is-teaching">Teaching</span>;
    if (st === 2 || st === "NonTeaching") return <span className="att-tag is-nonteaching">Non-Teaching</span>;
    return <span className="att-tag is-all">All Staff</span>;
  };

  return (
    <DashboardLayout
      title="Attendance Timing Configuration"
      subtitle="Define daily work shift timings, late-arrival thresholds, and early-checkout detection rules for staff."
      breadcrumb={["Settings", "Attendance Timing"]}
      actions={
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/dashboard/settings" className="cms-btn cms-btn-ghost">
            <ArrowLeft size={16} /> Back to Settings
          </Link>
          <button type="button" className="cms-btn cms-btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Add Timing Rule
          </button>
        </div>
      }
    >
      <div className="att-timing-page">
        {/* Info Banner */}
        <div className="att-timing-banner">
          <div className="att-timing-banner-icon">
            <Clock size={28} />
          </div>
          <div className="att-timing-banner-text">
            <h4>Automated Status Derivation</h4>
            <p>
              When staff check-in times are recorded, arrivals after the <strong>Late Threshold</strong> (+ Grace Period) are automatically flagged as <strong>Late</strong>. Check-outs occurring before the <strong>Early Checkout Threshold</strong> will be tagged with an early departure note.
            </p>
          </div>
        </div>

        {/* Configs Table */}
        <section className="att-timing-card">
          <header className="att-timing-header">
            <div>
              <h3>Configured Timing Schedules</h3>
              <p>{configs.length} active schedule(s)</p>
            </div>
          </header>

          {loading ? (
            <div style={{ padding: "40px 0" }}><Loader size="large" /></div>
          ) : configs.length === 0 ? (
            <div className="cms-empty" style={{ padding: "40px" }}>
              No timing configurations found. Click <strong>Add Timing Rule</strong> to set up one.
            </div>
          ) : (
            <div className="att-timing-table-wrapper">
              <table className="cms-table att-timing-table">
                <thead>
                  <tr>
                    <th>Rule Name</th>
                    <th>Applies To</th>
                    <th>Shift Timings</th>
                    <th>Late Arrival After</th>
                    <th>Grace Period</th>
                    <th>Early Checkout Before</th>
                    <th>Min Hours</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.configName}</strong>
                        {c.description && <small className="att-timing-desc">{c.description}</small>}
                      </td>
                      <td>{staffTypeBadge(c.staffType)}</td>
                      <td>
                        <span className="att-timing-pill">{c.workStartTime} – {c.workEndTime}</span>
                      </td>
                      <td>
                        <strong className="att-timing-late-time">{c.lateThreshold}</strong>
                      </td>
                      <td>{c.gracePeriodMinutes} mins</td>
                      <td>
                        <span className="att-timing-early-time">{c.earlyCheckoutThreshold}</span>
                      </td>
                      <td>{c.minWorkingHours} hrs</td>
                      <td>
                        <span className={`att-status-badge ${c.isActive ? "is-active" : "is-inactive"}`}>
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="att-action-buttons">
                          <button
                            type="button"
                            className="cms-action-btn"
                            title="Edit Rule"
                            onClick={() => openEditModal(c)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="cms-action-btn is-danger"
                            title="Delete Rule"
                            onClick={() => setDeleteConfirm(c)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <Modal
          title={editingId ? "Edit Timing Configuration" : "Add Attendance Timing Rule"}
          onClose={() => !saving && setModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={saving}
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : editingId ? "Update Rule" : "Create Rule"}
              </button>
            </>
          }
        >
          <form className="att-timing-form" onSubmit={handleSave}>
            <div className="att-timing-field-group">
              <label>
                <span>Rule / Shift Name *</span>
                <input
                  type="text"
                  placeholder="e.g. Teaching Faculty Morning Shift"
                  value={form.configName}
                  onChange={(e) => setForm({ ...form, configName: e.target.value })}
                  required
                />
              </label>

              <label>
                <span>Applicable Staff Type</span>
                <select
                  value={form.staffType}
                  onChange={(e) => setForm({ ...form, staffType: e.target.value })}
                >
                  {STAFF_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="att-timing-row">
              <label>
                <span>Shift Start Time *</span>
                <input
                  type="time"
                  value={form.workStartTime}
                  onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
                  required
                />
              </label>

              <label>
                <span>Shift End Time *</span>
                <input
                  type="time"
                  value={form.workEndTime}
                  onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="att-timing-highlight-box">
              <div className="att-timing-row">
                <label>
                  <span>Late Arrival Threshold *</span>
                  <input
                    type="time"
                    value={form.lateThreshold}
                    onChange={(e) => setForm({ ...form, lateThreshold: e.target.value })}
                    required
                  />
                  <small className="field-hint">Arrival after this is marked as Late</small>
                </label>

                <label>
                  <span>Grace Period (Minutes)</span>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.gracePeriodMinutes}
                    onChange={(e) => setForm({ ...form, gracePeriodMinutes: e.target.value })}
                  />
                  <small className="field-hint">Added to threshold before marking Late</small>
                </label>
              </div>

              <div className="att-timing-row">
                <label>
                  <span>Early Checkout Threshold *</span>
                  <input
                    type="time"
                    value={form.earlyCheckoutThreshold}
                    onChange={(e) => setForm({ ...form, earlyCheckoutThreshold: e.target.value })}
                    required
                  />
                  <small className="field-hint">Check-out before this flags Early Checkout</small>
                </label>

                <label>
                  <span>Min Full-Day Hours</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="16"
                    value={form.minWorkingHours}
                    onChange={(e) => setForm({ ...form, minWorkingHours: e.target.value })}
                  />
                  <small className="field-hint">Required for full attendance credit</small>
                </label>
              </div>
            </div>

            <label>
              <span>Description / Notes</span>
              <textarea
                rows={2}
                placeholder="Optional notes or policies regarding this shift..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <label className="att-timing-checkbox-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>Rule is Active</span>
            </label>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          title="Delete Timing Rule"
          onClose={() => setDeleteConfirm(null)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-danger"
                onClick={() => handleDelete(deleteConfirm.id)}
              >
                Delete
              </button>
            </>
          }
        >
          <div style={{ padding: "10px 0" }}>
            <p>
              Are you sure you want to delete <strong>{deleteConfirm.configName}</strong>?
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "8px" }}>
              Staff attendance timing evaluations will revert to default global rules.
            </p>
          </div>
        </Modal>
      )}

      <Toast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "success" })}
      />
    </DashboardLayout>
  );
}
