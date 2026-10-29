import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, IndianRupee, CalendarDays, Users } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import DataTable from "@/shared/components/DataTable.jsx";
import { Modal } from "@/shared/components/Ui.jsx";
import { money } from "@/modules/admin/AdminInventory/inventoryModel.js";
import { useDialogFocus } from "@/modules/admin/AdminInventory/components/InventoryUi.jsx";
import { payrollMonth } from "./lopModel.js";
import { lopRequest, lopRows } from "./lopApi.js";
import { getApiErrorMessage } from "@/api/apiClient.js";
import "./LOPConfigurationPage.css";
import CommonLOPPolicy from "./CommonLOPPolicy.jsx";

function LOPForm({ record, onClose, onSave, staffList }) {
  useDialogFocus(onClose);
  const [values, setValues] = useState(
    record
      ? { ...record, days: record.lopDays }
      : { staffId: "", month: payrollMonth(), days: "", basis: "calendar", reason: "" },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const staff = staffList.find((s) => String(s.id) === String(values.staffId));
  const [calculation, setCalculation] = useState(null);
  useEffect(() => {
    setCalculation(null);
    if (!staff || !values.days || !values.month) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        lopRequest("calculate", {
          method: "post",
          signal: controller.signal,
          data: {
            staffId: values.staffId,
            month: values.month,
            days: Number(values.days),
            lopDays: Number(values.days),
            basis: values.basis,
            salary: staff.salary,
          },
        })
          .then(setCalculation)
          .catch((e) => {
            if (!controller.signal.aborted) setError(getApiErrorMessage(e));
          }),
      300,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [staff, values.staffId, values.days, values.month, values.basis]);
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
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (busy) return;
            setBusy(true);
            await onSave(values);
            onClose();
          } catch (failure) {
            setError(getApiErrorMessage(failure));
          } finally {
            setBusy(false);
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
            {staffList.map((s) => (
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
            LOP Deduction<strong>{calculation ? money(calculation.deduction) : "—"}</strong>
          </span>
          <span>
            Salary After LOP
            <strong>{calculation ? money(calculation.salaryAfterLOP) : "—"}</strong>
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
          <button disabled={busy} className="cms-btn cms-btn-primary">
            Save LOP
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function LOPConfigurationPage() {
  const [records, setRecords] = useState([]),
    [modal, setModal] = useState(null),
    [month, setMonth] = useState(payrollMonth()),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [staffList, setStaffList] = useState([]),
    [kpis, setKpis] = useState(null),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    lopRequest("staff", { signal: c.signal })
      .then((data) => setStaffList(lopRows(data)))
      .catch((e) => {
        if (!c.signal.aborted) setError(getApiErrorMessage(e));
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    setRecords([]);
    setKpis(null);
    Promise.all([
      lopRequest("records", { params: { month, search }, signal: c.signal }),
      lopRequest("kpis", { params: { month }, signal: c.signal }),
    ])
      .then(([data, stats]) => {
        setRecords(lopRows(data));
        setKpis(data.kpis || stats);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [month, search, revision]);
  const rows = records;
  const edit = async (r) => {
    try {
      setModal({ record: await lopRequest("records/" + encodeURIComponent(r.id)) });
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };
  const save = async (values) => {
    await lopRequest("records" + (values.id ? "/" + encodeURIComponent(values.id) : ""), {
      method: values.id ? "put" : "post",
      data: { ...values, days: Number(values.days), lopDays: Number(values.days) },
    });
    setNotice("LOP record saved.");
    setRevision((v) => v + 1);
  };
  return (
    <DashboardLayout
      title="LOP Configuration"
      subtitle="Assign staff loss-of-pay days and preview salary deductions."
      breadcrumb={["Settings", "LOP Configuration"]}
      backLinkPosition="below"
      backLink={
        <Link to="/dashboard/settings" className="lop-back-link">
          <ArrowLeft size={16} /> Back to Settings
        </Link>
      }
    >
      <div className="lop-page">
        <CommonLOPPolicy />
        <div className="lop-notice">
          LOP configuration is loaded from and saved to the server. Record only unpaid days after
          applicable paid leave is exhausted.
        </div>
        <div className="lop-kpis">
          {[
            ["Staff With LOP", kpis?.staffWithLOP ?? kpis?.staffWithLop ?? "Unavailable", Users],
            [
              "Total LOP Days",
              kpis?.totalLOPDays ?? kpis?.totalLopDays ?? "Unavailable",
              CalendarDays,
            ],
            [
              "Total Deduction",
              kpis?.totalDeduction == null ? "Unavailable" : money(kpis.totalDeduction),
              IndianRupee,
            ],
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
          loading={loading}
          title="Staff LOP Configuration"
          rows={rows}
          onSearchChange={setSearch}
          enablePdfExport
          enableTablePrint={false}
          onView={undefined}
          onEdit={edit}
          onDelete={async (r) => {
            if (window.confirm(`Remove the LOP entry for ${r.name} (${r.month})?`))
              try {
                await lopRequest("records/" + encodeURIComponent(r.id), { method: "delete" });
                setRevision((v) => v + 1);
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
            onSave={save}
            staffList={staffList}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
