import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { BACKEND_ADMIN_JWT, BACKEND_PARENT_JWT, BACKEND_EXAM_CELL_JWT, BACKEND_NON_TEACHING_JWT, BACKEND_TRANSPORT_MANAGER_JWT } from "@/modules/auth/authStorage.js";
import { isExamCellRole } from "@/modules/exam-cell/navigation.js";


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

  // 1. Isolated development mock authentication for Non-Teaching Staff
  const nonTeachingAccount = findNonTeachingAccount(emailOrMobile, password);
  if (nonTeachingAccount) {
    return {
      token: BACKEND_NON_TEACHING_JWT,
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

  // 3. Direct authentication for integrated Parent accounts
  const parentAccount = findParentAccount(emailOrMobile);
  if (parentAccount && password) {
    let valid = true;
    try {
      const savedMap = typeof window !== "undefined" ? JSON.parse(window.localStorage.getItem("cms-parent-passwords") || "{}") : {};
      const savedPass = savedMap?.[parentAccount.id];
      if (savedPass && password !== savedPass) {
        valid = false;
      }
    } catch (_e) {
      // storage unavailable
    }
    if (!valid) {
      const err = new Error("Invalid username or password.");
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }
    return {
      token: BACKEND_PARENT_JWT,
      user: parentAccount,
      roleType: "parent",
      message: "Login successful.",
    };
  }

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
  const isTransportManagerCandidate =
    normInput === "pondara.venkatesh@pirnav.com" ||
    normInput === "transport" ||
    normInput === "transportmanager" ||
    normInput === "transport-manager" ||
    normInput === "mnt0044" ||
    normInput.includes("transport");
  const isKnownOffline = typeof window !== "undefined" && window.localStorage?.getItem("cms_backend_offline") === "true";

  if (isTransportManagerCandidate && isKnownOffline && password) {
    const tmAccount = findTransportManagerAccount(emailOrMobile, password);
    if (tmAccount) {
      return {
        token: BACKEND_TRANSPORT_MANAGER_JWT,
        user: tmAccount,
        roleType: "transport_manager",
        message: "Transport Manager login successful.",
      };
    }
  }

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
        campusId: 1,
        assignedCampusIds: [1],
        assignedBoardIds: [1],
      },
      roleType: "examcell",
      message: "Exam Cell login successful.",
    };
  }
  logLoginSelection(apiEndpoints.auth.login, emailOrMobile);
  try {
    const response = await userLogin({ emailOrMobile, password });
    logLoginResponse(response.status);
    return normalizeLoginResponse(response.data, emailOrMobile);
  } catch (authError) {
    // If the server explicitly rejected the credentials, DO NOT fallback to mock accounts!
    const isExplicitRejection =
      authError?.code === "INVALID_CREDENTIALS" ||
      authError?.response?.data?.status === false ||
      authError?.response?.data?.Status === false ||
      authError?.response?.data?.success === false ||
      authError?.response?.data?.Success === false ||
      [400, 401, 403].includes(Number(authError?.response?.status));

    if (isExplicitRejection) {
      throw authError;
    }

    // If the auth endpoint failed due to 404 and it's an admin email, fallback to admin login
    if (authError?.response?.status === 404 && apiEndpoints.admin?.login) {
      try {
        logLoginSelection(apiEndpoints.admin.login, emailOrMobile);
        const fallbackResponse = await adminLogin({ email: emailOrMobile, password });
        logLoginResponse(fallbackResponse.status);
        return normalizeLoginResponse(fallbackResponse.data, emailOrMobile, "admin");
      } catch (adminError) {
        if (
          adminError?.code === "INVALID_CREDENTIALS" ||
          adminError?.response?.data?.status === false ||
          adminError?.response?.data?.Status === false ||
          [400, 401, 403].includes(Number(adminError?.response?.status))
        ) {
          throw adminError;
        }
      }
    }

    // Only allow offline development mock fallback if the backend is strictly unreachable (network error/connection refused)
    const isNetworkError =
      authError?.code === "ERR_NETWORK" ||
      authError?.message === "Network Error" ||
      !authError?.response;

    if (isNetworkError) {
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
        try {
          const passMap = JSON.parse(typeof window !== "undefined" ? window.localStorage?.getItem("cms_user_passwords") || "{}" : "{}");
          const savedPass = passMap["anusha987r@gmail.com"] || passMap["examcell"] || passMap[emailOrMobile.toLowerCase()];
          if (savedPass && password !== savedPass) {
            const err = new Error("Invalid username or password.");
            err.code = "INVALID_CREDENTIALS";
            throw err;
          }
        } catch (e) {
          if (e.code === "INVALID_CREDENTIALS") throw e;
        }

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

      if (isTransportManagerCandidate && password) {
        const tmAccount = findTransportManagerAccount(emailOrMobile, password);
        if (tmAccount) {
          return {
            token: BACKEND_TRANSPORT_MANAGER_JWT,
            user: tmAccount,
            roleType: "transport_manager",
            message: "Transport Manager login successful.",
          };
        }
      }
    }

    throw authError;
  }
};

export const changePassword = async ({ currentPassword, oldPassword, newPassword, confirmPassword, confirmNewPassword }) => {
  const actualOldPassword = currentPassword || oldPassword;
  const actualConfirmPassword = confirmNewPassword || confirmPassword;
  const payload = {
    oldPassword: actualOldPassword,
    currentPassword: actualOldPassword,
    newPassword,
    confirmNewPassword: actualConfirmPassword,
    confirmPassword: actualConfirmPassword,
  };
  return apiClient.post(apiEndpoints.auth.changePassword, payload);
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

export function findTransportManagerAccount(input, password) {
  const val = String(input || "").trim().toLowerCase();
  const digits = val.replace(/\D/g, "");
  const isMatch =
    val === "pondara.venkatesh@pirnav.com" ||
    val === "transport.manager@pirnav.edu" ||
    val === "transport" ||
    val === "transportmanager" ||
    val === "transport-manager" ||
    val === "mnt0044" ||
    digits === "7799352436";

  if (!isMatch) return null;

  if (password && val === "pondara.venkatesh@pirnav.com") {
    if (password !== "A9WhhFU5@#fLQx") {
      const err = new Error("Invalid username or password. Please try again.");
      err.code = "INVALID_CREDENTIALS";
      throw err;
    }
  }

  return {
    id: 928,
    userId: 928,
    staffId: 1125,
    facultyId: 1125,
    employeeId: "MNT0044",
    firstName: "muzan",
    lastName: "kibutsuzi",
    name: "muzan kibutsuzi",
    fullName: "muzan kibutsuzi",
    email: "pondara.venkatesh@pirnav.com",
    role: "Transport Manager",
    designation: "Transport Manager",
    designationId: 534,
    department: "Transport",
    departmentId: 79,
    staffType: "Non-Teaching",
    facultyType: "Non-Teaching",
    campusId: 1,
    boardId: 1,
    boardCode: "BIEAP",
    boardName: "Board of Intermediate Education, Andhra Pradesh",
    mobile: "7799352436",
    bloodGroup: "O+",
    currentAddress: "hyderabad,telangana",
    city: "Srikakulam",
    district: "Srikakulam",
    state: "Andhra Pradesh",
    pin: "532201",
    pincode: "532201",
    country: "India",
    qualification: "Graduate",
    dateOfJoining: "2026-08-01T00:00:00",
    experience: 0.0,
    employmentType: "Full Time",
    status: "Active",
    isDriver: true,
    drivingLicenseNumber: "DAKH345678JNKJAB",
    drivingLicenseExpiryDate: "2028-07-01T00:00:00",
  };
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
    id: "1122",
    staffId: 1122,
    userId: 1122,
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
    const errorMsg = getMessage(payload, data, "Authentication failed because the server did not return an access token.");
    const error = new Error(errorMsg);
    error.code = "INVALID_CREDENTIALS";
    error.response = { data: payload, status: 401 };
    throw error;
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
  const roleNames = [
    data.Role, data.role, data.RoleName, data.roleName, data.Roles, data.roles,
    data.user?.role, data.user?.roleName, data.user?.roles,
    payload.Role, payload.role, payload.RoleName, payload.roleName,
    payload.user?.role, payload.user?.roleName, payload.user?.roles, jwtRole,
  ].flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => typeof value === "object" && value ? value.roleName || value.RoleName || value.name || value.Name || value.code : value)
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());
  const inventoryRole = roleNames.find((name) => /inventory/i.test(name) || ["storemanager", "storekeeper"].includes(name.toLowerCase().replace(/[\s_-]/g, "")));
  const role = inventoryRole ? "Inventory Manager" : roleNames[0];
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
  const isExamCell = isExamCellRole(normalizedRole) || normalizedRole.includes("exam");
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

  const isTransportManager =
    normalizedRole.includes("transport_manager") ||
    normalizedRole.includes("transport-manager") ||
    normalizedRole.includes("transport manager") ||
    normalizedRole === "transport" ||
    String(designation || "").toLowerCase().includes("transport manager") ||
    String(designation || "").toLowerCase().includes("transport_manager");
  const isWarden =
    !isTransportManager &&
    (normalizedRole.includes("warden") ||
      String(designation || "").toLowerCase().includes("warden"));
  const isFaculty =
    !isTransportManager &&
    !isWarden &&
    (normalizedRole === "faculty" || normalizedRole === "teacher" || normalizedRole === "hod" || normalizedRole.includes("faculty") || normalizedRole.includes("lecturer"));
  const isParent =
    !isTransportManager &&
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

  const photoUrl =
    data.PhotoUrl ||
    data.photoUrl ||
    data.PhotoPath ||
    data.photoPath ||
    data.ProfilePhoto ||
    data.profilePhoto ||
    data.photo ||
    data.Photo ||
    payload.PhotoUrl ||
    payload.photoUrl ||
    payload.PhotoPath ||
    payload.photoPath ||
    data.user?.photoUrl ||
    payload.user?.photoUrl ||
    data.user?.photoPath ||
    payload.user?.photoPath ||
    data.user?.photo ||
    payload.user?.photo ||
    "";

  const user = {
    id: data.UserId || data.userId || payload.UserId || payload.userId || data.user?.userId || payload.user?.userId || data.AdminId || data.adminId || data.id || data.Id || payload.AdminId || payload.adminId || payload.id || payload.Id,
    userId: data.UserId || data.userId || payload.UserId || payload.userId || data.user?.userId || payload.user?.userId || (isTransportManager ? 928 : null),
    staffId: staffId ? (Number(staffId) || staffId) : (data.user?.staffId || payload.user?.staffId || (isTransportManager ? 1125 : null)),
    employeeId: employeeId || data.user?.employeeId || payload.user?.employeeId || (isTransportManager ? "MNT0044" : null),
    staffType: data.StaffType || data.staffType || payload.StaffType || payload.staffType || data.user?.staffType || payload.user?.staffType || (isTransportManager ? "Non-Teaching" : null),
    name: userName,
    fullName: userName,
    email: userEmail,
    role: Array.isArray(role) ? role[0] : role,
    roles: [...new Set(roleNames)],
    designation,
    department: data.Department || data.department || payload.Department || payload.department || (isTransportManager ? "Transport" : ""),
    campusId: data.CampusId || data.campusId || payload.CampusId || payload.campusId || (assignedCampusIds[0] || (isTransportManager ? 1 : null)),
    boardId: data.BoardId || data.boardId || payload.BoardId || payload.boardId || (assignedBoardIds[0] || (isTransportManager ? 1 : null)),
    isAdmin,
    assignedCampusIds,
    assignedBoardIds,
    photoUrl: photoUrl || null,
    photoPath: photoUrl || null,
    profilePhoto: photoUrl || null,
    photo: photoUrl || null,
  };


  return {
    token,
    user,
    roleType: inventoryRole ? "inventory" : isWarden ? "warden" : isAdmin ? "admin" : isExamCell ? "examcell" : isFaculty ? "faculty" : isParent ? "parent" : "student",
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
  const statusCode = Number(payload?.statusCode ?? payload?.StatusCode ?? data?.statusCode ?? data?.StatusCode);
  if (isFalseResponseFlag(status) || isFalseResponseFlag(success) || statusCode >= 400) {
    const errorMsg = getMessage(payload, data, "Invalid Email or Password");
    const error = new Error(errorMsg);
    error.code = "INVALID_CREDENTIALS";
    error.response = { data: payload, status: statusCode || 401 };
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
