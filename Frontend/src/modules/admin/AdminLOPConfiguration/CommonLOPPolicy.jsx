import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Calculator,
  CalendarX,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  IndianRupee,
  Info,
  Lightbulb,
  LogOut,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";
import { money } from "@/modules/admin/AdminInventory/inventoryModel.js";
import { formatMonthLabel, payrollMonth } from "./lopModel.js";
import {
  POLICY_PRESETS,
  getFormulaSummary,
  getLateExample,
  getMissedCheckoutExample,
  getWeeklyMissedCheckoutExample,
  simulatePolicyDeduction,
  validatePolicy,
} from "./lopPolicy.js";
import { lopApi } from "./lopApi.js";
import { getApiErrorMessage } from "@/api/apiClient.js";

// Accessible Toggle Switch with visual indicator
function FriendlyToggle({ id, label, hint, checked, onChange }) {
  return (
    <div className="lop-switch-row">
      <div className="lop-switch-copy">
        <label htmlFor={id} className="lop-switch-title">
          {label}
        </label>
        {hint && <span className="lop-switch-hint">{hint}</span>}
      </div>
      <label className="lop-toggle-wrapper" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="lop-toggle-input"
          checked={Boolean(checked)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="lop-toggle-slider" aria-hidden="true" />
      </label>
    </div>
  );
}

// Interactive Number Stepper for sentence inputs
function NumberStepper({
  id,
  value,
  min = 0,
  max = 31,
  step = 1,
  onChange,
  unit = "",
  ariaLabel,
}) {
  const current = Number(value || 0);

  const decrement = () => {
    if (current > min) onChange(Math.max(min, current - step));
  };

  const increment = () => {
    if (current < max) onChange(Math.min(max, current + step));
  };

  return (
    <span className="lop-inline-stepper">
      <button
        type="button"
        className="lop-stepper-btn"
        disabled={current <= min}
        onClick={decrement}
        aria-label={`Decrease ${ariaLabel || id}`}
        title="Decrease"
      >
        <Minus size={13} />
      </button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        className="lop-stepper-input"
        onChange={(e) => {
          const val = Number(e.target.value);
          if (!isNaN(val)) {
            onChange(Math.min(max, Math.max(min, val)));
          }
        }}
      />
      <button
        type="button"
        className="lop-stepper-btn"
        disabled={current >= max}
        onClick={increment}
        aria-label={`Increase ${ariaLabel || id}`}
        title="Increase"
      >
        <Plus size={13} />
      </button>
      {unit && <span className="lop-stepper-unit">{unit}</span>}
    </span>
  );
}

// Quick Scenario Presets for the Simulator
const QUICK_SIM_SCENARIOS = [
  { label: "Clean (0d)", cls: "is-clean", data: { lateCount: 0, missedCheckoutCount: 0, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 0 } },
  { label: "3 Lates", cls: "is-warn", data: { lateCount: 3, missedCheckoutCount: 0, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 0 } },
  { label: "5 Lates + 1 Missed", cls: "is-alert", data: { lateCount: 5, missedCheckoutCount: 1, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 0 } },
  { label: "Weekly Lockout", cls: "is-critical", data: { lateCount: 0, missedCheckoutCount: 2, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 1 } },
  { label: "1 Absent + 3 Lates", cls: "is-critical", data: { lateCount: 3, missedCheckoutCount: 0, absentCount: 1, halfDayCount: 0, weeklyMissedTriggerCount: 0 } },
];

export default function CommonLOPPolicy({
  campuses = [],
  selectedCampusId = "",
  selectedMonth,
  staffList = [],
  previewItems = [],
  onPolicySaved,
}) {
  const uid = useId();
  const formRef = useRef(null);

  // Directly scoped to the active campus selected in the global header
  const scopeCampusId = selectedCampusId ? String(selectedCampusId) : "";
  const scopeStaffType = "All";

  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activePresetId, setActivePresetId] = useState("");
  const [touchedFields, setTouchedFields] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Live Calculator state
  const [simStaffId, setSimStaffId] = useState("");
  const [sim, setSim] = useState({
    salary: 35000,
    basicPay: 20000,
    lateCount: 0,
    missedCheckoutCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    weeklyMissedTriggerCount: 0,
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setError("");
    setTouchedFields({});
    setSubmitAttempted(false);

    lopApi.getPolicy(
      {
        campusId: scopeCampusId ? Number(scopeCampusId) : undefined,
        staffType: "All",
      },
      controller.signal,
    )
      .then((policyData) => {
        if (!policyData) throw new Error("No policy configuration returned by the server.");
        const normalized = {
          ...policyData,
          campusId: scopeCampusId ? Number(scopeCampusId) : (policyData.campusId ?? null),
          staffType: "All",
          maxLopDaysPerMonth: policyData.maxLopDaysPerMonth ?? "",
          effectiveFrom: policyData.effectiveFrom || payrollMonth(),
        };
        setSaved(normalized);
        setDraft(normalized);
        setActivePresetId("");
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setLoadError(getApiErrorMessage(err) || "Unable to load LOP policy from the server.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [scopeCampusId, reloadTick]);

  const applyStaffToSimulator = useCallback(
    (staffIdStr) => {
      setSimStaffId(staffIdStr);
      if (!staffIdStr) {
        setSim({
          salary: 35000,
          basicPay: 20000,
          lateCount: 0,
          missedCheckoutCount: 0,
          absentCount: 0,
          halfDayCount: 0,
          weeklyMissedTriggerCount: 0,
        });
        return;
      }
      const staffMember = staffList.find((s) => String(s.staffId ?? s.id) === String(staffIdStr));
      const preview = previewItems.find((p) => String(p.staffId) === String(staffIdStr));

      setSim({
        salary: staffMember?.salary || preview?.monthlySalary || 35000,
        basicPay: staffMember?.basicPay || preview?.baseSalary || 20000,
        lateCount: preview?.lateCount ?? 0,
        missedCheckoutCount: preview?.missedCheckoutCount ?? 0,
        absentCount: preview?.absentCount ?? 0,
        halfDayCount: preview?.halfDayCount ?? 0,
        weeklyMissedTriggerCount: preview?.weeklyMissedCount ?? 0,
      });
    },
    [staffList, previewItems],
  );

  const change = (field, value) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    setActivePresetId("");
  };

  const markTouched = (name) => {
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
  };

  const isDirty = useMemo(() => {
    if (!draft || !saved) return false;
    return JSON.stringify(draft) !== JSON.stringify(saved);
  }, [draft, saved]);

  const simMonth = selectedMonth || draft?.effectiveFrom || payrollMonth();

  const simResult = useMemo(() => {
    if (!draft) return null;
    try {
      return {
        ok: true,
        ...simulatePolicyDeduction(draft, {
          ...sim,
          salary: Number(sim.salary || 0),
          basicPay: Number(sim.basicPay || 0),
          month: simMonth,
        }),
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, [draft, sim, simMonth]);

  const formulaSummary = useMemo(() => {
    if (!draft) return null;
    const sample = sim.salary ? Number(sim.salary) : 30000;
    return getFormulaSummary(draft, sample, simResult?.periodDays || 30);
  }, [draft, sim.salary, simResult?.periodDays]);

  const handleApplyPreset = (preset) => {
    if (!draft) return;
    setDraft((prev) => ({
      ...prev,
      ...preset.values,
      effectiveFrom: prev.effectiveFrom || payrollMonth(),
    }));
    setActivePresetId(preset.id);
    setError("");
    setNotice(`"${preset.label}" applied. Review rules below and click "Save & Apply Policy".`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (busy || !draft) return;
    setSubmitAttempted(true);

    if (formRef.current && !formRef.current.checkValidity()) {
      const firstInvalid = formRef.current.querySelector(":invalid");
      firstInvalid?.focus();
      setError("Please check highlighted fields before saving.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const validated = validatePolicy({
        ...draft,
        campusId: scopeCampusId ? Number(scopeCampusId) : null,
        staffType: "All",
      });
      const result = await lopApi.savePolicy(validated);
      const nextSaved = {
        ...result,
        maxLopDaysPerMonth: result?.maxLopDaysPerMonth ?? "",
      };
      setSaved(nextSaved);
      setDraft(nextSaved);
      setActivePresetId("");
      setTouchedFields({});
      setSubmitAttempted(false);
      setNotice("✓ Policy saved and applied successfully. Deductions reflect immediately in Payroll.");
      onPolicySaved?.(nextSaved);
    } catch (err) {
      setError(getApiErrorMessage(err) || err.message || "Failed to save LOP policy.");
    } finally {
      setBusy(false);
    }
  };

  const showFieldError = (name, isInvalid) => (touchedFields[name] || submitAttempted) && isInvalid;

  return (
    <div className="lop-policy-workspace">
      {/* Loading / Error States */}
      {loading && !draft ? (
        <div className="cms-card lop-state-box" role="status">
          <RefreshCw size={24} className="lop-spin" />
          <span>Loading policy rules from server...</span>
        </div>
      ) : loadError && !draft ? (
        <div className="cms-card lop-state-box">
          <div className="lop-alert lop-alert-error" role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            className="cms-btn cms-btn-outline"
            onClick={() => setReloadTick((t) => t + 1)}
          >
            <RefreshCw size={14} /> Retry Loading
          </button>
        </div>
      ) : draft ? (
        <div className="lop-policy-split">
          {/* LEFT: Streamlined & Intuitive Policy Form */}
          <form
            ref={formRef}
            noValidate
            className="cms-card lop-policy-form-card"
            aria-labelledby={`${uid}-policy-heading`}
            onSubmit={handleSave}
          >
            <div className="lop-section-head">
              <div className="lop-section-title">
                <div>
                  <h2 id={`${uid}-policy-heading`}>LOP Policy Configuration</h2>
                  <p>Configure automatic loss-of-pay deductions for late arrivals, missed check-outs, and absences.</p>
                </div>
              </div>
              {isDirty ? (
                <span className="lop-pill is-warn">Unsaved Changes</span>
              ) : (
                <span className="lop-pill is-success">Saved &amp; Active</span>
              )}
            </div>

            {/* 3-Step Visual Guide for Admins */}
            <div className="lop-guide-banner" role="region" aria-label="How to configure LOP policy">
              <div className="lop-guide-header">
                <BookOpen size={16} className="lop-icon-guide" />
                <strong>How LOP Configuration Works:</strong>
              </div>
              <div className="lop-guide-steps">
                <div className="lop-guide-step">
                  <span className="lop-step-badge">1</span>
                  <div>
                    <strong>Shift Timings &amp; Grace</strong>
                    <p>Official shift time &amp; arrival grace minutes.</p>
                  </div>
                </div>
                <div className="lop-guide-step">
                  <span className="lop-step-badge">2</span>
                  <div>
                    <strong>Penalty Rules</strong>
                    <p>Free late passes &amp; deduction days per violation.</p>
                  </div>
                </div>
                <div className="lop-guide-step">
                  <span className="lop-step-badge">3</span>
                  <div>
                    <strong>Salary Formula &amp; Test</strong>
                    <p>Calculation basis &amp; live preview on the right.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 1-Click Starter Presets */}
            <div className="lop-presets-container" aria-label="Quick Policy Presets">
              <div className="lop-presets-head">
                <span className="lop-presets-title">
                  <Sparkles size={14} /> 1-Click Policy Presets:
                </span>
                <small className="lop-presets-hint">Tap any preset to automatically fill standard college rules</small>
              </div>
              <div className="lop-preset-cards">
                {POLICY_PRESETS.map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`lop-preset-card ${isActive ? "is-active" : ""}`}
                      onClick={() => handleApplyPreset(preset)}
                    >
                      <div className="lop-preset-card-top">
                        <strong>{preset.label}</strong>
                        {preset.tag && <span className="lop-preset-badge">{preset.tag}</span>}
                      </div>
                      <p>{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 1: Timings & General Activation */}
            <section className="lop-card-group" aria-label="1. Working Hours & Activation">
              <div className="lop-group-header">
                <div className="lop-group-number">1</div>
                <div>
                  <h3>Working Hours &amp; Activation</h3>
                  <p>Shift start time, grace arrival window, and automatic payslip deduction.</p>
                </div>
              </div>

              <div className="lop-switch-stack">
                <FriendlyToggle
                  id={`${uid}-enabled`}
                  label="Enable Automatic LOP Calculation"
                  hint="Calculates loss-of-pay deductions from biometric attendance and unexcused absences."
                  checked={draft.enabled}
                  onChange={(val) => change("enabled", val)}
                />
                <FriendlyToggle
                  id={`${uid}-synctiming`}
                  label="Use College Shift Timings (09:00 AM + 15m Grace)"
                  hint="Automatically synchronizes cut-off times with official college attendance settings."
                  checked={draft.useShiftTimingConfig}
                  onChange={(val) => change("useShiftTimingConfig", val)}
                />
                <FriendlyToggle
                  id={`${uid}-autopayroll`}
                  label="Auto-Deduct in Monthly Payslips"
                  hint="When enabled, calculated LOP is automatically deducted during monthly payroll generation."
                  checked={draft.autoApplyToPayroll}
                  onChange={(val) => change("autoApplyToPayroll", val)}
                />
              </div>

              {!draft.useShiftTimingConfig && (
                <div className="lop-field-grid">
                  <div className="lop-field">
                    <label htmlFor={`${uid}-shiftstart`}>Custom Cut-off Time</label>
                    <input
                      id={`${uid}-shiftstart`}
                      name="shiftStart"
                      type="time"
                      required
                      value={draft.shiftStart}
                      onChange={(e) => change("shiftStart", e.target.value)}
                    />
                  </div>
                  <div className="lop-field">
                    <label htmlFor={`${uid}-grace`}>Grace Minutes Allowed</label>
                    <input
                      id={`${uid}-grace`}
                      name="graceMinutes"
                      type="number"
                      min="0"
                      max="120"
                      inputMode="numeric"
                      required
                      value={draft.graceMinutes}
                      onChange={(e) => change("graceMinutes", e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="lop-field-grid">
                <div className="lop-field">
                  <label htmlFor={`${uid}-effective`}>
                    Effective From Month <span className="lop-required">*</span>
                  </label>
                  <input
                    id={`${uid}-effective`}
                    name="effectiveFrom"
                    type="month"
                    required
                    aria-invalid={showFieldError("effectiveFrom", !draft.effectiveFrom)}
                    value={draft.effectiveFrom}
                    onBlur={() => markTouched("effectiveFrom")}
                    onChange={(e) => change("effectiveFrom", e.target.value)}
                  />
                  {showFieldError("effectiveFrom", !draft.effectiveFrom) && (
                    <span className="lop-field-error">
                      <AlertCircle size={13} aria-hidden="true" /> Please select a valid effective month.
                    </span>
                  )}
                </div>

                <div className="lop-field">
                  <label htmlFor={`${uid}-cap`}>
                    Monthly LOP Days Cap
                    <span className="lop-label-sub"> (Optional limit)</span>
                  </label>
                  <input
                    id={`${uid}-cap`}
                    name="maxLopDaysPerMonth"
                    type="number"
                    min="0.5"
                    max="31"
                    step="0.5"
                    inputMode="decimal"
                    placeholder="No limit (e.g. 5 days)"
                    value={draft.maxLopDaysPerMonth ?? ""}
                    onBlur={() => markTouched("maxLopDaysPerMonth")}
                    onChange={(e) => change("maxLopDaysPerMonth", e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Card 2: Late Arrival & Missed Punch Penalties */}
            <section className="lop-card-group" aria-label="2. Attendance Violation Penalties">
              <div className="lop-group-header">
                <div className="lop-group-number">2</div>
                <div>
                  <h3>Late Arrivals &amp; Missed Check-Out Penalties</h3>
                  <p>Specify free passes and deduction rates for late logins and forgotten evening punch-outs.</p>
                </div>
              </div>

              {/* Late Arrivals Rule */}
              <div className="lop-clean-rule-box">
                <div className="lop-clean-rule-head">
                  <Clock size={16} className="lop-rule-icon is-clock" />
                  <strong>Late Arrival Rule</strong>
                </div>
                <div className="lop-sentence-row">
                  <span className="lop-sentence-label">Allow</span>
                  <NumberStepper
                    id={`${uid}-allowedLateLogins`}
                    ariaLabel="Free late arrivals per month"
                    value={draft.allowedLateLogins}
                    min={0}
                    max={31}
                    onChange={(val) => change("allowedLateLogins", val)}
                  />
                  <span className="lop-sentence-label">free late arrival{Number(draft.allowedLateLogins) === 1 ? "" : "s"} each month.</span>
                </div>
                <div className="lop-sentence-row">
                  <span className="lop-sentence-label">After that, for every</span>
                  <NumberStepper
                    id={`${uid}-lateLoginsPerPenalty`}
                    ariaLabel="Late arrivals per deduction"
                    value={draft.lateLoginsPerPenalty}
                    min={1}
                    max={31}
                    onChange={(val) => change("lateLoginsPerPenalty", val)}
                  />
                  <span className="lop-sentence-label">more late arrivals, deduct</span>
                  <div className="lop-inline-pills">
                    <button
                      type="button"
                      className={`lop-pill-choice ${Number(draft.penaltyDays) === 0.5 ? "is-selected" : ""}`}
                      onClick={() => change("penaltyDays", 0.5)}
                    >
                      0.5 Day (Half Day)
                    </button>
                    <button
                      type="button"
                      className={`lop-pill-choice ${Number(draft.penaltyDays) === 1 ? "is-selected" : ""}`}
                      onClick={() => change("penaltyDays", 1)}
                    >
                      1.0 Day (Full Day)
                    </button>
                  </div>
                  <span className="lop-sentence-label">salary.</span>
                </div>
                <div className="lop-rule-example">
                  <Lightbulb size={14} className="lop-icon-tip" />
                  <span>{getLateExample(draft)}</span>
                </div>
              </div>

              {/* Missed Punch-Out Rule */}
              <div className="lop-clean-rule-box">
                <div className="lop-clean-rule-head">
                  <LogOut size={16} className="lop-rule-icon is-logout" />
                  <strong>Missed Evening Punch-Out Rule</strong>
                </div>
                <div className="lop-sentence-row">
                  <span className="lop-sentence-label">Allow</span>
                  <NumberStepper
                    id={`${uid}-allowedMissedCheckouts`}
                    ariaLabel="Free missed check-outs"
                    value={draft.allowedMissedCheckouts}
                    min={0}
                    max={31}
                    onChange={(val) => change("allowedMissedCheckouts", val)}
                  />
                  <span className="lop-sentence-label">free missed punch-out{Number(draft.allowedMissedCheckouts) === 1 ? "" : "s"} per month.</span>
                </div>
                <div className="lop-sentence-row">
                  <span className="lop-sentence-label">After that, for every</span>
                  <NumberStepper
                    id={`${uid}-missedCheckoutsPerPenalty`}
                    ariaLabel="Missed check-outs per deduction"
                    value={draft.missedCheckoutsPerPenalty}
                    min={1}
                    max={31}
                    onChange={(val) => change("missedCheckoutsPerPenalty", val)}
                  />
                  <span className="lop-sentence-label">missed punch-out, deduct</span>
                  <div className="lop-inline-pills">
                    <button
                      type="button"
                      className={`lop-pill-choice ${Number(draft.missedCheckoutPenaltyDays) === 0.5 ? "is-selected" : ""}`}
                      onClick={() => change("missedCheckoutPenaltyDays", 0.5)}
                    >
                      0.5 Day (Half Day)
                    </button>
                    <button
                      type="button"
                      className={`lop-pill-choice ${Number(draft.missedCheckoutPenaltyDays) === 1 ? "is-selected" : ""}`}
                      onClick={() => change("missedCheckoutPenaltyDays", 1)}
                    >
                      1.0 Day (Full Day)
                    </button>
                  </div>
                  <span className="lop-sentence-label">salary.</span>
                </div>
                <div className="lop-rule-example">
                  <Lightbulb size={14} className="lop-icon-tip" />
                  <span>{getMissedCheckoutExample(draft)}</span>
                </div>
              </div>

              {/* Weekly Missed Check-out Lockout */}
              <FriendlyToggle
                id={`${uid}-weekly-missed-en`}
                label="Weekly Missed Check-Out Lockout"
                hint="Flag next working day as Absent if staff has repeated missed check-outs in a single week."
                checked={draft.weeklyMissedCheckoutRuleEnabled}
                onChange={(val) => change("weeklyMissedCheckoutRuleEnabled", val)}
              />

              {draft.weeklyMissedCheckoutRuleEnabled && (
                <div className="lop-clean-rule-box is-nested">
                  <div className="lop-sentence-row">
                    <span className="lop-sentence-label">If staff reaches</span>
                    <NumberStepper
                      id={`${uid}-weeklyMissedCheckoutThreshold`}
                      ariaLabel="Weekly missed check-outs threshold"
                      value={draft.weeklyMissedCheckoutThreshold}
                      min={1}
                      max={7}
                      onChange={(val) => change("weeklyMissedCheckoutThreshold", val)}
                    />
                    <span className="lop-sentence-label">missed check-outs in a week (Mon–Sat) ➔ Deduct</span>
                    <div className="lop-inline-pills">
                      <button
                        type="button"
                        className={`lop-pill-choice ${Number(draft.weeklyMissedCheckoutPenaltyDays) === 0.5 ? "is-selected" : ""}`}
                        onClick={() => change("weeklyMissedCheckoutPenaltyDays", 0.5)}
                      >
                        0.5 Day
                      </button>
                      <button
                        type="button"
                        className={`lop-pill-choice ${Number(draft.weeklyMissedCheckoutPenaltyDays) === 1 ? "is-selected" : ""}`}
                        onClick={() => change("weeklyMissedCheckoutPenaltyDays", 1)}
                      >
                        1.0 Day
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Card 3: Absences & Salary Deduction Formula */}
            <section className="lop-card-group" aria-label="3. Absences & Formula">
              <div className="lop-group-header">
                <div className="lop-group-number">3</div>
                <div>
                  <h3>Absences &amp; Salary Calculation Formula</h3>
                  <p>Deductions for unapproved absences and how 1 day of salary is calculated.</p>
                </div>
              </div>

              <div className="lop-field-grid">
                <div className="lop-field">
                  <label className="lop-label-heading">Unexcused Absence Penalty</label>
                  <div className="lop-inline-pills">
                    {[
                      { val: 0.5, label: "0.5 Day" },
                      { val: 1, label: "1.0 Day (Standard)" },
                      { val: 1.5, label: "1.5 Days" },
                      { val: 2, label: "2.0 Days" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        className={`lop-pill-choice ${Number(draft.absentPenaltyDays) === opt.val ? "is-selected" : ""}`}
                        onClick={() => change("absentPenaltyDays", opt.val)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lop-field">
                  <label className="lop-label-heading">Half-Day Attendance Penalty</label>
                  <div className="lop-inline-pills">
                    <button
                      type="button"
                      className={`lop-pill-choice ${Number(draft.halfDayPenaltyDays) === 0.5 ? "is-selected" : ""}`}
                      onClick={() => change("halfDayPenaltyDays", 0.5)}
                    >
                      0.5 Day (Standard)
                    </button>
                    <button
                      type="button"
                      className={`lop-pill-choice ${Number(draft.halfDayPenaltyDays) === 1 ? "is-selected" : ""}`}
                      onClick={() => change("halfDayPenaltyDays", 1)}
                    >
                      1.0 Day (Full Day)
                    </button>
                  </div>
                </div>
              </div>

              <div className="lop-field-grid">
                <div className="lop-field">
                  <label className="lop-label-heading">Deduct Salary From</label>
                  <div className="lop-inline-pills">
                    <button
                      type="button"
                      className={`lop-pill-choice ${draft.deductionComponent === "Gross" ? "is-selected" : ""}`}
                      onClick={() => change("deductionComponent", "Gross")}
                    >
                      Gross Salary (Standard)
                    </button>
                    <button
                      type="button"
                      className={`lop-pill-choice ${draft.deductionComponent === "Basic" ? "is-selected" : ""}`}
                      onClick={() => change("deductionComponent", "Basic")}
                    >
                      Basic Pay Only
                    </button>
                  </div>
                </div>

                <div className="lop-field">
                  <label className="lop-label-heading">Monthly Divisor (1 Day Rate)</label>
                  <div className="lop-inline-pills">
                    <button
                      type="button"
                      className={`lop-pill-choice ${draft.basis === "fixed30" ? "is-selected" : ""}`}
                      onClick={() => change("basis", "fixed30")}
                    >
                      Fixed 30 Days
                    </button>
                    <button
                      type="button"
                      className={`lop-pill-choice ${draft.basis === "calendar" ? "is-selected" : ""}`}
                      onClick={() => change("basis", "calendar")}
                    >
                      Actual Days (28–31)
                    </button>
                    <button
                      type="button"
                      className={`lop-pill-choice ${draft.basis === "working26" ? "is-selected" : ""}`}
                      onClick={() => change("basis", "working26")}
                    >
                      26 Working Days
                    </button>
                  </div>
                </div>
              </div>

              {formulaSummary && (
                <div className="lop-formula-highlight-pill">
                  <Calculator size={14} />
                  <span>
                    1 Day's Salary = <strong>{formulaSummary.comp} ÷ {formulaSummary.divisor} Days</strong> (e.g. ₹{formulaSummary.sampleSalary.toLocaleString("en-IN")} salary ➔ <strong>₹{formulaSummary.rate.toLocaleString("en-IN")}/day</strong>)
                  </span>
                </div>
              )}
            </section>

            {/* Save Alerts */}
            {error && (
              <div className="lop-alert lop-alert-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="lop-alert lop-alert-success" role="status">
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{notice}</span>
              </div>
            )}

            {/* Bottom Action / Save Bar */}
            <div className={`lop-save-bar ${isDirty ? "is-dirty" : ""}`}>
              <div className="lop-save-status">
                {isDirty ? (
                  <span className="lop-save-dirty-text">
                    <AlertTriangle size={15} /> You have unsaved changes to this policy.
                  </span>
                ) : (
                  <span className="lop-save-clean-text">
                    <Check size={15} /> Policy is active and saved for this campus.
                  </span>
                )}
              </div>
              <div className="lop-form-actions">
                <button
                  type="button"
                  disabled={!isDirty || busy}
                  className="cms-btn cms-btn-ghost"
                  onClick={() => {
                    setDraft(saved);
                    setActivePresetId("");
                    setError("");
                    setNotice("");
                  }}
                >
                  <RotateCcw size={14} /> Revert Changes
                </button>
                <button
                  type="submit"
                  disabled={busy || loading}
                  className="cms-btn cms-btn-primary"
                >
                  <Save size={14} /> {busy ? "Saving Policy..." : "Save & Apply Policy"}
                </button>
              </div>
            </div>
          </form>

          {/* RIGHT: Eco-Friendly, User-Friendly Live Policy Simulator */}
          <aside className="cms-card lop-simulator-card" aria-label="Live Policy Deduction Simulator">
            {/* 1. Sleek Eco Header (Pinned at top, never scrolls away) */}
            <div className="lop-sim-eco-head">
              <div className="lop-sim-eco-title">
                <Calculator size={16} className="lop-icon-forest" />
                <div>
                  <h3>Live Policy Simulator</h3>
                  <p>Instant deduction preview for {formatMonthLabel(simMonth)}</p>
                </div>
              </div>
              <span className="lop-eco-badge">
                <span className="lop-eco-pulse-dot" /> Live Policy
              </span>
            </div>

            {/* Scrollable Container Body - Strictly contained inside card box */}
            <div className="lop-sim-body">
              {/* 2. Top Eco Hero Metric Card */}
              {simResult?.ok ? (
                <div className="lop-eco-hero-card">
                  <div className="lop-eco-hero-grid">
                    <div className="lop-eco-metric-box is-takehome">
                      <span className="lop-eco-metric-label">Estimated Take-Home</span>
                      <strong className="lop-eco-metric-val">{money(simResult.salaryAfterLOP)}</strong>
                      <small className="lop-eco-metric-sub">Gross: {money(simResult.monthlySalary)}</small>
                    </div>
                    <div className={`lop-eco-metric-box ${simResult.deduction > 0 ? "is-penalty" : "is-clean"}`}>
                      <span className="lop-eco-metric-label">Total LOP Penalty</span>
                      <strong className="lop-eco-metric-val">
                        {simResult.deduction > 0 ? `−${money(simResult.deduction)}` : "₹0.00"}
                      </strong>
                      <span className="lop-eco-pill">
                        {simResult.lopDays > 0 ? `${simResult.lopDays} LOP Days` : "0 Days · Clean"}
                      </span>
                    </div>
                  </div>
                  <div className="lop-eco-formula-strip">
                    <IndianRupee size={12} />
                    <span>Daily Rate: <strong>{draft.deductionComponent} ÷ {simResult.periodDays}d = {money(simResult.perDayRate)}/day</strong></span>
                  </div>
                </div>
              ) : simResult?.error ? (
                <div className="lop-alert lop-alert-error">{simResult.error}</div>
              ) : null}

              {/* 3. Quick Test Scenarios (Clean wrap) */}
              <div className="lop-eco-scenarios-section">
                <div className="lop-eco-section-label">
                  <Sparkles size={12} />
                  <span>Quick Test Scenarios:</span>
                </div>
                <div className="lop-eco-scenarios-pills">
                  {QUICK_SIM_SCENARIOS.map((sc) => (
                    <button
                      key={sc.label}
                      type="button"
                      className={`lop-eco-pill-btn ${sc.cls}`}
                      onClick={() => {
                        setSim((s) => ({
                          ...s,
                          ...sc.data,
                          salary: s.salary || 35000,
                        }));
                      }}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Staff Quick Select & Salary Input (Compact 2-col) */}
              <div className="lop-eco-staff-row">
                <div className="lop-eco-field is-select">
                  <label htmlFor={`${uid}-sim-staff`}>
                    <UserCheck size={12} /> Staff (Optional)
                  </label>
                  <select
                    id={`${uid}-sim-staff`}
                    value={simStaffId}
                    onChange={(e) => applyStaffToSimulator(e.target.value)}
                  >
                    <option value="">— Or test custom salary —</option>
                    {staffList.map((s) => (
                      <option key={s.staffId ?? s.id} value={s.staffId ?? s.id}>
                        {s.name} ({s.department || "Staff"}) — {money(s.salary || 0)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="lop-eco-field is-salary">
                  <label htmlFor={`${uid}-sim-gross`}>Gross Pay (₹)</label>
                  <input
                    id={`${uid}-sim-gross`}
                    type="number"
                    min="0"
                    step="500"
                    placeholder="35000"
                    value={sim.salary}
                    onChange={(e) =>
                      setSim((s) => ({
                        ...s,
                        salary: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              {/* 5. Simulated Attendance Incidents (Clean Micro-Counters) */}
              <div className="lop-eco-incidents-card">
                <div className="lop-eco-incidents-head">
                  <Clock size={12} />
                  <span>Simulated Attendance Incidents:</span>
                </div>
                <div className="lop-eco-incidents-grid">
                  <div className="lop-eco-incident-item">
                    <label htmlFor={`${uid}-sim-late`}>
                      <Clock size={11} className="is-amber" /> Late Logins
                    </label>
                    <input
                      id={`${uid}-sim-late`}
                      type="number"
                      min="0"
                      max="31"
                      value={sim.lateCount}
                      onChange={(e) => setSim((s) => ({ ...s, lateCount: Number(e.target.value || 0) }))}
                    />
                  </div>

                  <div className="lop-eco-incident-item">
                    <label htmlFor={`${uid}-sim-missed`}>
                      <LogOut size={11} className="is-orange" /> Missed Outs
                    </label>
                    <input
                      id={`${uid}-sim-missed`}
                      type="number"
                      min="0"
                      max="31"
                      value={sim.missedCheckoutCount}
                      onChange={(e) => setSim((s) => ({ ...s, missedCheckoutCount: Number(e.target.value || 0) }))}
                    />
                  </div>

                  <div className="lop-eco-incident-item">
                    <label htmlFor={`${uid}-sim-abs`}>
                      <UserX size={11} className="is-red" /> Absences
                    </label>
                    <input
                      id={`${uid}-sim-abs`}
                      type="number"
                      min="0"
                      max="31"
                      value={sim.absentCount}
                      onChange={(e) => setSim((s) => ({ ...s, absentCount: Number(e.target.value || 0) }))}
                    />
                  </div>

                  <div className="lop-eco-incident-item">
                    <label htmlFor={`${uid}-sim-hd`}>
                      <CalendarX size={11} className="is-indigo" /> Half Days
                    </label>
                    <input
                      id={`${uid}-sim-hd`}
                      type="number"
                      min="0"
                      max="31"
                      value={sim.halfDayCount}
                      onChange={(e) => setSim((s) => ({ ...s, halfDayCount: Number(e.target.value || 0) }))}
                    />
                  </div>

                  {draft.weeklyMissedCheckoutRuleEnabled && (
                    <div className="lop-eco-incident-item is-span-2">
                      <label htmlFor={`${uid}-sim-wklockout`}>
                        <ShieldAlert size={11} className="is-red" /> Weekly Lockouts
                      </label>
                      <input
                        id={`${uid}-sim-wklockout`}
                        type="number"
                        min="0"
                        max="10"
                        value={sim.weeklyMissedTriggerCount ?? 0}
                        onChange={(e) => setSim((s) => ({ ...s, weeklyMissedTriggerCount: Number(e.target.value || 0) }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Itemized Active Violations Breakdown */}
              {simResult?.ok && (
                <div className="lop-eco-breakdown">
                  {simResult.deduction === 0 ? (
                    <div className="lop-eco-clean-alert">
                      <CheckCircle2 size={14} />
                      <span>Full salary protected — No LOP penalties under this scenario.</span>
                    </div>
                  ) : (
                    <div className="lop-eco-receipt-list">
                      {simResult.latePenaltyDays > 0 && (
                        <div className="lop-eco-receipt-row">
                          <span className="lop-receipt-title">
                            <Clock size={12} className="is-amber" /> Late Arrivals ({sim.lateCount} lates, {draft.allowedLateLogins} free)
                          </span>
                          <strong>{simResult.latePenaltyDays}d LOP ({money((simResult.perDayRate || 0) * simResult.latePenaltyDays)})</strong>
                        </div>
                      )}
                      {simResult.missedCheckoutPenaltyDays > 0 && (
                        <div className="lop-eco-receipt-row">
                          <span className="lop-receipt-title">
                            <LogOut size={12} className="is-orange" /> Missed Punch-Outs ({sim.missedCheckoutCount} missed)
                          </span>
                          <strong>{simResult.missedCheckoutPenaltyDays}d LOP ({money((simResult.perDayRate || 0) * simResult.missedCheckoutPenaltyDays)})</strong>
                        </div>
                      )}
                      {Boolean(draft.weeklyMissedCheckoutRuleEnabled && (sim.weeklyMissedTriggerCount > 0 || simResult.weeklyMissedPenaltyDays > 0)) && (
                        <div className="lop-eco-receipt-row is-lockout">
                          <span className="lop-receipt-title">
                            <ShieldAlert size={12} className="is-red" /> Weekly Lockout ({sim.weeklyMissedTriggerCount || 0} events)
                          </span>
                          <strong>{simResult.weeklyMissedPenaltyDays}d LOP ({money((simResult.perDayRate || 0) * simResult.weeklyMissedPenaltyDays)})</strong>
                        </div>
                      )}
                      {simResult.absentLopDays > 0 && (
                        <div className="lop-eco-receipt-row">
                          <span className="lop-receipt-title">
                            <UserX size={12} className="is-red" /> Unexcused Absences ({sim.absentCount} days)
                          </span>
                          <strong>{simResult.absentLopDays}d LOP ({money((simResult.perDayRate || 0) * simResult.absentLopDays)})</strong>
                        </div>
                      )}
                      {simResult.halfDayLopDays > 0 && (
                        <div className="lop-eco-receipt-row">
                          <span className="lop-receipt-title">
                            <CalendarX size={12} className="is-indigo" /> Half-Day Attendances ({sim.halfDayCount} half days)
                          </span>
                          <strong>{simResult.halfDayLopDays}d LOP ({money((simResult.perDayRate || 0) * simResult.halfDayLopDays)})</strong>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 7. Exemption Guarantee Pill */}
              <div className="lop-eco-trust-footer">
                <ShieldCheck size={13} />
                <span>Leaves, Official Tours &amp; Sundays are 100% exempt from LOP.</span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
