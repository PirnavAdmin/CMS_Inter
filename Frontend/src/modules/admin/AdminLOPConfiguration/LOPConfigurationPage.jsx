import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  Info,
  Plus,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import DataTable from "@/shared/components/DataTable.jsx";
import { Modal } from "@/shared/components/Ui.jsx";
import { money } from "@/modules/admin/AdminInventory/inventoryModel.js";
import { useDialogFocus } from "@/modules/admin/AdminInventory/components/InventoryUi.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { getApiErrorMessage } from "@/api/apiClient.js";
import CommonLOPPolicy from "./CommonLOPPolicy.jsx";
import { extractLopRows, lopApi } from "./lopApi.js";
import { formatMonthLabel, getPeriodDaysForMonth, payrollMonth } from "./lopModel.js";
import "./LOPConfigurationPage.css";

function ModalRadioGroup({ name, legend, options, value, onChange, disabled = false }) {
  return (
    <fieldset className="lop-radio-group" disabled={disabled}>
      <legend>{legend}</legend>
      <div className="lop-radio-pills">
        {options.map((opt) => {
          const isChecked = String(value) === String(opt.value);
          return (
            <label
              key={String(opt.value)}
              className={`lop-radio-pill ${isChecked ? "is-checked" : ""}`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isChecked}
                onChange={() => onChange(opt.value)}
                className="lop-visually-hidden"
              />
              <span className="lop-radio-main">{opt.label}</span>
              {opt.sub && <small className="lop-radio-sub">{opt.sub}</small>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function LOPRecordModal({ modalState, onClose, onSave, staffList, defaultBasis, defaultComponent }) {
  useDialogFocus(onClose);
  const uid = useId();
  const formRef = useRef(null);
  const isEdit = Boolean(modalState?.record?.id);
  const preset = modalState?.preset || null;
  const record = modalState?.record || null;

  const [values, setValues] = useState(() => {
    if (record) {
      return {
        id: record.id,
        staffId: String(record.staffId || ""),
        month: record.month || payrollMonth(),
        days: record.lopDays ?? "",
        basis: record.basis || defaultBasis || "calendar",
        deductionComponent: record.deductionComponent || defaultComponent || "Gross",
        source: record.source || "Manual",
        status: record.status || "Active",
        reason: record.reason || "",
      };
    }
    return {
      staffId: preset?.staffId ? String(preset.staffId) : "",
      month: preset?.month || payrollMonth(),
      days: preset?.days ?? "",
      basis: preset?.basis || defaultBasis || "calendar",
      deductionComponent: preset?.deductionComponent || defaultComponent || "Gross",
      source: preset?.source || "Manual",
      status: "Active",
      reason: preset?.reason || "",
    };
  });

  const [calculation, setCalculation] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const selectedStaff = useMemo(
    () => staffList.find((s) => String(s.staffId ?? s.id) === String(values.staffId)),
    [staffList, values.staffId],
  );

  const effectiveSalary = selectedStaff
    ? Number(selectedStaff.salary || 0)
    : Number(record?.monthlySalary || 0);
  const effectiveBasic = selectedStaff
    ? Number(selectedStaff.basicPay || 0)
    : Number(record?.monthlySalary || 0);

  useEffect(() => {
    setCalculation(null);
    if (!values.days || Number(values.days) <= 0 || !values.month) return;
    if (!selectedStaff && !record) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      lopApi
        .calculateLop(
          {
            salary: effectiveSalary,
            basicPay: effectiveBasic,
            deductionComponent: values.deductionComponent,
            month: values.month,
            days: Number(values.days),
            basis: values.basis,
          },
          controller.signal,
        )
        .then(setCalculation)
        .catch((err) => {
          if (!controller.signal.aborted) setError(getApiErrorMessage(err));
        });
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    selectedStaff,
    record,
    effectiveSalary,
    effectiveBasic,
    values.deductionComponent,
    values.days,
    values.month,
    values.basis,
  ]);

  const change = (key, val) => {
    setError("");
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const markTouched = (field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const maxPeriodDays = getPeriodDaysForMonth(values.month, values.basis);
  const showErr = (field, cond) => (touched[field] || submitted) && cond;

  return (
    <Modal
      title={
        isEdit
          ? `Edit LOP Entry — ${record.name}`
          : preset
            ? `Adjust / Override LOP — ${preset.name}`
            : "Add Staff LOP Entry"
      }
      onClose={onClose}
      className="lop-modal"
    >
      <form
        ref={formRef}
        noValidate
        className="lop-modal-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setSubmitted(true);
          if (formRef.current && !formRef.current.checkValidity()) {
            const firstInvalid = formRef.current.querySelector(":invalid");
            firstInvalid?.focus();
            setError("Please complete all required fields cleanly before saving.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            await onSave(values, isEdit);
            onClose();
          } catch (err) {
            setError(getApiErrorMessage(err) || err.message || "Failed to save LOP entry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="lop-field-grid">
          <div className="lop-field">
            <label htmlFor={`${uid}-staff`}>
              Staff Member <span aria-hidden="true">*</span>
            </label>
            <select
              id={`${uid}-staff`}
              name="staffId"
              required
              disabled={isEdit || Boolean(preset?.staffId)}
              aria-invalid={showErr("staffId", !values.staffId)}
              value={values.staffId}
              onBlur={() => markTouched("staffId")}
              onChange={(e) => change("staffId", e.target.value)}
            >
              <option value="">Select Staff Member</option>
              {staffList.map((s) => (
                <option key={s.staffId ?? s.id} value={s.staffId ?? s.id}>
                  {s.name} · {s.employeeId} · {s.department}
                  {!s.hasSalaryStructure ? " (No Salary)" : ""}
                </option>
              ))}
            </select>
            {showErr("staffId", !values.staffId) && (
              <span className="lop-field-error">
                <AlertCircle size={13} aria-hidden="true" /> Please select a staff member.
              </span>
            )}
          </div>

          <div className="lop-field">
            <label htmlFor={`${uid}-month`}>
              Payroll Month <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${uid}-month`}
              name="month"
              type="month"
              required
              disabled={isEdit || Boolean(preset?.month)}
              value={values.month}
              onBlur={() => markTouched("month")}
              onChange={(e) => change("month", e.target.value)}
            />
          </div>
        </div>

        <ModalRadioGroup
          name={`${uid}-source`}
          legend="How Should This Entry Apply?"
          disabled={isEdit}
          value={values.source}
          onChange={(v) => change("source", v)}
          options={[
            {
              value: "Manual",
              label: "Add Extra LOP Days",
              sub: "Adds on top of attendance policy LOP",
            },
            {
              value: "Override",
              label: "Replace Monthly Total",
              sub: "Overrides policy LOP with exact days below",
            },
          ]}
        />

        <div className="lop-field-grid">
          <div className="lop-field">
            <label htmlFor={`${uid}-days`}>
              LOP Days (0.5 to {maxPeriodDays}) <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${uid}-days`}
              name="days"
              type="number"
              min="0.5"
              max={maxPeriodDays}
              step="0.5"
              inputMode="decimal"
              required
              aria-invalid={showErr("days", !values.days || Number(values.days) < 0.5 || Number(values.days) > maxPeriodDays)}
              value={values.days}
              onBlur={() => markTouched("days")}
              onChange={(e) => change("days", e.target.value)}
            />
            {showErr("days", !values.days || Number(values.days) < 0.5 || Number(values.days) > maxPeriodDays) && (
              <span className="lop-field-error">
                <AlertCircle size={13} aria-hidden="true" /> Enter days between 0.5 and {maxPeriodDays} (in 0.5 steps).
              </span>
            )}
          </div>

          <ModalRadioGroup
            name={`${uid}-component`}
            legend="Deduct From Salary Base"
            value={values.deductionComponent}
            onChange={(v) => change("deductionComponent", v)}
            options={[
              { value: "Gross", label: "Gross", sub: money(effectiveSalary) },
              { value: "Basic", label: "Basic Pay", sub: money(effectiveBasic) },
            ]}
          />
        </div>

        <ModalRadioGroup
          name={`${uid}-basis`}
          legend="Per-Day Divisor"
          value={values.basis}
          onChange={(v) => change("basis", v)}
          options={[
            { value: "calendar", label: "Calendar Days" },
            { value: "fixed30", label: "Fixed 30 Days" },
            { value: "working26", label: "26 Working Days" },
          ]}
        />

        {selectedStaff && !selectedStaff.hasSalaryStructure && (
          <div className="lop-alert lop-alert-warn">
            <AlertTriangle size={15} />
            <span>
              This staff member has no active Salary Structure assigned in Payroll yet, so monetary
              deduction is ₹0.
            </span>
          </div>
        )}

        <div className="lop-field">
          <label htmlFor={`${uid}-reason`}>
            Reason / Audit Note <span aria-hidden="true">*</span>
          </label>
          <span id={`${uid}-reason-hint`} className="lop-hint-above">
            Appears on Payroll LOP audit logs and payslip notes.
          </span>
          <textarea
            id={`${uid}-reason`}
            name="reason"
            required
            maxLength={500}
            aria-describedby={`${uid}-reason-hint`}
            aria-invalid={showErr("reason", !values.reason?.trim())}
            value={values.reason}
            onBlur={() => markTouched("reason")}
            onChange={(e) => change("reason", e.target.value)}
            placeholder="Explain unpaid leave, policy override, or administrative adjustment..."
          />
          {showErr("reason", !values.reason?.trim()) && (
            <span className="lop-field-error">
              <AlertCircle size={13} aria-hidden="true" /> Please enter a brief reason for audit records.
            </span>
          )}
        </div>

        <div className="lop-preview-box">
          <div>
            <span>Per-Day Rate</span>
            <strong>{calculation ? money(calculation.perDayRate) : "—"}</strong>
          </div>
          <div>
            <span>LOP Deduction</span>
            <strong className="is-red">{calculation ? money(calculation.deduction) : "—"}</strong>
          </div>
          <div>
            <span>Salary After LOP</span>
            <strong className="is-green">
              {calculation ? money(calculation.salaryAfterLOP) : "—"}
            </strong>
          </div>
          <small>
            {values.deductionComponent} salary ÷{" "}
            {calculation?.periodDays ?? maxPeriodDays} days × {values.days || 0} LOP days.
          </small>
        </div>

        {error && (
          <div className="lop-alert lop-alert-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="lop-form-actions">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="cms-btn cms-btn-primary">
            {busy ? "Saving..." : isEdit ? "Update LOP Entry" : "Save LOP Entry"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function LOPConfigurationPage() {
  const campusCtx = useCampusContext();
  const campuses = campusCtx?.campuses || [];
  const selectedCampusId =
    campusCtx?.selectedCampus?.campusId ||
    campusCtx?.selectedCampus?.id ||
    campusCtx?.selectedCampusId ||
    "";

  const [activeTab, setActiveTab] = useState("policy"); // "policy" | "preview" | "records"
  const [month, setMonth] = useState(payrollMonth());
  const [recordsMonth, setRecordsMonth] = useState(payrollMonth());
  const [staffTypeFilter, setStaffTypeFilter] = useState("All");
  const [impactedOnly, setImpactedOnly] = useState(false);
  const [hideNoSalary, setHideNoSalary] = useState(false);
  const [previewSearch, setPreviewSearch] = useState("");
  const [recordsSearch, setRecordsSearch] = useState("");
  const [recordsSource, setRecordsSource] = useState("");

  const [previewData, setPreviewData] = useState({ policy: null, summary: null, items: [] });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordKpis, setRecordKpis] = useState(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);

  const [modalState, setModalState] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const campusParam = selectedCampusId ? Number(selectedCampusId) : undefined;

  // Fetch Campus Staff Dropdown
  useEffect(() => {
    const controller = new AbortController();
    lopApi
      .getStaffList({ campusId: campusParam }, controller.signal)
      .then((res) => setStaffList(extractLopRows(res)))
      .catch((err) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(err));
      });
    return () => controller.abort();
  }, [campusParam, revision]);

  // Fetch Live Monthly Preview & Summary
  const loadPreview = useCallback(
    async (signal) => {
      setPreviewLoading(true);
      try {
        const res = await lopApi.getPreview(
          {
            month,
            search: previewSearch || undefined,
            campusId: campusParam,
            staffType: staffTypeFilter !== "All" ? staffTypeFilter : undefined,
            impactedOnly,
          },
          signal,
        );
        const items = extractLopRows(res);
        setPreviewData({
          policy: res?.policy || null,
          summary: res?.summary || null,
          items,
        });
      } catch (err) {
        if (!signal?.aborted) setError(getApiErrorMessage(err));
      } finally {
        if (!signal?.aborted) setPreviewLoading(false);
      }
    },
    [month, previewSearch, campusParam, staffTypeFilter, impactedOnly],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadPreview(controller.signal);
    return () => controller.abort();
  }, [loadPreview, revision]);

  // Fetch Persistent Records & KPIs
  useEffect(() => {
    const controller = new AbortController();
    setRecordsLoading(true);
    lopApi
      .getRecords(
        {
          month: recordsMonth || undefined,
          search: recordsSearch || undefined,
          campusId: campusParam,
          source: recordsSource || undefined,
        },
        controller.signal,
      )
      .then((res) => {
        setRecords(extractLopRows(res));
        setRecordKpis(res?.kpis || null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setRecordsLoading(false);
      });
    return () => controller.abort();
  }, [recordsMonth, recordsSearch, recordsSource, campusParam, revision]);

  const visiblePreviewItems = useMemo(() => {
    if (!hideNoSalary) return previewData.items;
    return previewData.items.filter((i) => i.hasSalaryStructure);
  }, [previewData.items, hideNoSalary]);

  const handleSyncToRecords = async () => {
    if (syncing) return;
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const res = await lopApi.syncMonthlyRecords({
        month,
        campusId: campusParam || null,
      });
      setNotice(
        `Synced ${res.syncedCount} impacted staff record(s) for ${formatMonthLabel(month)} (${res.totalLopDays} total LOP days · ${money(res.totalDeduction)}).`,
      );
      setRecordsMonth(month);
      setRevision((v) => v + 1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveRecord = async (values, isEdit) => {
    const payload = {
      ...values,
      days: Number(values.days),
    };
    if (isEdit && values.id) {
      await lopApi.updateRecord(values.id, payload);
      setNotice("LOP entry updated.");
    } else {
      await lopApi.createRecord(payload);
      setNotice("LOP entry saved.");
    }
    setRevision((v) => v + 1);
  };

  const handleToggleWaive = async (row) => {
    const nextStatus = row.status === "Waived" ? "Active" : "Waived";
    try {
      await lopApi.updateRecordStatus(row.id, {
        status: nextStatus,
        reason:
          nextStatus === "Waived"
            ? `${row.reason} [Waived by Admin]`
            : row.reason.replace(" [Waived by Admin]", ""),
      });
      setNotice(`Record for ${row.name} marked as ${nextStatus}.`);
      setRevision((v) => v + 1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleDeleteRecord = async (row) => {
    if (!window.confirm(`Remove the LOP entry for ${row.name} (${row.month})?`)) return;
    try {
      await lopApi.deleteRecord(row.id);
      setNotice(`Removed LOP entry for ${row.name}.`);
      setRevision((v) => v + 1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const activePolicy = previewData.policy;
  const summary = previewData.summary;

  return (
    <DashboardLayout
      title="LOP Configuration"
      subtitle="Customize Loss-of-Pay attendance penalties, preview monthly deductions, and apply to payroll."
      breadcrumb={["Settings", "LOP Configuration"]}
      backLinkPosition="below"
      backLink={
        <Link to="/dashboard/settings" className="lop-back-link">
          <ArrowLeft size={16} /> Back to Settings
        </Link>
      }
    >
      <div className="lop-page">
        {/* Global Context & Quick Action Bar */}
        <section className="cms-card lop-context-bar" aria-label="LOP Context and Actions">
          <div className="lop-context-left">
            <div className="lop-field lop-inline-month">
              <label htmlFor="lop-global-month">Calculation Month</label>
              <input
                id="lop-global-month"
                type="month"
                value={month}
                onChange={(e) => {
                  if (e.target.value) setMonth(e.target.value);
                }}
              />
            </div>

            <div className="lop-context-badges">
              <span
                className={`lop-pill ${activePolicy?.enabled ? "is-success" : "is-muted"}`}
              >
                {activePolicy?.enabled ? "Policy Active" : "Policy Paused"}
              </span>
              <span
                className={`lop-pill ${activePolicy?.autoApplyToPayroll ? "is-primary" : "is-warn"}`}
              >
                {activePolicy?.autoApplyToPayroll
                  ? "Auto-Applies to Payroll"
                  : "Manual Payroll Only"}
              </span>
              {activePolicy?.useShiftTimingConfig && (
                <span className="lop-pill is-info">Synced w/ Attendance Shifts</span>
              )}
            </div>
          </div>

          <div className="lop-context-actions">
            <button
              type="button"
              className="cms-btn cms-btn-outline"
              onClick={() => setRevision((v) => v + 1)}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-outline"
              disabled={syncing}
              onClick={handleSyncToRecords}
            >
              <ClipboardList size={14} />
              {syncing ? "Syncing..." : "Sync & Save Monthly LOP"}
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => setModalState({ record: null })}
            >
              <Plus size={14} /> Add Manual / Override LOP
            </button>
          </div>
        </section>

        {/* 4 Summary KPIs */}
        <section className="lop-kpis" aria-label="Monthly LOP Summary">
          <article className="cms-card lop-kpi-card">
            <div className="lop-kpi-head">
              <span>Impacted Staff ({formatMonthLabel(month)})</span>
              <Users size={18} />
            </div>
            <strong>{summary?.impactedStaffCount ?? 0}</strong>
            <small>
              Out of {summary?.totalStaff ?? 0} staff ({summary?.staffWithoutSalary ?? 0} without
              salary structure)
            </small>
          </article>

          <article className="cms-card lop-kpi-card">
            <div className="lop-kpi-head">
              <span>Total Calculated LOP Days</span>
              <CalendarDays size={18} />
            </div>
            <strong>{summary?.totalLopDays ?? 0} Days</strong>
            <small>
              Policy: {summary?.totalPolicyLopDays ?? 0}d · Manual/Override:{" "}
              {summary?.totalManualLopDays ?? 0}d
            </small>
          </article>

          <article className="cms-card lop-kpi-card">
            <div className="lop-kpi-head">
              <span>Estimated LOP Deduction</span>
              <IndianRupee size={18} />
            </div>
            <strong className="is-red">{money(summary?.totalDeduction ?? 0)}</strong>
            <small>
              Persisted Records ({recordsMonth || "All"}): {money(recordKpis?.totalDeduction ?? 0)}
            </small>
          </article>

          <article className="cms-card lop-kpi-card">
            <div className="lop-kpi-head">
              <span>Active Formula Basis</span>
              <Settings2 size={18} />
            </div>
            <strong>{activePolicy ? `${activePolicy.deductionComponent} Salary` : "—"}</strong>
            <small>
              {activePolicy
                ? `Divisor: ${
                    activePolicy.basis === "fixed30"
                      ? "Fixed 30d"
                      : activePolicy.basis === "working26"
                        ? "26 Working Days"
                        : "Calendar Days"
                  } · Rounding: ${activePolicy.roundingMode}`
                : "Loading policy formula..."}
            </small>
          </article>
        </section>

        {notice && (
          <div className="lop-alert lop-alert-success" role="status">
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
        )}
        {error && (
          <div className="lop-alert lop-alert-error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="lop-tabs" role="tablist" aria-label="LOP Configuration Sections">
          <button
            type="button"
            id="lop-tab-policy"
            role="tab"
            aria-selected={activeTab === "policy"}
            className="lop-tab-btn"
            onClick={() => setActiveTab("policy")}
          >
            <SlidersHorizontal size={15} />
            <span>Policy &amp; Calculator</span>
          </button>
          <button
            type="button"
            id="lop-tab-preview"
            role="tab"
            aria-selected={activeTab === "preview"}
            className="lop-tab-btn"
            onClick={() => setActiveTab("preview")}
          >
            <Users size={15} />
            <span>Staff LOP Preview ({visiblePreviewItems.length})</span>
          </button>
          <button
            type="button"
            id="lop-tab-records"
            role="tab"
            aria-selected={activeTab === "records"}
            className="lop-tab-btn"
            onClick={() => setActiveTab("records")}
          >
            <ClipboardList size={15} />
            <span>Saved Records &amp; Overrides ({records.length})</span>
          </button>
        </div>

        {/* Panel 1: Policy Builder & Simulator */}
        <div role="tabpanel" aria-labelledby="lop-tab-policy" hidden={activeTab !== "policy"}>
          {activeTab === "policy" && (
            <CommonLOPPolicy
              campuses={campuses}
              selectedCampusId={selectedCampusId}
              selectedMonth={month}
              staffList={staffList}
              previewItems={previewData.items}
              onPolicySaved={() => setRevision((v) => v + 1)}
            />
          )}
        </div>

        {/* Panel 2: Live Attendance + Leave + Policy Preview */}
        <div role="tabpanel" aria-labelledby="lop-tab-preview" hidden={activeTab !== "preview"}>
          {activeTab === "preview" && (
            <div className="lop-table-section">
              <div className="lop-alert lop-alert-info">
                <Info size={16} aria-hidden="true" />
                <span>
                  Live calculation from Attendance + Approved Leaves + Policy for{" "}
                  <strong>{formatMonthLabel(month)}</strong>. Click <strong>Adjust</strong> on any row
                  to override a person&apos;s LOP, or <strong>Sync &amp; Save Monthly LOP</strong> above
                  to lock records for Payroll.
                </span>
              </div>
              <div className="cms-card lop-filter-strip">
                <search className="lop-search-wrap">
                  <select
                    aria-label="Filter by staff type"
                    value={staffTypeFilter}
                    onChange={(e) => setStaffTypeFilter(e.target.value)}
                  >
                    <option value="All">All Staff Types</option>
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                  </select>
                </search>

                <label className="lop-check-inline">
                  <input
                    type="checkbox"
                    checked={impactedOnly}
                    onChange={(e) => setImpactedOnly(e.target.checked)}
                  />
                  <span>Only Staff With LOP &gt; 0</span>
                </label>

                <label className="lop-check-inline">
                  <input
                    type="checkbox"
                    checked={hideNoSalary}
                    onChange={(e) => setHideNoSalary(e.target.checked)}
                  />
                  <span>Hide Staff Without Salary Structure</span>
                </label>
              </div>

              <DataTable
                loading={previewLoading}
                title={`Monthly LOP Preview — ${formatMonthLabel(month)}`}
                rows={visiblePreviewItems}
                onSearchChange={setPreviewSearch}
                enablePdfExport
                enableTablePrint={false}
                emptyMessage="No staff records matched your filter for this month."
                columns={[
                  { key: "employeeId", label: "Emp ID" },
                  {
                    key: "name",
                    label: "Staff Member",
                    render: (r) => (
                      <div className="lop-cell-stack">
                        <strong>{r.name}</strong>
                        <small>
                          {r.department} · {r.staffType}
                        </small>
                      </div>
                    ),
                  },
                  {
                    key: "monthlySalary",
                    label: "Salary Structure",
                    render: (r) =>
                      r.hasSalaryStructure ? (
                        <div className="lop-cell-stack">
                          <strong>{money(r.baseSalary)}</strong>
                          <small>
                            {r.deductionComponent} ({r.salaryStructureName})
                          </small>
                        </div>
                      ) : (
                        <span className="lop-pill is-warn">No Salary Assigned</span>
                      ),
                  },
                  {
                    key: "presentCount",
                    label: "Attendance",
                    render: (r) => (
                      <div className="lop-cell-stack">
                        <span>
                          P: {r.presentCount} · L: {r.leaveCount}
                        </span>
                        <small>{r.shiftInfo}</small>
                      </div>
                    ),
                  },
                  {
                    key: "lateCount",
                    label: "Late / Missed Out",
                    render: (r) => (
                      <div className="lop-cell-stack">
                        <span>
                          Late: {r.lateCount} ({r.latePenaltyDays}d)
                        </span>
                        <small>
                          Missed: {r.missedCheckoutCount} ({r.missedCheckoutPenaltyDays}d)
                        </small>
                      </div>
                    ),
                  },
                  {
                    key: "absentCount",
                    label: "Absent / Half",
                    render: (r) => (
                      <div className="lop-cell-stack">
                        <span>
                          Absent: {r.absentCount} ({r.absentLopDays}d)
                        </span>
                        <small>
                          Half: {r.halfDayCount} ({r.halfDayLopDays}d)
                        </small>
                      </div>
                    ),
                  },
                  {
                    key: "lopDays",
                    label: "Total LOP",
                    render: (r) => (
                      <div className="lop-cell-stack">
                        <strong className={r.lopDays > 0 ? "is-red" : ""}>{r.lopDays} Days</strong>
                        {r.isWaived ? (
                          <span className="lop-pill is-muted">Waived</span>
                        ) : r.isOverridden ? (
                          <span className="lop-pill is-info">Overridden</span>
                        ) : r.manualLopDays > 0 ? (
                          <small>+{r.manualLopDays}d Manual</small>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "deduction",
                    label: "Deduction",
                    render: (r) => (
                      <strong className={r.deduction > 0 ? "is-red" : ""}>
                        {money(r.deduction)}
                      </strong>
                    ),
                  },
                  {
                    key: "salaryAfterLOP",
                    label: "Net After LOP",
                    render: (r) => (r.hasSalaryStructure ? money(r.salaryAfterLOP) : "—"),
                  },
                  {
                    key: "adjust",
                    label: "Customize",
                    exportable: false,
                    render: (r) => (
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost lop-row-btn"
                        onClick={() =>
                          setModalState({
                            record: null,
                            preset: {
                              staffId: r.staffId,
                              name: r.name,
                              month,
                              days: r.lopDays > 0 ? r.lopDays : 0.5,
                              basis: r.basis,
                              deductionComponent: r.deductionComponent,
                              source: "Override",
                              reason: `Adjusted from preview (${r.absentCount} absent, ${r.lateCount} late, ${r.missedCheckoutCount} missed checkout)`,
                            },
                          })
                        }
                      >
                        Adjust
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>

        {/* Panel 3: Persistent Manual / Synced / Override LOP Records */}
        <div role="tabpanel" aria-labelledby="lop-tab-records" hidden={activeTab !== "records"}>
          {activeTab === "records" && (
            <div className="lop-table-section">
              <DataTable
                loading={recordsLoading}
                title="Saved LOP Records & Overrides"
                rows={records}
                onSearchChange={setRecordsSearch}
                enablePdfExport
                enableTablePrint={false}
                onAdd={() => setModalState({ record: null })}
                addLabel="Add LOP Entry"
                onEdit={async (r) => {
                  try {
                    const detail = await lopApi.getRecordById(r.id);
                    setModalState({ record: detail });
                  } catch (err) {
                    setError(getApiErrorMessage(err));
                  }
                }}
                onDelete={handleDeleteRecord}
                emptyMessage="No saved LOP records found for the selected filter."
                toolbarExtra={
                  <div className="lop-records-toolbar">
                    <label className="lop-month-filter">
                      Month
                      <input
                        type="month"
                        value={recordsMonth}
                        onChange={(e) => setRecordsMonth(e.target.value)}
                      />
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost"
                        onClick={() => setRecordsMonth("")}
                      >
                        All
                      </button>
                    </label>
                    <select
                      aria-label="Filter records by source"
                      value={recordsSource}
                      onChange={(e) => setRecordsSource(e.target.value)}
                    >
                      <option value="">All Sources</option>
                      <option value="Manual">Manual</option>
                      <option value="Override">Override</option>
                      <option value="AutoAttendance">Synced Policy</option>
                    </select>
                  </div>
                }
                columns={[
                  { key: "employeeId", label: "Emp ID" },
                  {
                    key: "name",
                    label: "Staff Name",
                    render: (r) => (
                      <div className="lop-cell-stack">
                        <strong>{r.name}</strong>
                        <small>{r.department}</small>
                      </div>
                    ),
                  },
                  { key: "month", label: "Month" },
                  {
                    key: "source",
                    label: "Source",
                    render: (r) => (
                      <span
                        className={`lop-pill ${
                          r.source === "Override"
                            ? "is-info"
                            : r.source === "AutoAttendance"
                              ? "is-primary"
                              : "is-muted"
                        }`}
                      >
                        {r.source === "AutoAttendance" ? "Synced Policy" : r.source}
                      </span>
                    ),
                  },
                  {
                    key: "lopDays",
                    label: "LOP Days",
                    render: (r) => <strong>{r.lopDays} Days</strong>,
                  },
                  {
                    key: "deduction",
                    label: "Deduction",
                    render: (r) => <strong className="is-red">{money(r.deduction)}</strong>,
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (r) => (
                      <button
                        type="button"
                        className={`lop-pill lop-pill-btn ${r.status === "Waived" ? "is-muted" : "is-success"}`}
                        title={
                          r.status === "Waived"
                            ? "Click to Re-Activate LOP"
                            : "Click to Waive LOP"
                        }
                        onClick={() => handleToggleWaive(r)}
                      >
                        {r.status === "Waived" ? (
                          <>
                            <Ban size={11} /> Waived
                          </>
                        ) : (
                          r.status || "Active"
                        )}
                      </button>
                    ),
                  },
                  { key: "reason", label: "Reason" },
                ]}
              />
            </div>
          )}
        </div>

        {modalState && (
          <LOPRecordModal
            modalState={modalState}
            onClose={() => setModalState(null)}
            onSave={handleSaveRecord}
            staffList={staffList}
            defaultBasis={activePolicy?.basis}
            defaultComponent={activePolicy?.deductionComponent}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
