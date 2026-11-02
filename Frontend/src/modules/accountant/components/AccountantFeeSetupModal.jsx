import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/shared/components/Ui.jsx";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useFinancePage, requestError } from "../services/accountantService.js";
import { feeMoney, feeStatus, feeText, readFee, scopedFeeMasters } from "../utils/feeViewData.js";
import { loadFeeOptions, loadSetupEditor, saveSetupRecord, setupDraft, setupId, setupNames, structureDraftPreview, validateSetupDraft } from "../services/accountantService.js";
import { FeeLoadState, FeeNotice, FeeTable } from "./AccountantUI.jsx";

const categories = ["Admission", "Academic", "Examination", "Transport", "Hostel", "Activities", "Activity", "Facility", "Other", "Miscellaneous"];
const opts = (rows, idKey, labelKey) => (rows || []).map((row) => ({ value: readFee(row, idKey) ?? readFee(row, "id"), label: readFee(row, labelKey) ?? readFee(row, "name") ?? readFee(row, idKey) })).filter((option) => option.value != null);
const options = (values) => values.map((value) => ({ value, label: value }));

function EditorField({ name, label, draft, update, choices, required = false, type = "text", min, max, step, disabled = false, maxLength }) {
  const id = `accountant-fee-${name}`;
  return <div className="cms-field"><label htmlFor={id}>{label}{required ? <span className="req"> *</span> : null}</label>
    {choices ? <select id={id} value={draft[name] ?? ""} onChange={(event) => update(name, event.target.value)} disabled={disabled} required={required}><option value="">Select {label}</option>{choices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      : <input id={id} type={type} value={draft[name] ?? ""} onChange={(event) => update(name, event.target.value)} disabled={disabled} required={required} min={min} max={max} step={step} maxLength={maxLength} />}
  </div>;
}

function SimpleFields({ kind, draft, update, lookups }) {
  const field = (name, label, props = {}) => <EditorField key={name} name={name} label={label} draft={draft} update={update} {...props} />;
  return <div className="cms-form-grid">
    {kind === "types" ? <>{field("feeTypeName", "Fee Type Name", { required: true, maxLength: 100 })}{field("category", "Category", { choices: options(categories), required: true })}</> : null}
    {kind === "scholarships" ? <>{field("scholarshipName", "Scholarship Name", { required: true, maxLength: 100 })}{field("discountType", "Discount Type", { required: true, choices: [{ value: "Percentage", label: "Percentage" }, { value: "Fixed", label: "Fixed Amount" }] })}{field("discountValue", "Discount Value", { required: true, type: "number", min: "0.01", step: "0.01", max: draft.discountType === "Percentage" ? "100" : undefined })}</> : null}
    {kind === "fine" ? <>{field("fineRuleName", "Fine Rule Name", { required: true })}{field("applicableFeeId", "Applicable Fee / Fee Type", { required: true, choices: opts((lookups.types || []).filter((row) => feeStatus(row) !== "Inactive"), "feeTypeId", "feeTypeName") })}{field("fineType", "Fine Type", { required: true, choices: options(["Fixed Amount", "Percentage"]) })}{field("fineAmount", "Fine Amount", { required: true, type: "number", min: "0.01", step: "0.01", max: draft.fineType === "Percentage" ? "100" : undefined })}{field("gracePeriod", "Grace Period", { type: "number", min: "0", step: "1" })}</> : null}
    {kind === "hostel" ? <>{field("hostelId", "Hostel Block", { required: true, choices: opts(lookups.blocks, "hostelId", "hostelName") })}{field("roomTypeId", "Room Type", { required: true, choices: opts(lookups.roomTypes, "roomTypeId", "roomTypeName") })}{field("feeFrequency", "Fee Frequency", { required: true, choices: options(["Monthly", "Quarterly", "Annual"]) })}{field("hostelFeeAmount", "Hostel Fee", { required: true, type: "number", min: "0.01", step: "0.01" })}{field("securityDeposit", "Security Deposit", { type: "number", min: "0", step: "0.01" })}{field("effectiveDate", "Effective From", { required: true, type: "date" })}</> : null}
    {kind === "transport" ? <>{field("routeId", "Route", { required: true, choices: opts(lookups.routes, "routeId", "routeName") })}{field("pickupPointName", "Pickup Point", { required: true })}{field("landmark", "Landmark")}{field("distanceFromStart", "Distance from School (KM)", { required: true, type: "number", min: "0", step: "0.01" })}{field("monthlyFee", "Monthly Fare", { required: true, type: "number", min: "0", step: "0.01" })}{field("sequenceNo", "Sequence Number", { required: true, type: "number", min: "1", step: "1" })}{field("pickupTime", "Morning Pickup Time", { required: true, type: "time" })}{field("dropTime", "Evening Drop Time", { required: true, type: "time" })}</> : null}
    {field("status", "Status", { choices: options(["Active", "Inactive"]), required: true })}
  </div>;
}

function StructureFields({ draft, update, lookups, row, params }) {
  const boardId = draft.boardId;
  const academicYearId = draft.academicYearId;
  const groupId = draft.groupId;
  const loadGroups = useCallback((signal) => boardId && academicYearId ? loadFeeOptions(apiEndpoints.groups.getAll, { ...params, boardId, academicYearId, isActive: true }, signal) : Promise.resolve([]), [params, boardId, academicYearId]);
  const groups = useFinancePage(loadGroups);
  const loadPrograms = useCallback((signal) => groupId ? loadFeeOptions(apiEndpoints.programs.byGroup(groupId), {}, signal) : Promise.resolve([]), [groupId]);
  const programs = useFinancePage(loadPrograms);
  useEffect(() => {
    const choices = opts(programs.data, "programId", "programName");
    if (!programs.loading && !programs.error && choices.length && !choices.some((program) => String(program.value) === String(draft.programId))) {
      update("programId", choices[0].value);
    }
  }, [programs.loading, programs.error, programs.data, draft.programId, update]);
  const changeItem = (index, patch) => update("items", draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const field = (name, label, choices, disabled = false) => <EditorField name={name} label={label} draft={draft} update={update} required choices={choices} disabled={disabled} />;
  const groupOptions = opts(scopedFeeMasters(groups.data || [], { ...params, boardId, academicYearId }), "groupId", "groupName");
  if (row && groupId && !groupOptions.some((option) => String(option.value) === String(groupId))) groupOptions.push({ value: groupId, label: feeText(row, "groupName") });
  const { first: total } = structureDraftPreview(draft);
  return <>
    <div className="cms-form-grid cols-3">
      {field("boardId", "Board", opts(lookups.boards, "boardId", "boardName"), Boolean(row))}
      {field("academicYearId", "Academic Year", opts(lookups.years, "academicYearId", "academicYearName"), Boolean(row))}
      {field("groupId", "Group", groupOptions, Boolean(row) || groups.loading || !boardId || !academicYearId)}
      {field("programId", "Program", opts(programs.data, "programId", "programName"), programs.loading || !groupId || !programs.data?.length)}
      {row ? <EditorField name="status" label="Status" draft={draft} update={update} choices={options(["Active", "Inactive"])} /> : null}
    </div>
    {groups.error ? <FeeLoadState state={groups} /> : null}{programs.error ? <FeeLoadState state={programs} /> : null}
    <div className="cms-fee-structure-items"><div className="cms-fee-structure-items-head"><h4>Configured Fee Types</h4></div>
      <FeeTable rows={draft.items.map((item, index) => ({ ...item, index }))} className="cms-fee-config-table cms-fee-setup-table cms-fee-types-table" columns={[
        { label: "Fee Type", value: (item) => <strong>{item.feeTypeName}</strong> },
        { label: "Rule", value: (item) => <select className="cms-mini-input" aria-label={`Rule for ${item.feeTypeName}`} value={item.rule} onChange={(event) => changeItem(item.index, { rule: event.target.value })}><option>Mandatory</option><option>Optional</option></select> },
        { label: "Status", value: (item) => <select className="cms-mini-input" aria-label={`Status for ${item.feeTypeName}`} value={item.isActive ? "Active" : "Inactive"} onChange={(event) => changeItem(item.index, { isActive: event.target.value === "Active" })}><option>Active</option><option>Inactive</option></select> },
        { label: "Amount", num: true, value: (item) => <input className="cms-mini-input" aria-label={`Amount for ${item.feeTypeName}`} type="number" min="0" step="0.01" value={item.amount} onChange={(event) => changeItem(item.index, { amount: event.target.value, isActive: Number(event.target.value) > 0 || item.rule === "Mandatory" })} /> },
      ]} empty="No saved fee types are available." />
      <div className="cms-fee-progress-head"><span>Total Active Fees</span><strong>{feeMoney(total)}</strong></div>
    </div>
  </>;
}

function SetupEditor({ kind, row, rows, params, data, authorize, onSaved, onClose, yearSettings, onDraftTotalChange }) {
  const [draft, setDraft] = useState(() => ({ ...setupDraft(kind, data.detail, data.lookups, params), ...(kind === "structures" && !row ? yearSettings : {}) }));
  const draftTotal = kind === "structures" ? structureDraftPreview(draft).first : 0;
  useEffect(() => { onDraftTotalChange?.(draftTotal); }, [draftTotal, onDraftTotalChange]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const savingRef = useRef(false);
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value, ...(["boardId", "academicYearId"].includes(key) ? { groupId: "", programId: "" } : key === "groupId" ? { programId: "" } : {}) }));
  const submit = async (event) => {
    event.preventDefault();
    if (savingRef.current || uncertain) return;
    const validation = validateSetupDraft(kind, draft, rows, row);
    if (validation) { setError(validation); return; }
    setError("");
    savingRef.current = true;
    setSaving(true);
    try {
      await saveSetupRecord(kind, draft, row, params, authorize);
      onSaved(`${setupNames[kind]} ${row ? "updated" : "added"}`);
    } catch (failure) {
      setUncertain(Boolean(failure.feeSaveUncertain));
      setError(`${requestError(failure)}${failure.feeSaveUncertain ? " The save may be partial or unconfirmed. Close and refresh before trying again." : ""}`);
    } finally { savingRef.current = false; setSaving(false); }
  };
  return <Modal title={`${row ? "Edit" : "Add"} ${setupNames[kind]}`} className={`accountant-fee-editor ${kind === "structures" ? "is-structure" : ""}`} size={["types", "scholarships"].includes(kind) ? "sm" : undefined} onClose={saving ? () => {} : onClose} closeOnOverlay={!saving} footer={<><button type="button" className="cms-btn cms-btn-ghost" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" form="accountant-fee-setup-form" className="cms-btn cms-btn-primary" disabled={saving || uncertain}>{saving ? "Saving..." : `Save ${setupNames[kind]}`}</button></>}>
    {data.warnings?.map((warning) => <FeeNotice key={warning} error>{warning}</FeeNotice>)}
    <form id="accountant-fee-setup-form" onSubmit={submit}><fieldset className="accountant-fee-form-fields" disabled={saving || uncertain}>
      {kind === "structures" ? <StructureFields draft={draft} update={update} lookups={data.lookups} row={data.detail} params={params} /> : <SimpleFields kind={kind} draft={draft} update={update} lookups={data.lookups} />}
    </fieldset></form>
    {error ? <FeeNotice error>{error}</FeeNotice> : null}
  </Modal>;
}

function ViewRecord({ kind, detail, warnings, onClose }) {
  const excluded = new Set(["items", "Items", "createdAt", "CreatedAt", "updatedAt", "UpdatedAt"]);
  const values = Object.entries(detail || {}).filter(([key, value]) => !excluded.has(key) && value != null && typeof value !== "object");
  const items = readFee(detail, "items") || [];
  return <Modal title={`View ${setupNames[kind]}`} className={`accountant-fee-editor ${kind === "structures" ? "is-structure" : ""}`} onClose={onClose} footer={<button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>}>
    {warnings?.map((warning) => <FeeNotice key={warning} error>{warning}</FeeNotice>)}
    <dl className="cms-fee-year-summary">{values.map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</dt><dd>{typeof value === "boolean" ? value ? "Active" : "Inactive" : String(value)}</dd></div>)}</dl>
    {kind === "structures" ? <FeeTable rows={items} columns={[{ label: "Fee Type", value: (item) => feeText(item, "feeTypeName") }, { label: "Rule", value: (item) => feeText(item, "rule") }, { label: "Amount", num: true, value: (item) => feeMoney(readFee(item, "amount")) }]} /> : null}
  </Modal>;
}

export default function AccountantFeeSetupModal({ kind, row, rows, params, viewOnly = false, restoreScope = false, authorize, onSaved, onClose, yearSettings, onDraftTotalChange }) {
  const load = useCallback(async (signal) => {
    const result = await loadSetupEditor(kind, row, params, signal, viewOnly);
    if (restoreScope && (Number(setupId(kind, result.detail)) !== Number(setupId(kind, row)) || (readFee(result.detail, "campusId") != null && params.campusId != null && Number(readFee(result.detail, "campusId")) !== Number(params.campusId)))) throw new Error("This saved record is unavailable in the current scope.");
    return result;
  }, [kind, row, params, viewOnly, restoreScope]);
  const state = useFinancePage(load);
  if (state.loading || state.error) return <Modal title={`${viewOnly ? "View" : row ? "Edit" : "Add"} ${setupNames[kind]}`} onClose={onClose}><FeeLoadState state={state} /></Modal>;
  return viewOnly ? <ViewRecord kind={kind} detail={state.data.detail} warnings={state.data.warnings} onClose={onClose} /> : <SetupEditor kind={kind} row={row} rows={rows} params={params} data={state.data} authorize={authorize} onSaved={onSaved} onClose={onClose} yearSettings={yearSettings} onDraftTotalChange={onDraftTotalChange} />;
}
