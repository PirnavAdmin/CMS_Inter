import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Wallet, DollarSign, Plus, Upload, Download, Printer, Eye, Edit3, Trash2, CheckCircle,
  XCircle, Clock, FileText, UserCheck, ShieldAlert, Award, Calendar, RefreshCw, Filter,
  Search, ArrowLeft, Copy, Sparkles, TrendingUp, AlertTriangle, ChevronRight, Layers,
  CreditCard, Check, Building2, UserX, PauseCircle, PlayCircle, Receipt
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import {
  loadSalaryData, saveSalaryData, formatINR, calculateGrossSalary,
  calculateTotalDeductions, calculateNetSalary, calculateLOP, calculateOvertime
} from "@/data/salaryManagementData.js";
import "./SalaryManagementPage.css";

const COLORS = ["#6F8400", "#108E50", "#B7791F", "#6D28D9", "#D93636", "#2563EB"];

export default function SalaryManagementPage({ mode = "dashboard" }) {
  const navigate = useNavigate();
  const { id, month, staffId } = useParams();
  const [searchParams] = useSearchParams();

  const [store, setStore] = useState(loadSalaryData);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  // Sync to sessionStorage on state updates
  useEffect(() => {
    saveSalaryData(store);
  }, [store]);

  // Derived KPI metrics
  const kpiData = useMemo(() => {
    const totalStaff = store.assignments.length;
    const teachingAssigned = store.assignments.filter((a) => a.staffType === "Teaching" && a.status === "Active").length;
    const nonTeachingAssigned = store.assignments.filter((a) => a.staffType === "Non-Teaching" && a.status === "Active").length;
    const pendingAssigned = store.assignments.filter((a) => a.status === "Pending").length;
    const activeStructures = store.structures.filter((s) => s.status === "Active").length;
    const grossTotal = store.assignments.reduce((sum, a) => sum + Number(a.grossSalary || 0), 0);
    const deductionsTotal = store.assignments.reduce((sum, a) => sum + Number(a.totalDeductions || 0), 0);
    const netTotal = store.assignments.reduce((sum, a) => sum + Number(a.netSalary || 0), 0);
    const onHold = store.assignments.filter((a) => a.status === "On Hold").length;

    return {
      totalStaff,
      teachingAssigned,
      nonTeachingAssigned,
      pendingAssigned,
      activeStructures,
      grossTotal,
      deductionsTotal,
      netTotal,
      onHold,
    };
  }, [store]);

  // Handler helpers
  const handleHoldToggle = (asgnId, currentStatus) => {
    const nextStatus = currentStatus === "On Hold" ? "Active" : "On Hold";
    setStore((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => (a.id === asgnId ? { ...a, status: nextStatus } : a)),
    }));
    setToast(`Status updated to ${nextStatus}`);
    setModal(null);
  };

  const handleDeleteStructure = (structId) => {
    setStore((prev) => ({
      ...prev,
      structures: prev.structures.filter((s) => s.id !== structId),
    }));
    setToast("Salary structure deleted successfully");
    setModal(null);
  };

  const handleApproveItem = (type, itemId) => {
    if (type === "revision") {
      setStore((prev) => ({
        ...prev,
        revisions: prev.revisions.map((r) => (r.id === itemId ? { ...r, status: "Approved", approvedBy: "Admin" } : r)),
      }));
    } else if (type === "bonus") {
      setStore((prev) => ({
        ...prev,
        bonuses: prev.bonuses.map((b) => (b.id === itemId ? { ...b, status: "Approved", approvedBy: "Admin" } : b)),
      }));
    } else if (type === "loan") {
      setStore((prev) => ({
        ...prev,
        loans: prev.loans.map((l) => (l.id === itemId ? { ...l, status: "Active" } : l)),
      }));
    } else if (type === "reimbursement") {
      setStore((prev) => ({
        ...prev,
        reimbursements: prev.reimbursements.map((rm) => (rm.id === itemId ? { ...rm, status: "Approved" } : rm)),
      }));
    }
    setToast(`${type.toUpperCase()} request approved`);
    setModal(null);
  };

  // Render Sub-Views based on mode
  if (mode === "structures-list") {
    return <SalaryStructureListScreen store={store} navigate={navigate} setModal={setModal} setToast={setToast} />;
  }
  if (mode === "structures-add") {
    return <AddSalaryStructureScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "structures-view") {
    return <SalaryStructureDetailsScreen id={id} store={store} navigate={navigate} setModal={setModal} setToast={setToast} />;
  }
  if (mode === "structures-edit") {
    return <EditSalaryStructureScreen id={id} store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "assignments-list") {
    return <SalaryAssignmentsScreen store={store} navigate={navigate} setModal={setModal} setToast={setToast} handleHoldToggle={handleHoldToggle} />;
  }
  if (mode === "assign-teaching") {
    return <AssignSalaryScreen staffType="Teaching" store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "assign-non-teaching") {
    return <AssignSalaryScreen staffType="Non-Teaching" store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "assignments-view") {
    return <SalaryAssignmentDetailsScreen id={id} store={store} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "assignments-edit") {
    return <EditSalaryAssignmentScreen id={id} store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "payroll-list") {
    return <MonthlyPayrollScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "payroll-month-view") {
    return <PayrollMonthViewScreen month={month} store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "payroll-indiv-view") {
    return <IndividualPayrollScreen month={month} staffId={staffId} store={store} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "payslips-list") {
    return <PayslipManagementScreen store={store} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "payslip-preview") {
    return <PayslipPreviewScreen staffId={staffId} month={month} store={store} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "revisions-list") {
    return <SalaryRevisionsScreen store={store} navigate={navigate} handleApproveItem={handleApproveItem} setToast={setToast} />;
  }
  if (mode === "revisions-add") {
    return <AddSalaryRevisionScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "attendance-impact") {
    return <AttendanceImpactScreen store={store} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "bonus-list") {
    return <BonusIncentivesScreen store={store} navigate={navigate} handleApproveItem={handleApproveItem} setToast={setToast} />;
  }
  if (mode === "bonus-add") {
    return <AddBonusScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "overtime-list") {
    return <OvertimeManagementScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "advances-list") {
    return <SalaryAdvancesScreen store={store} navigate={navigate} handleApproveItem={handleApproveItem} setToast={setToast} />;
  }
  if (mode === "advances-add") {
    return <AddSalaryAdvanceScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "reimbursements-list") {
    return <ReimbursementsScreen store={store} navigate={navigate} handleApproveItem={handleApproveItem} setToast={setToast} />;
  }
  if (mode === "reimbursements-add") {
    return <AddReimbursementScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "approvals-list") {
    return <PayrollApprovalsScreen store={store} handleApproveItem={handleApproveItem} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "reports") {
    return <PayrollReportsScreen store={store} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "settings") {
    return <PayrollSettingsScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }
  if (mode === "import") {
    return <SalaryImportScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
  }

  // DEFAULT DASHBOARD
  return (
    <DashboardLayout
      title="Staff Salary Management"
      subtitle="Manage salary structures, staff assignments, payroll and payments."
      breadcrumb={["Home", "People", "Staff Salary Management"]}
      actions={
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => navigate("/dashboard/staff-salary/import")}
          >
            <Upload size={14} /> Import Salary Data
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => navigate("/dashboard/staff-salary/payroll")}
          >
            <Receipt size={14} /> Process Payroll
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/staff-salary/structures/add")}
          >
            <Plus size={14} /> Add Salary Structure
          </button>
        </div>
      }
    >
      <main className="salary-page-container">
        {/* KPI Row 1 */}
        <div className="salary-kpi-grid">
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/assignments?tab=All")}>
            <div className="salary-kpi-icon"><Wallet size={20} /></div>
            <div className="salary-kpi-data">
              <span>Total Staff Assigned</span>
              <strong>{kpiData.totalStaff}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/assignments?tab=Teaching")}>
            <div className="salary-kpi-icon"><UserCheck size={20} /></div>
            <div className="salary-kpi-data">
              <span>Teaching Staff</span>
              <strong>{kpiData.teachingAssigned}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/assignments?tab=Non-Teaching")}>
            <div className="salary-kpi-icon"><Building2 size={20} /></div>
            <div className="salary-kpi-data">
              <span>Non-Teaching Staff</span>
              <strong>{kpiData.nonTeachingAssigned}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/assignments?tab=Pending")}>
            <div className="salary-kpi-icon"><Clock size={20} /></div>
            <div className="salary-kpi-data">
              <span>Pending Assignment</span>
              <strong>{kpiData.pendingAssigned}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/structures")}>
            <div className="salary-kpi-icon"><Layers size={20} /></div>
            <div className="salary-kpi-data">
              <span>Active Structures</span>
              <strong>{kpiData.activeStructures}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/payroll")}>
            <div className="salary-kpi-icon"><CheckCircle size={20} /></div>
            <div className="salary-kpi-data">
              <span>Monthly Payroll</span>
              <strong style={{ color: "#108E50", fontSize: "14px" }}>Processed</strong>
            </div>
          </div>
        </div>

        {/* Secondary KPI Row */}
        <div className="salary-kpi-grid">
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/payroll")}>
            <div className="salary-kpi-icon"><DollarSign size={20} /></div>
            <div className="salary-kpi-data">
              <span>Gross Payroll</span>
              <strong>{formatINR(kpiData.grossTotal)}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/payroll")}>
            <div className="salary-kpi-icon"><TrendingUp size={20} /></div>
            <div className="salary-kpi-data">
              <span>Total Deductions</span>
              <strong>{formatINR(kpiData.deductionsTotal)}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/payroll")}>
            <div className="salary-kpi-icon"><CreditCard size={20} /></div>
            <div className="salary-kpi-data">
              <span>Net Payroll Outflow</span>
              <strong style={{ color: "#108E50" }}>{formatINR(kpiData.netTotal)}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/assignments?tab=Active")}>
            <div className="salary-kpi-icon"><CheckCircle size={20} /></div>
            <div className="salary-kpi-data">
              <span>Paid Staff</span>
              <strong>{kpiData.totalStaff - kpiData.pendingAssigned}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/assignments?tab=On Hold")}>
            <div className="salary-kpi-icon"><AlertTriangle size={20} /></div>
            <div className="salary-kpi-data">
              <span>Salary On Hold</span>
              <strong style={{ color: "#B7791F" }}>{kpiData.onHold}</strong>
            </div>
          </div>
          <div className="salary-kpi-card" onClick={() => navigate("/dashboard/staff-salary/payroll/2026-08")}>
            <div className="salary-kpi-icon"><FileText size={20} /></div>
            <div className="salary-kpi-data">
              <span>Latest Month</span>
              <strong style={{ fontSize: "14px" }}>August 2026</strong>
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="salary-quick-bar">
          <span className="salary-quick-title">Quick Actions:</span>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => navigate("/dashboard/staff-salary/structures/add")}>
            <Plus size={13} /> Add Structure
          </button>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => navigate("/dashboard/staff-salary/assign/teaching")}>
            <UserCheck size={13} /> Assign Teaching
          </button>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => navigate("/dashboard/staff-salary/assign/non-teaching")}>
            <Building2 size={13} /> Assign Non-Teaching
          </button>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => navigate("/dashboard/staff-salary/payroll")}>
            <Receipt size={13} /> Process Payroll
          </button>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => navigate("/dashboard/staff-salary/payslips")}>
            <FileText size={13} /> Payslips
          </button>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => navigate("/dashboard/staff-salary/reports")}>
            <TrendingUp size={13} /> Reports
          </button>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => navigate("/dashboard/staff-salary/settings")}>
            <Layers size={13} /> Settings
          </button>
        </div>

        {/* Charts & Summary */}
        <div className="salary-charts-grid">
          <div className="salary-card-panel">
            <div className="salary-card-header">
              <h3>Monthly Payroll Summary (Last 6 Months)</h3>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={store.payrollMonths}>
                  <XAxis dataKey="label" stroke="var(--cms-muted)" fontSize={11} />
                  <YAxis stroke="var(--cms-muted)" fontSize={11} tickFormatter={(v) => `₹${v / 100000}L`} />
                  <Tooltip formatter={(value) => formatINR(value)} />
                  <Bar dataKey="totalGross" name="Gross Salary" fill="#6F8400" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalDeductions" name="Deductions" fill="#B7791F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalNet" name="Net Salary Outflow" fill="#108E50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="salary-card-panel">
            <div className="salary-card-header">
              <h3>Payroll by Staff Category</h3>
            </div>
            <div style={{ width: "100%", height: 220, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Teaching Payroll", value: kpiData.teachingAssigned * 76000 },
                      { name: "Non-Teaching Payroll", value: kpiData.nonTeachingAssigned * 42000 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    <Cell fill="#6F8400" />
                    <Cell fill="#6D28D9" />
                  </Pie>
                  <Tooltip formatter={(val) => formatINR(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </main>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 2 — SALARY STRUCTURE LIST
// ----------------------------------------------------------------------
function SalaryStructureListScreen({ store, navigate, setModal, setToast }) {
  const [filterType, setFilterType] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = Array.isArray(store?.structures) ? store.structures : [];
    return list.filter((s) => {
      if (!s || typeof s !== "object") return false;
      if (filterType !== "All" && s.staffType !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (s.name || "").toLowerCase().includes(q);
        const desigMatch = (s.designation || "").toLowerCase().includes(q);
        const deptMatch = (s.department || "").toLowerCase().includes(q);
        if (!nameMatch && !desigMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [store?.structures, filterType, search]);

  return (
    <DashboardLayout
      title="Salary Structures"
      subtitle="Manage reusable salary structures for teaching and non-teaching staff."
      breadcrumb={["Home", "People", "Staff Salary Management", "Salary Structures"]}
      actions={
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setToast("Exporting structure templates to CSV...")}>
            <Download size={14} /> Export
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate("/dashboard/staff-salary/structures/add")}>
            <Plus size={14} /> Add Salary Structure
          </button>
        </div>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <div className="salary-card-header" style={{ flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              {["All", "Teaching", "Non-Teaching"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`cms-btn ${filterType === t ? "cms-btn-primary" : "cms-btn-ghost"}`}
                  style={{ fontSize: "12px", padding: "4px 12px" }}
                  onClick={() => setFilterType(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Search3DIcon size={14} />
              <input
                type="text"
                placeholder="Search structure name / designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "13px" }}
              />
            </div>
          </div>

          <DataTable
            rows={filtered}
            data={filtered}
            columns={[
              { key: "name", label: "Structure Name" },
              { key: "staffType", label: "Staff Type" },
              { key: "department", label: "Department" },
              { key: "designation", label: "Designation" },
              { key: "grossSalary", label: "Gross", render: (r) => formatINR(r.grossSalary) },
              { key: "netSalary", label: "Net Salary", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
              { key: "assignedCount", label: "Assigned Staff", render: (r) => `${r.assignedCount || 0} Staff` },
              { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "3px 7px", fontSize: "11px" }} onClick={() => navigate(`/dashboard/staff-salary/structures/${r.id}`)}>
                      <Eye size={12} /> View
                    </button>
                    <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "3px 7px", fontSize: "11px" }} onClick={() => navigate(`/dashboard/staff-salary/structures/${r.id}/edit`)}>
                      <Edit3 size={12} /> Edit
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

function SearchableInputPicker({ label, placeholder, value, onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filteredOptions = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="salary-form-group">
      <label>{label}</label>
      <div
        className="salary-search-picker"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setOpen(false);
          }
        }}
      >
        <div className="salary-search-input-wrap">
          <Search3DIcon size={14} />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              onChange(val);
              setOpen(true);
            }}
          />
        </div>
        {open ? (
          <div className="salary-search-dropdown" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="salary-search-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(opt);
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <span>{opt}</span>
                  {opt === value ? <Check size={13} style={{ color: "var(--cms-primary)" }} /> : null}
                </button>
              ))
            ) : (
              <div className="salary-search-empty">No matching {label.toLowerCase()} found.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 3 — ADD SALARY STRUCTURE
// ----------------------------------------------------------------------
function AddSalaryStructureScreen({ store, setStore, navigate, setToast }) {
  const [formData, setFormData] = useState({
    name: "",
    staffType: "Teaching",
    department: "",
    designation: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    status: "Active",
    taxability: "Taxable",
    basicPay: 50000,
    hra: 15000,
    da: 8000,
    specialAllowance: 5000,
    transportAllowance: 3000,
    medicalAllowance: 2000,
    academicAllowance: 2000,
    otherAllowances: 0,
    pf: 6000,
    esi: 0,
    professionalTax: 200,
    tds: 3500,
    insurance: 1000,
    otherDeductions: 0,
  });

  const defaultDepartments = useMemo(() => [
    "Computer Science", "Mathematics", "Physics", "Chemistry", "English",
    "Administration", "Accounts", "Library", "Maintenance", "Transport",
    "Electronics", "Mechanical Engineering", "Civil Engineering", "Commerce"
  ], []);

  const departmentOptions = useMemo(() => {
    let saved = [];
    try {
      saved = JSON.parse(sessionStorage.getItem("pjc-ui-departments") || "[]")
        .map((item) => item.name)
        .filter(Boolean);
    } catch {}
    return Array.from(new Set([...saved, ...defaultDepartments]));
  }, [defaultDepartments]);

  const defaultDesignations = useMemo(() => [
    "HOD", "Professor", "Associate Professor", "Assistant Professor",
    "Senior Lecturer", "Junior Lecturer", "Lecturer", "Lab Technician",
    "Administrative Officer", "Accountant", "Librarian", "Office Assistant",
    "System Administrator", "Physical Director"
  ], []);

  const grossSalary = useMemo(() => {
    return Number(formData.basicPay || 0) + Number(formData.hra || 0) + Number(formData.da || 0) +
      Number(formData.specialAllowance || 0) + Number(formData.transportAllowance || 0) +
      Number(formData.medicalAllowance || 0) + Number(formData.academicAllowance || 0) +
      Number(formData.otherAllowances || 0);
  }, [formData]);

  const totalDeductions = useMemo(() => {
    return Number(formData.pf || 0) + Number(formData.esi || 0) + Number(formData.professionalTax || 0) +
      Number(formData.tds || 0) + Number(formData.insurance || 0) + Number(formData.otherDeductions || 0);
  }, [formData]);

  const netSalary = useMemo(() => calculateNetSalary(grossSalary, totalDeductions), [grossSalary, totalDeductions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const newStructure = {
      ...formData,
      id: `struct-${Date.now()}`,
      grossSalary,
      totalDeductions,
      netSalary,
      assignedCount: 0,
    };
    setStore((prev) => ({
      ...prev,
      structures: [newStructure, ...prev.structures],
    }));
    setToast("Salary Structure created successfully!");
    navigate("/dashboard/staff-salary/structures");
  };

  return (
    <DashboardLayout
      title="Add Salary Structure"
      subtitle="Create a reusable salary structure with earnings and deductions breakdown."
      breadcrumb={["Home", "People", "Staff Salary Management", "Structures", "Add"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/structures" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Structures
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="salary-split-layout">
            <div className="salary-card-panel">
              <div className="salary-form-section-title">Step 1 — Structure Metadata</div>
              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Structure Name *</label>
                  <input type="text" required placeholder="e.g. Senior Professor Grade A" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>Staff Type *</label>
                  <select value={formData.staffType} onChange={(e) => setFormData({ ...formData, staffType: e.target.value })}>
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <SearchableInputPicker
                  label="Department"
                  placeholder="Search department..."
                  value={formData.department}
                  options={departmentOptions}
                  onChange={(val) => setFormData({ ...formData, department: val })}
                />
                <SearchableInputPicker
                  label="Designation"
                  placeholder="Search designation..."
                  value={formData.designation}
                  options={defaultDesignations}
                  onChange={(val) => setFormData({ ...formData, designation: val })}
                />
                <div className="salary-form-group">
                  <label>Effective From *</label>
                  <input type="date" required value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>Status *</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="salary-form-section-title">Step 2 — Monthly Earnings</div>
              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Basic Pay *</label>
                  <input type="number" required min="0" value={formData.basicPay} onChange={(e) => setFormData({ ...formData, basicPay: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>HRA (House Rent Allowance)</label>
                  <input type="number" min="0" value={formData.hra} onChange={(e) => setFormData({ ...formData, hra: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>DA (Dearness Allowance)</label>
                  <input type="number" min="0" value={formData.da} onChange={(e) => setFormData({ ...formData, da: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Special Allowance</label>
                  <input type="number" min="0" value={formData.specialAllowance} onChange={(e) => setFormData({ ...formData, specialAllowance: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Transport Allowance</label>
                  <input type="number" min="0" value={formData.transportAllowance} onChange={(e) => setFormData({ ...formData, transportAllowance: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Medical Allowance</label>
                  <input type="number" min="0" value={formData.medicalAllowance} onChange={(e) => setFormData({ ...formData, medicalAllowance: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Academic / Research Allowance</label>
                  <input type="number" min="0" value={formData.academicAllowance} onChange={(e) => setFormData({ ...formData, academicAllowance: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Other Allowances</label>
                  <input type="number" min="0" value={formData.otherAllowances} onChange={(e) => setFormData({ ...formData, otherAllowances: Number(e.target.value) })} />
                </div>
              </div>

              <div className="salary-form-section-title">Step 3 — Deductions</div>
              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Provident Fund (PF)</label>
                  <input type="number" min="0" value={formData.pf} onChange={(e) => setFormData({ ...formData, pf: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>ESI Deduction</label>
                  <input type="number" min="0" value={formData.esi} onChange={(e) => setFormData({ ...formData, esi: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Professional Tax (PT)</label>
                  <input type="number" min="0" value={formData.professionalTax} onChange={(e) => setFormData({ ...formData, professionalTax: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>TDS (Income Tax)</label>
                  <input type="number" min="0" value={formData.tds} onChange={(e) => setFormData({ ...formData, tds: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Insurance Deduction</label>
                  <input type="number" min="0" value={formData.insurance} onChange={(e) => setFormData({ ...formData, insurance: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Other Deductions</label>
                  <input type="number" min="0" value={formData.otherDeductions} onChange={(e) => setFormData({ ...formData, otherDeductions: Number(e.target.value) })} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/staff-salary/structures")}>Cancel</button>
                <button type="submit" className="cms-btn cms-btn-primary"><Plus size={14} /> Save Structure</button>
              </div>
            </div>

            {/* Live Breakup Preview */}
            <div className="salary-preview-sticky">
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Live Breakup Preview</h4>
              <div className="breakup-row"><span>Basic Pay</span><strong>{formatINR(formData.basicPay)}</strong></div>
              <div className="breakup-row"><span>HRA</span><span>{formatINR(formData.hra)}</span></div>
              <div className="breakup-row"><span>DA</span><span>{formatINR(formData.da)}</span></div>
              <div className="breakup-row"><span>Allowances</span><span>{formatINR(formData.specialAllowance + formData.transportAllowance + formData.academicAllowance)}</span></div>
              <div className="breakup-row total"><span>Gross Salary</span><strong style={{ color: "#6F8400" }}>{formatINR(grossSalary)}</strong></div>

              <div style={{ margin: "16px 0 8px", fontSize: "12px", fontWeight: 700, color: "var(--cms-muted)" }}>DEDUCTIONS</div>
              <div className="breakup-row"><span>PF</span><span>{formatINR(formData.pf)}</span></div>
              <div className="breakup-row"><span>Professional Tax</span><span>{formatINR(formData.professionalTax)}</span></div>
              <div className="breakup-row"><span>TDS</span><span>{formatINR(formData.tds)}</span></div>
              <div className="breakup-row total"><span>Total Deductions</span><strong style={{ color: "#B7791F" }}>{formatINR(totalDeductions)}</strong></div>

              <div className="breakup-row net">
                <span>Net Monthly Salary</span>
                <strong style={{ fontSize: "18px", color: "#108E50" }}>{formatINR(netSalary)}</strong>
              </div>
            </div>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 4 — SALARY STRUCTURE DETAILS
// ----------------------------------------------------------------------
function SalaryStructureDetailsScreen({ id, store, navigate, setModal, setToast }) {
  const struct = useMemo(() => store.structures.find((s) => s.id === id), [id, store.structures]);

  if (!struct) {
    return (
      <DashboardLayout title="Structure Not Found">
        <main className="salary-page-container">
          <p>The requested salary structure does not exist.</p>
          <Link to="/dashboard/staff-salary/structures" className="cms-back-link">Back to Salary Structures</Link>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={struct.name}
      subtitle={`Detailed component structure for ${struct.staffType} staff.`}
      breadcrumb={["Home", "People", "Staff Salary Management", "Structures", struct.name]}
      actions={
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(`/dashboard/staff-salary/structures/${struct.id}/edit`)}>
            <Edit3 size={14} /> Edit Structure
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate(`/dashboard/staff-salary/assign/${struct.staffType.toLowerCase()}`)}>
            <UserCheck size={14} /> Assign to Staff
          </button>
        </div>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/structures" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Structures
        </Link>

        <div className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Staff Type</span><div><strong>{struct.staffType}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Department</span><div><strong>{struct.department}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Designation</span><div><strong>{struct.designation}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Effective From</span><div><strong>{struct.effectiveFrom}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Gross Salary</span><div><strong style={{ color: "#6F8400" }}>{formatINR(struct.grossSalary)}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Net Salary</span><div><strong style={{ color: "#108E50" }}>{formatINR(struct.netSalary)}</strong></div></div>
          </div>
        </div>

        <div className="salary-split-layout">
          <div className="salary-card-panel">
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Earnings Breakdown</h4>
            <div className="breakup-row"><span>Basic Pay</span><strong>{formatINR(struct.basicPay)}</strong></div>
            <div className="breakup-row"><span>HRA</span><span>{formatINR(struct.hra)}</span></div>
            <div className="breakup-row"><span>DA</span><span>{formatINR(struct.da)}</span></div>
            <div className="breakup-row"><span>Special Allowance</span><span>{formatINR(struct.specialAllowance)}</span></div>
            <div className="breakup-row"><span>Transport Allowance</span><span>{formatINR(struct.transportAllowance)}</span></div>
            <div className="breakup-row"><span>Academic / Research Allowance</span><span>{formatINR(struct.academicAllowance)}</span></div>
            <div className="breakup-row total"><span>Total Gross</span><strong style={{ color: "#6F8400" }}>{formatINR(struct.grossSalary)}</strong></div>
          </div>

          <div className="salary-card-panel">
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Deductions Breakdown</h4>
            <div className="breakup-row"><span>Provident Fund (PF)</span><span>{formatINR(struct.pf)}</span></div>
            <div className="breakup-row"><span>ESI</span><span>{formatINR(struct.esi)}</span></div>
            <div className="breakup-row"><span>Professional Tax</span><span>{formatINR(struct.professionalTax)}</span></div>
            <div className="breakup-row"><span>TDS (Income Tax)</span><span>{formatINR(struct.tds)}</span></div>
            <div className="breakup-row"><span>Insurance</span><span>{formatINR(struct.insurance)}</span></div>
            <div className="breakup-row total"><span>Total Deductions</span><strong style={{ color: "#B7791F" }}>{formatINR(struct.totalDeductions)}</strong></div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function SearchableStaffPicker({ label = "Select Staff *", staffList = [], selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selectedStaff = useMemo(() => staffList.find((s) => s.staffId === selectedId), [staffList, selectedId]);
  const [query, setQuery] = useState(selectedStaff ? `${selectedStaff.staffId} — ${selectedStaff.staffName}` : "");

  useEffect(() => {
    if (selectedStaff) {
      setQuery(`${selectedStaff.staffId} — ${selectedStaff.staffName}`);
    }
  }, [selectedStaff]);

  const filteredStaff = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter((s) => {
      const nameMatch = (s.staffName || "").toLowerCase().includes(q);
      const idMatch = (s.staffId || "").toLowerCase().includes(q);
      const deptMatch = (s.department || "").toLowerCase().includes(q);
      return nameMatch || idMatch || deptMatch;
    });
  }, [staffList, query]);

  return (
    <div className="salary-form-group" style={{ maxWidth: "480px" }}>
      <label>{label}</label>
      <div
        className="salary-search-picker"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setOpen(false);
          }
        }}
      >
        <div className="salary-search-input-wrap">
          <Search3DIcon size={14} />
          <input
            type="text"
            placeholder="Search staff by name, ID, or department..."
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
        </div>
        {open ? (
          <div className="salary-search-dropdown" role="listbox">
            {filteredStaff.length > 0 ? (
              filteredStaff.map((staff) => (
                <button
                  key={staff.staffId}
                  type="button"
                  className="salary-search-option"
                  style={{ flexDirection: "column", alignItems: "flex-start", gap: "2px", padding: "8px 12px" }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(staff.staffId);
                    setQuery(`${staff.staffId} — ${staff.staffName}`);
                    setOpen(false);
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontWeight: 600 }}>
                    <span>{staff.staffName} ({staff.staffId})</span>
                    {staff.staffId === selectedId ? <Check size={13} style={{ color: "var(--cms-primary)" }} /> : null}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--cms-muted)" }}>
                    {staff.department} • {staff.designation}
                  </div>
                </button>
              ))
            ) : (
              <div className="salary-search-empty">No matching staff found.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 5 & 6 — ASSIGN SALARY (Teaching / Non-Teaching Stepper Page)
// ----------------------------------------------------------------------
function AssignSalaryScreen({ staffType = "Teaching", store, setStore, navigate, setToast }) {
  const [step, setStep] = useState(1);

  // Filter staff to ONLY teaching or ONLY non-teaching
  const eligibleAssignments = useMemo(() => {
    return store.assignments.filter((a) => a.staffType === staffType);
  }, [store.assignments, staffType]);

  const [selectedStaffId, setSelectedStaffId] = useState(eligibleAssignments[0]?.staffId || "");
  const [selectedStructId, setSelectedStructId] = useState(store.structures[0]?.id || "");
  const [effectiveFrom, setEffectiveFrom] = useState("2026-09-01");
  const [bankDetails, setBankDetails] = useState({
    bankName: "HDFC Bank",
    accountNumber: "987654321098",
    confirmAccountNumber: "987654321098",
    ifsc: "HDFC0001234",
    pan: "ABCDE1234F",
    uan: "100982341234",
    paymentMode: "Bank Transfer",
  });

  const selectedStaff = useMemo(() => eligibleAssignments.find((a) => a.staffId === selectedStaffId), [eligibleAssignments, selectedStaffId]);
  const selectedStruct = useMemo(() => store.structures.find((s) => s.id === selectedStructId), [store.structures, selectedStructId]);

  const handleConfirm = () => {
    if (!selectedStaff || !selectedStruct) return;
    setStore((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => (a.staffId === selectedStaffId ? {
        ...a,
        structureId: selectedStruct.id,
        structureName: selectedStruct.name,
        grossSalary: selectedStruct.grossSalary,
        totalDeductions: selectedStruct.totalDeductions,
        netSalary: selectedStruct.netSalary,
        effectiveFrom,
        status: "Active",
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        ifsc: bankDetails.ifsc,
        pan: bankDetails.pan,
        uan: bankDetails.uan,
        paymentMode: bankDetails.paymentMode,
      } : a)),
    }));
    setToast(`Salary assigned successfully to ${selectedStaff.staffName}!`);
    navigate("/dashboard/staff-salary/assignments");
  };

  return (
    <DashboardLayout
      title={`Assign Salary to ${staffType} Staff`}
      subtitle={`Configure salary structure and bank payment details for ${staffType} personnel.`}
      breadcrumb={["Home", "People", "Staff Salary Management", "Assign", staffType]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/assignments" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Assignments
        </Link>

        {/* Stepper Header */}
        <div className="salary-stepper-header">
          <div className={`salary-step-pill ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}>1. Select Staff</div>
          <ChevronRight size={14} />
          <div className={`salary-step-pill ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>2. Assign Structure</div>
          <ChevronRight size={14} />
          <div className={`salary-step-pill ${step === 3 ? "active" : step > 3 ? "completed" : ""}`}>3. Bank & Payment</div>
          <ChevronRight size={14} />
          <div className={`salary-step-pill ${step === 4 ? "active" : ""}`}>4. Review & Confirm</div>
        </div>

        <div className="salary-card-panel">
          {step === 1 && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Step 1 — Select {staffType} Staff Member</h4>
              <SearchableStaffPicker
                label="Select Staff *"
                staffList={eligibleAssignments}
                selectedId={selectedStaffId}
                onSelect={(id) => setSelectedStaffId(id)}
              />

              {selectedStaff && (
                <div className="salary-form-grid-3" style={{ marginTop: "16px", padding: "12px", background: "var(--cms-subtle)", borderRadius: "8px" }}>
                  <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Employee ID</span><div><strong>{selectedStaff.staffId}</strong></div></div>
                  <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Department</span><div><strong>{selectedStaff.department}</strong></div></div>
                  <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Designation</span><div><strong>{selectedStaff.designation}</strong></div></div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => setStep(2)}>Next: Assign Structure <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Step 2 — Choose Salary Structure</h4>
              <div className="salary-form-grid-2">
                <div className="salary-form-group">
                  <label>Salary Structure *</label>
                  <select value={selectedStructId} onChange={(e) => setSelectedStructId(e.target.value)}>
                    {store.structures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({formatINR(s.netSalary)} Net)</option>
                    ))}
                  </select>
                </div>
                <div className="salary-form-group">
                  <label>Effective From *</label>
                  <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                </div>
              </div>

              {selectedStruct && (
                <div className="breakup-row net" style={{ marginTop: "12px" }}>
                  <span>Calculated Net Salary:</span>
                  <strong style={{ fontSize: "16px", color: "#108E50" }}>{formatINR(selectedStruct.netSalary)} / month</strong>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => setStep(3)}>Next: Bank Details <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Step 3 — Bank & Statutory Details</h4>
              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Bank Name *</label>
                  <input type="text" value={bankDetails.bankName} onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>Account Number *</label>
                  <input type="text" value={bankDetails.accountNumber} onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>IFSC Code *</label>
                  <input type="text" value={bankDetails.ifsc} onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>PAN Number</label>
                  <input type="text" value={bankDetails.pan} onChange={(e) => setBankDetails({ ...bankDetails, pan: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>UAN Number</label>
                  <input type="text" value={bankDetails.uan} onChange={(e) => setBankDetails({ ...bankDetails, uan: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>Payment Mode *</label>
                  <select value={bankDetails.paymentMode} onChange={(e) => setBankDetails({ ...bankDetails, paymentMode: e.target.value })}>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setStep(2)}>Back</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={() => setStep(4)}>Next: Review <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Step 4 — Review & Confirm Assignment</h4>
              <div className="salary-form-grid-3" style={{ padding: "14px", background: "var(--cms-subtle)", borderRadius: "8px", marginBottom: "16px" }}>
                <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Staff</span><div><strong>{selectedStaff?.staffName}</strong></div></div>
                <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Structure</span><div><strong>{selectedStruct?.name}</strong></div></div>
                <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Effective From</span><div><strong>{effectiveFrom}</strong></div></div>
                <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Gross Salary</span><div><strong style={{ color: "#6F8400" }}>{formatINR(selectedStruct?.grossSalary)}</strong></div></div>
                <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Deductions</span><div><strong style={{ color: "#B7791F" }}>{formatINR(selectedStruct?.totalDeductions)}</strong></div></div>
                <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Net Salary</span><div><strong style={{ color: "#108E50" }}>{formatINR(selectedStruct?.netSalary)}</strong></div></div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setStep(3)}>Back</button>
                <button type="button" className="cms-btn cms-btn-primary" onClick={handleConfirm}><Check size={14} /> Confirm Assignment</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 7 — SALARY ASSIGNMENTS LIST
// ----------------------------------------------------------------------
function SalaryAssignmentsScreen({ store, navigate, handleHoldToggle, setToast }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get("tab");
  const [tab, setTab] = useState(tabFromQuery || "All");

  useEffect(() => {
    if (tabFromQuery && tabFromQuery !== tab) {
      setTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = Array.isArray(store?.assignments) ? store.assignments : [];
    return list.filter((a) => {
      if (!a || typeof a !== "object") return false;
      if (tab === "Teaching" && a.staffType !== "Teaching") return false;
      if (tab === "Non-Teaching" && a.staffType !== "Non-Teaching") return false;
      if (tab === "Pending" && a.status !== "Pending") return false;
      if (tab === "Active" && a.status !== "Active") return false;
      if (tab === "On Hold" && a.status !== "On Hold") return false;

      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (a.staffName || "").toLowerCase().includes(q);
        const idMatch = (a.staffId || "").toLowerCase().includes(q);
        const deptMatch = (a.department || "").toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [store?.assignments, tab, search]);

  return (
    <DashboardLayout
      title="Staff Salary Assignments"
      subtitle="Overview of salary structure assignments for all staff."
      breadcrumb={["Home", "People", "Staff Salary Management", "Assignments"]}
      actions={
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/staff-salary/assign/teaching")}>
            + Assign Teaching
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate("/dashboard/staff-salary/assign/non-teaching")}>
            + Assign Non-Teaching
          </button>
        </div>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <div className="salary-card-header" style={{ flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {["All", "Teaching", "Non-Teaching", "Active", "Pending", "On Hold"].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`cms-btn ${tab === t ? "cms-btn-primary" : "cms-btn-ghost"}`}
                  style={{ fontSize: "12px", padding: "3px 10px" }}
                  onClick={() => handleTabChange(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search staff name / ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "13px" }}
            />
          </div>

          <DataTable
            rows={filtered}
            data={filtered}
            columns={[
              { key: "staffId", label: "Employee ID" },
              { key: "staffName", label: "Staff Name" },
              { key: "staffType", label: "Type" },
              { key: "department", label: "Department" },
              { key: "structureName", label: "Assigned Structure" },
              { key: "grossSalary", label: "Gross", render: (r) => formatINR(r.grossSalary) },
              { key: "netSalary", label: "Net Monthly", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
              { key: "status", label: "Status", render: (r) => <span className={`cms-badge ${r.status === "Active" ? "cms-badge-success" : r.status === "On Hold" ? "cms-badge-warning" : "cms-badge-neutral"}`}>{r.status}</span> },
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => navigate(`/dashboard/staff-salary/assignments/${r.id}`)}>
                      <Eye size={12} /> View
                    </button>
                    <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => handleHoldToggle(r.id, r.status)}>
                      {r.status === "On Hold" ? <PlayCircle size={12} /> : <PauseCircle size={12} />} {r.status === "On Hold" ? "Un-Hold" : "Hold"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 8 — SALARY ASSIGNMENT DETAILS
// ----------------------------------------------------------------------
function SalaryAssignmentDetailsScreen({ id, store, navigate }) {
  const asgn = useMemo(() => store.assignments.find((a) => a.id === id), [id, store.assignments]);

  if (!asgn) {
    return (
      <DashboardLayout title="Assignment Not Found">
        <main className="salary-page-container">
          <p>Salary assignment not found.</p>
          <Link to="/dashboard/staff-salary/assignments" className="cms-back-link">Back to Assignments</Link>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Salary Details — ${asgn.staffName}`}
      subtitle={`Current active salary structure and bank configuration.`}
      breadcrumb={["Home", "People", "Staff Salary Management", "Assignments", asgn.staffName]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/assignments" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Assignments
        </Link>

        <div className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Employee ID</span><div><strong>{asgn.staffId}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Staff Type</span><div><strong>{asgn.staffType}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Department</span><div><strong>{asgn.department}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Designation</span><div><strong>{asgn.designation}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Salary Structure</span><div><strong>{asgn.structureName}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Gross Salary</span><div><strong style={{ color: "#6F8400" }}>{formatINR(asgn.grossSalary)}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Total Deductions</span><div><strong style={{ color: "#B7791F" }}>{formatINR(asgn.totalDeductions)}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Net Salary</span><div><strong style={{ color: "#108E50", fontSize: "16px" }}>{formatINR(asgn.netSalary)}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Status</span><div><span className="cms-badge cms-badge-success">{asgn.status}</span></div></div>
          </div>
        </div>

        <div className="salary-card-panel">
          <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Bank & Account Details</h4>
          <div className="salary-form-grid-3">
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Bank Name</span><div><strong>{asgn.bankName || "HDFC Bank"}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Account Number</span><div><strong>{asgn.accountNumber || "XXXX-XXXX-4921"}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>IFSC Code</span><div><strong>{asgn.ifsc || "HDFC0001234"}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>PAN</span><div><strong>{asgn.pan || "ABCPS1234F"}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>UAN</span><div><strong>{asgn.uan || "100982341234"}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Payment Mode</span><div><strong>{asgn.paymentMode || "Bank Transfer"}</strong></div></div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function ProcessPayrollModal({ store, setStore, onClose, setToast }) {
  const [step, setStep] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState("2026-09");
  const [workingDays, setWorkingDays] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  const summary = useMemo(() => {
    const totalGross = store.assignments.reduce((sum, a) => sum + Number(a.grossSalary || 0), 0);
    const totalDeductions = store.assignments.reduce((sum, a) => sum + Number(a.totalDeductions || 0), 0);
    const totalNet = store.assignments.reduce((sum, a) => sum + Number(a.netSalary || 0), 0);
    const processedCount = store.assignments.length;
    return { totalGross, totalDeductions, totalNet, processedCount };
  }, [store.assignments]);

  const handleRunPayroll = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const newMonth = {
        month: selectedMonth,
        label: monthLabel,
        totalGross: summary.totalGross,
        totalDeductions: summary.totalDeductions,
        totalNet: summary.totalNet,
        processedCount: summary.processedCount,
        status: "Processed",
      };

      setStore((prev) => {
        const existing = (prev.payrollMonths || []).filter((m) => m.month !== selectedMonth);
        return {
          ...prev,
          payrollMonths: [newMonth, ...existing],
        };
      });

      setIsProcessing(false);
      setToast(`Payroll for ${monthLabel} calculated and processed successfully! ${summary.processedCount} staff payslips generated.`);
      onClose();
    }, 1000);
  };

  return (
    <Modal title={`Payroll Processing Wizard — ${monthLabel}`} onClose={onClose} className="master-create-modal">
      <div style={{ padding: "8px 0" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--cms-border)", paddingBottom: "12px" }}>
          <div style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "16px", background: step === 1 ? "var(--cms-primary)" : "var(--cms-subtle)", color: step === 1 ? "#fff" : "var(--cms-text)", fontWeight: 600 }}>1. Configuration</div>
          <div style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "16px", background: step === 2 ? "var(--cms-primary)" : "var(--cms-subtle)", color: step === 2 ? "#fff" : "var(--cms-text)", fontWeight: 600 }}>2. Calculations</div>
          <div style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "16px", background: step === 3 ? "var(--cms-primary)" : "var(--cms-subtle)", color: step === 3 ? "#fff" : "var(--cms-text)", fontWeight: 600 }}>3. Process & Issue</div>
        </div>

        {step === 1 && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Step 1 — Select Target Month & Working Days</h4>
            <div className="salary-form-grid-2" style={{ marginBottom: "16px" }}>
              <div className="salary-form-group">
                <label>Select Payroll Month *</label>
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
              </div>
              <div className="salary-form-group">
                <label>Monthly Working Days</label>
                <input type="number" value={workingDays} onChange={(e) => setWorkingDays(Number(e.target.value))} />
              </div>
            </div>

            <div style={{ padding: "12px", background: "var(--cms-subtle)", borderRadius: "8px", fontSize: "12px", color: "var(--cms-text)" }}>
              <strong>Staff In Scope:</strong> {summary.processedCount} Active Staff Members ({store.assignments.filter((a) => a.staffType === "Teaching").length} Teaching, {store.assignments.filter((a) => a.staffType === "Non-Teaching").length} Non-Teaching).
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setStep(2)}>
                Next: Calculate Outflow <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Step 2 — Automated Outflow & Statutory Summary</h4>
            <div className="salary-form-grid-3" style={{ background: "var(--cms-subtle)", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
              <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Gross Salary</span><div><strong style={{ color: "#6F8400", fontSize: "16px" }}>{formatINR(summary.totalGross)}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Total Deductions (PF/ESI/PT/TDS)</span><div><strong style={{ color: "#B7791F", fontSize: "16px" }}>{formatINR(summary.totalDeductions)}</strong></div></div>
              <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Net Bank Outflow</span><div><strong style={{ color: "#108E50", fontSize: "18px" }}>{formatINR(summary.totalNet)}</strong></div></div>
            </div>

            <div style={{ fontSize: "12px", color: "var(--cms-muted)", lineHeight: 1.6 }}>
              ✓ Monthly earnings computed from active salary structures.<br />
              ✓ Employee PF (12%), ESI, Professional Tax & TDS calculated.<br />
              ✓ Attendance LOP and approved overtime automatically factored in.
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
              <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button type="button" className="cms-btn cms-btn-primary" onClick={() => setStep(3)}>
                Next: Finalize & Run <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Step 3 — Lock Payroll & Issue Payslips</h4>
            <div style={{ padding: "14px", background: "var(--cms-subtle)", borderRadius: "8px", marginBottom: "20px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Confirm Execution for {monthLabel}</div>
              <div style={{ fontSize: "12px", color: "var(--cms-muted)" }}>
                Total Net Disbursement: <strong style={{ color: "#108E50" }}>{formatINR(summary.totalNet)}</strong> across {summary.processedCount} staff accounts.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="cms-btn cms-btn-ghost" disabled={isProcessing} onClick={() => setStep(2)}>Back</button>
              <button type="button" className="cms-btn cms-btn-primary" disabled={isProcessing} onClick={handleRunPayroll}>
                {isProcessing ? "Executing Payroll & Generating Payslips..." : <><PlayCircle size={14} /> Run Payroll & Issue Payslips</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// SCREEN 9 — MONTHLY PAYROLL PROCESSING
// ----------------------------------------------------------------------
function MonthlyPayrollScreen({ store, setStore, navigate, setToast }) {
  const [selectedMonth, setSelectedMonth] = useState("2026-08");
  const [showProcessModal, setShowProcessModal] = useState(false);

  const monthData = useMemo(() => {
    return store.payrollMonths.find((m) => m.month === selectedMonth) || store.payrollMonths[0];
  }, [store.payrollMonths, selectedMonth]);

  return (
    <DashboardLayout
      title="Monthly Payroll Processing"
      subtitle="Calculate, verify and process monthly payroll run for all staff."
      breadcrumb={["Home", "People", "Staff Salary Management", "Payroll"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary" onClick={() => setShowProcessModal(true)}>
          <PlayCircle size={14} /> Calculate & Process Payroll
        </button>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-kpi-grid-4">
          <div className="salary-kpi-card">
            <div className="salary-kpi-icon"><DollarSign size={20} /></div>
            <div className="salary-kpi-data">
              <span>Gross Payroll</span>
              <strong>{formatINR(monthData.totalGross)}</strong>
            </div>
          </div>
          <div className="salary-kpi-card">
            <div className="salary-kpi-icon"><TrendingUp size={20} /></div>
            <div className="salary-kpi-data">
              <span>Total Deductions</span>
              <strong>{formatINR(monthData.totalDeductions)}</strong>
            </div>
          </div>
          <div className="salary-kpi-card">
            <div className="salary-kpi-icon"><CreditCard size={20} /></div>
            <div className="salary-kpi-data">
              <span>Net Payroll Outflow</span>
              <strong style={{ color: "#108E50" }}>{formatINR(monthData.totalNet)}</strong>
            </div>
          </div>
          <div className="salary-kpi-card">
            <div className="salary-kpi-icon"><UserCheck size={20} /></div>
            <div className="salary-kpi-data">
              <span>Processed Staff</span>
              <strong>{monthData.processedCount}</strong>
            </div>
          </div>
        </div>

        <div className="salary-card-panel">
          <div className="salary-card-header">
            <h3>Payroll Month History</h3>
          </div>
          <DataTable
            rows={store.payrollMonths}
            data={store.payrollMonths}
            columns={[
              { key: "label", label: "Month" },
              { key: "totalGross", label: "Gross Payroll", render: (r) => formatINR(r.totalGross) },
              { key: "totalDeductions", label: "Deductions", render: (r) => formatINR(r.totalDeductions) },
              { key: "totalNet", label: "Net Outflow", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.totalNet)}</strong> },
              { key: "processedCount", label: "Processed Staff", render: (r) => `${r.processedCount} Staff` },
              { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "3px 8px", fontSize: "12px" }} onClick={() => navigate(`/dashboard/staff-salary/payroll/${r.month}`)}>
                    <Eye size={12} /> View Details
                  </button>
                ),
              },
            ]}
          />
        </div>
      </main>
      {showProcessModal ? (
        <ProcessPayrollModal
          store={store}
          setStore={setStore}
          onClose={() => setShowProcessModal(false)}
          setToast={setToast}
        />
      ) : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 11 — PAYSLIP MANAGEMENT
// ----------------------------------------------------------------------
function PayslipManagementScreen({ store, navigate }) {
  return (
    <DashboardLayout
      title="Payslips"
      subtitle="View, print and download staff monthly payslips."
      breadcrumb={["Home", "People", "Staff Salary Management", "Payslips"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <DataTable
            rows={store.assignments}
            data={store.assignments}
            columns={[
              { key: "staffId", label: "Employee ID" },
              { key: "staffName", label: "Staff Name" },
              { key: "staffType", label: "Type" },
              { key: "department", label: "Department" },
              { key: "grossSalary", label: "Gross", render: (r) => formatINR(r.grossSalary) },
              { key: "netSalary", label: "Net Salary", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
              { key: "paymentMode", label: "Payment Mode", render: (r) => r.paymentMode || "Bank Transfer" },
              {
                key: "actions",
                label: "Payslip Action",
                render: (r) => (
                  <button type="button" className="cms-btn cms-btn-primary" style={{ padding: "3px 8px", fontSize: "11px" }} onClick={() => navigate(`/dashboard/staff-salary/payslips/${r.staffId}/2026-08`)}>
                    <FileText size={12} /> Preview Payslip
                  </button>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 12 — PAYSLIP PREVIEW (Printable Paper Layout)
// ----------------------------------------------------------------------
function PayslipPreviewScreen({ staffId, month, store, navigate, setToast }) {
  const asgn = useMemo(() => store.assignments.find((a) => a.staffId === staffId) || store.assignments[0], [staffId, store.assignments]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout
      title={`Payslip Preview — ${asgn.staffName}`}
      subtitle="Official monthly salary voucher."
      breadcrumb={["Home", "People", "Staff Salary Management", "Payslips", asgn.staffName]}
      actions={
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setToast("Downloading Payslip PDF...")}>
            <Download size={14} /> Download PDF
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={handlePrint}>
            <Printer size={14} /> Print Payslip
          </button>
        </div>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/payslips" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Payslips
        </Link>

        <div className="payslip-paper">
          <div className="payslip-header">
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", color: "var(--cms-text)" }}>PIRNAV COLLEGE MANAGEMENT SYSTEM</h2>
              <div style={{ fontSize: "12px", color: "var(--cms-muted)" }}>Official Monthly Staff Salary Voucher</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--cms-primary-dark)" }}>SALARY SLIP</div>
              <div style={{ fontSize: "12px", color: "var(--cms-muted)" }}>Period: August 2026</div>
            </div>
          </div>

          <div className="payslip-grid-2">
            <div>
              <div><strong>Employee Name:</strong> {asgn.staffName}</div>
              <div><strong>Employee ID:</strong> {asgn.staffId}</div>
              <div><strong>Staff Type:</strong> {asgn.staffType}</div>
              <div><strong>Department:</strong> {asgn.department}</div>
            </div>
            <div>
              <div><strong>Designation:</strong> {asgn.designation}</div>
              <div><strong>Bank Account:</strong> {asgn.accountNumber}</div>
              <div><strong>IFSC:</strong> {asgn.ifsc}</div>
              <div><strong>PAN:</strong> {asgn.pan}</div>
            </div>
          </div>

          <table className="payslip-table">
            <thead>
              <tr>
                <th>Earnings Component</th>
                <th style={{ textAlign: "right" }}>Amount (₹)</th>
                <th>Deductions Component</th>
                <th style={{ textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Pay</td>
                <td style={{ textAlign: "right" }}>{formatINR(asgn.grossSalary * 0.5)}</td>
                <td>Provident Fund (PF)</td>
                <td style={{ textAlign: "right" }}>{formatINR(asgn.totalDeductions * 0.6)}</td>
              </tr>
              <tr>
                <td>HRA</td>
                <td style={{ textAlign: "right" }}>{formatINR(asgn.grossSalary * 0.25)}</td>
                <td>Professional Tax</td>
                <td style={{ textAlign: "right" }}>₹200.00</td>
              </tr>
              <tr>
                <td>Allowances & Incentives</td>
                <td style={{ textAlign: "right" }}>{formatINR(asgn.grossSalary * 0.25)}</td>
                <td>TDS / Income Tax</td>
                <td style={{ textAlign: "right" }}>{formatINR(asgn.totalDeductions * 0.4)}</td>
              </tr>
              <tr style={{ fontWeight: 700, background: "var(--cms-subtle)" }}>
                <td>Total Gross Earnings</td>
                <td style={{ textAlign: "right", color: "#6F8400" }}>{formatINR(asgn.grossSalary)}</td>
                <td>Total Deductions</td>
                <td style={{ textAlign: "right", color: "#B7791F" }}>{formatINR(asgn.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>

          <div className="breakup-row net" style={{ margin: "20px 0" }}>
            <span>NET AMOUNT PAYABLE:</span>
            <strong style={{ fontSize: "20px", color: "#108E50" }}>{formatINR(asgn.netSalary)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", paddingTop: "20px", borderTop: "1px solid var(--cms-border)", fontSize: "11px", color: "var(--cms-muted)" }}>
            <div>This is a computer-generated payslip and requires no physical signature.</div>
            <div>PIRNAV College Finance & Accounts Division</div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 13 — SALARY REVISION HISTORY
// ----------------------------------------------------------------------
function SalaryRevisionsScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Salary Revision History"
      subtitle="Track annual increments, promotions and salary corrections."
      breadcrumb={["Home", "People", "Staff Salary Management", "Revisions"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate("/dashboard/staff-salary/revisions/add")}>
          <Plus size={14} /> Create Salary Revision
        </button>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <DataTable
            rows={store.revisions}
            data={store.revisions}
            columns={[
              { key: "staffId", label: "Employee ID" },
              { key: "staffName", label: "Staff Name" },
              { key: "previousGross", label: "Previous Gross", render: (r) => formatINR(r.previousGross) },
              { key: "newGross", label: "New Gross", render: (r) => <strong style={{ color: "#6F8400" }}>{formatINR(r.newGross)}</strong> },
              { key: "increment", label: "Increment (+%)", render: (r) => `+${formatINR(r.increment)} (${r.percent}%)` },
              { key: "reason", label: "Reason" },
              { key: "effectiveFrom", label: "Effective Date" },
              { key: "status", label: "Status", render: (r) => <span className={`cms-badge ${r.status === "Approved" ? "cms-badge-success" : "cms-badge-warning"}`}>{r.status}</span> },
              {
                key: "actions",
                label: "Action",
                render: (r) => (
                  r.status === "Pending" ? (
                    <button type="button" className="cms-btn cms-btn-primary" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => handleApproveItem("revision", r.id)}>
                      Approve
                    </button>
                  ) : <span>Approved</span>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 15 — BONUS & INCENTIVES
// ----------------------------------------------------------------------
function BonusIncentivesScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Bonus & Incentives"
      subtitle="Manage performance bonuses, festival incentives and special awards."
      breadcrumb={["Home", "People", "Staff Salary Management", "Bonus"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate("/dashboard/staff-salary/bonus/add")}>
          <Plus size={14} /> Add Bonus / Incentive
        </button>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <DataTable
            rows={store.bonuses}
            data={store.bonuses}
            columns={[
              { key: "staffId", label: "Employee ID" },
              { key: "staffName", label: "Staff Name" },
              { key: "type", label: "Bonus Type" },
              { key: "amount", label: "Amount", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.amount)}</strong> },
              { key: "month", label: "Payroll Month" },
              { key: "reason", label: "Reason / Justification" },
              { key: "status", label: "Status", render: (r) => <span className={`cms-badge ${r.status === "Approved" ? "cms-badge-success" : "cms-badge-warning"}`}>{r.status}</span> },
              {
                key: "actions",
                label: "Action",
                render: (r) => (
                  r.status === "Pending" ? (
                    <button type="button" className="cms-btn cms-btn-primary" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => handleApproveItem("bonus", r.id)}>
                      Approve
                    </button>
                  ) : <span>Approved</span>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 17 — SALARY ADVANCES & LOANS
// ----------------------------------------------------------------------
function SalaryAdvancesScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Salary Advances & Loans"
      subtitle="Track staff emergency loans, salary advances and monthly EMI recoveries."
      breadcrumb={["Home", "People", "Staff Salary Management", "Loans"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate("/dashboard/staff-salary/advances/add")}>
          <Plus size={14} /> Add Salary Advance / Loan
        </button>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <DataTable
            rows={store.loans}
            data={store.loans}
            columns={[
              { key: "staffId", label: "Employee ID" },
              { key: "staffName", label: "Staff Name" },
              { key: "type", label: "Loan Type" },
              { key: "approvedAmount", label: "Loan Amount", render: (r) => formatINR(r.approvedAmount) },
              { key: "emi", label: "Monthly EMI", render: (r) => formatINR(r.emi) },
              { key: "recovered", label: "Recovered", render: (r) => formatINR(r.recovered) },
              { key: "pending", label: "Pending Balance", render: (r) => <strong style={{ color: "#B7791F" }}>{formatINR(r.pending)}</strong> },
              { key: "status", label: "Status", render: (r) => <span className={`cms-badge ${r.status === "Active" ? "cms-badge-success" : "cms-badge-warning"}`}>{r.status}</span> },
              {
                key: "actions",
                label: "Action",
                render: (r) => (
                  r.status === "Pending" ? (
                    <button type="button" className="cms-btn cms-btn-primary" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => handleApproveItem("loan", r.id)}>
                      Approve Loan
                    </button>
                  ) : <span>Active EMI</span>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 18 — REIMBURSEMENTS
// ----------------------------------------------------------------------
function ReimbursementsScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Reimbursements"
      subtitle="Process staff travel, medical, research and official expense claims."
      breadcrumb={["Home", "People", "Staff Salary Management", "Reimbursements"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate("/dashboard/staff-salary/reimbursements/add")}>
          <Plus size={14} /> Add Reimbursement
        </button>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <DataTable
            rows={store.reimbursements}
            data={store.reimbursements}
            columns={[
              { key: "staffId", label: "Employee ID" },
              { key: "staffName", label: "Staff Name" },
              { key: "type", label: "Claim Type" },
              { key: "claimAmount", label: "Claimed Amount", render: (r) => formatINR(r.claimAmount) },
              { key: "claimDate", label: "Claim Date" },
              { key: "month", label: "Payroll Month" },
              { key: "status", label: "Status", render: (r) => <span className={`cms-badge ${r.status === "Approved" ? "cms-badge-success" : "cms-badge-warning"}`}>{r.status}</span> },
              {
                key: "actions",
                label: "Action",
                render: (r) => (
                  r.status === "Pending" ? (
                    <button type="button" className="cms-btn cms-btn-primary" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => handleApproveItem("reimbursement", r.id)}>
                      Approve
                    </button>
                  ) : <span>Approved</span>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 19 — PAYROLL APPROVALS
// ----------------------------------------------------------------------
function PayrollApprovalsScreen({ store, handleApproveItem, navigate }) {
  const pendingRevisions = store.revisions.filter((r) => r.status === "Pending");
  const pendingBonuses = store.bonuses.filter((b) => b.status === "Pending");
  const pendingLoans = store.loans.filter((l) => l.status === "Pending");
  const pendingReimb = store.reimbursements.filter((rm) => rm.status === "Pending");

  return (
    <DashboardLayout
      title="Payroll Approvals"
      subtitle="Review pending approvals for salary revisions, bonuses, loans and reimbursements."
      breadcrumb={["Home", "People", "Staff Salary Management", "Approvals"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel">
          <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Pending Revisions ({pendingRevisions.length})</h4>
          <DataTable
            rows={pendingRevisions}
            data={pendingRevisions}
            columns={[
              { key: "staffName", label: "Staff Name" },
              { key: "previousGross", label: "Previous Gross", render: (r) => formatINR(r.previousGross) },
              { key: "newGross", label: "Proposed Gross", render: (r) => formatINR(r.newGross) },
              { key: "reason", label: "Reason" },
              {
                key: "actions",
                label: "Action",
                render: (r) => (
                  <button type="button" className="cms-btn cms-btn-primary" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => handleApproveItem("revision", r.id)}>
                    Approve Revision
                  </button>
                ),
              },
            ]}
          />
        </div>

        <div className="salary-card-panel">
          <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Pending Bonus Claims ({pendingBonuses.length})</h4>
          <DataTable
            rows={pendingBonuses}
            data={pendingBonuses}
            columns={[
              { key: "staffName", label: "Staff Name" },
              { key: "type", label: "Bonus Type" },
              { key: "amount", label: "Amount", render: (r) => formatINR(r.amount) },
              { key: "reason", label: "Reason" },
              {
                key: "actions",
                label: "Action",
                render: (r) => (
                  <button type="button" className="cms-btn cms-btn-primary" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => handleApproveItem("bonus", r.id)}>
                    Approve Bonus
                  </button>
                ),
              },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 20 — PAYROLL REPORTS & ANALYTICS
// ----------------------------------------------------------------------
function ReportViewerModal({ title, store, onClose, setToast }) {
  const [search, setSearch] = useState("");

  const reportData = useMemo(() => {
    const assignments = Array.isArray(store?.assignments) ? store.assignments : [];
    const lowerTitle = (title || "").toLowerCase();

    if (lowerTitle.includes("teaching staff") && !lowerTitle.includes("non-teaching")) {
      return assignments.filter((a) => a.staffType === "Teaching");
    }
    if (lowerTitle.includes("non-teaching")) {
      return assignments.filter((a) => a.staffType === "Non-Teaching");
    }
    if (lowerTitle.includes("provident fund")) {
      return assignments.map((a) => ({
        staffId: a.staffId,
        staffName: a.staffName,
        uan: a.uan || "100982341234",
        basicPay: a.basicPay || 50000,
        employeePf: Math.round((a.basicPay || 50000) * 0.12),
        employerPf: Math.round((a.basicPay || 50000) * 0.12),
        totalPf: Math.round((a.basicPay || 50000) * 0.24),
      }));
    }
    if (lowerTitle.includes("esi")) {
      return assignments.map((a) => ({
        staffId: a.staffId,
        staffName: a.staffName,
        grossSalary: a.grossSalary || 65000,
        employeeEsi: Math.round((a.grossSalary || 65000) * 0.0075),
        employerEsi: Math.round((a.grossSalary || 65000) * 0.0325),
        totalEsi: Math.round((a.grossSalary || 65000) * 0.04),
      }));
    }
    if (lowerTitle.includes("tds")) {
      return assignments.map((a) => ({
        staffId: a.staffId,
        staffName: a.staffName,
        pan: a.pan || "ABCPS1234F",
        annualGross: (a.grossSalary || 65000) * 12,
        taxableIncome: ((a.grossSalary || 65000) * 12) - 75000,
        monthlyTds: a.tds || 3500,
      }));
    }
    if (lowerTitle.includes("professional tax")) {
      return assignments.map((a) => ({
        staffId: a.staffId,
        staffName: a.staffName,
        department: a.department || "Physics",
        grossSalary: a.grossSalary || 65000,
        pt: a.professionalTax || 200,
      }));
    }
    if (lowerTitle.includes("loss of pay")) {
      return assignments.map((a, i) => ({
        staffId: a.staffId,
        staffName: a.staffName,
        department: a.department || "Physics",
        workingDays: 30,
        lopDays: (i % 3),
        lopDeduction: calculateLOP(a.grossSalary || 65000, 30, i % 3),
      }));
    }
    if (lowerTitle.includes("overtime")) {
      return Array.isArray(store?.overtime) ? store.overtime : [];
    }
    if (lowerTitle.includes("bonus")) {
      return Array.isArray(store?.bonuses) ? store.bonuses : [];
    }
    if (lowerTitle.includes("advance") || lowerTitle.includes("loan")) {
      return Array.isArray(store?.loans) ? store.loans : [];
    }
    if (lowerTitle.includes("reimbursement")) {
      return Array.isArray(store?.reimbursements) ? store.reimbursements : [];
    }

    return assignments;
  }, [title, store]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return reportData;
    const q = search.toLowerCase();
    return reportData.filter((r) =>
      Object.values(r).some((val) => String(val ?? "").toLowerCase().includes(q))
    );
  }, [reportData, search]);

  const columns = useMemo(() => {
    const lowerTitle = (title || "").toLowerCase();

    if (lowerTitle.includes("provident fund")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "uan", label: "UAN Number" },
        { key: "employeePf", label: "Employee PF (12%)", render: (r) => formatINR(r.employeePf) },
        { key: "employerPf", label: "Employer PF (12%)", render: (r) => formatINR(r.employerPf) },
        { key: "totalPf", label: "Total PF Remittance", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.totalPf)}</strong> },
      ];
    }
    if (lowerTitle.includes("esi")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "grossSalary", label: "Gross Salary", render: (r) => formatINR(r.grossSalary) },
        { key: "employeeEsi", label: "Employee ESI (0.75%)", render: (r) => formatINR(r.employeeEsi) },
        { key: "employerEsi", label: "Employer ESI (3.25%)", render: (r) => formatINR(r.employerEsi) },
        { key: "totalEsi", label: "Total ESI", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.totalEsi)}</strong> },
      ];
    }
    if (lowerTitle.includes("tds")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "pan", label: "PAN" },
        { key: "annualGross", label: "Annual Gross", render: (r) => formatINR(r.annualGross) },
        { key: "taxableIncome", label: "Taxable Income", render: (r) => formatINR(r.taxableIncome) },
        { key: "monthlyTds", label: "Monthly TDS", render: (r) => <strong style={{ color: "#B7791F" }}>{formatINR(r.monthlyTds)}</strong> },
      ];
    }
    if (lowerTitle.includes("loss of pay")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "department", label: "Department" },
        { key: "workingDays", label: "Working Days", render: () => "30 Days" },
        { key: "lopDays", label: "LOP Days", render: (r) => `${r.lopDays} Days` },
        { key: "lopDeduction", label: "LOP Deduction", render: (r) => <strong style={{ color: "#D93636" }}>{formatINR(r.lopDeduction)}</strong> },
      ];
    }
    if (lowerTitle.includes("overtime")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "date", label: "Date" },
        { key: "hours", label: "OT Hours", render: (r) => `${r.hours} hrs` },
        { key: "rate", label: "Hourly Rate", render: (r) => `₹${r.rate}/hr` },
        { key: "amount", label: "OT Amount", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.amount)}</strong> },
      ];
    }
    if (lowerTitle.includes("bonus")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "bonusType", label: "Bonus Type" },
        { key: "amount", label: "Bonus Amount", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.amount)}</strong> },
        { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
      ];
    }
    if (lowerTitle.includes("advance") || lowerTitle.includes("loan")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "type", label: "Loan Type" },
        { key: "approvedAmount", label: "Loan Amount", render: (r) => formatINR(r.approvedAmount) },
        { key: "emi", label: "Monthly EMI", render: (r) => formatINR(r.emi) },
        { key: "pending", label: "Pending Balance", render: (r) => <strong style={{ color: "#B7791F" }}>{formatINR(r.pending)}</strong> },
      ];
    }
    if (lowerTitle.includes("reimbursement")) {
      return [
        { key: "staffId", label: "Employee ID" },
        { key: "staffName", label: "Staff Name" },
        { key: "type", label: "Claim Type" },
        { key: "claimAmount", label: "Claimed Amount", render: (r) => formatINR(r.claimAmount) },
        { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
      ];
    }

    return [
      { key: "staffId", label: "Employee ID" },
      { key: "staffName", label: "Staff Name" },
      { key: "staffType", label: "Type" },
      { key: "department", label: "Department" },
      { key: "grossSalary", label: "Gross", render: (r) => formatINR(r.grossSalary) },
      { key: "totalDeductions", label: "Deductions", render: (r) => formatINR(r.totalDeductions) },
      { key: "netSalary", label: "Net Pay", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
    ];
  }, [title]);

  const handleExportExcel = () => {
    setToast(`Exported ${title} to Excel (.xlsx) successfully!`);
  };

  return (
    <Modal title={`${title} — August 2026`} onClose={onClose} className="master-create-modal">
      <div style={{ padding: "8px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search report data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "13px", width: "240px" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="cms-btn cms-btn-primary" style={{ fontSize: "12px" }} onClick={handleExportExcel}>
              <Download size={13} /> Export Excel
            </button>
            <button type="button" className="cms-btn cms-btn-ghost" style={{ fontSize: "12px" }} onClick={() => window.print()}>
              <Printer size={13} /> Print Report
            </button>
          </div>
        </div>

        <DataTable
          rows={filteredData}
          data={filteredData}
          enableExport={false}
          columns={columns}
        />
      </div>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// SCREEN 20 — PAYROLL REPORTS & ANALYTICS
// ----------------------------------------------------------------------
function PayrollReportsScreen({ store, navigate, setToast }) {
  const [activeReport, setActiveReport] = useState(null);

  const reportTitles = [
    "Payroll Summary Report",
    "Teaching Staff Salary Report",
    "Non-Teaching Staff Salary Report",
    "Provident Fund (PF) Report",
    "ESI Contribution Report",
    "TDS Tax Report",
    "Professional Tax Report",
    "Loss of Pay (LOP) Report",
    "Overtime Summary Report",
    "Bonus & Incentive Report",
    "Salary Advance / Loan Report",
    "Reimbursement Claims Report",
  ];

  return (
    <DashboardLayout
      title="Payroll Reports & Analytics"
      subtitle="Export and view statutory payroll summaries, PF, ESI, TDS, and departmental reports."
      breadcrumb={["Home", "People", "Staff Salary Management", "Reports"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-kpi-grid-4">
          {reportTitles.map((title) => (
            <div
              key={title}
              className="salary-kpi-card"
              style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px" }}
              onClick={() => setActiveReport(title)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                <FileText size={18} style={{ color: "var(--cms-primary-dark)" }} />
                <span style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1.3 }}>{title}</span>
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "auto", width: "100%" }}>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  style={{ padding: "4px 8px", fontSize: "11px", flex: 1, justifyContent: "center" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveReport(title);
                  }}
                >
                  <Eye size={12} /> Preview
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  style={{ padding: "4px 8px", fontSize: "11px", flex: 1, justifyContent: "center" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setToast(`Exported ${title} to Excel (.xlsx) successfully!`);
                  }}
                >
                  <Download size={12} /> Export
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {activeReport ? (
        <ReportViewerModal
          title={activeReport}
          store={store}
          onClose={() => setActiveReport(null)}
          setToast={setToast}
        />
      ) : null}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 21 — PAYROLL SETTINGS
// ----------------------------------------------------------------------
function PayrollSettingsScreen({ store, setStore, navigate, setToast }) {
  const [settings, setSettings] = useState(store.settings);

  const handleSave = (e) => {
    e.preventDefault();
    setStore((prev) => ({ ...prev, settings }));
    setToast("Payroll Settings saved successfully!");
  };

  return (
    <DashboardLayout
      title="Payroll Settings"
      subtitle="Configure statutory rates, working days rules, and payslip layout defaults."
      breadcrumb={["Home", "People", "Staff Salary Management", "Settings"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <form onSubmit={handleSave} className="salary-card-panel">
          <div className="salary-form-section-title">General Payroll Rules</div>
          <div className="salary-form-grid-3">
            <div className="salary-form-group">
              <label>Default Monthly Working Days</label>
              <input type="number" value={settings.defaultWorkingDays} onChange={(e) => setSettings({ ...settings, defaultWorkingDays: Number(e.target.value) })} />
            </div>
            <div className="salary-form-group">
              <label>Financial Year</label>
              <input type="text" value={settings.financialYear} onChange={(e) => setSettings({ ...settings, financialYear: e.target.value })} />
            </div>
            <div className="salary-form-group">
              <label>Default Payment Mode</label>
              <select value={settings.defaultPaymentMode} onChange={(e) => setSettings({ ...settings, defaultPaymentMode: e.target.value })}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="salary-form-section-title">Statutory Rates (PF / ESI)</div>
          <div className="salary-form-grid-3">
            <div className="salary-form-group">
              <label>Employee PF Rate (%)</label>
              <input type="number" step="0.1" value={settings.employeePFPercent} onChange={(e) => setSettings({ ...settings, employeePFPercent: Number(e.target.value) })} />
            </div>
            <div className="salary-form-group">
              <label>Employer PF Rate (%)</label>
              <input type="number" step="0.1" value={settings.employerPFPercent} onChange={(e) => setSettings({ ...settings, employerPFPercent: Number(e.target.value) })} />
            </div>
            <div className="salary-form-group">
              <label>Overtime Hourly Rate (₹)</label>
              <input type="number" value={settings.overtimeRate} onChange={(e) => setSettings({ ...settings, overtimeRate: Number(e.target.value) })} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
            <button type="submit" className="cms-btn cms-btn-primary"><Check size={14} /> Save Settings</button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN 22 — EXCEL IMPORT
// ----------------------------------------------------------------------
function SalaryImportScreen({ navigate, setToast }) {
  return (
    <DashboardLayout
      title="Import Salary Data"
      subtitle="Bulk upload staff salary structures and bank assignment details from Excel / CSV."
      breadcrumb={["Home", "People", "Staff Salary Management", "Import"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Dashboard
        </Link>

        <div className="salary-card-panel" style={{ textAlign: "center", padding: "40px" }}>
          <Upload size={36} style={{ color: "var(--cms-primary-dark)", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 8px" }}>Upload Salary Master Excel File</h3>
          <p style={{ color: "var(--cms-muted)", fontSize: "13px", marginBottom: "20px" }}>
            Select a `.xlsx` or `.csv` file containing salary structures or staff assignments.
          </p>

          <input type="file" accept=".csv, .xlsx, .xls" style={{ marginBottom: "20px" }} />

          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setToast("Template downloaded")}>
              <Download size={14} /> Download Sample Template
            </button>
            <button type="button" className="cms-btn cms-btn-primary" onClick={() => setToast("Mock import process completed! 27 records imported.")}>
              Upload & Import Records
            </button>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

// Additional Helper Components for Adding Revisions, Bonus, Advances, Reimbursements
function AddSalaryRevisionScreen({ store, setStore, navigate, setToast }) {
  const [formData, setFormData] = useState({
    staffId: store.assignments[0]?.staffId || "",
    newGross: 80000,
    effectiveFrom: "2026-09-01",
    reason: "Annual Increment",
  });

  const staff = useMemo(() => store.assignments.find((a) => a.staffId === formData.staffId), [store.assignments, formData.staffId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!staff) return;
    const prevGross = staff.grossSalary || 60000;
    const inc = formData.newGross - prevGross;
    const percent = Math.round((inc / prevGross) * 100);

    const newRev = {
      id: `rev-${Date.now()}`,
      staffId: staff.staffId,
      staffName: staff.staffName,
      previousGross: prevGross,
      newGross: formData.newGross,
      increment: inc,
      percent,
      effectiveFrom: formData.effectiveFrom,
      reason: formData.reason,
      status: "Approved",
      approvedBy: "Admin",
    };

    setStore((prev) => ({ ...prev, revisions: [newRev, ...prev.revisions] }));
    setToast("Salary revision created!");
    navigate("/dashboard/staff-salary/revisions");
  };

  return (
    <DashboardLayout title="Create Salary Revision" breadcrumb={["Home", "People", "Staff Salary Management", "Revisions", "Create"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/revisions" className="cms-back-link"><ArrowLeft size={14} /> Back to Revisions</Link>
        <form onSubmit={handleSubmit} className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div className="salary-form-group">
              <label>Select Staff *</label>
              <select value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
                {store.assignments.map((a) => (<option key={a.staffId} value={a.staffId}>{a.staffId} — {a.staffName}</option>))}
              </select>
            </div>
            <div className="salary-form-group">
              <label>New Gross Salary (₹) *</label>
              <input type="number" required value={formData.newGross} onChange={(e) => setFormData({ ...formData, newGross: Number(e.target.value) })} />
            </div>
            <div className="salary-form-group">
              <label>Effective Date *</label>
              <input type="date" required value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} />
            </div>
            <div className="salary-form-group">
              <label>Reason *</label>
              <select value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })}>
                <option value="Annual Increment">Annual Increment</option>
                <option value="Promotion">Promotion</option>
                <option value="Performance">Performance</option>
                <option value="Correction">Correction</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="submit" className="cms-btn cms-btn-primary">Save Revision</button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

function AddBonusScreen({ store, setStore, navigate, setToast }) {
  const [formData, setFormData] = useState({ staffId: store.assignments[0]?.staffId || "", type: "Performance Bonus", amount: 5000, month: "2026-08", reason: "Good Performance" });

  const handleSubmit = (e) => {
    e.preventDefault();
    const staff = store.assignments.find((a) => a.staffId === formData.staffId);
    const newBon = { id: `bon-${Date.now()}`, staffId: formData.staffId, staffName: staff?.staffName || "Staff", ...formData, status: "Approved", approvedBy: "Admin" };
    setStore((prev) => ({ ...prev, bonuses: [newBon, ...prev.bonuses] }));
    setToast("Bonus added successfully!");
    navigate("/dashboard/staff-salary/bonus");
  };

  return (
    <DashboardLayout title="Add Bonus / Incentive" breadcrumb={["Home", "People", "Staff Salary Management", "Bonus", "Add"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/bonus" className="cms-back-link"><ArrowLeft size={14} /> Back to Bonus</Link>
        <form onSubmit={handleSubmit} className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div className="salary-form-group">
              <label>Staff Member *</label>
              <select value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
                {store.assignments.map((a) => (<option key={a.staffId} value={a.staffId}>{a.staffId} — {a.staffName}</option>))}
              </select>
            </div>
            <div className="salary-form-group">
              <label>Bonus Type *</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="Performance Bonus">Performance Bonus</option>
                <option value="Festival Bonus">Festival Bonus</option>
                <option value="Academic Performance">Academic Performance</option>
                <option value="Exam Duty">Exam Duty</option>
              </select>
            </div>
            <div className="salary-form-group">
              <label>Amount (₹) *</label>
              <input type="number" required value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} />
            </div>
            <div className="salary-form-group">
              <label>Reason *</label>
              <input type="text" required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="submit" className="cms-btn cms-btn-primary">Save Bonus</button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

function AddSalaryAdvanceScreen({ store, setStore, navigate, setToast }) {
  const [formData, setFormData] = useState({ staffId: store.assignments[0]?.staffId || "", type: "Salary Advance", approvedAmount: 20000, emi: 10000, totalInstallments: 2 });

  const handleSubmit = (e) => {
    e.preventDefault();
    const staff = store.assignments.find((a) => a.staffId === formData.staffId);
    const newLoan = { id: `loan-${Date.now()}`, staffId: formData.staffId, staffName: staff?.staffName || "Staff", ...formData, requestedAmount: formData.approvedAmount, recovered: 0, pending: formData.approvedAmount, startMonth: "2026-09", status: "Active" };
    setStore((prev) => ({ ...prev, loans: [newLoan, ...prev.loans] }));
    setToast("Salary advance approved!");
    navigate("/dashboard/staff-salary/advances");
  };

  return (
    <DashboardLayout title="Add Salary Advance / Loan" breadcrumb={["Home", "People", "Staff Salary Management", "Loans", "Add"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/advances" className="cms-back-link"><ArrowLeft size={14} /> Back to Advances</Link>
        <form onSubmit={handleSubmit} className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div className="salary-form-group">
              <label>Staff Member *</label>
              <select value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
                {store.assignments.map((a) => (<option key={a.staffId} value={a.staffId}>{a.staffId} — {a.staffName}</option>))}
              </select>
            </div>
            <div className="salary-form-group">
              <label>Loan Type *</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="Salary Advance">Salary Advance</option>
                <option value="Staff Loan">Staff Loan</option>
                <option value="Emergency Loan">Emergency Loan</option>
              </select>
            </div>
            <div className="salary-form-group">
              <label>Approved Amount (₹) *</label>
              <input type="number" required value={formData.approvedAmount} onChange={(e) => setFormData({ ...formData, approvedAmount: Number(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="submit" className="cms-btn cms-btn-primary">Approve Advance</button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

function AddReimbursementScreen({ store, setStore, navigate, setToast }) {
  const [formData, setFormData] = useState({ staffId: store.assignments[0]?.staffId || "", type: "Official Expense", claimAmount: 3500, month: "2026-08" });

  const handleSubmit = (e) => {
    e.preventDefault();
    const staff = store.assignments.find((a) => a.staffId === formData.staffId);
    const newReimb = { id: `reimb-${Date.now()}`, staffId: formData.staffId, staffName: staff?.staffName || "Staff", approvedAmount: formData.claimAmount, claimDate: "2026-08-25", ...formData, status: "Approved" };
    setStore((prev) => ({ ...prev, reimbursements: [newReimb, ...prev.reimbursements] }));
    setToast("Reimbursement claim submitted!");
    navigate("/dashboard/staff-salary/reimbursements");
  };

  return (
    <DashboardLayout title="Add Reimbursement Claim" breadcrumb={["Home", "People", "Staff Salary Management", "Reimbursements", "Add"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/reimbursements" className="cms-back-link"><ArrowLeft size={14} /> Back to Reimbursements</Link>
        <form onSubmit={handleSubmit} className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div className="salary-form-group">
              <label>Staff Member *</label>
              <select value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
                {store.assignments.map((a) => (<option key={a.staffId} value={a.staffId}>{a.staffId} — {a.staffName}</option>))}
              </select>
            </div>
            <div className="salary-form-group">
              <label>Claim Type *</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                <option value="Official Expense">Official Expense</option>
                <option value="Academic Conference">Academic Conference</option>
                <option value="Fuel & Maintenance">Fuel & Maintenance</option>
                <option value="Books & Journal">Books & Journal</option>
              </select>
            </div>
            <div className="salary-form-group">
              <label>Claim Amount (₹) *</label>
              <input type="number" required value={formData.claimAmount} onChange={(e) => setFormData({ ...formData, claimAmount: Number(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="submit" className="cms-btn cms-btn-primary">Submit Claim</button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

function EditSalaryStructureScreen({ id, store, setStore, navigate, setToast }) {
  const struct = store.structures.find((s) => s.id === id);
  const [formData, setFormData] = useState(struct || {});

  const defaultDepartments = useMemo(() => [
    "Computer Science", "Mathematics", "Physics", "Chemistry", "English",
    "Administration", "Accounts", "Library", "Maintenance", "Transport",
    "Electronics", "Mechanical Engineering", "Civil Engineering", "Commerce"
  ], []);

  const departmentOptions = useMemo(() => {
    let saved = [];
    try {
      saved = JSON.parse(sessionStorage.getItem("pjc-ui-departments") || "[]")
        .map((item) => item.name)
        .filter(Boolean);
    } catch {}
    return Array.from(new Set([...saved, ...defaultDepartments]));
  }, [defaultDepartments]);

  const defaultDesignations = useMemo(() => [
    "HOD", "Professor", "Associate Professor", "Assistant Professor",
    "Senior Lecturer", "Junior Lecturer", "Lecturer", "Lab Technician",
    "Administrative Officer", "Accountant", "Librarian", "Office Assistant",
    "System Administrator", "Physical Director"
  ], []);

  if (!struct) return <div>Not Found</div>;

  const handleSubmit = (e) => {
    e.preventDefault();
    setStore((prev) => ({
      ...prev,
      structures: prev.structures.map((s) => (s.id === id ? { ...s, ...formData } : s)),
    }));
    setToast("Salary Structure updated!");
    navigate("/dashboard/staff-salary/structures");
  };

  return (
    <DashboardLayout title={`Edit ${struct.name}`} breadcrumb={["Home", "People", "Staff Salary Management", "Structures", "Edit"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/structures" className="cms-back-link"><ArrowLeft size={14} /> Back to Structures</Link>
        <form onSubmit={handleSubmit} className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div className="salary-form-group"><label>Structure Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <SearchableInputPicker
              label="Department"
              placeholder="Search department..."
              value={formData.department}
              options={departmentOptions}
              onChange={(val) => setFormData({ ...formData, department: val })}
            />
            <SearchableInputPicker
              label="Designation"
              placeholder="Search designation..."
              value={formData.designation}
              options={defaultDesignations}
              onChange={(val) => setFormData({ ...formData, designation: val })}
            />
            <div className="salary-form-group"><label>Basic Pay</label><input type="number" value={formData.basicPay} onChange={(e) => setFormData({ ...formData, basicPay: Number(e.target.value) })} /></div>
            <div className="salary-form-group"><label>Status</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="submit" className="cms-btn cms-btn-primary">Save Changes</button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

function EditSalaryAssignmentScreen({ id, store, setStore, navigate, setToast }) {
  const asgn = store.assignments.find((a) => a.id === id);
  const [formData, setFormData] = useState(asgn || {});

  if (!asgn) return <div>Not Found</div>;

  const handleSubmit = (e) => {
    e.preventDefault();
    setStore((prev) => ({
      ...prev,
      assignments: prev.assignments.map((a) => (a.id === id ? { ...a, ...formData } : a)),
    }));
    setToast("Salary Assignment updated!");
    navigate("/dashboard/staff-salary/assignments");
  };

  return (
    <DashboardLayout title={`Edit Salary — ${asgn.staffName}`} breadcrumb={["Home", "People", "Staff Salary Management", "Assignments", "Edit"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/assignments" className="cms-back-link"><ArrowLeft size={14} /> Back to Assignments</Link>
        <form onSubmit={handleSubmit} className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div className="salary-form-group"><label>Gross Salary</label><input type="number" value={formData.grossSalary} onChange={(e) => setFormData({ ...formData, grossSalary: Number(e.target.value) })} /></div>
            <div className="salary-form-group"><label>Total Deductions</label><input type="number" value={formData.totalDeductions} onChange={(e) => setFormData({ ...formData, totalDeductions: Number(e.target.value) })} /></div>
            <div className="salary-form-group"><label>Net Salary</label><input type="number" value={formData.netSalary} onChange={(e) => setFormData({ ...formData, netSalary: Number(e.target.value) })} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button type="submit" className="cms-btn cms-btn-primary">Save Assignment</button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

function PayrollMonthViewScreen({ month, store, navigate }) {
  return (
    <DashboardLayout title={`Payroll Details — ${month}`} breadcrumb={["Home", "People", "Staff Salary Management", "Payroll", month]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <DataTable rows={store.assignments} data={store.assignments} columns={[
            { key: "staffId", label: "Employee ID" },
            { key: "staffName", label: "Staff Name" },
            { key: "staffType", label: "Staff Type" },
            { key: "grossSalary", label: "Gross", render: (r) => formatINR(r.grossSalary) },
            { key: "netSalary", label: "Net Salary", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
            { key: "status", label: "Payment Status", render: (r) => <span className="cms-badge cms-badge-success">Paid</span> },
            { key: "actions", label: "Action", render: (r) => <button className="cms-btn cms-btn-ghost" style={{ padding: "2px 6px", fontSize: "11px" }} onClick={() => navigate(`/dashboard/staff-salary/payroll/${month}/${r.staffId}`)}><Eye size={12} /> View</button> },
          ]} />
        </div>
      </main>
    </DashboardLayout>
  );
}

function IndividualPayrollScreen({ month, staffId, store }) {
  const asgn = store.assignments.find((a) => a.staffId === staffId) || store.assignments[0];
  return (
    <DashboardLayout title={`Payroll — ${asgn.staffName}`} breadcrumb={["Home", "People", "Staff Salary Management", "Payroll", month, asgn.staffName]}>
      <main className="salary-page-container">
        <Link to={`/dashboard/staff-salary/payroll/${month}`} className="cms-back-link"><ArrowLeft size={14} /> Back to Month Payroll</Link>
        <div className="salary-card-panel">
          <div className="salary-form-grid-3">
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Employee ID</span><div><strong>{asgn.staffId}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Staff Name</span><div><strong>{asgn.staffName}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Payroll Month</span><div><strong>{month}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Gross Salary</span><div><strong style={{ color: "#6F8400" }}>{formatINR(asgn.grossSalary)}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Deductions</span><div><strong style={{ color: "#B7791F" }}>{formatINR(asgn.totalDeductions)}</strong></div></div>
            <div><span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>Net Salary</span><div><strong style={{ color: "#108E50", fontSize: "16px" }}>{formatINR(asgn.netSalary)}</strong></div></div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function AttendanceImpactScreen({ store }) {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [monthParams, setMonthParams] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  useEffect(() => {
    setLoading(true);
    import('@/api/attendanceService.js').then(({ attendanceService }) => {
      attendanceService.getStaffMonthlyReport(monthParams)
        .then(res => {
          const data = res?.data?.data || res?.data || res || [];
          const rows = data.staffRows || data.rows || [];
          
          const enriched = store.assignments.map(a => {
            const att = rows.find(r => (r.facultyId || r.staffId || r.id) === a.staffId) || {};
            const workingDays = att.workingDays || 30;
            const present = att.present || 30;
            const lopDays = Math.max(0, workingDays - present);
            const lopDeduction = calculateLOP(a.grossSalary || 0, workingDays, lopDays);
            return {
              ...a,
              workingDays,
              lopDays,
              lopDeduction,
              netImpact: (a.netSalary || 0) - lopDeduction
            };
          });
          setReport(enriched);
        })
        .catch(() => {
          setReport(store.assignments.map((a, i) => ({
            ...a,
            workingDays: 30,
            lopDays: i % 3,
            lopDeduction: calculateLOP(a.grossSalary || 0, 30, i % 3),
            netImpact: (a.netSalary || 0) - calculateLOP(a.grossSalary || 0, 30, i % 3)
          })));
        })
        .finally(() => setLoading(false));
    });
  }, [store.assignments, monthParams]);

  return (
    <DashboardLayout title="Attendance / LOP Impact" breadcrumb={["Home", "People", "Staff Salary Management", "Attendance Impact"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link"><ArrowLeft size={14} /> Back to Salary Dashboard</Link>
        <div className="salary-card-panel">
          <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
            <label>Select Month:</label>
            <input type="month" value={`${monthParams.year}-${String(monthParams.month).padStart(2, '0')}`} onChange={(e) => {
              const [y, m] = e.target.value.split('-');
              setMonthParams({ year: Number(y), month: Number(m) });
            }} />
          </div>
          {loading ? <div>Loading attendance impact...</div> : (
          <DataTable rows={report} data={report} columns={[
            { key: "staffId", label: "Employee ID" },
            { key: "staffName", label: "Staff Name" },
            { key: "grossSalary", label: "Gross Salary", render: (r) => formatINR(r.grossSalary) },
            { key: "workingDays", label: "Working Days", render: (r) => `${r.workingDays} Days` },
            { key: "lopDays", label: "LOP Days", render: (r) => `${r.lopDays} Days` },
            { key: "lopDeduction", label: "LOP Deduction", render: (r) => formatINR(r.lopDeduction) },
            { key: "netImpact", label: "Adjusted Net", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netImpact)}</strong> },
          ]} />
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}

function OvertimeManagementScreen({ store, setToast }) {
  return (
    <DashboardLayout title="Overtime Management" breadcrumb={["Home", "People", "Staff Salary Management", "Overtime"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/staff-salary" className="cms-back-link"><ArrowLeft size={14} /> Back to Salary Dashboard</Link>
        <div className="salary-card-panel">
          <DataTable rows={store.overtime} data={store.overtime} columns={[
            { key: "staffId", label: "Employee ID" },
            { key: "staffName", label: "Staff Name" },
            { key: "date", label: "Date" },
            { key: "hours", label: "Hours", render: (r) => `${r.hours} hrs` },
            { key: "rate", label: "Hourly Rate", render: (r) => `₹${r.rate}/hr` },
            { key: "amount", label: "Total Amount", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.amount)}</strong> },
            { key: "reason", label: "Reason" },
            { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
          ]} />
        </div>
      </main>
    </DashboardLayout>
  );
}

