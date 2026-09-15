import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";

const ADMIN_EMAIL = "admin@cms.com";
const PASSWORD_RESET_CONTEXT_KEY = "cms-password-reset-context";
const ACCOUNT_TYPES = new Set(["admin", "user"]);

export const adminLogin = (data) =>
  apiClient.post(apiEndpoints.admin.login, {
    email: data.email,
    password: data.password,
  });

export const userLogin = (data) =>
  apiClient.post(apiEndpoints.auth.login, {
    emailOrMobile: data.emailOrMobile,
    password: data.password,
  });

export const loginUser = async (credentials) => {
  const emailOrMobile = String(credentials.emailOrMobile || "").trim();
  const password = credentials.password;
  const isAdminLogin = emailOrMobile.toLowerCase() === ADMIN_EMAIL;

  if (isAdminLogin) {
    logLoginSelection(apiEndpoints.admin.login, emailOrMobile);
    const response = await adminLogin({ email: emailOrMobile, password });
    logLoginResponse(response.status);
    return normalizeLoginResponse(response.data, emailOrMobile, "admin");
  }

  logLoginSelection(apiEndpoints.auth.login, emailOrMobile);
  const response = await userLogin({ emailOrMobile, password });
  logLoginResponse(response.status);
  return normalizeLoginResponse(response.data, emailOrMobile);
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

function normalizeLoginResponse(payload = {}, enteredEmail, expectedAccountType = "user") {
  const data = getData(payload);
  assertSuccessful(payload, data);

  const token = normalizeToken(getToken(payload, data));
  if (!token) {
    throw new Error("Authentication failed because the server did not return an access token.");
  }

  const role = data.Role || data.role || payload.Role || payload.role;
  if (!role) {
    throw new Error("Authentication failed because the server returned an invalid user response.");
  }
  const normalizedRole = String(role).trim().toLowerCase();
  const isAdmin = normalizedRole === "admin" || normalizedRole === "super admin";
  if (expectedAccountType === "admin" && !isAdmin) {
    throw new Error("Authentication failed because the server returned an invalid admin response.");
  }
  const user = {
    id: data.AdminId || data.adminId || data.UserId || data.userId || data.id || data.Id || payload.AdminId || payload.adminId || payload.UserId || payload.userId || payload.id || payload.Id,
    name: data.Name || data.name || data.fullName || payload.Name || payload.name || payload.fullName || "CMS User",
    email: data.email || data.Email || payload.email || payload.Email || enteredEmail,
    role,
    isAdmin,
  };

  return {
    token,
    user,
    roleType: user.isAdmin ? "admin" : "student",
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
