import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import {
  FiPlus,
  FiDownload,
  FiEye,
  FiPrinter,
  FiTrash2,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiAward,
  FiRefreshCw,
  FiPlusCircle,
  FiCalendar,
} from "react-icons/fi";
import {
  getStaffPaged,
  getNextEmployeeId,
  createStaff,
  updateStaff,
  deleteStaff,
  getDepartments,
  createDepartment,
  getDesignations,
  createDesignation,
} from "../../api/staffApi";
import "./StaffList.css";

// Fixed Intermediate College Master Departments
const TEACHING_DEPARTMENTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Botany",
  "Zoology",
  "Biology",
  "Statistics",
  "English",
  "Telugu",
  "Hindi",
  "Sanskrit",
  "Commerce",
  "Accountancy",
  "Economics",
  "Business Studies",
  "Civics",
  "History",
  "Political Science",
  "Computer Science",
  "Computer Applications",
  "Physical Education",
  "Environmental Studies",
];

const NON_TEACHING_DEPARTMENTS = [
  "Administration",
  "Accounts & Finance",
  "Admissions",
  "Examinations",
  "Library",
  "Transport",
  "Hostel",
  "Security",
  "Maintenance",
  "Student Support Services",
  "Campus Operations",
];

// Fixed Intermediate College Master Designations
const TEACHING_DESIGNATIONS = [
  "Junior Lecturer",
  "Lecturer",
  "Senior Lecturer",
  "Subject Teacher",
  "Head of Department (HOD)",
  "Academic Coordinator",
  "Examination Coordinator",
  "Vice Principal",
  "Principal",
];

const NON_TEACHING_DESIGNATIONS = [
  "Principal",
  "Administrative Officer",
  "Accountant",
  "Librarian",
  "Lab Assistant",
  "Office Assistant",
  "Clerk",
  "Receptionist",
  "other",
];

const StaffList = () => {
  // Active Tab: "Teaching" or "Non-Teaching"
  const [activeTab, setActiveTab] = useState("Teaching");

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedStatus, setSelectedStatus] = useState("All Status");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Data & Loading states
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Lookups from API
  const [dbDepartments, setDbDepartments] = useState([]);
  const [dbDesignations, setDbDesignations] = useState([]);

  // Wizard / Modal states
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Staff Details, 2 = Employment & Documents Review
  const [isEditing, setIsEditing] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [saving, setSaving] = useState(false);

  // View Details Modal
  const [viewingStaff, setViewingStaff] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Delete Confirmation Modal
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Printing state
  const [printingStaff, setPrintingStaff] = useState(null);

  // Custom "Other" entry states in wizard
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [customDeptName, setCustomDeptName] = useState("");
  const [isCustomDesig, setIsCustomDesig] = useState(false);
  const [customDesigName, setCustomDesigName] = useState("");

  // Form data for Add / Edit
  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    gender: "Male",
    dateOfBirth: "",
    aadhaar: "",
    mobile: "",
    email: "",
    bloodGroup: "",
    qualification: "",
    designation: "",
    department: "",
    joiningDate: new Date().toISOString().split("T")[0],
    experience: "",
    status: "Active",
    staffType: "Teaching",
  });

  const [formErrors, setFormErrors] = useState({});

  // Show Toast Helper
  const showNotification = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  // Fetch departments & designations for lookups
  const fetchLookups = async (staffType) => {
    try {
      const [deptRes, desigRes] = await Promise.all([
        getDepartments(staffType),
        getDesignations(staffType),
      ]);
      setDbDepartments(deptRes.data || []);
      setDbDesignations(desigRes.data || []);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    }
  };

  // Fetch Staff List
  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const params = {
        pageNumber: currentPage,
        pageSize: pageSize,
        staffType: activeTab,
        searchTerm: searchTerm.trim() || undefined,
        department: selectedDepartment !== "All Departments" ? selectedDepartment : undefined,
        status: selectedStatus !== "All Status" ? selectedStatus : undefined,
      };

      const res = await getStaffPaged(params);
      if (res.data) {
        setStaffList(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
      showNotification("Failed to load staff records.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when tab, filters, or page changes
  useEffect(() => {
    fetchStaffData();
    fetchLookups(activeTab);
  }, [activeTab, currentPage, selectedDepartment, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchStaffData();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Merged Department Options (Fixed + DB)
  const departmentOptions = useMemo(() => {
    const baseList = activeTab === "Teaching" ? TEACHING_DEPARTMENTS : NON_TEACHING_DEPARTMENTS;
    const dbNames = dbDepartments.map((d) => d.departmentName);
    return Array.from(new Set([...baseList, ...dbNames])).sort();
  }, [activeTab, dbDepartments]);

  // Merged Designation Options (Fixed + DB)
  const designationOptions = useMemo(() => {
    const baseList = activeTab === "Teaching" ? TEACHING_DESIGNATIONS : NON_TEACHING_DESIGNATIONS;
    const dbNames = dbDesignations.map((d) => d.name);
    return Array.from(new Set([...baseList, ...dbNames])).sort();
  }, [activeTab, dbDesignations]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    setSelectedDepartment("All Departments");
    setSelectedStatus("All Status");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Fetch Auto Employee ID
  const fetchNextId = async (staffType) => {
    try {
      const res = await getNextEmployeeId(staffType);
      if (res.data?.nextEmployeeId) {
        return res.data.nextEmployeeId;
      }
    } catch (err) {
      console.error("Failed to generate employee ID:", err);
    }
    return staffType === "Non-Teaching" ? "PJCNTCH0001" : "PJCTCH0001";
  };

  // Open Add Wizard
  const handleOpenAddWizard = async () => {
    setIsEditing(false);
    setEditingStaffId(null);
    setWizardStep(1);
    setIsCustomDept(false);
    setCustomDeptName("");
    setIsCustomDesig(false);
    setCustomDesigName("");
    setFormErrors({});

    const autoId = await fetchNextId(activeTab);

    setFormData({
      employeeId: autoId,
      firstName: "",
      lastName: "",
      gender: "Male",
      dateOfBirth: "",
      aadhaar: "",
      mobile: "",
      email: "",
      bloodGroup: "",
      qualification: "",
      designation: designationOptions[0] || "",
      department: departmentOptions[0] || "",
      joiningDate: new Date().toISOString().split("T")[0],
      experience: "",
      status: "Active",
      staffType: activeTab,
    });

    setShowWizard(true);
  };

  // Open Edit Wizard
  const handleOpenEdit = (staff) => {
    setIsEditing(true);
    setEditingStaffId(staff.id || staff.staffId);
    setWizardStep(1);
    setIsCustomDept(false);
    setCustomDeptName("");
    setIsCustomDesig(false);
    setCustomDesigName("");
    setFormErrors({});

    setFormData({
      employeeId: staff.employeeId || "",
      firstName: staff.firstName || "",
      lastName: staff.lastName || "",
      gender: staff.gender || "Male",
      dateOfBirth: staff.dateOfBirth ? staff.dateOfBirth.split("T")[0] : "",
      aadhaar: staff.aadhaar || "",
      mobile: staff.mobile || "",
      email: staff.email || "",
      bloodGroup: staff.bloodGroup || "",
      qualification: staff.qualification || "",
      designation: staff.designation || "",
      department: staff.department || "",
      joiningDate: staff.joiningDate ? staff.joiningDate.split("T")[0] : new Date().toISOString().split("T")[0],
      experience: staff.experience ? staff.experience.toString() : "",
      status: staff.status || "Active",
      staffType: staff.staffType || activeTab,
    });

    setShowWizard(true);
  };

  // Validate Step 1
  const validateStep1 = () => {
    const errors = {};
    if (!formData.firstName?.trim()) errors.firstName = "First name is required.";
    if (!formData.lastName?.trim()) errors.lastName = "Last name is required.";
    if (!formData.gender) errors.gender = "Gender is required.";
    if (!formData.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
    if (!formData.mobile?.trim()) {
      errors.mobile = "Mobile number is required.";
    } else if (!/^[0-9+ ]{10,15}$/.test(formData.mobile.trim())) {
      errors.mobile = "Please enter a valid 10-15 digit mobile number.";
    }
    if (!formData.email?.trim()) {
      errors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    if (!formData.qualification?.trim()) errors.qualification = "Qualification is required.";
    if (isCustomDept && !customDeptName.trim()) {
      errors.department = "Please specify the custom department name.";
    }
    if (isCustomDesig && !customDesigName.trim()) {
      errors.designation = "Please specify the custom designation name.";
    }
    if (!formData.joiningDate) errors.joiningDate = "Joining date is required.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Advance to Step 2
  const handleNextStep = () => {
    if (validateStep1()) {
      setWizardStep(2);
    }
  };

  // Save Staff (Step 2 Submission)
  const handleSaveStaff = async () => {
    setSaving(true);
    try {
      const finalDept = isCustomDept ? customDeptName.trim() : formData.department;
      const finalDesig = isCustomDesig ? customDesigName.trim() : formData.designation;

      const payload = {
        employeeId: formData.employeeId,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        aadhaar: formData.aadhaar?.trim() || null,
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        bloodGroup: formData.bloodGroup?.trim() || null,
        qualification: formData.qualification.trim(),
        designation: finalDesig,
        department: finalDept,
        joiningDate: formData.joiningDate,
        experience: parseFloat(formData.experience) || 0.0,
        status: formData.status,
        staffType: formData.staffType || activeTab,
      };

      if (isEditing) {
        await updateStaff(editingStaffId, payload);
        showNotification(`${activeTab} staff member updated successfully!`);
      } else {
        await createStaff(payload);
        showNotification(`${activeTab} staff member created successfully!`);
      }

      setShowWizard(false);
      fetchStaffData();
      fetchLookups(activeTab);
    } catch (err) {
      console.error("Error saving staff:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.title || "Failed to save staff profile.";
      showNotification(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  // View Details
  const handleView = (staff) => {
    setViewingStaff(staff);
    setShowViewModal(true);
  };

  // Print Profile Slip
  const handlePrint = (staff) => {
    setPrintingStaff(staff);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Delete Action Trigger
  const handleDeleteClick = (staff) => {
    setDeletingStaff(staff);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setDeleting(true);
    try {
      const id = deletingStaff.id || deletingStaff.staffId;
      await deleteStaff(id);
      showNotification(`Staff record deleted successfully.`);
      setShowDeleteModal(false);
      setDeletingStaff(null);
      fetchStaffData();
    } catch (err) {
      console.error("Error deleting staff:", err);
      const msg = err.response?.data?.message || "Failed to delete staff record.";
      showNotification(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  // Export all staff details into single CSV sheet
  const handleExportSheet = () => {
    if (!staffList || staffList.length === 0) {
      showNotification("No staff records available to export.", "error");
      return;
    }

    const headers = [
      "Employee ID",
      "First Name",
      "Last Name",
      "Staff Category",
      "Department",
      "Designation",
      "Gender",
      "Date of Birth",
      "Aadhaar Number",
      "Mobile",
      "Email",
      "Blood Group",
      "Qualification",
      "Joining Date",
      "Experience (Yrs)",
      "Status",
    ];

    const csvRows = [
      headers.join(","),
      ...staffList.map((s) =>
        [
          `"${s.employeeId || ""}"`,
          `"${s.firstName || ""}"`,
          `"${s.lastName || ""}"`,
          `"${s.staffType || activeTab}"`,
          `"${s.department || ""}"`,
          `"${s.designation || ""}"`,
          `"${s.gender || ""}"`,
          `"${s.dateOfBirth ? s.dateOfBirth.split("T")[0] : ""}"`,
          `"${s.aadhaar || ""}"`,
          `"${s.mobile || ""}"`,
          `"${s.email || ""}"`,
          `"${s.bloodGroup || ""}"`,
          `"${s.qualification || ""}"`,
          `"${s.joiningDate ? s.joiningDate.split("T")[0] : ""}"`,
          `"${s.experience || 0}"`,
          `"${s.status || "Active"}"`,
        ].join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Staff_Details_${activeTab}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification(`Exported ${staffList.length} staff records to sheet.`);
  };

  // Pagination calculation
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="staff-page">
      {/* Toast Notification */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: toast.type === "error" ? "#fef2f2" : "#ecfdf5",
            color: toast.type === "error" ? "#991b1b" : "#065f46",
            border: `1px solid ${toast.type === "error" ? "#fecaca" : "#a7f3d0"}`,
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            fontWeight: "600",
            fontSize: "14px",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          {toast.type === "error" ? <FiAlertCircle size={18} /> : <FiCheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Printable Sheet (hidden on screen, visible during window.print()) */}
      {printingStaff && (
        <div className="staff-printable-sheet">
          <div className="print-header">
            <h1>PIRNAV JUNIOR COLLEGE</h1>
            <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
              STAFF EMPLOYMENT RECORD & IDENTITY PROFILE
            </p>
            <p style={{ margin: "0", color: "#888", fontSize: "12px" }}>
              Generated on: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="print-grid">
            <div className="print-box">
              <h3>Personal Information</h3>
              <div className="print-row">
                <span className="print-label">Full Name:</span>
                <span>{`${printingStaff.firstName || ""} ${printingStaff.lastName || ""}`.trim()}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Gender:</span>
                <span>{printingStaff.gender || "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Date of Birth:</span>
                <span>{printingStaff.dateOfBirth ? printingStaff.dateOfBirth.split("T")[0] : "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Blood Group:</span>
                <span>{printingStaff.bloodGroup || "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Aadhaar Number:</span>
                <span>{printingStaff.aadhaar || "—"}</span>
              </div>
            </div>

            <div className="print-box">
              <h3>Employment Details</h3>
              <div className="print-row">
                <span className="print-label">Employee ID:</span>
                <span style={{ fontWeight: "bold" }}>{printingStaff.employeeId}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Staff Category:</span>
                <span>{printingStaff.staffType || activeTab} Staff</span>
              </div>
              <div className="print-row">
                <span className="print-label">Department:</span>
                <span>{printingStaff.department || "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Designation:</span>
                <span>{printingStaff.designation || "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Qualification:</span>
                <span>{printingStaff.qualification || "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Joining Date:</span>
                <span>{printingStaff.joiningDate ? printingStaff.joiningDate.split("T")[0] : "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Experience:</span>
                <span>{printingStaff.experience ? `${printingStaff.experience} Years` : "—"}</span>
              </div>
              <div className="print-row">
                <span className="print-label">Status:</span>
                <span>{printingStaff.status || "Active"}</span>
              </div>
            </div>
          </div>

          <div className="print-box" style={{ marginBottom: "30px" }}>
            <h3>Contact Information</h3>
            <div className="print-row">
              <span className="print-label">Mobile Number:</span>
              <span>{printingStaff.mobile || "—"}</span>
            </div>
            <div className="print-row">
              <span className="print-label">Email Address:</span>
              <span>{printingStaff.email || "—"}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "60px", padding: "0 20px" }}>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", width: "200px", paddingTop: "6px" }}>
              Staff Signature
            </div>
            <div style={{ textAlign: "center", borderTop: "1px solid #333", width: "200px", paddingTop: "6px" }}>
              Principal / Authorized Signatory
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="staff-breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">&gt;</span>
        <span>People</span>
        <span className="sep">&gt;</span>
        <span className="current">Staff Management</span>
      </div>

      {/* Header */}
      <div className="staff-header">
        <h1 className="staff-title">Staff Management</h1>
        <p className="staff-subtitle">Manage teaching and non-teaching staff profiles.</p>
      </div>

      {/* Tabs: Teaching Staff vs Non-Teaching Staff */}
      <div className="staff-tabs-container">
        <button
          className={`staff-tab-btn ${activeTab === "Teaching" ? "active" : ""}`}
          onClick={() => handleTabChange("Teaching")}
        >
          Teaching Staff
        </button>
        <button
          className={`staff-tab-btn ${activeTab === "Non-Teaching" ? "active" : ""}`}
          onClick={() => handleTabChange("Non-Teaching")}
        >
          Non-Teaching Staff
        </button>
      </div>

      {/* Main Table Card */}
      <div className="staff-card">
        {/* Toolbar */}
        <div className="staff-toolbar">
          {/* Search */}
          <div className="staff-search-box">
            <Search3DIcon className="staff-search-icon" size={16} />
            <input
              type="text"
              className="staff-search-input"
              placeholder={`Search ${activeTab} Staff...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters & Actions */}
          <div className="staff-filter-group">
            {/* Department Filter */}
            <select
              className="staff-select"
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All Departments">All Departments</option>
              {departmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="staff-select"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "130px" }}
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            {/* Export Sheet Button */}
            <button className="staff-btn staff-btn-outline" onClick={handleExportSheet} title="Export all staff details in one sheet">
              <FiDownload size={15} />
              <span>Export</span>
            </button>

            {/* Add Staff Button */}
            <button className="staff-btn staff-btn-primary" onClick={handleOpenAddWizard}>
              <FiPlus size={16} />
              <span>+ Add {activeTab} Staff</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="staff-table-wrapper">
          {loading ? (
            <div className="staff-loading-state">
              <div style={{ display: "inline-block", animation: "spin 1s linear infinite", marginBottom: "12px" }}>
                <FiRefreshCw size={32} />
              </div>
              <p>Loading {activeTab} staff records...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="staff-empty-state">
              <FiUser className="staff-empty-icon" />
              <h3>No {activeTab} Staff Found</h3>
              <p>No staff profiles match your current search or filter criteria.</p>
              <button
                className="staff-btn staff-btn-primary"
                onClick={handleOpenAddWizard}
                style={{ marginTop: "14px" }}
              >
                <FiPlus size={16} /> Add First {activeTab} Staff
              </button>
            </div>
          ) : (
            <table className="staff-table">
              <thead>
                <tr>
                  <th>EMPLOYEE ID</th>
                  <th>{activeTab === "Teaching" ? "FACULTY NAME" : "STAFF NAME"}</th>
                  <th>DEPARTMENT</th>
                  <th>DESIGNATION</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right", paddingRight: "24px" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => {
                  const fullName = `${staff.firstName || ""} ${staff.lastName || ""}`.trim();
                  const initials = `${(staff.firstName?.[0] || "").toUpperCase()}${(staff.lastName?.[0] || "").toUpperCase()}` || "ST";
                  const isActive = (staff.status || "Active").toLowerCase() === "active";

                  return (
                    <tr key={staff.id || staff.staffId}>
                      {/* Employee ID */}
                      <td>
                        <span className="staff-id-badge">{staff.employeeId}</span>
                      </td>

                      {/* Staff Name with Avatar */}
                      <td>
                        <div className="staff-name-cell">
                          <div className="staff-avatar">{initials}</div>
                          <div>
                            <div>{fullName}</div>
                            <div style={{ fontSize: "12px", color: "var(--staff-text-muted)", fontWeight: "normal" }}>
                              {staff.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td>{staff.department || "—"}</td>

                      {/* Designation */}
                      <td>{staff.designation || "—"}</td>

                      {/* Status */}
                      <td>
                        <span className={`staff-status-badge ${isActive ? "staff-status-active" : "staff-status-inactive"}`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Action Buttons: View, Print, Delete */}
                      <td style={{ textAlign: "right", paddingRight: "24px" }}>
                        <div className="staff-action-btns" style={{ justifyContent: "flex-end" }}>
                          {/* View Button */}
                          <button
                            className="staff-icon-action view-btn"
                            title="View Full Staff Profile"
                            onClick={() => handleView(staff)}
                          >
                            <FiEye />
                          </button>

                          {/* Print Button */}
                          <button
                            className="staff-icon-action print-btn"
                            title="Print Staff Profile Sheet"
                            onClick={() => handlePrint(staff)}
                          >
                            <FiPrinter />
                          </button>

                          {/* Delete Button */}
                          <button
                            className="staff-icon-action delete-btn"
                            title="Delete Staff Member"
                            onClick={() => handleDeleteClick(staff)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="staff-pagination">
          <div>
            Showing {startRecord}-{endRecord} of {totalCount} records
          </div>
          <div className="staff-pagination-pages">
            <button
              className="staff-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - 4 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`staff-page-btn ${currentPage === pageNum ? "active" : ""}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              className="staff-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2-STEP ADD / EDIT WIZARD MODAL
          ========================================================================= */}
      {showWizard && (
        <div className="staff-modal-backdrop" onClick={() => setShowWizard(false)}>
          <div className="staff-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Wizard Header */}
            <div className="staff-wizard-header">
              <div className="staff-wizard-title-wrap">
                <div className="staff-wizard-avatar-icon">
                  <FiUser />
                </div>
                <div>
                  <h2>{isEditing ? `Edit ${activeTab} Staff` : `${activeTab} Staff Details`}</h2>
                  <p>
                    {wizardStep === 1
                      ? `Enter the ${activeTab.toLowerCase()} staff profile details below.`
                      : `Review employment information before saving the staff profile.`}
                  </p>
                </div>
              </div>
              <button
                className="staff-icon-action"
                style={{ border: "none" }}
                onClick={() => setShowWizard(false)}
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Stepper Bar */}
            <div className="staff-stepper-bar">
              <div
                className={`staff-stepper-pill ${wizardStep === 1 ? "active" : ""}`}
                onClick={() => setWizardStep(1)}
                style={{ cursor: "pointer" }}
              >
                <div className="step-circle">1</div>
                <span>Staff Details</span>
              </div>
              <div
                className={`staff-stepper-pill ${wizardStep === 2 ? "active" : ""}`}
                onClick={handleNextStep}
                style={{ cursor: "pointer" }}
              >
                <div className="step-circle">2</div>
                <span>Employment & Documents</span>
              </div>
            </div>

            {/* Wizard Body */}
            <div className="staff-wizard-body">
              {wizardStep === 1 ? (
                /* STEP 1: FORM FIELDS */
                <div className="staff-form-grid">
                  {/* Employee ID */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Employee ID <span className="req">*</span>
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        className="staff-form-input readonly"
                        value={formData.employeeId}
                        readOnly
                        placeholder="Auto Generated"
                      />
                      {!isEditing && (
                        <button
                          type="button"
                          className="staff-btn staff-btn-outline"
                          title="Regenerate Next ID"
                          style={{ padding: "0 10px" }}
                          onClick={async () => {
                            const newId = await fetchNextId(activeTab);
                            setFormData((prev) => ({ ...prev, employeeId: newId }));
                          }}
                        >
                          <FiRefreshCw size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* First Name */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      First Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="staff-form-input"
                      placeholder="e.g. Ramesh"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                    {formErrors.firstName && <span className="staff-form-error">{formErrors.firstName}</span>}
                  </div>

                  {/* Last Name */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Last Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="staff-form-input"
                      placeholder="e.g. Kumar"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                    {formErrors.lastName && <span className="staff-form-error">{formErrors.lastName}</span>}
                  </div>

                  {/* Gender */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Gender <span className="req">*</span>
                    </label>
                    <select
                      className="staff-form-select"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Date of Birth <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      className="staff-form-input"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                    {formErrors.dateOfBirth && <span className="staff-form-error">{formErrors.dateOfBirth}</span>}
                  </div>

                  {/* Aadhaar Number */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">Aadhaar Number</label>
                    <input
                      type="text"
                      className="staff-form-input"
                      placeholder="12 digit Aadhaar"
                      maxLength={12}
                      value={formData.aadhaar}
                      onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>

                  {/* Mobile */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Mobile <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="staff-form-input"
                      placeholder="e.g. 9876543210"
                      maxLength={15}
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    />
                    {formErrors.mobile && <span className="staff-form-error">{formErrors.mobile}</span>}
                  </div>

                  {/* Email */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Email <span className="req">*</span>
                    </label>
                    <input
                      type="email"
                      className="staff-form-input"
                      placeholder="e.g. staff@college.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {formErrors.email && <span className="staff-form-error">{formErrors.email}</span>}
                  </div>

                  {/* Blood Group */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">Blood Group</label>
                    <select
                      className="staff-form-select"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  {/* Qualification */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Qualification <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="staff-form-input"
                      placeholder="e.g. M.Sc, B.Ed, M.Tech"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    />
                    {formErrors.qualification && <span className="staff-form-error">{formErrors.qualification}</span>}
                  </div>

                  {/* Department (Fixed Master with "+ Add Other") */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Department <span className="req">*</span>
                    </label>
                    {!isCustomDept ? (
                      <select
                        className="staff-form-select"
                        value={formData.department}
                        onChange={(e) => {
                          if (e.target.value === "__ADD_NEW__") {
                            setIsCustomDept(true);
                            setCustomDeptName("");
                          } else {
                            setFormData({ ...formData, department: e.target.value });
                          }
                        }}
                      >
                        {departmentOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                        <option value="__ADD_NEW__" style={{ fontWeight: "bold", color: "#5c7c1b" }}>
                          + Add Other Department
                        </option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          className="staff-form-input"
                          placeholder="Enter new department"
                          value={customDeptName}
                          onChange={(e) => setCustomDeptName(e.target.value)}
                        />
                        <button
                          type="button"
                          className="staff-btn staff-btn-ghost"
                          onClick={() => setIsCustomDept(false)}
                          title="Back to list"
                        >
                          <FiX />
                        </button>
                      </div>
                    )}
                    {formErrors.department && <span className="staff-form-error">{formErrors.department}</span>}
                  </div>

                  {/* Designation (Fixed Master with "+ Add Other") */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Designation <span className="req">*</span>
                    </label>
                    {!isCustomDesig ? (
                      <select
                        className="staff-form-select"
                        value={formData.designation}
                        onChange={(e) => {
                          if (e.target.value === "__ADD_NEW__") {
                            setIsCustomDesig(true);
                            setCustomDesigName("");
                          } else {
                            setFormData({ ...formData, designation: e.target.value });
                          }
                        }}
                      >
                        {designationOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                        <option value="__ADD_NEW__" style={{ fontWeight: "bold", color: "#5c7c1b" }}>
                          + Add Other Designation
                        </option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input
                          type="text"
                          className="staff-form-input"
                          placeholder="Enter new designation"
                          value={customDesigName}
                          onChange={(e) => setCustomDesigName(e.target.value)}
                        />
                        <button
                          type="button"
                          className="staff-btn staff-btn-ghost"
                          onClick={() => setIsCustomDesig(false)}
                          title="Back to list"
                        >
                          <FiX />
                        </button>
                      </div>
                    )}
                    {formErrors.designation && <span className="staff-form-error">{formErrors.designation}</span>}
                  </div>

                  {/* Joining Date */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Joining Date <span className="req">*</span>
                    </label>
                    <input
                      type="date"
                      className="staff-form-input"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    />
                    {formErrors.joiningDate && <span className="staff-form-error">{formErrors.joiningDate}</span>}
                  </div>

                  {/* Experience */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">Experience (Years)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="staff-form-input"
                      placeholder="e.g. 5"
                      value={formData.experience}
                      onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    />
                  </div>

                  {/* Status */}
                  <div className="staff-form-field">
                    <label className="staff-form-label">
                      Status <span className="req">*</span>
                    </label>
                    <select
                      className="staff-form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* STEP 2: REVIEW CARD (Matching image 4) */
                <div>
                  {/* Section 1: Personal Info */}
                  <div className="staff-review-section">
                    <div className="staff-review-title">
                      <FiUser size={16} color="var(--staff-primary)" />
                      <span>Personal Information</span>
                    </div>
                    <div className="staff-review-grid">
                      <div className="staff-review-item">
                        <label>First Name</label>
                        <p>{formData.firstName || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Last Name</label>
                        <p>{formData.lastName || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Gender</label>
                        <p>{formData.gender || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Date of Birth</label>
                        <p>{formData.dateOfBirth || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Contact Info */}
                  <div className="staff-review-section">
                    <div className="staff-review-title">
                      <FiMail size={16} color="var(--staff-primary)" />
                      <span>Contact Information</span>
                    </div>
                    <div className="staff-review-grid">
                      <div className="staff-review-item">
                        <label>Mobile Number</label>
                        <p>{formData.mobile || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Email Address</label>
                        <p>{formData.email || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Aadhaar Number</label>
                        <p>{formData.aadhaar || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Blood Group</label>
                        <p>{formData.bloodGroup || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Professional Info */}
                  <div className="staff-review-section">
                    <div className="staff-review-title">
                      <FiBriefcase size={16} color="var(--staff-primary)" />
                      <span>Professional Information</span>
                    </div>
                    <div className="staff-review-grid">
                      <div className="staff-review-item">
                        <label>Employee ID</label>
                        <p style={{ color: "var(--staff-primary)", fontWeight: "800" }}>{formData.employeeId}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Department</label>
                        <p>{isCustomDept ? customDeptName : formData.department}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Designation</label>
                        <p>{isCustomDesig ? customDesigName : formData.designation}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Qualification</label>
                        <p>{formData.qualification || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Staff Category</label>
                        <p>{formData.staffType || activeTab} Staff</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Experience (Years)</label>
                        <p>{formData.experience ? `${formData.experience} Years` : "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Joining Date</label>
                        <p>{formData.joiningDate || "—"}</p>
                      </div>
                      <div className="staff-review-item">
                        <label>Status</label>
                        <p>{formData.status || "Active"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="staff-notice-banner">
                    Documents, salary, and bank details will be available when their backend endpoints are provided. No mock data will be saved.
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="staff-wizard-footer">
              {wizardStep === 1 ? (
                <>
                  <button className="staff-btn staff-btn-outline" onClick={() => setShowWizard(false)}>
                    Cancel
                  </button>
                  <button className="staff-btn staff-btn-primary" onClick={handleNextStep}>
                    Next &rarr;
                  </button>
                </>
              ) : (
                <>
                  <button className="staff-btn staff-btn-outline" onClick={() => setWizardStep(1)}>
                    &larr; Back
                  </button>
                  <button className="staff-btn staff-btn-primary" onClick={handleSaveStaff} disabled={saving}>
                    {saving ? "Saving..." : isEditing ? "Update Staff Profile" : "Save Staff"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW FULL STAFF DETAILS MODAL (View Button)
          ========================================================================= */}
      {showViewModal && viewingStaff && (
        <div className="staff-modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="staff-modal-container" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
            <div className="staff-wizard-header">
              <div className="staff-wizard-title-wrap">
                <div className="staff-avatar" style={{ width: "48px", height: "48px", fontSize: "16px" }}>
                  {`${viewingStaff.firstName?.[0] || ""}${viewingStaff.lastName?.[0] || ""}`}
                </div>
                <div>
                  <h2>{`${viewingStaff.firstName || ""} ${viewingStaff.lastName || ""}`.trim()}</h2>
                  <p>
                    {viewingStaff.designation} &bull; {viewingStaff.department} &bull;{" "}
                    <span style={{ fontWeight: "bold", color: "var(--staff-primary)" }}>{viewingStaff.employeeId}</span>
                  </p>
                </div>
              </div>
              <button className="staff-icon-action" style={{ border: "none" }} onClick={() => setShowViewModal(false)}>
                <FiX size={20} />
              </button>
            </div>

            <div className="staff-wizard-body">
              {/* Personal Info */}
              <div className="staff-review-section">
                <div className="staff-review-title">
                  <FiUser size={15} color="var(--staff-primary)" />
                  <span>Personal Details</span>
                </div>
                <div className="staff-review-grid">
                  <div className="staff-review-item">
                    <label>Gender</label>
                    <p>{viewingStaff.gender || "—"}</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Date of Birth</label>
                    <p>{viewingStaff.dateOfBirth ? viewingStaff.dateOfBirth.split("T")[0] : "—"}</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Blood Group</label>
                    <p>{viewingStaff.bloodGroup || "—"}</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Aadhaar Number</label>
                    <p>{viewingStaff.aadhaar || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="staff-review-section">
                <div className="staff-review-title">
                  <FiMail size={15} color="var(--staff-primary)" />
                  <span>Contact Information</span>
                </div>
                <div className="staff-review-grid">
                  <div className="staff-review-item">
                    <label>Mobile Number</label>
                    <p>{viewingStaff.mobile || "—"}</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Email Address</label>
                    <p>{viewingStaff.email || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="staff-review-section">
                <div className="staff-review-title">
                  <FiBriefcase size={15} color="var(--staff-primary)" />
                  <span>Professional Details</span>
                </div>
                <div className="staff-review-grid">
                  <div className="staff-review-item">
                    <label>Category</label>
                    <p>{viewingStaff.staffType || activeTab} Staff</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Qualification</label>
                    <p>{viewingStaff.qualification || "—"}</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Joining Date</label>
                    <p>{viewingStaff.joiningDate ? viewingStaff.joiningDate.split("T")[0] : "—"}</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Experience</label>
                    <p>{viewingStaff.experience ? `${viewingStaff.experience} Years` : "—"}</p>
                  </div>
                  <div className="staff-review-item">
                    <label>Status</label>
                    <p>{viewingStaff.status || "Active"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="staff-wizard-footer" style={{ justifyContent: "space-between" }}>
              <button
                className="staff-btn staff-btn-outline"
                onClick={() => {
                  setShowViewModal(false);
                  handlePrint(viewingStaff);
                }}
              >
                <FiPrinter size={15} />
                <span>Print Profile Sheet</span>
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="staff-btn staff-btn-outline"
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenEdit(viewingStaff);
                  }}
                >
                  Edit Profile
                </button>
                <button className="staff-btn staff-btn-primary" onClick={() => setShowViewModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION MODAL (Delete Button)
          ========================================================================= */}
      {showDeleteModal && deletingStaff && (
        <div className="staff-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="staff-modal-container" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="staff-wizard-header" style={{ borderBottom: "none" }}>
              <div className="staff-wizard-title-wrap">
                <div
                  className="staff-wizard-avatar-icon"
                  style={{ background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}
                >
                  <FiTrash2 />
                </div>
                <div>
                  <h2 style={{ color: "#991b1b" }}>Confirm Deletion</h2>
                  <p>Are you sure you want to remove this staff profile?</p>
                </div>
              </div>
            </div>

            <div className="staff-wizard-body" style={{ paddingTop: "0" }}>
              <p style={{ fontSize: "14px", color: "#475569", lineHeight: "1.5" }}>
                Staff member <strong>{`${deletingStaff.firstName} ${deletingStaff.lastName}`}</strong> (
                <strong>{deletingStaff.employeeId}</strong>) will be soft-deleted. All related history remains safely preserved in the database.
              </p>
            </div>

            <div className="staff-wizard-footer">
              <button
                className="staff-btn staff-btn-outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="staff-btn"
                style={{ background: "#dc2626", color: "#ffffff", borderColor: "#dc2626" }}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList;
