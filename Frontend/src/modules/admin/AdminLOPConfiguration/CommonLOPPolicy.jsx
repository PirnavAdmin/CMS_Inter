import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import { money } from "@/modules/admin/AdminInventory/inventoryModel.js";
import { formatMonthLabel, payrollMonth } from "./lopModel.js";
import {
  POLICY_PRESETS,
  describePolicyRules,
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

// Segmented choice chips
function SegmentedRadioGroup({ name, legend, options, value, onChange, disabled = false }) {
  return (
    <fieldset className="lop-radio-group" disabled={disabled}>
      {legend && <legend>{legend}</legend>}
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

// Quick Scenario Presets for the Simulator
const QUICK_SIM_SCENARIOS = [
  {
    label: "Clean Record",
    badge: "0 LOP",
    cls: "is-clean",
    data: { lateCount: 0, missedCheckoutCount: 0, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 0 },
  },
  {
    label: "3 Lates",
    badge: "Common",
    cls: "is-warn",
    data: { lateCount: 3, missedCheckoutCount: 0, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 0 },
  },
  {
    label: "5 Lates + 1 Missed Punch",
    badge: "Moderate",
    cls: "is-alert",
    data: { lateCount: 5, missedCheckoutCount: 1, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 0 },
  },
  {
    label: "2 Missed Punches (Weekly Lockout)",
    badge: "Lockout",
    cls: "is-critical",
    data: { lateCount: 0, missedCheckoutCount: 2, absentCount: 0, halfDayCount: 0, weeklyMissedTriggerCount: 1 },
  },
  {
    label: "1 Absent + 3 Lates",
    badge: "High",
    cls: "is-critical",
    data: { lateCount: 3, missedCheckoutCount: 0, absentCount: 1, halfDayCount: 0, weeklyMissedTriggerCount: 0 },
  },
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
  const [scopeCampusId, setScopeCampusId] = useState(
    selectedCampusId ? String(selectedCampusId) : "",
  );
  const [scopeStaffType, setScopeStaffType] = useState("All");
  const [allPolicies, setAllPolicies] = useState([]);
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

  // Live Calculator state (Strictly real data or manual simulation, zero mock)
  const [simStaffId, setSimStaffId] = useState("");
  const [sim, setSim] = useState({
    salary: "",
    basicPay: "",
    lateCount: 0,
    missedCheckoutCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    weeklyMissedTriggerCount: 0,
  });

  useEffect(() => {
    setScopeCampusId(selectedCampusId ? String(selectedCampusId) : "");
  }, [selectedCampusId]);

  const loadPoliciesOverview = async (signal) => {
    try {
      const list = await lopApi.getAllPolicies(signal);
      setAllPolicies(Array.isArray(list) ? list : []);
    } catch {
      // Non-critical list of overrides
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setError("");
    setTouchedFields({});
    setSubmitAttempted(false);

    Promise.all([
      lopApi.getPolicy(
        {
          campusId: scopeCampusId ? Number(scopeCampusId) : undefined,
          staffType: scopeStaffType || "All",
        },
        controller.signal,
      ),
      lopApi.getAllPolicies(controller.signal).catch(() => []),
    ])
      .then(([policyData, allList]) => {
        if (!policyData) throw new Error("No policy configuration returned by the server.");
        const normalized = {
          ...policyData,
          campusId: scopeCampusId ? Number(scopeCampusId) : (policyData.campusId ?? null),
          staffType: scopeStaffType || policyData.staffType || "All",
          maxLopDaysPerMonth: policyData.maxLopDaysPerMonth ?? "",
          effectiveFrom: policyData.effectiveFrom || payrollMonth(),
        };
        setSaved(normalized);
        setDraft(normalized);
        setActivePresetId("");
        setAllPolicies(Array.isArray(allList) ? allList : []);
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
  }, [scopeCampusId, scopeStaffType, reloadTick]);

  const applyStaffToSimulator = useCallback(
    (staffIdStr) => {
      setSimStaffId(staffIdStr);
      if (!staffIdStr) {
        setSim({
          salary: "",
          basicPay: "",
          lateCount: 0,
          missedCheckoutCount: 0,
          absentCount: 0,
          halfDayCount: 0,
          weeklyMissedTriggerCount: 0,
        });
        return;
      }
      const previewRow = previewItems.find((i) => String(i.staffId) === String(staffIdStr));
      const staffRow = staffList.find((s) => String(s.staffId ?? s.id) === String(staffIdStr));
      setSim({
        salary: Number(previewRow?.monthlySalary ?? staffRow?.salary ?? 0),
        basicPay: Number(staffRow?.basicPay ?? previewRow?.baseSalary ?? 0),
        lateCount: Number(previewRow?.lateCount ?? 0),
        missedCheckoutCount: Number(previewRow?.missedCheckoutCount ?? 0),
        absentCount: Number(previewRow?.absentCount ?? 0),
        halfDayCount: Number(previewRow?.halfDayCount ?? 0),
        weeklyMissedTriggerCount: Number(previewRow?.weeklyMissedCheckoutTriggerCount ?? 0),
      });
    },
    [previewItems, staffList],
  );

  // Auto-select staff member with salary structure when available
  useEffect(() => {
    if (simStaffId || !staffList.length) return;
    const preferred =
      staffList.find((s) => s.hasSalaryStructure && Number(s.salary) > 0) || staffList[0];
    if (preferred) {
      applyStaffToSimulator(String(preferred.staffId ?? preferred.id));
    }
  }, [staffList, simStaffId, applyStaffToSimulator]);

  const change = (key, value) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    setActivePresetId("");
    setError("");
    setNotice("");
  };

  const markTouched = (field) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const isDirty = useMemo(() => {
    if (!draft || !saved) return false;
    const keys = [
      "enabled",
      "autoApplyToPayroll",
      "effectiveFrom",
      "maxLopDaysPerMonth",
      "deductionComponent",
      "basis",
      "roundingMode",
      "useShiftTimingConfig",
      "shiftStart",
      "graceMinutes",
      "allowedLateLogins",
      "lateLoginsPerPenalty",
      "penaltyDays",
      "missedCheckoutLopEnabled",
      "allowedMissedCheckouts",
      "missedCheckoutsPerPenalty",
      "missedCheckoutPenaltyDays",
      "weeklyMissedCheckoutRuleEnabled",
      "weeklyMissedCheckoutThreshold",
      "weeklyMissedCheckoutPenaltyDays",
      "absentLopEnabled",
      "absentPenaltyDays",
      "countUnmarkedWorkingDaysAsAbsent",
      "halfDayLopEnabled",
      "halfDayPenaltyDays",
    ];
    return keys.some((k) => String(draft[k] ?? "") !== String(saved[k] ?? ""));
  }, [draft, saved]);

  const ruleText = useMemo(() => (draft ? describePolicyRules(draft) : null), [draft]);

  const simMonth = selectedMonth || draft?.effectiveFrom || payrollMonth();
  const hasSimSalary = sim.salary !== "" && Number(sim.salary) >= 0;
  const simResult = useMemo(() => {
    if (!draft || !hasSimSalary) return null;
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
  }, [draft, sim, simMonth, hasSimSalary]);

  const formulaSummary = useMemo(() => {
    if (!draft) return null;
    const sample = sim.salary ? Number(sim.salary) : 30000;
    return getFormulaSummary(draft, sample, simResult?.periodDays || 30);
  }, [draft, sim.salary, simResult?.periodDays]);

  const isScopedOverride = Boolean(scopeCampusId || (scopeStaffType && scopeStaffType !== "All"));
  const hasExactOverride = allPolicies.some(
    (p) =>
      String(p.campusId || "") === String(scopeCampusId || "") &&
      String(p.staffType || "All") === String(scopeStaffType || "All"),
  );

  const selectedStaffObj = useMemo(() => {
    if (!simStaffId) return null;
    return staffList.find((s) => String(s.staffId ?? s.id) === String(simStaffId));
  }, [staffList, simStaffId]);

  const handleApplyPreset = (preset) => {
    if (!draft) return;
    setDraft((prev) => ({
      ...prev,
      ...preset.values,
      effectiveFrom: prev.effectiveFrom || payrollMonth(),
    }));
    setActivePresetId(preset.id);
    setError("");
    setNotice(`"${preset.label}" applied to draft. Review the rules below and click "Save & Apply Policy".`);
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
        staffType: scopeStaffType || "All",
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
      await loadPoliciesOverview();
      onPolicySaved?.(nextSaved);
    } catch (err) {
      setError(getApiErrorMessage(err) || err.message || "Failed to save LOP policy.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteOverride = async (policyId) => {
    if (!window.confirm("Remove this custom override and revert to the Global Default policy?")) return;
    try {
      await lopApi.deletePolicyOverride(policyId);
      setNotice("Override removed. Scope now inherits the Global Default policy.");
      setScopeCampusId("");
      setScopeStaffType("All");
      await loadPoliciesOverview();
      onPolicySaved?.();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const showFieldError = (name, isInvalid) => (touchedFields[name] || submitAttempted) && isInvalid;

  return (
    <div className="lop-policy-workspace">
      {/* 1. Scope & Campus Override Selection */}
      <section className="cms-card lop-scope-card" aria-label="Policy Scope Selection">
        <div className="lop-section-head">
          <div className="lop-section-title">
            <Layers size={20} className="lop-icon-primary" />
            <div>
              <h2>Policy Scope</h2>
              <p>Configure institution-wide default rules or customize for a specific campus or staff category.</p>
            </div>
          </div>
          <span className={`lop-status-pill ${hasExactOverride ? "is-custom" : "is-inherited"}`}>
            {!isScopedOverride
              ? "Global Default Policy"
              : hasExactOverride
                ? "Custom Override Active"
                : "Inheriting Global Default"}
          </span>
        </div>

        <div className="lop-scope-controls">
          <div className="lop-field">
            <label htmlFor={`${uid}-scope-campus`}>Campus Scope</label>
            <select
              id={`${uid}-scope-campus`}
              name="scopeCampusId"
              value={scopeCampusId}
              onChange={(e) => setScopeCampusId(e.target.value)}
            >
              <option value="">All Campuses (Global Default)</option>
              {campuses.map((c) => {
                const cId = c.campusId ?? c.id;
                return (
                  <option key={cId} value={cId}>
                    {c.campusName || c.name}
                  </option>
                );
              })}
            </select>
          </div>

          <SegmentedRadioGroup
            name={`${uid}-scope-stafftype`}
            legend="Staff Category"
            value={scopeStaffType}
            onChange={setScopeStaffType}
            options={[
              { value: "All", label: "All Staff" },
              { value: "Teaching", label: "Teaching" },
              { value: "Non-Teaching", label: "Non-Teaching" },
            ]}
          />
        </div>

        {allPolicies.length > 1 && (
          <div className="lop-overrides-bar">
            <span className="lop-overrides-label">Saved Scopes:</span>
            <div className="lop-overrides-chips">
              {allPolicies.map((p) => {
                const isSelected =
                  String(p.campusId || "") === String(scopeCampusId || "") &&
                  String(p.staffType || "All") === String(scopeStaffType || "All");
                const isDefault = !p.campusId && (p.staffType || "All") === "All";
                return (
                  <div
                    key={p.policyId}
                    className={`lop-override-chip ${isSelected ? "is-selected" : ""}`}
                  >
                    <button
                      type="button"
                      className="lop-override-chip-btn"
                      onClick={() => {
                        setScopeCampusId(p.campusId ? String(p.campusId) : "");
                        setScopeStaffType(p.staffType || "All");
                      }}
                    >
                      <span>{p.campusName || "Global Default"}</span>
                      <span className="lop-chip-sub">· {p.staffType || "All"}</span>
                    </button>
                    {!isDefault && (
                      <button
                        type="button"
                        className="lop-override-chip-del"
                        title="Remove override"
                        aria-label={`Remove override for ${p.campusName || "Global"} ${p.staffType}`}
                        onClick={() => handleDeleteOverride(p.policyId)}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 2. Loading / Error States */}
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
          {/* LEFT: Human-Friendly Rule Builder */}
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
                  <p>Read each rule in plain English below and adjust the numbers to match your institution policy.</p>
                </div>
              </div>
              {isDirty ? (
                <span className="lop-pill is-warn">Unsaved Changes</span>
              ) : (
                <span className="lop-pill is-success">Saved &amp; Active</span>
              )}
            </div>

            {/* Quick Policy Presets */}
            <div className="lop-presets-container" aria-label="Quick Policy Presets">
              <div className="lop-presets-head">
                <span className="lop-presets-title">
                  <Sparkles size={15} /> Quick Starter Presets:
                </span>
                <small className="lop-presets-hint">Click any preset to fill recommended rules in 1 tap</small>
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

            {/* Card 1: Activation & Monthly Cap */}
            <section className="lop-card-group" aria-label="1. Activation and Payroll Sync">
              <div className="lop-group-header">
                <div className="lop-group-number">1</div>
                <div>
                  <h3>Activation &amp; Payroll Sync</h3>
                  <p>Choose when this policy runs and whether penalties automatically cut pay in payslips.</p>
                </div>
              </div>

              <div className="lop-switch-stack">
                <FriendlyToggle
                  id={`${uid}-enabled`}
                  label="Enable Automatic LOP Calculation"
                  hint="Calculates loss-of-pay penalties from attendance and unexcused absences."
                  checked={draft.enabled}
                  onChange={(val) => change("enabled", val)}
                />
                <FriendlyToggle
                  id={`${uid}-autopayroll`}
                  label="Auto-Deduct in Monthly Payslips"
                  hint="When enabled, calculated LOP is automatically deducted during bulk payslip generation."
                  checked={draft.autoApplyToPayroll}
                  onChange={(val) => change("autoApplyToPayroll", val)}
                />
              </div>

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
                    Monthly Maximum Cap (Days)
                    <span className="lop-label-sub"> — Leave blank for no limit</span>
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

            {/* Card 2: Salary Deduction Rate */}
            <section className="lop-card-group" aria-label="2. Salary Deduction Formula">
              <div className="lop-group-header">
                <div className="lop-group-number">2</div>
                <div>
                  <h3>Salary Deduction Formula</h3>
                  <p>Define how one day's salary is calculated when an LOP penalty is applied.</p>
                </div>
              </div>

              <div className="lop-formula-sections">
                <div className="lop-field">
                  <label className="lop-label-heading">Deduct From Component</label>
                  <SegmentedRadioGroup
                    name={`${uid}-component`}
                    value={draft.deductionComponent}
                    onChange={(v) => change("deductionComponent", v)}
                    options={[
                      {
                        value: "Gross",
                        label: "Gross Salary (Recommended)",
                        sub: "Standard for monthly salaried staff",
                      },
                      {
                        value: "Basic",
                        label: "Basic Pay Only",
                        sub: "Only if institution restricts cuts to Basic",
                      },
                    ]}
                  />
                </div>

                <div className="lop-field">
                  <label className="lop-label-heading">Per-Day Divisor (How 1 Day is Counted)</label>
                  <SegmentedRadioGroup
                    name={`${uid}-basis`}
                    value={draft.basis}
                    onChange={(v) => change("basis", v)}
                    options={[
                      {
                        value: "calendar",
                        label: "Actual Days in Month",
                        sub: "Divides by 28, 29, 30, or 31 days depending on month",
                      },
                      {
                        value: "fixed30",
                        label: "Fixed 30 Days",
                        sub: "Every month is counted as exactly 30 days (Salary ÷ 30)",
                      },
                      {
                        value: "working26",
                        label: "26 Working Days",
                        sub: "Excludes Sundays (Salary ÷ 26) — higher per-day cut",
                      },
                    ]}
                  />
                </div>

                <div className="lop-field">
                  <label className="lop-label-heading">Monthly Total Rounding</label>
                  <SegmentedRadioGroup
                    name={`${uid}-rounding`}
                    value={draft.roundingMode}
                    onChange={(v) => change("roundingMode", v)}
                    options={[
                      { value: "Exact", label: "Exact Precision", sub: "e.g. 1.33 days" },
                      { value: "HalfDay", label: "Round Up 0.5 Day", sub: "e.g. 1.33 ➔ 1.5 days" },
                      { value: "WholeDay", label: "Round Up Full Day", sub: "e.g. 1.33 ➔ 2.0 days" },
                    ]}
                  />
                </div>

                {formulaSummary && (
                  <div className="lop-callout-box">
                    <div className="lop-callout-top">
                      <Calculator size={15} />
                      <strong>Active Formula in Plain English:</strong>
                    </div>
                    <p className="lop-callout-text">
                      <strong>1 Day's Salary = {formulaSummary.comp} ÷ {formulaSummary.divisor} days</strong>
                    </p>
                    <small className="lop-callout-sub">
                      Example: For ₹{formulaSummary.sampleSalary.toLocaleString("en-IN")} salary, 1 day = ₹
                      {formulaSummary.rate.toLocaleString("en-IN")}. A 2-day LOP penalty will deduct ₹
                      {formulaSummary.twoDayCut.toLocaleString("en-IN")}.
                    </small>
                  </div>
                )}
              </div>
            </section>

            {/* Card 3: Late Arrival Policy */}
            <section className="lop-card-group" aria-label="3. Late Arrival Penalties">
              <div className="lop-group-header">
                <div className="lop-group-number">3</div>
                <div>
                  <h3>Late Arrival Penalties</h3>
                  <p>Specify how many free late logins are permitted and when deductions trigger.</p>
                </div>
              </div>

              <FriendlyToggle
                id={`${uid}-synctiming`}
                label="Sync Shift Login & Grace Time with Attendance Settings"
                hint="Automatically applies the official college shift timings (e.g. 09:00 AM + 15 min grace)."
                checked={draft.useShiftTimingConfig}
                onChange={(val) => change("useShiftTimingConfig", val)}
              />

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

              {/* Conversational Sentence Builder for Late Arrivals */}
              <div className="lop-sentence-card">
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
                  <span className="lop-sentence-label">
                    free late arrival{Number(draft.allowedLateLogins) === 1 ? "" : "s"} each month.
                  </span>
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
                  <span className="lop-sentence-label">additional late arrival{Number(draft.lateLoginsPerPenalty) === 1 ? "" : "s"}, deduct</span>
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
                  <Lightbulb size={15} className="lop-icon-tip" />
                  <span>{getLateExample(draft)}</span>
                </div>
              </div>
            </section>

            {/* Card 4: Missed Punch-Outs & Unexcused Absences */}
            <section className="lop-card-group" aria-label="4. Missed Check-Out and Absences">
              <div className="lop-group-header">
                <div className="lop-group-number">4</div>
                <div>
                  <h3>Missed Check-Out &amp; Unexcused Absences</h3>
                  <p>Penalties for forgotten punch-outs, unexcused full-day absences, and half-days.</p>
                </div>
              </div>

              {/* Sub-rule: Missed Check-Out */}
              <div className="lop-subrule-section">
                <FriendlyToggle
                  id={`${uid}-missed-en`}
                  label="Penalize Unresolved Missed Check-Outs (Forgot to Punch Out)"
                  hint="Staff marked attendance in the morning but forgot evening punch-out without regularization."
                  checked={draft.missedCheckoutLopEnabled}
                  onChange={(val) => change("missedCheckoutLopEnabled", val)}
                />

                {draft.missedCheckoutLopEnabled && (
                  <div className="lop-sentence-card is-nested">
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
                      <span className="lop-sentence-label">
                        free missed punch-out{Number(draft.allowedMissedCheckouts) === 1 ? "" : "s"} per month.
                      </span>
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
                      <span className="lop-sentence-label">missed punch-out{Number(draft.missedCheckoutsPerPenalty) === 1 ? "" : "s"}, deduct</span>
                      <div className="lop-inline-pills">
                        <button
                          type="button"
                          className={`lop-pill-choice ${Number(draft.missedCheckoutPenaltyDays) === 0.5 ? "is-selected" : ""}`}
                          onClick={() => change("missedCheckoutPenaltyDays", 0.5)}
                        >
                          0.5 Day
                        </button>
                        <button
                          type="button"
                          className={`lop-pill-choice ${Number(draft.missedCheckoutPenaltyDays) === 1 ? "is-selected" : ""}`}
                          onClick={() => change("missedCheckoutPenaltyDays", 1)}
                        >
                          1.0 Day
                        </button>
                      </div>
                      <span className="lop-sentence-label">salary.</span>
                    </div>

                    <div className="lop-rule-example">
                      <Lightbulb size={15} className="lop-icon-tip" />
                      <span>{getMissedCheckoutExample(draft)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-rule: Weekly Missed Check-Out Lockout / Next Working Day LOP */}
              <div className="lop-subrule-section lop-weekly-lockout-section">
                <FriendlyToggle
                  id={`${uid}-weekly-missed-en`}
                  label="Weekly Missed Check-Out Lockout (Next Working Day LOP / Absent)"
                  hint="Automatically marks the immediate next working day as Absent (cutting salary) when a staff member hits repeated missed check-outs within a single calendar week (Mon–Sat), overriding biometric punches."
                  checked={draft.weeklyMissedCheckoutRuleEnabled}
                  onChange={(val) => change("weeklyMissedCheckoutRuleEnabled", val)}
                />

                {draft.weeklyMissedCheckoutRuleEnabled && (
                  <div className="lop-sentence-card is-nested">
                    <div className="lop-sentence-row">
                      <span className="lop-sentence-label">If staff accumulates</span>
                      <NumberStepper
                        id={`${uid}-weeklyMissedCheckoutThreshold`}
                        ariaLabel="Weekly missed check-outs before lockout"
                        value={draft.weeklyMissedCheckoutThreshold}
                        min={1}
                        max={7}
                        onChange={(val) => change("weeklyMissedCheckoutThreshold", val)}
                      />
                      <span className="lop-sentence-label">
                        unresolved missed check-outs in a single week (Mon–Sat),
                      </span>
                    </div>

                    <div className="lop-sentence-row">
                      <span className="lop-sentence-label">mark the immediate next working day as Absent with</span>
                      <div className="lop-inline-pills">
                        <button
                          type="button"
                          className={`lop-pill-choice ${Number(draft.weeklyMissedCheckoutPenaltyDays) === 0.5 ? "is-selected" : ""}`}
                          onClick={() => change("weeklyMissedCheckoutPenaltyDays", 0.5)}
                        >
                          0.5 Day (Half)
                        </button>
                        <button
                          type="button"
                          className={`lop-pill-choice ${Number(draft.weeklyMissedCheckoutPenaltyDays) === 1 ? "is-selected" : ""}`}
                          onClick={() => change("weeklyMissedCheckoutPenaltyDays", 1)}
                        >
                          1.0 Day (Full Day)
                        </button>
                        <button
                          type="button"
                          className={`lop-pill-choice ${Number(draft.weeklyMissedCheckoutPenaltyDays) === 1.5 ? "is-selected" : ""}`}
                          onClick={() => change("weeklyMissedCheckoutPenaltyDays", 1.5)}
                        >
                          1.5 Days
                        </button>
                        <button
                          type="button"
                          className={`lop-pill-choice ${Number(draft.weeklyMissedCheckoutPenaltyDays) === 2 ? "is-selected" : ""}`}
                          onClick={() => change("weeklyMissedCheckoutPenaltyDays", 2)}
                        >
                          2.0 Days (Double)
                        </button>
                      </div>
                      <span className="lop-sentence-label">salary cut.</span>
                    </div>

                    <div className="lop-rule-example">
                      <Lightbulb size={15} className="lop-icon-tip" />
                      <span>{getWeeklyMissedCheckoutExample(draft)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-rule: Unexcused Absences */}
              <div className="lop-subrule-section">
                <FriendlyToggle
                  id={`${uid}-absent-en`}
                  label="Deduct Salary for Unexcused Absences"
                  hint="Applies when a staff member was absent without approved leave application."
                  checked={draft.absentLopEnabled}
                  onChange={(val) => change("absentLopEnabled", val)}
                />

                {draft.absentLopEnabled && (
                  <div className="lop-subrule-body">
                    <div className="lop-field">
                      <label className="lop-label-heading">LOP Days Deducted per Unexcused Absence</label>
                      <SegmentedRadioGroup
                        name={`${uid}-absentpen`}
                        value={draft.absentPenaltyDays}
                        onChange={(v) => change("absentPenaltyDays", Number(v))}
                        options={[
                          { value: 0.5, label: "0.5 Day (Half)" },
                          { value: 1, label: "1.0 Day (Standard 1:1)" },
                          { value: 1.5, label: "1.5 Days" },
                          { value: 2, label: "2.0 Days (Double)" },
                        ]}
                      />
                    </div>

                    <label className="lop-checkbox-row" htmlFor={`${uid}-unmarked`}>
                      <input
                        id={`${uid}-unmarked`}
                        type="checkbox"
                        checked={Boolean(draft.countUnmarkedWorkingDaysAsAbsent)}
                        onChange={(e) =>
                          change("countUnmarkedWorkingDaysAsAbsent", e.target.checked)
                        }
                      />
                      <span className="lop-checkbox-label">
                        Treat past unmarked working days as Absent (strict attendance mode)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Sub-rule: Half-Day Attendance */}
              <div className="lop-subrule-section">
                <FriendlyToggle
                  id={`${uid}-halfday-en`}
                  label="Deduct Salary for Half-Day Attendance"
                  hint="Applies when staff only attended half the required work shift."
                  checked={draft.halfDayLopEnabled}
                  onChange={(val) => change("halfDayLopEnabled", val)}
                />

                {draft.halfDayLopEnabled && (
                  <div className="lop-subrule-body">
                    <div className="lop-field">
                      <label className="lop-label-heading">LOP Days Deducted per Half-Day</label>
                      <SegmentedRadioGroup
                        name={`${uid}-halfdaypen`}
                        value={draft.halfDayPenaltyDays}
                        onChange={(v) => change("halfDayPenaltyDays", Number(v))}
                        options={[
                          { value: 0.5, label: "0.5 Day (Standard Half-Day)" },
                          { value: 1, label: "1.0 Day (Full Day Cut)" },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
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
                    <Check size={15} /> This policy configuration is active and up to date.
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

          {/* RIGHT: Live Deduction Simulator & Calculator */}
          <aside className="cms-card lop-simulator-card" aria-label="Live Policy Deduction Simulator">
            <div className="lop-section-head">
              <div className="lop-section-title">
                <Calculator size={20} className="lop-icon-primary" />
                <div>
                  <h3>Live Policy Simulator</h3>
                  <p>Instantly test how draft rules affect pay for {formatMonthLabel(simMonth)}</p>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Simulation Buttons */}
            <div className="lop-sim-scenarios">
              <span className="lop-sim-label">Quick Test Scenarios:</span>
              <div className="lop-sim-buttons">
                {QUICK_SIM_SCENARIOS.map((sc) => (
                  <button
                    key={sc.label}
                    type="button"
                    className={`lop-sim-quick-btn ${sc.cls}`}
                    onClick={() => {
                      setSim((s) => ({
                        ...s,
                        ...sc.data,
                        salary: s.salary || 35000,
                      }));
                    }}
                  >
                    <span>{sc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Selector */}
            <div className="lop-field">
              <label htmlFor={`${uid}-sim-staff`} className="lop-sim-staff-label">
                <UserCheck size={14} /> Test with Real Staff Member
              </label>
              <select
                id={`${uid}-sim-staff`}
                value={simStaffId}
                onChange={(e) => applyStaffToSimulator(e.target.value)}
              >
                <option value="">
                  {staffList.length
                    ? "— Or enter custom amounts manually below —"
                    : "No staff loaded"}
                </option>
                {staffList.map((s) => (
                  <option key={s.staffId ?? s.id} value={s.staffId ?? s.id}>
                    {s.name} ({s.employeeId}) — {money(s.salary || 0)}
                  </option>
                ))}
              </select>
            </div>

            {selectedStaffObj && (
              <div className="lop-sim-staff-badge">
                <strong>{selectedStaffObj.name}</strong>
                <span>
                  {selectedStaffObj.department || "Staff"} · Gross: {money(selectedStaffObj.salary || 0)}
                </span>
              </div>
            )}

            {/* Editable Simulator Form Inputs */}
            <div className="lop-sim-inputs-grid">
              <div className="lop-field">
                <label htmlFor={`${uid}-sim-gross`}>Monthly Gross Pay (₹)</label>
                <input
                  id={`${uid}-sim-gross`}
                  type="number"
                  min="0"
                  step="500"
                  inputMode="numeric"
                  placeholder="e.g. 35000"
                  value={sim.salary}
                  onChange={(e) =>
                    setSim((s) => ({
                      ...s,
                      salary: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="lop-field">
                <label htmlFor={`${uid}-sim-basic`}>Basic Pay (₹, Optional)</label>
                <input
                  id={`${uid}-sim-basic`}
                  type="number"
                  min="0"
                  step="500"
                  inputMode="numeric"
                  placeholder="Optional"
                  value={sim.basicPay}
                  onChange={(e) =>
                    setSim((s) => ({
                      ...s,
                      basicPay: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="lop-field">
                <label htmlFor={`${uid}-sim-late`}>Late Logins</label>
                <input
                  id={`${uid}-sim-late`}
                  type="number"
                  min="0"
                  max="31"
                  inputMode="numeric"
                  value={sim.lateCount}
                  onChange={(e) => setSim((s) => ({ ...s, lateCount: Number(e.target.value || 0) }))}
                />
              </div>

              <div className="lop-field">
                <label htmlFor={`${uid}-sim-missed`}>Missed Check-Outs</label>
                <input
                  id={`${uid}-sim-missed`}
                  type="number"
                  min="0"
                  max="31"
                  inputMode="numeric"
                  value={sim.missedCheckoutCount}
                  onChange={(e) =>
                    setSim((s) => ({ ...s, missedCheckoutCount: Number(e.target.value || 0) }))
                  }
                />
              </div>

              <div className="lop-field">
                <label htmlFor={`${uid}-sim-abs`}>Unexcused Absences</label>
                <input
                  id={`${uid}-sim-abs`}
                  type="number"
                  min="0"
                  max="31"
                  inputMode="numeric"
                  value={sim.absentCount}
                  onChange={(e) => setSim((s) => ({ ...s, absentCount: Number(e.target.value || 0) }))}
                />
              </div>

              <div className="lop-field">
                <label htmlFor={`${uid}-sim-hd`}>Half Days</label>
                <input
                  id={`${uid}-sim-hd`}
                  type="number"
                  min="0"
                  max="31"
                  inputMode="numeric"
                  value={sim.halfDayCount}
                  onChange={(e) => setSim((s) => ({ ...s, halfDayCount: Number(e.target.value || 0) }))}
                />
              </div>

              {draft.weeklyMissedCheckoutRuleEnabled && (
                <div className="lop-field">
                  <label htmlFor={`${uid}-sim-wklockout`}>Weekly Lockout Penalty Days</label>
                  <input
                    id={`${uid}-sim-wklockout`}
                    type="number"
                    min="0"
                    max="10"
                    inputMode="numeric"
                    title={`Triggered automatically when missed check-outs reach ${draft.weeklyMissedCheckoutThreshold} in a calendar week.`}
                    value={sim.weeklyMissedTriggerCount ?? 0}
                    onChange={(e) =>
                      setSim((s) => ({ ...s, weeklyMissedTriggerCount: Number(e.target.value || 0) }))
                    }
                  />
                </div>
              )}
            </div>

            {/* Calculated Deduction Receipt Card */}
            {simResult?.ok ? (
              <div className="lop-sim-receipt-card">
                <div className="lop-receipt-header">
                  <span>Deduction Summary</span>
                  <span className="lop-receipt-month">{formatMonthLabel(simMonth)}</span>
                </div>

                {/* Prominent Top Stat Ribbon — always visible first */}
                <div className="lop-sim-stat-ribbon">
                  <div className="lop-stat-ribbon-item">
                    <span className="lop-ribbon-label">Total LOP</span>
                    <strong className="lop-ribbon-val">{simResult.lopDays} d</strong>
                  </div>
                  <div className="lop-stat-ribbon-item is-cut">
                    <span className="lop-ribbon-label">Pay Deduction</span>
                    <strong className="lop-ribbon-val is-red">−{money(simResult.deduction)}</strong>
                  </div>
                  <div className="lop-stat-ribbon-item is-net">
                    <span className="lop-ribbon-label">Take-Home</span>
                    <strong className="lop-ribbon-val is-green">{money(simResult.salaryAfterLOP)}</strong>
                  </div>
                </div>

                <div className="lop-receipt-breakdown">
                  <div className="lop-receipt-row">
                    <span>
                      🕒 Late Logins ({sim.lateCount} logged, {draft.allowedLateLogins} free)
                    </span>
                    <strong>{simResult.latePenaltyDays} Day(s)</strong>
                  </div>

                  <div className="lop-receipt-row">
                    <span>
                      🚪 Missed Check-outs ({sim.missedCheckoutCount} logged, {draft.allowedMissedCheckouts} free)
                    </span>
                    <strong>{simResult.missedCheckoutPenaltyDays} Day(s)</strong>
                  </div>

                  {Boolean(draft.weeklyMissedCheckoutRuleEnabled && (sim.weeklyMissedTriggerCount > 0 || simResult.weeklyMissedPenaltyDays > 0)) && (
                    <div className="lop-receipt-row is-weekly-lockout-row">
                      <span>
                        🔒 Weekly Lockout Penalty ({sim.weeklyMissedTriggerCount || 0} event(s) @ {draft.weeklyMissedCheckoutPenaltyDays}d cut)
                      </span>
                      <strong>{simResult.weeklyMissedPenaltyDays} Day(s)</strong>
                    </div>
                  )}

                  <div className="lop-receipt-row">
                    <span>❌ Unexcused Absences ({sim.absentCount} days)</span>
                    <strong>{simResult.absentLopDays} Day(s)</strong>
                  </div>

                  <div className="lop-receipt-row">
                    <span>🌓 Half-Day Records ({sim.halfDayCount} days)</span>
                    <strong>{simResult.halfDayLopDays} Day(s)</strong>
                  </div>

                  <div className="lop-receipt-row is-rate-row">
                    <span>Daily Rate ({draft.deductionComponent} ÷ {simResult.periodDays}d):</span>
                    <span>{money(simResult.perDayRate)} / day</span>
                  </div>
                </div>
              </div>
            ) : simResult?.error ? (
              <div className="lop-alert lop-alert-error">{simResult.error}</div>
            ) : (
              <div className="lop-sim-empty">
                <Info size={16} />
                <span>Enter a salary or pick a staff member above to see the live deduction calculation.</span>
              </div>
            )}

            <div className="lop-sim-note">
              <ShieldCheck size={16} />
              <span>
                Approved Leaves, Official Holidays, and Sundays are always 100% exempted automatically.
              </span>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
