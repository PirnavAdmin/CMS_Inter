import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Download,
  Eye,
  Info,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { ConfirmDialog, Modal, SkeletonRow, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import "./DepartmentManagementPage.css";
import departmentsIcon from "@/assets/dashboard-3d/total-sections.png";
import designationsIcon from "@/assets/dashboard-3d/teaching-staff.png";
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
  const deptId = pick(row, "departmentId", "DepartmentId");
  const deptName = pick(row, "departmentName", "DepartmentName");
  const rawStaffType = pick(row, "staffType", "StaffType");
  const staffType = rawStaffType
    ? String(rawStaffType).trim()
    : (isNonTeachingDesigName(name) ? "Non-Teaching" : "Teaching");
  return {
    id: idVal,
    designationId: idVal,
    name,
    designationName: name,
    departmentId: deptId || null,
    departmentName: deptName ? String(deptName).trim() : "",
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
const DepartmentTableSkeleton = () => Array.from({ length: PAGE_SIZE }, (_, index) => <SkeletonRow key={index} columns={3} />);
const DesignationTableSkeleton = () => Array.from({ length: PAGE_SIZE }, (_, index) => <SkeletonRow key={index} columns={4} />);

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
    ["departmentId", "Department", false, "Select Department", "department-select"],
    ["status", "Status", true, "Select status", "select", ["Active", "Inactive"]],
  ],
};

function CustomDepartmentDropdown({
  value,
  onChange,
  options = [],
  placeholder = "Select Department",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);

  const selectedDept = useMemo(() => {
    if (!value) return null;
    return options.find((d) => String(d.id || d.departmentId) === String(value));
  }, [value, options]);

  // Sync display text when value changes or when selected
  useEffect(() => {
    if (selectedDept) {
      setQuery(selectedDept.name);
    } else if (!value) {
      setQuery("");
    }
  }, [selectedDept, value]);

  // Filter options based on user typing
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selectedDept && selectedDept.name.toLowerCase() === q)) {
      return options;
    }
    return options.filter((d) => (d.name || d.departmentName || "").toLowerCase().includes(q));
  }, [options, query, selectedDept]);

  // Click outside to close and restore valid name
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        if (selectedDept) {
          setQuery(selectedDept.name);
        } else {
          setQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, selectedDept]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    if (!isOpen) setIsOpen(true);
    if (!text.trim()) {
      onChange("");
    }
  };

  const handleSelectOption = (dept) => {
    if (!dept) {
      onChange("");
      setQuery("");
    } else {
      const deptId = dept.id || dept.departmentId;
      onChange(deptId);
      setQuery(dept.name);
    }
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className={`master-custom-dropdown-wrap ${isOpen ? "is-open" : ""}`} ref={dropdownRef}>
      <div className="master-combobox-input-wrap">
        <input
          type="text"
          className="master-combobox-input"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          autoComplete="off"
        />
        <div className="master-dropdown-icons">
          {value ? (
            <button
              type="button"
              className="master-dropdown-clear"
              title="Clear selection"
              onClick={handleClear}
            >
              <X size={13} />
            </button>
          ) : null}
          <button
            type="button"
            className="master-dropdown-chevron-btn"
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            tabIndex={-1}
          >
            <ChevronDown size={15} className={`master-dropdown-chevron ${isOpen ? "is-rotated" : ""}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="master-custom-dropdown-menu" role="listbox">
          <div className="master-dropdown-list-scroll">
            <button
              type="button"
              className={`master-dropdown-item ${!value ? "is-active" : ""}`}
              onClick={() => handleSelectOption(null)}
            >
              <span>{placeholder}</span>
              {!value && <Check size={14} className="master-item-check" />}
            </button>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((dept) => {
                const deptId = dept.id || dept.departmentId;
                const isSelected = String(value) === String(deptId);
                return (
                  <button
                    key={deptId}
                    type="button"
                    className={`master-dropdown-item ${isSelected ? "is-active" : ""}`}
                    onClick={() => handleSelectOption(dept)}
                  >
                    <span>{dept.name}</span>
                    {isSelected && <Check size={14} className="master-item-check" />}
                  </button>
                );
              })
            ) : (
              <div className="master-dropdown-no-results">No matching departments found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MasterCreateModal({ kind, staffType, departments = [], onClose, onSaved }) {
  const label = kind === "department" ? "Department" : "Designation";
  const [values, setValues] = useState({
    departmentName: "",
    departmentCode: "",
    designationName: "",
    departmentId: "",
    description: "",
    status: "Active",
    staffType: staffType === "Non-Teaching" ? "Non-Teaching" : "Teaching",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState(departments || []);

  useEffect(() => {
    if (kind === "designation" && (!departments || departments.length === 0)) {
      apiClient
        .get(apiEndpoints.departments.getAll, { skipGlobalLoader: true })
        .then((res) => {
          setAvailableDepartments(unwrapRows(res.data).map(normalizeDepartment).filter((d) => d.name));
        })
        .catch((err) => console.warn("Could not load departments for modal:", err));
    } else if (departments && departments.length > 0) {
      setAvailableDepartments(departments);
    }
  }, [kind, departments]);

  const currentStaffType = values.staffType || staffType;
  const filteredDeptOptions = useMemo(() => {
    return (availableDepartments || []).filter((d) => {
      if (!d.isActive && d.status !== "Active") return false;
      return isStaffTypeMatch(d.staffType, currentStaffType);
    });
  }, [availableDepartments, currentStaffType]);

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
          departmentId: values.departmentId ? Number(values.departmentId) : null,
          staffType: toApiStaffType(values.staffType),
          isActive: values.status === "Active",
        };
        const response = await apiClient.post(apiEndpoints.designations.create, payload);
        const created = normalizeDesignation(response.data);
        if (created.departmentId && !created.departmentName) {
          const matchedDept = availableDepartments.find((d) => String(d.id) === String(created.departmentId));
          if (matchedDept) created.departmentName = matchedDept.name;
        }
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
              {type === "department-select" ? (
                <CustomDepartmentDropdown
                  value={values[name] ?? ""}
                  options={filteredDeptOptions}
                  placeholder={placeholder || "Select Department"}
                  onChange={(val) => setValues((v) => ({ ...v, [name]: val }))}
                />
              ) : type === "select" ? (
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
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const handleDownloadTemplate = async (kind = "department") => {
    setDownloadingTemplate(true);
    try {
      const endpoint =
        kind === "department"
          ? apiEndpoints.departments.exportTemplate || "/api/v1/departments/template"
          : apiEndpoints.designations.exportTemplate || "/api/v1/designations/template";

      const response = await apiClient.get(endpoint, {
        params: { staffType: staffType || "Teaching" },
        responseType: "blob",
        skipGlobalLoader: true,
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        kind === "department"
          ? "Department_Import_Template.xlsx"
          : "Designation_Import_Template.xlsx"
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: "Excel template downloaded successfully.", type: "success" });
    } catch (err) {
      console.warn("API template download failed, using client generation fallback:", err);
      try {
        const book = XLSX.utils.book_new();
        if (kind === "department") {
          const deptSheet = XLSX.utils.aoa_to_sheet([
            ["Department Name", "Staff Type", "Status"],
          ]);
          XLSX.utils.book_append_sheet(book, deptSheet, "Departments");
          XLSX.writeFile(book, "Department_Import_Template.xlsx");
        } else {
          const desigSheet = XLSX.utils.aoa_to_sheet([
            ["Designation Name", "Department Name", "Staff Type", "Status"],
          ]);
          XLSX.utils.book_append_sheet(book, desigSheet, "Designations");
          XLSX.writeFile(book, "Designation_Import_Template.xlsx");
        }
        setToast({ message: "Excel template downloaded successfully.", type: "success" });
      } catch (clientErr) {
        console.error("Client fallback template download error:", clientErr);
        setToast({
          message: getApiErrorMessage(err, "Failed to download Excel template. Please try again."),
          type: "error",
        });
      }
    } finally {
      setDownloadingTemplate(false);
    }
  };

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

      const matchesStaffType = item.staffType
        ? isStaffTypeMatch(item.staffType, staffType)
        : (isTeaching ? !isNonTeachingDeptName(norm) : isNonTeachingDeptName(norm));

      if (!matchesStaffType) continue;

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

      const matchesStaffType = item.staffType
        ? isStaffTypeMatch(item.staffType, staffType)
        : (isTeaching ? !isNonTeachingDesigName(norm) : isNonTeachingDesigName(norm));

      if (!matchesStaffType) continue;

      if (!seen.has(norm)) {
        seen.add(norm);
        result.push(item);
      }
    }

    const q = designationQuery.trim().toLowerCase();
    if (!q) return result;
    return result.filter((item) =>
      [item.name, item.code, item.staffType, item.departmentName].some((val) =>
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
        <RefreshCw size={18} className={isRefreshing || departmentsLoading || designationsLoading ? "is-spinning" : ""} aria-hidden="true" />
        <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
      </button>
    </div>
  );

  return (
    <DashboardLayout
      title="Department & Designation"
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
                  type="button"
                  className="cms-btn secondary"
                  disabled={downloadingTemplate}
                  onClick={() => handleDownloadTemplate("department")}
                  title="Download Departments & Designations Excel Template"
                >
                  <img className="master-action-icon" src={importExcelIcon} alt="" aria-hidden="true" width={24} height={24} />
                  {downloadingTemplate ? "Downloading..." : "Download Template Excel"}
                </button>
                <button
                  type="button"
                  className="cms-btn secondary"
                  onClick={() => navigate("/dashboard/departments/import")}
                >
                  <img className="master-action-icon" src={importExcelIcon} alt="" aria-hidden="true" width={24} height={24} /> Import Excel
                </button>
                <button
                  type="button"
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
                    <DepartmentTableSkeleton />
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
                  type="button"
                  className="cms-btn secondary"
                  disabled={downloadingTemplate}
                  onClick={() => handleDownloadTemplate("designation")}
                  title="Download Departments & Designations Excel Template"
                >
                  <img className="master-action-icon" src={importExcelIcon} alt="" aria-hidden="true" width={24} height={24} />
                  {downloadingTemplate ? "Downloading..." : "Download Template Excel"}
                </button>
                <button
                  type="button"
                  className="cms-btn secondary"
                  onClick={() => navigate("/dashboard/designations/import")}
                >
                  <img className="master-action-icon" src={importExcelIcon} alt="" aria-hidden="true" width={24} height={24} /> Import Excel
                </button>
                <button
                  type="button"
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
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {designationsLoading ? (
                    <DesignationTableSkeleton />
                  ) : visibleDesignations.length > 0 ? (
                    visibleDesignations.map((item) => (
                      <tr key={item.id || item.name}>
                        <td>
                          <strong>{item.name}</strong>
                          <small>{item.staffType}</small>
                        </td>
                        <td>
                          {item.departmentName ? (
                            <span className="master-dept-badge">{item.departmentName}</span>
                          ) : (
                            <span className="master-dept-none">—</span>
                          )}
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
                      colSpan={4}
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
          departments={departments}
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
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(!department);
  const [desigLoading, setDesigLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!department) {
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
    }

    // Load designations to display linked designations
    apiClient
      .get(apiEndpoints.designations.getAll, { params: { includeInactive: true }, skipGlobalLoader: true })
      .then((res) => {
        if (!active) return;
        const allDesigs = unwrapRows(res.data).map(normalizeDesignation);
        setDesignations(allDesigs);
      })
      .catch((err) => console.warn("Failed to load designations in dept details:", err))
      .finally(() => {
        if (active) setDesigLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, department]);

  const assignedDesignations = useMemo(() => {
    if (!department) return [];
    const deptIdStr = String(department.id || department.departmentId);
    const deptNameLower = (department.name || "").trim().toLowerCase();
    return designations.filter(
      (d) =>
        String(d.departmentId) === deptIdStr ||
        (d.departmentName && d.departmentName.trim().toLowerCase() === deptNameLower)
    );
  }, [department, designations]);

  return (
    <DashboardLayout
      title="Department Details"
      subtitle="View department master information and assigned designations."
      breadcrumb={["Administration", "Department & Designation"]}
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
          <ArrowLeft /> Back to Department & Designation
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
            <>
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

              {/* ASSIGNED DESIGNATIONS SECTION */}
              <div className="master-assigned-section" style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--cms-border, #e5e7eb)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={18} /> Assigned Designations
                    <span style={{ fontSize: "12px", background: "var(--cms-primary-soft, #eff6ff)", color: "var(--cms-primary, #2563eb)", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
                      {assignedDesignations.length}
                    </span>
                  </h3>
                  <button
                    type="button"
                    className="cms-btn secondary"
                    style={{ height: 32, fontSize: "12px", padding: "0 10px" }}
                    onClick={() => navigate("/dashboard/designations/create")}
                  >
                    + Add Designation
                  </button>
                </div>

                {desigLoading ? (
                  <p className="master-details-state" style={{ padding: "12px 0" }}>Loading assigned designations...</p>
                ) : assignedDesignations.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
                    {assignedDesignations.map((desig) => (
                      <div
                        key={desig.id || desig.name}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: 8,
                          border: "1px solid var(--cms-border, #e5e7eb)",
                          background: "var(--cms-subtle, #f9fafb)",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", fontSize: "13px" }}>{desig.name}</strong>
                          <small style={{ color: "var(--cms-muted, #6b7280)", fontSize: "11px" }}>{desig.staffType}</small>
                        </div>
                        <StatusBadge value={desig.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--cms-muted, #6b7280)", fontSize: "13px", margin: "6px 0 0" }}>
                    No designations are currently mapped to this department. You can assign designations when creating or editing them.
                  </p>
                )}
              </div>
            </>
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
      breadcrumb={["Administration", "Department & Designation"]}
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
          <ArrowLeft /> Back to Department & Designation
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
                <dt>Assigned Department</dt>
                <dd>
                  {designation.departmentName ? (
                    <strong style={{ color: "var(--cms-primary, #2563eb)" }}>{designation.departmentName}</strong>
                  ) : (
                    <span style={{ color: "var(--cms-muted, #6b7280)" }}>Unassigned / General</span>
                  )}
                </dd>
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
    departmentId: "",
    description: "",
    status: "Active",
    staffType: "Teaching",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(edit);
  const [submitting, setSubmitting] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState([]);

  const fields = formDefinitions[kind];

  // Load available departments for designation form
  useEffect(() => {
    if (kind === "designation") {
      apiClient
        .get(apiEndpoints.departments.getAll, { skipGlobalLoader: true })
        .then((res) => {
          setAvailableDepartments(unwrapRows(res.data).map(normalizeDepartment).filter((d) => d.name));
        })
        .catch((err) => console.warn("Failed to load departments in master form:", err));
    }
  }, [kind]);

  const currentStaffType = values.staffType || "Teaching";
  const filteredDeptOptions = useMemo(() => {
    return (availableDepartments || []).filter((d) => {
      if (!d.isActive && d.status !== "Active") return false;
      return isStaffTypeMatch(d.staffType, currentStaffType);
    });
  }, [availableDepartments, currentStaffType]);

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
            departmentId: match.departmentId || "",
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
          departmentId: values.departmentId ? Number(values.departmentId) : null,
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
      breadcrumb={["Administration", "Department & Designation"]}
    >
      <main className="master-form-page">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department & Designation
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
                    {type === "department-select" ? (
                      <CustomDepartmentDropdown
                        value={values[name] ?? ""}
                        options={filteredDeptOptions}
                        placeholder={placeholder || "Select Department"}
                        onChange={(val) => setValues((v) => ({ ...v, [name]: val }))}
                      />
                    ) : type === "select" ? (
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
    "Staff Type",
    "Status",
  ],
  designation: [
    "Designation Name",
    "Department Name",
    "Staff Type",
    "Status",
  ],
};

export function MasterImportPage({ kind = "department" }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [rawFile, setRawFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [sheetCounts, setSheetCounts] = useState({ departments: 0, designations: 0 });

  const download = async () => {
    try {
      const endpoint =
        apiEndpoints.departments.exportTemplate ||
        apiEndpoints.departments.template ||
        "/api/v1/departments/export-template";

      const res = await apiClient.get(endpoint, {
        responseType: "blob",
        skipGlobalLoader: true,
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Department_Designation_Import_Template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    } catch (error) {
      console.warn("Backend template download failed, using client fallback:", error);
      // Fallback to client-side XLSX generation
      const book = XLSX.utils.book_new();
      const deptSheet = XLSX.utils.aoa_to_sheet([
        ["Department Name", "Staff Type", "Status"],
      ]);
      const desigSheet = XLSX.utils.aoa_to_sheet([
        ["Designation Name", "Department Name", "Staff Type", "Status"],
      ]);
      XLSX.utils.book_append_sheet(book, deptSheet, "Departments");
      XLSX.utils.book_append_sheet(book, desigSheet, "Designations");
      XLSX.writeFile(book, "Department_Designation_Import_Template.xlsx");
    }
  };

  const parse = async (file) => {
    if (!file) return;
    setRawFile(file);
    setParsing(true);
    setFileName(file.name);
    setImportError("");
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const book = XLSX.read(data);
      const parsedRows = [];
      let deptCount = 0;
      let desigCount = 0;

      const deptSheetName = book.SheetNames.find((s) => /^dept(artment)?s?$/i.test(s.trim()));
      const desigSheetName = book.SheetNames.find((s) => /^desig(nation)?s?$/i.test(s.trim()));

      const deptNames = new Set();
      const desigNames = new Set();

      // 1. Process Departments sheet if present or default
      if (deptSheetName || (!desigSheetName && kind === "department")) {
        const targetSheet = book.Sheets[deptSheetName || book.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(targetSheet, { defval: "" });
        json.forEach((row, idx) => {
          const rawName = String(row["Department Name"] || row["DepartmentName"] || row["Name"] || "").trim();
          if (!rawName && Object.values(row).every((v) => !String(v).trim())) return;

          deptCount++;
          const problems = [];
          if (!rawName) problems.push("Missing Department Name");

          const normName = rawName.toLowerCase();
          if (normName && deptNames.has(normName)) {
            problems.push("Duplicate Department Name in file");
          }
          if (normName) deptNames.add(normName);

          const status = String(row["Status"] || "").trim();
          if (status && !["Active", "Inactive", "active", "inactive"].includes(status)) {
            problems.push("Invalid Status (must be Active or Inactive)");
          }

          const staffTypeVal = String(row["Staff Type"] || row["StaffType"] || "").trim();
          if (staffTypeVal && !["Teaching", "Non-Teaching", "NonTeaching", "Both", "All"].includes(staffTypeVal)) {
            problems.push("Invalid Staff Type");
          }

          parsedRows.push({
            sheet: "Departments",
            index: idx + 2,
            entity: "Department",
            name: rawName || "—",
            details: `Type: ${staffTypeVal || "Teaching"} | Status: ${status || "Active"}`,
            row,
            problems,
          });
        });
      }

      // 2. Process Designations sheet if present
      if (desigSheetName || (!deptSheetName && kind === "designation")) {
        const targetSheet = book.Sheets[desigSheetName || book.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(targetSheet, { defval: "" });
        json.forEach((row, idx) => {
          const rawName = String(row["Designation Name"] || row["DesignationName"] || row["Name"] || "").trim();
          if (!rawName && Object.values(row).every((v) => !String(v).trim())) return;

          desigCount++;
          const problems = [];
          if (!rawName) problems.push("Missing Designation Name");

          const desigKey = rawName.toLowerCase();
          if (rawName && desigNames.has(desigKey)) {
            problems.push("Duplicate Designation in file");
          }
          if (rawName) desigNames.add(desigKey);

          const deptNameVal = String(
            row["Department Name"] ||
            row["DepartmentName"] ||
            row["Department"] ||
            row["Department Code"] ||
            row["DepartmentCode"] ||
            ""
          ).trim();

          const status = String(row["Status"] || "").trim();
          if (status && !["Active", "Inactive", "active", "inactive"].includes(status)) {
            problems.push("Invalid Status (must be Active or Inactive)");
          }

          const staffTypeVal = String(row["Staff Type"] || row["StaffType"] || "").trim();
          if (staffTypeVal && !["Teaching", "Non-Teaching", "NonTeaching", "Both"].includes(staffTypeVal)) {
            problems.push("Invalid Staff Type");
          }

          parsedRows.push({
            sheet: "Designations",
            index: idx + 2,
            entity: "Designation",
            name: rawName || "—",
            details: `Dept: ${deptNameVal || "General"} | Type: ${staffTypeVal || "Teaching"} | Status: ${status || "Active"}`,
            row,
            problems,
          });
        });
      }

      // If no recognized sheets found, parse sheet 0 as fallback
      if (parsedRows.length === 0 && book.SheetNames.length > 0) {
        const targetSheet = book.Sheets[book.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(targetSheet, { defval: "" });
        const nameKey = kind === "department" ? "Department Name" : "Designation Name";
        json.forEach((row, idx) => {
          const rawName = String(row[nameKey] || row["Name"] || "").trim();
          if (!rawName && Object.values(row).every((v) => !String(v).trim())) return;
          const problems = [];
          if (!rawName) problems.push(`Missing ${nameKey}`);

          parsedRows.push({
            sheet: book.SheetNames[0],
            index: idx + 2,
            entity: kind === "department" ? "Department" : "Designation",
            name: rawName || "—",
            details: Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(" | "),
            row,
            problems,
          });
        });
      }

      setSheetCounts({ departments: deptCount, designations: desigCount });
      setRows(parsedRows);
    } catch (err) {
      console.error("Excel parse error:", err);
      setImportError("Unable to parse the uploaded Excel file. Please ensure it is a valid .xlsx or .xls file.");
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!rawFile) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("DefaultStaffType", "Teaching");

      const endpoint =
        apiEndpoints.departments.importExcel ||
        "/api/v1/departments/import-excel";

      const response = await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data?.data || response.data?.Data || response.data;
      setImportResult(result);
    } catch (err) {
      setImportError(getApiErrorMessage(err, "Failed to import Excel data. Please review the file and try again."));
    } finally {
      setImporting(false);
    }
  };

  const valid = rows.filter((row) => !row.problems.length).length;
  const duplicates = rows.filter((row) =>
    row.problems.some((problem) => problem.toLowerCase().includes("duplicate"))
  ).length;

  return (
    <DashboardLayout
      title="Import Departments & Designations"
      subtitle="Validate and bulk import departments and designations from Excel spreadsheet."
      breadcrumb={["Administration", "Department & Designation"]}
    >
      <main className="master-import">
        <button className="master-back" onClick={() => navigate("/dashboard/departments")}>
          <ArrowLeft /> Back to Department & Designation
        </button>
        <section>
          <header>
            <div>
              <h1>Import Departments & Designations</h1>
              <p>Upload unified or sheet-specific Excel workbook (.xlsx / .xls) to review and import in bulk.</p>
            </div>
            <button type="button" className="cms-btn secondary" onClick={download}>
              <Download /> Download Template Excel
            </button>
          </header>

          {importError && (
            <div className="master-form-error-alert" style={{ marginBottom: 16, color: "#dc2626" }}>
              <Info /> <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div
              className="master-form-success-alert"
              style={{
                marginBottom: 16,
                padding: "12px 16px",
                borderRadius: "10px",
                background: importResult.success ? "#ecfdf5" : "#fffbeb",
                border: `1px solid ${importResult.success ? "#a7f3d0" : "#fde68a"}`,
                color: importResult.success ? "#065f46" : "#92400e",
              }}
            >
              <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700" }}>
                {importResult.success ? "✓ Bulk Import Completed" : "⚠ Bulk Import Completed with Warnings"}
              </h3>
              <p style={{ margin: "0 0 6px", fontSize: "12px" }}>
                {importResult.message || `Processed ${importResult.totalRowsRead || rows.length} rows.`}
              </p>
              <div style={{ display: "flex", gap: "12px", fontSize: "11px", fontWeight: "600" }}>
                <span>Total Imported: {importResult.successCount ?? 0}</span>
                <span>Departments: {importResult.departmentsImported ?? sheetCounts.departments}</span>
                <span>Designations: {importResult.designationsImported ?? sheetCounts.designations}</span>
                {importResult.duplicateCount ? <span>Duplicates: {importResult.duplicateCount}</span> : null}
                {importResult.failureCount ? <span>Failures: {importResult.failureCount}</span> : null}
              </div>
              <div style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className="cms-btn primary"
                  style={{ height: "30px", fontSize: "11px" }}
                  onClick={() => navigate("/dashboard/departments")}
                >
                  Go to Department & Designation
                </button>
              </div>
            </div>
          )}

          <label className="master-drop">
            <Upload />
            <strong>
              {parsing ? "Parsing spreadsheet..." : fileName || "Choose Excel File (.xlsx, .xls)"}
            </strong>
            <span>Accepted formats: .xlsx, .xls (Supports multi-sheet Departments & Designations workbooks)</span>
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
                {sheetCounts.departments > 0 && (
                  <article>
                    Departments<strong>{sheetCounts.departments}</strong>
                  </article>
                )}
                {sheetCounts.designations > 0 && (
                  <article>
                    Designations<strong>{sheetCounts.designations}</strong>
                  </article>
                )}
              </div>
              <div className="master-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Sheet / Type</th>
                      <th>Row</th>
                      <th>Name</th>
                      <th>Details</th>
                      <th>Validation Status</th>
                      <th>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item, idx) => (
                      <tr key={`${item.sheet}-${item.index}-${idx}`}>
                        <td>
                          <strong>{item.sheet}</strong>
                          <small>{item.entity}</small>
                        </td>
                        <td>{item.index}</td>
                        <td>
                          <strong>{item.name}</strong>
                        </td>
                        <td>{item.details || "—"}</td>
                        <td>
                          <StatusBadge value={item.problems.length ? "Invalid" : "Valid"} />
                        </td>
                        <td style={{ color: item.problems.length ? "#dc2626" : "inherit" }}>
                          {item.problems.join(", ") || "✓ Ready for import"}
                        </td>
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
                  {importing ? "Importing Data..." : `Import ${rows.length} Records`}
                </button>
              </footer>
            </>
          ) : null}
        </section>
      </main>
    </DashboardLayout>
  );
}

