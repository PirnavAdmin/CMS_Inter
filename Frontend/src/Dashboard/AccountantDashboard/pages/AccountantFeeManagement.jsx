import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, History, Pencil, Plus, Printer, RefreshCw, Trash2, WalletCards } from "lucide-react";
import { ConfirmDialog, Modal } from "@/components/common/Ui.jsx";
import { PAYMENT_METHODS } from "../../../data/feeManagementData.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useEffectivePermissions } from "@/features/rolesPermissions/useEffectivePermissions.js";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import { loadScopedLedger, requestError, rowsOf, useFinancePage, useFinanceParams } from "../services/accountantService.js";
import { ledgerDetailEndpoint, ledgerPage, loadLedgerDetails } from "../services/accountantService.js";
import { loadSetupRecords } from "../services/accountantService.js";
import { deleteSetupRecord, feeSetupAccess, requireSetupAction, setupId, setupNames, structureDraftPreview } from "../services/accountantService.js";
import { collectStudentPayment, feeCollectionAccess, loadCollectionAccounts, loadCollectionDetails } from "../services/accountantService.js";
import { feeDate, feeMoney, feeStatus, feeText, pageOf, readFee, savedYearSummary } from "../utils/feeViewData.js";
import AccountantFeeOverview from "../components/AccountantFeeOverview.jsx";
import AccountantFeeSetupModal from "../components/AccountantFeeSetupModal.jsx";
import { FeeBadge, FeeCard, FeeFilter, FeeLoadState, FeeNotice, FeePagination, FeeSearch, FeeTable, FeeTabs } from "../components/AccountantUI.jsx";
import "@/components/pages/FeeManagementPage.css";
import "./AccountantFeeManagement.css";

const field = (label, key, type) => ({ label, num: type === "money", value: (row) => {
  const value = readFee(row, key);
  if (type === "money") return feeMoney(value);
  if (type === "date") return feeDate(value);
  if (type === "name") return <strong>{value ?? "-"}</strong>;
  if (type === "status") return <FeeBadge status={feeStatus(row)} />;
  return value ?? "-";
} });

const setupViews = {
  types: { title: "Fee Types", endpoint: apiEndpoints.fee.feeTypes, screen: "fee-structure", table: "cms-fee-config-table cms-fee-types-table", empty: "No fee types found.", columns: [field("Fee Type", "feeTypeName", "name"), field("Category", "category"), field("Status", "isActive", "status")] },
  structures: { title: "Fee Structure", endpoint: apiEndpoints.fee.getStructures, screen: "fee-structure", table: "cms-fee-setup-table cms-fee-structure-table", empty: "No fee structures found.", columns: [
    { label: "Academic Year", value: (row) => <><strong>{feeText(row, "academicYearName")}</strong>{readFee(row, "academicLevelName") ? <span className={`cms-badge accountant-fee-level level-${Number(readFee(row, "academicLevelId")) === 2 ? "second" : "first"}`}>{readFee(row, "academicLevelName")}</span> : null}</> },
    field("Group", "groupName"), field("Program", "programName"),
    { label: "Configured Fee Types", value: (row) => <div className="cms-fee-type-list">{rowsOf(readFee(row, "items")).filter((item) => readFee(item, "isActive") !== false).map((item, index) => <span key={readFee(item, "feeTypeId") ?? index}>{feeText(item, "feeTypeName")}</span>)}</div> },
    field("Total Fee", "totalAmount", "money"),
  ] },
  hostel: { title: "Hostel Fees", endpoint: apiEndpoints.hostel.fees, screen: "hostel-fees", table: "cms-fee-config-table cms-fee-setup-table cms-hostel-fees-table", empty: "No hostel fee configurations found.", columns: [field("Hostel Block", "hostelName", "name"), field("Room Type", "roomTypeName"), field("Fee Frequency", "feeFrequency"), field("Hostel Fee", "hostelFeeAmount", "money"), field("Security Deposit", "securityDeposit", "money"), field("Total Fee", "totalFee", "money"), field("Status", "status", "status")] },
  transport: { title: "Transport Fees", endpoint: apiEndpoints.transport.pickupPoints, screen: "fee-structure", table: "cms-fee-config-table cms-fee-setup-table cms-hostel-fees-table", empty: "No transport fee configurations found.", columns: [field("Route", "routeName", "name"),
    { label: "Pickup Point", value: (row) => <>{feeText(row, "pickupPointName")}{readFee(row, "pickupTime") && readFee(row, "dropTime") ? <small className="accountant-fee-cell-note">{String(readFee(row, "pickupTime")).slice(0, 5)} - {String(readFee(row, "dropTime")).slice(0, 5)}</small> : null}</> },
    { label: "Distance", num: true, value: (row) => readFee(row, "distanceFromStart") == null ? "-" : `${readFee(row, "distanceFromStart")} km` },
    field("Monthly Fare", "monthlyFee", "money"),
    // Display the configured server value only; do not introduce new fare calculations.
    field("Annual Fare", "annualFee", "money"), field("Status", "status", "status")] },
  scholarships: { title: "Scholarships", endpoint: apiEndpoints.fee.scholarships, screen: "fee-structure", table: "cms-fee-setup-table cms-fee-scholarship-table", empty: "No scholarships found.", columns: [field("Scholarship", "scholarshipName", "name"), field("Type", "discountType"),
    { label: "Value", value: (row) => String(readFee(row, "discountType")).toLowerCase() === "percentage" ? readFee(row, "discountValue") == null ? "-" : `${readFee(row, "discountValue")}%` : feeMoney(readFee(row, "discountValue")) },
  ] },
  fine: { title: "Fine", endpoint: apiEndpoints.fee.fineRules, screen: "fee-structure", table: "cms-fee-setup-table cms-fee-fine-table", empty: "No fine rules configured.", columns: [field("Fine Rule Name", "fineRuleName", "name"), field("Applicable Fee", "applicableFeeName"), field("Fine Type", "fineType"),
    { label: "Fine Amount", num: true, value: (row) => String(readFee(row, "fineType")).toLowerCase() === "percentage" ? readFee(row, "fineAmount") == null ? "-" : `${readFee(row, "fineAmount")}%` : feeMoney(readFee(row, "fineAmount")) },
    { label: "Grace Period", value: (row) => readFee(row, "gracePeriod") == null ? "-" : `${readFee(row, "gracePeriod")} days` }, field("Status", "status", "status")] },
};

// Retained for My Attendance, whose presentation is outside this task's scope.
export function AccountantPagination({ page, onPage }) {
  return <nav className="sp-pagination" aria-label="Table pagination">
    <span aria-live="polite">Showing {page.start}-{page.end} of {page.total} records</span>
    <div><button type="button" className="sp-btn" disabled={page.current <= 1} onClick={() => onPage(page.current - 1)}><ChevronLeft size={14} /> Previous</button>
      <strong>Page {page.current} of {page.pages}</strong>
      <button type="button" className="sp-btn" disabled={page.current >= page.pages} onClick={() => onPage(page.current + 1)}>Next <ChevronRight size={14} /></button></div>
  </nav>;
}

function CollectPayment({ account, authorize, onClose, onSaved }) {
  const schedules = rowsOf(readFee(account, "schedules")).filter(item => Number(readFee(item, "balanceAmount")) > 0 && readFee(item, "feeInstallmentId"));
  const firstId = schedules[0] ? Number(readFee(schedules[0], "feeInstallmentId")) : null;
  const today = new Date();
  const [draft, setDraft] = useState({ target: firstId ? "schedules" : "full", feeInstallmentIds: firstId ? [firstId] : [], amount: firstId ? readFee(schedules[0], "balanceAmount") : readFee(account, "outstandingBalance"), paymentDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`, paymentMode: "Cash", discount: "0", fine: "0", transactionReference: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const busy = useRef(false);
  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const selectSchedule = id => setDraft(current => {
    const ids = current.feeInstallmentIds.includes(id) ? current.feeInstallmentIds.filter(value => value !== id) : [...current.feeInstallmentIds, id];
    return { ...current, target: "schedules", feeInstallmentIds: ids, amount: schedules.filter(item => ids.includes(Number(readFee(item, "feeInstallmentId")))).reduce((sum, item) => sum + Number(readFee(item, "balanceAmount")), 0) };
  });
  const submit = async event => {
    event.preventDefault();
    if (busy.current || uncertain) return;
    busy.current = true; setSaving(true); setError("");
    try {
      const saved = await collectStudentPayment(account, draft, authorize);
      onSaved(saved);
    } catch (failure) {
      setUncertain(Boolean(failure.feeSaveUncertain));
      setError(`${failure.code === "ACCOUNTANT_DATA_ERROR" ? failure.message : requestError(failure)}${failure.feeSaveUncertain ? " The payment may have been saved. Close this form and check the refreshed account and history before making another payment. Do not repeat it automatically." : ""}`);
    } finally { busy.current = false; setSaving(false); }
  };
  const close = () => onClose(uncertain);
  return <Modal title="Collect Payment" className="accountant-fee-editor is-structure" onClose={saving ? () => {} : close} closeOnOverlay={!saving} footer={<><button type="button" className="cms-btn cms-btn-ghost" disabled={saving} onClick={close}>Cancel</button><button type="submit" form="accountant-collect-form" className="cms-btn cms-btn-primary" disabled={saving || uncertain || !authorize()}>{saving ? "Saving..." : "Save Payment"}</button></>}>
    <div className="cms-fee-kv"><div><span>Student</span><strong>{feeText(account, "studentName")}</strong></div><div><span>Admission No</span><strong>{feeText(account, "admissionNumber")}</strong></div><div><span>Outstanding Balance</span><strong>{feeMoney(readFee(account, "outstandingBalance"))}</strong></div></div>
    <form id="accountant-collect-form" onSubmit={submit}><fieldset className="accountant-fee-form-fields" disabled={saving || uncertain || !authorize()}>
      <fieldset className="cms-fee-year-options"><legend>Pay Towards</legend><label><input type="radio" name="accountant-payment-target" checked={draft.target === "full"} onChange={() => setDraft(current => ({ ...current, target: "full", feeInstallmentIds: [], amount: readFee(account, "outstandingBalance") }))} /><span>Full remaining balance</span></label>{schedules.length ? <label><input type="radio" name="accountant-payment-target" checked={draft.target === "schedules"} onChange={() => setDraft(current => ({ ...current, target: "schedules", feeInstallmentIds: [firstId], amount: readFee(schedules[0], "balanceAmount") }))} /><span>Selected schedules / partial payment</span></label> : <label><input type="radio" name="accountant-payment-target" checked={draft.target === "partial"} onChange={() => setDraft(current => ({ ...current, target: "partial", feeInstallmentIds: [], amount: "" }))} /><span>Partial account payment</span></label>}</fieldset>
      {draft.target === "schedules" ? <fieldset className="accountant-fee-payment-schedules"><legend>Pending fee schedules</legend>{schedules.map(item => { const id = Number(readFee(item, "feeInstallmentId")); return <label key={id}><input type="checkbox" checked={draft.feeInstallmentIds.includes(id)} onChange={() => selectSchedule(id)} /><span>{feeText(item, "feeSchedule")} · {feeDate(readFee(item, "dueDate"))} · {feeMoney(readFee(item, "balanceAmount"))}</span></label>; })}</fieldset> : null}
      <div className="cms-form-grid cols-3">
        <div className="cms-field"><label htmlFor="accountant-pay-amount">Amount *</label><input id="accountant-pay-amount" type="number" min="0.01" step="0.01" required value={draft.amount ?? ""} readOnly={draft.target === "full"} onChange={event => update("amount", event.target.value)} /></div>
        <div className="cms-field"><label htmlFor="accountant-pay-date">Payment Date *</label><input id="accountant-pay-date" type="date" required value={draft.paymentDate} onChange={event => update("paymentDate", event.target.value)} /></div>
        <div className="cms-field"><label htmlFor="accountant-pay-method">Payment Method *</label><select id="accountant-pay-method" required value={draft.paymentMode} onChange={event => update("paymentMode", event.target.value)}>{PAYMENT_METHODS.map(method => <option key={method}>{method}</option>)}</select></div>
        {[ ["discount", "Discount"], ["fine", "Fine"] ].map(([key, label]) => <div className="cms-field" key={key}><label htmlFor={`accountant-pay-${key}`}>{label}</label><input id={`accountant-pay-${key}`} type="number" min="0" step="0.01" value={draft[key]} onChange={event => update(key, event.target.value)} /></div>)}
        <div className="cms-field"><label htmlFor="accountant-pay-reference">Transaction Reference{draft.paymentMode !== "Cash" ? " *" : ""}</label><input id="accountant-pay-reference" required={draft.paymentMode !== "Cash"} maxLength={100} value={draft.transactionReference} onChange={event => update("transactionReference", event.target.value)} /></div>
        <div className="cms-field full"><label htmlFor="accountant-pay-note">Notes</label><textarea id="accountant-pay-note" maxLength={500} value={draft.note} onChange={event => update("note", event.target.value)} /></div>
      </div><p>Payment total including fine and discount: {feeMoney(Number(draft.amount) + Number(draft.fine) - Number(draft.discount))}</p>
    </fieldset></form>
    {!authorize() ? <FeeNotice error>Verified Fee Management create permission is required. Close this form and refresh your permissions.</FeeNotice> : null}
    {error ? <FeeNotice error>{error}</FeeNotice> : null}
  </Modal>;
}

function PaymentReceipt({ payment, account, onClose }) {
  const receiptRef = useRef(null);
  const frameRef = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => () => { frameRef.current?.remove(); }, []);
  const print = () => {
    setError("");
    try {
      frameRef.current?.remove();
      const frame = document.createElement("iframe"); frame.title = "Fee Payment Receipt";
      Object.assign(frame.style, { position: "fixed", left: "-10000px", width: "794px", height: "1123px", border: "0" });
      document.body.appendChild(frame); frameRef.current = frame;
      const doc = frame.contentDocument;
      if (!doc?.body || !frame.contentWindow || !receiptRef.current) throw new Error("The browser could not prepare this receipt.");
      doc.title = "Fee Payment Receipt";
      const style = doc.createElement("style"); style.textContent = "body{font:14px Arial,sans-serif;color:#111;padding:24px}h2{text-align:center}dl>div{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid #ddd;padding:10px 0}dd{margin:0;font-weight:600} @page{size:A4;margin:15mm}"; doc.head.appendChild(style);
      doc.body.appendChild(doc.importNode(receiptRef.current, true));
      frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
      frame.contentWindow.focus(); frame.contentWindow.print();
    } catch (failure) { frameRef.current?.remove(); setError(failure.message || "Receipt printing failed. Please retry."); }
  };
  return <Modal title="Payment Receipt" className="accountant-fee-editor" onClose={onClose} footer={<><button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button><button type="button" className="cms-btn cms-btn-primary" onClick={print}><Printer size={14} /> Print Receipt</button></>}>
    <div ref={receiptRef} className="accountant-payment-receipt"><h2>Fee Payment Receipt</h2><dl className="cms-fee-year-summary">{[["Receipt Number", feeText(payment, "receiptNumber")], ["Payment ID", feeText(payment, "feePaymentId")], ["Student", feeText(payment, "studentName")], ["Admission Number", feeText(payment, "admissionNumber")], ["Fee Account ID", feeText(payment, "studentFeeId")], ["Group / Section", `${feeText(account, "groupName")} / ${feeText(account, "sectionName")}`], ["Academic Year", feeText(account, "academicYearName")], ["Payment Date", feeDate(readFee(payment, "paymentDate"))], ["Amount Paid", feeMoney(readFee(payment, "amount"))], ["Payment Method", feeText(payment, "paymentMethod")], ["Transaction Reference", feeText(payment, "transactionReference")], ["Status", feeText(payment, "status")], ["Remarks", feeText(payment, "remarks")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
    {!readFee(payment, "receiptNumber") ? <FeeNotice>The payment was confirmed, but no receipt number was returned. Contact your administrator with the payment ID.</FeeNotice> : null}
    <p className="cms-fee-year-helper">Receipt from the confirmed payment response. Historical receipt retrieval requires separate backend access.</p>
    {error ? <FeeNotice error>{error}</FeeNotice> : null}
  </Modal>;
}

function FeeDetails({ row, onClose, collection = false, authorize = () => false, onCollected }) {
  const [collecting, setCollecting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [notice, setNotice] = useState("");
  const load = useCallback((signal) => collection ? loadCollectionDetails(row, signal) : loadLedgerDetails(row, signal), [row, collection]);
  const state = useFinancePage(load);
  return <section className="cms-card cms-fee-account-screen accountant-student-fee-details">
    <header className="cms-card-head cms-fee-account-head">
      <div><h3>{!state.loading && !state.error && state.data ? feeText(state.data, "studentName") : "Student Fee Details"}</h3>
        {!state.loading && !state.error && state.data ? <span>{feeText(state.data, "admissionNumber")} &middot; {feeText(state.data, "groupName")} / {feeText(state.data, "sectionName")}</span> : null}</div>
      <div className="cms-fee-drawer-actions">{collection && authorize() ? <button type="button" className="cms-btn cms-btn-primary" disabled={state.loading || Boolean(state.error) || !state.data || !(Number(readFee(state.data, "outstandingBalance")) > 0) || !Number.isFinite(Number(readFee(state.data, "outstandingBalance")))} onClick={() => setCollecting(true)}><WalletCards size={14} /> Collect Payment</button> : null}<button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}><ArrowLeft size={14} /> Back to {collection ? "collection" : "ledger"}</button></div>
    </header>
    <div className="cms-card-body cms-fee-drawer-body">
    {notice ? <div className="cms-alert" role="status">{notice}</div> : null}
    {collection && !authorize() ? <FeeNotice>Fee collection requires verified Fee Management create permission. This account is view-only.</FeeNotice> : null}
    <FeeLoadState state={state} />{!state.loading && !state.error && state.data ? <>
      <section className="cms-fee-block"><h3>Student Information</h3><div className="cms-fee-kv">
        {[["Name", "studentName"], ["Admission Number", "admissionNumber"], ["Roll Number", "rollNumber"], ["Group", "groupName"], ["Section", "sectionName"], ["Academic Level", "academicLevelName"], ["Academic Year", "academicYearName"]].map(([label, key]) => <div key={key}><span>{label}</span><strong>{feeText(state.data, key)}</strong></div>)}
        <div><span>Admission Date</span><strong>{feeDate(readFee(state.data, "admissionDate"))}</strong></div>
      </div></section>
      <section className="cms-fee-block"><h3>Fee Summary</h3><div className="cms-fee-kv">
        {[["Original Fee", "originalFee"], ["Concession", "concession"], ["Scheduled Fees", "scheduledFees"], ["Total Payable", "totalPayable"], ["Total Paid", "totalPaid"], ["Outstanding Balance", "outstandingBalance"]].map(([label, key]) => <div key={key}><span>{label}</span><strong>{feeMoney(readFee(state.data, key))}</strong></div>)}
        <div><span>Payment Plan</span><strong>{feeText(state.data, "paymentPlan")}</strong></div><div><span>Fee Status</span><strong><FeeBadge status={readFee(state.data, "feeStatus")} /></strong></div>
      </div></section>
      <section className="cms-fee-block"><h3>Applicable Fee Breakdown</h3><div className="cms-table-wrap"><table className="cms-table cms-fee-breakdown-table">
        <colgroup><col className="cms-fee-breakdown-type-col" /><col className="cms-fee-breakdown-money-col" /><col className="cms-fee-breakdown-concession-col" /><col className="cms-fee-breakdown-money-col" /><col className="cms-fee-breakdown-money-col" /></colgroup>
        <thead><tr><th>Fee Type</th><th className="num">Amount</th><th>Concession / Scheme</th><th className="num">Discount</th><th className="num">Payable</th></tr></thead>
        <tbody>{rowsOf(readFee(state.data, "breakdown")).length ? rowsOf(readFee(state.data, "breakdown")).map((item, index) => <tr key={index}><td><strong>{feeText(item, "feeType")}</strong></td><td className="num">{feeMoney(readFee(item, "amount"))}</td><td>{feeText(item, "concessionScheme")}</td><td className="num">{feeMoney(readFee(item, "discount"))}</td><td className="num"><strong>{feeMoney(readFee(item, "payable"))}</strong></td></tr>) : <tr><td colSpan={5} className="cms-fee-empty-row">No records available.</td></tr>}</tbody>
      </table></div></section>
      <section className="cms-fee-block"><h3>Fee Schedule</h3><FeeTable rows={rowsOf(readFee(state.data, "schedules"))} columns={[field("Fee Schedule", "feeSchedule"), field("Due Date", "dueDate", "date"), field("Amount", "amount", "money"), field("Paid", "paidAmount", "money"), field("Balance", "balanceAmount", "money"), field("Status", "status", "status")]} /></section>
      <div className="cms-fee-drawer-actions"><Link className="cms-btn cms-btn-ghost" to="/accountant-dashboard/payments?tab=fees"><History size={14} /> Payment history</Link></div>
    </> : null}
    </div>
    {collecting && state.data ? <CollectPayment account={state.data} authorize={authorize} onClose={needsRefresh => { setCollecting(false); if (needsRefresh) { state.reload(); onCollected?.(); } }} onSaved={saved => { setReceipt({ payment: saved, account: state.data }); setCollecting(false); setNotice(`Payment recorded. Receipt: ${readFee(saved, "receiptNumber") || "number unavailable"}.`); state.reload(); onCollected?.(); window.dispatchEvent(new Event("accountant-fees-updated")); }} /> : null}
    {receipt ? <PaymentReceipt {...receipt} onClose={() => setReceipt(null)} /> : null}
  </section>;
}

function FeeLedger({ params, collection = false, authorize }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ groupName: "", sectionName: "", paymentPlan: "", status: "" });
  const [pageNumber, setPageNumber] = useState(1);
  const [detailRow, setDetailRow] = useState(null);
  const load = useCallback((signal) => collection ? loadCollectionAccounts(params, signal) : loadScopedLedger(params, signal), [params, collection]);
  const state = useFinancePage(load);
  const all = state.data || [];
  const page = ledgerPage(all, pageNumber, search, filters);
  const changeFilter = (key, value) => { setFilters((previous) => ({ ...previous, [key]: value, ...(key === "groupName" ? { sectionName: "" } : {}) })); setPageNumber(1); };
  if (detailRow) return <FeeDetails key={ledgerDetailEndpoint(detailRow)} row={detailRow} collection={collection} authorize={authorize} onCollected={state.reload} onClose={() => setDetailRow(null)} />;
  const columns = [field("Admission No", "admissionNumber", "name"), field("Student Name", "studentName"), field("Group", "groupName"), field("Section", "sectionName"), field("Payment Plan", "paymentPlan"), field("Total Payable", "totalPayable", "money"), field("Total Paid", "totalPaid", "money"), field("Balance", "balance", "money"), field("Next Due Date", "nextDueDate", "date"),
    { label: "Fee Status", value: (row) => <FeeBadge status={readFee(row, "status")} /> },
    { label: "Actions", value: (row) => {
      let valid = true;
      try { ledgerDetailEndpoint(row); } catch { valid = false; }
      return <div className="cms-actions"><button type="button" className="cms-action-btn" title={valid ? "View fee account" : "No valid student or fee record ID"} aria-label={`View fees for ${feeText(row, "studentName")}`} disabled={!valid} onClick={() => setDetailRow(row)}><Eye size={15} /></button></div>;
    } },
  ];
  return <FeeCard title={collection ? "Fee Collection" : "Student Fee Ledger"} action={<span className="cms-badge cms-badge-info">{page.total} of {all.length} accounts</span>} bodyClass="accountant-fee-ledger-body">
    {collection && !authorize() ? <FeeNotice>Collection is view-only until Fee Management create permission is verified.</FeeNotice> : null}
    <div className="cms-fee-toolbar cms-fee-controls cms-card-body"><FeeSearch value={search} label="Search fee ledger" onChange={(value) => { setSearch(value); setPageNumber(1); }} />
      <div className="cms-fee-filter-row">{[["groupName", "Group"], ["sectionName", "Section"], ["paymentPlan", "Payment Plan"], ["status", "Fee Status"]].map(([key, label]) => <FeeFilter key={key} label={label} value={filters[key]} options={[...new Set(all.filter((row) => key !== "sectionName" || !filters.groupName || readFee(row, "groupName") === filters.groupName).map((row) => readFee(row, key)).filter(Boolean))]} onChange={(value) => changeFilter(key, value)} />)}</div>
    </div>
    {state.error ? <FeeLoadState state={state} /> : null}
    <FeeTable rows={page.rows} columns={columns} loading={state.loading} error={state.error} empty="No students match the current search and filters." />
    {!state.loading && !state.error ? <FeePagination page={page} onPage={setPageNumber} numbered /> : null}
  </FeeCard>;
}

function YearConfiguration({ structures, selectedId, onSelect, settings, onChange, canCreate, firstYearTotal, isAdding }) {
  const selected = structures.find((row) => String(readFee(row, "feeStructureId")) === selectedId);
  const mode = selected ? String(readFee(selected, "yearFeeMode") || "").toLowerCase() : settings.yearFeeMode;
  const incrementType = selected ? String(readFee(selected, "incrementType") || "").toLowerCase() : settings.incrementType;
  const increment = selected ? readFee(selected, "incrementValue") : settings.incrementValue;
  const totals = selected ? savedYearSummary(selected, structures) : structureDraftPreview({ ...settings, items: [{ isActive: true, amount: firstYearTotal }] });
  const editable = canCreate && !selected && !isAdding;
  const invalid = mode === "different" && (increment !== "" && (!Number.isFinite(Number(increment)) || Number(increment) < 0) || !selected && !Number.isFinite(totals.second));
  return <section className="cms-fee-year-config cms-fee-year-page" aria-labelledby="accountant-year-config-title"><h4 id="accountant-year-config-title">Fee Configuration by Year</h4>
    <label className="cms-fee-filter accountant-fee-structure-selector"><span>Fee Structure</span><select value={selected ? selectedId : ""} onChange={(event) => onSelect(event.target.value)} disabled={isAdding}><option value="">New fee structure</option>{structures.map((row) => <option key={readFee(row, "feeStructureId")} value={readFee(row, "feeStructureId")}>{feeText(row, "structureName")} / {feeText(row, "academicYearName")} / {feeText(row, "groupName")}</option>)}</select></label>
    <p className="cms-fee-year-helper">{selected ? "Saved configuration. Year mode and increments are set when a structure is created; existing fee amounts can be changed using Edit." : !canCreate ? "Creating a fee structure requires Fee Management create permission." : "Choose the year configuration before adding a fee structure. The server generates the paired year structures."}</p>
    <fieldset className="cms-fee-year-options" disabled={!editable}><legend className="cms-sr-only">Year fee configuration</legend>{[["same", "Same Fees for 1st and 2nd Year"], ["different", "Different Fees for 1st and 2nd Year"]].map(([key, label]) => <label key={key}><input type="radio" name="accountant-year-mode" checked={mode === key} onChange={() => onChange({ ...settings, yearFeeMode: key })} /><span>{label}</span></label>)}</fieldset>
    {mode === "different" ? <div className="cms-fee-year-increment"><h4>2nd-Year Fee Increment</h4><fieldset className="cms-fee-year-options" disabled={!editable}><legend className="cms-sr-only">Increment type</legend>{[["percentage", "Percentage (%)"], ["fixed", "Fixed Amount"]].map(([key, label]) => <label key={key}><input type="radio" name="accountant-increment-type" checked={incrementType === key} onChange={() => onChange({ ...settings, incrementType: key, incrementValue: "" })} /><span>{label}</span></label>)}</fieldset><div className="cms-field cms-fee-year-value"><label htmlFor="accountant-year-increment">{incrementType === "percentage" ? "Increment Percentage (%)" : "Increment Amount"}</label><input id="accountant-year-increment" type="number" min="0" step="0.01" value={increment ?? ""} disabled={!editable} onChange={(event) => onChange({ ...settings, incrementValue: event.target.value })} aria-invalid={invalid} />{invalid ? <span className="cms-error" role="alert">Enter a valid, non-negative increment value.</span> : null}</div></div> : null}
    <h4>Fee Summary</h4><p className="cms-fee-year-helper">{selected ? "Saved fee structure totals." : isAdding ? "Current unsaved Add Fee Structure draft." : "No active fee structure draft."}</p><dl className="cms-fee-year-summary" aria-live="polite"><div><dt>1st-Year Total Fee</dt><dd>{feeMoney(totals.first)}</dd></div>{mode === "different" ? <div><dt>Increment Value</dt><dd>{invalid || increment == null ? "-" : incrementType === "percentage" ? `${increment}%` : feeMoney(increment)}</dd></div> : null}<div className="cms-fee-year-total"><dt>2nd-Year Total Fee</dt><dd>{invalid ? "-" : feeMoney(totals.second)}</dd></div></dl>
  </section>;
}

function SetupRecords({ kind, config, params, access }) {
  const [search, setSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [yearSettings, setYearSettings] = useState({ yearFeeMode: "same", incrementType: "percentage", incrementValue: "" });
  const [selectedStructureId, setSelectedStructureId] = useState("");
  const [draftTotal, setDraftTotal] = useState(0);
  const accessRef = useRef(access);
  const deleteRef = useRef(false);
  accessRef.current = access;
  useEffect(() => () => { accessRef.current = { ...accessRef.current, view: false, create: false, edit: false, delete: false }; }, []);
  const authorize = useCallback((action, method, endpoint) => requireSetupAction(accessRef.current, action, method, endpoint), []);
  const transport = kind === "transport";
  const serverSearch = transport ? search : "";
  const serverPage = transport ? pageNumber : 1;
  const load = useCallback((signal) => loadSetupRecords(kind, config.endpoint, params, signal, { page: serverPage, search: serverSearch }), [kind, config, params, serverPage, serverSearch]);
  const state = useFinancePage(load);
  const all = state.data?.rows || [];
  const total = state.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 5));
  useEffect(() => { if (transport && !state.loading && !state.error && pageNumber > totalPages) setPageNumber(totalPages); }, [transport, state.loading, state.error, pageNumber, totalPages]);
  const page = transport ? { rows: all, total, current: pageNumber, pages: totalPages, start: total && all.length ? (pageNumber - 1) * 5 + 1 : 0, end: Math.min((pageNumber - 1) * 5 + all.length, total) } : pageOf(all, pageNumber, search, "", 5);
  const currentPage = page.current;
  useEffect(() => { if (!transport && !state.loading && !state.error && currentPage !== pageNumber) setPageNumber(currentPage); }, [transport, state.loading, state.error, currentPage, pageNumber]);
  const closeModal = () => { setModal(null); setDraftTotal(0); };
  const open = (row, viewOnly = false) => {
    setActionError(""); setNotice("");
    if (kind === "structures" && !row && yearSettings.yearFeeMode === "different" && (yearSettings.incrementValue === "" || !Number.isFinite(Number(yearSettings.incrementValue)) || Number(yearSettings.incrementValue) < 0)) {
      setActionError("Enter a valid, non-negative increment value in Fee Configuration by Year before adding a structure.");
      return;
    }
    if (kind === "structures" && !row) setSelectedStructureId("");
    setDraftTotal(0); setModal({ row, viewOnly });
  };
  const columns = [...config.columns, { label: "Actions", value: (row) => <div className="cms-actions">
    <button type="button" className="cms-action-btn" title={`View ${setupNames[kind]}`} aria-label={`View ${setupNames[kind]}`} disabled={!setupId(kind, row)} onClick={() => open(row, true)}><Eye size={15} /></button>
    {access.edit ? <button type="button" className="cms-action-btn" title={`Edit ${setupNames[kind]}`} aria-label={`Edit ${setupNames[kind]}`} disabled={!setupId(kind, row)} onClick={() => open(row)}><Pencil size={15} /></button> : null}
    {access.delete ? <button type="button" className="cms-action-btn delete" title={`Delete ${setupNames[kind]}`} aria-label={`Delete ${setupNames[kind]}`} disabled={!setupId(kind, row) || deleteBusy} onClick={() => { setActionError(""); setDeleting(row); }}><Trash2 size={15} /></button> : null}
  </div> }];
  const remove = async () => {
    if (deleteRef.current || !deleting) return;
    deleteRef.current = true;
    setDeleteBusy(true);
    setActionError("");
    try {
      await deleteSetupRecord(kind, deleting, authorize);
      setNotice(`${setupNames[kind]} deleted`);
      setPageNumber(1);
      state.reload();
    } catch (error) { setActionError(requestError(error)); }
    finally { deleteRef.current = false; setDeleteBusy(false); setDeleting(null); }
  };
  return <div className="cms-fee-stack">
    {kind === "structures" && !state.loading && !state.error ? <YearConfiguration structures={all} selectedId={selectedStructureId} onSelect={setSelectedStructureId} settings={yearSettings} onChange={setYearSettings} canCreate={access.create} firstYearTotal={draftTotal} isAdding={Boolean(modal && !modal.row && !modal.viewOnly)} /> : null}
    <FeeCard title={config.title} action={<div className="cms-fee-head-actions">{!access.create && !access.edit && !access.delete ? <span className="cms-badge cms-badge-info">Read-only</span> : null}<span className="cms-badge cms-badge-info">{transport ? total : all.length} records</span>{access.create ? <button type="button" className="cms-btn cms-btn-primary" onClick={() => open(null)} disabled={state.loading || Boolean(state.error)}><Plus size={14} /> Add {setupNames[kind]}</button> : null}<button type="button" className="cms-btn cms-btn-ghost cms-fee-mini-btn" onClick={state.reload} disabled={state.loading}><RefreshCw size={14} /> Refresh</button></div>} bodyClass="cms-fee-toolbar" className={kind === "structures" ? "" : "cms-fee-types-card"}>
      <FeeSearch value={search} label={`Search ${config.title.toLowerCase()}`} onChange={(value) => { setSearch(value); setPageNumber(1); }} />
      {actionError ? <FeeNotice error>{actionError}</FeeNotice> : notice ? <div className="cms-alert" role="status">{notice}</div> : null}
      {state.error ? <FeeLoadState state={state} /> : null}
      <FeeTable rows={page.rows} columns={columns} className={config.table} loading={state.loading} error={state.error} empty={config.empty} />
      {!state.loading && !state.error ? <FeePagination page={page} onPage={setPageNumber} numbered /> : null}
    </FeeCard>
    {modal && (modal.viewOnly || (modal.row ? access.edit : access.create)) ? <AccountantFeeSetupModal kind={kind} row={modal.row} viewOnly={modal.viewOnly} rows={all} params={params} authorize={authorize} yearSettings={yearSettings} onDraftTotalChange={kind === "structures" && !modal.row ? setDraftTotal : undefined} onClose={closeModal} onSaved={(message) => { closeModal(); setNotice(message); setPageNumber(1); state.reload(); }} /> : null}
    {deleting && access.delete ? <ConfirmDialog title={`Delete ${setupNames[kind]}`} message={`Delete this ${setupNames[kind].toLowerCase()}? This will use the existing backend deletion or deactivation behavior.`} danger loading={deleteBusy} confirmLabel="Delete" onCancel={() => { if (!deleteBusy) setDeleting(null); }} onConfirm={remove} /> : null}
  </div>;
}

export default function AccountantFeeManagement() {
  const params = useFinanceParams();
  const permissions = useEffectivePermissions();
  const collectionAccess = feeCollectionAccess(permissions);
  const collectionAccessRef = useRef(collectionAccess);
  collectionAccessRef.current = collectionAccess;
  useEffect(() => { collectionAccessRef.current = collectionAccess; return () => { collectionAccessRef.current = false; }; }, [collectionAccess]);
  const authorizeCollection = useCallback(() => collectionAccessRef.current, []);
  const [query, setQuery] = useSearchParams();
  const tab = ["overview", "setup", "ledger", "collection"].includes(query.get("tab")) ? query.get("tab") : "overview";
  const setup = Object.hasOwn(setupViews, query.get("setup")) ? query.get("setup") : "types";
  const config = setupViews[setup];
  const change = (key, value) => setQuery((previous) => { const next = new URLSearchParams(previous); next.set(key, value); return next; });
  const canView = (screen) => !permissions.error && (permissions.canView("fee-management", screen) || permissions.canView("fee-management") || permissions.isAccountant || permissions.isSuperOrAdmin);
  const setupAccess = feeSetupAccess(permissions, setup);
  const allowed = tab === "ledger" ? canView("student-fees") : tab === "setup" ? setupAccess.view : canView("fee-collection");
  const contextKey = JSON.stringify(params);
  return <div className="accountant-fee-page cms-fee-page">
    <header className="cms-page-head"><div className="cms-page-title"><img className="cms-page-title-icon" src={adminIconAssets.feeManagement} alt="" /><div className="cms-page-title-copy"><h1>Fee Management</h1><p>Manage fee structures, scholarships, student balances and collections.</p></div></div><Link className="cms-btn cms-btn-ghost" to="/accountant-dashboard/payments"><History size={15} /> Payment history</Link></header>
    <FeeTabs items={[["overview", "Overview"], ["setup", "Fee Setup"], ["ledger", "Student Fee Ledger"], ["collection", "Fee Collection"]]} value={tab} onChange={(value) => change("tab", value)} label="Fee Management sections" />
    {tab === "setup" ? <FeeTabs secondary items={Object.entries(setupViews).map(([key, view]) => [key, view.title])} value={setup} onChange={(value) => change("setup", value)} label="Fee Setup sections" /> : null}
    {permissions.loading ? <FeeNotice>Checking finance permissions...</FeeNotice> : !allowed ? <FeeNotice>This section is unavailable with your current permissions. Please contact your administrator to verify finance view access.</FeeNotice>
      : tab === "overview" ? <AccountantFeeOverview key={contextKey} params={params} />
        : tab === "ledger" ? <FeeLedger key={contextKey} params={params} />
          : tab === "collection" ? <FeeLedger key={`collection:${contextKey}`} params={params} collection authorize={authorizeCollection} />
          : setup === "hostel" && import.meta.env.VITE_USE_MOCK_DATA === "true" ? <FeeNotice>Hostel fees are unavailable while the hostel mock-data service is enabled. Connect the existing live hostel API to view financial records.</FeeNotice>
            : <SetupRecords key={`${setup}:${contextKey}`} kind={setup} config={config} params={params} access={setupAccess} />}
  </div>;
}
