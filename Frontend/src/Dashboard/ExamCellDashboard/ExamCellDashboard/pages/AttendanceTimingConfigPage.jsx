import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Plus, Pencil, Trash2, ShieldAlert, ArrowLeft, CheckCircle2 } from "lucide-react";
import DashboardLayout from "../layout/ExamCellPageLayout.jsx";
import { Modal, SkeletonPage, Toast } from "@/components/common/Ui.jsx";
import attendanceTimingApi from "@/api/attendanceTimingApi.js";
import "@/components/pages/AttendanceTimingConfigPage.css";

const STAFF_TYPE_OPTIONS = [
  { label: "All Staff", value: "" },
  { label: "Teaching Faculty", value: "1" },
  { label: "Non-Teaching / Admin", value: "2" },
];

export const formatTime12h = (timeStr) => {
  if (!timeStr || timeStr === "--") return "--:--";
  const cleaned = String(timeStr).trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return cleaned;
  let hours = parseInt(match[1], 10);
  const minutes = match[2].padStart(2, "0");
  const ampmExisting = match[3]?.toUpperCase();
  if (ampmExisting) return `${String(hours).padStart(2, "0")}:${minutes} ${ampmExisting}`;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

export const getCheckoutCutoff = (timeStr, graceMinutes = 15) => {
  if (!timeStr) return "--:--";
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "--:--";
  let hours = parseInt(match[1], 10);
  let mins = parseInt(match[2], 10) + Number(graceMinutes || 0);
  hours += Math.floor(mins / 60);
  mins = mins % 60;
  hours = hours % 24;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${ampm}`;
};

export const getThresholdWithGrace = (lateThreshold, graceMinutes = 15) => {
  if (!lateThreshold) return "--:--";
  const match = String(lateThreshold).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "--:--";
  let hours = parseInt(match[1], 10);
  let mins = parseInt(match[2], 10) + Number(graceMinutes || 0);
  hours += Math.floor(mins / 60);
  mins = mins % 60;
  hours = hours % 24;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${ampm}`;
};

const INITIAL_FORM = {
  configName: "Teaching Staff Shift (09:00 AM – 04:30 PM)",
  staffType: "1",
  departmentId: "",
  workStartTime: "09:00",
  workEndTime: "16:30",
  lateThreshold: "09:15",
  earlyCheckoutThreshold: "16:30",
  gracePeriodMinutes: 15,
  minWorkingHours: 7.0,
  description: "Official Shift: 09:00 AM – 04:30 PM (Late arrival after 09:15 AM, 15m checkout window up to 04:45 PM).",
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

  const applyPreset = (type) => {
    if (type === "teaching") {
      setForm((prev) => ({
        ...prev,
        configName: "Teaching Staff Shift (09:00 AM – 04:30 PM)",
        staffType: "1",
        workStartTime: "09:00",
        workEndTime: "16:30",
        lateThreshold: "09:15",
        earlyCheckoutThreshold: "16:30",
        gracePeriodMinutes: 15,
        minWorkingHours: 7.0,
        description: "Official Teaching Shift: 09:00 AM – 04:30 PM (Late arrival after 09:15 AM, 15m checkout window up to 04:45 PM).",
      }));
    } else if (type === "nonteaching") {
      setForm((prev) => ({
        ...prev,
        configName: "Non-Teaching Staff Shift (08:30 AM – 05:30 PM)",
        staffType: "2",
        workStartTime: "08:30",
        workEndTime: "17:30",
        lateThreshold: "08:45",
        earlyCheckoutThreshold: "17:30",
        gracePeriodMinutes: 15,
        minWorkingHours: 8.5,
        description: "Official Non-Teaching Shift: 08:30 AM – 05:30 PM (Late arrival after 08:45 AM, 15m checkout window up to 05:45 PM).",
      }));
    }
  };

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
      workEndTime: config.workEndTime || "16:30",
      lateThreshold: config.lateThreshold || "09:15",
      earlyCheckoutThreshold: config.earlyCheckoutThreshold || "16:30",
      gracePeriodMinutes: config.gracePeriodMinutes ?? 15,
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
      subtitle="Define daily 12-hour work shift timings, late-arrival thresholds, and early/missed checkout rules for staff."
      breadcrumb={["Settings", "Attendance Timing"]}
      actions={
        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/exam-cell-dashboard" className="cms-btn cms-btn-ghost">
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
            <h4>Daily Attendance Timing Rules &amp; Grace Windows</h4>
            <p>
              Arrivals after the <strong>Late Threshold</strong> (+ 15m Grace) are automatically marked <strong>Late</strong>.
              Staff have a <strong>15-minute check-out window</strong> following shift end (e.g. up to <strong>04:45 PM</strong> for Teaching, <strong>05:45 PM</strong> for Non-Teaching). If check-out is missed after this cutoff, it is flagged as <strong>Missed Checkout</strong> and self-checkout is disabled.
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
            <div style={{ padding: "40px 0" }}><SkeletonPage variant="form" rows={5} /></div>
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
                    <th>Checkout Window &amp; Cutoff</th>
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
                        <span className="att-timing-pill">
                          {formatTime12h(c.workStartTime)} – {formatTime12h(c.workEndTime)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div>
                            <strong className="att-timing-late-time">{formatTime12h(c.lateThreshold)}</strong>
                            <span className="att-grace-badge">+{c.gracePeriodMinutes ?? 15}m Grace</span>
                          </div>
                          <small className="field-hint">Late if punch &gt; {formatTime12h(c.lateThreshold)}</small>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span className="att-checkout-window-pill">
                            {formatTime12h(c.workEndTime)} – {getCheckoutCutoff(c.workEndTime, c.gracePeriodMinutes ?? 15)}
                          </span>
                          <span className="att-timing-cutoff-tag">
                            Missed Checkout after {getCheckoutCutoff(c.workEndTime, c.gracePeriodMinutes ?? 15)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="att-timing-early-time">{formatTime12h(c.earlyCheckoutThreshold)}</span>
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
            {/* Quick Presets Bar */}
            <div className="att-timing-presets">
              <span className="att-presets-label">Quick 12-Hour Shift Presets:</span>
              <div className="att-presets-buttons">
                <button
                  type="button"
                  className="att-preset-btn"
                  onClick={() => applyPreset("teaching")}
                >
                  <Clock size={14} />
                  <span>Teaching Staff (09:00 AM – 04:30 PM)</span>
                </button>
                <button
                  type="button"
                  className="att-preset-btn"
                  onClick={() => applyPreset("nonteaching")}
                >
                  <Clock size={14} />
                  <span>Non-Teaching Staff (08:30 AM – 05:30 PM)</span>
                </button>
              </div>
            </div>

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
                <div className="att-time-input-wrap">
                  <input
                    type="time"
                    value={form.workStartTime}
                    onChange={(e) => setForm({ ...form, workStartTime: e.target.value })}
                    required
                  />
                  <span className="att-12h-preview">{formatTime12h(form.workStartTime)}</span>
                </div>
              </label>

              <label>
                <span>Shift End Time *</span>
                <div className="att-time-input-wrap">
                  <input
                    type="time"
                    value={form.workEndTime}
                    onChange={(e) => setForm({ ...form, workEndTime: e.target.value })}
                    required
                  />
                  <span className="att-12h-preview">{formatTime12h(form.workEndTime)}</span>
                </div>
              </label>
            </div>

            <div className="att-timing-highlight-box">
              <div className="att-timing-row">
                <label>
                  <span>Late Arrival Threshold *</span>
                  <div className="att-time-input-wrap">
                    <input
                      type="time"
                      value={form.lateThreshold}
                      onChange={(e) => setForm({ ...form, lateThreshold: e.target.value })}
                      required
                    />
                    <span className="att-12h-preview">{formatTime12h(form.lateThreshold)}</span>
                  </div>
                  <small className="field-hint">Arrival after {formatTime12h(form.lateThreshold)} is marked Late</small>
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
                  <small className="field-hint">15m standard grace window for check-in &amp; check-out</small>
                </label>
              </div>

              <div className="att-timing-row">
                <label>
                  <span>Early Checkout Threshold *</span>
                  <div className="att-time-input-wrap">
                    <input
                      type="time"
                      value={form.earlyCheckoutThreshold}
                      onChange={(e) => setForm({ ...form, earlyCheckoutThreshold: e.target.value })}
                      required
                    />
                    <span className="att-12h-preview">{formatTime12h(form.earlyCheckoutThreshold)}</span>
                  </div>
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

              {/* Checkout Window & Cutoff Summary Box */}
              <div className="att-summary-rule-box">
                <strong>Check-Out Grace &amp; Cutoff:</strong> Shift ends at <strong>{formatTime12h(form.workEndTime)}</strong>. Staff have a <strong>{form.gracePeriodMinutes || 15}-minute check-out window</strong> until <strong>{getCheckoutCutoff(form.workEndTime, form.gracePeriodMinutes || 15)}</strong>. If check-out is not recorded by <strong>{getCheckoutCutoff(form.workEndTime, form.gracePeriodMinutes || 15)}</strong>, the record is flagged as <strong>"Missed Checkout"</strong> and punch out is disabled.
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
