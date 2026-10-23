import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import "@/components/pages/StudentManagementPage.css";
import StudentFeeTab from "@/components/pages/StudentFeeTab.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";

const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const money = (value) => value === undefined || value === null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

export default function StudentFees() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptLoading, setReceiptLoading] = useState("");

  useEffect(() => {
    if (profileLoading || !student?.studentId) return;
    let active = true;
    setHistoryLoading(true); setHistory([]); setError("");
    apiClient.get(apiEndpoints.fee.getHistory(student.studentId)).then(({ data }) => {
      if (!active) return;
      const payload = data?.data ?? data?.Data ?? data;
      const rows = Array.isArray(payload) ? payload : payload?.items ?? payload?.Items ?? payload?.paymentHistory ?? payload?.PaymentHistory ?? payload?.payments ?? payload?.Payments ?? [];
      setHistory(rows.map((row, index) => ({
        id: read(row, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id") ?? index,
        receiptNo: read(row, "receiptNumber", "ReceiptNumber", "receiptNo", "ReceiptNo") || "—",
        date: read(row, "paymentDate", "PaymentDate", "transactionDate", "TransactionDate"),
        amount: read(row, "amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"),
        mode: read(row, "paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode") || "—",
        status: read(row, "status", "Status", "paymentStatus", "PaymentStatus") || "—",
        paymentFor: read(row, "feeTypeName", "FeeTypeName", "feeType", "FeeType", "paymentType", "PaymentType") || "—",
      })));
    }).catch((requestError) => { if (active) setError(getApiErrorMessage(requestError)); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [profileLoading, student?.studentId]);

  const downloadReceipt = async (receiptNo) => {
    if (!receiptNo || receiptNo === "—" || receiptLoading) return;
    setReceiptLoading(receiptNo);
    try {
      const response = await apiClient.get(apiEndpoints.fee.receiptByNumber(receiptNo), { responseType: "blob" });
      const contentType = response.headers?.["content-type"] || "application/octet-stream";
      const blob = response.data instanceof Blob ? response.data : new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${receiptNo}.${contentType.includes("pdf") ? "pdf" : "json"}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setReceiptLoading(""); }
  };

  if (profileLoading) return <div className="sp-page"><SkeletonPage variant="table" columns={7} rows={5}/></div>;
  if (!student?.studentId) return <div className="sp-page"><StudentPageHeader title="Fees"/><div className="sp-api-state is-error">{profileError || "Student ID is unavailable."}</div></div>;

  // Adapt the logged-in profile to the existing read-only fee tab's display props.
  const feeStudent = {
    ...student,
    name: student.studentName,
    academicYear: student.academicYearName,
    level: student.academicLevelName,
    group: student.groupName,
    programme: student.programName,
    section: student.sectionName,
  };

  return <div className="sp-page sp-student-fees-page">
    <StudentPageHeader title="Fees" subtitle="View your applicable fees, payment plan, schedules and receipts."/>
    {profileError ? <div className="sp-api-state is-error">{profileError}</div> : null}
    <div className="sp-student-fee-tab"><FacilitySettlementDetails key={`settlement-${student.studentId}`} studentId={student.studentId} /><StudentFeeTab key={`fees-${student.studentId}`} student={feeStudent}/></div>
    <StudentCard title="Payment History">
      {error ? <p className="sp-api-state is-error" role="alert">{error}</p> : null}
      {historyLoading ? <SkeletonPage variant="table" columns={7} rows={3}/> : <StudentDataTable
        columns={["Receipt No", "Payment Date", "Amount", "Payment Mode", "Status", "Action", "Payment For"]}
        rows={history}
        empty={error ? "Payment history could not be loaded." : "No payment history available."}
        renderCell={(value, row, column, index) => {
          if (index === 0) return row.receiptNo;
          if (index === 1) return formatDate(row.date);
          if (index === 2) return money(row.amount);
          if (index === 3) return row.mode;
          if (index === 4) return <span className="sp-badge">{row.status}</span>;
          if (index === 5) return <button className="sp-icon-action" title="Download receipt" aria-label="Download receipt" disabled={row.receiptNo === "—" || Boolean(receiptLoading)} onClick={() => downloadReceipt(row.receiptNo)}><Download size={16}/></button>;
          return row.paymentFor;
        }}/ >}
    </StudentCard>
  </div>;
}


function FacilitySettlementDetails({ studentId }) {
  const marker = useRef(null);
  const [target, setTarget] = useState(null);
  useEffect(() => {
    const scope = marker.current?.parentElement;
    if (!scope) return;
    const slot = document.createElement('div');
    slot.className = 'facility-settlement-slot';
    const place = () => {
      const panel = scope.querySelector('.student-profile-fee');
      if (!panel) return;
      const blocks = [...panel.querySelectorAll(':scope > .cms-fee-block')];
      const facilities = blocks.filter((block) => block.querySelector('h3')?.textContent === 'Applicable Facility Fees');
      facilities.forEach((block) => block.classList.add('settlement-facility-fees'));
      const lastFacility = facilities.at(-1);
      if (lastFacility) {
        if (lastFacility.nextElementSibling !== slot) lastFacility.after(slot);
      } else if (panel.firstElementChild !== slot) panel.prepend(slot);
      setTarget((current) => current === slot ? current : slot);
    };
    const observer = new MutationObserver(place);
    observer.observe(scope, { childList: true, subtree: true });
    place();
    return () => { observer.disconnect(); slot.remove(); };
  }, []);
  const [state, setState] = useState({ loading: true, records: [], error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!studentId) return;
    let active = true;
    setState({ loading: true, records: [], error: "" });
    apiClient.get('/api/v1/facility-transition/history/' + encodeURIComponent(studentId), { headers: { 'Content-Type': 'application/json' }, skipErrorLog: true, validateStatus: (status) => (status >= 200 && status < 300) || status === 404 }).then(({ data, status }) => {
      if (status === 404) throw new Error('Facility transition history is unavailable on the connected server (404). The backend history endpoint must be deployed and reachable.');
      let payload = data;
      for (let i = 0; i < 4 && !Array.isArray(payload); i++) {
        if (payload?.success === false || payload?.status === false) throw new Error(payload.message || 'Could not load settlement history.');
        const next = payload?.data ?? payload?.Data ?? payload?.items ?? payload?.Items ?? payload?.records;
        if (next == null) break;
        payload = next;
      }
      if (!Array.isArray(payload)) throw new Error('Settlement history response is unavailable.');
      if (payload.some((row) => row.studentId != null && String(row.studentId) !== String(studentId))) throw new Error('Settlement history does not match this student.');
      const records = [...payload].sort((a,b) => (Date.parse(b.transitionDate) || 0) - (Date.parse(a.transitionDate) || 0));
      if (active) setState({ loading: false, records, error: '' });
    }).catch((error) => { if (active) setState({ loading: false, records: [], error: getApiErrorMessage(error) || 'Could not load settlement history.' }); });
    return () => { active = false; };
  }, [studentId, retry]);
  const number = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const amount = (value) => number(value) == null ? 'Not provided' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value));
  const date = (value) => { const parsed = value ? new Date(value) : null; return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Date not provided'; };
  const duration = (value) => number(value) == null ? 'Not provided' : value + ' Months';
  const fields = (items) => <dl className="facility-settlement-values">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
  const card = <section className="cms-fee-block facility-settlement-preview" aria-label="Facility transition and settlement">
    <h3>Facility Transition &amp; Settlement Details</h3>
    {state.loading ? <p role="status">Loading settlement history...</p> : state.error ? <div role="alert"><p>{state.error}</p><button type="button" className="cms-btn cms-btn-ghost" onClick={() => setRetry((value) => value + 1)}>Retry</button></div> : !state.records.length ? <p>No facility transition history available.</p> : state.records.map((r, index) => {
      const original = number(r.originalFacilityFee ?? r.originalAnnualFee);
      const fromFee = number(r.proratedFromFee), toFee = number(r.proratedToFee), credit = number(r.excessCreditTransferred);
      const due = toFee != null && credit != null ? Math.max(0, toFee - credit) : null;
      const remainingCredit = toFee != null && credit != null ? Math.max(0, credit - toFee) : null;
      const waived = number(r.waivedAmount);
      const selfTransport = /^self[ -]?transport$/i.test(String(r.toFacility || '').trim());
      return <article key={r.transitionId ?? index}>
        <p className="facility-settlement-status">Switched from <strong>{r.fromFacility || 'Not provided'}</strong> to <strong>{r.toFacility || 'Not provided'}</strong> on {date(r.transitionDate)}.</p>
        <div className="facility-settlement-columns"><section><h4>Previous Facility: {r.fromFacility || 'Not provided'}</h4>{fields([['Duration Used', duration(r.monthsUsedFromFacility)], ['Actual Prorated Fee', amount(fromFee)], ...(original != null ? [['Original Facility Fee', amount(original)], ...(fromFee != null ? [['Saved Amount', amount(original - fromFee)]] : [])] : []), ...(number(r.excessAdvancePaid) != null ? [['Excess Advance Paid', amount(r.excessAdvancePaid)]] : [])])}</section>
        <section><h4>Current Facility: {r.toFacility || 'Not provided'}</h4>{fields([['Remaining Duration', duration(r.monthsUsedToFacility)], ['Prorated Facility Fee', amount(toFee)], ['Advance Credit Transferred', amount(credit)], ['Net Facility Fee Due', amount(due)], ...(remainingCredit > 0 ? [['Remaining Credit', amount(remainingCredit)]] : [])])}<p className="facility-settlement-note">Net due covers the recorded facility fee and transferred credit only. Other account charges are shown in the fee summary.</p></section></div>
        {selfTransport && r.waiverConfirmed === true && waived != null && number(r.monthsUsedFromFacility) != null && number(r.monthsUsedToFacility) != null && r.transitionDate && <p className="facility-settlement-status">Your {r.fromFacility} facility was discontinued on {date(r.transitionDate)}. You used the facility for {r.monthsUsedFromFacility} months. The remaining {r.monthsUsedToFacility} months' applicable facility fee of {amount(waived)} has been waived from your total fee.</p>}
        <h4>Settlement Summary</h4>{fields([['Previous Total Fee', amount(r.previousTotalFee)], ['New Total Fee', amount(r.newTotalFee)], ['Previous Balance', amount(r.previousBalance)], ['New Balance', amount(r.newBalance)]])}
        {original == null && <p className="facility-settlement-note">Original facility fee and savings are not available in this settlement record.</p>}
        {r.remarks && <p className="facility-settlement-note"><strong>Remarks:</strong> {r.remarks}</p>}
      </article>;
    })}
  </section>;
  return <><span ref={marker} hidden />{target ? createPortal(card, target) : card}</>;
}
