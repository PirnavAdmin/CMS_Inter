import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Bus, Hotel, House, Info, ArrowRight, Receipt, IndianRupee, WalletCards } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { SkeletonPage } from "@/shared/components/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const list = (data) => { const value = unwrap(data); return Array.isArray(value) ? value : value?.items || value?.Items || value?.records || value?.Records || value?.allocations || value?.Allocations || []; };
const isActive = (record, now = Date.now()) => {
  const status = read(record, "status", "Status", "allocationStatus", "AllocationStatus", "assignmentStatus", "AssignmentStatus", "isActive", "IsActive");
  const access = read(record, "hasTransportAccess", "HasTransportAccess");
  if (/^(false|0)$/i.test(String(access))) return false;
  if (!/^(active|true|1|assigned|approved|allocated|running)$/i.test(String(status)) && !(status == null && /^(true|1)$/i.test(String(access)))) return false;
  for (const [keys, end] of [
    [["effectiveFrom", "EffectiveFrom", "startDate", "StartDate", "joiningDate", "JoiningDate", "allocationDate", "AllocationDate"], false],
    [["effectiveTo", "EffectiveTo", "endDate", "EndDate", "vacatedDate", "VacatedDate"], true],
  ]) {
    const value = read(record, ...keys);
    if (value == null) continue;
    const date = String(value);
    const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T${end ? "23:59:59.999" : "00:00:00"}+05:30` : date);
    if (!Number.isFinite(parsed) || (end ? parsed < now : parsed > now)) return false;
  }
  return true;
};
const hasHostel = (record) => Boolean(read(record, "hostelId", "HostelId", "allocationId", "AllocationId", "roomId", "RoomId")) && isActive(record);
const hasTransport = (record) => Boolean(read(record, "assignmentId", "AssignmentId", "studentTransportAssignmentId", "StudentTransportAssignmentId", "routeId", "RouteId", "routeName", "RouteName", "vehicleNumber", "VehicleNumber", "busNumber", "BusNumber")) && isActive(record);
const belongsToStudent = (record, student, requireId = false) => {
  const id = read(record, "studentId", "StudentId");
  const admissionNo = read(record, "admissionNo", "AdmissionNo");
  // The student-details API includes a default admission number in empty
  // responses. A real student ID is the authoritative identity when supplied.
  if (id != null && Number(id) > 0) return String(Number(id)) === String(Number(student.studentId));
  if (admissionNo != null && student.admissionNo && String(admissionNo).trim().toLowerCase() !== String(student.admissionNo).trim().toLowerCase()) return false;
  return !requireId || id != null;
};

const isHostelFee = (row) => /\bhostel\b|\baccommodation\b/i.test(String(read(row, "feeTypeName", "FeeTypeName", "feeType", "FeeType", "name", "Name", "paymentType", "PaymentType") || ""));
const feeTotal = (records, keys) => {
  const values = records.map((row) => read(row, ...keys));
  return values.every((value) => value != null && Number.isFinite(Number(value))) ? values.reduce((sum, value) => sum + Number(value), 0) : null;
};
const money = (value) => value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
const displayDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
};

export default function StudentHostel() {
  const { profile: student, loading: profileLoading, error: profileError, facilityAccess = { loading: true, type: null } } = useStudentProfile() || {};
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feeError, setFeeError] = useState("");
  const [fees, setFees] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!student?.studentId) { setError("Student ID is unavailable."); setLoading(false); return; }
      setLoading(true); setError(""); setFeeError(""); setAllocation(null); setFees(null); setPayments([]);
      try {
        const [hostelResult, feeResult, historyResult, configResult] = await Promise.allSettled([
          apiClient.get(studentApiEndpoints.hostel.studentAllocations, { params: { studentId: student.studentId, status: "Active" } }),
          apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(student.studentId)),
          apiClient.get(apiEndpoints.fee.getHistory(student.studentId)),
          apiClient.get(apiEndpoints.hostel.fees, { skipGlobalLoader: true }),
        ]);
        if (!alive) return;

        let activeAllocation = null;
        if (hostelResult.status === "fulfilled") {
          activeAllocation = list(hostelResult.value.data).find((row) => belongsToStudent(row, student, true) && hasHostel(row)) || null;
        }

        if (!activeAllocation && facilityAccess.hostelAllocation) {
          activeAllocation = facilityAccess.hostelAllocation;
        }

        if (!activeAllocation) {
          const studentHostelBlock = read(student, "hostelBlock", "HostelBlock", "hostelName", "HostelName");
          const studentHostelRoom = read(student, "hostelRoom", "HostelRoom", "roomNumber", "RoomNumber", "roomNo", "RoomNo");
          const studentHostelId = read(student, "hostelId", "HostelId");
          const studentType = String(read(student, "studentType", "StudentType", "residentialType", "ResidentialType") || "").toLowerCase();
          const isResidential = ["residential", "hostel", "hosteller", "true", "2"].includes(studentType);

          if (studentHostelId || studentHostelBlock || studentHostelRoom || isResidential) {
            activeAllocation = {
              hostelId: studentHostelId || 1,
              hostelName: studentHostelBlock || "Hostel",
              hostelBlockName: studentHostelBlock || "Hostel Block",
              roomNumber: studentHostelRoom || "Assigned Room",
              roomTypeName: studentHostelRoom || "Standard Room",
              bedNumber: read(student, "hostelBed", "HostelBed", "bedNumber", "BedNumber") || "—",
              floorLevel: read(student, "floorLevel", "FloorLevel", "floor", "Floor") || "—",
              joiningDate: read(student, "joiningDate", "JoiningDate", "allocationDate", "AllocationDate", "admissionDate", "AdmissionDate") || "",
              status: read(student, "status", "Status", "allocationStatus", "AllocationStatus") || "Active",
            };
          }
        }
        setAllocation(activeAllocation);

        const history = historyResult.status === "fulfilled" ? list(historyResult.value.data).filter((row) => belongsToStudent(row, student) && isHostelFee(row)) : [];
        setPayments(history);

        const feePayload = feeResult.status === "fulfilled" ? unwrap(feeResult.value.data) : null;
        if (feePayload && !belongsToStudent(feePayload, student)) throw new Error("The returned fee details do not match your student profile.");
        const components = read(feePayload, "components", "Components", "breakdown", "Breakdown", "feeBreakdown", "FeeBreakdown");
        let records = Array.isArray(components) ? components.filter((row) => belongsToStudent(row, student) && isHostelFee(row)) : [];

        if (!records.length && configResult.status === "fulfilled" && activeAllocation) {
          const configs = list(configResult.value.data);
          const blockName = String(activeAllocation.hostelBlockName || activeAllocation.hostelName || "").toLowerCase();
          const roomName = String(activeAllocation.roomTypeName || activeAllocation.roomNumber || "").toLowerCase();
          const matched = configs.find((row) => {
            const b = String(read(row, "hostelName", "HostelName", "hostelId", "HostelId") || "").toLowerCase();
            const r = String(read(row, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification") || "").toLowerCase();
            return (b && blockName && (b.includes(blockName) || blockName.includes(b)))
              || (r && roomName && (r.includes(roomName) || roomName.includes(r)));
          });
          if (matched) {
            const amount = Number(read(matched, "hostelFeeAmount", "HostelFeeAmount", "feeAmount", "FeeAmount") || 0);
            const deposit = Number(read(matched, "securityDeposit", "SecurityDeposit") || 0);
            const total = (amount || 0) + (deposit || 0);
            records = [{
              feeTypeName: "Hostel Fee",
              payableAmount: total,
              paidAmount: 0,
              balanceAmount: total,
              status: "Configured Rate",
            }];
          }
        }

        setFees({
          records,
          noFee: records.length === 0 && historyResult.status === "fulfilled" && history.length === 0 && !activeAllocation,
          amount: records.length ? feeTotal(records, ["payableAmount", "PayableAmount", "amount", "Amount", "feeAmount", "FeeAmount"]) : null,
          paid: records.length ? feeTotal(records, ["paidAmount", "PaidAmount", "paid", "Paid"]) : null,
          due: records.length ? feeTotal(records, ["balanceAmount", "BalanceAmount", "dueAmount", "DueAmount", "outstandingBalance", "OutstandingBalance"]) : null,
        });

        if (hostelResult.status === "rejected" && !activeAllocation) setError(`Hostel allocation could not be checked. ${getApiErrorMessage(hostelResult.reason)}`);
        if (historyResult.status === "rejected") setFeeError((current) => `${current ? `${current} ` : ""}Payment history could not be checked. ${getApiErrorMessage(historyResult.reason)}`);
      } catch (requestError) {
        if (alive) setFeeError(getApiErrorMessage(requestError));
      } finally {
        if (alive) setLoading(false);
      }
    };
    if (!profileLoading) load();
    return () => { alive = false; };
  }, [profileLoading, student, facilityAccess.hostelAllocation]);

  if (!profileLoading && !facilityAccess.loading && facilityAccess.type === "transport") {
    return <Navigate to="/student-dashboard/transport" replace />;
  }

  if (profileLoading || loading || facilityAccess.loading) return <div className="sp-page"><SkeletonPage variant="form" rows={5}/></div>;

  if (!allocation && facilityAccess.type === "none") {
    return (
      <div className="sp-page sp-hostel-page">
        <StudentPageHeader title="Hostel" subtitle="View your hostel allocation information."/>
        {profileError || error ? <div className="sp-api-state is-error" role="alert">{profileError || error}</div> : null}
        <StudentCard>
          <StudentEmptyState
            icon={Hotel}
            title="No Hostel or Transport Facility Assigned."
            text="You currently do not have an active hostel or college transport facility assigned. Please contact the college administration if you require accommodation or transport facilities."
          />
        </StudentCard>
      </div>
    );
  }

  const details = [
    ["Hostel Name", read(allocation, "hostelName", "HostelName")],
    ["Hostel Block", read(allocation, "hostelBlockName", "HostelBlockName", "blockName", "BlockName", "hostelBlock", "HostelBlock")],
    ["Room Number", read(allocation, "roomNumber", "RoomNumber", "roomNo", "RoomNo")],
    ["Floor", read(allocation, "floorLevel", "FloorLevel", "floor", "Floor")],
    ["Bed Number", read(allocation, "bedNumber", "BedNumber", "bedNo", "BedNo")],
    ["Room Type", read(allocation, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification")],
    ["Allocation Date", displayDate(read(allocation, "joiningDate", "JoiningDate", "allocationDate", "AllocationDate"))],
    ["Status", read(allocation, "status", "Status", "allocationStatus", "AllocationStatus")],
  ];

  return <div className="sp-page sp-hostel-page">
    <StudentPageHeader title="Hostel" subtitle="View your hostel allocation information."/>
    {profileError || error ? <div className="sp-api-state is-error" role="alert">{profileError || error}</div> : null}
    <StudentCard title="Hostel Allocation" action={allocation ? <span className="sp-transport-hostel-badge">Hostel Active</span> : null}>
      {allocation ? <div className="sp-detail-grid">{details.map(([label, value]) => <div key={label}><Hotel size={17}/><span>{label}</span><strong>{typeof value === "object" ? read(value, "name", "Name", "roomTypeName", "RoomTypeName") || "—" : value ?? "—"}</strong></div>)}</div> : <StudentEmptyState icon={Hotel} title={error || profileError ? "Hostel Allocation Unavailable" : "Hostel Not Assigned"} text={error || profileError ? "Your current allocation could not be verified. Please refresh or contact the college office." : "You currently do not have an active hostel allocation."}/>}
    </StudentCard>
    <StudentCard title="Hostel Fee Summary" action={fees?.noFee ? <span className="sp-hostel-na">Not Applicable</span> : <Link className="sp-text-link" to="/student-dashboard/fees">Fee details &amp; receipts</Link>}>
      {feeError ? <div className="sp-api-state is-error" role="alert">{feeError}</div> : null}
      {fees?.noFee ? <div className="sp-hostel-no-fee"><span><Receipt size={46}/></span><div><h3>No Hostel Fee Applicable</h3><p>No hostel fee has been assigned to your student fee account.</p></div></div> : fees?.records?.length ? <>
        {!allocation ? <p className="sp-muted">Recorded hostel fees remain payable according to the fee account, independently of your current allocation.</p> : null}
        <div className="sp-summary-grid three"><StudentSummaryCard icon={IndianRupee} label="Hostel Fee" value={money(fees.amount)}/><StudentSummaryCard icon={WalletCards} label="Paid" value={money(fees.paid)} tone="blue"/><StudentSummaryCard icon={Receipt} label="Outstanding" value={money(fees.due)} tone="red"/></div>
        <div className="sp-table-wrap"><table className="sp-table"><thead><tr><th>Fee</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{fees.records.map((row, index) => <tr key={index}><td>{read(row, "feeTypeName", "FeeTypeName", "name", "Name") || "Hostel Fee"}</td><td>{money(read(row, "payableAmount", "PayableAmount", "amount", "Amount"))}</td><td>{money(read(row, "paidAmount", "PaidAmount"))}</td><td>{money(read(row, "balanceAmount", "BalanceAmount", "dueAmount", "DueAmount"))}</td><td>{read(row, "status", "Status", "paymentStatus", "PaymentStatus") ?? "—"}</td></tr>)}</tbody></table></div>
      </> : <p className="sp-muted">{payments.length ? "Historical hostel payments are shown below. The current hostel fee balance is unavailable." : "Hostel fee information is unavailable."}</p>}
      {payments.length ? <div className="sp-transport-history"><h3>Hostel Payment History</h3><div className="sp-table-wrap"><table className="sp-table"><thead><tr><th>Payment Date</th><th>Receipt</th><th>Amount</th><th>Status</th></tr></thead><tbody>{payments.map((row, index) => <tr key={index}><td>{displayDate(read(row, "paymentDate", "PaymentDate"))}</td><td>{read(row, "receiptNumber", "ReceiptNumber") || "—"}</td><td>{money(read(row, "amount", "Amount", "paidAmount", "PaidAmount"))}</td><td>{read(row, "status", "Status") || "—"}</td></tr>)}</tbody></table></div><Link className="sp-text-link" to="/student-dashboard/fees">View fee details &amp; receipts</Link></div> : null}
    </StudentCard>
  </div>;
}
