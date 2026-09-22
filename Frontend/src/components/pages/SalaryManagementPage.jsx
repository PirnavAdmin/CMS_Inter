import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Wallet, DollarSign, Plus, Upload, Download, Printer, Eye, Edit3, Trash2, CheckCircle,
  XCircle, Clock, FileText, UserCheck, ShieldAlert, Award, Calendar, RefreshCw, Filter,
  Search, ArrowLeft, Copy, Sparkles, TrendingUp, AlertTriangle, ChevronRight, Layers,
  CreditCard, Check, Building2, UserX, PauseCircle, PlayCircle, Receipt, Mail, Send,
  FileSpreadsheet, Sliders, ChevronDown, CheckSquare, Square
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

export default function SalaryManagementPage({ mode = "payroll" }) {
  const navigate = useNavigate();
  const { id, month, staffId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [store, setStore] = useState(loadSalaryData);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewingPayslip, setViewingPayslip] = useState(null);

  // Sync to sessionStorage on state updates
  useEffect(() => {
    saveSalaryData(store);
  }, [store]);

  // Derived KPI metrics
  const kpiData = useMemo(() => {
    const assignments = Array.isArray(store?.assignments) ? store.assignments : [];
    const structures = Array.isArray(store?.structures) ? store.structures : [];
    const totalStaff = assignments.length;
    const teachingAssigned = assignments.filter((a) => a.staffType === "Teaching" && a.status === "Active").length;
    const nonTeachingAssigned = assignments.filter((a) => a.staffType === "Non-Teaching" && a.status === "Active").length;
    const pendingAssigned = assignments.filter((a) => a.status === "Pending").length;
    const activeStructures = structures.filter((s) => s.status === "Active").length;
    const grossTotal = assignments.reduce((sum, a) => sum + Number(a.grossSalary || 0), 0);
    const deductionsTotal = assignments.reduce((sum, a) => sum + Number(a.totalDeductions || 0), 0);
    const netTotal = assignments.reduce((sum, a) => sum + Number(a.netSalary || 0), 0);
    const onHold = assignments.filter((a) => a.status === "On Hold").length;

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

  // DEFAULT AUTHORITATIVE PAYROLL SCREEN WITH 4 PRIMARY TABS
  return (
    <AuthoritativePayrollScreen
      mode={mode}
      store={store}
      setStore={setStore}
      kpiData={kpiData}
      navigate={navigate}
      setToast={setToast}
      setModal={setModal}
      viewingPayslip={viewingPayslip}
      setViewingPayslip={setViewingPayslip}
      handleHoldToggle={handleHoldToggle}
      handleDeleteStructure={handleDeleteStructure}
    />
  );
}

// ----------------------------------------------------------------------
// AUTHORITATIVE UNIFIED PAYROLL SCREEN (4 TOP TABS)
// ----------------------------------------------------------------------
function AuthoritativePayrollScreen({
  mode,
  store,
  setStore,
  kpiData,
  navigate,
  setToast,
  setModal,
  viewingPayslip,
  setViewingPayslip,
  handleHoldToggle,
  handleDeleteStructure,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial tab from mode or URL query param
  const tabFromQuery = searchParams.get("tab");
  const getInitialTab = () => {
    if (tabFromQuery) return tabFromQuery;
    if (mode === "payroll-employees") return "employees";
    if (mode === "payroll-structures") return "structures";
    if (mode === "payroll-generate") return "generate";
    if (mode === "payroll-history") return "history";
    return "employees";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    if (tabFromQuery && tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Header actions based on active tab
  const getHeaderActions = () => {
    if (activeTab === "employees") {
      return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => navigate("/dashboard/payroll/import")}
          >
            <Upload size={14} /> Import Salary Data
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => navigate("/dashboard/payroll/assign/teaching")}
          >
            <UserCheck size={14} /> + Assign Teaching
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/payroll/assign/non-teaching")}
          >
            <Building2 size={14} /> + Assign Non-Teaching
          </button>
        </div>
      );
    }
    if (activeTab === "structures") {
      return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => setToast("Exporting salary structure templates...")}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/payroll/structures/add")}
          >
            <Plus size={14} /> Add Salary Structure
          </button>
        </div>
      );
    }
    if (activeTab === "generate") {
      return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => setToast("Downloading Monthly Payroll Summary Report...")}
          >
            <FileSpreadsheet size={14} /> Monthly Report
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/payroll/process")}
          >
            <PlayCircle size={14} /> Full Batch Process
          </button>
        </div>
      );
    }
    if (activeTab === "history") {
      return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => setToast("Exporting full payslip history...")}
          >
            <Download size={14} /> Export History
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => navigate("/dashboard/payroll/reports")}
          >
            <TrendingUp size={14} /> Analytics & Reports
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout
      title="Payroll"
      subtitle="Authoritative staff payroll, salary structures, payslip generation, and payroll history."
      breadcrumb={["Home", "Finance", "Payroll"]}
      actions={getHeaderActions()}
    >
      <main className="salary-page-container">
        {/* 4 PRIMARY TOP NAVIGATION TABS */}
        <div className="payroll-top-tabs-bar" role="tablist" aria-label="Payroll Navigation Tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "employees"}
            className={`payroll-top-tab ${activeTab === "employees" ? "active" : ""}`}
            onClick={() => handleTabChange("employees")}
          >
            <UserCheck size={16} />
            <span>EMPLOYEES</span>
            <span className="payroll-tab-badge">{store.assignments?.length || 0}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "structures"}
            className={`payroll-top-tab ${activeTab === "structures" ? "active" : ""}`}
            onClick={() => handleTabChange("structures")}
          >
            <Layers size={16} />
            <span>SALARY STRUCTURES</span>
            <span className="payroll-tab-badge">{store.structures?.length || 0}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "generate"}
            className={`payroll-top-tab ${activeTab === "generate" ? "active" : ""}`}
            onClick={() => handleTabChange("generate")}
          >
            <Receipt size={16} />
            <span>GENERATE PAYSLIPS</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            className={`payroll-top-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => handleTabChange("history")}
          >
            <Clock size={16} />
            <span>PAYSLIP HISTORY</span>
            <span className="payroll-tab-badge">{store.payslips?.length || 0}</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        {activeTab === "employees" && (
          <PayrollEmployeesTab
            store={store}
            kpiData={kpiData}
            navigate={navigate}
            setToast={setToast}
            handleHoldToggle={handleHoldToggle}
            onPreviewPayslip={(asgn) => setViewingPayslip(asgn)}
          />
        )}

        {activeTab === "structures" && (
          <PayrollStructuresTab
            store={store}
            navigate={navigate}
            setModal={setModal}
            setToast={setToast}
            handleDeleteStructure={handleDeleteStructure}
          />
        )}

        {activeTab === "generate" && (
          <PayrollGenerateTab
            store={store}
            setStore={setStore}
            navigate={navigate}
            setToast={setToast}
            onPreviewPayslip={(slip) => setViewingPayslip(slip)}
          />
        )}

        {activeTab === "history" && (
          <PayrollHistoryTab
            store={store}
            navigate={navigate}
            setToast={setToast}
            onPreviewPayslip={(slip) => setViewingPayslip(slip)}
          />
        )}
      </main>

      {/* Payslip Interactive Modal */}
      {viewingPayslip && (
        <InteractivePayslipModal
          record={viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          setToast={setToast}
        />
      )}
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// TAB 1 — EMPLOYEES
// ----------------------------------------------------------------------
function PayrollEmployeesTab({ store, kpiData, navigate, setToast, handleHoldToggle, onPreviewPayslip }) {
  const [filterType, setFilterType] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const departments = useMemo(() => {
    const set = new Set();
    const list = Array.isArray(store?.assignments) ? store.assignments : [];
    list.forEach((a) => {
      if (a && a.department) set.add(a.department);
    });
    return Array.from(set).sort();
  }, [store?.assignments]);

  const filtered = useMemo(() => {
    const list = Array.isArray(store?.assignments) ? store.assignments : [];
    return list.filter((a) => {
      if (!a || typeof a !== "object") return false;
      if (filterType !== "All" && a.staffType !== filterType) return false;
      if (filterDept !== "All" && a.department !== filterDept) return false;
      if (filterStatus !== "All" && a.status !== filterStatus) return false;

      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (a.staffName || "").toLowerCase().includes(q);
        const idMatch = (a.staffId || "").toLowerCase().includes(q);
        const deptMatch = (a.department || "").toLowerCase().includes(q);
        const desigMatch = (a.designation || "").toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch && !desigMatch) return false;
      }
      return true;
    });
  }, [store?.assignments, filterType, filterDept, filterStatus, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* KPI Cards Row */}
      <div className="payroll-stats-row">
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon"><Wallet size={20} /></div>
          <div className="payroll-stat-info">
            <span>Total Staff Assigned</span>
            <strong>{kpiData.totalStaff}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green"><UserCheck size={20} /></div>
          <div className="payroll-stat-info">
            <span>Teaching Staff</span>
            <strong>{kpiData.teachingAssigned}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue"><Building2 size={20} /></div>
          <div className="payroll-stat-info">
            <span>Non-Teaching Staff</span>
            <strong>{kpiData.nonTeachingAssigned}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon amber"><CreditCard size={20} /></div>
          <div className="payroll-stat-info">
            <span>Total Net Outflow</span>
            <strong>{formatINR(kpiData.netTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Table Panel */}
      <div className="salary-card-panel">
        <div className="salary-card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          {/* Category Pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
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

          {/* Department Filter */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
              }}
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="On Hold">On Hold</option>
            </select>

            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "220px" }}>
              <input
                type="text"
                placeholder="Search staff name, ID, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--cms-border)",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <DataTable
          rows={filtered}
          data={filtered}
          columns={[
            {
              key: "staffId",
              label: "Employee ID",
              render: (r) => (
                <span style={{ fontWeight: 600, color: "var(--cms-primary-dark)" }}>
                  {r.staffId}
                </span>
              ),
            },
            {
              key: "staffName",
              label: "Staff Name",
              render: (r) => (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <strong style={{ fontSize: "13px" }}>{r.staffName}</strong>
                  <span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>{r.designation || r.department}</span>
                </div>
              ),
            },
            { key: "department", label: "Department" },
            {
              key: "staffType",
              label: "Staff Type",
              render: (r) => (
                <span className={`cms-badge ${r.staffType === "Teaching" ? "cms-badge-primary" : "cms-badge-neutral"}`}>
                  {r.staffType}
                </span>
              ),
            },
            {
              key: "structureName",
              label: "Assigned Structure",
              render: (r) => r.structureName || <span style={{ color: "var(--cms-muted)" }}>None</span>,
            },
            {
              key: "grossSalary",
              label: "Gross Salary",
              render: (r) => formatINR(r.grossSalary),
            },
            {
              key: "netSalary",
              label: "Net Take-Home",
              render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong>,
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <span className={`cms-badge ${r.status === "Active" ? "cms-badge-success" : r.status === "On Hold" ? "cms-badge-warning" : "cms-badge-neutral"}`}>
                  {r.status}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    title="View Assignment"
                    onClick={() => navigate(`/dashboard/payroll/assignments/${r.id}`)}
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    title="Hold / Un-Hold"
                    onClick={() => handleHoldToggle(r.id, r.status)}
                  >
                    {r.status === "On Hold" ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    style={{ padding: "2px 8px", fontSize: "11px" }}
                    title="Preview Payslip"
                    onClick={() => onPreviewPayslip(r)}
                  >
                    <Receipt size={12} /> Payslip
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// TAB 2 — SALARY STRUCTURES
// ----------------------------------------------------------------------
function PayrollStructuresTab({ store, navigate, setModal, setToast, handleDeleteStructure }) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            <input
              type="text"
              placeholder="Search structure by name / role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "12px" }}
            />
          </div>
        </div>

        <DataTable
          rows={filtered}
          data={filtered}
          columns={[
            {
              key: "name",
              label: "Structure Name",
              render: (r) => <strong>{r.name}</strong>,
            },
            {
              key: "staffType",
              label: "Staff Type",
              render: (r) => (
                <span className={`cms-badge ${r.staffType === "Teaching" ? "cms-badge-primary" : "cms-badge-neutral"}`}>
                  {r.staffType}
                </span>
              ),
            },
            {
              key: "department",
              label: "Department & Role",
              render: (r) => `${r.department || "General"} — ${r.designation || "All"}`,
            },
            { key: "basicPay", label: "Basic Pay", render: (r) => formatINR(r.basicPay) },
            { key: "grossSalary", label: "Gross Salary", render: (r) => <strong style={{ color: "#6F8400" }}>{formatINR(r.grossSalary)}</strong> },
            { key: "totalDeductions", label: "Deductions", render: (r) => formatINR(r.totalDeductions) },
            { key: "netSalary", label: "Net Salary", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
            { key: "assignedCount", label: "Assigned Staff", render: (r) => `${r.assignedCount || 0} Staff` },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <span className={`cms-badge ${r.status === "Active" ? "cms-badge-success" : "cms-badge-neutral"}`}>
                  {r.status}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "3px 7px", fontSize: "11px" }}
                    onClick={() => navigate(`/dashboard/payroll/structures/${r.id}`)}
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "3px 7px", fontSize: "11px" }}
                    onClick={() => navigate(`/dashboard/payroll/structures/${r.id}/edit`)}
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "3px 7px", fontSize: "11px", color: "var(--cms-danger)" }}
                    onClick={() => handleDeleteStructure(r.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// TAB 3 — GENERATE PAYSLIPS
// ----------------------------------------------------------------------
function PayrollGenerateTab({ store, setStore, navigate, setToast, onPreviewPayslip }) {
  const [selectedMonth, setSelectedMonth] = useState("09");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [presetPeriod, setPresetPeriod] = useState("1m");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState(() => store.assignments.map((a) => a.id));
  const [isGenerating, setIsGenerating] = useState(false);

  // Quick settings
  const [autoLOP, setAutoLOP] = useState(true);
  const [includeBonus, setIncludeBonus] = useState(true);
  const [applyTDS, setApplyTDS] = useState(true);

  const monthNames = [
    { num: "01", name: "January" },
    { num: "02", name: "February" },
    { num: "03", name: "March" },
    { num: "04", name: "April" },
    { num: "05", name: "May" },
    { num: "06", name: "June" },
    { num: "07", name: "July" },
    { num: "08", name: "August" },
    { num: "09", name: "September" },
    { num: "10", name: "October" },
    { num: "11", name: "November" },
    { num: "12", name: "December" },
  ];

  const currentPeriodLabel = useMemo(() => {
    const m = monthNames.find((mn) => mn.num === selectedMonth);
    return `${m ? m.name : "Current"} ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const assignmentsList = useMemo(() => {
    return Array.isArray(store?.assignments) ? store.assignments : [];
  }, [store?.assignments]);

  const payslipsList = useMemo(() => {
    return Array.isArray(store?.payslips) ? store.payslips : [];
  }, [store?.payslips]);

  const filteredStaff = useMemo(() => {
    return assignmentsList.filter((a) => {
      if (!a || typeof a !== "object") return false;
      if (categoryFilter !== "All" && a.staffType !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (a.staffName || "").toLowerCase().includes(q);
        const idMatch = (a.staffId || "").toLowerCase().includes(q);
        const deptMatch = (a.department || "").toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [assignmentsList, categoryFilter, search]);

  const allSelected = useMemo(() => {
    if (filteredStaff.length === 0) return false;
    return filteredStaff.every((s) => selectedStaffIds.includes(s.id));
  }, [filteredStaff, selectedStaffIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      const filteredIds = new Set(filteredStaff.map((s) => s.id));
      setSelectedStaffIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const filteredIds = filteredStaff.map((s) => s.id);
      setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectStaff = (id) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedNetTotal = useMemo(() => {
    return assignmentsList
      .filter((a) => selectedStaffIds.includes(a.id))
      .reduce((sum, a) => sum + Number(a.netSalary || 0), 0);
  }, [assignmentsList, selectedStaffIds]);

  // Handler for Generating Payslips
  const handleGeneratePayslips = () => {
    if (selectedStaffIds.length === 0 || isGenerating) return;
    setIsGenerating(true);

    setTimeout(() => {
      const targetMonthKey = `${selectedYear}-${selectedMonth}`;
      const periodLabel = currentPeriodLabel;

      const newPayslips = assignmentsList
        .filter((a) => selectedStaffIds.includes(a.id))
        .map((a) => {
          const employerPF = Math.round(Number(a.basicPay || 40000) * 0.12);
          const ctc = Number(a.grossSalary || 0) + employerPF;

          return {
            id: `slip-${a.staffId}-${targetMonthKey}-${Date.now()}`,
            staffId: a.staffId,
            staffName: a.staffName,
            department: a.department,
            designation: a.designation,
            month: targetMonthKey,
            periodLabel,
            year: Number(selectedYear),
            grossSalary: Number(a.grossSalary || 0),
            totalDeductions: Number(a.totalDeductions || 0),
            netSalary: Number(a.netSalary || 0),
            ctc,
            status: "Generated",
            paymentMode: "Bank Transfer",
            generatedAt: new Date().toISOString(),
          };
        });

      setStore((prev) => {
        const existingSlips = Array.isArray(prev?.payslips) ? prev.payslips : [];
        return {
          ...prev,
          payslips: [...newPayslips, ...existingSlips.filter((p) => p.month !== targetMonthKey)],
        };
      });

      setIsGenerating(false);
      setToast(`Successfully generated ${newPayslips.length} payslips for ${periodLabel}!`);
    }, 450);
  };

  // Recently Generated Payslips for Selected Period
  const targetMonthKey = `${selectedYear}-${selectedMonth}`;
  const recentlyGenerated = useMemo(() => {
    return payslipsList.filter((p) => p && (p.month === targetMonthKey || p.year === Number(selectedYear)));
  }, [payslipsList, targetMonthKey, selectedYear]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Stats Banner */}
      <div className="payroll-stats-row">
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon"><UserCheck size={20} /></div>
          <div className="payroll-stat-info">
            <span>Eligible Staff</span>
            <strong>{assignmentsList.length} Employees</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green"><CheckSquare size={20} /></div>
          <div className="payroll-stat-info">
            <span>Selected for Generation</span>
            <strong>{selectedStaffIds.length} Employees</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue"><DollarSign size={20} /></div>
          <div className="payroll-stat-info">
            <span>Selected Net Outflow</span>
            <strong>{formatINR(selectedNetTotal)}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon amber"><Calendar size={20} /></div>
          <div className="payroll-stat-info">
            <span>Target Period</span>
            <strong style={{ fontSize: "16px" }}>{currentPeriodLabel}</strong>
          </div>
        </div>
      </div>

      {/* Generation Controls Panel */}
      <div className="salary-card-panel">
        <div className="salary-card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
          {/* Period Selector Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--cms-muted)" }}>Period:</span>
            <div className="payroll-period-pills">
              {[
                { key: "1m", label: "1M (Current)" },
                { key: "3m", label: "3M (Quarter)" },
                { key: "6m", label: "6M (Half-Year)" },
                { key: "12m", label: "12M (Annual)" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`payroll-period-pill ${presetPeriod === p.key ? "active" : ""}`}
                  onClick={() => setPresetPeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month & Year Pickers */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
              }}
            >
              {monthNames.map((m) => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
              }}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Category Filter & Search */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {["All", "Teaching", "Non-Teaching"].map((c) => (
              <button
                key={c}
                type="button"
                className={`cms-btn ${categoryFilter === c ? "cms-btn-primary" : "cms-btn-ghost"}`}
                style={{ fontSize: "11px", padding: "3px 10px" }}
                onClick={() => setCategoryFilter(c)}
              >
                {c}
              </button>
            ))}

            <input
              type="text"
              placeholder="Filter staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "5px 10px",
                borderRadius: "6px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                width: "160px",
              }}
            />
          </div>
        </div>

        {/* Options Row */}
        <div style={{ display: "flex", gap: "20px", padding: "12px 16px", borderBottom: "1px solid var(--cms-border)", background: "var(--cms-bg)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={autoLOP} onChange={(e) => setAutoLOP(e.target.checked)} />
            <span>Auto-deduct Attendance LOP</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={includeBonus} onChange={(e) => setIncludeBonus(e.target.checked)} />
            <span>Include Approved Bonuses</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
            <input type="checkbox" checked={applyTDS} onChange={(e) => setApplyTDS(e.target.checked)} />
            <span>Apply TDS Deductions</span>
          </label>
        </div>

        {/* Staff Selection Table */}
        <DataTable
          rows={filteredStaff}
          data={filteredStaff}
          columns={[
            {
              key: "select",
              label: (
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                  onClick={toggleSelectAll}
                  title="Select / Deselect All"
                >
                  {allSelected ? <CheckSquare size={16} color="var(--cms-primary)" /> : <Square size={16} color="var(--cms-muted)" />}
                </button>
              ),
              render: (r) => (
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                  onClick={() => toggleSelectStaff(r.id)}
                >
                  {selectedStaffIds.includes(r.id) ? (
                    <CheckSquare size={16} color="var(--cms-primary)" />
                  ) : (
                    <Square size={16} color="var(--cms-muted)" />
                  )}
                </button>
              ),
            },
            { key: "staffId", label: "Employee ID", render: (r) => <strong>{r.staffId}</strong> },
            { key: "staffName", label: "Staff Name" },
            { key: "department", label: "Department" },
            { key: "grossSalary", label: "Gross Pay", render: (r) => formatINR(r.grossSalary) },
            { key: "totalDeductions", label: "Deductions", render: (r) => formatINR(r.totalDeductions) },
            { key: "netSalary", label: "Net Payable", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
            {
              key: "status",
              label: "Status",
              render: (r) => <span className="cms-badge cms-badge-success">Ready</span>,
            },
          ]}
        />

        {/* Action Trigger Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderTop: "1px solid var(--cms-border)", background: "var(--cms-surface)" }}>
          <div style={{ fontSize: "13px", color: "var(--cms-muted)" }}>
            <strong>{selectedStaffIds.length}</strong> of {filteredStaff.length} employees selected
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => setToast("Dispatching payslip email notifications to selected staff...")}
            >
              <Mail size={14} /> Send Payslip Emails
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={selectedStaffIds.length === 0 || isGenerating}
              onClick={handleGeneratePayslips}
              style={{ minWidth: "200px" }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="spin-animation" /> Generating Payslips...
                </>
              ) : (
                <>
                  <Receipt size={14} /> Generate Payslips ({selectedStaffIds.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recently Generated Section */}
      <div className="salary-card-panel">
        <div className="salary-card-header">
          <h3>Recently Generated Payslips ({currentPeriodLabel})</h3>
        </div>
        <DataTable
          rows={recentlyGenerated}
          data={recentlyGenerated}
          columns={[
            { key: "staffId", label: "Employee ID" },
            { key: "staffName", label: "Staff Name" },
            { key: "department", label: "Department" },
            { key: "grossSalary", label: "Gross Pay", render: (r) => formatINR(r.grossSalary) },
            { key: "totalDeductions", label: "Deductions", render: (r) => formatINR(r.totalDeductions) },
            { key: "netSalary", label: "Net Pay", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
            {
              key: "ctc",
              label: "CTC",
              render: (r) => formatINR(r.ctc || Number(r.grossSalary || 0) * 1.12),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => <span className="cms-badge cms-badge-success">{r.status || "Generated"}</span>,
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    onClick={() => onPreviewPayslip(r)}
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    onClick={() => onPreviewPayslip(r)}
                  >
                    <Printer size={12} />
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    onClick={() => setToast(`Payslip emailed to ${r.staffName}!`)}
                  >
                    <Mail size={12} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// TAB 4 — PAYSLIP HISTORY
// ----------------------------------------------------------------------
function PayrollHistoryTab({ store, navigate, setToast, onPreviewPayslip }) {
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const payslipsList = useMemo(() => {
    return Array.isArray(store?.payslips) ? store.payslips : [];
  }, [store?.payslips]);

  const historyKPIs = useMemo(() => {
    const totalCount = payslipsList.length;
    const totalNetOutflow = payslipsList.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
    const paidCount = payslipsList.filter((p) => p.status === "Paid" || p.status === "Generated").length;
    const pendingCount = payslipsList.filter((p) => p.status === "Pending").length;

    return { totalCount, totalNetOutflow, paidCount, pendingCount };
  }, [payslipsList]);

  const departments = useMemo(() => {
    const set = new Set();
    payslipsList.forEach((p) => {
      if (p && p.department) set.add(p.department);
    });
    return Array.from(set).sort();
  }, [payslipsList]);

  const filteredHistory = useMemo(() => {
    return payslipsList.filter((p) => {
      if (!p || typeof p !== "object") return false;
      if (filterMonth !== "All") {
        if (!p.month || !p.month.includes(`-${filterMonth}`)) return false;
      }
      if (filterYear !== "All") {
        if (p.year && String(p.year) !== filterYear) return false;
        if (p.month && !p.month.startsWith(filterYear)) return false;
      }
      if (filterDept !== "All" && p.department !== filterDept) return false;
      if (filterStatus !== "All" && p.status !== filterStatus) return false;

      if (search) {
        const q = search.toLowerCase();
        const nameMatch = (p.staffName || "").toLowerCase().includes(q);
        const idMatch = (p.staffId || "").toLowerCase().includes(q);
        const deptMatch = (p.department || "").toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [payslipsList, filterMonth, filterYear, filterDept, filterStatus, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Real-data KPI Cards */}
      <div className="payroll-stats-row">
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon"><Receipt size={20} /></div>
          <div className="payroll-stat-info">
            <span>Total Payslips</span>
            <strong>{historyKPIs.totalCount} Records</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green"><CreditCard size={20} /></div>
          <div className="payroll-stat-info">
            <span>Paid Outflow</span>
            <strong>{formatINR(historyKPIs.totalNetOutflow)}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue"><CheckCircle size={20} /></div>
          <div className="payroll-stat-info">
            <span>Paid / Generated</span>
            <strong>{historyKPIs.paidCount} Payslips</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon amber"><Clock size={20} /></div>
          <div className="payroll-stat-info">
            <span>Pending Payment</span>
            <strong>{historyKPIs.pendingCount} Payslips</strong>
          </div>
        </div>
      </div>

      {/* Filters Toolbar & History DataTable */}
      <div className="salary-card-panel">
        <div className="salary-card-header" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "12px" }}
            >
              <option value="All">All Months</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "12px" }}
            >
              <option value="All">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "12px" }}
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "12px" }}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Generated">Generated</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="Search history by name / ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--cms-border)", fontSize: "12px" }}
            />
          </div>
        </div>

        <DataTable
          rows={filteredHistory}
          data={filteredHistory}
          columns={[
            {
              key: "month",
              label: "Period",
              render: (r) => <strong>{r.periodLabel || r.month || "Current"}</strong>,
            },
            { key: "staffId", label: "Employee ID" },
            { key: "staffName", label: "Staff Name" },
            { key: "department", label: "Department" },
            { key: "grossSalary", label: "Gross", render: (r) => formatINR(r.grossSalary) },
            { key: "totalDeductions", label: "Deductions", render: (r) => formatINR(r.totalDeductions) },
            { key: "netSalary", label: "Net Salary", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.netSalary)}</strong> },
            {
              key: "status",
              label: "Payment Status",
              render: (r) => (
                <span className={`cms-badge ${r.status === "Paid" ? "cms-badge-success" : "cms-badge-primary"}`}>
                  {r.status || "Paid"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    title="View Payslip"
                    onClick={() => onPreviewPayslip(r)}
                  >
                    <Eye size={12} /> View
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    title="Download / Print"
                    onClick={() => onPreviewPayslip(r)}
                  >
                    <Download size={12} />
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                    title="Email Payslip"
                    onClick={() => setToast(`Payslip sent to ${r.staffName} successfully!`)}
                  >
                    <Mail size={12} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// INTERACTIVE PAYSLIP MODAL
// ----------------------------------------------------------------------
function InteractivePayslipModal({ record, onClose, setToast }) {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    setToast(`Payslip email dispatched to ${record.staffName}!`);
  };

  return (
    <div className="payroll-modal-overlay" onClick={onClose}>
      <div className="payroll-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="payroll-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Receipt size={18} color="var(--cms-primary)" />
            <strong>Payslip Preview — {record.staffName} ({record.staffId})</strong>
          </div>
          <button type="button" className="cms-btn cms-btn-ghost" style={{ padding: "4px 8px" }} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="payroll-modal-body">
          {/* Printable Payslip Card */}
          <div className="payslip-paper">
            <div className="payslip-header">
              <h2>PIRNAV JUNIOR COLLEGE</h2>
              <p>Affiliated to State Board of Intermediate Education</p>
              <p style={{ fontSize: "12px", color: "var(--cms-muted)" }}>Salary Payslip for the Month of {record.periodLabel || record.month || "August 2026"}</p>
            </div>

            <div className="payslip-meta-grid">
              <div className="payslip-meta-item"><span>Employee ID:</span><strong>{record.staffId}</strong></div>
              <div className="payslip-meta-item"><span>Staff Name:</span><strong>{record.staffName}</strong></div>
              <div className="payslip-meta-item"><span>Department:</span><strong>{record.department || "General"}</strong></div>
              <div className="payslip-meta-item"><span>Designation:</span><strong>{record.designation || "Staff"}</strong></div>
              <div className="payslip-meta-item"><span>Payment Mode:</span><strong>{record.paymentMode || "Bank Transfer"}</strong></div>
              <div className="payslip-meta-item"><span>Status:</span><span className="cms-badge cms-badge-success">{record.status || "Paid"}</span></div>
            </div>

            <div className="payslip-tables-grid">
              {/* Earnings */}
              <div className="payslip-section">
                <h4>EARNINGS</h4>
                <table className="payslip-table">
                  <tbody>
                    <tr><td>Basic Pay</td><td>{formatINR(Number(record.basicPay || record.grossSalary * 0.5 || 40000))}</td></tr>
                    <tr><td>House Rent Allowance (HRA)</td><td>{formatINR(Number(record.hra || record.grossSalary * 0.2 || 12000))}</td></tr>
                    <tr><td>Dearness Allowance (DA)</td><td>{formatINR(Number(record.da || record.grossSalary * 0.15 || 8000))}</td></tr>
                    <tr><td>Special & Other Allowances</td><td>{formatINR(Number(record.grossSalary * 0.15 || 6000))}</td></tr>
                    <tr className="subtotal"><td>Total Gross Earnings</td><td>{formatINR(record.grossSalary)}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions */}
              <div className="payslip-section">
                <h4>DEDUCTIONS</h4>
                <table className="payslip-table">
                  <tbody>
                    <tr><td>Provident Fund (PF)</td><td>{formatINR(Number(record.totalDeductions * 0.5 || 4800))}</td></tr>
                    <tr><td>Professional Tax (PT)</td><td>{formatINR(200)}</td></tr>
                    <tr><td>TDS (Income Tax)</td><td>{formatINR(Number(record.totalDeductions * 0.4 || 3500))}</td></tr>
                    <tr><td>Insurance & Other</td><td>{formatINR(Number(record.totalDeductions * 0.1 || 500))}</td></tr>
                    <tr className="subtotal"><td>Total Deductions</td><td>{formatINR(record.totalDeductions)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Salary Summary */}
            <div className="payslip-net-box">
              <div>
                <span style={{ fontSize: "12px", color: "var(--cms-muted)", display: "block" }}>Net Take-Home Salary</span>
                <strong style={{ fontSize: "22px", color: "#108E50" }}>{formatINR(record.netSalary)}</strong>
              </div>
              <div style={{ textAlign: "right", fontSize: "11px", color: "var(--cms-muted)" }}>
                <div>This is a computer-generated salary slip.</div>
                <div>Authorized Signature & Seal</div>
              </div>
            </div>
          </div>
        </div>

        <div className="payroll-modal-footer">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={handleSendEmail}>
            <Mail size={14} /> Email Payslip
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={handlePrint}>
            <Printer size={14} /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN — SALARY STRUCTURE LIST
// ----------------------------------------------------------------------
function SalaryStructureListScreen({ store, navigate, setModal, setToast }) {
  return (
    <DashboardLayout
      title="Salary Structures"
      subtitle="Manage reusable salary structures for teaching and non-teaching staff."
      breadcrumb={["Home", "Finance", "Payroll", "Salary Structures"]}
      actions={
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate("/dashboard/payroll/structures/add")}>
            <Plus size={14} /> Add Salary Structure
          </button>
        </div>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=structures" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Payroll
        </Link>
        <PayrollStructuresTab store={store} navigate={navigate} setModal={setModal} setToast={setToast} handleDeleteStructure={() => {}} />
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
// SCREEN — ADD SALARY STRUCTURE
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
    pfApplicable: true,
    pf: 6000,
    employerPf: 6000,
    esiApplicable: false,
    esi: 0,
    ptApplicable: true,
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

  // Update PF automatically when Basic Pay or PF toggle changes
  useEffect(() => {
    if (formData.pfApplicable) {
      const computedPf = Math.round(Number(formData.basicPay || 0) * 0.12);
      setFormData((prev) => ({
        ...prev,
        pf: computedPf,
        employerPf: computedPf,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        pf: 0,
        employerPf: 0,
      }));
    }
  }, [formData.basicPay, formData.pfApplicable]);

  const grossSalary = useMemo(() => {
    return Number(formData.basicPay || 0) + Number(formData.hra || 0) + Number(formData.da || 0) +
      Number(formData.specialAllowance || 0) + Number(formData.transportAllowance || 0) +
      Number(formData.medicalAllowance || 0) + Number(formData.academicAllowance || 0) +
      Number(formData.otherAllowances || 0);
  }, [formData]);

  // Total Employee Deductions (Employer PF is NOT deducted from employee take-home)
  const totalDeductions = useMemo(() => {
    return Number(formData.pf || 0) + Number(formData.esi || 0) + Number(formData.professionalTax || 0) +
      Number(formData.tds || 0) + Number(formData.insurance || 0) + Number(formData.otherDeductions || 0);
  }, [formData]);

  const netSalary = useMemo(() => calculateNetSalary(grossSalary, totalDeductions), [grossSalary, totalDeductions]);
  const ctc = useMemo(() => grossSalary + Number(formData.employerPf || 0), [grossSalary, formData.employerPf]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const newStructure = {
      ...formData,
      id: `struct-${Date.now()}`,
      grossSalary,
      totalDeductions,
      netSalary,
      ctc,
      assignedCount: 0,
    };
    setStore((prev) => ({
      ...prev,
      structures: [newStructure, ...prev.structures],
    }));
    setToast("Salary Structure created successfully!");
    navigate("/dashboard/payroll?tab=structures");
  };

  return (
    <DashboardLayout
      title="Add Salary Structure"
      subtitle="Create a reusable salary structure with earnings, statutory rules and live preview."
      breadcrumb={["Home", "Finance", "Payroll", "Structures", "Add"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=structures" className="cms-back-link">
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

              <div className="salary-form-section-title">Step 3 — Statutory Rules & Deductions</div>
              <div style={{ display: "flex", gap: "20px", marginBottom: "16px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={formData.pfApplicable} onChange={(e) => setFormData({ ...formData, pfApplicable: e.target.checked })} />
                  <strong>PF Applicable (12% of Basic)</strong>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={formData.esiApplicable} onChange={(e) => setFormData({ ...formData, esiApplicable: e.target.checked })} />
                  <strong>ESI Applicable (1.75%)</strong>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.ptApplicable}
                    onChange={(e) => setFormData({ ...formData, ptApplicable: e.target.checked, professionalTax: e.target.checked ? 200 : 0 })}
                  />
                  <strong>Professional Tax Applicable (₹200)</strong>
                </label>
              </div>

              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Employee PF (12% Basic)</label>
                  <input type="number" min="0" value={formData.pf} onChange={(e) => setFormData({ ...formData, pf: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Employer PF (12% - CTC Cost)</label>
                  <input type="number" min="0" value={formData.employerPf} onChange={(e) => setFormData({ ...formData, employerPf: Number(e.target.value) })} />
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
                  <label>ESI Deduction</label>
                  <input type="number" min="0" value={formData.esi} onChange={(e) => setFormData({ ...formData, esi: Number(e.target.value) })} />
                </div>
                <div className="salary-form-group">
                  <label>Insurance / Other Deductions</label>
                  <input type="number" min="0" value={formData.insurance} onChange={(e) => setFormData({ ...formData, insurance: Number(e.target.value) })} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/payroll?tab=structures")}>Cancel</button>
                <button type="submit" className="cms-btn cms-btn-primary"><Plus size={14} /> Save Structure</button>
              </div>
            </div>

            {/* Live Breakup Preview */}
            <div className="salary-preview-sticky">
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Live Calculation Preview</h4>
              <div className="breakup-row"><span>Basic Pay</span><strong>{formatINR(formData.basicPay)}</strong></div>
              <div className="breakup-row"><span>HRA</span><span>{formatINR(formData.hra)}</span></div>
              <div className="breakup-row"><span>DA</span><span>{formatINR(formData.da)}</span></div>
              <div className="breakup-row"><span>Allowances</span><span>{formatINR(formData.specialAllowance + formData.transportAllowance + formData.academicAllowance)}</span></div>
              <div className="breakup-row total"><span>Gross Earnings</span><strong style={{ color: "#6F8400" }}>{formatINR(grossSalary)}</strong></div>

              <div style={{ margin: "16px 0 8px", fontSize: "12px", fontWeight: 700, color: "var(--cms-muted)" }}>EMPLOYEE DEDUCTIONS</div>
              <div className="breakup-row"><span>Employee PF (12%)</span><span>{formatINR(formData.pf)}</span></div>
              <div className="breakup-row"><span>Professional Tax (PT)</span><span>{formatINR(formData.professionalTax)}</span></div>
              <div className="breakup-row"><span>TDS (Income Tax)</span><span>{formatINR(formData.tds)}</span></div>
              <div className="breakup-row total"><span>Total Deductions</span><strong style={{ color: "#B7791F" }}>{formatINR(totalDeductions)}</strong></div>

              <div className="breakup-row net">
                <span>Net Take-Home Salary</span>
                <strong style={{ fontSize: "18px", color: "#108E50" }}>{formatINR(netSalary)}</strong>
              </div>

              <div style={{ margin: "16px 0 8px", fontSize: "12px", fontWeight: 700, color: "var(--cms-muted)" }}>COMPANY CTC</div>
              <div className="breakup-row"><span>Employer PF Contribution</span><span>{formatINR(formData.employerPf)}</span></div>
              <div className="breakup-row total"><span>Total Cost to Company (CTC)</span><strong style={{ color: "var(--cms-primary-dark)" }}>{formatINR(ctc)}</strong></div>
            </div>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN — SALARY STRUCTURE DETAILS
// ----------------------------------------------------------------------
function SalaryStructureDetailsScreen({ id, store, navigate, setModal, setToast }) {
  const struct = useMemo(() => store.structures.find((s) => s.id === id), [id, store.structures]);

  if (!struct) {
    return (
      <DashboardLayout
        title="Structure Not Found"
        breadcrumb={["Home", "Finance", "Payroll", "Structures"]}
      >
        <main className="salary-page-container">
          <Link to="/dashboard/payroll?tab=structures" className="cms-back-link">
            <ArrowLeft size={14} /> Back to Salary Structures
          </Link>
          <div className="salary-card-panel">Structure not found.</div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Structure Details — ${struct.name}`}
      subtitle="View full breakdown of earnings, deductions and assigned staff count."
      breadcrumb={["Home", "Finance", "Payroll", "Structures", struct.name]}
      actions={
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate(`/dashboard/payroll/structures/${struct.id}/edit`)}>
            <Edit3 size={14} /> Edit Structure
          </button>
          <button type="button" className="cms-btn cms-btn-primary" onClick={() => navigate(`/dashboard/payroll/assign/${struct.staffType.toLowerCase()}`)}>
            <UserCheck size={14} /> Assign Staff
          </button>
        </div>
      }
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=structures" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Salary Structures
        </Link>

        <div className="salary-split-layout">
          <div className="salary-card-panel">
            <div className="salary-form-section-title">Structure Summary</div>
            <div className="salary-form-grid-3" style={{ marginBottom: "20px" }}>
              <div><span>Staff Type:</span> <strong>{struct.staffType}</strong></div>
              <div><span>Department:</span> <strong>{struct.department || "All Departments"}</strong></div>
              <div><span>Designation:</span> <strong>{struct.designation || "All Roles"}</strong></div>
              <div><span>Effective Date:</span> <strong>{struct.effectiveFrom}</strong></div>
              <div><span>Status:</span> <span className="cms-badge cms-badge-success">{struct.status}</span></div>
              <div><span>Assigned Count:</span> <strong>{struct.assignedCount || 0} Staff</strong></div>
            </div>

            <div className="salary-form-section-title">Earnings Breakdown</div>
            <div className="breakup-row"><span>Basic Pay</span><strong>{formatINR(struct.basicPay)}</strong></div>
            <div className="breakup-row"><span>HRA</span><span>{formatINR(struct.hra)}</span></div>
            <div className="breakup-row"><span>DA</span><span>{formatINR(struct.da)}</span></div>
            <div className="breakup-row"><span>Special Allowance</span><span>{formatINR(struct.specialAllowance)}</span></div>
            <div className="breakup-row"><span>Transport Allowance</span><span>{formatINR(struct.transportAllowance)}</span></div>
            <div className="breakup-row"><span>Medical Allowance</span><span>{formatINR(struct.medicalAllowance)}</span></div>
            <div className="breakup-row total"><span>Total Gross Earnings</span><strong style={{ color: "#6F8400" }}>{formatINR(struct.grossSalary)}</strong></div>

            <div className="salary-form-section-title" style={{ marginTop: "20px" }}>Deductions Breakdown</div>
            <div className="breakup-row"><span>Provident Fund (PF)</span><span>{formatINR(struct.pf)}</span></div>
            <div className="breakup-row"><span>Professional Tax (PT)</span><span>{formatINR(struct.professionalTax)}</span></div>
            <div className="breakup-row"><span>TDS (Income Tax)</span><span>{formatINR(struct.tds)}</span></div>
            <div className="breakup-row"><span>Insurance / Other</span><span>{formatINR(struct.insurance)}</span></div>
            <div className="breakup-row total"><span>Total Deductions</span><strong style={{ color: "#B7791F" }}>{formatINR(struct.totalDeductions)}</strong></div>
          </div>

          <div className="salary-preview-sticky">
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Monthly Salary Summary</h4>
            <div className="breakup-row"><span>Gross Salary</span><strong>{formatINR(struct.grossSalary)}</strong></div>
            <div className="breakup-row"><span>Total Deductions</span><span>-{formatINR(struct.totalDeductions)}</span></div>
            <div className="breakup-row net">
              <span>Net Monthly Salary</span>
              <strong style={{ fontSize: "20px", color: "#108E50" }}>{formatINR(struct.netSalary)}</strong>
            </div>
            <div className="breakup-row"><span>Annual CTC Approx</span><strong>{formatINR(Number(struct.grossSalary) * 12 * 1.12)}</strong></div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function SearchableStaffPicker({ label = "Select Staff *", staffList = [], selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedId) || null;
  }, [staffList, selectedId]);

  const filtered = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const id = (s.id || "").toLowerCase();
      const dept = (s.department || "").toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [staffList, query]);

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
            placeholder="Search staff by name / ID..."
            value={open ? query : selectedStaff ? `${selectedStaff.name} (${selectedStaff.id})` : ""}
            onFocus={() => {
              setQuery("");
              setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
        </div>
        {open ? (
          <div className="salary-search-dropdown" role="listbox">
            {filtered.length > 0 ? (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="salary-search-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <strong style={{ fontSize: "12px" }}>{s.name}</strong>
                    <span style={{ fontSize: "11px", color: "var(--cms-muted)" }}>{s.id} — {s.department}</span>
                  </div>
                  {s.id === selectedId ? <Check size={13} style={{ color: "var(--cms-primary)" }} /> : null}
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
// SCREEN — ASSIGN SALARY TO STAFF
// ----------------------------------------------------------------------
function AssignSalaryScreen({ staffType = "Teaching", store, setStore, navigate, setToast }) {
  const staffList = useMemo(() => {
    return [
      { id: "FAC-101", name: "Dr. K. Srinivas Rao", department: "Physics", designation: "HOD & Professor" },
      { id: "FAC-102", name: "Mrs. Lakshmi Devi", department: "Mathematics", designation: "Assistant Professor" },
      { id: "FAC-103", name: "Dr. Ramesh Babu", department: "Chemistry", designation: "Senior Lecturer" },
      { id: "FAC-104", name: "Ms. Anitha Reddy", department: "English", designation: "Lecturer" },
      { id: "NT-201", name: "Mr. Suresh Kumar", department: "Administration", designation: "Office Administrator" },
      { id: "NT-202", name: "Mrs. Padmavathi", department: "Finance & Accounts", designation: "Senior Accountant" },
      { id: "NT-203", name: "Mr. Venkat Rao", department: "Library", designation: "Head Librarian" },
    ];
  }, []);

  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0].id);
  const [selectedStructId, setSelectedStructId] = useState(store.structures[0]?.id || "");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("9876543210123");
  const [ifscCode, setIfscCode] = useState("SBIN0001234");
  const [panNumber, setPanNumber] = useState("ABCDE1234F");
  const [uanNumber, setUanNumber] = useState("100987654321");

  const chosenStruct = useMemo(() => {
    return store.structures.find((s) => s.id === selectedStructId) || store.structures[0];
  }, [store.structures, selectedStructId]);

  const chosenStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedStaffId) || staffList[0];
  }, [staffList, selectedStaffId]);

  const handleSaveAssignment = (e) => {
    e.preventDefault();
    if (!chosenStaff || !chosenStruct) return;

    const newAssignment = {
      id: `asgn-${Date.now()}`,
      staffId: chosenStaff.id,
      staffName: chosenStaff.name,
      staffType,
      department: chosenStaff.department,
      designation: chosenStaff.designation,
      structureId: chosenStruct.id,
      structureName: chosenStruct.name,
      grossSalary: chosenStruct.grossSalary,
      totalDeductions: chosenStruct.totalDeductions,
      netSalary: chosenStruct.netSalary,
      effectiveFrom,
      status: "Active",
      paymentMode,
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
      uanNumber,
    };

    setStore((prev) => ({
      ...prev,
      assignments: [newAssignment, ...prev.assignments.filter((a) => a.staffId !== chosenStaff.id)],
    }));

    setToast(`Salary assigned successfully to ${chosenStaff.name}!`);
    navigate("/dashboard/payroll?tab=employees");
  };

  return (
    <DashboardLayout
      title={`Assign Salary Structure — ${staffType} Staff`}
      subtitle={`Link an approved salary structure to a ${staffType.toLowerCase()} staff member.`}
      breadcrumb={["Home", "Finance", "Payroll", "Assignments", `Assign ${staffType}`]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=employees" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Employees
        </Link>

        <form onSubmit={handleSaveAssignment}>
          <div className="salary-split-layout">
            <div className="salary-card-panel">
              <div className="salary-form-section-title">Step 1 — Staff & Structure Selection</div>
              <div className="salary-form-grid-2">
                <SearchableStaffPicker
                  label={`Select ${staffType} Staff *`}
                  staffList={staffList}
                  selectedId={selectedStaffId}
                  onSelect={setSelectedStaffId}
                />

                <div className="salary-form-group">
                  <label>Select Salary Structure *</label>
                  <select value={selectedStructId} onChange={(e) => setSelectedStructId(e.target.value)}>
                    {store.structures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.staffType}) — Gross: {formatINR(s.grossSalary)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="salary-form-section-title">Step 2 — Bank & Payment Details</div>
              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Payment Mode</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="salary-form-group">
                  <label>Bank Name</label>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Account Number</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>IFSC Code</label>
                  <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>PAN Number</label>
                  <input type="text" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>UAN / PF Number</label>
                  <input type="text" value={uanNumber} onChange={(e) => setUanNumber(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => navigate("/dashboard/payroll?tab=employees")}>Cancel</button>
                <button type="submit" className="cms-btn cms-btn-primary"><UserCheck size={14} /> Assign Salary</button>
              </div>
            </div>

            {/* Structure Summary Preview */}
            <div className="salary-preview-sticky">
              <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Selected Structure Breakdown</h4>
              {chosenStruct ? (
                <>
                  <div className="breakup-row"><span>Structure</span><strong>{chosenStruct.name}</strong></div>
                  <div className="breakup-row"><span>Basic Pay</span><span>{formatINR(chosenStruct.basicPay)}</span></div>
                  <div className="breakup-row"><span>HRA</span><span>{formatINR(chosenStruct.hra)}</span></div>
                  <div className="breakup-row"><span>DA</span><span>{formatINR(chosenStruct.da)}</span></div>
                  <div className="breakup-row total"><span>Gross Salary</span><strong style={{ color: "#6F8400" }}>{formatINR(chosenStruct.grossSalary)}</strong></div>
                  <div className="breakup-row"><span>Total Deductions</span><span>-{formatINR(chosenStruct.totalDeductions)}</span></div>
                  <div className="breakup-row net">
                    <span>Net Monthly Take-Home</span>
                    <strong style={{ fontSize: "18px", color: "#108E50" }}>{formatINR(chosenStruct.netSalary)}</strong>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}

// ----------------------------------------------------------------------
// SCREEN — ASSIGNMENTS LIST (BACKWARD COMPATIBLE)
// ----------------------------------------------------------------------
function SalaryAssignmentsScreen({ store, navigate, handleHoldToggle, setToast }) {
  return (
    <DashboardLayout
      title="Staff Salary Assignments"
      subtitle="Overview of salary structure assignments for all staff."
      breadcrumb={["Home", "Finance", "Payroll", "Assignments"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=employees" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Payroll
        </Link>
        <PayrollEmployeesTab
          store={store}
          kpiData={{ totalStaff: store.assignments.length, teachingAssigned: 0, nonTeachingAssigned: 0, netTotal: 0 }}
          navigate={navigate}
          setToast={setToast}
          handleHoldToggle={handleHoldToggle}
          onPreviewPayslip={() => {}}
        />
      </main>
    </DashboardLayout>
  );
}

function SalaryAssignmentDetailsScreen({ id, store, navigate }) {
  const asgn = useMemo(() => store.assignments.find((a) => a.id === id) || store.assignments[0], [id, store.assignments]);

  return (
    <DashboardLayout
      title={`Assignment Details — ${asgn.staffName}`}
      subtitle="Full breakdown of assigned structure, bank details and salary payout."
      breadcrumb={["Home", "Finance", "Payroll", "Assignments", asgn.staffName]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=employees" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Employees
        </Link>

        <div className="salary-split-layout">
          <div className="salary-card-panel">
            <div className="salary-form-section-title">Employee Information</div>
            <div className="salary-form-grid-3" style={{ marginBottom: "20px" }}>
              <div><span>Employee ID:</span> <strong>{asgn.staffId}</strong></div>
              <div><span>Name:</span> <strong>{asgn.staffName}</strong></div>
              <div><span>Department:</span> <strong>{asgn.department}</strong></div>
              <div><span>Designation:</span> <strong>{asgn.designation}</strong></div>
              <div><span>Staff Type:</span> <strong>{asgn.staffType}</strong></div>
              <div><span>Status:</span> <span className="cms-badge cms-badge-success">{asgn.status}</span></div>
            </div>

            <div className="salary-form-section-title">Bank & Statutory Accounts</div>
            <div className="salary-form-grid-3">
              <div><span>Payment Mode:</span> <strong>{asgn.paymentMode || "Bank Transfer"}</strong></div>
              <div><span>Bank:</span> <strong>{asgn.bankName || "State Bank of India"}</strong></div>
              <div><span>Account No:</span> <strong>{asgn.accountNumber || "9876543210123"}</strong></div>
              <div><span>IFSC:</span> <strong>{asgn.ifscCode || "SBIN0001234"}</strong></div>
              <div><span>PAN:</span> <strong>{asgn.panNumber || "ABCDE1234F"}</strong></div>
              <div><span>UAN / PF:</span> <strong>{asgn.uanNumber || "100987654321"}</strong></div>
            </div>
          </div>

          <div className="salary-preview-sticky">
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700 }}>Assigned Salary Breakdown</h4>
            <div className="breakup-row"><span>Assigned Structure</span><strong>{asgn.structureName}</strong></div>
            <div className="breakup-row total"><span>Gross Salary</span><strong style={{ color: "#6F8400" }}>{formatINR(asgn.grossSalary)}</strong></div>
            <div className="breakup-row"><span>Total Deductions</span><span>-{formatINR(asgn.totalDeductions)}</span></div>
            <div className="breakup-row net">
              <span>Net Monthly Take-Home</span>
              <strong style={{ fontSize: "20px", color: "#108E50" }}>{formatINR(asgn.netSalary)}</strong>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function MonthlyPayrollScreen({ store, setStore, navigate, setToast }) {
  return (
    <DashboardLayout
      title="Monthly Payroll Run"
      subtitle="Calculate and process payroll for all college staff."
      breadcrumb={["Home", "Finance", "Payroll", "Process"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=generate" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Generate Payslips
        </Link>
        <PayrollGenerateTab store={store} setStore={setStore} navigate={navigate} setToast={setToast} onPreviewPayslip={() => {}} />
      </main>
    </DashboardLayout>
  );
}

function PayslipManagementScreen({ store, navigate }) {
  return (
    <DashboardLayout
      title="Payslips"
      subtitle="View, print and download staff monthly payslips."
      breadcrumb={["Home", "Finance", "Payroll", "Payslips"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=history" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Payslip History
        </Link>
        <PayrollHistoryTab store={store} navigate={navigate} setToast={() => {}} onPreviewPayslip={() => {}} />
      </main>
    </DashboardLayout>
  );
}

function PayslipPreviewScreen({ staffId, month, store, navigate, setToast }) {
  const asgn = useMemo(() => store.assignments.find((a) => a.staffId === staffId) || store.assignments[0], [staffId, store.assignments]);

  return (
    <DashboardLayout
      title={`Payslip Preview — ${asgn?.staffName}`}
      subtitle="Printable paper layout for official employee payslip."
      breadcrumb={["Home", "Finance", "Payroll", "Payslips", asgn?.staffName]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll?tab=history" className="cms-back-link">
          <ArrowLeft size={14} /> Back to Payroll
        </Link>
        <InteractivePayslipModal record={asgn} onClose={() => navigate("/dashboard/payroll?tab=history")} setToast={setToast} />
      </main>
    </DashboardLayout>
  );
}

function SalaryRevisionsScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Salary Revisions"
      subtitle="Review and approve salary increments and structure upgrades."
      breadcrumb={["Home", "Finance", "Payroll", "Revisions"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <DataTable
            rows={store.revisions || []}
            data={store.revisions || []}
            columns={[
              { key: "staffName", label: "Staff Name" },
              { key: "department", label: "Department" },
              { key: "previousGross", label: "Previous Gross", render: (r) => formatINR(r.previousGross) },
              { key: "revisedGross", label: "Revised Gross", render: (r) => <strong style={{ color: "#108E50" }}>{formatINR(r.revisedGross)}</strong> },
              { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

function BonusIncentivesScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Bonuses & Incentives"
      subtitle="Manage festival bonuses, performance incentives and one-time awards."
      breadcrumb={["Home", "Finance", "Payroll", "Bonus"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <DataTable
            rows={store.bonuses || []}
            data={store.bonuses || []}
            columns={[
              { key: "staffName", label: "Staff Name" },
              { key: "type", label: "Bonus Type" },
              { key: "amount", label: "Amount", render: (r) => formatINR(r.amount) },
              { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

function SalaryAdvancesScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Salary Advances & Loans"
      subtitle="Track employee salary advance requests and EMI monthly deductions."
      breadcrumb={["Home", "Finance", "Payroll", "Advances"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <DataTable
            rows={store.loans || []}
            data={store.loans || []}
            columns={[
              { key: "staffName", label: "Staff Name" },
              { key: "amount", label: "Principal", render: (r) => formatINR(r.amount) },
              { key: "monthlyEmi", label: "Monthly EMI", render: (r) => formatINR(r.monthlyEmi) },
              { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

function ReimbursementsScreen({ store, navigate, handleApproveItem }) {
  return (
    <DashboardLayout
      title="Staff Reimbursements"
      subtitle="Approve medical, travel and research reimbursement claims."
      breadcrumb={["Home", "Finance", "Payroll", "Reimbursements"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <DataTable
            rows={store.reimbursements || []}
            data={store.reimbursements || []}
            columns={[
              { key: "staffName", label: "Staff Name" },
              { key: "claimType", label: "Claim Type" },
              { key: "amount", label: "Amount", render: (r) => formatINR(r.amount) },
              { key: "status", label: "Status", render: (r) => <span className="cms-badge cms-badge-success">{r.status}</span> },
            ]}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}

function PayrollApprovalsScreen({ store, handleApproveItem, navigate }) {
  return (
    <DashboardLayout
      title="Payroll Approvals"
      subtitle="Centralized queue for salary revisions, loans, bonuses and claims."
      breadcrumb={["Home", "Finance", "Payroll", "Approvals"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <h3>Pending Approvals Queue</h3>
          <p style={{ color: "var(--cms-muted)" }}>All pending approvals have been processed.</p>
        </div>
      </main>
    </DashboardLayout>
  );
}

function PayrollReportsScreen({ store, navigate, setToast }) {
  return (
    <DashboardLayout
      title="Payroll Reports & Analytics"
      subtitle="Generate audit-ready statutory reports, monthly registers and bank transfer advice."
      breadcrumb={["Home", "Finance", "Payroll", "Reports"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-kpi-grid">
          <div className="salary-kpi-card" onClick={() => setToast("Generating Monthly Salary Register...")}>
            <div className="salary-kpi-icon"><FileSpreadsheet size={20} /></div>
            <div className="salary-kpi-data"><span>Monthly Register</span><strong>Download</strong></div>
          </div>
          <div className="salary-kpi-card" onClick={() => setToast("Generating PF Monthly Return ECR...")}>
            <div className="salary-kpi-icon"><ShieldAlert size={20} /></div>
            <div className="salary-kpi-data"><span>PF ECR File</span><strong>Generate</strong></div>
          </div>
          <div className="salary-kpi-card" onClick={() => setToast("Generating TDS Form 16 Summary...")}>
            <div className="salary-kpi-icon"><DollarSign size={20} /></div>
            <div className="salary-kpi-data"><span>TDS Form 24Q</span><strong>Export</strong></div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function PayrollSettingsScreen({ store, setStore, navigate, setToast }) {
  return (
    <DashboardLayout
      title="Payroll Settings"
      subtitle="Configure statutory rates, PF/ESI deduction rules and pay cycle calendar."
      breadcrumb={["Home", "Finance", "Payroll", "Settings"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <div className="salary-form-section-title">Statutory Contribution Rules</div>
          <div className="salary-form-grid-3">
            <div className="salary-form-group"><label>Employee PF Rate (%)</label><input type="number" defaultValue={12} /></div>
            <div className="salary-form-group"><label>Employer PF Rate (%)</label><input type="number" defaultValue={12} /></div>
            <div className="salary-form-group"><label>Professional Tax (₹)</label><input type="number" defaultValue={200} /></div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function SalaryImportScreen({ navigate, setToast }) {
  return (
    <DashboardLayout
      title="Import Salary Data"
      subtitle="Bulk import staff salary structures and past payout records via CSV / Excel."
      breadcrumb={["Home", "Finance", "Payroll", "Import"]}
    >
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Upload size={40} color="var(--cms-primary)" style={{ marginBottom: "12px" }} />
            <h3>Upload Staff Salary Data</h3>
            <p style={{ color: "var(--cms-muted)", marginBottom: "20px" }}>Drag and drop CSV template file or browse your computer.</p>
            <button type="button" className="cms-btn cms-btn-primary" onClick={() => { setToast("Import simulated successfully!"); navigate("/dashboard/payroll"); }}>
              Upload CSV File
            </button>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function AddSalaryRevisionScreen({ store, setStore, navigate, setToast }) {
  return (
    <DashboardLayout title="Request Salary Revision" breadcrumb={["Home", "Finance", "Payroll", "Revisions", "New"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">Feature integrated in Payroll.</div>
      </main>
    </DashboardLayout>
  );
}

function AddBonusScreen({ store, setStore, navigate, setToast }) {
  return (
    <DashboardLayout title="Add Bonus" breadcrumb={["Home", "Finance", "Payroll", "Bonus", "Add"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">Feature integrated in Payroll.</div>
      </main>
    </DashboardLayout>
  );
}

function AddSalaryAdvanceScreen({ store, setStore, navigate, setToast }) {
  return (
    <DashboardLayout title="Request Advance" breadcrumb={["Home", "Finance", "Payroll", "Advances", "New"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">Feature integrated in Payroll.</div>
      </main>
    </DashboardLayout>
  );
}

function AddReimbursementScreen({ store, setStore, navigate, setToast }) {
  return (
    <DashboardLayout title="Claim Reimbursement" breadcrumb={["Home", "Finance", "Payroll", "Reimbursements", "New"]}>
      <main className="salary-page-container">
        <Link to="/dashboard/payroll" className="cms-back-link"><ArrowLeft size={14} /> Back to Payroll</Link>
        <div className="salary-card-panel">Feature integrated in Payroll.</div>
      </main>
    </DashboardLayout>
  );
}

function EditSalaryStructureScreen({ id, store, setStore, navigate, setToast }) {
  return <AddSalaryStructureScreen store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
}

function EditSalaryAssignmentScreen({ id, store, setStore, navigate, setToast }) {
  return <AssignSalaryScreen staffType="Teaching" store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
}

function PayrollMonthViewScreen({ month, store, navigate }) {
  return <PayslipManagementScreen store={store} navigate={navigate} />;
}

function IndividualPayrollScreen({ month, staffId, store }) {
  return <PayslipPreviewScreen staffId={staffId} month={month} store={store} navigate={() => {}} setToast={() => {}} />;
}

function AttendanceImpactScreen({ store }) {
  return <MonthlyPayrollScreen store={store} setStore={() => {}} navigate={() => {}} setToast={() => {}} />;
}

function OvertimeManagementScreen({ store, setToast }) {
  return <MonthlyPayrollScreen store={store} setStore={() => {}} navigate={() => {}} setToast={setToast} />;
}
