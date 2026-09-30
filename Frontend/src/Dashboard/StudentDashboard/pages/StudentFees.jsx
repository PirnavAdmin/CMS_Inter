import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Download, IndianRupee, Receipt, WalletCards } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";

const read = (item, ...keys) => keys
  .map((key) => item?.[key])
  .find((value) => value !== undefined && value !== null && value !== "");

const unwrap = (payload) => payload?.data ?? payload?.Data ?? payload;

const getObject = (payload) => {
  let value = unwrap(payload);
  if (value?.data && !Array.isArray(value.data)) value = value.data;
  if (value?.Data && !Array.isArray(value.Data)) value = value.Data;
  return value && !Array.isArray(value) ? value : {};
};

const getCollection = (payload) => {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const collectionFrom = (payload, keys = []) => {
  const direct = getCollection(payload);
  if (direct.length) return direct;
  const object = getObject(payload);
  for (const key of keys) {
    const rows = getCollection(object[key]);
    if (rows.length) return rows;
  }
  return [];
};

const numberValue = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const firstNumber = (item, ...keys) => {
  for (const key of keys) {
    const value = numberValue(item, key);
    if (value !== undefined) return value;
  }
  return undefined;
};

const money = (value) => `\u20B9${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (value) => {
  const status = String(value || "").toLowerCase();
  if (status.includes("paid") || status.includes("success")) return "is-success";
  if (status.includes("due") || status.includes("pending") || status.includes("partial")) return "is-warning";
  if (status.includes("fail") || status.includes("cancel")) return "is-danger";
  return "";
};

const normalizeItems = (rows) => rows.map((item, index) => {
  const amount = firstNumber(item, "amount", "Amount", "totalAmount", "TotalAmount", "payableAmount", "PayableAmount", "originalAmount", "OriginalAmount", "feeAmount", "FeeAmount") || 0;
  const paid = firstNumber(item, "paid", "Paid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "totalPaid", "TotalPaid") || 0;
  const due = firstNumber(item, "balance", "Balance", "remainingBalance", "RemainingBalance", "outstandingAmount", "OutstandingAmount", "outstandingBalance", "OutstandingBalance", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount") ?? Math.max(amount - paid, 0);
  return {
    id: read(item, "id", "Id", "feeTypeId", "FeeTypeId", "feeInstallmentId", "FeeInstallmentId") || index,
    name: read(item, "feeTypeName", "FeeTypeName", "feeType", "FeeType", "name", "Name", "installmentName", "InstallmentName", "feeName", "FeeName") || `Fee ${index + 1}`,
    amount,
    paid,
    due,
  };
}).filter((item) => item.amount || item.paid || item.due || item.name);

const normalizeHistory = (rows) => rows.map((item, index) => ({
  id: read(item, "id", "Id", "feePaymentId", "FeePaymentId", "paymentId", "PaymentId") || index,
  receiptNo: read(item, "receiptNumber", "ReceiptNumber", "receiptNo", "ReceiptNo", "receipt", "Receipt") || "-",
  date: read(item, "paymentDate", "PaymentDate", "transactionDate", "TransactionDate", "date", "Date", "createdAt", "CreatedAt"),
  amount: firstNumber(item, "amount", "Amount", "paymentAmount", "PaymentAmount", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid") || 0,
  mode: read(item, "paymentMode", "PaymentMode", "mode", "Mode", "paymentMethod", "PaymentMethod") || "-",
  status: read(item, "status", "Status", "paymentStatus", "PaymentStatus", "collectionStatus", "CollectionStatus") || "Paid",
}));

const normalizeFeeResponse = (detailsPayload, ledgerPayload, historyPayload) => {
  const details = getObject(detailsPayload);
  const nestedAccount = details.studentFee || details.feeAccount || details.account || {};
  const account = { ...nestedAccount, ...details };
  const ledgerRows = collectionFrom(ledgerPayload, ["ledger", "feeLedger", "accounts"]);
  const breakdownRows = collectionFrom(detailsPayload, [
    "feeBreakdown", "breakdown", "feeItems", "items", "components", "schedules", "Schedules", "installments", "Installments", "feeSchedules", "FeeSchedules",
  ]);
  const breakdown = normalizeItems(breakdownRows.length ? breakdownRows : ledgerRows);
  const historyRows = collectionFrom(historyPayload, ["transactions", "Transactions", "paymentHistory", "PaymentHistory", "payments", "Payments", "history", "History"]);
  const fallbackHistoryRows = collectionFrom(detailsPayload, ["transactions", "Transactions", "paymentHistory", "PaymentHistory", "payments", "Payments"]);
  const history = normalizeHistory(historyRows.length ? historyRows : fallbackHistoryRows);
  const breakdownTotal = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const breakdownPaid = breakdown.reduce((sum, item) => sum + item.paid, 0);
  const breakdownDue = breakdown.reduce((sum, item) => sum + item.due, 0);
  const total = firstNumber(account, "totalAmount", "TotalAmount", "totalFee", "TotalFee", "totalPayable", "TotalPayable", "payableAmount", "PayableAmount", "grossAmount", "GrossAmount") ?? breakdownTotal;
  const paid = firstNumber(account, "totalPaid", "TotalPaid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "collectedAmount", "CollectedAmount") ?? breakdownPaid;
  const due = firstNumber(account, "balance", "Balance", "outstanding", "Outstanding", "outstandingAmount", "OutstandingAmount", "outstandingBalance", "OutstandingBalance", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount") ?? Math.max(total - paid, breakdownDue);
  const unpaidSchedules = breakdownRows
    .map((item) => ({ date: read(item, "dueDate", "DueDate", "scheduledDate", "ScheduledDate", "installmentDate", "InstallmentDate"), due: firstNumber(item, "balance", "Balance", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount") || 0 }))
    .filter((item) => item.date && item.due > 0)
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));

  return {
    total,
    paid,
    due,
    nextDueDate: read(account, "nextDueDate", "NextDueDate", "nextPaymentDate", "NextPaymentDate") || unpaidSchedules[0]?.date || "-",
    paymentPlan: read(account, "paymentPlan", "PaymentPlan", "planName", "PlanName", "feePlan", "FeePlan") || "-",
    breakdown,
    history,
  };
};

export default function StudentFees() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receiptLoading, setReceiptLoading] = useState("");

  const downloadReceipt = async (receiptNo) => {
    if (!receiptNo || receiptNo === "-" || receiptLoading) return;
    setReceiptLoading(receiptNo);
    try {
      const response = await apiClient.get(apiEndpoints.fee.receiptByNumber(receiptNo), { responseType: "blob" });
      const contentType = response.headers?.["content-type"] || "application/octet-stream";
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${receiptNo}.${contentType.includes("pdf") ? "pdf" : "json"}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setReceiptLoading("");
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!student?.studentId) {
        if (active) {
          setLoading(false);
          setError(profileError || "Student ID is unavailable.");
        }
        return;
      }

      setLoading(true);
      setError("");
      const studentId = student.studentId;
      const results = await Promise.allSettled([
        apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(studentId)),
        apiClient.get(apiEndpoints.fee.studentFeeLedger(studentId)),
        apiClient.get(apiEndpoints.fee.getHistory(studentId)),
      ]);
      if (!active) return;

      const [detailsResult, ledgerResult, historyResult] = results;
      const successful = results.some((result) => result.status === "fulfilled");
      if (successful) {
        setFeeData(normalizeFeeResponse(
          detailsResult.status === "fulfilled" ? detailsResult.value.data : null,
          ledgerResult.status === "fulfilled" ? ledgerResult.value.data : null,
          historyResult.status === "fulfilled" ? historyResult.value.data : null,
        ));
      }
      const errors = results
        .filter((result) => result.status === "rejected")
        .map((result) => getApiErrorMessage(result.reason))
        .filter(Boolean);
      if (!successful) setError(errors[0] || "Unable to load fee details.");
      else if (errors.length) setError(`Some fee details could not be loaded. ${errors[0]}`);
      setLoading(false);
    };

    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileError, profileLoading, student?.studentId]);

  const summary = feeData || { total: 0, paid: 0, due: 0, nextDueDate: "-", paymentPlan: "-", breakdown: [], history: [] };
  const hasData = useMemo(() => Boolean(feeData && (feeData.total || feeData.paid || feeData.due || feeData.breakdown.length || feeData.history.length)), [feeData]);

  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={4} rows={6}/></div>;

  return <div className="sp-page">
    <StudentPageHeader title="Fees" subtitle="View your fee assignment, balance and payment receipts."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    {!hasData && !error ? <StudentEmptyState icon={Receipt} title="No fee details available" text="No fee information has been returned for your student account."/> : null}
    {hasData ? <>
      <div className="sp-summary-grid four">
        <StudentSummaryCard icon={IndianRupee} label="Total Fee" value={money(summary.total)}/>
        <StudentSummaryCard icon={WalletCards} label="Paid" value={money(summary.paid)} tone="blue"/>
        <StudentSummaryCard icon={Receipt} label="Due" value={money(summary.due)} tone="red"/>
        <StudentSummaryCard icon={CalendarClock} label="Next Due Date" value={formatDate(summary.nextDueDate)} tone="orange"/>
      </div>
      <StudentCard title="Fee Breakdown" subtitle={`Payment Plan: ${summary.paymentPlan}`}>
        <StudentDataTable
          columns={["Fee Type", "Amount", "Paid", "Due"]}
          rows={summary.breakdown}
          empty="No fee breakdown available."
          renderCell={(value, row, column, columnIndex) => columnIndex ? money(value) : row.name}
        />
      </StudentCard>
      <StudentCard title="Payment History">
        <StudentDataTable
          columns={["Receipt No", "Payment Date", "Amount", "Payment Mode", "Status", "Action"]}
          rows={summary.history}
          empty="No payment history available."
          statusColumns={[4]}
          renderCell={(value, row, column, index) => {
            if (index === 1) return formatDate(row.date);
            if (index === 2) return money(row.amount);
            if (index === 4) return <span className={`sp-badge ${statusClass(row.status)}`}>{value}</span>;
            if (index === 5) return <button className="sp-icon-action" title="Download receipt" aria-label="Download receipt" disabled={row.receiptNo === "-" || Boolean(receiptLoading)} onClick={() => downloadReceipt(row.receiptNo)}><Download size={16}/></button>;
            return value;
          }}
        />
      </StudentCard>
    </> : null}
  </div>;
}
