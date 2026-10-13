import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarCheck, Camera, CheckCircle2, Edit3, Eye, EyeOff, KeyRound, Lock, RefreshCw, Save, Search, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import * as reportApi from "@/api/reportApi.js";
import * as payrollApi from "@/api/payrollApi.js";
import { attendanceService } from "@/api/attendanceService.js";
import { getAuthUser } from "@/features/authStorage.js";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { adminIconAssets } from "@/components/layout/DashboardLayout.jsx";
import StudentCard from "@/Dashboard/StudentDashboard/components/StudentCard.jsx";
import StudentDataTable from "@/Dashboard/StudentDashboard/components/StudentDataTable.jsx";
import StudentPageHeader from "@/Dashboard/StudentDashboard/components/StudentPageHeader.jsx";
import StudentSummaryCard from "@/Dashboard/StudentDashboard/components/StudentSummaryCard.jsx";
import "@/components/pages/AdminProfilePage.css";

export const getRows = (payload) => {
  const value = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(value)) return value;
  for (const key of ["items", "Items", "records", "Records", "results", "Results", "$values", "rows", "Rows", "payments", "Payments", "dues", "Dues"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

export const getNumber = (item, keys) => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
};

export const getText = (item, keys, fallback = "-") => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return fallback;
};

export const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const normalizePayment = (item = {}) => ({
  id: getText(item, ["feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"], Math.random()),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  type: getText(item, ["paymentType", "PaymentType", "feeTypeName", "FeeTypeName", "type", "Type"], "Fee payment"),
  amount: getNumber(item, ["amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"]) || 0,
  date: getText(item, ["paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt"], ""),
  method: getText(item, ["paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method"]),
  reference: getText(item, ["referenceNumber", "ReferenceNumber", "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber"]),
  status: getText(item, ["status", "Status", "paymentStatus", "PaymentStatus"], "Paid"),
});

export const normalizeDue = (item = {}) => ({
  id: getText(item, ["feeInstallmentId", "FeeInstallmentId", "studentFeeId", "StudentFeeId", "id", "Id"], Math.random()),
  studentName: getText(item, ["studentName", "StudentName", "name", "Name"]),
  admissionNo: getText(item, ["admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"]),
  amount: getNumber(item, ["balance", "Balance", "outstandingAmount", "OutstandingAmount", "pendingAmount", "PendingAmount", "dueAmount", "DueAmount", "amount", "Amount"]) || 0,
  dueDate: getText(item, ["dueDate", "DueDate", "nextDue", "NextDue"], ""),
  status: getText(item, ["status", "Status", "feeStatus", "FeeStatus"], "Due"),
});

export const normalizePayroll = (item = {}) => ({
  id: getText(item, ["payslipId", "PayslipId", "salaryAssignmentId", "SalaryAssignmentId", "id", "Id"], Math.random()),
  staffName: getText(item, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]),
  month: getText(item, ["monthName", "MonthName", "payrollMonth", "PayrollMonth", "month", "Month"]),
  amount: getNumber(item, ["netSalary", "NetSalary", "netPay", "NetPay", "amount", "Amount", "salary", "Salary"]) || 0,
  status: getText(item, ["status", "Status", "paymentStatus", "PaymentStatus"], "Pending"),
});

function useFinancePage(loader, dependencies) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: "" });
    loader().then((data) => { if (active) setState({ data, loading: false, error: "" }); }).catch((error) => {
      if (active) setState({ data: null, loading: false, error: getApiErrorMessage(error, "Unable to load finance data.") });
    });
    return () => { active = false; };
  }, [...dependencies, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload };
}

function PageState({ loading, error, onRetry }) {
  if (loading) return <div className="sp-api-state">Loading finance data...</div>;
  if (error) return <div className="sp-api-state is-error"><AlertCircle size={15} /> {error} {onRetry ? <button type="button" className="sp-btn" onClick={onRetry}><RefreshCw size={14} /> Retry</button> : null}</div>;
  return null;
}

function useCampusParams() {
  const { selectedCampusId } = useCampusContext();
  return useMemo(() => selectedCampusId ? { campusId: Number(selectedCampusId) || selectedCampusId } : {}, [selectedCampusId]);
}

export function AccountantFees() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    const [ledger, due, dashboard] = await Promise.all([
      apiClient.get(apiEndpoints.fee.ledger, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.due, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.dashboard, { params: campusParams }),
    ]);
    return { ledger: getRows(ledger.data), due: getRows(due.data), dashboard: dashboard.data };
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const rows = (state.data?.ledger || state.data?.due || []).map(normalizeDue).filter((row) => row.amount > 0);
  return <>
    <StudentPageHeader title="Fee Management" subtitle="Review student ledgers, outstanding balances, installments, and collection status." action={<Link className="sp-btn" to="payments">Payment history</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <StudentCard title="Student Fee Ledger" subtitle={`${rows.length} outstanding records`}>
      <div className="sp-toolbar"><div className="sp-search"><Search size={15} /><input aria-label="Search fee ledger" placeholder="Search by student or admission number" onChange={(event) => { const term = event.target.value.toLowerCase(); event.currentTarget.closest(".sp-card").querySelectorAll("tbody tr").forEach((row) => { row.hidden = term && !row.textContent.toLowerCase().includes(term); }); }} /></div></div>
      <StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date", "Status"]} statusColumns={[4]} rows={rows.map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate), Status: row.status }))} empty="No outstanding fee records available." />
    </StudentCard> : null}
  </>;
}

export function AccountantPayments() {
  const campusParams = useCampusParams();
  const [search, setSearch] = useState("");
  const load = useCallback(async () => {
    const [collection, payments] = await Promise.allSettled([
      apiClient.get(apiEndpoints.fee.collection, { params: campusParams }),
      apiClient.get(apiEndpoints.fee.payments, { params: campusParams }),
    ]);
    const rows = [
      ...(collection.status === "fulfilled" ? getRows(collection.value.data) : []),
      ...(payments.status === "fulfilled" ? getRows(payments.value.data) : []),
    ];
    if (!rows.length && collection.status === "rejected" && payments.status === "rejected") throw collection.reason;
    return rows.map(normalizePayment).filter((row, index, list) => list.findIndex((item) => String(item.id) === String(row.id)) === index).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const rows = (state.data || []).filter((row) => !search || `${row.studentName} ${row.admissionNo} ${row.reference}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <StudentPageHeader title="Payment History" subtitle="Review fee transactions, references, payment methods, and status." action={<Link className="sp-btn" to="fees">Fee ledger</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <StudentCard title="Fee Transactions" subtitle={`${rows.length} transactions`}>
      <div className="sp-toolbar"><div className="sp-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student, admission number, or reference" /></div></div>
      <StudentDataTable columns={["Student", "Admission No", "Type", "Amount", "Date", "Method", "Reference", "Status"]} statusColumns={[7]} rows={rows.map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Type: row.type, Amount: formatMoney(row.amount), Date: formatDate(row.date), Method: row.method, Reference: row.reference, Status: row.status }))} empty="No payment transactions available." />
    </StudentCard> : null}
  </>;
}

export function AccountantPayroll() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      payrollApi.getPayrollSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), ...campusParams }),
      payrollApi.getPayslips(campusParams),
      payrollApi.getSalaryAssignments(campusParams),
    ]);
    if (results.every((result) => result.status === "rejected")) throw results[0].reason;
    return {
      summary: results[0].status === "fulfilled" ? results[0].value : {},
      payslips: results[1].status === "fulfilled" ? getRows(results[1].value).map(normalizePayroll) : [],
      assignments: results[2].status === "fulfilled" ? getRows(results[2].value) : [],
    };
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const summary = state.data?.summary || {};
  const total = getNumber(summary, ["totalNetSalary", "TotalNetSalary", "totalPayroll", "TotalPayroll", "netSalary", "NetSalary"]) ?? (state.data?.payslips || []).reduce((sum, row) => sum + row.amount, 0);
  return <>
    <StudentPageHeader title="Payroll" subtitle="Financial payroll visibility for salary amounts, payslips, and processing status." action={<Link className="sp-btn" to="attendance-impact"><CalendarCheck size={15} /> Attendance impact</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(total)} note="Current payroll summary" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payslips" value={state.data?.payslips?.length || 0} note="Available records" tone="blue" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Processed" value={getNumber(summary, ["processedCount", "ProcessedCount"]) ?? "-"} note="From payroll API" tone="purple" />
        <StudentSummaryCard icon={adminIconAssets.attendanceImpact} label="Pending" value={getNumber(summary, ["pendingCount", "PendingCount"]) ?? "-"} note="From payroll API" tone="orange" />
      </section>
      <StudentCard title="Payroll Records" subtitle="Read-only payroll information">
        <StudentDataTable columns={["Staff Member", "Month", "Net Amount", "Status"]} statusColumns={[3]} rows={(state.data?.payslips || []).map((row) => ({ "Staff Member": row.staffName, Month: row.month, "Net Amount": formatMoney(row.amount), Status: row.status }))} empty="No payroll records available." />
      </StudentCard>
    </> : null}
  </>;
}

export function AccountantAttendanceImpact() {
  const campusParams = useCampusParams();
  const load = useCallback(() => attendanceService.getStaffMonthlyReport({ ...campusParams, month: new Date().getMonth() + 1, year: new Date().getFullYear() }).then((data) => getRows(data)), [campusParams]);
  const state = useFinancePage(load, [load]);
  const rows = state.data || [];
  return <>
    <StudentPageHeader title="Attendance Impact" subtitle="Review staff attendance figures that may affect payroll calculations." action={<Link className="sp-btn" to="payroll"><span className="accountant-btn-generated-icon" style={{ backgroundImage: `url(${adminIconAssets.payroll.src})`, backgroundPosition: adminIconAssets.payroll.position }} aria-hidden="true" /> Payroll</Link>} />
    <PageState {...state} />
    {!state.loading && !state.error ? <StudentCard title="Monthly Attendance Impact" subtitle="The backend determines the available attendance and deduction fields.">
      <StudentDataTable columns={["Staff Member", "Present Days", "Absent Days", "Leave", "Deduction", "Payroll Impact"]} rows={rows.map((row) => ({ "Staff Member": getText(row, ["staffName", "StaffName", "employeeName", "EmployeeName", "name", "Name"]), "Present Days": getNumber(row, ["presentDays", "PresentDays", "present", "Present"]) ?? "-", "Absent Days": getNumber(row, ["absentDays", "AbsentDays", "absent", "Absent"]) ?? "-", Leave: getNumber(row, ["leaveDays", "LeaveDays", "leave", "Leave"]) ?? "-", Deduction: formatMoney(getNumber(row, ["deduction", "Deduction", "deductionAmount", "DeductionAmount"]) || 0), "Payroll Impact": formatMoney(getNumber(row, ["payrollImpact", "PayrollImpact", "impactAmount", "ImpactAmount"]) || 0) }))} empty="No attendance impact records available." />
    </StudentCard> : null}
  </>;
}

export function AccountantReports() {
  const campusParams = useCampusParams();
  const load = useCallback(async () => {
    const [dashboard, collections, dues, payroll] = await Promise.allSettled([
      reportApi.getReportsDashboard(campusParams),
      reportApi.getFeeCollectionDetails(campusParams),
      reportApi.getDueFeesDetails(campusParams),
      payrollApi.getPayrollSummary({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), ...campusParams }),
    ]);
    if (dashboard.status === "rejected" && collections.status === "rejected" && dues.status === "rejected" && payroll.status === "rejected") throw dashboard.reason;
    return {
      dashboard: dashboard.status === "fulfilled" ? dashboard.value.data : {},
      collections: collections.status === "fulfilled" ? getRows(collections.value.data) : [],
      dues: dues.status === "fulfilled" ? getRows(dues.value.data) : [],
      payroll: payroll.status === "fulfilled" ? payroll.value : {},
    };
  }, [campusParams]);
  const state = useFinancePage(load, [load]);
  const report = state.data?.dashboard || {};
  const collectionRows = (state.data?.collections || []).map(normalizePayment);
  const dueRows = (state.data?.dues || []).map(normalizeDue).filter((row) => row.amount > 0);
  return <>
    <StudentPageHeader title="Financial Reports" subtitle="Financial collection, outstanding dues, transaction, and payroll reporting." />
    <PageState {...state} />
    {!state.loading && !state.error ? <>
      <section className="sp-summary-grid four">
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Fee Collection Rows" value={collectionRows.length} note="Report detail records" />
        <StudentSummaryCard icon={adminIconAssets.feeManagement} label="Outstanding Rows" value={dueRows.length} note="Report detail records" tone="orange" />
        <StudentSummaryCard icon={adminIconAssets.payroll} label="Payroll Total" value={formatMoney(getNumber(state.data?.payroll, ["totalPayroll", "TotalPayroll", "totalNetSalary", "TotalNetSalary"]) || 0)} note="Current payroll API" tone="purple" />
        <StudentSummaryCard icon={adminIconAssets.financialReports} label="Report Metrics" value={Object.keys(report || {}).length} note="Available dashboard fields" tone="blue" />
      </section>
      <div className="sp-grid-2">
        <StudentCard title="Fee Collection Report"><StudentDataTable columns={["Student", "Amount", "Date", "Status"]} statusColumns={[3]} rows={collectionRows.slice(0, 10).map((row) => ({ Student: row.studentName, Amount: formatMoney(row.amount), Date: formatDate(row.date), Status: row.status }))} empty="No fee collection report data available." /></StudentCard>
        <StudentCard title="Outstanding Dues Report"><StudentDataTable columns={["Student", "Admission No", "Amount", "Due Date"]} rows={dueRows.slice(0, 10).map((row) => ({ Student: row.studentName, "Admission No": row.admissionNo, Amount: formatMoney(row.amount), "Due Date": formatDate(row.dueDate) }))} empty="No outstanding dues report data available." /></StudentCard>
      </div>
    </> : null}
  </>;
}

export function AccountantProfile() {
  const user = useMemo(() => getAuthUser() || {}, []);
  const requestSeq = useRef(0);
  const photoObjectUrl = useRef("");
  const fileInputRef = useRef(null);
  const [profileState, setProfileState] = useState({
    loading: true,
    staffError: "",
    accountError: "",
    lookupError: "",
    photoError: "",
    staff: null,
    account: null,
    lookups: { campuses: [], departments: [], designations: [] },
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [photoUploadError, setPhotoUploadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [form, setForm] = useState(createEmptyProfileForm());
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const staff = profileState.staff;
  const account = profileState.account;
  const staffId = getNumericId(readAny(staff, ["id", "Id", "staffId", "StaffId"]));
  const display = useMemo(() => normalizeAccountantProfile(staff, account, user, profileState.lookups), [staff, account, user, profileState.lookups]);
  const initials = getInitials(display.fullName || "Accountant");

  const cleanupPhotoUrl = useCallback(() => {
    if (photoObjectUrl.current) {
      URL.revokeObjectURL(photoObjectUrl.current);
      photoObjectUrl.current = "";
    }
  }, []);

  const loadPhoto = useCallback(async (targetStaffId, seq = requestSeq.current) => {
    if (!targetStaffId) return;
    cleanupPhotoUrl();
    setPhotoUrl("");
    setProfileState((state) => ({ ...state, photoError: "" }));
    try {
      const response = await apiClient.get(apiEndpoints.faculty.getPhoto(targetStaffId), {
        responseType: "blob",
        skipGlobalLoader: true,
        skipErrorLog: true,
      });
      if (seq !== requestSeq.current) return;
      const type = response?.data?.type || "";
      if (!response?.data || (type && !type.startsWith("image/"))) throw new Error("Profile photo response was not an image.");
      const nextUrl = URL.createObjectURL(response.data);
      photoObjectUrl.current = nextUrl;
      setPhotoUrl(nextUrl);
    } catch (error) {
      if (seq !== requestSeq.current) return;
      setProfileState((state) => ({ ...state, photoError: getApiErrorMessage(error) || "Unable to load profile photo." }));
    }
  }, [cleanupPhotoUrl]);

  const loadProfile = useCallback(async () => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    cleanupPhotoUrl();
    setPhotoUrl("");
    setPhotoSuccess("");
    setPhotoUploadError("");
    setProfileSuccess("");
    setProfileError("");
    setProfileState((state) => ({ ...state, loading: true, staffError: "", accountError: "", lookupError: "", photoError: "" }));

    const sessionIdentity = getSessionIdentity(user);
    const accountPromise = sessionIdentity.userId
      ? apiClient.get(apiEndpoints.auth.userById(sessionIdentity.userId), { skipErrorLog: true }).then((response) => unwrapApiData(response.data))
      : Promise.resolve(null);
    const lookupsPromise = Promise.allSettled([
      apiClient.get(apiEndpoints.campuses.list, { params: { isActive: true }, skipErrorLog: true }).then((response) => getRows(response.data)),
      apiClient.get(apiEndpoints.faculty.lookupDepartments, { params: { staffType: "Non-Teaching" }, skipErrorLog: true }).then((response) => getRows(response.data)),
      apiClient.get(apiEndpoints.faculty.lookupDesignations, { params: { staffType: "Non-Teaching" }, skipErrorLog: true }).then((response) => getRows(response.data)),
    ]);
    const initialStaffPromise = sessionIdentity.staffIdentifier
      ? loadStaffByIdentifier(sessionIdentity.staffIdentifier)
      : Promise.resolve(null);

    const [accountResult, initialStaffResult, lookupResults] = await Promise.allSettled([accountPromise, initialStaffPromise, lookupsPromise]);
    if (seq !== requestSeq.current) return;

    const accountData = accountResult.status === "fulfilled" ? accountResult.value : null;
    const accountIdentity = getSessionIdentity(accountData || {});
    const staffIdentifier = sessionIdentity.staffIdentifier || accountIdentity.staffIdentifier;
    let staffData = initialStaffResult.status === "fulfilled" ? initialStaffResult.value : null;
    let staffError = initialStaffResult.status === "rejected" ? getApiErrorMessage(initialStaffResult.reason) : "";

    if (!staffData && !sessionIdentity.staffIdentifier && staffIdentifier) {
      try {
        staffData = await loadStaffByIdentifier(staffIdentifier);
      } catch (error) {
        staffError = getApiErrorMessage(error);
      }
    }

    const lookups = lookupResults.status === "fulfilled" ? {
      campuses: lookupResults.value[0].status === "fulfilled" ? lookupResults.value[0].value : [],
      departments: lookupResults.value[1].status === "fulfilled" ? lookupResults.value[1].value : [],
      designations: lookupResults.value[2].status === "fulfilled" ? lookupResults.value[2].value : [],
    } : { campuses: [], departments: [], designations: [] };
    const lookupError = lookupResults.status === "rejected" || lookupResults.value?.some((result) => result.status === "rejected")
      ? "Some profile labels could not be resolved from lookup APIs."
      : "";
    const accountError = accountResult.status === "rejected" ? getApiErrorMessage(accountResult.reason) : "";
    if (!staffIdentifier && !staffData) staffError = "This session does not include a staff ID or employee identifier for the signed-in accountant.";

    setProfileState({
      loading: false,
      staffError,
      accountError,
      lookupError,
      photoError: "",
      staff: staffData,
      account: accountData,
      lookups,
    });
    setForm(createProfileForm(staffData));
    setEditing(false);
    const loadedStaffId = getNumericId(readAny(staffData, ["id", "Id", "staffId", "StaffId"]));
    if (loadedStaffId) loadPhoto(loadedStaffId, seq);
  }, [cleanupPhotoUrl, loadPhoto, user]);

  useEffect(() => {
    loadProfile();
    return () => {
      requestSeq.current += 1;
      cleanupPhotoUrl();
    };
  }, [cleanupPhotoUrl, loadProfile]);

  const handleProfileChange = (field) => (event) => {
    setProfileSuccess("");
    setProfileError("");
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleCancelProfile = () => {
    setForm(createProfileForm(staff));
    setEditing(false);
    setProfileError("");
    setProfileSuccess("");
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    if (!staffId) {
      setProfileError("Staff profile ID is required before saving.");
      return;
    }
    const validation = validateProfileForm(form);
    if (validation) {
      setProfileError(validation);
      return;
    }
    setSavingProfile(true);
    try {
      const payload = buildStaffUpdatePayload(staff, form);
      const payloadError = validateStaffUpdatePayload(payload);
      if (payloadError) {
        setProfileError(payloadError);
        return;
      }
      const response = await apiClient.put(apiEndpoints.faculty.update(staffId), payload);
      const updated = await loadStaffByIdentifier(staffId).catch(() => unwrapApiData(response.data));
      setProfileState((state) => ({ ...state, staff: updated, staffError: "" }));
      setForm(createProfileForm(updated));
      setEditing(false);
      setProfileSuccess("Profile details updated successfully.");
    } catch (error) {
      setProfileError(getApiErrorMessage(error) || "Failed to update profile details.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPhotoSuccess("");
    setPhotoUploadError("");
    if (!file) return;
    if (!staffId) {
      setPhotoUploadError("Staff profile ID is required before uploading a photo.");
      return;
    }
    const extension = `.${String(file.name || "").split(".").pop() || ""}`.toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(extension) || !["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoUploadError("Only JPEG and PNG photos are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadError("Photo size must be 5 MB or smaller.");
      return;
    }
    const formData = new FormData();
    formData.append("StaffId", String(staffId));
    formData.append("Photo", file);
    setPhotoUploading(true);
    try {
      await apiClient.post(apiEndpoints.faculty.uploadPhoto, formData);
      setPhotoSuccess("Profile photo updated successfully.");
      await loadPhoto(staffId);
      const updatedStaff = await loadStaffByIdentifier(staffId).catch(() => null);
      if (updatedStaff) setProfileState((state) => ({ ...state, staff: updatedStaff }));
    } catch (error) {
      setPhotoUploadError(getApiErrorMessage(error) || "Failed to upload profile photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    setPasswordSuccess("");
    setPasswordError("");
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      await apiClient.post(apiEndpoints.auth.changePassword, { oldPassword: currentPassword, newPassword, confirmNewPassword: confirmPassword });
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(getApiErrorMessage(error) || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return <>
    <StudentPageHeader title="My Profile" subtitle="Account information for the signed-in finance user." />
    <div className="admin-profile-container accountant-profile-container">
      <div className="admin-profile-grid">
        <div className="admin-profile-card">
          <div className="admin-profile-card-header">
            <div className="admin-profile-card-title-group">
              <span className="admin-profile-title-icon"><User size={20} /></span>
              <h2>Basic Details &amp; Profile Setup</h2>
            </div>
            <div className="accountant-profile-actions">
              <span className="admin-role-badge">{display.role || "Accountant"}</span>
              {staff ? (
                editing ? <>
                  <button type="button" className="sp-btn" onClick={handleCancelProfile} disabled={savingProfile}><X size={14} /> Cancel</button>
                  <button type="submit" form="accountantProfileForm" className="sp-btn primary" disabled={savingProfile}><Save size={14} /> {savingProfile ? "Saving..." : "Save"}</button>
                </> : (
                  <button type="button" className="sp-btn" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>
                )
              ) : null}
            </div>
          </div>

          {profileState.loading ? <div className="sp-api-state">Loading accountant profile...</div> : null}
          {profileState.staffError ? <ProfileNotice type="error" message={profileState.staffError} onRetry={loadProfile} /> : null}
          {profileState.accountError ? <ProfileNotice type="warning" message={`Account details could not be loaded. ${profileState.accountError}`} /> : null}
          {profileState.lookupError ? <ProfileNotice type="warning" message={profileState.lookupError} /> : null}
          {profileState.photoError && !photoUrl ? <ProfileNotice type="warning" message={profileState.photoError} /> : null}
          {profileSuccess ? <div className="admin-feedback-msg success"><CheckCircle2 size={16} /> {profileSuccess}</div> : null}
          {profileError ? <div className="admin-feedback-msg error"><AlertCircle size={16} /> {profileError}</div> : null}

          <div className="admin-photo-section">
            <label className="admin-photo-label">Profile Photo</label>
            <div className="admin-photo-content">
              <div className="admin-avatar-wrapper">
                {photoUrl ? (
                  <img src={photoUrl} alt="Accountant Profile" className="admin-avatar-img" />
                ) : (
                  <div className="admin-avatar-placeholder accountant-avatar-initials">{initials}</div>
                )}
              </div>
              <div className="admin-photo-actions">
                <strong>{display.fullName || "Accountant"}</strong>
                <p className="admin-photo-hint">{display.email || "Email not available"}</p>
                <div className="accountant-photo-controls">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="accountant-hidden-file" onChange={handlePhotoSelect} />
                  <button type="button" className="sp-btn" disabled={!staffId || photoUploading} onClick={() => fileInputRef.current?.click()}><Camera size={14} /> {photoUploading ? "Uploading..." : "Replace Photo"}</button>
                  <small>JPEG or PNG, up to 5 MB.</small>
                </div>
                {photoSuccess ? <div className="admin-feedback-msg success"><CheckCircle2 size={16} /> {photoSuccess}</div> : null}
                {photoUploadError ? <div className="admin-feedback-msg error"><AlertCircle size={16} /> {photoUploadError}</div> : null}
              </div>
            </div>
          </div>

          <form id="accountantProfileForm" onSubmit={handleSaveProfile} className="admin-profile-form-grid">
            <ReadOnlyField label="Full Name" value={display.fullName} />
            <ProfileField label="First Name" value={form.firstName} editing={editing} onChange={handleProfileChange("firstName")} required />
            <ProfileField label="Last Name" value={form.lastName} editing={editing} onChange={handleProfileChange("lastName")} required />
            <ProfileField label="Email Address" type="email" value={form.email} editing={editing} onChange={handleProfileChange("email")} />
            <ProfileField label="Contact Phone Number" value={form.mobile} editing={editing} onChange={handleProfileChange("mobile")} required />
            <ReadOnlyField label="Employee / Staff ID" value={display.employeeId} />
            <ReadOnlyField label="Department" value={display.department} />
            <ReadOnlyField label="Designation" value={display.designation} />
            <ReadOnlyField label="Campus / Branch Assignment" value={display.campus} />
            <ReadOnlyField label="Username" value={display.username} />
            <ReadOnlyField label="Assigned Role" value={display.role} />
            <div className="admin-form-group">
              <label>Account Status</label>
              <div className="admin-status-box"><span className="admin-status-dot" /> {display.status || "Not available"}</div>
            </div>
          </form>
        </div>

        <div className="admin-security-card">
          <div className="admin-security-header">
            <div className="admin-security-icon-circle"><KeyRound size={18} /></div>
            <div className="admin-security-title-wrap">
              <h2>Account Security</h2>
              <p>Update your login password</p>
            </div>
          </div>

          {passwordSuccess ? <div className="admin-feedback-msg success"><CheckCircle2 size={16} /> {passwordSuccess}</div> : null}
          {passwordError ? <div className="admin-feedback-msg error"><AlertCircle size={16} /> {passwordError}</div> : null}

          <form onSubmit={handleUpdatePassword} className="admin-security-form">
            <PasswordField id="accountantCurrentPassword" label="Current Password" value={currentPassword} setValue={setCurrentPassword} visible={showCurrentPassword} setVisible={setShowCurrentPassword} />
            <PasswordField id="accountantNewPassword" label="New Password" value={newPassword} setValue={setNewPassword} visible={showNewPassword} setVisible={setShowNewPassword} placeholder="At least 6 characters" />
            <PasswordField id="accountantConfirmPassword" label="Confirm New Password" value={confirmPassword} setValue={setConfirmPassword} visible={showConfirmPassword} setVisible={setShowConfirmPassword} placeholder="Re-enter new password" />
            <button type="submit" className="admin-btn-update-password" disabled={passwordLoading}>
              <Lock size={15} />
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  </>;
}

const unwrapApiData = (payload) => payload?.data ?? payload?.Data ?? payload;

const readAny = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return fallback;
};

const getNumericId = (value) => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
};

const getInitials = (name) => String(name || "")
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase() || "AC";

const getSessionIdentity = (source = {}) => {
  const staffId = getNumericId(readAny(source, ["staffId", "StaffId", "staffID", "StaffID"]));
  const employeeId = String(readAny(source, ["employeeId", "EmployeeId", "employeeCode", "EmployeeCode"])).trim();
  const userId = getNumericId(readAny(source, ["id", "Id", "userId", "UserId"]));
  return {
    userId,
    staffId,
    employeeId: employeeId || "",
    staffIdentifier: staffId || employeeId || "",
  };
};

const loadStaffByIdentifier = async (identifier) => {
  const response = Number.isInteger(Number(identifier)) && Number(identifier) > 0
    ? await apiClient.get(apiEndpoints.faculty.getById(Number(identifier)), { skipErrorLog: true })
    : await apiClient.get(apiEndpoints.faculty.getProfileByIdentifier(identifier), { skipErrorLog: true });
  return unwrapApiData(response.data);
};

const labelFromLookup = (items, id, name, idKeys, nameKeys) => {
  const normalizedId = id !== undefined && id !== null && id !== "" ? String(id) : "";
  const normalizedName = String(name || "").trim().toLowerCase();
  const match = (items || []).find((item) => {
    const itemId = String(readAny(item, idKeys, ""));
    const itemName = String(readAny(item, nameKeys, "")).trim().toLowerCase();
    return (normalizedId && itemId === normalizedId) || (normalizedName && itemName === normalizedName);
  });
  return readAny(match, nameKeys, name) || name || "";
};

const normalizeAccountantProfile = (staff, account, sessionUser, lookups) => {
  const firstName = readAny(staff, ["firstName", "FirstName"]);
  const middleName = readAny(staff, ["middleName", "MiddleName"]);
  const lastName = readAny(staff, ["lastName", "LastName"]);
  const staffName = [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
  const fullName = staffName || readAny(account, ["fullName", "FullName", "name", "Name"]) || readAny(sessionUser, ["fullName", "name"], "Accountant");
  const campusId = readAny(staff, ["campusId", "CampusId"]);
  const departmentId = readAny(staff, ["departmentId", "DepartmentId"]);
  const designationId = readAny(staff, ["designationId", "DesignationId"]);
  const staffStatus = readAny(staff, ["status", "Status"]);
  const accountStatus = readAny(account, ["status", "Status", "accountStatus", "AccountStatus"]);
  const isActive = readAny(account, ["isActive", "IsActive"], undefined);
  return {
    fullName,
    email: readAny(staff, ["email", "Email"]) || readAny(account, ["email", "Email"]) || readAny(sessionUser, ["email"]),
    mobile: readAny(staff, ["mobile", "Mobile", "phoneNumber", "PhoneNumber"]) || readAny(sessionUser, ["mobile", "phone"]),
    employeeId: readAny(staff, ["employeeId", "EmployeeId"]) || readAny(sessionUser, ["employeeId"]),
    department: labelFromLookup(lookups.departments, departmentId, readAny(staff, ["department", "Department"]), ["id", "Id", "departmentId", "DepartmentId"], ["name", "Name", "departmentName", "DepartmentName"]),
    designation: labelFromLookup(lookups.designations, designationId, readAny(staff, ["designation", "Designation"]), ["id", "Id", "designationId", "DesignationId"], ["name", "Name", "designationName", "DesignationName"]),
    campus: labelFromLookup(lookups.campuses, campusId, readAny(staff, ["campusName", "CampusName", "campus", "Campus"]), ["id", "Id", "campusId", "CampusId"], ["name", "Name", "campusName", "CampusName"]),
    username: readAny(account, ["username", "Username", "userName", "UserName", "email", "Email"]) || readAny(sessionUser, ["username", "userName", "email"]),
    role: readAny(account, ["role", "Role", "roleName", "RoleName"]) || readAny(sessionUser, ["role"], "Accountant"),
    status: accountStatus || (isActive === false ? "Inactive" : staffStatus || (isActive === true ? "Active" : "")),
  };
};

const createEmptyProfileForm = () => ({ firstName: "", lastName: "", email: "", mobile: "" });

const createProfileForm = (staff) => ({
  firstName: String(readAny(staff, ["firstName", "FirstName"])),
  lastName: String(readAny(staff, ["lastName", "LastName"])),
  email: String(readAny(staff, ["email", "Email"])),
  mobile: String(readAny(staff, ["mobile", "Mobile"])),
});

const validateProfileForm = (form) => {
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (!form.mobile.trim()) return "Mobile number is required.";
  if (!/^[0-9+\-\s]{7,15}$/.test(form.mobile.trim())) return "Mobile number must be a valid contact format.";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please provide a valid email address.";
  return "";
};

const staffValue = (staff, keys, fallback = undefined) => {
  const value = readAny(staff, keys, "");
  return value === "" ? fallback : value;
};

const nestedStaffValue = (staff, path, fallback = null) => {
  let value = staff;
  for (const key of path) value = value?.[key];
  return value === undefined || value === null || value === "" ? fallback : value;
};

const normalizeDateForPayload = (value) => {
  if (!value) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const buildStaffUpdatePayload = (staff, form) => ({
  firstName: form.firstName.trim(),
  middleName: staffValue(staff, ["middleName", "MiddleName"], null),
  lastName: form.lastName.trim(),
  fatherOrHusbandName: staffValue(staff, ["fatherOrHusbandName", "FatherOrHusbandName", "guardianName", "GuardianName"], null),
  gender: staffValue(staff, ["gender", "Gender"], ""),
  dateOfBirth: normalizeDateForPayload(staffValue(staff, ["dateOfBirth", "DateOfBirth"], null)),
  maritalStatus: staffValue(staff, ["maritalStatus", "MaritalStatus"], null),
  nationality: staffValue(staff, ["nationality", "Nationality"], "Indian"),
  aadhaar: staffValue(staff, ["aadhaar", "Aadhaar"], null),
  panNumber: staffValue(staff, ["panNumber", "PanNumber", "pan", "Pan"], null),
  mobile: form.mobile.trim(),
  alternateMobile: staffValue(staff, ["alternateMobile", "AlternateMobile"], null),
  email: form.email.trim() || null,
  bloodGroup: staffValue(staff, ["bloodGroup", "BloodGroup"], null),
  currentAddress: staffValue(staff, ["currentAddress", "CurrentAddress"], null),
  permanentAddress: staffValue(staff, ["permanentAddress", "PermanentAddress"], null),
  city: staffValue(staff, ["city", "City"], null),
  district: staffValue(staff, ["district", "District"], null),
  state: staffValue(staff, ["state", "State"], null),
  pincode: staffValue(staff, ["pincode", "Pincode", "pin", "Pin"], null),
  country: staffValue(staff, ["country", "Country"], "India"),
  qualification: staffValue(staff, ["qualification", "Qualification"], null),
  designation: staffValue(staff, ["designation", "Designation"], null),
  designationId: staffValue(staff, ["designationId", "DesignationId"], null),
  staffType: staffValue(staff, ["staffType", "StaffType", "facultyType", "FacultyType"], "Non-Teaching"),
  departmentId: staffValue(staff, ["departmentId", "DepartmentId"], null),
  department: staffValue(staff, ["department", "Department"], null),
  campusId: staffValue(staff, ["campusId", "CampusId"], null),
  campusName: staffValue(staff, ["campusName", "CampusName"], null),
  assignedCampusIds: staffValue(staff, ["assignedCampusIds", "AssignedCampusIds"], []),
  boardId: staffValue(staff, ["boardId", "BoardId"], null),
  boardCode: staffValue(staff, ["boardCode", "BoardCode"], null),
  boardName: staffValue(staff, ["boardName", "BoardName"], null),
  assignedBoardIds: staffValue(staff, ["assignedBoardIds", "AssignedBoardIds"], []),
  joiningDate: normalizeDateForPayload(staffValue(staff, ["joiningDate", "JoiningDate", "dateOfJoining", "DateOfJoining"], null)),
  experience: Number(staffValue(staff, ["experience", "Experience"], 0)) || 0,
  employmentType: staffValue(staff, ["employmentType", "EmploymentType"], "Full Time"),
  status: staffValue(staff, ["status", "Status"], "Active"),
  photoPath: staffValue(staff, ["photoPath", "PhotoPath"], null),
  profileStatus: staffValue(staff, ["profileStatus", "ProfileStatus"], null),
  profileCompletionPercentage: staffValue(staff, ["profileCompletionPercentage", "ProfileCompletionPercentage"], null),
  correctionNotes: staffValue(staff, ["correctionNotes", "CorrectionNotes"], null),
  allocatedSubjects: staffValue(staff, ["allocatedSubjects", "AllocatedSubjects", "subjects", "Subjects"], []),
  bankName: staffValue(staff, ["bankName", "BankName"], nestedStaffValue(staff, ["bankDetails", "bankName"], nestedStaffValue(staff, ["BankDetails", "BankName"]))),
  accountHolder: staffValue(staff, ["accountHolder", "AccountHolder", "accountHolderName", "AccountHolderName"], nestedStaffValue(staff, ["bankDetails", "accountHolderName"], nestedStaffValue(staff, ["BankDetails", "AccountHolderName"]))),
  accountNumber: staffValue(staff, ["accountNumber", "AccountNumber"], nestedStaffValue(staff, ["bankDetails", "accountNumber"], nestedStaffValue(staff, ["BankDetails", "AccountNumber"]))),
  ifsc: staffValue(staff, ["ifsc", "Ifsc", "ifscCode", "IfscCode"], nestedStaffValue(staff, ["bankDetails", "ifscCode"], nestedStaffValue(staff, ["BankDetails", "IfscCode"]))),
  branch: staffValue(staff, ["branch", "Branch"], nestedStaffValue(staff, ["bankDetails", "branch"], nestedStaffValue(staff, ["BankDetails", "Branch"]))),
  accountType: staffValue(staff, ["accountType", "AccountType"], nestedStaffValue(staff, ["bankDetails", "accountType"], nestedStaffValue(staff, ["BankDetails", "AccountType"]))),
  emergencyName: staffValue(staff, ["emergencyName", "EmergencyName", "contactName", "ContactName"], nestedStaffValue(staff, ["emergencyContact", "contactName"], nestedStaffValue(staff, ["EmergencyContact", "ContactName"]))),
  emergencyRelationship: staffValue(staff, ["emergencyRelationship", "EmergencyRelationship", "relationship", "Relationship"], nestedStaffValue(staff, ["emergencyContact", "relationship"], nestedStaffValue(staff, ["EmergencyContact", "Relationship"]))),
  emergencyMobile: staffValue(staff, ["emergencyMobile", "EmergencyMobile"], nestedStaffValue(staff, ["emergencyContact", "mobile"], nestedStaffValue(staff, ["EmergencyContact", "Mobile"]))),
  emergencyAlternate: staffValue(staff, ["emergencyAlternate", "EmergencyAlternate"], nestedStaffValue(staff, ["emergencyContact", "alternateMobile"], nestedStaffValue(staff, ["EmergencyContact", "AlternateMobile"]))),
  emergencyAddress: staffValue(staff, ["emergencyAddress", "EmergencyAddress"], nestedStaffValue(staff, ["emergencyContact", "address"], nestedStaffValue(staff, ["EmergencyContact", "Address"]))),
  highestQualification: staffValue(staff, ["highestQualification", "HighestQualification"], null),
  university: staffValue(staff, ["university", "University"], null),
  specialization: staffValue(staff, ["specialization", "Specialization"], null),
  passingYear: staffValue(staff, ["passingYear", "PassingYear"], null),
  percentage: staffValue(staff, ["percentage", "Percentage"], null),
  totalExperience: staffValue(staff, ["totalExperience", "TotalExperience"], null),
  previousInstitution: staffValue(staff, ["previousInstitution", "PreviousInstitution"], null),
  previousDesignation: staffValue(staff, ["previousDesignation", "PreviousDesignation"], null),
  experienceFrom: staffValue(staff, ["experienceFrom", "ExperienceFrom"], null),
  experienceTo: staffValue(staff, ["experienceTo", "ExperienceTo"], null),
  educationJson: staffValue(staff, ["educationJson", "EducationJson"], null),
  experienceJson: staffValue(staff, ["experienceJson", "ExperienceJson"], null),
  documentsJson: staffValue(staff, ["documentsJson", "DocumentsJson"], null),
  bankDetailsJson: staffValue(staff, ["bankDetailsJson", "BankDetailsJson"], null),
  emergencyContactJson: staffValue(staff, ["emergencyContactJson", "EmergencyContactJson"], null),
  departmentSpecificJson: staffValue(staff, ["departmentSpecificJson", "DepartmentSpecificJson"], null),
  departmentSpecific: staffValue(staff, ["departmentSpecific", "DepartmentSpecific"], null),
  documents: staffValue(staff, ["documentsMap", "DocumentsMap"], null),
});

const validateStaffUpdatePayload = (payload) => {
  if (!payload.firstName) return "First name is required.";
  if (!payload.lastName) return "Last name is required.";
  if (!payload.mobile) return "Mobile number is required.";
  if (!payload.gender) return "Cannot save because the backend staff record is missing gender.";
  if (!payload.dateOfBirth) return "Cannot save because the backend staff record is missing date of birth.";
  return "";
};

function ProfileNotice({ type = "warning", message, onRetry }) {
  return (
    <div className={`admin-feedback-msg ${type === "error" ? "error" : "accountant-warning"}`}>
      <AlertCircle size={16} />
      <span>{message}</span>
      {onRetry ? <button type="button" className="sp-btn" onClick={onRetry}><RefreshCw size={14} /> Retry</button> : null}
    </div>
  );
}

function ProfileField({ label, value, editing, onChange, type = "text", required = false }) {
  return (
    <div className="admin-form-group">
      <label>{label}</label>
      <input className="admin-input" type={type} value={editing ? value : value || "Not available"} onChange={onChange} readOnly={!editing} disabled={!editing} required={required} />
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="admin-form-group">
      <label>{label}</label>
      <input className="admin-input" type="text" value={value || "Not available"} readOnly disabled />
    </div>
  );
}

function PasswordField({ id, label, value, setValue, visible, setVisible, placeholder = "••••••••" }) {
  return (
    <div className="admin-form-group">
      <label htmlFor={id}>{label}</label>
      <div className="admin-password-input-wrap">
        <input id={id} type={visible ? "text" : "password"} className="admin-input" placeholder={placeholder} value={value} onChange={(event) => setValue(event.target.value)} />
        <button type="button" className="admin-password-toggle-btn" onClick={() => setVisible((show) => !show)} title={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}
