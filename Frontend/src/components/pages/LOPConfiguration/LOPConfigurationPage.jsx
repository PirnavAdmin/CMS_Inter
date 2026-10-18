import { useState } from "react";
import { Plus, IndianRupee, CalendarDays, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import DataTable from "@/components/common/DataTable.jsx";
import { Modal } from "@/components/common/Ui.jsx";
import { money } from "@/components/pages/InventoryManagement/inventoryModel.js";
import { useDialogFocus } from "@/components/pages/InventoryManagement/components/InventoryUi.jsx";
import {
  mockStaff,
  sampleLOP,
  payrollMonth,
  calculateLOP,
  saveLOP,
  LOP_STORAGE_KEY,
} from "./lopModel.js";
import "./LOPConfigurationPage.css";
import CommonLOPPolicy from "./CommonLOPPolicy.jsx";

function LOPForm({ record, onClose, onSave }) {
  useDialogFocus(onClose);
  const [values, setValues] = useState(
    record
      ? { ...record, days: record.lopDays }
      : { staffId: "", month: payrollMonth(), days: "", basis: "calendar", reason: "" },
  );
  const [error, setError] = useState("");
  const staff = mockStaff.find((s) => s.id === values.staffId);
  let calculation;
  try {
    if (staff) calculation = calculateLOP({ ...values, salary: staff.salary });
  } catch {
    /* Show validation on submission. */
  }
  const change = (key, value) => {
    setError("");
    setValues((v) => ({ ...v, [key]: value }));
  };
  return (
    <Modal
      title={record ? "Edit Staff LOP" : "Add Staff LOP"}
      onClose={onClose}
      className="lop-modal"
    >
      <form
        className="lop-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(values);
            onClose();
          } catch (failure) {
            setError(failure.message);
          }
        }}
      >
        <label>
          Staff Member
          <select
            value={values.staffId}
            required
            onChange={(e) => change("staffId", e.target.value)}
          >
            <option value="">Select Staff</option>
            {mockStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.employeeId} · {s.department}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payroll Month
          <input
            type="month"
            value={values.month}
            required
            onChange={(e) => change("month", e.target.value)}
          />
        </label>
        <label>
          Monthly Salary
          <input
            value={staff ? money(staff.salary) : ""}
            readOnly
            placeholder="Select staff to view salary"
          />
        </label>
        <label>
          Deduction Basis
          <select value={values.basis} onChange={(e) => change("basis", e.target.value)}>
            <option value="calendar">Calendar days in month</option>
            <option value="fixed30">Fixed 30-day month</option>
          </select>
        </label>
        <label>
          Extra Unpaid Leave / LOP Days
          <input
            type="number"
            min="0.5"
            max={values.basis === "fixed30" ? 30 : 31}
            step="0.5"
            required
            value={values.days}
            onChange={(e) => change("days", e.target.value)}
          />
        </label>
        <label>
          Reason
          <textarea
            required
            maxLength={500}
            value={values.reason}
            onChange={(e) => change("reason", e.target.value)}
            placeholder="Explain the additional unpaid leave"
          />
        </label>
        <div className="lop-preview">
          <span>
            LOP Deduction<strong>{money(calculation?.deduction || 0)}</strong>
          </span>
          <span>
            Salary After LOP
            <strong>{staff ? money(calculation?.salaryAfterLOP ?? staff.salary) : "—"}</strong>
          </span>
          <small>
            Monthly salary ÷{" "}
            {calculation?.periodDays ?? (values.basis === "fixed30" ? "30" : "calendar days")} × LOP
            days. Other payroll deductions are excluded.
          </small>
        </div>
        {error && (
          <p className="lop-error" role="alert">
            {error}
          </p>
        )}
        <div className="lop-form-actions">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary">Save Mock LOP</button>
        </div>
      </form>
    </Modal>
  );
}
function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOP_STORAGE_KEY) || "null");
    return Array.isArray(stored) ? stored : sampleLOP();
  } catch {
    return sampleLOP();
  }
}
export default function LOPConfigurationPage() {
  const [records, setRecords] = useState(load),
    [modal, setModal] = useState(null),
    [month, setMonth] = useState(payrollMonth()),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const rows = records.filter((r) => !month || r.month === month);
  const persist = (next) => {
    localStorage.setItem(LOP_STORAGE_KEY, JSON.stringify(next));
    setRecords(next);
    setError("");
    setNotice("Mock LOP records saved in this browser.");
  };
  return (
    <DashboardLayout
      title="LOP Configuration"
      subtitle="Assign staff loss-of-pay days and preview salary deductions."
      breadcrumb={["Settings", "LOP Configuration"]}
      actions={
        <button className="cms-btn cms-btn-primary" onClick={() => setModal({})}>
          <Plus size={16} /> Add Staff LOP
        </button>
      }
    >
      <div className="lop-page">
        <CommonLOPPolicy />
        <div className="lop-notice">
          Mock configuration · Browser data only. These entries do not change live payroll or staff
          payslips. Record only unpaid days after applicable paid leave is exhausted.
        </div>
        <div className="lop-kpis">
          {[
            ["Staff With LOP", new Set(rows.map((r) => r.staffId)).size, Users],
            ["Total LOP Days", rows.reduce((sum, r) => sum + r.lopDays, 0), CalendarDays],
            ["Total Deduction", money(rows.reduce((sum, r) => sum + r.deduction, 0)), IndianRupee],
          ].map(([label, value, Icon]) => (
            <article className="cms-card" key={label}>
              <Icon size={22} />
              <p>{label}</p>
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        {notice && <p role="status">{notice}</p>}
        {error && (
          <p className="lop-error" role="alert">
            {error}
          </p>
        )}
        <DataTable
          title="Staff LOP Configuration"
          rows={rows}
          enablePdfExport
          enableTablePrint={false}
          onView={undefined}
          onEdit={(r) => setModal({ record: r })}
          onDelete={(r) => {
            if (window.confirm(`Remove the LOP entry for ${r.name} (${r.month})?`))
              try {
                persist(records.filter((entry) => entry.id !== r.id));
              } catch (failure) {
                setError(failure.message);
              }
          }}
          toolbarExtra={
            <label className="lop-month-filter">
              Payroll Month
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              <button className="cms-btn cms-btn-ghost" onClick={() => setMonth("")}>
                All Months
              </button>
            </label>
          }
          columns={[
            { key: "employeeId", label: "Employee ID" },
            { key: "name", label: "Staff Name" },
            { key: "department", label: "Department" },
            { key: "month", label: "Payroll Month" },
            {
              key: "monthlySalary",
              label: "Monthly Salary",
              render: (r) => money(r.monthlySalary),
            },
            { key: "lopDays", label: "LOP Days" },
            {
              key: "basis",
              label: "Basis",
              render: (r) => (r.basis === "fixed30" ? "30 Days" : `${r.periodDays} Calendar Days`),
            },
            { key: "deduction", label: "LOP Deduction", render: (r) => money(r.deduction) },
            {
              key: "salaryAfterLOP",
              label: "Salary After LOP",
              render: (r) => money(r.salaryAfterLOP),
            },
            { key: "reason", label: "Reason" },
          ]}
        />
        {modal && (
          <LOPForm
            record={modal.record}
            onClose={() => setModal(null)}
            onSave={(values) => persist(saveLOP(records, values))}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
