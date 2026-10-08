import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
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
    <div className="sp-student-fee-tab"><StudentFeeTab key={student.studentId} student={feeStudent}/></div>
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
