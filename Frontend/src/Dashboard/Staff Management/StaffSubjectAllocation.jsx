import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiClipboard,
  FiCheckCircle,
  FiRotateCcw,
  FiEdit2,
  FiTrash2,
  FiLayers,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import {
  getStaffDropdown,
  getStaffSubjectAllocations,
  assignStaffSubject,
  updateStaffSubjectAllocation,
  deleteStaffSubjectAllocation,
} from "../../api/staffApi";
import "./StaffSubjectAllocation.css";

const BOARDS = ["State Board (BIE Telangana/AP)", "CBSE", "ICSE", "Autonomous"];
const ACADEMIC_YEARS = ["2024-2025", "2025-2026", "2026-2027"];
const GROUPS = ["MPC", "BiPC", "MEC", "CEC", "HEC"];
const ACADEMIC_LEVELS = ["Junior Inter (1st Year)", "Senior Inter (2nd Year)"];
const SECTIONS = ["Section A", "Section B", "Section C", "Section D"];

const DEFAULT_SUBJECTS = [
  "Mathematics 1A",
  "Mathematics 1B",
  "Mathematics 2A",
  "Mathematics 2B",
  "Physics 1",
  "Physics 2",
  "Chemistry 1",
  "Chemistry 2",
  "Botany 1",
  "Botany 2",
  "Zoology 1",
  "Zoology 2",
  "English 1",
  "English 2",
  "Sanskrit 1",
  "Sanskrit 2",
  "Telugu 1",
  "Telugu 2",
  "Hindi 1",
  "Hindi 2",
  "Commerce 1",
  "Commerce 2",
  "Economics 1",
  "Economics 2",
  "Civics 1",
  "Civics 2",
  "History 1",
  "History 2",
  "Computer Science 1",
  "Computer Science 2",
];

const StaffSubjectAllocation = () => {
  const [teachingStaff, setTeachingStaff] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [form, setForm] = useState({
    staffId: "",
    board: BOARDS[0],
    academicYear: ACADEMIC_YEARS[0],
    group: GROUPS[0],
    academicLevel: ACADEMIC_LEVELS[0],
    section: SECTIONS[0],
    subject: DEFAULT_SUBJECTS[0],
  });

  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showNotification = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 4000);
  };

  // Load teaching staff dropdown
  const loadStaff = async () => {
    try {
      const res = await getStaffDropdown("Teaching");
      const list = res.data || [];
      setTeachingStaff(list);
      if (list.length > 0 && !form.staffId) {
        setForm((prev) => ({ ...prev, staffId: list[0].id || list[0].staffId }));
      }
    } catch (err) {
      console.error("Failed to load teaching staff:", err);
    }
  };

  // Load allocations for selected staff or initial
  const loadAllocations = async (staffId) => {
    if (!staffId) return;
    setLoading(true);
    try {
      const res = await getStaffSubjectAllocations(staffId);
      setAllocations(res.data || []);
    } catch (err) {
      console.error("Failed to load allocations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (form.staffId) {
      loadAllocations(form.staffId);
    }
  }, [form.staffId]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const resetForm = () => {
    setForm({
      staffId: teachingStaff.length > 0 ? (teachingStaff[0].id || teachingStaff[0].staffId) : "",
      board: BOARDS[0],
      academicYear: ACADEMIC_YEARS[0],
      group: GROUPS[0],
      academicLevel: ACADEMIC_LEVELS[0],
      section: SECTIONS[0],
      subject: DEFAULT_SUBJECTS[0],
    });
    setErrors({});
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.staffId) {
      setErrors({ staffId: "Please select a teaching staff member." });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        staffId: parseInt(form.staffId, 10),
        subject: form.subject,
        board: form.board,
        academicYear: form.academicYear,
        group: form.group,
        academicLevel: form.academicLevel,
        section: form.section,
      };

      if (editingId) {
        await updateStaffSubjectAllocation(editingId, payload);
        showNotification("Subject allocation updated successfully!");
      } else {
        await assignStaffSubject(payload);
        showNotification("Subject allocated to staff member successfully!");
      }

      resetForm();
      loadAllocations(form.staffId);
    } catch (err) {
      console.error("Error saving subject allocation:", err);
      const msg = err.response?.data?.message || "Failed to allocate subject.";
      showNotification(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      staffId: item.staffId,
      board: item.boardName || BOARDS[0],
      academicYear: ACADEMIC_YEARS[0],
      group: item.groupName || GROUPS[0],
      academicLevel: item.academicLevelName || ACADEMIC_LEVELS[0],
      section: item.sectionName || item.section || SECTIONS[0],
      subject: item.subjectName || item.subjectCode || DEFAULT_SUBJECTS[0],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this subject allocation?")) return;
    try {
      await deleteStaffSubjectAllocation(id);
      showNotification("Subject allocation removed.");
      loadAllocations(form.staffId);
    } catch (err) {
      console.error("Failed to delete allocation:", err);
      showNotification("Failed to remove allocation.", "error");
    }
  };

  return (
    <div className="ssa-page">
      {/* Toast */}
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
          }}
        >
          {toast.type === "error" ? <FiAlertCircle size={18} /> : <FiCheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="ssa-breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">&gt;</span>
        <Link to="/dashboard/staff-management">Staff Management</Link>
        <span className="sep">&gt;</span>
        <span className="current">Staff Subject Allocation</span>
      </div>

      <div className="ssa-header">
        <h1 className="ssa-title">Staff Subject Allocation</h1>
        <p className="ssa-subtitle">
          Map intermediate subjects and sections to teaching staff members.
        </p>
      </div>

      {/* Allocation Form Card */}
      <div className="ssa-card">
        <div className="ssa-card-head">
          <div className="ssa-card-icon">
            <FiClipboard />
          </div>
          <div>
            <h2>{editingId ? "Edit Subject Allocation" : "Assign Subject to Teaching Staff"}</h2>
            <p>Select the teaching staff, board, group, class level, section, and subject.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="ssa-form">
          <div className="ssa-grid">
            {/* Teaching Staff Select */}
            <div className="ssa-field">
              <label className="ssa-label">
                Teaching Staff <span>*</span>
              </label>
              <select
                className="ssa-select"
                value={form.staffId}
                onChange={(e) => setField("staffId", e.target.value)}
              >
                <option value="">Select Teaching Staff</option>
                {teachingStaff.map((s) => (
                  <option key={s.id || s.staffId} value={s.id || s.staffId}>
                    {s.fullName} ({s.employeeId}) — {s.designation}
                  </option>
                ))}
              </select>
              {errors.staffId && <span className="ssa-error">{errors.staffId}</span>}
            </div>

            {/* Board */}
            <div className="ssa-field">
              <label className="ssa-label">Board</label>
              <select
                className="ssa-select"
                value={form.board}
                onChange={(e) => setField("board", e.target.value)}
              >
                {BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div className="ssa-field">
              <label className="ssa-label">Academic Year</label>
              <select
                className="ssa-select"
                value={form.academicYear}
                onChange={(e) => setField("academicYear", e.target.value)}
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Group */}
            <div className="ssa-field">
              <label className="ssa-label">Group</label>
              <select
                className="ssa-select"
                value={form.group}
                onChange={(e) => setField("group", e.target.value)}
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Level */}
            <div className="ssa-field">
              <label className="ssa-label">Academic Level</label>
              <select
                className="ssa-select"
                value={form.academicLevel}
                onChange={(e) => setField("academicLevel", e.target.value)}
              >
                {ACADEMIC_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div className="ssa-field">
              <label className="ssa-label">Section</label>
              <select
                className="ssa-select"
                value={form.section}
                onChange={(e) => setField("section", e.target.value)}
              >
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="ssa-field">
              <label className="ssa-label">Subject</label>
              <select
                className="ssa-select"
                value={form.subject}
                onChange={(e) => setField("subject", e.target.value)}
              >
                {DEFAULT_SUBJECTS.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ssa-actions">
            <button type="button" className="ssa-btn ssa-btn-outline" onClick={resetForm}>
              <FiRotateCcw size={15} />
              <span>Reset</span>
            </button>
            <button type="submit" className="ssa-btn ssa-btn-primary" disabled={submitting}>
              <FiCheckCircle size={16} />
              <span>{submitting ? "Allocating..." : editingId ? "Update Allocation" : "Allocate Subject"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Allocated Records Table */}
      <div className="ssa-card">
        <div className="ssa-card-head">
          <div className="ssa-card-icon">
            <FiLayers />
          </div>
          <div>
            <h2>Current Subject Allocations</h2>
            <p>Active subject mappings for selected teaching staff.</p>
          </div>
        </div>

        <div className="ssa-table-wrapper">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <FiRefreshCw className="spin" size={24} />
              <p style={{ marginTop: "8px" }}>Loading subject allocations...</p>
            </div>
          ) : allocations.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <p>No subjects currently allocated for this staff member.</p>
            </div>
          ) : (
            <table className="ssa-table">
              <thead>
                <tr>
                  <th>STAFF MEMBER</th>
                  <th>SUBJECT</th>
                  <th>BOARD</th>
                  <th>GROUP</th>
                  <th>ACADEMIC LEVEL</th>
                  <th>SECTION</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right", paddingRight: "20px" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.staffName || a.facultyName || "Staff"}</strong>
                    </td>
                    <td>{a.subjectName || a.subjectCode}</td>
                    <td>{a.boardName || "State Board"}</td>
                    <td>{a.groupName || "MPC"}</td>
                    <td>{a.academicLevelName || "Junior Inter"}</td>
                    <td>{a.sectionName || a.section || "Section A"}</td>
                    <td>
                      <span className="ssa-status-badge">Allocated</span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "20px" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          className="staff-icon-action view-btn"
                          title="Edit Allocation"
                          onClick={() => handleEdit(a)}
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          className="staff-icon-action delete-btn"
                          title="Delete Allocation"
                          onClick={() => handleDelete(a.id)}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffSubjectAllocation;
