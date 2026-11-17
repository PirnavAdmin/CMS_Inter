import apiClient, { getApiErrorMessage } from "./apiClient.js";

export const superAdminApi = {
  // 0. Bootstrap Hydration
  getBootstrap: async () => {
    const res = await apiClient.get("/api/v1/super-admin/bootstrap");
    return res.data?.data || res.data;
  },

  // 1. Dashboard Summary
  getDashboard: async () => {
    const res = await apiClient.get("/api/v1/super-admin/dashboard");
    return res.data?.data || res.data;
  },

  // 2. Colleges & Registrations
  getColleges: async (params = {}) => {
    const res = await apiClient.get("/api/v1/super-admin/colleges", { params });
    return res.data;
  },
  getCollegeById: async (id) => {
    const res = await apiClient.get(`/api/v1/super-admin/colleges/${encodeURIComponent(id)}`);
    return res.data?.data || res.data;
  },
  createCollege: async (payload) => {
    const res = await apiClient.post("/api/v1/super-admin/colleges", payload);
    return res.data;
  },
  updateCollege: async (id, payload) => {
    const res = await apiClient.put(`/api/v1/super-admin/colleges/${encodeURIComponent(id)}`, payload);
    return res.data;
  },
  updateCollegeStatus: async (id, status) => {
    const res = await apiClient.patch(`/api/v1/super-admin/colleges/${encodeURIComponent(id)}/status`, { status });
    return res.data;
  },

  // 3. College Administrators
  getCollegeAdmins: async (collegeId) => {
    const res = await apiClient.get("/api/v1/super-admin/college-admins", {
      params: collegeId ? { collegeId } : {},
    });
    return res.data?.data || res.data;
  },
  createCollegeAdmin: async (payload) => {
    const res = await apiClient.post("/api/v1/super-admin/college-admins", payload);
    return res.data;
  },
  updateCollegeAdmin: async (id, payload) => {
    const res = await apiClient.put(`/api/v1/super-admin/college-admins/${encodeURIComponent(id)}`, payload);
    return res.data;
  },
  resendCollegeAdminCredentials: async (id) => {
    const res = await apiClient.post(`/api/v1/super-admin/college-admins/${encodeURIComponent(id)}/resend-credentials`);
    return res.data;
  },

  // 4. Global Users
  getGlobalUsers: async (params = {}) => {
    const res = await apiClient.get("/api/v1/super-admin/global-users", { params });
    return res.data;
  },
  getGlobalUserById: async (id) => {
    const res = await apiClient.get(`/api/v1/super-admin/global-users/${encodeURIComponent(id)}`);
    return res.data?.data || res.data;
  },
  updateUserStatus: async (id, status) => {
    const res = await apiClient.patch(`/api/v1/super-admin/global-users/${encodeURIComponent(id)}/status`, { status });
    return res.data;
  },
  resetUserPassword: async (id, newPassword) => {
    const res = await apiClient.post(`/api/v1/super-admin/global-users/${encodeURIComponent(id)}/reset-password`, { newPassword });
    return res.data;
  },

  // 5. Subscription Plans
  getPlans: async () => {
    const res = await apiClient.get("/api/v1/super-admin/plans");
    return res.data?.data || res.data;
  },
  savePlan: async (payload, planId = null) => {
    const res = await apiClient.post("/api/v1/super-admin/plans", payload, {
      params: planId ? { planId } : {},
    });
    return res.data;
  },
  updatePlanStatus: async (id, status) => {
    const res = await apiClient.patch(`/api/v1/super-admin/plans/${encodeURIComponent(id)}/status`, { status });
    return res.data;
  },

  // 6. College Subscriptions
  getSubscriptions: async () => {
    const res = await apiClient.get("/api/v1/super-admin/subscriptions");
    return res.data?.data || res.data;
  },
  changeCollegePlan: async (collegeId, planName) => {
    const res = await apiClient.post(`/api/v1/super-admin/colleges/${encodeURIComponent(collegeId)}/subscription/change`, { planName });
    return res.data;
  },
  renewCollegeSubscription: async (collegeId, extensionDays = 30) => {
    const res = await apiClient.post(`/api/v1/super-admin/colleges/${encodeURIComponent(collegeId)}/subscription/renew?extensionDays=${extensionDays}`);
    return res.data;
  },
  cancelCollegeSubscription: async (collegeId) => {
    const res = await apiClient.post(`/api/v1/super-admin/colleges/${encodeURIComponent(collegeId)}/subscription/cancel`);
    return res.data;
  },

  // 7. Account Usage
  getAccountUsage: async () => {
    const res = await apiClient.get("/api/v1/super-admin/account-usage");
    return res.data?.data || res.data;
  },

  // 8. Renewals
  getRenewals: async (daysThreshold = 30, params = {}) => {
    const res = await apiClient.get("/api/v1/super-admin/renewals", {
      params: { daysThreshold, ...params },
    });
    return res.data;
  },

  // 9. Payments & Invoices
  getPaymentsAndInvoices: async () => {
    const res = await apiClient.get("/api/v1/super-admin/payments-invoices");
    return res.data?.data || res.data;
  },
  verifyPayment: async (paymentId) => {
    const res = await apiClient.post(`/api/v1/super-admin/payments/${encodeURIComponent(paymentId)}/verify`);
    return res.data;
  },

  // 10. Module Management Matrix
  getPlanModuleMatrix: async () => {
    const res = await apiClient.get("/api/v1/super-admin/modules");
    return res.data?.data || res.data;
  },
  updatePlanModule: async (planId, moduleName, isEnabled) => {
    const res = await apiClient.put("/api/v1/super-admin/modules", { planId, moduleName, isEnabled });
    return res.data;
  },

  // 11. Platform Notifications
  getNotifications: async (params = {}) => {
    const res = await apiClient.get("/api/v1/super-admin/notifications", { params });
    return res.data?.data || res.data;
  },
  createNotification: async (payload) => {
    const res = await apiClient.post("/api/v1/super-admin/notifications", payload);
    return res.data;
  },
  markNotificationRead: async (id) => {
    const res = await apiClient.patch(`/api/v1/super-admin/notifications/${encodeURIComponent(id)}/read`);
    return res.data;
  },

  // 12. Audit Logs
  getAuditLogs: async (params = {}) => {
    const res = await apiClient.get("/api/v1/super-admin/audit-logs", { params });
    return res.data;
  },

  // 13. Global Platform Settings
  getSettings: async () => {
    const res = await apiClient.get("/api/v1/super-admin/settings");
    return res.data?.data || res.data;
  },
  updateSettings: async (settings) => {
    const res = await apiClient.put("/api/v1/super-admin/settings", settings);
    return res.data;
  },

  // 14. Super Admin Profile
  getProfile: async () => {
    const res = await apiClient.get("/api/v1/super-admin/profile");
    return res.data?.data || res.data;
  },

  // 15. Change Password
  changePassword: async (currentPassword, newPassword) => {
    const res = await apiClient.post("/api/v1/super-admin/change-password", { currentPassword, newPassword });
    return res.data;
  },
};

export { getApiErrorMessage };
export default superAdminApi;
