import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CalendarDays, 
  Plus, 
  ArrowLeft, 
  RotateCcw, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  AlertTriangle
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Modal } from "@/components/common/Ui.jsx";
import {
  getLeaveCategories,
  getLeaveCategorySummary,
  createLeaveCategory,
  updateLeaveCategory,
  deleteLeaveCategory,
  resetDefaultLeaveCategories
} from "@/features/leave/services/leaveCategoryStore.js";
import "./LeaveTypesPage.css";

const staffEligibilityOptions = [
  "All Staff",
  "Teaching Staff Only",
  "Non-Teaching Staff"
];

const getCodeClass = (code) => {
  const c = String(code || "").toLowerCase();
  if (c === "cl") return "cl";
  if (c === "sl") return "sl";
  if (c === "el") return "el";
  if (c === "ml") return "ml";
  if (c === "co") return "co";
  return "default";
};

export default function LeaveTypesPage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ standardAnnualAllowance: 37, totalCategories: 0, badges: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    categoryName: "",
    categoryCode: "",
    annualQuota: 10,
    applicableStaffType: "All Staff",
    allowCarryForward: false,
    requiresProof: false,
    description: ""
  });

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, sum] = await Promise.all([
        getLeaveCategories(),
        getLeaveCategorySummary()
      ]);
      setCategories(cats || []);
      setSummary(sum || { standardAnnualAllowance: 0, totalCategories: 0, badges: [] });
    } catch (err) {
      console.error("Failed to load leave categories:", err);
      setError("Failed to load leave configuration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({
      categoryName: "",
      categoryCode: "",
      annualQuota: 10,
      applicableStaffType: "All Staff",
      allowCarryForward: false,
      requiresProof: false,
      description: ""
    });
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      categoryName: cat.categoryName,
      categoryCode: cat.categoryCode,
      annualQuota: cat.annualQuota,
      applicableStaffType: cat.applicableStaffType || "All Staff",
      allowCarryForward: cat.allowCarryForward,
      requiresProof: cat.requiresProof,
      description: cat.description || ""
    });
    setError("");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categoryName.trim() || !formData.categoryCode.trim() || !formData.annualQuota) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingCategory) {
        await updateLeaveCategory(editingCategory.leaveCategoryId, {
          ...formData,
          annualQuota: Number(formData.annualQuota)
        });
        setSuccessMessage("Leave category updated successfully.");
      } else {
        await createLeaveCategory({
          ...formData,
          annualQuota: Number(formData.annualQuota)
        });
        setSuccessMessage("Leave category created successfully.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Error saving leave category:", err);
      setError(err?.response?.data?.message || err?.response?.data?.Message || "Failed to save leave category.");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (cat) => {
    setDeletingCategory(cat);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    setSaving(true);
    try {
      await deleteLeaveCategory(deletingCategory.leaveCategoryId);
      setSuccessMessage("Leave category removed successfully.");
      setDeleteModalOpen(false);
      setDeletingCategory(null);
      await loadData();
    } catch (err) {
      console.error("Error deleting leave category:", err);
      setError("Failed to delete category.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to reset leave categories to system defaults?")) return;
    setSaving(true);
    try {
      await resetDefaultLeaveCategories();
      setSuccessMessage("Default leave categories restored successfully.");
      await loadData();
    } catch (err) {
      console.error("Error resetting defaults:", err);
      setError("Failed to reset defaults.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      title="Leave Types & Policy Configuration"
      subtitle="Define leave quotas per academic year. Total allocated leaves reflect in the Leave History dashboard."
      breadcrumb={["Home", "Settings", "Leave Types"]}
      actions={
        <div className="leave-types-actions-group">
          <button 
            type="button" 
            className="leave-btn-back" 
            onClick={() => navigate("/dashboard/settings")}
          >
            <ArrowLeft size={16} /> Back to Settings
          </button>
          <button 
            type="button" 
            className="leave-btn-add" 
            onClick={openAddModal}
          >
            <Plus size={16} /> Add Leave Type
          </button>
        </div>
      }
    >
      <div className="leave-types-page">

        {/* Feedback Messages */}
        {successMessage && (
          <div style={{ padding: "10px 14px", background: "#edf7ee", border: "1px solid #c9e8cd", borderRadius: 8, color: "#16643b", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage("")} style={{ border: 0, background: "none", cursor: "pointer", color: "#16643b" }}>✕</button>
          </div>
        )}

        {/* Summary Banner */}
        <section className="leave-types-summary-banner">
          <div className="summary-banner-left">
            <div className="summary-banner-icon">
              <CalendarDays size={26} />
            </div>
            <div className="summary-banner-content">
              <span className="summary-baseline-tag">TOTAL STANDARD BASELINE ENTITLEMENT</span>
              <h3>Standard Annual Allowance: <strong>{summary.standardAnnualAllowance} Days</strong></h3>
              <p>This baseline configuration forms the annual allocated leave quota shown in Staff Management and the Leave History dashboard.</p>
            </div>
          </div>
          <div className="summary-banner-right">
            <div className="summary-badges-row">
              {summary.badges && summary.badges.length > 0 ? (
                summary.badges.map((b, idx) => (
                  <span key={idx} className={`allowance-badge ${getCodeClass(b.code)}`}>
                    <strong>{b.code}</strong> {b.days}d {b.label}
                  </span>
                ))
              ) : (
                <>
                  <span className="allowance-badge cl"><strong>CL</strong> 12d Casual</span>
                  <span className="allowance-badge sl"><strong>SL</strong> 10d Sick</span>
                  <span className="allowance-badge el"><strong>EL</strong> 15d Earned</span>
                </>
              )}
            </div>
            <button 
              type="button" 
              className="btn-reset-defaults" 
              onClick={handleResetDefaults}
              disabled={saving}
            >
              <RotateCcw size={13} /> Reset Defaults
            </button>
          </div>
        </section>

        {/* Configured Leave Categories Table */}
        <section className="leave-types-table-card">
          <div className="table-card-head">
            <h3>Configured Leave Categories ({categories.length})</h3>
            <p>Review leave limits, eligibility restrictions, and carry-forward rules.</p>
          </div>

          <div className="leave-types-table-wrap">
            <table className="leave-categories-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Code</th>
                  <th>Annual Quota</th>
                  <th>Applicable To</th>
                  <th>Rules & Conditions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "var(--cms-muted)" }}>
                      Loading leave categories...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "var(--cms-muted)" }}>
                      No leave categories configured yet. Click "+ Add Leave Type" to create one.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.leaveCategoryId}>
                      <td>
                        <div className="cat-name-cell">
                          <strong>{cat.categoryName}</strong>
                          <span>{cat.description || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`cat-code-pill ${getCodeClass(cat.categoryCode)}`}>
                          {cat.categoryCode}
                        </span>
                      </td>
                      <td>
                        <span className="cat-quota-badge">
                          {cat.annualQuota} Days
                        </span>
                      </td>
                      <td>
                        <span className="cat-eligibility-pill">
                          {cat.applicableStaffType || "All Staff"}
                        </span>
                      </td>
                      <td>
                        <div className="cat-conditions">
                          <span className={`condition-item ${cat.allowCarryForward ? "yes" : "no"}`}>
                            {cat.allowCarryForward ? <Check size={14} /> : <X size={14} />}
                            Carry Forward: {cat.allowCarryForward ? "Yes" : "No"}
                          </span>
                          <span className={`condition-item ${cat.requiresProof ? "yes" : "no"}`}>
                            {cat.requiresProof ? <Check size={14} /> : <X size={14} />}
                            Requires Proof: {cat.requiresProof ? "Yes" : "No"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cat-actions">
                          <button 
                            type="button" 
                            className="btn-action-edit"
                            onClick={() => openEditModal(cat)}
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button 
                            type="button" 
                            className="btn-action-delete"
                            title="Delete category"
                            onClick={() => openDeleteModal(cat)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <Modal 
          title={editingCategory ? "Edit Leave Category" : "Add New Leave Category"}
          onClose={() => !saving && setModalOpen(false)}
          className="leave-category-modal"
          footer={
            <>
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="leave-category-form"
                className="btn-modal-submit"
                disabled={saving}
              >
                {saving ? "Saving..." : editingCategory ? "Save Changes" : "+ Create Leave Category"}
              </button>
            </>
          }
        >
          <form id="leave-category-form" onSubmit={handleFormSubmit}>
            {error && (
              <div style={{ marginBottom: "16px", padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, color: "#b91c1c", fontSize: 12 }}>
                {error}
              </div>
            )}

            <div className="leave-form-grid">
              <div className="leave-form-field">
                <label>Leave Category Name <span className="required">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. Sabbatical Leave" 
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  required
                />
              </div>
              <div className="leave-form-field">
                <label>Leave Code <span className="required">*</span></label>
                <input 
                  type="text" 
                  placeholder="e.g. SL / SAB" 
                  value={formData.categoryCode}
                  onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value.toUpperCase() })}
                  required
                  maxLength={10}
                />
              </div>
              <div className="leave-form-field">
                <label>Annual Quota (Days) <span className="required">*</span></label>
                <input 
                  type="number" 
                  step="0.5" 
                  min="1" 
                  max="365"
                  value={formData.annualQuota}
                  onChange={(e) => setFormData({ ...formData, annualQuota: e.target.value })}
                  required
                />
              </div>
              <div className="leave-form-field">
                <label>Applicable Staff Eligibility</label>
                <select 
                  value={formData.applicableStaffType}
                  onChange={(e) => setFormData({ ...formData, applicableStaffType: e.target.value })}
                >
                  {staffEligibilityOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="leave-checkbox-cards">
              <label className="checkbox-card">
                <input 
                  type="checkbox" 
                  checked={formData.allowCarryForward}
                  onChange={(e) => setFormData({ ...formData, allowCarryForward: e.target.checked })}
                />
                <div className="checkbox-card-info">
                  <strong>Allow Carry Forward</strong>
                  <small>Unused balance carries forward into next cycle.</small>
                </div>
              </label>

              <label className="checkbox-card">
                <input 
                  type="checkbox" 
                  checked={formData.requiresProof}
                  onChange={(e) => setFormData({ ...formData, requiresProof: e.target.checked })}
                />
                <div className="checkbox-card-info">
                  <strong>Requires Documentation Proof</strong>
                  <small>Supporting certificate or document must be attached.</small>
                </div>
              </label>
            </div>

            <div className="leave-form-field">
              <label>Category Description</label>
              <textarea 
                placeholder="Details and purpose of this leave type..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingCategory && (
        <Modal 
          title="Delete Leave Category"
          onClose={() => !saving && setDeleteModalOpen(false)}
          className="leave-delete-modal"
          size="sm"
          footer={
            <>
              <button 
                type="button" 
                className="btn-modal-cancel" 
                onClick={() => setDeleteModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-modal-delete"
                onClick={handleDeleteConfirm}
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete Category"}
              </button>
            </>
          }
        >
          <div className="delete-modal-body" style={{ padding: 0 }}>
            <p>Are you sure you want to remove <strong>{deletingCategory.categoryName} ({deletingCategory.categoryCode})</strong>?</p>
            <div className="delete-warning-box">
              This category has an annual allocation of {deletingCategory.annualQuota} Days. Removing it will update the standard allowance calculations.
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
