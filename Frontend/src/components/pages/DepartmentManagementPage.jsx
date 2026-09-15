import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Download,
  Eye,
  Info,
  Pencil,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { ConfirmDialog, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import "./DepartmentManagementPage.css";
import departmentsIcon from "@/assets/dashboard-3d/total-sections.png";
import designationsIcon from "@/assets/dashboard-3d/teaching-staff.png";
import refreshIcon from "@/assets/settings-3d/board-academic-year.png";
import importExcelIcon from "@/assets/settings-3d/templates.png";
import addDepartmentIcon from "@/assets/dashboard-3d/create-section.png";
import addDesignationIcon from "@/assets/dashboard-3d/add-staff.png";

// Helper: Check if staff type matches current tab (supports Teaching, Non-Teaching, Both, All)
export const isStaffTypeMatch = (itemStaffType, currentTab) => {
  if (!itemStaffType) return true;
  const normItem = String(itemStaffType).trim().toLowerCase().replace(/[-_\s]/g, "");
  const normTab = String(currentTab).trim().toLowerCase().replace(/[-_\s]/g, "");
  if (normItem === "both" || normItem === "all") return true;
  return normItem === normTab;
};

// Helper: Convert UI staffType label to backend API expected string
export const toApiStaffType = (uiValue) => {
  if (!uiValue || uiValue === "Both" || uiValue === "All") return "";
  if (uiValue === "Non-Teaching" || uiValue === "NonTeaching") return "NonTeaching";
  if (uiValue === "Teaching") return "Teaching";
  return uiValue;
};

export const NON_TEACHING_DEPARTMENTS_SET = new Set([
  "administration",
  "accounts",
  "accounts & finance",
  "accounts and finance",
  "finance",
  "library",
  "maintenance",
  "maintenance & facilities",
  "transport",
  "transportation",
  "security",
  "human resources",
  "hr",
  "admissions",
  "campus operations",
  "operations",
  "student affairs",
  "hostel",
  "hostel management",
  "housekeeping",
  "estate",
  "facilities",
  "it support",
  "it & systems support",
  "examinations",
  "examinations cell",
]);

export const NON_TEACHING_DESIGNATIONS_SET = new Set([
  "account",
  "administrator",
  "administrative officer",
  "office administrator",
  "accountant",
  "senior accountant",
  "junior accountant",
  "accounts executive",
  "finance executive",
  "cashier",
  "office assistant",
  "attender",
  "peon",
  "attender / peon",
  "clerk",
  "data entry operator",
  "deo",
  "driver",
  "bus driver",
  "electrician",
  "plumber",
  "carpenter",
  "hr executive",
  "hr manager",
  "librarian",
  "library assistant",
  "assistant librarian",
  "maintenance supervisor",
  "maintenance staff",
  "receptionist",
  "front desk executive",
  "security guard",
  "security supervisor",
  "security officer",
  "transport coordinator",
  "transport incharge",
  "warden",
  "hostel warden",
  "assistant warden",
  "cleaner",
  "watchman",
  "lab assistant",
  "store keeper",
  "gardener",
  "operations manager",
  "facility supervisor",
]);

export const isOther = (name) => {
  if (!name) return false;
  const s = String(typeof name === "object" ? name.name || name.designationName || name.departmentName || name.label || name.value || "" : name).trim().toLowerCase();
  return s === "other" || s === "others";
};

export const isNonTeachingDeptName = (name) => {
  if (!name) return false;
  const norm = String(typeof name === "object" ? name.name || name.departmentName || "" : name).trim().toLowerCase();
  return (
    norm === "other" ||
    norm === "others" ||
    NON_TEACHING_DEPARTMENTS_SET.has(norm) ||
    norm.includes("admin") ||
    norm.includes("account") ||
    norm.includes("librar") ||
    norm.includes("maint") ||
    norm.includes("transp") ||
    norm.includes("secur") ||
    norm.includes("hostel") ||
    norm.includes("operation") ||
    norm.includes("human resource") ||
    norm.includes("admission") ||
    norm.includes("facility")
  );
};

export const isNonTeachingDesigName = (name) => {
  if (!name) return false;
  const norm = String(typeof name === "object" ? name.name || name.designationName || "" : name).trim().toLowerCase();
  return (
    norm === "other" ||
    norm === "others" ||
    norm === "account" ||
    NON_TEACHING_DESIGNATIONS_SET.has(norm) ||
    norm.includes("account") ||
    norm.includes("driver") ||
    norm.includes("peon") ||
    norm.includes("attender") ||
    norm.includes("clerk") ||
    norm.includes("librar") ||
    norm.includes("reception") ||
    norm.includes("guard") ||
    norm.includes("electrician") ||
    norm.includes("plumber") ||
    norm.includes("warden") ||
    norm.includes("office assistant") ||
    norm.includes("data entry")
  );
};

export const DEFAULT_TEACHING_DEPARTMENTS = [];
export const DEFAULT_NON_TEACHING_DEPARTMENTS = [];
export const DEFAULT_TEACHING_DESIGNATIONS = [];
export const DEFAULT_NON_TEACHING_DESIGNATIONS = [];

const unwrapRows = (payload) => {
  const value = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "results", "Results", "$values", "value", "Value"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const pick = (row, ...keys) =>
  keys
    .map((key) => row?.[key])
    .find((value) => value !== undefined && value !== null && value !== "");

export const normalizeDepartment = (row) => {
  const name = String(pick(row, "departmentName", "DepartmentName", "name", "Name") || "").trim();
  const rawStaffType = pick(row, "staffType", "StaffType");
  const staffType = rawStaffType
    ? String(rawStaffType).trim()
    : (isNonTeachingDeptName(name) ? "Non-Teaching" : "Teaching");
  return {
    id: pick(row, "departmentId", "DepartmentId", "id", "Id"),
    departmentId: pick(row, "departmentId", "DepartmentId", "id", "Id"),
    name,
    departmentName: name,
    code: String(pick(row, "departmentCode", "DepartmentCode", "code", "Code") || "—").trim(),
    departmentCode: String(pick(row, "departmentCode", "DepartmentCode", "code", "Code") || "—").trim(),
    staffType,
    description: String(pick(row, "description", "Description") || "—").trim(),
    isActive: Boolean(pick(row, "isActive", "IsActive") ?? true),
    status:
      pick(row, "isActive", "IsActive") === false ||
      String(pick(row, "status", "Status") || "").toLowerCase() === "inactive"
        ? "Inactive"
        : "Active",
    createdAt: pick(row, "createdAt", "CreatedAt") || null,
    updatedAt: pick(row, "updatedAt", "UpdatedAt") || null,
  };
};

export const normalizeDesignation = (row) => {
  const idVal = pick(row, "id", "Id", "designationId", "DesignationId");
  const name = String(pick(row, "designationName", "DesignationName", "name", "Name") || "").trim();
  const rawStaffType = pick(row, "staffType", "StaffType");
  const staffType = rawStaffType
    ? String(rawStaffType).trim()
    : (isNonTeachingDesigName(name) ? "Non-Teaching" : "Teaching");
  return {
    id: idVal,
    designationId: idVal,
    name,
    designationName: name,
    code: String(pick(row, "designationCode", "DesignationCode", "code", "Code") || "—").trim(),
    designationCode: String(pick(row, "designationCode", "DesignationCode", "code", "Code") || "—").trim(),
    staffType,
    isActive: Boolean(pick(row, "isActive", "IsActive") ?? true),
    status:
      pick(row, "isActive", "IsActive") === false ||
      String(pick(row, "status", "Status") || "").toLowerCase() === "inactive"
        ? "Inactive"
        : "Active",
    createdAt: pick(row, "createdAt", "CreatedAt") || null,
    updatedAt: pick(row, "updatedAt", "UpdatedAt") || null,
  };
};

const PAGE_SIZE = 6;

function Pager({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, total);
  return (
    <footer className="master-pager">
      <span>
        Showing {start} to {end} of {total} entries
      </span>
      <div>
        <button disabled={page === 1} onClick={() => onChange(page - 1)}>
          Prev
        </button>
        <strong>{page}</strong>
        <button disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </footer>
  );
}

function EmptyTable({ text, colSpan = 3 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="master-empty">
        {text}
      </td>
    </tr>
  );
}

const formDefinitions = {
  department: [
    ["departmentName", "Department Name", true, "Enter department name"],
    [
      "staffType",
      "Staff Type",
      true,
      "Select staff type",
      "select",
      ["Teaching", "Non-Teaching", "Both"],
    ],
    ["status", "Status", true, "Select status", "select", ["Active", "Inactive"]],
  ],
  designation: [
    ["designationName", "Designation Name", true, "Enter designation name"],
    [
      "staffType",
      "Staff Type",
      true,
      "Select staff type",
      "select",
      ["Teaching", "Non-Teaching"],
    ],
    ["status", "Status", true, "Select status", "select", ["Active", "Inactive"]],
  ],
};

function MasterCreateModal({ kind, staffType, onClose, onSaved }) {
  const label = kind === "department" ? "Department" : "Designation";
  const [values, setValues] = useState({
    departmentName: "",
    departmentCode: "",
    designationName: "",
    description: "",
    status: "Active",
    staffType: staffType === "Non-Teaching" ? "Non-Teaching" : "Teaching",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fields = formDefinitions[kind];

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    fields.forEach(([name, fieldLabel, required]) => {
      if (required && !String(values[name] ?? "").trim()) {
        nextErrors[name] = `${fieldLabel} is required.`;
      }
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (kind === "department") {
        const deptCode = values.departmentCode?.trim() || values.departmentName.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 10);
        const payload = {
          departmentId: 0,
          departmentName: values.departmentName.trim(),
          departmentCode: deptCode,
          staffType: toApiStaffType(values.staffType || staffType),
          description: values.description ? values.description.trim() : "",
          isActive: values.status === "Active",
        };
        const response = await apiClient.post(apiEndpoints.departments.create, payload);
        const created = normalizeDepartment(response.data);
        onSaved("Department created successfully.", created);
      } else {
        const payload = {
          name: values.designationName.trim(),
          staffType: toApiStaffType(values.staffType),
          isActive: values.status === "Active",
        };
        const response = await apiClient.post(apiEndpoints.designations.create, payload);
        const created = normalizeDesignation(response.data);
        onSaved("Designation created successfully.", created);
      }
      onClose();
    } catch (error) {
      const errMsg = getApiErrorMessage(
        error,
        `Unable to create ${label.toLowerCase()}. Please verify details.`
      );
      setErrors({ apiError: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Add ${label}`} onClose={onClose} className="master-create-modal">
      <form className="master-form" onSubmit={submit} noValidate>
        {errors.apiError && (
          <div className="master-form-error-alert">
            <Info /> <span>{errors.apiError}</span>
          </div>
        )}
        <div className="master-form-grid">
          {fields.map(([name, fieldLabel, required, placeholder, type = "text", options = []]) => (
            <label key={name} className={type === "textarea" ? "is-wide" : ""}>
              <span>
                {fieldLabel}
                {required ? <b> *</b> : null}
              </span>
              {type === "select" ? (
                <select
                  value={values[name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                >
                  <option value="">{placeholder}</option>
                  {options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : type === "textarea" ? (
                <textarea
                  value={values[name] ?? ""}
                  placeholder={placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                />
              ) : (
                <input
                  type={type}
                  value={values[name] ?? ""}
                  placeholder={placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                />
              )}
              {errors[name] ? <small>{errors[name]}</small> : null}
            </label>
          ))}
        </div>
        <footer>
          <button type="button" className="cms-btn secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="cms-btn primary" disabled={submitting}>
            {submitting ? "Saving..." : `Save ${label}`}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export default function DepartmentManagementPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [staffType, setStaffType] = useState("Teaching");
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [designationsLoading, setDesignationsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const [designationQuery, setDesignationQuery] = useState("");
  const [deptPage, setDeptPage] = useState(1);
  const [desigPage, setDesigPage] = useState(1);
  const [toast, setToast] = useState("");
  const [pendingDeleteDept, setPendingDeleteDept] = useState(null);
  const [pendingDeleteDesig, setPendingDeleteDesig] = useState(null);
  const [createKind, setCreateKind] = useState(null);
  const [deletingDept, setDeletingDept] = useState(false);
  const [deletingDesig, setDeletingDesig] = useState(false);

  const requestSeqRef = useRef(0);

  const fetchMasterData = useCallback(async (isManual = false) => {
    const currentSeq = ++requestSeqRef.current;
    if (isManual) {
      setIsRefreshing(true);
    }
    setDepartmentsLoading(true);
    setDesignationsLoading(true);

    let deptSuccess = false;
    let desigSuccess = false;

    try {
      // 1. Fetch Departments (GET /api/v1/departments)
      const deptRes = await apiClient.get(apiEndpoints.departments.getAll, {
        skipGlobalLoader: true,
      });
      if (requestSeqRef.current === currentSeq) {
        const rows = unwrapRows(deptRes.data).map(normalizeDepartment).filter((d) => d.name);
        setDepartments(rows);
        deptSuccess = true;
      }
    } catch (err) {
      console.warn("Failed to load departments:", err);
      if (requestSeqRef.current === currentSeq) {
        setDepartments([]);
      }
    } finally {
      if (requestSeqRef.current === currentSeq) setDepartmentsLoading(false);
    }

    try {
      // 2. Fetch Designations (GET /api/v1/designations?includeInactive=true)
      const desigRes = await apiClient.get(apiEndpoints.designations.getAll, {
        params: { includeInactive: true },
        skipGlobalLoader: true,
      });
      if (requestSeqRef.current === currentSeq) {
        const rows = unwrapRows(desigRes.data).map(normalizeDesignation).filter((d) => d.name);
        setDesignations(rows);
        desigSuccess = true;
      }
    } catch (err) {
      console.warn("Failed to load designations:", err);
      if (requestSeqRef.current === currentSeq) {
        setDesignations([]);
      }
    } finally {
      if (requestSeqRef.current === currentSeq) {
        setDesignationsLoading(false);
        setIsRefreshing(false);
      }
    }

    if (isManual && requestSeqRef.current === currentSeq) {
      setToast("Department and Designation data refreshed successfully.");
    }
  }, []);

  // Fetch initial data once on mount; admin can manually refresh on demand
  useEffect(() => {
    fetchMasterData(false);
  }, [fetchMasterData]);

  // Department Client-side Filtering
  const filteredDepartments = useMemo(() => {
    const isTeaching = staffType === "Teaching";
    const seen = new Set();
    const result = [];

    const sourceList = Array.isArray(departments) ? departments : [];

    for (const item of sourceList) {
      if (!item || !item.name) continue;
      const dName = item.name.trim();
      const norm = dName.toLowerCase();
      if (isOther(norm)) continue;

      const isNonTeaching = isNonTeachingDeptName(norm);
      if (isTeaching && isNonTeaching) continue;
      if (!isTeaching && !isNonTeaching) continue;

      if (!seen.has(norm)) {
        seen.add(norm);
        result.push(item);
      }
    }

    const q = deptQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter((item) =>
      [item.name, item.code, item.description, item.staffType].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [departments, staffType, deptQuery]);

  const visibleDepartments = useMemo(() => {
    return filteredDepartments.slice((deptPage - 1) * PAGE_SIZE, deptPage * PAGE_SIZE);
  }, [filteredDepartments, deptPage]);

  const activeDepartmentsCount = useMemo(() => {
    return filteredDepartments.filter((d) => d.status === "Active").length;
  }, [filteredDepartments]);

  // Designation Client-side Filtering
  const filteredDesignations = useMemo(() => {
    const isTeaching = staffType === "Teaching";
    const seen = new Set();
    const result = [];

    const sourceList = Array.isArray(designations) ? designations : [];

    for (const item of sourceList) {
      if (!item || !item.name) continue;
      const dName = item.name.trim();
      const norm = dName.toLowerCase();
      if (isOther(norm)) continue;

      const isNonTeaching = isNonTeachingDesigName(norm);
      if (isTeaching && isNonTeaching) continue;
      if (!isTeaching && !isNonTeaching) continue;

      if (!seen.has(norm)) {
        seen.add(norm);
        result.push(item);
      }
    }

    const q = designationQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter((item) =>
      [item.name, item.code, item.staffType].some((val) =>
        String(val || "").toLowerCase().includes(q)
      )
    );
  }, [designations, staffType, designationQuery]);

  const visibleDesignations = useMemo(() => {
    return filteredDesignations.slice((desigPage - 1) * PAGE_SIZE, desigPage * PAGE_SIZE);
  }, [filteredDesignations, desigPage]);

  const activeDesignationsCount = useMemo(() => {
    return filteredDesignations.filter((d) => d.status === "Active").length;
  }, [filteredDesignations]);

  // Delete Department Handler (DELETE /api/v1/departments/{id})
  const handleDeleteDepartment = async () => {
    if (!pendingDeleteDept?.id) return;
    setDeletingDept(true);
    try {
      await apiClient.delete(apiEndpoints.departments.delete(pendingDeleteDept.id));
      setToast(`Department "${pendingDeleteDept.name}" deleted successfully.`);
      setDepartments((prev) => prev.filter((d) => d.id !== pendingDeleteDept.id));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setToast("Department was not found on the server.");
        setDepartments((prev) => prev.filter((d) => d.id !== pendingDeleteDept.id));
      } else {
        const msg = getApiErrorMessage(
          error,
          "This department cannot be deleted because it is currently assigned to designations or staff."
        );
        setToast(msg);
      }
    } finally {
      setDeletingDept(false);
      setPendingDeleteDept(null);
    }
  };

  // Delete Designation Handler (DELETE /api/v1/designations/{id})
  const handleDeleteDesignation = async () => {
    if (!pendingDeleteDesig?.id) return;
    setDeletingDesig(true);
    try {
      await apiClient.delete(apiEndpoints.designations.delete(pendingDeleteDesig.id));
      setToast({ message: `Designation "${pendingDeleteDesig.name}" deleted successfully.`, type: "success" });
      setDesignations((prev) => prev.filter((d) => d.id !== pendingDeleteDesig.id));
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404) {
        setToast({ message: "Designation was not found on the server.", type: "warning" });
        setDesignations((prev) => prev.filter((d) => d.id !== pendingDeleteDesig.id));
      } else {
        const msg = getApiErrorMessage(
          error,
          "This designation cannot be deleted because it is currently assigned to staff."
        );
        setToast({ message: msg, type: "error" });
      }
    } finally {
      setDeletingDesig(false);
      setPendingDeleteDesig(null);
    }
  };

  const pageActions = (
    <div className="master-page-actions master-summary-actions">
      <article>
        <img className="master-summary-icon" src={departmentsIcon} alt="" aria-hidden="true" width={28} height={28} />
        <span>
          Total Departments<strong>{filteredDepartments.length}</strong>
          <small>{activeDepartmentsCount} Active Departments</small>
        </span>
      </article>
      <article>
        <img className="master-summary-icon" src={designationsIcon} alt="" aria-hidden="true" width={28} height={28} />
        <span>
          Total Designations<strong>{filteredDesignations.length}</strong>
          <small>{activeDesignationsCount} Active Designations</small>
        </span>
      </article>
      <button
        type="button"
        className="cms-btn cms-btn-ghost master-refresh-btn"
        onClick={() => fetchMasterData(true)}
        title="Click to refresh department and designation data"
        aria-label="Refresh department and designation data"
      >
        <img className={`master-summary-icon${isRefreshing || departmentsLoading || designationsLoading ? " is-spinning" : ""}`} src={refreshIcon} alt="" aria-hidden="true" width={28} height={28} />
        <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
      </button>
    </div>
  );

  return (
    <DashboardLayout
      title="Department Management"
      subtitle="Manage departments and designations used across the staff management system."
      breadcrumb={["Administration"]}
    >
      <main className="master-page">
        <div className="master-filter-row">
          <div className="master-staff-tabs" role="tablist" aria-label="Staff type">
            {["Teaching", "Non-Teaching"].map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={staffType === type}
                className={staffType === type ? "is-active" : ""}
                onClick={() => {
                  setStaffType(type);
                  setDeptPage(1);
                  setDesigPage(1);
                }}
              >
                {type} Staff
              </button>
            ))}
          </div>
          {pageActions}
        </div>

        <section className="master-grid">
          {/* DEPARTMENTS CARD */}
          <article className="master-card">
            <header>
              <div>
                <h2>Departments</h2>
                <p>Add and view {staffType.toLowerCase()} departments.</p>
              </div>
              <div className="master-actions">
                <button
                  className="cms-btn secondary"
                  onClick={() => navigate("/dashboard/departments/import")}
                >
                  <img className="master-action-icon" src={importExcelIcon} alt="" aria-hidden="true" width={24} height={24} /> Import Excel
                </button>
                <button
                  className="cms-btn primary"
                  onClick={() => setCreateKind("department")}
                >
                  <img className="master-action-icon" src={addDepartmentIcon} alt="" aria-hidden="true" width={24} height={24} /> Add Department
                </button>
              </div>
            </header>
            <label className="master-search">
              <Search3DIcon size={16} />
              <span className="sr-only">Search departments</span>
              <input
                value={deptQuery}
                onChange={(event) => {
                  setDeptQuery(event.target.value);
                  setDeptPage(1);
                }}
                placeholder="Search departments..."
              />
            </label>
            <div className="master-table-wrap">
              <table className="department-table">
                <thead>
                  <tr>
                    <th>Department Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentsLoading ? (
                    <EmptyTable colSpan={3} text="Loading departments..." />
                  ) : visibleDepartments.length > 0 ? (
                    visibleDepartments.map((item) => (
                      <tr key={item.id || item.name}>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.staffType}</small>
                        </td>
                        <td>
                          <StatusBadge value={item.status} />
                        </td>
                        <td>
                          <div className="master-row-actions">
                            <button
                              className="master-icon-button"
                              aria-label={`View ${item.name}`}
                              onClick={() => navigate(`/dashboard/departments/${item.id}/view`, { state: { department: item } })}
                            >
                              <Eye />
                            </button>
                            <button
                              className="master-icon-button"
                              aria-label={`Edit ${item.name}`}
                              onClick={() => navigate(`/dashboard/departments/${item.id}/edit`)}
                            >
                              <Pencil />
                            </button>
                            <button
                              className="master-icon-button is-delete"
                              aria-label={`Delete ${item.name}`}
                              onClick={() => setPendingDeleteDept(item)}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTable
                      colSpan={3}
                      text={
                        deptQuery
                          ? "No departments match your search."
                          : "No departments have been added for this staff type yet."
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={deptPage} total={filteredDepartments.length} onChange={setDeptPage} />
          </article>

          {/* DESIGNATIONS CARD */}
          <article className="master-card">
            <header>
              <div>
                <h2>Designations</h2>
                <p>Add, edit and manage {staffType.toLowerCase()} designations.</p>
              </div>
              <div className="master-actions">
                <button
                  className="cms-btn secondary"
                  onClick={() => navigate("/dashboard/designations/import")}
                >
                  <img className="master-action-icon" src={importExcelIcon} alt="" aria-hidden="true" width={24} height={24} /> Import Excel
                </button>
                <button
                  className="cms-btn primary"
                  onClick={() => setCreateKind("designation")}
                >
                  <img className="master-action-icon" src={addDesignationIcon} alt="" aria-hidden="true" width={24} height={24} /> Add Designation
                </button>
              </div>
            </header>
            <label className="master-search">
              <Search3DIcon size={16} />
              <span className="sr-only">Search designations</span>
              <input
                value={designationQuery}
                onChange={(event) => {
                  setDesignationQuery(event.target.value);
                  setDesigPage(1);
                }}
                placeholder="Search designations..."
              />
            </label>
            <div className="master-table-wrap">
              <table className="designation-table">
                <thead>
                  <tr>
                    <th>Designation Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {designationsLoading ? (
                    <EmptyTable colSpan={3} text="Loading designations..." />
                  ) : visibleDesignations.length > 0 ? (
                    visibleDesignations.map((item) => (
                      <tr key={item.id || item.name}>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.staffType}</small>
                        </td>
                        <td>
                          <StatusBadge value={item.status} />
                        </td>
                        <td>
                          <div className="master-row-actions">
                            <button
                              className="master-icon-button"
                              aria-label={`View ${item.name}`}
                              onClick={() => navigate(`/dashboard/designations/${item.id}/view`, { state: { designation: item } })}
                            >
                              <Eye />
                            </button>
                            <button
                              className="master-icon-button"
                              aria-label={`Edit ${item.name}`}
                              onClick={() => navigate(`/dashboard/designations/${item.id}/edit`)}
                            >
                              <Pencil />
                            </button>
                            <button
                              className="master-icon-button is-delete"
                              aria-label={`Delete ${item.name}`}
                              onClick={() => setPendingDeleteDesig(item)}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTable
                      colSpan={3}
                      text={
                        designationQuery
                          ? "No designations match your search."
                          : "No designations have been added for this staff type yet."
                      }
                    />
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={desigPage} total={filteredDesignations.length} onChange={setDesigPage} />
          </article>
        </section>

        <aside className="master-note">
          <Info />
          <span>
            Departments and Designations created here are retrieved live from the backend server API
            and available across the Staff Management module.
          </span>
        </aside>
      </main>

      {/* DEPARTMENT DELETE CONFIRM DIALOG (DELETE /api/v1/departments/{id}) */}
      {pendingDeleteDept ? (
        <ConfirmDialog
          title="Delete department?"
          message={`Are you sure you want to delete department "${pendingDeleteDept.name}"? This action cannot be undone.`}
          confirmLabel={deletingDept ? "Deleting..." : "Delete"}
          onCancel={() => setPendingDeleteDept(null)}
          onConfirm={handleDeleteDepartment}
        />
      ) : null}

      {/* DESIGNATION DELETE CONFIRM DIALOG (DELETE /api/v1/designations/{id}) */}
      {pendingDeleteDesig ? (
        <ConfirmDialog
          title="Delete designation?"
          message={`Are you sure you want to delete designation "${pendingDeleteDesig.name}"? This action cannot be undone.`}
          confirmLabel={deletingDesig ? "Deleting..." : "Delete"}
          onCancel={() => setPendingDeleteDesig(null)}
          onConfirm={handleDeleteDesignation}
        />
      ) : null}

      {/* CREATE MODAL */}
      {createKind ? (
        <MasterCreateModal
          kind={createKind}
          staffType={staffType}
          onClose={() => setCreateKind(null)}
          onSaved={(msg, newItem) => {
            setToast(msg);
            if (newItem) {
              if (createKind === "department") {
                setDepartments((prev) => [newItem, ...prev]);
              } else {
                setDesignations((prev) => [newItem, ...prev]);
              }
            }
          }}
        />
      ) : null}

      {toast ? (
        <Toast
          message={typeof toast === "object" ? toast.message : toast}
          type={typeof toast === "object" ? toast.type || "success" : "success"}
          onClose={() => setToast(null)}
        />
      ) : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// DEPARTMENT DETAILS PAGE (GET /api/v1/departments/{id})
// ----------------------------------------------------------------------
export function DepartmentDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [department, setDepartment] = useState(location.state?.department || null);
  const [loading, setLoading] = useState(!department);
  const [error, setError] = useState("");

  useEffect(() => {
    if (department) return;
    let active = true;
    setLoading(true);

    const loadDept = async () => {
      try {
        if (apiEndpoints.departments.getById) {
          const res = await apiClient.get(apiEndpoints.departments.getById(id), { skipGlobalLoader: true });
          if (!active) return;
          setDepartment(normalizeDepartment(res.data));
          return;
        }
      } catch (err) {
        console.warn("Direct department fetch failed, falling back to list:", err);
      }

      try {
        const res = await apiClient.get(apiEndpoints.departments.getAll, { skipGlobalLoader: true });
        if (!active) return;
        const list = unwrapRows(res.data).map(normalizeDepartment);
        const match = list.find((item) => String(item.id) === String(id));
        if (match) {
          setDepartment(match);
        } else {
          setError("Department details were not found.");
        }
      } catch (requestError) {
        if (!active) return;
        setError(getApiErrorMessage(requestError, "Department details could not be loaded."));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDept();

    return () => {
      active = false;
    };
  }, [id, department]);

  return (
    <DashboardLayout
      title="Department Details"
      subtitle="View department master information."
      breadcrumb={["Administration", "Department Management"]}
      actions={
        department ? (
          <button
            className="cms-btn cms-btn-primary"
            onClick={() => navigate(`/dashboard/departments/${department.id}/edit`)}
          >
            <Pencil /> Edit Department
          </button>
        ) : null
      }
    >
      <main className="master-form-page">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        <section className="master-details-card">
          <header>
            <Building2 />
            <div>
              <h1>{department?.name || "Department Details"}</h1>
              <p>Department master record</p>
            </div>
          </header>
          {loading ? (
            <p className="master-details-state">Loading department details...</p>
          ) : error ? (
            <p className="master-details-state">{error}</p>
          ) : department ? (
            <dl>
              <div>
                <dt>Department Name</dt>
                <dd>{department.name}</dd>
              </div>
              <div>
                <dt>Department Code</dt>
                <dd><code>{department.code}</code></dd>
              </div>
              <div>
                <dt>Staff Type</dt>
                <dd>{department.staffType}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge value={department.status} />
                </dd>
              </div>
              {department.description && department.description !== "—" ? (
                <div className="is-wide">
                  <dt>Description</dt>
                  <dd>{department.description}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="master-details-state">Department details could not be found.</p>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// DESIGNATION DETAILS PAGE (GET /api/v1/designations/{id})
// ----------------------------------------------------------------------
export function DesignationDetailsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [designation, setDesignation] = useState(location.state?.designation || null);
  const [loading, setLoading] = useState(!designation);
  const [error, setError] = useState("");

  useEffect(() => {
    if (designation) return;
    let active = true;
    setLoading(true);
    apiClient
      .get(apiEndpoints.designations.getById(id), { skipGlobalLoader: true })
      .then((response) => {
        if (!active) return;
        setDesignation(normalizeDesignation(response.data));
      })
      .catch((err) => {
        if (!active) return;
        setError(getApiErrorMessage(err, "Designation details could not be loaded."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, designation]);

  return (
    <DashboardLayout
      title="Designation Details"
      subtitle="View designation master information."
      breadcrumb={["Administration", "Department Management"]}
      actions={
        designation ? (
          <button
            className="cms-btn cms-btn-primary"
            onClick={() => navigate(`/dashboard/designations/${id}/edit`)}
          >
            <Pencil /> Edit Designation
          </button>
        ) : null
      }
    >
      <main className="master-form-page">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        <section className="master-details-card">
          <header>
            <Users />
            <div>
              <h1>{designation?.name || "Designation Details"}</h1>
              <p>Designation master record</p>
            </div>
          </header>
          {loading ? (
            <p className="master-details-state">Loading designation details...</p>
          ) : error ? (
            <p className="master-details-state">{error}</p>
          ) : designation ? (
            <dl>
              <div>
                <dt>Designation Name</dt>
                <dd>{designation.name}</dd>
              </div>
              <div>
                <dt>Designation Code</dt>
                <dd><code>{designation.code}</code></dd>
              </div>
              <div>
                <dt>Staff Type</dt>
                <dd>{designation.staffType}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge value={designation.status} />
                </dd>
              </div>
            </dl>
          ) : (
            <p className="master-details-state">Designation details could not be found.</p>
          )}
        </section>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// MASTER FORM PAGE (ADD/EDIT DEPARTMENT & DESIGNATION)
// ----------------------------------------------------------------------
export function MasterFormPage({ kind }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const edit = Boolean(id);
  const label = kind === "department" ? "Department" : "Designation";

  const [values, setValues] = useState({
    departmentName: "",
    departmentCode: "",
    designationName: "",
    description: "",
    status: "Active",
    staffType: "Teaching",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(edit);
  const [submitting, setSubmitting] = useState(false);

  const fields = formDefinitions[kind];

  useEffect(() => {
    if (!edit) return;
    let active = true;
    setLoading(true);

    if (kind === "department") {
      const loadDept = async () => {
        try {
          const res = await apiClient.get(apiEndpoints.departments.getById(id), { skipGlobalLoader: true });
          if (!active) return;
          const match = normalizeDepartment(res.data);
          setValues({
            departmentName: match.name,
            departmentCode: match.code !== "—" ? match.code : "",
            description: match.description !== "—" ? match.description : "",
            status: match.status,
            staffType: match.staffType === "NonTeaching" ? "Non-Teaching" : match.staffType,
          });
        } catch {
          try {
            const res = await apiClient.get(apiEndpoints.departments.getAll, { skipGlobalLoader: true });
            if (!active) return;
            const match = unwrapRows(res.data).map(normalizeDepartment).find((d) => String(d.id) === String(id));
            if (match) {
              setValues({
                departmentName: match.name,
                departmentCode: match.code !== "—" ? match.code : "",
                description: match.description !== "—" ? match.description : "",
                status: match.status,
                staffType: match.staffType === "NonTeaching" ? "Non-Teaching" : match.staffType,
              });
            }
          } catch (err) {
            if (!active) return;
            setErrors({ apiError: getApiErrorMessage(err, "Failed to load department details.") });
          }
        } finally {
          if (active) setLoading(false);
        }
      };
      loadDept();
    } else {
      // Edit Designation: GET /api/v1/designations/{id}
      apiClient
        .get(apiEndpoints.designations.getById(id), { skipGlobalLoader: true })
        .then((res) => {
          if (!active) return;
          const match = normalizeDesignation(res.data);
          setValues({
            designationName: match.name,
            status: match.status,
            staffType: match.staffType === "NonTeaching" ? "Non-Teaching" : match.staffType,
          });
        })
        .catch((err) => {
          if (!active) return;
          setErrors({ apiError: getApiErrorMessage(err, "Failed to load designation details.") });
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [edit, id, kind]);

  const submit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    fields.forEach(([name, fieldLabel, required]) => {
      if (required && !String(values[name] ?? "").trim()) {
        nextErrors[name] = `${fieldLabel} is required.`;
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (kind === "department") {
        const deptCode = values.departmentCode?.trim() || values.departmentName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 10);
        const payload = {
          departmentId: Number(id) || 0,
          departmentName: values.departmentName.trim(),
          departmentCode: deptCode,
          staffType: toApiStaffType(values.staffType || "Teaching"),
          description: values.description ? values.description.trim() : "",
          isActive: values.status === "Active",
        };
        if (edit) {
          await apiClient.put(apiEndpoints.departments.update(id), payload);
        } else {
          await apiClient.post(apiEndpoints.departments.create, payload);
        }
        navigate("/dashboard/departments");
      } else {
        const payload = {
          name: values.designationName.trim(),
          staffType: toApiStaffType(values.staffType),
          isActive: values.status === "Active",
        };
        if (edit) {
          await apiClient.put(apiEndpoints.designations.update(id), payload);
        } else {
          await apiClient.post(apiEndpoints.designations.create, payload);
        }
        navigate("/dashboard/departments");
      }
    } catch (error) {
      setErrors({
        apiError: getApiErrorMessage(
          error,
          `Unable to ${edit ? "update" : "create"} ${label.toLowerCase()}.`
        ),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={`${edit ? "Edit" : "Add"} ${label}`}
      subtitle={`${edit ? "Update" : "Create"} ${label.toLowerCase()} master details.`}
      breadcrumb={["Administration", "Department Management"]}
    >
      <main className="master-form-page">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        {loading ? (
          <p className="master-details-state">Loading form details...</p>
        ) : (
          <form className="master-form" onSubmit={submit} noValidate>
            <header>
              <Building2 />
              <div>
                <h1>
                  {edit ? "Edit" : "Add"} {label}
                </h1>
                <p>
                  {edit ? "Review and update" : "Create a new"} {label.toLowerCase()} for your institution.
                </p>
              </div>
            </header>

            {errors.apiError && (
              <div className="master-form-error-alert" style={{ marginBottom: 16, color: "#dc2626" }}>
                <Info /> <span>{errors.apiError}</span>
              </div>
            )}

            <div className="master-form-grid">
              {fields.map(
                ([name, fieldLabel, required, placeholder, type = "text", options = []]) => (
                  <label key={name} className={type === "textarea" ? "is-wide" : ""}>
                    <span>
                      {fieldLabel}
                      {required ? <b> *</b> : null}
                    </span>
                    {type === "select" ? (
                      <select
                        value={values[name] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                      >
                        <option value="">{placeholder}</option>
                        {options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : type === "textarea" ? (
                      <textarea
                        value={values[name] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                      />
                    ) : (
                      <input
                        type={type}
                        value={values[name] ?? ""}
                        placeholder={placeholder}
                        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                      />
                    )}
                    {errors[name] ? <small>{errors[name]}</small> : null}
                  </label>
                )
              )}
            </div>

            <footer>
              <button
                type="button"
                className="cms-btn secondary"
                onClick={() => navigate("/dashboard/departments")}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cms-btn primary"
                disabled={submitting}
              >
                {submitting ? "Saving..." : `Save ${label}`}
              </button>
            </footer>
          </form>
        )}
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// EXCEL IMPORT PAGE (EXCEL IMPORT API INTEGRATION & PREVIEW)
// ----------------------------------------------------------------------
const importColumns = {
  department: [
    "Department Name",
    "Department Code",
    "Staff Type",
    "Description",
    "Status",
  ],
  designation: [
    "Designation Name",
    "Staff Type",
    "Status",
  ],
};

export function MasterImportPage({ kind }) {
  const navigate = useNavigate();
  const label = kind === "department" ? "Departments" : "Designations";
  const [rows, setRows] = useState([]);
  const [rawFile, setRawFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [importError, setImportError] = useState("");

  const download = async () => {
    try {
      const endpoint = kind === "department"
        ? apiEndpoints.departments.exportTemplate
        : apiEndpoints.designations.exportTemplate;
      if (endpoint) {
        const res = await apiClient.get(endpoint, { responseType: "blob" });
        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${kind}-import-template.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        return;
      }
    } catch {
      // Fallback to client-side XLSX generation
    }
    const sheet = XLSX.utils.aoa_to_sheet([importColumns[kind]]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, label);
    XLSX.writeFile(book, `${kind}-import-template.xlsx`);
  };

  const parse = async (file) => {
    if (!file) return;
    setRawFile(file);
    setParsing(true);
    setFileName(file.name);
    setImportError("");
    try {
      const data = await file.arrayBuffer();
      const book = XLSX.read(data);
      const json = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" });
      const required = importColumns[kind].slice(0, 1);
      const names = new Set();
      setRows(
        json.map((row, index) => {
          const problems = required
            .filter((column) => !String(row[column]).trim())
            .map((column) => `Missing ${column}`);
          const nameKey = kind === "department" ? "Department Name" : "Designation Name";
          const nameVal = String(row[nameKey]).trim().toLowerCase();
          if (nameVal && names.has(nameVal)) problems.push(`Duplicate ${nameKey}`);
          names.add(nameVal);
          if (row.Status && !["Active", "Inactive"].includes(String(row.Status))) {
            problems.push("Invalid Status");
          }
          if (
            row["Staff Type"] &&
            !["Teaching", "Non-Teaching", "NonTeaching", "Both"].includes(String(row["Staff Type"]))
          ) {
            problems.push("Invalid Staff Type");
          }
          return { index: index + 2, row, problems };
        })
      );
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!rawFile) return;
    setImporting(true);
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("DefaultStaffType", "Teaching");
      const endpoint = kind === "department"
        ? apiEndpoints.departments.importExcel
        : apiEndpoints.designations.importExcel;
      await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/dashboard/departments");
    } catch (err) {
      setImportError(getApiErrorMessage(err, `Failed to import ${label.toLowerCase()}.`));
    } finally {
      setImporting(false);
    }
  };

  const valid = rows.filter((row) => !row.problems.length).length;
  const duplicates = rows.filter((row) =>
    row.problems.some((problem) => problem.startsWith("Duplicate"))
  ).length;

  return (
    <DashboardLayout
      title={`Import ${label}`}
      subtitle={`Validate and import ${label.toLowerCase()}.`}
      breadcrumb={["Administration", "Department Management"]}
    >
      <main className="master-import">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department Management
        </button>
        <section>
          <header>
            <div>
              <h1>Import {label}</h1>
              <p>Upload XLSX or XLS and review every row before import.</p>
            </div>
            <button className="cms-btn secondary" onClick={download}>
              <Download /> Download Template
            </button>
          </header>

          {importError && (
            <div className="master-form-error-alert" style={{ marginBottom: 16, color: "#dc2626" }}>
              <Info /> <span>{importError}</span>
            </div>
          )}

          <label className="master-drop">
            <Upload />
            <strong>
              {parsing ? "Parsing file..." : fileName || `Choose ${label} Excel file`}
            </strong>
            <span>Accepted formats: .xlsx, .xls</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              disabled={parsing || importing}
              onChange={(event) => parse(event.target.files?.[0])}
            />
          </label>
          {rows.length ? (
            <>
              <div className="import-summary">
                <article>
                  Total Rows<strong>{rows.length}</strong>
                </article>
                <article>
                  Valid Rows<strong>{valid}</strong>
                </article>
                <article>
                  Invalid Rows<strong>{rows.length - valid}</strong>
                </article>
                <article>
                  Duplicates<strong>{duplicates}</strong>
                </article>
              </div>
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Data</th>
                      <th>Validation Status</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.index}>
                        <td>{item.index}</td>
                        <td>{Object.values(item.row).filter(Boolean).join(" · ") || "—"}</td>
                        <td>
                          <StatusBadge value={item.problems.length ? "Invalid" : "Valid"} />
                        </td>
                        <td>{item.problems.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer>
                <button
                  type="button"
                  className="cms-btn primary"
                  disabled={importing || parsing || !rawFile}
                  onClick={handleImport}
                >
                  {importing ? "Importing..." : `Import ${label}`}
                </button>
              </footer>
            </>
          ) : null}
        </section>
      </main>
    </DashboardLayout>
  );
}
