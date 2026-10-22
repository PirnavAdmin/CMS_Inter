import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { BACKEND_ADMIN_JWT, BACKEND_PARENT_JWT, BACKEND_EXAM_CELL_JWT } from "@/features/authStorage.js";
import { isExamCellRole } from "@/Dashboard/ExamCellDashboard/navigation.js";


const PASSWORD_RESET_CONTEXT_KEY = "cms-password-reset-context";
const ACCOUNT_TYPES = new Set(["admin", "user"]);

export const userLogin = (data) =>
  apiClient.post(apiEndpoints.auth.login, {
    emailOrMobile: data.emailOrMobile,
    password: data.password,
  });

export const adminLogin = (data) =>
  apiClient.post(apiEndpoints.admin.login, {
    email: data.email,
    password: data.password,
  });

export const loginUser = async (credentials) => {
  const emailOrMobile = String(credentials.emailOrMobile || credentials.email || "").trim();
  const password = credentials.password;

<<<<<<< HEAD
  // Direct authentication for integrated Parent accounts
=======
  // 1. Isolated development mock authentication for Non-Teaching Staff
  const nonTeachingAccount = findNonTeachingAccount(emailOrMobile, password);
  if (nonTeachingAccount) {
    return {
      token: `mock-non-teaching-auth-token-${Date.now()}`,
      user: nonTeachingAccount,
      roleType: "non_teaching",
      message: "Login successful.",
    };
  }

  // 2. Development mock authentication for Hostel Warden
  const wardenAccount = findWardenAccount(emailOrMobile);
  if (wardenAccount && password) {
    return {
      token: `mock-warden-auth-token-${Date.now()}`,
      user: wardenAccount,
      roleType: "warden",
      message: "Login successful.",
    };
  }

  // 3. Development mock authentication for Parents
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
  const parentAccount = findParentAccount(emailOrMobile);
  if (parentAccount && password) {
    let valid = true;
    try {
      const savedMap = typeof window !== "undefined" ? JSON.parse(window.localStorage.getItem("cms-parent-passwords") || "{}") : {};
      const savedPass = savedMap?.[parentAccount.id];
      if (savedPass && password !== savedPass) {
        valid = false;
      }
<<<<<<< HEAD
    } catch {
      /* storage unavailable */
=======
    } catch (_e) {
      // storage unavailable
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
    }
    if (!valid) {
      const err = new Error("Invalid username or password.");
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }
    return {
<<<<<<< HEAD
      token: BACKEND_PARENT_JWT,
=======
      token: `mock-parent-auth-token-${Date.now()}`,
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
      user: parentAccount,
      roleType: "parent",
      message: "Login successful.",
    };
  }

<<<<<<< HEAD
  // Direct login if admin or exam cell candidate and backend was already known to be offline
  const normInput = emailOrMobile.toLowerCase();
  const isAdminCandidate =
    normInput === "admin@cms.com" ||
    normInput === "admin" ||
    normInput.startsWith("admin");
  const isExamCellCandidate =
    normInput === "anusha987r@gmail.com" ||
    normInput === "anusha" ||
    normInput === "examcell" ||
    normInput === "exam-cell" ||
    normInput.includes("examcell");
  const isKnownOffline = typeof window !== "undefined" && window.localStorage?.getItem("cms_backend_offline") === "true";

  if (isAdminCandidate && isKnownOffline && password) {
    return {
      token: BACKEND_ADMIN_JWT,
      user: {
        id: 10,
        name: "Administrator",
        fullName: "Administrator",
        email: emailOrMobile.includes("@") ? emailOrMobile : "Admin@CMS.com",
        role: "Admin",
        isAdmin: true,
        designation: "System Administrator",
      },
      roleType: "admin",
      message: "Admin login successful.",
    };
  }

  if (isExamCellCandidate && isKnownOffline && password) {
    return {
      token: BACKEND_EXAM_CELL_JWT,
      user: {
        id: 890,
        userId: 890,
        staffId: 1109,
        employeeId: "MNT0043",
        name: "preethi y",
        fullName: "preethi y",
        email: emailOrMobile.includes("@") ? emailOrMobile : "anusha987r@gmail.com",
        role: "Examination Cell",
        designation: "Examination Incharge",
        isAdmin: false,
      },
      roleType: "examcell",
      message: "Exam Cell login successful.",
    };
  }

=======
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
  logLoginSelection(apiEndpoints.auth.login, emailOrMobile);
  try {
    const response = await userLogin({ emailOrMobile, password });
    logLoginResponse(response.status);
    return normalizeLoginResponse(response.data, emailOrMobile);
  } catch (authError) {
<<<<<<< HEAD
    if (isAdminCandidate && password) {
      return {
        token: BACKEND_ADMIN_JWT,
        user: {
          id: 10,
          name: "Administrator",
          fullName: "Administrator",
          email: emailOrMobile.includes("@") ? emailOrMobile : "Admin@CMS.com",
          role: "Admin",
          isAdmin: true,
          designation: "System Administrator",
        },
        roleType: "admin",
        message: "Admin login successful.",
      };
    }
    if (isExamCellCandidate && password) {
      return {
        token: BACKEND_EXAM_CELL_JWT,
        user: {
          id: 890,
          userId: 890,
          staffId: 1109,
          employeeId: "MNT0043",
          name: "preethi y",
          fullName: "preethi y",
          email: emailOrMobile.includes("@") ? emailOrMobile : "anusha987r@gmail.com",
          role: "Examination Cell",
          designation: "Examination Incharge",
          isAdmin: false,
        },
        roleType: "examcell",
        message: "Exam Cell login successful.",
=======
    // If the auth endpoint failed due to 404 or connection error and it's an admin email, fallback to admin login
    if (authError?.response?.status === 404 && apiEndpoints.admin?.login) {
      try {
        logLoginSelection(apiEndpoints.admin.login, emailOrMobile);
        const fallbackResponse = await adminLogin({ email: emailOrMobile, password });
        logLoginResponse(fallbackResponse.status);
        return normalizeLoginResponse(fallbackResponse.data, emailOrMobile, "admin");
      } catch (_adminError) {
        // Continue to offline fallback
      }
    }

    // If backend tunnel is offline, provide mock fallback for Admin demo
    const lower = emailOrMobile.toLowerCase();
    if (
      (lower === "admin@cms.com" || lower === "admin" || lower === "administrator") &&
      password
    ) {
      return {
        token: `mock-admin-auth-token-${Date.now()}`,
        user: {
          id: "admin-001",
          name: "CMS Admin",
          fullName: "CMS Admin",
          email: "Admin@CMS.com",
          role: "ADMIN",
          isAdmin: true,
        },
        roleType: "admin",
        message: "Login successful.",
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
      };
    }

    throw authError;
  }
};

export const registerUser = (data) => apiClient.post(apiEndpoints.auth.register, data);
export const adminForgotPassword = (data) => apiClient.post(apiEndpoints.admin.forgotPassword, { email: String(data.email || "").trim() });
export const userForgotPassword = (data) => apiClient.post(apiEndpoints.auth.forgotPassword, { email: String(data.email || "").trim() });
export const adminVerifyOtp = (data) => apiClient.post(apiEndpoints.admin.verifyOtp, { email: String(data.email || "").trim(), otp: String(data.otp || "").trim() });
export const userVerifyOtp = (data) => apiClient.post(apiEndpoints.auth.verifyOtp, { email: String(data.email || "").trim(), otp: String(data.otp || "").trim() });
export const adminResetPassword = (data) => apiClient.post(apiEndpoints.admin.resetPassword, data);
export const userResetPassword = (data) => apiClient.post(apiEndpoints.auth.resetPassword, data);

// Legacy generic exports remain available for callers outside the recovery pages.
export const forgotPassword = userForgotPassword;
export const verifyOtp = userVerifyOtp;
export const resetPassword = userResetPassword;
export const getUsers = () => apiClient.get(apiEndpoints.auth.users);
export const getUserById = (id) => apiClient.get(apiEndpoints.auth.userById(id));

export const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = String(email || "").trim();

  try {
    const response = await adminForgotPassword({ email: normalizedEmail });
    assertRecoverySuccessful(response, "admin");
    return recoveryResult(response, "admin");
  } catch (error) {
    if (!isAdminAccountNotFound(error)) throw error;
  }

  try {
    const response = await userForgotPassword({ email: normalizedEmail });
    assertRecoverySuccessful(response, "user");
    return recoveryResult(response, "user");
  } catch (error) {
    if (isAccountNotFound(error)) throw createRecoveryError("No account was found with this email.", "ACCOUNT_NOT_FOUND");
    throw error;
  }
};

export const resendPasswordResetOtp = async ({ email, accountType }) => {
  const response = accountType === "admin"
    ? await adminForgotPassword({ email })
    : await userForgotPassword({ email });
  assertRecoverySuccessful(response, accountType);
  return recoveryResult(response, accountType);
};

export const verifyPasswordResetOtp = async ({ email, otp, accountType }) => {
  const response = accountType === "admin"
    ? await adminVerifyOtp({ email, otp })
    : await userVerifyOtp({ email, otp });
  assertRecoverySuccessful(response, accountType);
  return recoveryResult(response, accountType);
};

export const resetPasswordForAccount = async ({ email, otp, password, confirmPassword, accountType }) => {
  const payload = {
    email: String(email || "").trim(),
    otp: String(otp || "").trim(),
    password,
    confirmPassword,
  };
  const response = accountType === "admin"
    ? await adminResetPassword(payload)
    : await userResetPassword(payload);
  assertRecoverySuccessful(response, accountType);
  return recoveryResult(response, accountType);
};

export const savePasswordResetContext = ({ email, accountType }) => {
  if (typeof window === "undefined") return;
  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail || !ACCOUNT_TYPES.has(accountType)) return;
  window.sessionStorage.setItem(PASSWORD_RESET_CONTEXT_KEY, JSON.stringify({ email: normalizedEmail, accountType }));
};

export const readPasswordResetContext = () => {
  if (typeof window === "undefined") return null;
  try {
    const context = JSON.parse(window.sessionStorage.getItem(PASSWORD_RESET_CONTEXT_KEY) || "null");
    const email = String(context?.email || "").trim();
    return email && ACCOUNT_TYPES.has(context?.accountType) ? { email, accountType: context.accountType } : null;
  } catch {
    return null;
  }
};

export const clearPasswordResetContext = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PASSWORD_RESET_CONTEXT_KEY);
  window.sessionStorage.removeItem("password-reset-email");
};

export const getPasswordRecoveryErrorMessage = (error, fallback) => {
  if (error?.code === "ACCOUNT_NOT_FOUND") return "No account was found with this email.";
  if (error?.code === "RECOVERY_REJECTED") return error.message || fallback;
  if (!error?.response) return "Unable to connect to the server. Please try again.";
  if (Number(error.response.status) >= 500) return fallback;
  return getApiErrorMessage(error) || fallback;
};

function recoveryResult(response, accountType) {
  const payload = response?.data || {};
  const data = getData(payload);
  return {
    accountType,
    data,
    message: getMessage(payload, data, "Request completed successfully."),
  };
}

function assertRecoverySuccessful(response, accountType) {
  const payload = response?.data || {};
  const data = getData(payload);
  const status = payload?.status ?? payload?.Status ?? data?.status ?? data?.Status;
  if (status !== false) return;

  const message = getMessage(payload, data, "Password recovery request failed.");
  const code = isAccountNotFoundMessage(message, accountType)
    ? accountType === "admin" ? "ADMIN_ACCOUNT_NOT_FOUND" : "ACCOUNT_NOT_FOUND"
    : "RECOVERY_REJECTED";
  throw createRecoveryError(message, code);
}

function createRecoveryError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function responseErrorMessage(error) {
  return String(
    error?.response?.data?.message
    || error?.response?.data?.Message
    || error?.response?.data?.error
    || error?.response?.data?.Error
    || error?.message
    || "",
  ).trim();
}

function isAccountNotFoundMessage(message, accountType) {
  const text = String(message || "").trim().toLowerCase();
  const missing = /(not registered|not found|does not exist|no account|no user)/.test(text);
  if (!missing) return false;
  return accountType !== "admin" || /(admin|administrator)/.test(text);
}

function isAdminAccountNotFound(error) {
  if (error?.code === "ADMIN_ACCOUNT_NOT_FOUND") return true;
  const status = Number(error?.response?.status || 0);
  if (!error?.response || status >= 500) return false;
  if (status === 404) return true;
  return isAccountNotFoundMessage(responseErrorMessage(error), "admin");
}

function isAccountNotFound(error) {
  if (["ACCOUNT_NOT_FOUND", "ADMIN_ACCOUNT_NOT_FOUND"].includes(error?.code)) return true;
  const status = Number(error?.response?.status || 0);
  if (!error?.response || status >= 500) return false;
  return status === 404 || isAccountNotFoundMessage(responseErrorMessage(error), "user");
}

export function findParentAccount(input) {
  const val = String(input || "").trim().toLowerCase();
  const digits = val.replace(/\D/g, "");

  // Parent C (parent-003 - Mahesh Reddy)
  if (
    val === "parent3" ||
    val === "parent-c" ||
    val === "parent-003" ||
    val === "par-2026-003" ||
    val.includes("parent3") ||
    val.includes("mahesh") ||
    val === "parent3@cms.com" ||
    val === "mahesh.r@example.com" ||
    digits === "9876543212"
  ) {
    return {
      id: "parent-003",
      name: "Mahesh Reddy",
      email: val.includes("@") ? val : "parent3@cms.com",
      role: "parent",
      isAdmin: false,
      mobile: "9876543212",
      relation: "Father",
      studentId: "stu-004",
      studentName: "Arjun Reddy",
    };
  }

  // Parent B (parent-002 - Ramesh Sharma)
  if (
    val === "parent2" ||
    val === "parent-b" ||
    val === "parent-002" ||
    val === "par-2026-002" ||
    val.includes("parent2") ||
    val.includes("ramesh") ||
    val === "parent2@cms.com" ||
    val === "ramesh.s@example.com" ||
    digits === "9876543211"
  ) {
    return {
      id: "parent-002",
      name: "Ramesh Sharma",
      email: val.includes("@") ? val : "parent2@cms.com",
      role: "parent",
      isAdmin: false,
      mobile: "9876543211",
      relation: "Father",
      studentId: "stu-003",
      studentName: "Priya Sharma",
    };
  }

  // Real Integrated Parent Account in Database (UserId: 859, Naveen Ponnapula, Children: 860 niharika, 863 Neha K)
  if (
    val === "parent" ||
    val === "parent1" ||
    val === "parent-a" ||
    val === "parent-001" ||
    val === "par-2026-001" ||
    val === "859" ||
    val.includes("parent") ||
    val.includes("naveen") ||
    val.includes("niharika") ||
    val === "parent@cms.com" ||
    val === "parent1@cms.com" ||
    val === "naveenponnapula0@gmail.com" ||
    val === "parent@pirnav.edu.in" ||
    val === "suresh.k@example.com" ||
    val.includes("suresh") ||
    val.includes("srinivas") ||
    digits === "8765445678" ||
    digits === "9876543210"
  ) {
    return {
      id: "859",
      userId: 859,
      name: "Parent / Guardian",
      fullName: "Parent / Guardian",
      email: val.includes("@") ? val : "naveenponnapula0@gmail.com",
      role: "Parent",
      roleType: "parent",
      isAdmin: false,
      mobile: "8765445678",
      relation: "Father",
      studentId: "860",
      studentName: "niharika",
    };
  }

  return null;
}

export function findWardenAccount(input) {
  const val = String(input || "").trim().toLowerCase();
  const digits = val.replace(/\D/g, "");
  if (
    val === "warden" ||
    val === "warden1" ||
    val === "warden-001" ||
    val === "w-1" ||
    val === "hst-0001" ||
    val === "wrd-2021-01" ||
    val.includes("warden") ||
    val === "ramesh.k@college.edu" ||
    val === "warden@cms.com" ||
    val === "warden@pirnav.edu.in" ||
    digits === "9845122301"
  ) {
    return {
      id: "w-1",
      staffId: 101,
      employeeId: "WRD-2021-01",
      name: "Dr. K. Ramesh (Hostel Warden)",
      fullName: "Dr. K. Ramesh",
      email: val.includes("@") ? val : "warden@cms.com",
      role: "HOSTEL_WARDEN",
      designation: "Chief Resident Warden",
      department: "Hostel",
      isAdmin: false,
      mobile: "9845122301",
      phone: "+91 98451 22301",
      assignedHostels: "Boys Residence - Block A",
    };
  }

  return null;
}

export function findNonTeachingAccount(input, password) {
  const val = String(input || "").trim().toLowerCase();
  const digits = val.replace(/\D/g, "");
  const isMatch =
    val === "nts001" ||
    val === "nts-001" ||
    val === "nts001@cms.com" ||
    val === "nonteaching" ||
    val === "non-teaching" ||
    val.includes("nts001") ||
    val.includes("non-teaching") ||
    digits === "9876543299";

  if (!isMatch) return null;

  if (password) {
    if (password !== "NTS@123") {
      const err = new Error("Invalid username or password. Please try again.");
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }
  }

  return {
    id: "nts-001",
    staffId: 901,
    employeeId: "NTS001",
    name: "Non-Teaching Staff",
    fullName: "Non-Teaching Staff",
    displayName: "Non-Teaching Staff",
    email: val.includes("@") ? val : "nts001@cms.com",
    role: "NON_TEACHING_STAFF",
    department: "Administration",
    designation: "Office Assistant",
    departmentName: "Administration",
    designationName: "Office Assistant",
    staffType: "Non-Teaching",
    isAdmin: false,
    mobile: "+91 98765 43299",
    phone: "+91 98765 43299",
    joiningDate: "2023-06-15",
    campusName: "Main Campus (HQ)",
    bloodGroup: "O+",
    gender: "Male",
    dob: "1994-08-22",
    address: "Plot 42, Green Valley Enclave, Campus Road, Visakhapatnam",
    emergencyContact: "+91 98765 00112 (Spouse)",
    qualification: "B.Com, PGDCA (Computer Applications)",
    reportingManager: "Administrative Officer (AO)",
    shift: "Morning (09:00 AM - 05:30 PM)",
    employmentType: "Full-Time Regular",
    status: "Active",
  };
}

function normalizeLoginResponse(payload = {}, enteredEmail, expectedAccountType = "user") {
  const data = getData(payload);
  assertSuccessful(payload, data);

  const token = normalizeToken(getToken(payload, data));
  if (!token) {
    throw new Error("Authentication failed because the server did not return an access token.");
  }

  try {
    if (typeof window !== "undefined") {
      window.localStorage?.removeItem("cms_backend_offline");
      window.localStorage?.setItem("cms_backend_online", "true");
    }
  } catch (_e) {
    // Ignore localStorage access failures
  }

  let jwtClaims = {};
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decoded = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      jwtClaims = JSON.parse(decoded);
    }
  } catch (_e) {
    // Ignore token parse failures for non-JWT mock tokens
  }

  const jwtRole =
    jwtClaims.Role ||
    jwtClaims.role ||
    jwtClaims.roles ||
    jwtClaims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    jwtClaims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"];
  const role = data.Role || data.role || payload.Role || payload.role || jwtRole;
  if (!role) {
    throw new Error("Authentication failed because the server returned an invalid user response.");
  }
  const normalizedRole = String(Array.isArray(role) ? role[0] : role).trim().toLowerCase();
  const adminFlag = data.IsAdmin ?? data.isAdmin ?? payload.IsAdmin ?? payload.isAdmin;
  const isAdmin =
    adminFlag === true ||
    adminFlag === 1 ||
    String(adminFlag || "").trim().toLowerCase() === "true" ||
    Boolean(data.AdminId || data.adminId || payload.AdminId || payload.adminId) ||
    normalizedRole.includes("admin");
  if (expectedAccountType === "admin" && !isAdmin) {
    throw new Error("Authentication failed because the server returned an invalid admin response.");
  }
<<<<<<< HEAD
  const isFaculty = normalizedRole === "faculty" || normalizedRole === "teacher" || normalizedRole === "hod" || normalizedRole.includes("faculty") || normalizedRole.includes("lecturer");
  const isParent = normalizedRole === "parent" || normalizedRole.includes("parent");
  const isExamCell = isExamCellRole(normalizedRole) || normalizedRole.includes("exam");

=======
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
  const staffId = data.StaffId || data.staffId || payload.StaffId || payload.staffId || jwtClaims.StaffId || jwtClaims.staffId || null;
  const employeeId = data.EmployeeId || data.employeeId || payload.EmployeeId || payload.employeeId || jwtClaims.EmployeeId || jwtClaims.employeeId || null;
  const designation =
    data.Designation ||
    data.designation ||
    data.DesignationName ||
    data.designationName ||
    payload.Designation ||
    payload.designation ||
    jwtClaims.Designation ||
    jwtClaims.designation ||
    jwtClaims.DesignationName ||
    jwtClaims.designationName ||
    "";

  const isWarden =
    normalizedRole.includes("warden") ||
    String(designation || "").toLowerCase().includes("warden");
  const isFaculty =
    !isWarden &&
    (normalizedRole === "faculty" || normalizedRole === "teacher" || normalizedRole === "hod" || normalizedRole.includes("faculty") || normalizedRole.includes("lecturer"));
  const isParent =
    !isWarden &&
    (normalizedRole === "parent" || normalizedRole.includes("parent"));
  const userName = data.Name || data.name || data.fullName || payload.Name || payload.name || payload.fullName || jwtClaims.unique_name || jwtClaims.name || jwtClaims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || "Staff Member";

  const rawEmail = data.Email || data.email || payload.Email || payload.email || jwtClaims.email || jwtClaims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || enteredEmail;
  const userEmail = Array.isArray(rawEmail) ? String(rawEmail[0] || "").trim() : String(rawEmail || "").trim();

  const rawAssignedCampusIds =
    data.AssignedCampusIds ||
    data.assignedCampusIds ||
    payload.AssignedCampusIds ||
    payload.assignedCampusIds ||
    [];
  const rawAssignedBoardIds =
    data.AssignedBoardIds ||
    data.assignedBoardIds ||
    payload.AssignedBoardIds ||
    payload.assignedBoardIds ||
    [];
  const assignedCampusIds = Array.isArray(rawAssignedCampusIds)
    ? rawAssignedCampusIds.map(Number).filter(Boolean)
    : [];
  const assignedBoardIds = Array.isArray(rawAssignedBoardIds)
    ? rawAssignedBoardIds.map(Number).filter(Boolean)
    : [];

  const user = {
    id: data.AdminId || data.adminId || data.UserId || data.userId || data.id || data.Id || payload.AdminId || payload.adminId || payload.UserId || payload.userId || payload.id || payload.Id,
    staffId: staffId ? (Number(staffId) || staffId) : null,
    employeeId: employeeId || null,
    name: userName,
    fullName: userName,
    email: userEmail,
    role: Array.isArray(role) ? role[0] : role,
    designation,
    isAdmin,
    assignedCampusIds,
    assignedBoardIds,
  };

  return {
    token,
    user,
<<<<<<< HEAD
    roleType: isAdmin ? "admin" : isExamCell ? "examcell" : isFaculty ? "faculty" : isParent ? "parent" : "student",
=======
    roleType: isWarden ? "warden" : isAdmin ? "admin" : isFaculty ? "faculty" : isParent ? "parent" : "student",
>>>>>>> 3b18ecc3b23a3cb2390d6d311d6b17d68d7f6402
    message: getMessage(payload, data, "Login successful."),
  };
}

function getData(payload) {
  return payload?.data || payload?.Data || payload || {};
}

function getMessage(payload, data, fallback) {
  return payload?.message || payload?.Message || data?.message || data?.Message || fallback;
}

function assertSuccessful(payload, data) {
  const status = payload?.status ?? payload?.Status ?? data?.status ?? data?.Status;
  const success = payload?.success ?? payload?.Success ?? data?.success ?? data?.Success;
  if (isFalseResponseFlag(status) || isFalseResponseFlag(success)) {
    const error = new Error(getMessage(payload, data, "Invalid login credentials."));
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }
}

function isFalseResponseFlag(value) {
  return value === false || value === 0 || String(value).trim().toLowerCase() === "false";
}

function getToken(payload, data) {
  return (
    payload?.AccessToken ||
    payload?.accessToken ||
    payload?.Token ||
    payload?.token ||
    payload?.jwt ||
    data?.AccessToken ||
    data?.accessToken ||
    data?.Token ||
    data?.token ||
    data?.jwt
  );
}

function normalizeToken(token) {
  return token ? String(token).replace(/^Bearer\s+/i, "").trim() : "";
}

function logLoginSelection(endpoint, emailOrMobile) {
  if (!import.meta.env.DEV) return;
  console.log("Login selected endpoint:", endpoint);
  console.log("Login email/mobile:", emailOrMobile);
}

function logLoginResponse(status) {
  if (!import.meta.env.DEV) return;
  console.log("Login response status:", status);
}
