import { useCallback, useEffect, useRef, useState } from "react";
import { Download, WalletCards, X } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonPage } from "@/shared/components/Ui.jsx";
import "@/modules/admin/AdminStudents/StudentManagementPage.css";
import StudentFeeTab from "@/modules/admin/AdminStudents/StudentFeeTab.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import { downloadFeeReceiptPdf } from "@/utils/feeReceiptPdf.js";
import GatewayPaymentPanel from "@/modules/admin/AdminFees/components/GatewayPaymentPanel.jsx";
import "@/modules/admin/AdminFees/FeeManagementPage.css";

const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const money = (value) => value === undefined || value === null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
};

const receiptText = (value) => value == null || value === "" || value === "?" ? "-" : String(value);
const unwrapReceipt = (payload) => {
  let value = payload;
  for (let depth = 0; depth < 5 && value && typeof value === "object"; depth += 1) {
    if (value.success === false || value.Success === false || Number(value.statusCode) >= 400) throw new Error(value.message || value.Message || "Receipt request failed.");
    const nested = value.data ?? value.Data ?? value.receipt ?? value.Receipt;
    if (!nested || nested === value) break;
    value = nested;
  }
  return value;
};

const unwrapFeeDetails = (payload) => {
  let value = payload;
  for (let depth = 0; depth < 4 && value && typeof value === "object"; depth += 1) {
    const nested = value.data ?? value.Data;
    if (!nested || nested === value) break;
    value = nested;
  }
  if (Array.isArray(value)) value = value[0] || {};
  const account = value?.studentFee ?? value?.StudentFee ?? value?.feeAccount ?? value?.FeeAccount
    ?? value?.assignment ?? value?.Assignment ?? value;
  return { ...value, ...(account && typeof account === "object" ? account : {}) };
};

const normalizePaymentAccount = (payload, student) => {
  const row = unwrapFeeDetails(payload);
  const studentFeeId = read(row, "assignmentId", "AssignmentId", "studentFeeAssignmentId", "StudentFeeAssignmentId", "studentFeeId", "StudentFeeId", "feeAccountId", "FeeAccountId");
  const total = Number(read(row, "totalPayable", "TotalPayable", "payableAmount", "PayableAmount", "totalAmount", "TotalAmount", "assignedAmount", "AssignedAmount"));
  const paid = Number(read(row, "totalPaid", "TotalPaid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "collectedAmount", "CollectedAmount") ?? 0);
  const directBalance = read(row, "balance", "Balance", "outstandingBalance", "OutstandingBalance", "balanceAmount", "BalanceAmount", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount");
  const balance = directBalance == null ? (Number.isFinite(total) ? Math.max(total - paid, 0) : null) : Number(directBalance);
  if (!Number.isSafeInteger(Number(studentFeeId)) || Number(studentFeeId) <= 0 || !Number.isFinite(balance)) return null;
  const paymentPlan = read(row, "paymentPlan", "PaymentPlan", "plan", "Plan");
  const rawSchedules = read(row, "installments", "Installments", "schedules", "Schedules", "scheduledFees", "ScheduledFees", "courseSchedules", "CourseSchedules", "feeSchedules", "FeeSchedules", "paymentSchedules", "PaymentSchedules")
    ?? read(paymentPlan, "installments", "Installments", "schedules", "Schedules", "scheduledFees", "ScheduledFees", "courseSchedules", "CourseSchedules", "feeSchedules", "FeeSchedules", "paymentSchedules", "PaymentSchedules");
  const schedules = Array.isArray(rawSchedules) ? rawSchedules
    : Array.isArray(rawSchedules?.$values) ? rawSchedules.$values
      : Array.isArray(rawSchedules?.items) ? rawSchedules.items
        : Array.isArray(rawSchedules?.Items) ? rawSchedules.Items : [];
  const installments = schedules.map((schedule, index) => {
    const id = read(schedule, "feeInstallmentId", "FeeInstallmentId", "installmentId", "InstallmentId", "id", "Id");
    const amount = Number(read(schedule, "amount", "Amount", "installmentAmount", "InstallmentAmount", "payableAmount", "PayableAmount", "dueAmount", "DueAmount"));
    const schedulePaid = Number(read(schedule, "paid", "Paid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid") ?? 0);
    const rawBalance = read(schedule, "balance", "Balance", "balanceAmount", "BalanceAmount", "outstandingBalance", "OutstandingBalance", "pendingAmount", "PendingAmount");
    const scheduleBalance = rawBalance == null ? Math.max((Number.isFinite(amount) ? amount : 0) - schedulePaid, 0) : Number(rawBalance);
    return {
      ...schedule,
      id: id == null ? null : Number(id),
      feeInstallmentId: id == null ? null : Number(id),
      no: Number(read(schedule, "installmentNumber", "InstallmentNumber", "installmentNo", "InstallmentNo", "scheduleNo", "ScheduleNo", "no", "No") || index + 1),
      label: read(schedule, "feeSchedule", "FeeSchedule", "scheduleName", "ScheduleName", "installmentName", "InstallmentName") || `Fee Schedule ${index + 1}`,
      amount: Number.isFinite(amount) ? amount : 0,
      paid: schedulePaid,
      balance: Number.isFinite(scheduleBalance) ? scheduleBalance : 0,
      dueDate: read(schedule, "dueDate", "DueDate", "date", "Date") || "",
      status: read(schedule, "status", "Status") || "Pending",
    };
  }).filter((schedule) => schedule.id && schedule.balance > 0 && !/paid|settled|cancelled/i.test(String(schedule.status)));
  return {
    ...row,
    studentId: Number(read(row, "studentId", "StudentId") ?? student.studentId),
    studentFeeId: Number(studentFeeId),
    assignmentId: Number(studentFeeId),
    studentFeeAssignmentId: Number(studentFeeId),
    studentName: read(row, "studentName", "StudentName") || student.studentName || student.name || "Student",
    admissionNo: read(row, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") || student.admissionNo || "",
    campusId: read(row, "campusId", "CampusId") ?? student.campusId,
    balance,
    installments,
  };
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Reuse the portal's jsPDF/autoTable implementation and the college receipt branding/sections.
async function buildStudentReceiptPdf(receipt, payment, student) {
  const receiptNo = read(receipt, "receiptNumber", "ReceiptNumber", "receiptNo", "ReceiptNo");
  const amount = read(receipt, "amount", "Amount", "paidAmount", "PaidAmount");
  if (String(receiptNo || "") !== payment.receiptNo || amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error("The receipt response does not contain valid details for this payment.");
  const studentId = read(receipt, "studentId", "StudentId");
  const admissionNo = read(receipt, "admissionNumber", "AdmissionNumber", "admissionNo", "AdmissionNo");
  if ((studentId != null && String(studentId) !== String(student.studentId)) || (admissionNo && student.admissionNo && String(admissionNo).trim().toLowerCase() !== String(student.admissionNo).trim().toLowerCase())) throw new Error("The receipt does not belong to your student profile.");
  const paymentId = read(receipt, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId");
  if ((payment.paymentId != null && paymentId != null && String(payment.paymentId) !== String(paymentId)) || (payment.amount != null && Number(payment.amount) !== Number(amount))) throw new Error("Receipt details do not match the selected payment. Refresh payment history and try again.");
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF();
  const olive = [112, 132, 0];
  doc.setFillColor(240, 244, 226); doc.rect(0, 0, 210, 42, "F");
  const logo = await new Promise((resolve) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = collegeLogo;
  });
  if (logo) doc.addImage(logo, "PNG", 14, 7, 42, Math.min(27, 42 * logo.naturalHeight / logo.naturalWidth));
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(32, 40, 26); doc.text(COLLEGE_NAME, 64, 16);
  doc.setFontSize(11); doc.setTextColor(...olive); doc.text("FEE PAYMENT RECEIPT", 64, 25);
  const method = read(receipt, "paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode") ?? payment.mode;
  const type = read(receipt, "feeTypeName", "FeeTypeName", "feeType", "FeeType", "paymentFor", "PaymentFor") || (payment.paymentFor !== "?" && payment.paymentFor !== method ? payment.paymentFor : null);
  const tables = [
    { title: "Receipt Details", rows: [["Receipt Number", receiptNo], ["Payment Date", formatDate(read(receipt, "receiptDate", "ReceiptDate", "paymentDate", "PaymentDate") || payment.date)], ["Payment Status", read(receipt, "paymentStatus", "PaymentStatus", "status", "Status") ?? payment.status]] },
    { title: "Student Information", rows: [["Student Name", read(receipt, "studentName", "StudentName") || student.studentName], ["Admission Number", admissionNo || student.admissionNo], ["Roll Number", read(receipt, "rollNo", "RollNo", "rollNumber", "RollNumber") || student.rollNo], ["Group / Course", read(receipt, "groupName", "GroupName") || student.groupName], ["Section", read(receipt, "sectionName", "SectionName") || student.sectionName]] },
    { title: "Payment Details", rows: [["Fee Type", type], ["Amount Paid (INR)", Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })], ["Payment Mode", method], ["Transaction Reference", read(receipt, "transactionReference", "TransactionReference", "transactionNumber", "TransactionNumber", "reference", "Reference") || payment.reference]] },
  ];
  let y = 49;
  for (const table of tables) {
    if (y > 240) { doc.addPage(); y = 18; }
    doc.setTextColor(...olive); doc.setFontSize(11); doc.text(table.title, 14, y);
    autoTable(doc, { startY: y + 4, margin: { left: 14, right: 14 }, theme: "grid", body: table.rows.map(([label, value]) => [label, receiptText(value)]), styles: { font: "helvetica", fontSize: 10, cellPadding: 3 }, columnStyles: { 0: { cellWidth: 56, fontStyle: "bold", fillColor: [245, 247, 237] } } });
    y = doc.lastAutoTable.finalY + 12;
  }
  if (y > 275) { doc.addPage(); y = 18; }
  doc.setFontSize(9); doc.setTextColor(100, 110, 94); doc.text("This is a computer-generated fee payment receipt.", 14, y);
  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

async function studentReceiptPdf(response, payment, student, depth = 0) {
  const contentType = String(response.headers?.["content-type"] || response.data?.type || "").toLowerCase();
  const blob = response.data instanceof Blob ? response.data : null;
  if (blob && (await blob.slice(0, 5).text()) === "%PDF-") return new Blob([blob], { type: "application/pdf" });
  if (contentType.includes("application/pdf")) throw new Error("The server returned an invalid PDF receipt.");
  let payload = response.data;
  if (blob) {
    try { payload = JSON.parse(await blob.text()); }
    catch { throw new Error("The receipt response is not a valid PDF or receipt data."); }
  }
  const receipt = unwrapReceipt(payload);
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("Receipt details are unavailable.");
  const pdfUrl = read(receipt, "pdfUrl", "PdfUrl", "receiptPdfUrl", "ReceiptPdfUrl", "downloadUrl", "DownloadUrl");
  if (pdfUrl) {
    if (depth >= 1) throw new Error("The receipt download URL did not return a PDF.");
    const appOrigin = window.location.origin;
    const apiOrigin = new URL(apiClient.defaults.baseURL || appOrigin, appOrigin).origin;
    const resolved = new URL(pdfUrl, new URL(apiClient.defaults.baseURL || appOrigin, appOrigin));
    if (![appOrigin, apiOrigin].includes(resolved.origin) || !["http:", "https:"].includes(resolved.protocol)) throw new Error("The receipt PDF URL is not available through the existing authenticated API.");
    const file = await apiClient.get(resolved.href, { responseType: "blob" });
    return studentReceiptPdf(file, payment, student, depth + 1);
  }
  return buildStudentReceiptPdf(receipt, payment, student);
}

export default function StudentFees() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptLoading, setReceiptLoading] = useState("");
  const [paymentAccount, setPaymentAccount] = useState(null);
  const [paymentAccountLoading, setPaymentAccountLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentFooter, setPaymentFooter] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI_QR");
  const [paymentTarget, setPaymentTarget] = useState("full");
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [feeTabVersion, setFeeTabVersion] = useState(0);
  const [historyVersion, setHistoryVersion] = useState(0);
  const receiptRequest = useRef(false);
  const handlePaymentLockChange = useCallback((locked) => {
    setPaymentFooter((current) => current?.locked === locked ? current : { ...current, locked });
  }, []);
  const handlePaymentFooterChange = useCallback((footer) => {
    setPaymentFooter((current) => {
      if (!footer) return current === null ? current : null;
      if (current && current.showDone === footer.showDone && current.onDone === footer.onDone
        && current.disabled === footer.disabled && current.busy === footer.busy) return current;
      return { ...current, ...footer };
    });
  }, []);

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
        paymentId: read(row, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"),
        reference: read(row, "transactionReference", "TransactionReference", "transactionNumber", "TransactionNumber", "reference", "Reference"),
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

  useEffect(() => {
    if (profileLoading || !student?.studentId) return;
    let active = true;
    setPaymentAccountLoading(true);
    apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(student.studentId), { skipGlobalLoader: true })
      .then(({ data }) => {
        if (active) setPaymentAccount(normalizePaymentAccount(data, student));
      })
      .catch(() => { if (active) setPaymentAccount(null); })
      .finally(() => { if (active) setPaymentAccountLoading(false); });
    return () => { active = false; };
  }, [profileLoading, student?.studentId, student?.campusId, historyVersion]);

  useEffect(() => {
    if (!historyVersion || !student?.studentId) return;
    let active = true;
    apiClient.get(apiEndpoints.fee.getHistory(student.studentId), { skipGlobalLoader: true })
      .then(({ data }) => {
        if (!active) return;
        const payload = data?.data ?? data?.Data ?? data;
        const rows = Array.isArray(payload) ? payload : payload?.items ?? payload?.Items ?? payload?.paymentHistory ?? payload?.PaymentHistory ?? payload?.payments ?? payload?.Payments ?? [];
        setHistory(rows.map((row, index) => ({
          id: read(row, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id") ?? index,
          paymentId: read(row, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"),
          reference: read(row, "transactionReference", "TransactionReference", "transactionNumber", "TransactionNumber", "reference", "Reference"),
          receiptNo: read(row, "receiptNumber", "ReceiptNumber", "receiptNo", "ReceiptNo") || "—",
          date: read(row, "paymentDate", "PaymentDate", "transactionDate", "TransactionDate"),
          amount: read(row, "amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"),
          mode: read(row, "paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode") || "—",
          status: read(row, "status", "Status", "paymentStatus", "PaymentStatus") || "—",
          paymentFor: read(row, "feeTypeName", "FeeTypeName", "feeType", "FeeType", "paymentType", "PaymentType") || "—",
        })));
      }).catch(() => {}).finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [historyVersion, student?.studentId]);

  const downloadReceipt = async (payment) => {
    const receiptNo = payment.receiptNo;
    if (!receiptNo || receiptNo === "?" || receiptRequest.current || !student?.studentId) return;
    receiptRequest.current = true; setReceiptLoading(receiptNo); setError("");
    try {
      const response = await apiClient.get(apiEndpoints.fee.receiptByNumber(receiptNo));
      const receiptData = response.data?.data ?? response.data?.Data ?? response.data;
      if (receiptData) {
        downloadFeeReceiptPdf({
          ...receiptData,
          studentName: receiptData.studentName || student?.studentName || student?.name,
          admissionNumber: receiptData.admissionNumber || student?.admissionNo,
          groupName: receiptData.groupName || student?.groupName,
          sectionName: receiptData.sectionName || student?.sectionName,
        });
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setReceiptLoading("");
    }
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
  const availableSchedules = paymentAccount?.installments || [];
  const selectedSchedules = availableSchedules.filter((schedule) => selectedScheduleIds.includes(schedule.id));
  const maximumPaymentAmount = paymentTarget === "full"
    ? Number(paymentAccount?.balance || 0)
    : selectedSchedules.reduce((sum, schedule) => sum + schedule.balance, 0);
  const openPayment = () => {
    const firstSchedule = availableSchedules[0];
    setPaymentMode("UPI_QR");
    if (firstSchedule) {
      setPaymentTarget("schedules");
      setSelectedScheduleIds([firstSchedule.id]);
      setPaymentAmount(String(firstSchedule.balance));
    } else {
      setPaymentTarget("full");
      setSelectedScheduleIds([]);
      setPaymentAmount(String(paymentAccount.balance));
    }
    setPaymentNotice("");
    setPaymentFooter(null);
    setPaymentOpen(true);
  };
  const selectFullBalance = () => {
    setPaymentTarget("full");
    setSelectedScheduleIds([]);
    setPaymentAmount(String(paymentAccount.balance));
  };
  const toggleSchedule = (schedule) => {
    const next = selectedScheduleIds.includes(schedule.id)
      ? selectedScheduleIds.filter((id) => id !== schedule.id)
      : [...selectedScheduleIds, schedule.id];
    if (!next.length) return selectFullBalance();
    setPaymentTarget("schedules");
    setSelectedScheduleIds(next);
    setPaymentAmount(String(availableSchedules.filter((item) => next.includes(item.id)).reduce((sum, item) => sum + item.balance, 0)));
  };

  return <div className="sp-page sp-student-fees-page">
    <StudentPageHeader title="Fees" subtitle="View your applicable fees, payment plan, schedules and receipts."/>
    {profileError ? <div className="sp-api-state is-error">{profileError}</div> : null}
    <div className="sp-student-fee-paybar">
      <div><strong>Outstanding balance</strong><span>{paymentAccount ? money(paymentAccount.balance) : paymentAccountLoading ? "Loading…" : "Check with the finance office"}</span></div>
      <button type="button" className="sp-fee-pay-now" disabled={paymentAccountLoading || !paymentAccount || !(paymentAccount.balance > 0)} onClick={openPayment}><WalletCards size={16}/> Pay Now</button>
    </div>
    {paymentNotice ? <p className="sp-api-state is-success" role="status">{paymentNotice}</p> : null}
    <div className="sp-student-fee-tab"><StudentFeeTab key={`fees-${student.studentId}-${feeTabVersion}`} student={feeStudent} /></div>
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
          if (index === 5) return <button className="sp-icon-action" title="Download receipt PDF" aria-label="Download receipt PDF" disabled={row.receiptNo === "—" || Boolean(receiptLoading)} onClick={() => downloadReceipt(row.receiptNo)}><Download size={16}/></button>;
          return row.paymentFor;
        }}/ >}
    </StudentCard>
    {paymentOpen && paymentAccount ? <div className="sp-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !paymentFooter?.busy) setPaymentOpen(false); }}>
      <section className="sp-modal sp-student-payment-modal" role="dialog" aria-modal="true" aria-labelledby="sp-student-payment-title">
        <header><div><h2 id="sp-student-payment-title">Pay Fee</h2><p>Generate a payment QR and submit your transaction reference for verification.</p></div><button type="button" className="sp-icon-action" aria-label="Close payment" disabled={paymentFooter?.busy} onClick={() => setPaymentOpen(false)}><X size={17}/></button></header>
        <div className="sp-student-payment-body">
        <div className="sp-payment-methods" role="tablist" aria-label="Payment method">
          {[["UPI_QR", "Dynamic UPI QR"], ["RAZORPAY", "Card / NetBanking"], ["BANK_TRANSFER", "Bank Transfer / UTR"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={paymentMode === value} className={paymentMode === value ? "is-selected" : ""} disabled={paymentFooter?.busy || paymentFooter?.locked} onClick={() => setPaymentMode(value)}>{label}</button>)}
        </div>
        <section className="sp-payment-target" aria-label="Fee amount selection">
          <strong>Pay Towards</strong>
          <details className="sp-payment-target-picker">
            <summary>{paymentTarget === "full" ? `Pay full remaining balance - ${formatMoney(paymentAccount.balance)}` : `${selectedSchedules.length} schedule${selectedSchedules.length === 1 ? "" : "s"} selected - ${formatMoney(maximumPaymentAmount)}`}</summary>
            <div className="sp-payment-target-options">
              <label><input type="checkbox" checked={paymentTarget === "full"} disabled={paymentFooter?.locked} onChange={(event) => event.target.checked ? selectFullBalance() : (availableSchedules[0] && toggleSchedule(availableSchedules[0]))}/> <span>Pay full remaining balance - {formatMoney(paymentAccount.balance)}</span></label>
              {availableSchedules.map((schedule) => <label key={schedule.id}><input type="checkbox" checked={paymentTarget !== "full" && selectedScheduleIds.includes(schedule.id)} disabled={paymentFooter?.locked} onChange={() => toggleSchedule(schedule)}/> <span>{schedule.label || `Fee Schedule ${schedule.no}`} - {formatMoney(schedule.balance)}{schedule.dueDate ? ` due ${formatDate(schedule.dueDate)}` : ""}</span></label>)}
              {!availableSchedules.length ? <span className="sp-payment-target-empty">No unpaid fee schedules.</span> : null}
            </div>
          </details>
          <label className="sp-payment-amount">Amount (INR) *<input type="number" min="0.01" max={maximumPaymentAmount} step="0.01" value={paymentAmount} disabled={paymentFooter?.locked} onChange={(event) => setPaymentAmount(event.target.value)}/><small>Maximum for this selection: {formatMoney(maximumPaymentAmount)}</small></label>
        </section>
        <GatewayPaymentPanel key={`student-payment-${paymentAccount.studentFeeId}-${paymentMode}-${paymentTarget}-${selectedScheduleIds.join("-")}`} mode={paymentMode} campusId={paymentAccount.campusId} account={paymentAccount} target={paymentTarget} selectedIds={selectedScheduleIds} amount={Number(paymentAmount)} onLockChange={handlePaymentLockChange} onFooterChange={handlePaymentFooterChange} onPending={() => { setPaymentNotice("Payment details submitted. Your transaction is pending Admin verification."); setHistoryVersion((version) => version + 1); }} onSaved={() => { setPaymentNotice("Payment confirmed successfully."); setFeeTabVersion((version) => version + 1); setHistoryVersion((version) => version + 1); setPaymentOpen(false); }}/>
        </div>
        <footer><button type="button" className="sp-fee-pay-secondary" disabled={paymentFooter?.busy} onClick={() => setPaymentOpen(false)}>Close</button>{paymentFooter?.showDone ? <button type="button" className="sp-fee-pay-now" disabled={paymentFooter.disabled} onClick={paymentFooter.onDone}>Submit UTR</button> : null}</footer>
      </section>
    </div> : null}
  </div>;
}
