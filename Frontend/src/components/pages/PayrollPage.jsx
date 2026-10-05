import { useState, useMemo, useEffect, useRef } from "react";
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
import { formatINR, calculateNetSalary } from "@/data/payrollData.js";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as payrollApi from "@/api/payrollApi.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import "./PayrollPage.css";

// 3D Unique Icons
import teachingStaff3d from "@/assets/dashboard-3d/teaching-staff.png";
import templates3d from "@/assets/settings-3d/templates.png";
import feeCollection3d from "@/assets/reports-3d/fee-collection.png";
import auditLogs3d from "@/assets/settings-3d/audit-logs.png";

import addStaff3d from "@/assets/dashboard-3d/add-staff.png";
import facultyWorkload3d from "@/assets/reports-3d/faculty-workload.png";
import nonTeachingStaff3d from "@/assets/dashboard-3d/non-teaching-staff.png";
import feeManagement3d from "@/assets/sidebar-3d/fee-management.png";

import studentStrength3d from "@/assets/reports-3d/student-strength.png";
import passPercentage3d from "@/assets/reports-3d/pass-percentage.png";
import dueFees3d from "@/assets/reports-3d/due-fees.png";
import academicYear3d from "@/assets/navbar-3d/academic-year.png";

import certificates3d from "@/assets/sidebar-3d/certificates.png";
import toppers3d from "@/assets/reports-3d/toppers.png";
import admissions3d from "@/assets/reports-3d/admissions.png";
import timetable3d from "@/assets/sidebar-3d/timetable.png";

import createGroup3d from "@/assets/dashboard-3d/create-group.png";
import createSection3d from "@/assets/dashboard-3d/create-section.png";
import numberSeries3d from "@/assets/settings-3d/number-series.png";
import reportsAnalytics3d from "@/assets/sidebar-3d/reports-analytics.png";
import markAttendance3d from "@/assets/dashboard-3d/mark-attendance.png";
import results3d from "@/assets/reports-3d/results.png";
import promotion3d from "@/assets/sidebar-3d/promotion.png";
import boardAcademicYear3d from "@/assets/settings-3d/board-academic-year.png";

const COLORS = ["#6F8400", "#108E50", "#B7791F", "#6D28D9", "#D93636", "#2563EB"];

const getPayrollField = (record, ...keys) => {
  if (!record || typeof record !== "object") return undefined;
  for (const key of keys) {
    const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
    if (record[key] !== undefined && record[key] !== null) return record[key];
    if (record[pascalKey] !== undefined && record[pascalKey] !== null) return record[pascalKey];
  }
  return undefined;
};

const getPayrollList = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values", "data", "Data", "payload", "Payload"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const key of ["data", "Data", "payload", "Payload", "result", "Result"]) {
    if (value[key] && typeof value[key] === "object") {
      const nested = getPayrollList(value[key]);
      if (nested.length) return nested;
    }
  }
  return [];
};

const getPayrollRecord = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  for (const key of ["data", "Data", "payload", "Payload", "result", "Result"]) {
    if (value[key] && typeof value[key] === "object" && !Array.isArray(value[key])) {
      return getPayrollRecord(value[key]);
    }
  }
  return value;
};

const mapApiPayslip = (payslip, employee = {}) => {
  const payrollMonth = Number(getPayrollField(payslip, "payrollMonth") ?? 0);
  const payrollYear = Number(getPayrollField(payslip, "payrollYear") ?? 0);
  const month = payrollMonth && payrollYear
    ? `${payrollYear}-${String(payrollMonth).padStart(2, "0")}`
    : "";
  const numericId = getPayrollField(payslip, "payslipId", "id");
  return {
    id: numericId != null ? `slip-${numericId}` : "",
    numericId,
    rawStaffId: getPayrollField(payslip, "staffId"),
    staffId: getPayrollField(payslip, "employeeId") || employee.employeeId || "",
    staffName: getPayrollField(payslip, "staffName") || employee.staffName || "",
    staffType: getPayrollField(payslip, "staffType") || employee.staffType || "",
    department: getPayrollField(payslip, "departmentName", "department") || employee.departmentName || employee.department || "",
    designation: getPayrollField(payslip, "designation") || employee.designation || "",
    salaryStructureId: getPayrollField(payslip, "salaryStructureId"),
    structureName: getPayrollField(payslip, "structureName") || "",
    month,
    periodLabel: month,
    year: payrollYear || "",
    basicPay: Number(getPayrollField(payslip, "basicPay") ?? 0),
    hra: Number(getPayrollField(payslip, "hra") ?? 0),
    da: Number(getPayrollField(payslip, "da") ?? 0),
    conveyanceAllowance: Number(getPayrollField(payslip, "conveyanceAllowance") ?? 0),
    medicalAllowance: Number(getPayrollField(payslip, "medicalAllowance") ?? 0),
    otherAllowance: Number(getPayrollField(payslip, "otherAllowance") ?? 0),
    pf: Number(getPayrollField(payslip, "pf") ?? 0),
    professionalTax: Number(getPayrollField(payslip, "professionalTax") ?? 0),
    tds: Number(getPayrollField(payslip, "tds") ?? 0),
    esi: Number(getPayrollField(payslip, "esi") ?? 0),
    insuranceOtherDeduction: Number(getPayrollField(payslip, "insuranceOtherDeduction") ?? 0),
    grossSalary: Number(getPayrollField(payslip, "grossSalary") ?? 0),
    totalDeductions: Number(getPayrollField(payslip, "totalDeductions") ?? 0),
    netSalary: Number(getPayrollField(payslip, "netSalary") ?? 0),
    status: getPayrollField(payslip, "payslipStatus", "status") || "",
    generatedAt: getPayrollField(payslip, "generatedAt") || "",
  };
};

const getNumericApiId = (value) => {
  const candidate = Number(value);
  return Number.isSafeInteger(candidate) && candidate > 0 ? candidate : null;
};

const dispatchPayslipEmail = async (record, setToast) => {
  const numericId = getNumericApiId(record?.numericId);
  if (!numericId) {
    setToast("The API did not provide a payslip ID, so the email cannot be sent.");
    return;
  }
  try {
    await payrollApi.sendPayslipEmail(numericId);
    setToast(`Payslip email sent to ${record.staffName || "the staff member"}.`);
  } catch (err) {
    setToast(`Unable to send payslip email: ${getApiErrorMessage(err)}`);
  }
};

const createEmptyPayrollStore = () => ({
  structures: [],
  assignments: [],
  payrollMonths: [],
  payslips: [],
  revisions: [],
  bonuses: [],
  loans: [],
  reimbursements: [],
  overtime: [],
  apiEmployees: [],
  apiSummary: null,
});

export default function PayrollPage({ mode = "payroll" }) {
  const navigate = useNavigate();
  const { id, month, staffId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCampusId } = useCampusContext();

  const [store, setStore] = useState(createEmptyPayrollStore);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const payrollRequestRef = useRef(0);

  // Live API Synchronization: Fetch structures, employees, assignments, payslips, revisions, bonuses, advances, summary
  useEffect(() => {
    const requestId = ++payrollRequestRef.current;
    let isMounted = true;
    const fetchPayrollFromApi = async () => {
      const campusParams = selectedCampusId != null && selectedCampusId !== ""
        ? { campusId: Number(selectedCampusId) || selectedCampusId }
        : {};
      const results = await Promise.allSettled([
        payrollApi.getSalaryStructures(),
        payrollApi.getEmployees(campusParams),
        payrollApi.getSalaryAssignments(campusParams),
        payrollApi.getPayslips(campusParams),
        payrollApi.getSalaryRevisions(campusParams),
        payrollApi.getBonuses(campusParams),
        payrollApi.getSalaryAdvances(),
        payrollApi.getPayrollSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), ...campusParams }),
      ]);

      if (!isMounted || requestId !== payrollRequestRef.current) return;

      const [structRes, empRes, asgnRes, slipRes, revRes, bonusRes, advRes, summaryRes] = results;
      const structuresRaw = structRes.status === "fulfilled" ? getPayrollList(structRes.value) : [];
      const employeesRaw = empRes.status === "fulfilled" ? getPayrollList(empRes.value) : [];
      const assignmentsRaw = asgnRes.status === "fulfilled" ? getPayrollList(asgnRes.value) : [];
      const payslipsRaw = slipRes.status === "fulfilled" ? getPayrollList(slipRes.value) : [];
      const revisionsRaw = revRes.status === "fulfilled" ? getPayrollList(revRes.value) : [];
      const bonusesRaw = bonusRes.status === "fulfilled" ? getPayrollList(bonusRes.value) : [];
      const advancesRaw = advRes.status === "fulfilled" ? getPayrollList(advRes.value) : [];

      const apiEmployees = employeesRaw.map((employee) => ({
        staffId: getPayrollField(employee, "staffId", "id"),
        employeeId: getPayrollField(employee, "employeeId"),
        staffName: getPayrollField(employee, "staffName", "name") || "",
        name: getPayrollField(employee, "staffName", "name") || "",
        staffType: getPayrollField(employee, "staffType", "employmentType") || "",
        departmentId: getPayrollField(employee, "departmentId"),
        departmentName: getPayrollField(employee, "departmentName", "department") || "",
        designationId: getPayrollField(employee, "designationId"),
        designation: getPayrollField(employee, "designation", "designationName") || "",
        assignmentId: getPayrollField(employee, "assignmentId"),
        salaryStructureId: getPayrollField(employee, "salaryStructureId"),
        structureName: getPayrollField(employee, "structureName") || "",
        basicPay: getPayrollField(employee, "basicPay") == null ? null : Number(getPayrollField(employee, "basicPay")),
        grossSalary: getPayrollField(employee, "grossSalary") == null ? null : Number(getPayrollField(employee, "grossSalary")),
        totalDeductions: getPayrollField(employee, "totalDeductions") == null ? null : Number(getPayrollField(employee, "totalDeductions")),
        netSalary: getPayrollField(employee, "netSalary") == null ? null : Number(getPayrollField(employee, "netSalary")),
        effectiveFrom: getPayrollField(employee, "effectiveFrom") || "",
        effectiveTo: getPayrollField(employee, "effectiveTo") || "",
        status: getPayrollField(employee, "status") || "",
      }));
      const empMap = new Map();
      apiEmployees.forEach((employee) => {
        [employee.staffId, employee.employeeId].filter((key) => key != null && key !== "").forEach((key) => empMap.set(String(key), employee));
      });

      const structures = structuresRaw.map((structure) => {
        const idValue = getPayrollField(structure, "id");
        const basicPay = Number(getPayrollField(structure, "basicPay") ?? 0);
        const hra = Number(getPayrollField(structure, "hra") ?? 0);
        const da = Number(getPayrollField(structure, "da") ?? 0);
        const conveyanceAllowance = Number(getPayrollField(structure, "conveyanceAllowance") ?? 0);
        const medicalAllowance = Number(getPayrollField(structure, "medicalAllowance") ?? 0);
        const otherAllowance = Number(getPayrollField(structure, "otherAllowance") ?? 0);
        const pf = Number(getPayrollField(structure, "pf") ?? 0);
        const esi = Number(getPayrollField(structure, "esi") ?? 0);
        const professionalTax = Number(getPayrollField(structure, "professionalTax") ?? 0);
        const tds = Number(getPayrollField(structure, "tds") ?? 0);
        const insuranceOtherDeduction = Number(getPayrollField(structure, "insuranceOtherDeduction") ?? 0);
        const grossSalary = Number(getPayrollField(structure, "grossSalary") ?? (basicPay + hra + da + conveyanceAllowance + medicalAllowance + otherAllowance));
        const totalDeductions = Number(getPayrollField(structure, "totalDeductions") ?? (pf + esi + professionalTax + tds + insuranceOtherDeduction));
        return {
          id: idValue != null ? `struct-${idValue}` : "",
          numericId: idValue,
          name: getPayrollField(structure, "structureName", "name") || "",
          staffType: getPayrollField(structure, "staffType") || "",
          departmentId: getPayrollField(structure, "departmentId"),
          department: getPayrollField(structure, "departmentName", "department") || "",
          designationId: getPayrollField(structure, "designationId"),
          designation: getPayrollField(structure, "designationName", "designation") || "",
          basicPay,
          hra,
          da,
          transportAllowance: conveyanceAllowance,
          medicalAllowance,
          specialAllowance: 0,
          academicAllowance: 0,
          otherAllowances: otherAllowance,
          pf,
          employerPf: 0,
          esi,
          professionalTax,
          tds,
          insurance: insuranceOtherDeduction,
          otherDeductions: 0,
          grossSalary,
          totalDeductions,
          netSalary: Number(getPayrollField(structure, "netSalary") ?? Math.max(0, grossSalary - totalDeductions)),
          assignedCount: Number(getPayrollField(structure, "assignedStaff", "assignedCount") ?? 0),
          status: getPayrollField(structure, "status") || "",
        };
      });
      const structureMap = new Map(structures.map((structure) => [String(structure.numericId), structure]));

      const assignments = assignmentsRaw.map((assignment) => {
        const assignmentId = getPayrollField(assignment, "assignmentId", "id");
        const rawStaffId = getPayrollField(assignment, "staffId");
        const employee = empMap.get(String(rawStaffId)) || {};
        const rawStructureId = getPayrollField(assignment, "salaryStructureId") ?? employee.salaryStructureId;
        const structure = structureMap.get(String(rawStructureId)) || {};
        const employeeId = employee.employeeId || getPayrollField(assignment, "employeeId") || "";
        return {
          id: assignmentId != null ? `asgn-${assignmentId}` : `asgn-staff-${rawStaffId ?? ""}`,
          numericId: assignmentId,
          assignmentId,
          staffId: employeeId || String(rawStaffId ?? ""),
          rawStaffId,
          staffName: employee.staffName || getPayrollField(assignment, "staffName") || "",
          staffType: employee.staffType || getPayrollField(assignment, "staffType") || "",
          department: employee.departmentName || getPayrollField(assignment, "departmentName", "department") || "",
          designation: employee.designation || getPayrollField(assignment, "designation") || "",
          structureId: rawStructureId != null ? `struct-${rawStructureId}` : "",
          rawStructureId,
          structureName: structure.name || getPayrollField(assignment, "structureName") || "",
          basicPay: Number(employee.basicPay ?? getPayrollField(assignment, "basicPay") ?? structure.basicPay ?? 0),
          grossSalary: Number(employee.grossSalary ?? getPayrollField(assignment, "grossSalary") ?? structure.grossSalary ?? 0),
          totalDeductions: Number(employee.totalDeductions ?? getPayrollField(assignment, "totalDeductions") ?? structure.totalDeductions ?? 0),
          netSalary: Number(employee.netSalary ?? getPayrollField(assignment, "netSalary") ?? structure.netSalary ?? 0),
          effectiveFrom: String(getPayrollField(assignment, "effectiveFrom") || employee.effectiveFrom || "").split("T")[0],
          status: getPayrollField(assignment, "status") || employee.status || "",
          paymentMode: getPayrollField(assignment, "paymentMode") || "",
          bankName: getPayrollField(assignment, "bankName") || "",
          accountNumber: getPayrollField(assignment, "accountNumber") || "",
          ifscCode: getPayrollField(assignment, "ifscCode") || "",
          panNumber: getPayrollField(assignment, "panNumber") || "",
          uanNumber: getPayrollField(assignment, "uanNumber") || "",
        };
      });

      const mapPersonFields = (row) => {
        const rawStaffId = getPayrollField(row, "staffId");
        const employee = empMap.get(String(rawStaffId)) || {};
        return {
          staffId: employee.employeeId || getPayrollField(row, "employeeId") || String(rawStaffId ?? ""),
          rawStaffId,
          staffName: employee.staffName || getPayrollField(row, "staffName") || "",
          staffType: employee.staffType || getPayrollField(row, "staffType") || "",
          department: employee.departmentName || getPayrollField(row, "departmentName", "department") || "",
          designation: employee.designation || getPayrollField(row, "designation") || "",
        };
      };
      const payslips = payslipsRaw.map((payslip) => {
        const person = mapPersonFields(payslip);
        return mapApiPayslip(payslip, person);
      });
      const revisions = revisionsRaw.map((revision) => {
        const person = mapPersonFields(revision);
        const currentStructureId = getPayrollField(revision, "currentSalaryStructureId");
        const proposedStructureId = getPayrollField(revision, "proposedSalaryStructureId");
        const currentStructure = structureMap.get(String(currentStructureId)) || {};
        const proposedStructure = structureMap.get(String(proposedStructureId)) || {};
        const currentGross = Number(currentStructure.grossSalary ?? 0);
        const proposedGross = Number(proposedStructure.grossSalary ?? 0);
        return {
          ...person,
          id: `rev-${getPayrollField(revision, "id") ?? ""}`,
          numericId: getPayrollField(revision, "id"),
          currentSalaryStructureId: currentStructureId,
          proposedSalaryStructureId: proposedStructureId,
          previousGross: currentGross,
          revisedGross: proposedGross,
          currentSalary: currentGross,
          revisedSalary: proposedGross,
          percentage: currentGross > 0 ? ((proposedGross - currentGross) / currentGross) * 100 : 0,
          effectiveDate: String(getPayrollField(revision, "effectiveFrom") || "").split("T")[0],
          reason: getPayrollField(revision, "reason") || "",
          status: getPayrollField(revision, "status") || "",
          approvedBy: getPayrollField(revision, "approvedBy") ?? null,
        };
      });
      const bonuses = bonusesRaw.map((bonus) => ({
        ...mapPersonFields(bonus),
        id: `bonus-${getPayrollField(bonus, "id") ?? ""}`,
        numericId: getPayrollField(bonus, "id"),
        type: getPayrollField(bonus, "bonusType") || "",
        bonusType: getPayrollField(bonus, "bonusType") || "",
        amount: Number(getPayrollField(bonus, "amount") ?? 0),
        month: `${getPayrollField(bonus, "bonusYear") || ""}-${String(getPayrollField(bonus, "bonusMonth") || "").padStart(2, "0")}`,
        reason: getPayrollField(bonus, "reason") || "",
        status: getPayrollField(bonus, "status") || "",
        approvedBy: getPayrollField(bonus, "approvedBy") ?? null,
      }));
      const loans = advancesRaw.map((advance) => ({
        ...mapPersonFields(advance),
        id: `adv-${getPayrollField(advance, "id") ?? ""}`,
        numericId: getPayrollField(advance, "id"),
        type: getPayrollField(advance, "advanceType") || "",
        advanceAmount: Number(getPayrollField(advance, "amount") ?? 0),
        loanAmount: Number(getPayrollField(advance, "amount") ?? 0),
        amount: Number(getPayrollField(advance, "amount") ?? 0),
        monthlyDeduction: Number(getPayrollField(advance, "monthlyDeduction") ?? 0),
        emi: Number(getPayrollField(advance, "monthlyDeduction") ?? 0),
        repaymentMonths: Number(getPayrollField(advance, "repaymentMonths") ?? 0),
        tenureMonths: Number(getPayrollField(advance, "repaymentMonths") ?? 0),
        startMonth: Number(getPayrollField(advance, "startMonth") ?? 0),
        startYear: Number(getPayrollField(advance, "startYear") ?? 0),
        reason: getPayrollField(advance, "reason") || "",
        status: getPayrollField(advance, "status") || "",
        approvedBy: getPayrollField(advance, "approvedBy") ?? null,
      }));

      setStore((previous) => ({
        ...previous,
        structures,
        apiEmployees,
        assignments,
        payslips,
        revisions,
        bonuses,
        loans,
        apiSummary: summaryRes.status === "fulfilled" ? getPayrollRecord(summaryRes.value) : null,
      }));

      const resourceNames = ["salary structures", "employees", "salary assignments", "payslips", "revisions", "bonuses", "advances", "summary"];
      const failedIndexes = results.map((result, index) => result.status === "rejected" ? index : -1).filter((index) => index >= 0);
      if (failedIndexes.length) {
        const failure = getApiErrorMessage(results[failedIndexes[0]].reason);
        setToast(`Unable to load Payroll ${failedIndexes.map((index) => resourceNames[index]).join(", ")}: ${failure}`);
      }
    };

    fetchPayrollFromApi();
    return () => {
      isMounted = false;
      if (payrollRequestRef.current === requestId) payrollRequestRef.current += 1;
    };
  }, [selectedCampusId]);

  // Derived KPI metrics
  const kpiData = useMemo(() => {
    const assignments = Array.isArray(store?.assignments) ? store.assignments : [];
    const structures = Array.isArray(store?.structures) ? store.structures : [];
    const summary = store?.apiSummary || {};
    const assignedStaffIds = new Set(assignments
      .map((assignment) => assignment.rawStaffId ?? assignment.staffId)
      .filter((staffId) => staffId != null && String(staffId).trim() !== "")
      .map(String));
    const assignedStaffCount = assignedStaffIds.size || assignments.length;
    const totalStaff = assignedStaffCount || Number(getPayrollField(summary, "totalEmployees") ?? 0);
    const teachingAssigned = assignments.filter((a) => a.staffType === "Teaching" && a.status === "Active").length;
    const nonTeachingAssigned = assignments.filter((a) => a.staffType === "Non-Teaching" && a.status === "Active").length;
    const pendingAssigned = assignments.filter((a) => a.status === "Pending").length;
    const activeStructures = structures.filter((s) => s.status === "Active").length;
    const grossTotal = assignments.reduce((sum, a) => sum + Number(a.grossSalary || 0), 0);
    const deductionsTotal = assignments.reduce((sum, a) => sum + Number(a.totalDeductions || 0), 0);
    const netTotal = Number(getPayrollField(summary, "totalNetSalary") ?? assignments.reduce((sum, a) => sum + Number(a.netSalary || 0), 0));
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
  const handleHoldToggle = async (asgnId, currentStatus) => {
    const nextStatus = currentStatus === "On Hold" ? "Active" : "On Hold";
    const assignment = store.assignments.find((item) => item.id === asgnId);
    const numericId = getNumericApiId(assignment?.numericId);
    if (!numericId) {
      setToast("The API did not provide a salary assignment ID, so its status cannot be changed.");
      return;
    }
    try {
      await payrollApi.updateSalaryAssignmentStatus(numericId, nextStatus);
      setStore((prev) => ({
        ...prev,
        assignments: prev.assignments.map((a) => (a.id === asgnId ? { ...a, status: nextStatus } : a)),
      }));
      setToast(`Status updated to ${nextStatus}`);
      setModal(null);
    } catch (err) {
      setToast(`Unable to update assignment status: ${getApiErrorMessage(err)}`);
    }
  };

  const handleDeleteStructure = async (structId) => {
    const structure = store.structures.find((item) => item.id === structId);
    const numericId = getNumericApiId(structure?.numericId);
    if (!numericId) {
      setToast("The API did not provide a salary structure ID, so it cannot be deleted.");
      return;
    }
    try {
      await payrollApi.deleteSalaryStructure(numericId);
      setStore((prev) => ({
        ...prev,
        structures: prev.structures.filter((s) => s.id !== structId),
      }));
      setToast("Salary structure deleted successfully");
      setModal(null);
    } catch (err) {
      setToast(`Unable to delete salary structure: ${getApiErrorMessage(err)}`);
    }
  };

  const handleDeleteAssignment = async (asgnId) => {
    const assignment = store.assignments.find((item) => item.id === asgnId);
    const numericId = getNumericApiId(assignment?.numericId);
    if (!numericId) {
      setToast("The API did not provide a salary assignment ID, so it cannot be deleted.");
      return;
    }
    try {
      await payrollApi.deleteSalaryAssignment(numericId);
      setStore((prev) => ({
        ...prev,
        assignments: prev.assignments.filter((a) => a.id !== asgnId),
      }));
      setToast("Salary assignment removed successfully");
      setModal(null);
    } catch (err) {
      setToast(`Unable to remove salary assignment: ${getApiErrorMessage(err)}`);
    }
  };

  const handleApproveItem = async (type, itemId) => {
    if (type === "reimbursement") {
      setToast("The supplied Payroll APIs do not include reimbursement approval.");
      return;
    }
    const records = type === "revision" ? store.revisions
      : type === "bonus" ? store.bonuses
      : type === "loan" || type === "advance" ? store.loans
      : [];
    const record = records.find((item) => item.id === itemId);
    const numericId = getNumericApiId(record?.numericId);
    if (!numericId) {
      setToast("The API did not provide an approval record ID.");
      return;
    }

    try {
      if (type === "revision") {
        await payrollApi.approveSalaryRevision(numericId);
      } else if (type === "bonus") {
        await payrollApi.approveBonus(numericId);
      } else if (type === "loan" || type === "advance") {
        await payrollApi.approveSalaryAdvance(numericId);
      } else {
        return;
      }

      if (type === "revision") {
        setStore((prev) => ({ ...prev, revisions: prev.revisions.map((item) => item.id === itemId ? { ...item, status: "Approved" } : item) }));
      } else if (type === "bonus") {
        setStore((prev) => ({ ...prev, bonuses: prev.bonuses.map((item) => item.id === itemId ? { ...item, status: "Approved" } : item) }));
      } else {
        setStore((prev) => ({ ...prev, loans: prev.loans.map((item) => item.id === itemId ? { ...item, status: "Active" } : item) }));
      }
      setToast(`${type.toUpperCase()} request approved`);
      setModal(null);
    } catch (err) {
      setToast(`Unable to approve ${type}: ${getApiErrorMessage(err)}`);
    }
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
            onClick={() => navigate("/dashboard/payroll/assign/teaching")}
          >
            <img src={createGroup3d} alt="" className="payroll-3d-icon" width={16} height={16} /> + Assign Teaching
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/payroll/assign/non-teaching")}
          >
            <img src={createSection3d} alt="" className="payroll-3d-icon" width={16} height={16} /> + Assign Non-Teaching
          </button>
        </div>
      );
    }
    if (activeTab === "structures") {
      return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/payroll/structures/add")}
          >
            <img src={numberSeries3d} alt="" className="payroll-3d-icon" width={16} height={16} /> + Add Salary Structure
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
            onClick={() => setToast("The supplied Payroll APIs do not include a report download endpoint.")}
          >
            <img src={reportsAnalytics3d} alt="" className="payroll-3d-icon" width={16} height={16} /> Monthly Report
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => navigate("/dashboard/payroll/process")}
          >
            <img src={markAttendance3d} alt="" className="payroll-3d-icon" width={16} height={16} /> Full Batch Process
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
            onClick={() => setToast("The supplied Payroll APIs do not include a payslip export endpoint.")}
          >
            <img src={results3d} alt="" className="payroll-3d-icon" width={16} height={16} /> Export History
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => navigate("/dashboard/payroll/reports")}
          >
            <img src={promotion3d} alt="" className="payroll-3d-icon" width={16} height={16} /> Analytics & Reports
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
            <img src={teachingStaff3d} alt="" className="payroll-3d-icon" width={18} height={18} />
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
            <img src={templates3d} alt="" className="payroll-3d-icon" width={18} height={18} />
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
            <img src={feeCollection3d} alt="" className="payroll-3d-icon" width={18} height={18} />
            <span>GENERATE PAYSLIPS</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            className={`payroll-top-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => handleTabChange("history")}
          >
            <img src={auditLogs3d} alt="" className="payroll-3d-icon" width={18} height={18} />
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
      return true;
    });
  }, [store?.assignments, filterType, filterDept, filterStatus]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* KPI Cards Row */}
      <div className="payroll-stats-row">
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon"><img src={addStaff3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Total Staff Assigned</span>
            <strong>{kpiData.totalStaff}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green"><img src={facultyWorkload3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Teaching Staff</span>
            <strong>{kpiData.teachingAssigned}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue"><img src={nonTeachingStaff3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Non-Teaching Staff</span>
            <strong>{kpiData.nonTeachingAssigned}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon amber"><img src={feeManagement3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Total Net Outflow</span>
            <strong>{formatINR(kpiData.netTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Staff Table with integrated single-row toolbar */}
      <DataTable
        rows={filtered}
        data={filtered}
        searchPlaceholder="Search records..."
        toolbarExtra={
          <>
            {/* Staff Type Dropdown Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                fontWeight: 500,
                height: "36px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Staff Types</option>
              <option value="Teaching">Teaching</option>
              <option value="Non-Teaching">Non-Teaching</option>
            </select>

            {/* Department Filter */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
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
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="On Hold">On Hold</option>
            </select>

            {/* Action Buttons */}
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ fontSize: "12px", padding: "6px 12px", whiteSpace: "nowrap", height: "36px" }}
              onClick={() => navigate("/dashboard/payroll/import")}
            >
              <img src={boardAcademicYear3d} alt="" className="payroll-3d-icon" width={16} height={16} /> Import Salary Data
            </button>
          </>
        }
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
                <strong style={{ fontSize: "13px" }}>{r.staffName}</strong>
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
  );
}

// ----------------------------------------------------------------------
// TAB 2 — SALARY STRUCTURES
// ----------------------------------------------------------------------
function PayrollStructuresTab({ store, navigate, setModal, setToast, handleDeleteStructure }) {
  const [filterType, setFilterType] = useState("All");
  const [departmentLookup, setDepartmentLookup] = useState([]);
  const [designationLookup, setDesignationLookup] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get(apiEndpoints.departments.getAll, { skipGlobalLoader: true }),
      apiClient.get(apiEndpoints.designations.getAll, { skipGlobalLoader: true }),
    ]).then(([departments, designations]) => {
      if (!active) return;
      if (departments.status === "fulfilled") setDepartmentLookup(getPayrollList(departments.value));
      if (designations.status === "fulfilled") setDesignationLookup(getPayrollList(designations.value));
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const list = Array.isArray(store?.structures) ? store.structures : [];
    const withLookupNames = list.map((structure) => {
      const department = departmentLookup.find((item) => String(getPayrollField(item, "departmentId", "id")) === String(structure.departmentId));
      const designation = designationLookup.find((item) => String(getPayrollField(item, "designationId", "roleId", "id")) === String(structure.designationId));
      return {
        ...structure,
        department: structure.department || getPayrollField(department, "departmentName", "name") || "",
        designation: structure.designation || getPayrollField(designation, "designationName", "roleName", "designation", "role", "name") || "",
      };
    });
    return withLookupNames.filter((s) => {
      if (!s || typeof s !== "object") return false;
      if (filterType !== "All" && s.staffType !== filterType) return false;
      return true;
    });
  }, [store?.structures, filterType, departmentLookup, designationLookup]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <DataTable
        rows={filtered}
        data={filtered}
        title="Salary Structures"
        searchPlaceholder="Search structure by name, role, dept..."
        toolbarExtra={
          <>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                fontWeight: 500,
                height: "36px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Staff Types</option>
              <option value="Teaching">Teaching</option>
              <option value="Non-Teaching">Non-Teaching</option>
            </select>

            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              style={{ fontSize: "12px", padding: "6px 12px", whiteSpace: "nowrap", height: "36px" }}
              onClick={() => setToast("The supplied Payroll APIs do not include a salary structure export endpoint.")}
            >
              <Download size={14} /> Export CSV
            </button>
          </>
        }
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
            render: (r) => `${r.department || "—"} — ${r.designation || "—"}`,
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
  );
}

// ----------------------------------------------------------------------
// TAB 3 — GENERATE PAYSLIPS
// ----------------------------------------------------------------------
function PayrollGenerateTab({ store, setStore, navigate, setToast, onPreviewPayslip }) {
  const { selectedCampusId } = useCampusContext();
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
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
  const assignmentsSignature = assignmentsList.map((assignment) => assignment.id).join("|");
  const previousAssignmentsSignature = useRef(null);
  useEffect(() => {
    if (previousAssignmentsSignature.current === assignmentsSignature) return;
    previousAssignmentsSignature.current = assignmentsSignature;
    setSelectedStaffIds(assignmentsList.map((assignment) => assignment.id));
  }, [assignmentsSignature, assignmentsList]);

  const payslipsList = useMemo(() => {
    return Array.isArray(store?.payslips) ? store.payslips : [];
  }, [store?.payslips]);

  const availableGenerationYears = useMemo(() => Array.from(new Set([
    String(new Date().getFullYear()),
    ...payslipsList.map((payslip) => String(payslip.year || "")).filter(Boolean),
  ])).sort((first, second) => Number(second) - Number(first)), [payslipsList]);

  const filteredStaff = useMemo(() => {
    return assignmentsList.filter((a) => {
      if (!a || typeof a !== "object") return false;
      if (categoryFilter !== "All" && a.staffType !== categoryFilter) return false;
      return true;
    });
  }, [assignmentsList, categoryFilter]);

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
  const handleGeneratePayslips = async () => {
    if (selectedStaffIds.length === 0 || isGenerating) return;
    setIsGenerating(true);

    const targetMonthKey = `${selectedYear}-${selectedMonth}`;
    const periodLabel = currentPeriodLabel;
    const selectedAssignments = assignmentsList.filter((assignment) => selectedStaffIds.includes(assignment.id));
    const numericStaffIds = selectedAssignments.map((assignment) => getNumericApiId(assignment.rawStaffId));
    if (numericStaffIds.some((staffId) => !staffId)) {
      setToast("The API did not provide a numeric staff ID for every selected employee.");
      setIsGenerating(false);
      return;
    }

    try {
      const payload = {
        payrollMonth: Number(selectedMonth),
        payrollYear: Number(selectedYear),
      };
      if (numericStaffIds.length === 1) {
        await payrollApi.generatePayslip({ staffId: numericStaffIds[0], ...payload });
      } else {
        await payrollApi.generatePayslipsBulk({ staffIds: numericStaffIds, ...payload });
      }

      const query = {
        payrollMonth: Number(selectedMonth),
        payrollYear: Number(selectedYear),
        ...(selectedCampusId != null && selectedCampusId !== "" ? { campusId: Number(selectedCampusId) || selectedCampusId } : {}),
      };
      const [payslipsResult, summaryResult] = await Promise.allSettled([
        payrollApi.getPayslips(query),
        payrollApi.getPayrollSummary({ month: Number(selectedMonth), year: Number(selectedYear), ...(selectedCampusId != null && selectedCampusId !== "" ? { campusId: Number(selectedCampusId) || selectedCampusId } : {}) }),
      ]);
      if (payslipsResult.status === "rejected") throw payslipsResult.reason;
      const refreshedPayslips = getPayrollList(payslipsResult.value).map((payslip) => mapApiPayslip(payslip));
      setStore((previous) => ({
        ...previous,
        payslips: refreshedPayslips,
        ...(summaryResult.status === "fulfilled" ? { apiSummary: getPayrollRecord(summaryResult.value) } : {}),
      }));
      setToast(summaryResult.status === "rejected"
        ? `Generated payslips for ${periodLabel}, but summary refresh failed: ${getApiErrorMessage(summaryResult.reason)}`
        : `Generated payslips for ${periodLabel}.`);
    } catch (err) {
      setToast(`Unable to generate or refresh payslips: ${getApiErrorMessage(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendSelectedEmails = async () => {
    const selectedIds = new Set(selectedAssignmentsForPeriod.map((assignment) => String(assignment.rawStaffId)));
    const matchingPayslips = payslipsList.filter((payslip) =>
      payslip.month === `${selectedYear}-${selectedMonth}` && selectedIds.has(String(payslip.rawStaffId))
    );
    if (matchingPayslips.length === 0) {
      setToast("No generated payslips exist for the selected employees and period.");
      return;
    }
    const validPayslips = matchingPayslips.filter((payslip) => getNumericApiId(payslip.numericId));
    const missingIds = matchingPayslips.length - validPayslips.length;
    const results = await Promise.allSettled(validPayslips.map((payslip) =>
      payrollApi.sendPayslipEmail(getNumericApiId(payslip.numericId))
    ));
    const sentCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = results.length - sentCount + missingIds;
    setToast(failedCount
      ? `Sent ${sentCount} payslip email(s); ${failedCount} failed.`
      : `Sent ${sentCount} payslip email(s).`);
  };

  // Recently Generated Payslips for Selected Period
  const targetMonthKey = `${selectedYear}-${selectedMonth}`;
  const recentlyGenerated = useMemo(() => {
    return payslipsList.filter((p) => p && p.month === targetMonthKey);
  }, [payslipsList, targetMonthKey, selectedYear]);
  const selectedAssignmentsForPeriod = useMemo(() => assignmentsList.filter((assignment) => selectedStaffIds.includes(assignment.id)), [assignmentsList, selectedStaffIds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Stats Banner */}
      <div className="payroll-stats-row">
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon"><img src={studentStrength3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Eligible Staff</span>
            <strong>{assignmentsList.length} Employees</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green"><img src={passPercentage3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Selected for Generation</span>
            <strong>{selectedStaffIds.length} Employees</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue"><img src={dueFees3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Selected Net Outflow</span>
            <strong>{formatINR(selectedNetTotal)}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon amber"><img src={academicYear3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Target Period</span>
            <strong style={{ fontSize: "16px" }}>{currentPeriodLabel}</strong>
          </div>
        </div>
      </div>

      {/* Options & Quick Settings */}
      <div style={{ display: "flex", gap: "20px", padding: "10px 16px", background: "var(--cms-surface)", border: "1px solid var(--cms-border)", borderRadius: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", color: "var(--cms-text)" }}>
          <input type="checkbox" checked={autoLOP} onChange={(e) => setAutoLOP(e.target.checked)} />
          <span>Auto-deduct Attendance LOP</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", color: "var(--cms-text)" }}>
          <input type="checkbox" checked={includeBonus} onChange={(e) => setIncludeBonus(e.target.checked)} />
          <span>Include Approved Bonuses</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", color: "var(--cms-text)" }}>
          <input type="checkbox" checked={applyTDS} onChange={(e) => setApplyTDS(e.target.checked)} />
          <span>Apply TDS Deductions</span>
        </label>
      </div>

      {/* Staff Selection Table with integrated single-row toolbar */}
      <DataTable
        rows={filteredStaff}
        data={filteredStaff}
        searchPlaceholder="Search records..."
        toolbarExtra={
          <>
            {/* Period Dropdown */}
            <select
              value={presetPeriod}
              onChange={(e) => setPresetPeriod(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                fontWeight: 500,
                height: "36px",
                cursor: "pointer",
              }}
            >
              <option value="1m">1M (Current)</option>
              <option value="3m">3M (Quarter)</option>
              <option value="6m">6M (Half-Year)</option>
              <option value="12m">12M (Annual)</option>
            </select>

            {/* Month Picker */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
              }}
            >
              {monthNames.map((m) => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>

            {/* Year Picker */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
              }}
            >
              {availableGenerationYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>

            {/* Staff Type / Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                fontWeight: 500,
                height: "36px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Staff Types</option>
              <option value="Teaching">Teaching</option>
              <option value="Non-Teaching">Non-Teaching</option>
            </select>
          </>
        }
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
              onClick={handleSendSelectedEmails}
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
              render: (r) => r.ctc == null ? "—" : formatINR(r.ctc),
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
                    onClick={() => dispatchPayslipEmail(r, setToast)}
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

  const availableYears = useMemo(() => Array.from(new Set(
    payslipsList.map((payslip) => String(payslip.year || "")).filter(Boolean)
  )).sort((first, second) => Number(second) - Number(first)), [payslipsList]);

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
      return true;
    });
  }, [payslipsList, filterMonth, filterYear, filterDept, filterStatus]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Real-data KPI Cards */}
      <div className="payroll-stats-row">
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon"><img src={certificates3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Total Payslips</span>
            <strong>{historyKPIs.totalCount} Records</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon green"><img src={toppers3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Paid Outflow</span>
            <strong>{formatINR(historyKPIs.totalNetOutflow)}</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon blue"><img src={admissions3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Paid / Generated</span>
            <strong>{historyKPIs.paidCount} Payslips</strong>
          </div>
        </div>
        <div className="payroll-stat-card">
          <div className="payroll-stat-icon amber"><img src={timetable3d} alt="" className="payroll-3d-icon" width={32} height={32} /></div>
          <div className="payroll-stat-info">
            <span>Pending Payment</span>
            <strong>{historyKPIs.pendingCount} Payslips</strong>
          </div>
        </div>
      </div>

      {/* History DataTable with integrated single-row toolbar */}
      <DataTable
        rows={filteredHistory}
        data={filteredHistory}
        title="Payslip History"
        searchPlaceholder="Search records..."
        toolbarExtra={
          <>
            {/* Month Filter */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
              }}
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

            {/* Year Filter */}
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Years</option>
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>

            {/* Department Filter */}
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
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
                borderRadius: "8px",
                border: "1px solid var(--cms-border)",
                fontSize: "12px",
                background: "var(--cms-surface)",
                color: "var(--cms-text)",
                height: "36px",
                cursor: "pointer",
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Generated">Generated</option>
              <option value="Pending">Pending</option>
            </select>
          </>
        }
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
                {r.status || "—"}
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
                  onClick={() => dispatchPayslipEmail(r, setToast)}
                >
                  <Mail size={12} />
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// INTERACTIVE PAYSLIP MODAL
// ----------------------------------------------------------------------
function InteractivePayslipModal({ record, onClose, setToast }) {
  const [payslipDetails, setPayslipDetails] = useState(record);

  useEffect(() => {
    let active = true;
    setPayslipDetails(record);
    const numericId = getNumericApiId(record?.numericId);
    if (!numericId) return () => { active = false; };
    payrollApi.getPayslipById(numericId)
      .then((response) => {
        if (active) setPayslipDetails({ ...record, ...mapApiPayslip(getPayrollRecord(response), record) });
      })
      .catch((err) => {
        if (active) setToast(`Unable to load payslip details: ${getApiErrorMessage(err)}`);
      });
    return () => { active = false; };
  }, [record?.numericId, record?.id]);

  if (!record) return null;
  const displayRecord = payslipDetails || record;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    await dispatchPayslipEmail(displayRecord, setToast);
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
              <p style={{ fontSize: "12px", color: "var(--cms-muted)" }}>Salary Payslip for the Month of {displayRecord.periodLabel || displayRecord.month || "—"}</p>
            </div>

            <div className="payslip-meta-grid">
              <div className="payslip-meta-item"><span>Employee ID:</span><strong>{displayRecord.staffId || "—"}</strong></div>
              <div className="payslip-meta-item"><span>Staff Name:</span><strong>{displayRecord.staffName || "—"}</strong></div>
              <div className="payslip-meta-item"><span>Department:</span><strong>{displayRecord.department || "—"}</strong></div>
              <div className="payslip-meta-item"><span>Designation:</span><strong>{displayRecord.designation || "—"}</strong></div>
              <div className="payslip-meta-item"><span>Payment Mode:</span><strong>—</strong></div>
              <div className="payslip-meta-item"><span>Status:</span><span className="cms-badge cms-badge-success">{displayRecord.status || "—"}</span></div>
            </div>

            <div className="payslip-tables-grid">
              {/* Earnings */}
              <div className="payslip-section">
                <h4>EARNINGS</h4>
                <table className="payslip-table">
                  <tbody>
                    <tr><td>Basic Pay</td><td>{formatINR(displayRecord.basicPay)}</td></tr>
                    <tr><td>House Rent Allowance (HRA)</td><td>{formatINR(displayRecord.hra)}</td></tr>
                    <tr><td>Dearness Allowance (DA)</td><td>{formatINR(displayRecord.da)}</td></tr>
                    <tr><td>Other Allowances</td><td>{formatINR(Number(displayRecord.conveyanceAllowance || 0) + Number(displayRecord.medicalAllowance || 0) + Number(displayRecord.otherAllowance || 0))}</td></tr>
                    <tr className="subtotal"><td>Total Gross Earnings</td><td>{formatINR(displayRecord.grossSalary)}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Deductions */}
              <div className="payslip-section">
                <h4>DEDUCTIONS</h4>
                <table className="payslip-table">
                  <tbody>
                    <tr><td>Provident Fund (PF)</td><td>{formatINR(displayRecord.pf)}</td></tr>
                    <tr><td>Professional Tax (PT)</td><td>{formatINR(displayRecord.professionalTax)}</td></tr>
                    <tr><td>TDS (Income Tax)</td><td>{formatINR(displayRecord.tds)}</td></tr>
                    <tr><td>ESI</td><td>{formatINR(displayRecord.esi)}</td></tr>
                    <tr><td>Insurance & Other</td><td>{formatINR(displayRecord.insuranceOtherDeduction)}</td></tr>
                    <tr className="subtotal"><td>Total Deductions</td><td>{formatINR(displayRecord.totalDeductions)}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Net Salary Summary */}
            <div className="payslip-net-box">
              <div>
                <span style={{ fontSize: "12px", color: "var(--cms-muted)", display: "block" }}>Net Take-Home Salary</span>
                <strong style={{ fontSize: "22px", color: "#108E50" }}>{formatINR(displayRecord.netSalary)}</strong>
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
// ----------------------------------------------------------------------
// SCREEN — ADD / EDIT SALARY STRUCTURE
// ----------------------------------------------------------------------
function AddSalaryStructureScreen({ id, store, navigate, setToast }) {
  const existing = useMemo(() => {
    if (!id) return null;
    return (store.structures || []).find((s) => s.id === id || String(s.numericId) === String(id));
  }, [id, store.structures]);

  const [formData, setFormData] = useState(() => {
    if (existing) {
      return {
        name: existing.name || "",
        staffType: existing.staffType || "",
        department: existing.department || "",
        departmentId: existing.departmentId ?? null,
        designation: existing.designation || "",
        designationId: existing.designationId ?? null,
        effectiveFrom: existing.effectiveFrom || "",
        status: existing.status || "",
        taxability: existing.taxability || "",
        basicPay: Number(existing.basicPay || 0),
        hra: Number(existing.hra || 0),
        da: Number(existing.da || 0),
        specialAllowance: Number(existing.specialAllowance || 0),
        transportAllowance: Number(existing.transportAllowance || 0),
        medicalAllowance: Number(existing.medicalAllowance || 0),
        academicAllowance: Number(existing.academicAllowance || 0),
        otherAllowances: Number(existing.otherAllowances || 0),
        pfApplicable: existing.pf > 0,
        pf: Number(existing.pf || 0),
        employerPf: Number(existing.employerPf || 0),
        esiApplicable: existing.esi > 0,
        esi: Number(existing.esi || 0),
        ptApplicable: existing.professionalTax > 0,
        professionalTax: Number(existing.professionalTax || 0),
        tds: Number(existing.tds || 0),
        insurance: Number(existing.insurance || 0),
        otherDeductions: Number(existing.otherDeductions || 0),
      };
    }
    return {
      name: "",
      staffType: "",
      department: "",
      designation: "",
      effectiveFrom: "",
      status: "",
      taxability: "",
      basicPay: "",
      hra: "",
      da: "",
      specialAllowance: "",
      transportAllowance: "",
      medicalAllowance: "",
      academicAllowance: "",
      otherAllowances: "",
      pfApplicable: false,
      pf: "",
      employerPf: "",
      esiApplicable: false,
      esi: "",
      ptApplicable: false,
      professionalTax: "",
      tds: "",
      insurance: "",
      otherDeductions: "",
    };
  });

  useEffect(() => {
    if (!existing) return;
    setFormData((previous) => ({
      ...previous,
      name: existing.name || "",
      staffType: existing.staffType || "",
      department: existing.department || "",
      departmentId: existing.departmentId ?? null,
      designation: existing.designation || "",
      designationId: existing.designationId ?? null,
      effectiveFrom: existing.effectiveFrom || "",
      status: existing.status || "",
      basicPay: Number(existing.basicPay ?? 0),
      hra: Number(existing.hra ?? 0),
      da: Number(existing.da ?? 0),
      transportAllowance: Number(existing.transportAllowance ?? 0),
      medicalAllowance: Number(existing.medicalAllowance ?? 0),
      otherAllowances: Number(existing.otherAllowances ?? 0),
      pfApplicable: Number(existing.pf ?? 0) > 0,
      pf: Number(existing.pf ?? 0),
      esi: Number(existing.esi ?? 0),
      esiApplicable: Number(existing.esi ?? 0) > 0,
      ptApplicable: Number(existing.professionalTax ?? 0) > 0,
      professionalTax: Number(existing.professionalTax ?? 0),
      tds: Number(existing.tds ?? 0),
      insurance: Number(existing.insurance ?? 0),
    }));
  }, [existing?.id]);

  const [departmentRows, setDepartmentRows] = useState([]);
  const [designationRows, setDesignationRows] = useState([]);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      apiClient.get(apiEndpoints.departments.getAll, { skipGlobalLoader: true }),
      apiClient.get(apiEndpoints.designations.getAll, { skipGlobalLoader: true }),
    ]).then((results) => {
      if (!active) return;
      if (results[0].status === "fulfilled") setDepartmentRows(getPayrollList(results[0].value));
      if (results[1].status === "fulfilled") setDesignationRows(getPayrollList(results[1].value));
      const failedLookups = results
        .map((result, index) => result.status === "rejected" ? ["departments", "designations"][index] : null)
        .filter(Boolean);
      if (failedLookups.length) setToast(`Unable to load ${failedLookups.join(" and ")} for salary structures.`);
    });
    return () => { active = false; };
  }, [setToast]);

  const departmentOptions = useMemo(() => Array.from(new Set(
    departmentRows.map((department) => getPayrollField(department, "departmentName", "name")).filter(Boolean)
  )), [departmentRows]);
  const designationOptions = useMemo(() => Array.from(new Set(
    designationRows.map((designation) => getPayrollField(designation, "designationName", "name")).filter(Boolean)
  )), [designationRows]);

  // Update PF automatically when Basic Pay or PF toggle changes
  useEffect(() => {
    if (existing) return;
    if (!formData.pfApplicable) {
      setFormData((prev) => ({
        ...prev,
        pf: "",
        employerPf: "",
      }));
      return;
    }

    const computedPf = formData.basicPay === ""
      ? ""
      : Math.round(Number(formData.basicPay || 0) * 0.12);
    setFormData((prev) => ({
      ...prev,
      pf: computedPf,
      employerPf: computedPf,
    }));
  }, [existing, formData.basicPay, formData.pfApplicable]);

  const setAmount = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value === "" ? "" : Number(value) }));
  };
  const amountDisplay = (value) => value === "" || value == null ? "—" : formatINR(value);

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
  const hasEnteredEarnings = [
    formData.basicPay, formData.hra, formData.da, formData.specialAllowance,
    formData.transportAllowance, formData.medicalAllowance, formData.academicAllowance,
    formData.otherAllowances,
  ].some((value) => value !== "" && value != null);
  const hasEnteredDeductions = [
    formData.pf, formData.esi, formData.professionalTax, formData.tds,
    formData.insurance, formData.otherDeductions,
  ].some((value) => value !== "" && value != null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.staffType) return;

    const departmentMatch = departmentRows.find((department) => getPayrollField(department, "departmentName", "name") === formData.department);
    const designationMatch = designationRows.find((designation) => getPayrollField(designation, "designationName", "name") === formData.designation);
    const departmentId = formData.departmentId ?? getPayrollField(departmentMatch, "departmentId", "id") ?? null;
    const designationId = formData.designationId ?? getPayrollField(designationMatch, "designationId", "id") ?? null;
    if (formData.department && !departmentId) {
      setToast("Select a department returned by the Departments API so its ID can be saved.");
      return;
    }
    if (formData.designation && !designationId) {
      setToast("Select a designation returned by the Designations API so its ID can be saved.");
      return;
    }

    const payload = {
      structureName: formData.name,
      staffType: formData.staffType,
      departmentId,
      designationId,
      basicPay: Number(formData.basicPay || 0),
      hra: Number(formData.hra || 0),
      da: Number(formData.da || 0),
      conveyanceAllowance: Number(formData.transportAllowance || 0),
      medicalAllowance: Number(formData.medicalAllowance || 0),
      otherAllowance: Number(formData.specialAllowance || 0) + Number(formData.academicAllowance || 0) + Number(formData.otherAllowances || 0),
      pf: Number(formData.pf || 0),
      professionalTax: Number(formData.professionalTax || 0),
      tds: Number(formData.tds || 0),
      esi: Number(formData.esi || 0),
      insuranceOtherDeduction: Number(formData.insurance || 0) + Number(formData.otherDeductions || 0),
      status: formData.status,
    };

    if (existing || id) {
      const targetNumericId = getNumericApiId(existing?.numericId);
      if (!targetNumericId) {
        setToast("The API did not provide a salary structure ID, so it cannot be updated.");
        return;
      }
      try {
        await payrollApi.updateSalaryStructure(targetNumericId, payload);
      } catch (err) {
        setToast(`Unable to update salary structure: ${getApiErrorMessage(err)}`);
        return;
      }
      setToast("Salary structure updated successfully.");
    } else {
      try {
        await payrollApi.createSalaryStructure(payload);
      } catch (err) {
        setToast(`Unable to create salary structure: ${getApiErrorMessage(err)}`);
        return;
      }
      setToast("Salary structure created successfully.");
    }
    navigate("/dashboard/payroll?tab=structures");
  };

  return (
    <DashboardLayout
      title={existing ? "Edit Salary Structure" : "Add Salary Structure"}
      subtitle={existing ? "Modify salary structure components and deduction rules." : "Create a reusable salary structure with earnings, statutory rules and live preview."}
      breadcrumb={["Home", "Finance", "Payroll", "Structures", existing ? "Edit" : "Add"]}
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
                  <input type="text" required placeholder="Enter structure name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>Staff Type *</label>
                  <select required value={formData.staffType} onChange={(e) => setFormData({ ...formData, staffType: e.target.value })}>
                    <option value="">Select staff type</option>
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
                  onChange={(val) => {
                    const match = departmentRows.find((department) => getPayrollField(department, "departmentName", "name") === val);
                    setFormData({ ...formData, department: val, departmentId: getPayrollField(match, "departmentId", "id") ?? null });
                  }}
                />
                <SearchableInputPicker
                  label="Designation"
                  placeholder="Search designation..."
                  value={formData.designation}
                  options={designationOptions}
                  onChange={(val) => {
                    const match = designationRows.find((designation) => getPayrollField(designation, "designationName", "name") === val);
                    setFormData({ ...formData, designation: val, designationId: getPayrollField(match, "designationId", "id") ?? null });
                  }}
                />
                <div className="salary-form-group">
                  <label>Effective From *</label>
                  <input type="date" required value={formData.effectiveFrom} onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })} />
                </div>
                <div className="salary-form-group">
                  <label>Status *</label>
                  <select required value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="">Select status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="salary-form-section-title">Step 2 — Monthly Earnings</div>
              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Basic Pay *</label>
                  <input type="number" required min="0" placeholder="Enter basic pay" value={formData.basicPay} onChange={(e) => setAmount("basicPay", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>HRA (House Rent Allowance)</label>
                  <input type="number" min="0" placeholder="Enter HRA" value={formData.hra} onChange={(e) => setAmount("hra", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>DA (Dearness Allowance)</label>
                  <input type="number" min="0" placeholder="Enter DA" value={formData.da} onChange={(e) => setAmount("da", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Special Allowance</label>
                  <input type="number" min="0" placeholder="Enter special allowance" value={formData.specialAllowance} onChange={(e) => setAmount("specialAllowance", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Transport Allowance</label>
                  <input type="number" min="0" placeholder="Enter transport allowance" value={formData.transportAllowance} onChange={(e) => setAmount("transportAllowance", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Medical Allowance</label>
                  <input type="number" min="0" placeholder="Enter medical allowance" value={formData.medicalAllowance} onChange={(e) => setAmount("medicalAllowance", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Academic / Research Allowance</label>
                  <input type="number" min="0" placeholder="Enter academic / research allowance" value={formData.academicAllowance} onChange={(e) => setAmount("academicAllowance", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Other Allowances</label>
                  <input type="number" min="0" placeholder="Enter other allowances" value={formData.otherAllowances} onChange={(e) => setAmount("otherAllowances", e.target.value)} />
                </div>
              </div>

              <div className="salary-form-section-title">Step 3 — Statutory Rules & Deductions</div>
              <div style={{ display: "flex", gap: "20px", marginBottom: "16px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={formData.pfApplicable} onChange={(e) => setFormData({ ...formData, pfApplicable: e.target.checked })} />
                  <strong>PF Applicable (12% of Basic)</strong>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={formData.esiApplicable} onChange={(e) => setFormData({ ...formData, esiApplicable: e.target.checked, esi: e.target.checked ? formData.esi : "" })} />
                  <strong>ESI Applicable (1.75%)</strong>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.ptApplicable}
                    onChange={(e) => setFormData({ ...formData, ptApplicable: e.target.checked, professionalTax: e.target.checked ? formData.professionalTax : "" })}
                  />
                  <strong>Professional Tax Applicable</strong>
                </label>
              </div>

              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Employee PF (12% Basic)</label>
                  <input type="number" min="0" placeholder="Calculated when PF applies" value={formData.pf} onChange={(e) => setAmount("pf", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Employer PF (12% - CTC Cost)</label>
                  <input type="number" min="0" placeholder="Calculated when PF applies" value={formData.employerPf} onChange={(e) => setAmount("employerPf", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Professional Tax (PT)</label>
                  <input type="number" min="0" placeholder="Enter professional tax" value={formData.professionalTax} onChange={(e) => setAmount("professionalTax", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>TDS (Income Tax)</label>
                  <input type="number" min="0" placeholder="Enter TDS" value={formData.tds} onChange={(e) => setAmount("tds", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>ESI Deduction</label>
                  <input type="number" min="0" placeholder="Enter ESI deduction" value={formData.esi} onChange={(e) => setAmount("esi", e.target.value)} />
                </div>
                <div className="salary-form-group">
                  <label>Insurance / Other Deductions</label>
                  <input type="number" min="0" placeholder="Enter insurance / other deductions" value={formData.insurance} onChange={(e) => setAmount("insurance", e.target.value)} />
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
              <div className="breakup-row"><span>Basic Pay</span><strong>{amountDisplay(formData.basicPay)}</strong></div>
              <div className="breakup-row"><span>HRA</span><span>{amountDisplay(formData.hra)}</span></div>
              <div className="breakup-row"><span>DA</span><span>{amountDisplay(formData.da)}</span></div>
              <div className="breakup-row"><span>Allowances</span><span>{[formData.specialAllowance, formData.transportAllowance, formData.academicAllowance].some((value) => value !== "" && value != null) ? formatINR(Number(formData.specialAllowance || 0) + Number(formData.transportAllowance || 0) + Number(formData.academicAllowance || 0)) : "—"}</span></div>
              <div className="breakup-row total"><span>Gross Earnings</span><strong style={{ color: "#6F8400" }}>{hasEnteredEarnings ? formatINR(grossSalary) : "—"}</strong></div>

              <div style={{ margin: "16px 0 8px", fontSize: "12px", fontWeight: 700, color: "var(--cms-muted)" }}>EMPLOYEE DEDUCTIONS</div>
              <div className="breakup-row"><span>Employee PF (12%)</span><span>{amountDisplay(formData.pf)}</span></div>
              <div className="breakup-row"><span>Professional Tax (PT)</span><span>{amountDisplay(formData.professionalTax)}</span></div>
              <div className="breakup-row"><span>TDS (Income Tax)</span><span>{amountDisplay(formData.tds)}</span></div>
              <div className="breakup-row total"><span>Total Deductions</span><strong style={{ color: "#B7791F" }}>{hasEnteredDeductions ? formatINR(totalDeductions) : "—"}</strong></div>

              <div className="breakup-row net">
                <span>Net Take-Home Salary</span>
                <strong style={{ fontSize: "18px", color: "#108E50" }}>{hasEnteredEarnings || hasEnteredDeductions ? formatINR(netSalary) : "—"}</strong>
              </div>

              <div style={{ margin: "16px 0 8px", fontSize: "12px", fontWeight: 700, color: "var(--cms-muted)" }}>COMPANY CTC</div>
              <div className="breakup-row"><span>Employer PF Contribution</span><span>{amountDisplay(formData.employerPf)}</span></div>
              <div className="breakup-row total"><span>Total Cost to Company (CTC)</span><strong style={{ color: "var(--cms-primary-dark)" }}>{hasEnteredEarnings || formData.employerPf !== "" ? formatINR(ctc) : "—"}</strong></div>
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
              <div><span>Department:</span> <strong>{struct.department || "—"}</strong></div>
              <div><span>Designation:</span> <strong>{struct.designation || "—"}</strong></div>
              <div><span>Effective Date:</span> <strong>{struct.effectiveFrom || "—"}</strong></div>
              <div><span>Status:</span> <span className="cms-badge cms-badge-success">{struct.status}</span></div>
              <div><span>Assigned Count:</span> <strong>{struct.assignedCount || 0} Staff</strong></div>
            </div>

            <div className="salary-form-section-title">Earnings Breakdown</div>
            <div className="breakup-row"><span>Basic Pay</span><strong>{formatINR(struct.basicPay)}</strong></div>
            <div className="breakup-row"><span>HRA</span><span>{formatINR(struct.hra)}</span></div>
            <div className="breakup-row"><span>DA</span><span>{formatINR(struct.da)}</span></div>
            <div className="breakup-row"><span>Other Allowances</span><span>{formatINR(struct.otherAllowances)}</span></div>
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
            <div className="breakup-row"><span>Annual CTC Approx</span><strong>—</strong></div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}

function SearchableStaffPicker({ label = "Select Staff *", staffList = [], selectedId, onSelect, error }) {
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
      const id = (s.staffCode || s.id || "").toLowerCase();
      const dept = (s.department || "").toLowerCase();
      return name.includes(q) || id.includes(q) || dept.includes(q);
    });
  }, [staffList, query]);

  return (
    <div className="salary-form-group">
      <label>{label}</label>
      <div
        className={`salary-search-picker ${error ? "has-error" : ""}`}
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
            value={open ? query : selectedStaff ? `${selectedStaff.name} (${selectedStaff.staffCode || selectedStaff.id})` : ""}
            onFocus={() => {
              setQuery("");
              setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "assign-staff-error" : undefined}
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
      {error ? <span className="salary-field-error" id="assign-staff-error" role="alert">{error}</span> : null}
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN — ASSIGN / EDIT SALARY TO STAFF
// ----------------------------------------------------------------------
function AssignSalaryScreen({ id, staffType = "Teaching", store, setStore, navigate, setToast }) {
  const existingAssignment = useMemo(() => {
    if (!id) return null;
    return (store.assignments || []).find((a) => a.id === id || String(a.numericId) === String(id));
  }, [id, store.assignments]);
  const assignmentStaffType = existingAssignment?.staffType || staffType;

  const staffList = useMemo(() => {
    const sourceList = Array.isArray(store.apiEmployees) ? store.apiEmployees : [];

    return sourceList
      .filter((a) => !assignmentStaffType || a.staffType === assignmentStaffType)
      .map((a) => ({
        id: String(a.staffId ?? a.id ?? ""),
        staffCode: a.employeeId || "",
        staffType: a.staffType || "",
        rawStaffId: getNumericApiId(a.staffId ?? a.id),
        name: a.staffName || a.name || "",
        department: a.departmentName || a.department || "",
        designation: a.designation || a.designationName || "",
      }));
  }, [store.apiEmployees, assignmentStaffType]);

  const [selectedStaffId, setSelectedStaffId] = useState(() => {
    if (existingAssignment) return String(existingAssignment.rawStaffId || existingAssignment.staffId);
    return "";
  });
  const [selectedStructId, setSelectedStructId] = useState(() => {
    if (existingAssignment) return existingAssignment.structureId || "";
    return "";
  });
  const [effectiveFrom, setEffectiveFrom] = useState(() => {
    if (existingAssignment?.effectiveFrom) return existingAssignment.effectiveFrom;
    return new Date().toISOString().split("T")[0];
  });
  const [paymentMode, setPaymentMode] = useState(existingAssignment?.paymentMode || "");
  const [bankName, setBankName] = useState(existingAssignment?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(existingAssignment?.accountNumber || "");
  const [ifscCode, setIfscCode] = useState(existingAssignment?.ifscCode || "");
  const [panNumber, setPanNumber] = useState(existingAssignment?.panNumber || "");
  const [uanNumber, setUanNumber] = useState(existingAssignment?.uanNumber || "");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!existingAssignment) return;
    setSelectedStaffId(String(existingAssignment.rawStaffId ?? ""));
    setSelectedStructId(existingAssignment.structureId || "");
    setEffectiveFrom(existingAssignment.effectiveFrom || "");
    setPaymentMode(existingAssignment.paymentMode || "");
    setBankName(existingAssignment.bankName || "");
    setAccountNumber(existingAssignment.accountNumber || "");
    setIfscCode(existingAssignment.ifscCode || "");
    setPanNumber(existingAssignment.panNumber || "");
    setUanNumber(existingAssignment.uanNumber || "");
  }, [existingAssignment?.id]);

  const chosenStruct = useMemo(() => {
    return store.structures.find((s) => s.id === selectedStructId) || null;
  }, [store.structures, selectedStructId]);

  const chosenStaff = useMemo(() => {
    return staffList.find((s) => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    const errors = {};
    const cleanBankName = bankName.trim();
    const cleanAccountNumber = accountNumber.trim();
    const cleanIfsc = ifscCode.trim().toUpperCase();
    const cleanPan = panNumber.trim().toUpperCase();
    const cleanUan = uanNumber.trim();

    if (!chosenStaff) errors.staff = `Select a ${assignmentStaffType.toLowerCase()} staff member.`;
    if (!chosenStruct) errors.structure = "Select a salary structure.";
    if (!paymentMode) errors.paymentMode = "Select a payment mode.";
    if (cleanBankName && !/^[A-Za-z][A-Za-z .&'-]{1,99}$/.test(cleanBankName)) errors.bankName = "Enter a valid bank name.";
    if (cleanAccountNumber && !/^\d{6,18}$/.test(cleanAccountNumber)) errors.accountNumber = "Account number must contain 6 to 18 digits.";
    if (cleanIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) errors.ifscCode = "Enter a valid 11-character IFSC code.";
    if (cleanPan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(cleanPan)) errors.panNumber = "Enter a valid PAN (for example, ABCDE1234F).";
    if (cleanUan && !/^\d{12}$/.test(cleanUan)) errors.uanNumber = "UAN / PF number must contain 12 digits.";

    // Bank details are optional as a group; once any is supplied, require a complete set.
    if (cleanBankName || cleanAccountNumber || cleanIfsc) {
      if (!cleanBankName) errors.bankName = "Enter the bank name when providing bank details.";
      if (!cleanAccountNumber) errors.accountNumber = "Enter the account number when providing bank details.";
      if (!cleanIfsc) errors.ifscCode = "Enter the IFSC code when providing bank details.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    const numericStaffId = getNumericApiId(chosenStaff.rawStaffId);
    const numericStructId = getNumericApiId(chosenStruct.numericId);
    const existingNumericId = getNumericApiId(existingAssignment?.numericId);
    if (!numericStaffId || !numericStructId || (existingAssignment && !existingNumericId)) {
      setToast("A required numeric staff, salary structure, or assignment ID is missing from the API response.");
      return;
    }

    let createdAsgnId = existingAssignment?.id || "";
    let createdNumericId = existingNumericId;

    try {
      if (existingAssignment && existingNumericId) {
        await payrollApi.updateSalaryAssignment(existingNumericId, {
          salaryStructureId: numericStructId,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : new Date().toISOString(),
        });
      } else {
        const payload = {
          staffId: numericStaffId,
          salaryStructureId: numericStructId,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : new Date().toISOString(),
          paymentMode,
          bankName: bankName || "",
          accountNumber: accountNumber || "",
          ifscCode: ifscCode || "",
          panNumber: panNumber || "",
          uanNumber: uanNumber || "",
        };
        const res = await payrollApi.createSalaryAssignment(payload);
        createdNumericId = getNumericApiId(getPayrollField(res, "assignmentId", "id"));
        if (!createdNumericId) {
          setToast("The API accepted the assignment but did not return its ID. Refresh the page to load it from the server.");
          navigate("/dashboard/payroll?tab=employees");
          return;
        }
        createdAsgnId = `asgn-${createdNumericId}`;
      }
    } catch (err) {
      setToast(`Unable to save salary assignment: ${getApiErrorMessage(err)}`);
      return;
    }

    const newAssignment = {
      id: createdAsgnId,
      numericId: createdNumericId,
      staffId: chosenStaff.staffCode || "",
      rawStaffId: numericStaffId,
      rawStructureId: numericStructId,
      staffName: chosenStaff.name,
      staffType: chosenStaff.staffType || assignmentStaffType,
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
      assignments: [newAssignment, ...prev.assignments.filter((a) => a.rawStaffId !== numericStaffId)],
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
                  label={`Select ${assignmentStaffType} Staff *`}
                  staffList={staffList}
                  selectedId={selectedStaffId}
                  onSelect={(value) => { setSelectedStaffId(value); setFieldErrors((prev) => ({ ...prev, staff: "" })); }}
                  error={fieldErrors.staff}
                />

                <div className="salary-form-group">
                  <label>Select Salary Structure *</label>
                  <select required value={selectedStructId} aria-invalid={Boolean(fieldErrors.structure)} onChange={(e) => { setSelectedStructId(e.target.value); setFieldErrors((prev) => ({ ...prev, structure: "" })); }}>
                    <option value="">Select salary structure</option>
                    {store.structures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.staffType}) — Gross: {formatINR(s.grossSalary)}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.structure ? <span className="salary-field-error" role="alert">{fieldErrors.structure}</span> : null}
                </div>
              </div>

              <div className="salary-form-section-title">Step 2 — Bank & Payment Details</div>
              <div className="salary-form-grid-3">
                <div className="salary-form-group">
                  <label>Payment Mode</label>
                  <select required value={paymentMode} aria-invalid={Boolean(fieldErrors.paymentMode)} onChange={(e) => { setPaymentMode(e.target.value); setFieldErrors((prev) => ({ ...prev, paymentMode: "" })); }}>
                    <option value="">Select payment mode</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                  {fieldErrors.paymentMode ? <span className="salary-field-error" role="alert">{fieldErrors.paymentMode}</span> : null}
                </div>
                <div className="salary-form-group">
                  <label>Bank Name</label>
                  <input type="text" placeholder="Enter bank name" value={bankName} aria-invalid={Boolean(fieldErrors.bankName)} onChange={(e) => { setBankName(e.target.value); setFieldErrors((prev) => ({ ...prev, bankName: "" })); }} />
                  {fieldErrors.bankName ? <span className="salary-field-error" role="alert">{fieldErrors.bankName}</span> : null}
                </div>
                <div className="salary-form-group">
                  <label>Account Number</label>
                  <input type="text" inputMode="numeric" placeholder="Enter account number" value={accountNumber} aria-invalid={Boolean(fieldErrors.accountNumber)} onChange={(e) => { setAccountNumber(e.target.value); setFieldErrors((prev) => ({ ...prev, accountNumber: "" })); }} />
                  {fieldErrors.accountNumber ? <span className="salary-field-error" role="alert">{fieldErrors.accountNumber}</span> : null}
                </div>
                <div className="salary-form-group">
                  <label>IFSC Code</label>
                  <input type="text" maxLength={11} placeholder="Enter IFSC code" value={ifscCode} aria-invalid={Boolean(fieldErrors.ifscCode)} onChange={(e) => { setIfscCode(e.target.value.toUpperCase()); setFieldErrors((prev) => ({ ...prev, ifscCode: "" })); }} />
                  {fieldErrors.ifscCode ? <span className="salary-field-error" role="alert">{fieldErrors.ifscCode}</span> : null}
                </div>
                <div className="salary-form-group">
                  <label>PAN Number</label>
                  <input type="text" maxLength={10} placeholder="Enter PAN number" value={panNumber} aria-invalid={Boolean(fieldErrors.panNumber)} onChange={(e) => { setPanNumber(e.target.value.toUpperCase()); setFieldErrors((prev) => ({ ...prev, panNumber: "" })); }} />
                  {fieldErrors.panNumber ? <span className="salary-field-error" role="alert">{fieldErrors.panNumber}</span> : null}
                </div>
                <div className="salary-form-group">
                  <label>UAN / PF Number</label>
                  <input type="text" inputMode="numeric" maxLength={12} placeholder="Enter UAN / PF number" value={uanNumber} aria-invalid={Boolean(fieldErrors.uanNumber)} onChange={(e) => { setUanNumber(e.target.value); setFieldErrors((prev) => ({ ...prev, uanNumber: "" })); }} />
                  {fieldErrors.uanNumber ? <span className="salary-field-error" role="alert">{fieldErrors.uanNumber}</span> : null}
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
              ) : <p className="salary-preview-empty">Select a salary structure to preview its breakdown.</p>}
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
              <div><span>Payment Mode:</span> <strong>{asgn.paymentMode || "—"}</strong></div>
              <div><span>Bank:</span> <strong>{asgn.bankName || "—"}</strong></div>
              <div><span>Account No:</span> <strong>{asgn.accountNumber || "—"}</strong></div>
              <div><span>IFSC:</span> <strong>{asgn.ifscCode || "—"}</strong></div>
              <div><span>PAN:</span> <strong>{asgn.panNumber || "—"}</strong></div>
              <div><span>UAN / PF:</span> <strong>{asgn.uanNumber || "—"}</strong></div>
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
          <div className="salary-kpi-card" onClick={() => setToast("The supplied Payroll APIs do not include a salary register export endpoint.")}>
            <div className="salary-kpi-icon"><FileSpreadsheet size={20} /></div>
            <div className="salary-kpi-data"><span>Monthly Register</span><strong>Download</strong></div>
          </div>
          <div className="salary-kpi-card" onClick={() => setToast("The supplied Payroll APIs do not include a PF ECR export endpoint.")}>
            <div className="salary-kpi-icon"><ShieldAlert size={20} /></div>
            <div className="salary-kpi-data"><span>PF ECR File</span><strong>Generate</strong></div>
          </div>
          <div className="salary-kpi-card" onClick={() => setToast("The supplied Payroll APIs do not include a TDS report export endpoint.")}>
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
            <div className="salary-form-group"><label>Employee PF Rate (%)</label><input type="number" /></div>
            <div className="salary-form-group"><label>Employer PF Rate (%)</label><input type="number" /></div>
            <div className="salary-form-group"><label>Professional Tax (₹)</label><input type="number" defaultValue="" /></div>
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
            <button type="button" className="cms-btn cms-btn-primary" onClick={() => setToast("The supplied Payroll APIs do not include a salary import endpoint.")}>
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
  return <AddSalaryStructureScreen id={id} store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
}

function EditSalaryAssignmentScreen({ id, store, setStore, navigate, setToast }) {
  return <AssignSalaryScreen id={id} staffType="Teaching" store={store} setStore={setStore} navigate={navigate} setToast={setToast} />;
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
