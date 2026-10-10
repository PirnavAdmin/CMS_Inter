import { useCallback, useEffect, useId, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "@/api/axios.js";
import { normalizeFeePreview, selectFeeStructure } from "./feeTransition.js";

export const EMPTY_FEE_CONFIG = { targetFeeStructureId: "", paymentPlan: "Full Payment", numberOfInstallments: 1 };
export const feeCurrency = (value) => value === null || value === undefined ? "-"
  : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

// A result belongs to its request key, including during the render before effect cleanup.
export function useFeePreview(loader, params, enabled = true, normalize = normalizeFeePreview) {
  const key = JSON.stringify(params);
  const request = useRef(0);
  const [state, setState] = useState({ key: "", data: null, error: "", loading: false });
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setState({ key, data: null, error: "", loading: true });
    try {
      const data = normalize(await loader(JSON.parse(key)));
      if (id === request.current) setState({ key, data, error: "", loading: false });
      return data;
    } catch (error) {
      if (id !== request.current) return null;
      const status = error?.response?.status;
      setState({ key, data: null, loading: false,
        error: `${getApiErrorMessage(error)}${status ? ` (HTTP ${status})` : ""}` });
      return null;
    }
  }, [key, loader, normalize]);
  useEffect(() => {
    if (enabled) refresh();
    return () => { request.current += 1; };
  }, [enabled, refresh]);
  const current = enabled && state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : "",
    loading: enabled && (!current || state.loading),
    retry: refresh,
    refresh,
  };
}

export function FeePreviewStatus({ state }) {
  if (state.loading) return <p role="status">Loading fee preview...</p>;
  if (!state.error) return null;
  return <div className="promotion-error" role="alert"><span>{state.error}</span>
    <button type="button" className="cms-btn cms-btn-ghost" onClick={state.retry}><RefreshCw size={14} /> Retry</button>
  </div>;
}

export function FeeStructureSelect({ preview, value, onChange, disabled = false }) {
  const id = useId();
  const selected = selectFeeStructure(preview, value);
  return <>
    <div className="cms-field">
      <label htmlFor={id}>Target Fee Structure</label>
      <select id={id} value={selected?.id || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled || !preview?.structures.length}>
        {!preview?.structures.length ? <option value="">No matching fee structure</option> : null}
        {preview?.structures.map((row) => <option key={row.id} value={row.id}>{row.name || `Fee Structure ${row.id}`} - {feeCurrency(row.total)}</option>)}
      </select>
    </div>
    {selected?.components.length ? <details className="promotion-fee-breakdown"><summary>Fee Components</summary>
      <dl>{selected.components.map((row, index) => <div key={index}><dt>{row.name || "Fee Component"}</dt><dd>{feeCurrency(row.amount)}</dd></div>)}</dl>
    </details> : null}
  </>;
}

export function PromotionFeePanel({ state, config, onChange, disabled = false }) {
  const planId = useId();
  const countId = useId();
  const preview = state.data;
  return <section className="promotion-fee-panel" aria-label="Fee configuration and preview">
    <h3>Fee Configuration &amp; Preview</h3>
    <FeePreviewStatus state={state} />
    {!state.loading && !state.error && !preview ? <p>Select the target cohort to view fees.</p> : null}
    {preview ? <>
      <FeeStructureSelect preview={preview} value={config.targetFeeStructureId} onChange={(value) => onChange({ ...config, targetFeeStructureId: value })} disabled={disabled} />
      {preview.arrearsTotal > 0 ? <p className="promotion-fee-arrears" role="status">
        {preview.arrearsCount !== null ? `${preview.arrearsCount} students: ` : "Prior arrears: "}{feeCurrency(preview.arrearsTotal)} outstanding; carried forward as pending balance.
      </p> : null}
      <div className="promotion-fee-grid">
        <div className="cms-field"><label htmlFor={planId}>Payment Plan</label>
          <select id={planId} value={config.paymentPlan} disabled={disabled} onChange={(event) => onChange({ ...config,
            paymentPlan: event.target.value, numberOfInstallments: event.target.value === "Full Payment" ? 1 : 3 })}>
            <option value="Full Payment">Full Payment (1 installment)</option>
            <option value="Term-wise">Term-wise (3 installments)</option>
            <option value="Custom Installments">Custom Installments</option>
          </select>
        </div>
        <div className="cms-field"><label htmlFor={countId}>Number of Installments</label>
          <input id={countId} type="number" min="2" max="6" step="1" value={config.numberOfInstallments}
            disabled={disabled || config.paymentPlan !== "Custom Installments"}
            onChange={(event) => onChange({ ...config, numberOfInstallments: event.target.value })} />
        </div>
      </div>
    </> : null}
  </section>;
}

export function TransferFeePanel({ state, structureId, onStructureChange, transferCredit, onCreditChange, disabled, readOnly = false }) {
  const preview = state.data;
  const selected = selectFeeStructure(preview, structureId);
  const balance = selected?.total !== null && selected?.total !== undefined && preview?.current.paid !== null
    ? selected.total - (transferCredit ? preview.current.paid : 0) : null;
  return <section className="promotion-fee-panel" aria-label="Fee reconciliation">
    <h3>Fee Reconciliation</h3><FeePreviewStatus state={state} />
    {preview ? <>
      <div className="promotion-fee-grid"><div><h4>Current Campus Fee</h4><dl className="promotion-fee-values">
        <div><dt>Total</dt><dd>{feeCurrency(preview.current.total)}</dd></div>
        <div><dt>Paid</dt><dd>{feeCurrency(preview.current.paid)}</dd></div>
        <div><dt>Outstanding</dt><dd>{feeCurrency(preview.current.balance)}</dd></div>
      </dl></div><div><h4>Destination Campus Fee</h4>
        <FeeStructureSelect preview={preview} value={structureId} onChange={onStructureChange} disabled={disabled || readOnly} />
      </div></div>
      {readOnly ? <p>Potential paid credit: {feeCurrency(preview.current.paid)}</p> : <label className="promotion-fee-checkbox"><input type="checkbox" checked={transferCredit} disabled={disabled} onChange={(event) => onCreditChange(event.target.checked)} />
        Transfer paid amount {feeCurrency(preview.current.paid)} as credit to destination campus
      </label>}
      <div className="promotion-fee-balance"><span>{readOnly ? "Estimated Balance With Paid Credit" : "Estimated New Balance"}</span><strong>{feeCurrency(balance)}</strong></div>
    </> : null}
  </section>;
}

export function ProgramFeeComparison({ student, state }) {
  const preview = state.data;
  const difference = preview?.difference ?? (preview && preview.targetTotal !== null && preview.current.total !== null
    ? preview.targetTotal - preview.current.total : null);
  return <div className="promotion-fee-program-row">
    <strong>{student}</strong><FeePreviewStatus state={state} />
    {preview ? <dl className="promotion-fee-values">
      <div><dt>Current Program Fee</dt><dd>{feeCurrency(preview.current.total)}</dd></div>
      <div><dt>Target Program Fee</dt><dd>{feeCurrency(preview.targetTotal)}</dd></div>
      <div><dt>Difference</dt><dd className={difference > 0 ? "promotion-fee-increase" : ""}>{difference > 0 ? "+" : ""}{feeCurrency(difference)}</dd></div>
    </dl> : null}
  </div>;
}
