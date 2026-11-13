import { getAuthUser } from "@/modules/auth/authStorage.js";

const ROLE_ATTENDANCE_PATHS = [
  { match: (r) => r.includes("accountant") || r.includes("finance") || r.includes("cashier"), path: "/accountant-dashboard/my-attendance" },
  { match: (r) => r.includes("exam"), path: "/exam-cell-dashboard/check-in-out" },
  { match: (r) => r.includes("transport"), path: "/transport-manager/my-attendance" },
  { match: (r) => r.includes("driver") || r.includes("attendant"), path: "/driver/attendance" },
  { match: (r) => r.includes("non-teaching") || r.includes("nonteaching"), path: "/non-teaching-dashboard/attendance" },
  { match: (r) => r.includes("warden"), path: "/warden-dashboard" },
  { match: (r) => r.includes("admin") || r.includes("principal"), path: "/dashboard/attendance/staff?tab=my-attendance" },
];

const ROLE_LEAVE_PATHS = [
  { match: (r) => r.includes("admin") || r.includes("principal"), path: "/dashboard/leave-management?tab=all" },
  { match: (r) => r.includes("accountant") || r.includes("finance") || r.includes("cashier"), path: "/accountant-dashboard/leave" },
  { match: (r) => r.includes("non-teaching") || r.includes("nonteaching"), path: "/non-teaching-dashboard/staff-leave" },
  { match: (r) => r.includes("inventory"), path: "/inventory-dashboard/leave" },
  { match: (r) => r.includes("transport"), path: "/transport-manager/leave" },
  { match: (r) => r.includes("driver") || r.includes("attendant"), path: "/driver/leave" },
];

const ROLE_PAYSLIP_PATHS = [
  { match: (r) => r.includes("admin") || r.includes("principal"), path: "/dashboard/payroll/payslips" },
  { match: (r) => r.includes("non-teaching") || r.includes("nonteaching"), path: "/non-teaching-dashboard/payslips" },
  { match: (r) => r.includes("inventory"), path: "/inventory-dashboard/payslips" },
  { match: (r) => r.includes("driver") || r.includes("attendant"), path: "/driver/payslips" },
  { match: (r) => r.includes("accountant") || r.includes("finance") || r.includes("cashier"), path: "/accountant-dashboard/payroll" },
];

const ROLE_REIMBURSEMENT_PATHS = [
  { match: (r) => r.includes("admin") || r.includes("principal"), path: "/dashboard/reimbursement" },
  { match: (r) => r.includes("accountant") || r.includes("finance") || r.includes("cashier"), path: "/accountant-dashboard/reimbursements" },
];

function getRoleLower(user) {
  const raw = user?.role ?? user?.Role ?? user?.roleName ?? "";
  return String(raw).trim().toLowerCase();
}

function isAdminRole(roleLower) {
  return roleLower.includes("admin") || roleLower === "principal";
}

function isStudentRole(roleLower) {
  return roleLower === "student";
}

function isParentRole(roleLower) {
  return roleLower === "parent";
}

function isExamCellRole(roleLower) {
  return roleLower.includes("exam");
}

function resolveFromList(list, roleLower, fallback) {
  const hit = list.find((entry) => entry.match(roleLower));
  return hit ? hit.path : fallback;
}

function appendQueryParams(baseUrl, extraParams = {}) {
  if (!baseUrl) return "/";
  const [pathname, rawSearch = ""] = String(baseUrl).split("?");
  const params = new URLSearchParams(rawSearch);
  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== null && v !== undefined && String(v) !== "" && !params.has(k)) {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Resolves the exact destination route + query parameters for a clicked notification
 * using its payload (`actionUrl`, `type`, `referenceId`, `title`) and current user role.
 */
export function resolveNotificationTarget(notif, authUser = null) {
  const user = authUser || getAuthUser() || {};
  const roleLower = getRoleLower(user);
  const rawUrl = String(notif?.actionUrl || "").trim();
  const [rawPath, rawSearch = ""] = rawUrl.split("?");
  const existingParams = new URLSearchParams(rawSearch);
  const typeLower = String(notif?.type || "").toLowerCase();
  const titleLower = String(notif?.title || "").toLowerCase();
  const isGroupedMultiple = Boolean(notif?.isGrouped || Number(notif?.groupCount || 1) > 1);
  const refId = !isGroupedMultiple && notif?.referenceId != null && Number(notif.referenceId) > 0 ? Number(notif.referenceId) : null;

  const existingQueryObj = Object.fromEntries(existingParams.entries());

  // 1. Staff Attendance Regularization / My Attendance
  if (
    rawPath.includes("/attendance/staff") ||
    rawPath.includes("/my-attendance") ||
    rawPath === "/staff/attendance" ||
    rawPath.includes("/check-in-out") ||
    (typeLower.includes("attend") && !rawPath.includes("/student") && !rawPath.includes("/parent"))
  ) {
    // Admin review notification (new regularization request submitted by staff)
    if (
      isAdminRole(roleLower) &&
      (rawUrl.includes("view=regularize") || titleLower.includes("regularization request"))
    ) {
      return appendQueryParams("/dashboard/attendance/staff", {
        ...existingQueryObj,
        tab: "staff-attendance",
        view: "regularize",
        regScreen: existingQueryObj.regScreen || "pending",
        ...(refId ? { regId: refId } : {}),
      });
    }

    // Staff/employee personal attendance route (approved/rejected regularization or late arrival)
    const staffBase = resolveFromList(ROLE_ATTENDANCE_PATHS, roleLower, "/faculty-dashboard/my-attendance");
    return appendQueryParams(staffBase, {
      ...existingQueryObj,
      ...(refId ? { regId: refId } : {}),
    });
  }

  // 2. Student Admissions
  if (rawPath === "/dashboard/admissions" || rawPath === "/dashboard/admission" || typeLower === "admission") {
    if (refId) {
      return appendQueryParams("/dashboard/admission", {
        ...existingQueryObj,
        view: existingQueryObj.view || "preview",
        admissionId: existingQueryObj.admissionId || refId,
      });
    }
    return appendQueryParams("/dashboard/admission", { ...existingQueryObj, view: existingQueryObj.view || "requests" });
  }

  // 3. Leave Management
  if (rawPath === "/dashboard/leave" || rawPath === "/dashboard/leave-management" || rawPath.includes("/leave") || typeLower === "leave") {
    const leaveBase = resolveFromList(ROLE_LEAVE_PATHS, roleLower, "/faculty-dashboard/leave");
    return appendQueryParams(leaveBase, {
      ...existingQueryObj,
      ...(refId ? { leaveId: refId } : {}),
    });
  }

  // 4. Marks & Results
  if (rawPath === "/dashboard/faculty/marks" || rawPath.includes("/marks") || typeLower === "marks") {
    if (isStudentRole(roleLower) || rawPath.startsWith("/student")) {
      return appendQueryParams("/student-dashboard/results", { ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
    }
    if (isParentRole(roleLower) || rawPath.startsWith("/parent")) {
      return appendQueryParams("/parent-dashboard/academics", { tab: "results", ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
    }
    if (isAdminRole(roleLower) || isExamCellRole(roleLower)) {
      const adminMarksBase = isExamCellRole(roleLower) ? "/exam-cell-dashboard/results" : "/dashboard/results";
      return appendQueryParams(adminMarksBase, { ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
    }
    return appendQueryParams("/faculty-dashboard/marks", { ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
  }

  // 5. Examinations & Duties
  if (rawPath === "/dashboard/examinations/duties" || titleLower.includes("duty") || titleLower.includes("invigilation")) {
    const dutyBase = isExamCellRole(roleLower) ? "/exam-cell-dashboard/duties" : "/faculty-dashboard/exam-duties";
    return appendQueryParams(dutyBase, { ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
  }
  if (rawPath === "/student/examinations" || rawPath === "/student-dashboard/examinations" || typeLower.includes("exam")) {
    if (isParentRole(roleLower) || rawPath.startsWith("/parent")) {
      return appendQueryParams("/parent-dashboard/examinations", { ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
    }
    if (isAdminRole(roleLower)) {
      return appendQueryParams("/dashboard/examinations", { ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
    }
    return appendQueryParams("/student-dashboard/examinations", { ...existingQueryObj, ...(refId ? { examinationId: refId } : {}) });
  }

  // 6. Certificates
  if (rawPath.includes("certificate") || typeLower.includes("certif")) {
    if (isStudentRole(roleLower) || rawPath.startsWith("/student")) {
      return appendQueryParams("/student-dashboard/certificates", { ...existingQueryObj, ...(refId ? { certificateId: refId } : {}) });
    }
    if (isParentRole(roleLower) || rawPath.startsWith("/parent")) {
      return appendQueryParams("/parent-dashboard/documents", { ...existingQueryObj, ...(refId ? { certificateId: refId } : {}) });
    }
    const certBase = isExamCellRole(roleLower) ? "/exam-cell-dashboard/certificates" : "/dashboard/certificates";
    return appendQueryParams(certBase, { ...existingQueryObj, ...(refId ? { certificateId: refId } : {}) });
  }

  // 7. Reimbursements
  if (rawPath === "/dashboard/reimbursements" || rawPath === "/dashboard/reimbursement" || typeLower.includes("reimburse")) {
    const reimbBase = resolveFromList(ROLE_REIMBURSEMENT_PATHS, roleLower, "/faculty-dashboard/reimbursements");
    return appendQueryParams(reimbBase, { ...existingQueryObj, ...(refId ? { claimId: refId } : {}) });
  }

  // 8. Payroll / Payslips
  if (rawPath.startsWith("/dashboard/payroll/payslips") || typeLower === "payroll") {
    const payslipBase = resolveFromList(ROLE_PAYSLIP_PATHS, roleLower, "/faculty-dashboard/payslips");
    return appendQueryParams(payslipBase, { ...existingQueryObj, ...(refId ? { payslipId: refId } : {}) });
  }

  // 9. Offer Letter / Staff Onboarding
  if (typeLower === "offerletter" || rawPath === "/faculty-dashboard/profile") {
    return appendQueryParams("/faculty-dashboard/profile", existingQueryObj);
  }

  // 10. Legacy Student / Parent prefix normalization
  if (rawPath.startsWith("/student/")) {
    const mapped = rawPath
      .replace(/^\/student\/fees\/receipt\/.+$/i, "/student-dashboard/fees")
      .replace(/^\/student\/halltickets\/.+$/i, "/student-dashboard/examinations")
      .replace(/^\/student\/dashboard$/i, typeLower.includes("holiday") ? "/student-dashboard/holidays" : "/student-dashboard")
      .replace(/^\/student\//i, "/student-dashboard/");
    return appendQueryParams(mapped, { ...existingQueryObj, ...(refId ? { referenceId: refId } : {}) });
  }

  if (rawPath.startsWith("/parent/")) {
    const mapped = rawPath
      .replace(/^\/parent\/dashboard$/i, "/parent-dashboard")
      .replace(/^\/parent\/results$/i, "/parent-dashboard/academics?tab=results")
      .replace(/^\/parent\/hostel$/i, "/parent-dashboard/children")
      .replace(/^\/parent\/certificates$/i, "/parent-dashboard/documents")
      .replace(/^\/parent\//i, "/parent-dashboard/");
    return appendQueryParams(mapped, { ...existingQueryObj, ...(refId ? { referenceId: refId } : {}) });
  }

  if (rawUrl) {
    return rawUrl;
  }

  // Safe portal landing fallback if ActionUrl was null on old/manual test notifications
  if (isStudentRole(roleLower)) return "/student-dashboard";
  if (isParentRole(roleLower)) return "/parent-dashboard";
  if (isAdminRole(roleLower)) return "/dashboard";
  return "/faculty-dashboard";
}
