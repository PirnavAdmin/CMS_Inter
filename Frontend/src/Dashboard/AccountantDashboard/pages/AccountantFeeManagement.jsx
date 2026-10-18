import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, History, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/common/Ui.jsx";
import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useEffectivePermissions } from "@/features/rolesPermissions/useEffectivePermissions.js";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import { loadScopedLedger, requestError, rowsOf, unwrap, useFinancePage, useFinanceParams } from "../accountantData.js";
import { loadSetupRecords } from "../accountantFeeRequests.js";
import { deleteSetupRecord, feeSetupAccess, requireSetupAction, setupId, setupNames } from "../accountantFeeSetup.js";
import { feeDate, feeMoney, feeStatus, feeText, pageOf, readFee, savedYearSummary } from "../feeViewData.js";
import AccountantFeeOverview from "./AccountantFeeOverview.jsx";
import AccountantFeeSetupModal from "./AccountantFeeSetupModal.jsx";
import { FeeBadge, FeeCard, FeeFilter, FeeLoadState, FeeNotice, FeePagination, FeeSearch, FeeTable, FeeTabs } from "./AccountantFeeUI.jsx";
import "@/components/pages/FeeManagementPage.css";
import "../AccountantFeeManagement.css";

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

function FeeDetails({ id, onClose }) {
  const load = useCallback(async (signal) => unwrap(await apiClient.get(apiEndpoints.fee.getStudentFee(id), { signal })), [id]);
  const state = useFinancePage(load);
  return <FeeCard title="Student Fee Details" action={<button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}><ArrowLeft size={14} /> Back to ledger</button>} bodyClass="cms-fee-stack">
    <FeeLoadState state={state} />{!state.loading && !state.error && state.data ? <>
      <p>{feeText(state.data, "studentName")} / {feeText(state.data, "admissionNumber")}</p>
      <section className="cms-fee-block"><h3>Fee Breakdown</h3><FeeTable rows={rowsOf(readFee(state.data, "components"))} columns={[field("Fee Type", "feeTypeName"), field("Payable", "payableAmount", "money"), field("Paid", "paidAmount", "money"), field("Balance", "balanceAmount", "money"), field("Status", "status", "status")]} /></section>
      <section className="cms-fee-block"><h3>Fee Schedules</h3><FeeTable rows={rowsOf(readFee(state.data, "schedules"))} columns={[field("Schedule", "feeSchedule"), field("Due Date", "dueDate", "date"), field("Amount", "amount", "money"), field("Paid", "paidAmount", "money"), field("Status", "status", "status")]} /></section>
      <Link className="cms-btn cms-btn-ghost" to="/accountant-dashboard/payments"><History size={14} /> Payment history</Link>
    </> : null}
  </FeeCard>;
}

function FeeLedger({ params }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ groupName: "", sectionName: "", paymentPlan: "", status: "" });
  const [pageNumber, setPageNumber] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const load = useCallback((signal) => loadScopedLedger(params, signal), [params]);
  const state = useFinancePage(load);
  const all = state.data || [];
  const filtered = all.filter((row) => Object.entries(filters).every(([key, value]) => !value || String(readFee(row, key)) === value));
  const page = pageOf(filtered, pageNumber, search);
  const changeFilter = (key, value) => { setFilters((previous) => ({ ...previous, [key]: value, ...(key === "groupName" ? { sectionName: "" } : {}) })); setPageNumber(1); };
  if (detailId) return <FeeDetails id={detailId} onClose={() => setDetailId(null)} />;
  const columns = [field("Admission No", "admissionNumber", "name"), field("Student Name", "studentName"), field("Group", "groupName"), field("Section", "sectionName"), field("Payment Plan", "paymentPlan"), field("Total Payable", "totalPayable", "money"), field("Total Paid", "totalPaid", "money"), field("Balance", "balance", "money"), field("Next Due Date", "nextDueDate", "date"),
    { label: "Fee Status", value: (row) => <FeeBadge status={readFee(row, "status")} /> },
    { label: "Actions", value: (row) => <div className="cms-actions"><button type="button" className="cms-action-btn" title="View fee account" aria-label={`View fees for ${feeText(row, "studentName")}`} disabled={!readFee(row, "studentFeeId")} onClick={() => setDetailId(readFee(row, "studentFeeId"))}><Eye size={15} /></button></div> },
  ];
  return <FeeCard title="Student Fee Ledger" action={<span className="cms-badge cms-badge-info">{page.total} of {all.length} students</span>} bodyClass="accountant-fee-ledger-body">
    <div className="cms-fee-toolbar cms-fee-controls cms-card-body"><FeeSearch value={search} label="Search fee ledger" onChange={(value) => { setSearch(value); setPageNumber(1); }} />
      <div className="cms-fee-filter-row">{[["groupName", "Group"], ["sectionName", "Section"], ["paymentPlan", "Payment Plan"], ["status", "Fee Status"]].map(([key, label]) => <FeeFilter key={key} label={label} value={filters[key]} options={[...new Set(all.filter((row) => key !== "sectionName" || !filters.groupName || readFee(row, "groupName") === filters.groupName).map((row) => readFee(row, key)).filter(Boolean))]} onChange={(value) => changeFilter(key, value)} />)}</div>
    </div>
    {state.error ? <FeeLoadState state={state} /> : null}
    <FeeTable rows={page.rows} columns={columns} loading={state.loading} error={state.error} empty="No students match the current search and filters." />
    {!state.loading && !state.error ? <FeePagination page={page} onPage={setPageNumber} /> : null}
  </FeeCard>;
}

function YearConfiguration({ structures }) {
  const [selectedId, setSelectedId] = useState("");
  const selected = structures.find((row) => String(readFee(row, "feeStructureId")) === selectedId) || structures[0];
  const mode = String(readFee(selected, "yearFeeMode") || "").toLowerCase();
  const incrementType = String(readFee(selected, "incrementType") || "").toLowerCase();
  const increment = readFee(selected, "incrementValue");
  const totals = savedYearSummary(selected, structures);
  return <section className="cms-fee-year-config cms-fee-year-page" aria-labelledby="accountant-year-config-title"><h4 id="accountant-year-config-title">Fee Configuration by Year</h4>
    <label className="cms-fee-filter accountant-fee-structure-selector"><span>Fee Structure</span><select value={selected ? String(readFee(selected, "feeStructureId")) : ""} onChange={(event) => setSelectedId(event.target.value)} disabled={!structures.length}>{!structures.length ? <option value="">No fee structures found</option> : structures.map((row) => <option key={readFee(row, "feeStructureId")} value={readFee(row, "feeStructureId")}>{feeText(row, "structureName")} / {feeText(row, "academicYearName")} / {feeText(row, "groupName")}</option>)}</select></label>
    <fieldset className="cms-fee-year-options" disabled><legend className="cms-sr-only">Saved year fee configuration</legend>{[["same", "Same Fees for 1st and 2nd Year"], ["different", "Different Fees for 1st and 2nd Year"]].map(([key, label]) => <label key={key}><input type="radio" name="accountant-saved-year-mode" checked={mode === key} readOnly /><span>{label}</span></label>)}</fieldset>
    {mode === "different" ? <div className="cms-fee-year-increment"><h4>2nd-Year Fee Increment</h4><fieldset className="cms-fee-year-options" disabled><legend className="cms-sr-only">Saved increment type</legend>{[["percentage", "Percentage (%)"], ["fixed", "Fixed Amount"]].map(([key, label]) => <label key={key}><input type="radio" name="accountant-saved-increment-type" checked={incrementType === key} readOnly /><span>{label}</span></label>)}</fieldset><div className="cms-field cms-fee-year-value"><label htmlFor="accountant-saved-increment">Increment Value</label><input id="accountant-saved-increment" value={increment ?? ""} readOnly /></div></div> : null}
    <h4>Fee Summary</h4><dl className="cms-fee-year-summary"><div><dt>1st-Year Total Fee</dt><dd>{feeMoney(totals.first)}</dd></div>{mode === "different" ? <div><dt>Increment Value</dt><dd>{increment == null ? "-" : incrementType === "percentage" ? `${increment}%` : feeMoney(increment)}</dd></div> : null}<div className="cms-fee-year-total"><dt>2nd-Year Total Fee</dt><dd>{feeMoney(totals.second)}</dd></div></dl>
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
  const page = transport ? { rows: all, total, current: pageNumber, pages: Math.max(1, Math.ceil(total / 10)), start: total ? (pageNumber - 1) * 10 + 1 : 0, end: Math.min(pageNumber * 10, total) } : pageOf(all, pageNumber, search);
  const open = (row, viewOnly = false) => { setActionError(""); setNotice(""); setModal({ row, viewOnly }); };
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
    {kind === "structures" && !state.loading && !state.error ? <YearConfiguration structures={all} /> : null}
    <FeeCard title={config.title} action={<div className="cms-fee-head-actions">{!access.create && !access.edit && !access.delete ? <span className="cms-badge cms-badge-info">Read-only</span> : null}<span className="cms-badge cms-badge-info">{transport ? total : all.length} records</span>{access.create ? <button type="button" className="cms-btn cms-btn-primary" onClick={() => open(null)} disabled={state.loading || Boolean(state.error)}><Plus size={14} /> Add {setupNames[kind]}</button> : null}<button type="button" className="cms-btn cms-btn-ghost cms-fee-mini-btn" onClick={state.reload} disabled={state.loading}><RefreshCw size={14} /> Refresh</button></div>} bodyClass="cms-fee-toolbar" className={kind === "structures" ? "" : "cms-fee-types-card"}>
      <FeeSearch value={search} label={`Search ${config.title.toLowerCase()}`} onChange={(value) => { setSearch(value); setPageNumber(1); }} />
      {actionError ? <FeeNotice error>{actionError}</FeeNotice> : notice ? <div className="cms-alert" role="status">{notice}</div> : null}
      {state.error ? <FeeLoadState state={state} /> : null}
      <FeeTable rows={page.rows} columns={columns} className={config.table} loading={state.loading} error={state.error} empty={config.empty} />
      {!state.loading && !state.error ? <FeePagination page={page} onPage={setPageNumber} /> : null}
    </FeeCard>
    {modal && (modal.viewOnly || (modal.row ? access.edit : access.create)) ? <AccountantFeeSetupModal kind={kind} row={modal.row} viewOnly={modal.viewOnly} rows={all} params={params} authorize={authorize} onClose={() => setModal(null)} onSaved={(message) => { setModal(null); setNotice(message); setPageNumber(1); state.reload(); }} /> : null}
    {deleting && access.delete ? <ConfirmDialog title={`Delete ${setupNames[kind]}`} message={`Delete this ${setupNames[kind].toLowerCase()}? This will use the existing backend deletion or deactivation behavior.`} danger loading={deleteBusy} confirmLabel="Delete" onCancel={() => { if (!deleteBusy) setDeleting(null); }} onConfirm={remove} /> : null}
  </div>;
}

export default function AccountantFeeManagement() {
  const params = useFinanceParams();
  const permissions = useEffectivePermissions();
  const [query, setQuery] = useSearchParams();
  const tab = ["overview", "setup", "ledger"].includes(query.get("tab")) ? query.get("tab") : "overview";
  const setup = Object.hasOwn(setupViews, query.get("setup")) ? query.get("setup") : "types";
  const config = setupViews[setup];
  const change = (key, value) => setQuery((previous) => { const next = new URLSearchParams(previous); next.set(key, value); return next; });
  const canView = (screen) => !permissions.error && permissions.canView("fee-management", screen);
  const setupAccess = feeSetupAccess(permissions, setup);
  const allowed = tab === "ledger" ? canView("student-fees") : tab === "setup" ? setupAccess.view : canView("fee-collection");
  const contextKey = JSON.stringify(params);
  return <div className="accountant-fee-page cms-fee-page">
    <header className="cms-page-head"><div className="cms-page-title"><img className="cms-page-title-icon" src={adminIconAssets.feeManagement} alt="" /><div className="cms-page-title-copy"><h1>Fee Management</h1><p>Manage fee structures, scholarships, student balances and collections.</p></div></div><Link className="cms-btn cms-btn-ghost" to="/accountant-dashboard/payments"><History size={15} /> Payment history</Link></header>
    <FeeTabs items={[["overview", "Overview"], ["setup", "Fee Setup"], ["ledger", "Student Fee Ledger"]]} value={tab} onChange={(value) => change("tab", value)} label="Fee Management sections" />
    {tab === "setup" ? <FeeTabs secondary items={Object.entries(setupViews).map(([key, view]) => [key, view.title])} value={setup} onChange={(value) => change("setup", value)} label="Fee Setup sections" /> : null}
    {permissions.loading ? <FeeNotice>Checking finance permissions...</FeeNotice> : !allowed ? <FeeNotice>This section is unavailable with your current permissions. Please contact your administrator to verify finance view access.</FeeNotice>
      : tab === "overview" ? <AccountantFeeOverview key={contextKey} params={params} />
        : tab === "ledger" ? <FeeLedger key={contextKey} params={params} />
          : setup === "hostel" && import.meta.env.VITE_USE_MOCK_DATA === "true" ? <FeeNotice>Hostel fees are unavailable while the hostel mock-data service is enabled. Connect the existing live hostel API to view financial records.</FeeNotice>
            : <SetupRecords key={`${setup}:${contextKey}`} kind={setup} config={config} params={params} access={setupAccess} />}
  </div>;
}
