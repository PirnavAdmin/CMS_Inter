import { useEffect, useState } from "react";
import { Bus, Clock3, MapPin, UserRound, IndianRupee, WalletCards, Receipt, House, CheckCircle2, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/shared/components/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentEmptyState from "../components/StudentEmptyState.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentStatusBadge from "../components/StudentStatusBadge.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";
import { getStudentAllocationProfile, getStudentTransportFeeSummary, getStudentTransportFacilityFee, withTransportFacilityFee } from "../services/studentAcademicService.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const formatPickupTime = (value) => {
  const time = String(value ?? "").trim();
  if (!time) return "—";
  const match = time.match(/^(\d{1,2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  return match ? match[1] : time;
};
const rows = (data) => { const value = unwrap(data); return Array.isArray(value) ? value : value?.items || value?.Items || value?.records || value?.Records || value?.allocations || value?.Allocations || []; };
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
const transportPayments = (payload, student) => rows(payload).filter((row) => belongsToStudent(row, student) && /\btransport\b|\bbus\s*(?:fee|fare)\b/i.test(String(read(row, "feeTypeName", "FeeTypeName", "feeType", "FeeType", "paymentType", "PaymentType") || "")));
export default function StudentTransport() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [allocation, setAllocation] = useState(null);
  const [hostelAllocation, setHostelAllocation] = useState(null);
  const [allocationProfile, setAllocationProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transportFee, setTransportFee] = useState(null);
  const [feeError, setFeeError] = useState("");
  const [noTransportFeeConfirmed, setNoTransportFeeConfirmed] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!student?.studentId) { setLoading(false); setError("Student ID is unavailable."); return; }
      setLoading(true); setError(""); setFeeError(""); setTransportFee(null); setNoTransportFeeConfirmed(false); setPaymentHistory([]); setAllocation(null); setHostelAllocation(null);
      try {
        const [transportResult, hostelResult, profileResult, feeResult, historyResult, facilityResult] = await Promise.allSettled([
          apiClient.get(studentApiEndpoints.transport.studentDetails, { params: { studentId: student.studentId, academicYear: student.academicYearName } }),
          apiClient.get(studentApiEndpoints.hostel.studentAllocations, { params: { studentId: student.studentId, status: "Active" } }),
          getStudentAllocationProfile(student),
          apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(student.studentId)),
          apiClient.get(apiEndpoints.fee.getHistory(student.studentId)),
          getStudentTransportFacilityFee(student.studentId),
        ]);
        if (!active) return;
        const payments = historyResult.status === "fulfilled" ? transportPayments(historyResult.value.data, student) : [];
        setPaymentHistory(payments);
        const feePayload = feeResult.status === "fulfilled" ? unwrap(feeResult.value.data) : null;
        const feeRows = read(feePayload, "components", "Components", "breakdown", "Breakdown", "feeBreakdown", "FeeBreakdown");
        const summary = feeResult.status === "fulfilled" ? getStudentTransportFeeSummary(feeResult.value.data, historyResult.status === "fulfilled" ? historyResult.value.data : null) : null;
        setNoTransportFeeConfirmed(historyResult.status === "fulfilled" && !payments.length && ((summary && !summary.assigned && Array.isArray(feeRows)) || feeResult.reason?.response?.status === 404));
        if (feeResult.status === "fulfilled") {
          setTransportFee(withTransportFacilityFee(getStudentTransportFeeSummary(feeResult.value.data, historyResult.status === "fulfilled" ? historyResult.value.data : null), facilityResult.status === "fulfilled" ? facilityResult.value : null));
          if (historyResult.status === "rejected") setFeeError(`Payment history could not be checked. ${getApiErrorMessage(historyResult.reason)}`);
        } else if (feeResult.reason?.response?.status === 404) {
          setTransportFee(withTransportFacilityFee({ assigned: false, amount: null, paid: null, due: null, status: "Not Assigned" }, facilityResult.status === "fulfilled" ? facilityResult.value : null));
        } else {
          setTransportFee(withTransportFacilityFee({ assigned: false, amount: null, paid: null, due: null, status: "Payment status unavailable" }, facilityResult.status === "fulfilled" ? facilityResult.value : null));
          setFeeError(getApiErrorMessage(feeResult.reason));
        }
        if (historyResult.status === "rejected") setFeeError(`Payment history could not be checked. ${getApiErrorMessage(historyResult.reason)}`);
        if (facilityResult.status === "rejected") setFeeError(`Transport rate could not be loaded. ${getApiErrorMessage(facilityResult.reason)}`);
        const transportData = transportResult.status === "fulfilled" ? unwrap(transportResult.value.data) : null;
        const transportRecords = Array.isArray(transportData) ? transportData : rows(transportData).length ? rows(transportData) : [transportData?.transport ?? transportData?.Transport ?? transportData?.assignment ?? transportData?.Assignment ?? transportData];
        const activeRecords = transportRecords.filter((record) => record && hasTransport(record));
        if (activeRecords.length && !activeRecords.some((record) => belongsToStudent(record, student))) {
          throw new Error("The returned transport allocation does not match your student profile.");
        }
        const transport = transportRecords.find((record) => record && belongsToStudent(record, student) && hasTransport(record));
        const hostel = hostelResult.status === "fulfilled" ? rows(hostelResult.value.data).find((item) => String(read(item, "studentId", "StudentId")) === String(student.studentId) && hasHostel(item)) : null;
        setHostelAllocation(hostel || null);
        setAllocationProfile(profileResult.status === "fulfilled" ? profileResult.value : student);
        setAllocation(transport && hasTransport(transport) ? transport : null);
        if (transportResult.status === "rejected") setError(getApiErrorMessage(transportResult.reason));
        else if (hostelResult.status === "rejected") setError(`Hostel allocation could not be checked. ${getApiErrorMessage(hostelResult.reason)}`);
      } catch (requestError) { if (active) setError(getApiErrorMessage(requestError)); }
      finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student]);
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="form" rows={5}/></div>;
  const profile = allocationProfile || student;
  const hostelOnly = Boolean(hostelAllocation) && !allocation && !error;
  const bothActive = Boolean(hostelAllocation && allocation);
  const profileTransport = read(profile, "transport", "Transport", "transportDetails", "TransportDetails", "transportAllocation", "TransportAllocation", "studentTransport", "StudentTransport") || {};
  const allocationPickupPoint = read(allocation, "pickupPoint", "PickupPoint", "pickupPointDetails", "PickupPointDetails", "assignedPickupPoint", "AssignedPickupPoint", "pickup", "Pickup");
  const profilePickupPoint = read(profileTransport, "pickupPoint", "PickupPoint", "pickupPointDetails", "PickupPointDetails", "assignedPickupPoint", "AssignedPickupPoint", "pickup", "Pickup");
  const pickupTime = formatPickupTime(
    read(allocationPickupPoint, "pickupTime", "PickupTime", "morningPickupTime", "MorningPickupTime", "arrivalTime", "ArrivalTime")
      ?? read(allocation, "pickupTime", "PickupTime", "morningPickupTime", "MorningPickupTime", "arrivalTime", "ArrivalTime", "morningTripTime", "MorningTripTime")
      ?? read(profilePickupPoint, "pickupTime", "PickupTime", "morningPickupTime", "MorningPickupTime", "arrivalTime", "ArrivalTime"),
  );
  const dropTime = formatPickupTime(
    read(allocationPickupPoint, "dropTime", "DropTime", "eveningDropTime", "EveningDropTime")
      ?? read(allocation, "dropTime", "DropTime", "eveningDropTime", "EveningDropTime", "eveningTripTime", "EveningTripTime")
      ?? read(profilePickupPoint, "dropTime", "DropTime", "eveningDropTime", "EveningDropTime"),
  );
  const profileRoute = read(profile, "route", "Route", "busRoute", "BusRoute") || read(profileTransport, "route", "Route", "busRoute", "BusRoute") || {};
  const showTransportDetails = Boolean(allocation);
  const status = read(allocation, "status", "Status", "assignmentStatus", "AssignmentStatus") || "Active";
  const details = [
    ["Bus Type", read(allocation, "busType", "BusType", "vehicleType", "VehicleType") || read(profile, "busType", "BusType", "vehicleType", "VehicleType", "isAC", "IsAC") || "—", Bus],
    ["Route", read(allocation, "routeName", "RouteName", "route", "Route") || read(profile, "routeName", "RouteName", "busRouteName", "BusRouteName") || read(profileRoute, "routeName", "RouteName", "name", "Name", "routeNumber", "RouteNumber") || "—", MapPin],
    ["Pickup Point", read(allocation, "pickupPointName", "PickupPointName", "pickupName", "PickupName") || read(profile, "pickupPointName", "PickupPointName", "pickupName", "PickupName", "pickupPoint", "PickupPoint") || "—", MapPin],
    ["Pickup Time", pickupTime, Clock3],
    ["Drop Time", dropTime, Clock3],
    ["Vehicle", read(allocation, "vehicleNumber", "VehicleNumber", "busNumber", "BusNumber") || "—", Bus],
    ["Driver", read(allocation, "driverName", "DriverName") || "—", UserRound],
    ["Bus Attendant", read(allocation, "attendantName", "AttendantName", "busAttendant", "BusAttendant") || "—", UserRound],
  ];
  return <div className="sp-page"><StudentPageHeader title="Transport" subtitle="Your current college transport allocation."/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
        <StudentCard title="Transport Allocation" action={hostelOnly ? <span className="sp-transport-na">Not Applicable</span> : allocation ? <StudentStatusBadge value={status}/> : null}>
      {bothActive ? <div className="sp-transport-conflict" role="status"><span className="sp-transport-hostel-badge"><CheckCircle2 size={16}/> Hostel Active</span><p>Both hostel and transport allocations are currently active. Please contact the college administration for clarification.</p><Link className="sp-text-link" to="/student-dashboard/hostel">View Hostel Details</Link></div> : null}
      {hostelOnly ? <div className="sp-transport-hostel-state">
        <div className="sp-transport-hostel-icon" aria-hidden="true">🏠</div>
        <h2>Hostel Resident – Transport Not Required</h2>
        <p>You currently have an active hostel allocation. College transport is not required for students residing in the hostel.</p>
        <div className="sp-transport-hostel-badges"><span className="sp-transport-hostel-badge"><CheckCircle2 size={18}/> Hostel Active</span><span className="sp-transport-unassigned-badge"><Bus size={18}/> Transport Not Assigned</span></div>
        <div className="sp-transport-hostel-info"><span className="sp-transport-hostel-info-icon"><House size={28}/></span><div><strong>Your Hostel Details</strong><p>You can view your hostel, room and bed allocation details in the Hostel section.</p></div><Link className="sp-btn" to="/student-dashboard/hostel">View Hostel Details <ChevronRight size={18}/></Link></div>
      </div> : showTransportDetails ? <><div className="sp-service-hero"><span><Bus size={30}/></span><div><h2>{read(allocation, "routeName", "RouteName", "route", "Route") || read(profile, "routeName", "RouteName", "busRouteName", "BusRouteName") || read(profileRoute, "routeName", "RouteName", "name", "Name") || "Assigned Route"}</h2><p>{read(allocation, "routeCode", "RouteCode") || read(profileRoute, "routeCode", "RouteCode") || ""}{read(allocation, "vehicleNumber", "VehicleNumber") ? ` · ${read(allocation, "vehicleNumber", "VehicleNumber")}` : ""}</p></div></div><div className="sp-detail-grid">{details.map(([label, value, Icon]) => <div key={label}><Icon size={17}/><span>{label}</span><strong>{value}</strong></div>)}</div></> : error ? <StudentEmptyState icon={Bus} title="Transport allocation unavailable" text="Your current transport assignment could not be verified. Please refresh or contact the college office."/> : <StudentEmptyState icon={Bus} title="Transport Not Assigned" text="You currently do not have an active college transport allocation."/>}
    </StudentCard>
    <StudentCard title="Transport Fee Summary" action={hostelOnly && noTransportFeeConfirmed ? <span className="sp-transport-na">Not Applicable</span> : <Link className="sp-text-link" to="/student-dashboard/fees">Fee details &amp; receipts</Link>}>
      {hostelOnly && noTransportFeeConfirmed ? <div className="sp-transport-no-fee"><span><Receipt size={38}/></span><div><h3>No Transport Fee Applicable</h3><p>You are currently allocated to the hostel. No transport fee has been assigned to your student fee account.</p></div></div> : <> 
      {hostelOnly && (transportFee?.assigned || paymentHistory.length > 0) ? <p className="sp-muted">Previous transport fees and payments are shown below. These do not indicate a current transport allocation.</p> : null}
      {transportFee?.configured ? <p className="sp-muted">{transportFee.detail} · {transportFee.plan} rate: ₹{transportFee.monthlyFee.toLocaleString("en-IN")}</p> : null}
      {feeError ? <p className="sp-transport-fee-error" role="alert">{feeError}</p> : null}
      {transportFee?.assigned || transportFee?.configured ? <><div className="sp-summary-grid four"><StudentSummaryCard icon={IndianRupee} label={transportFee.assigned ? "Total Transport Fee" : "Monthly Transport Fee"} value={transportFee.amount === null ? "—" : `₹${transportFee.amount.toLocaleString("en-IN")}`}/><StudentSummaryCard icon={WalletCards} label="Paid" tone="blue" value={transportFee.paid === null ? "—" : `₹${transportFee.paid.toLocaleString("en-IN")}`}/><StudentSummaryCard icon={Receipt} label="Due" tone="red" value={transportFee.due === null ? "—" : `₹${transportFee.due.toLocaleString("en-IN")}`}/><div className="sp-transport-fee-payment"><small>Payment Status</small><strong>{transportFee.status?.includes("unavailable") ? "Not available" : transportFee.status}</strong></div></div>{transportFee.status?.includes("unavailable") ? <p className="sp-muted">Transport payment details are unavailable.</p> : null}</> : transportFee ? <StudentEmptyState icon={Receipt} title={noTransportFeeConfirmed ? "Not Assigned" : "Transport Fee Status"} text={noTransportFeeConfirmed ? "No transport fee has been assigned in your student fee account." : "Your current transport fee assignment could not be confirmed. Check fee details and receipts for your recorded payments and balances."}/> : <p className="sp-muted">Transport fee details could not be loaded.</p>}
      {paymentHistory.length > 0 ? <div className="sp-transport-history"><h3>Transport Payment History</h3><div className="sp-table-wrap"><table className="sp-table"><thead><tr><th>Payment Date</th><th>Receipt</th><th>Amount</th><th>Status</th></tr></thead><tbody>{paymentHistory.map((payment, index) => <tr key={read(payment, "feePaymentId", "FeePaymentId", "id", "Id") ?? index}><td>{String(read(payment, "paymentDate", "PaymentDate") || "—").split("T")[0]}</td><td>{read(payment, "receiptNumber", "ReceiptNumber") || "—"}</td><td>{read(payment, "amount", "Amount", "paidAmount", "PaidAmount") ?? "—"}</td><td>{read(payment, "status", "Status") || "—"}</td></tr>)}</tbody></table></div><Link className="sp-text-link" to="/student-dashboard/fees">View fee details &amp; receipts</Link></div> : null}
      </>}
    </StudentCard>
  </div>;
}
