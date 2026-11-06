import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import superAdminApi, { getApiErrorMessage } from "@/api/superAdminApi.js";
import { MODULES } from "./superAdminPreview.js";

const Context = createContext(null);

const emptyState = () => ({
  colleges: [],
  registrations: [],
  users: [],
  plans: [],
  payments: [],
  activities: [],
  settings: { platformName: "PIRNAV CMS", supportEmail: "support@example.test", renewalDays: 30 },
  notifications: [],
  readNotificationIds: [],
});

function normalizeLiveData(res) {
  const data = emptyState();
  if (!res || typeof res !== "object") return data;

  // 1. Plans
  data.plans = (res.plans ?? []).map((plan) => ({
    id: plan.planId || plan.id || plan.name,
    planId: plan.planId || plan.id || 0,
    name: plan.name,
    description: plan.description || "",
    price: Number(plan.price || 0),
    limit: Number(plan.limit || 0),
    durationDays: Number(plan.durationDays || 30),
    active: plan.active !== false,
    modules: Array.isArray(plan.modules) ? plan.modules : [],
  }));

  // 2. Global Users & College Admins
  data.users = (res.users ?? []).map((user) => {
    const active = Boolean(user.active || user.accountStatus === "Active");
    return {
      id: String(user.id || user.userId || ""),
      userId: Number(user.userId || user.id || 0),
      name: user.name || user.fullName || "User",
      fullName: user.name || user.fullName || "User",
      email: user.email || "",
      phone: user.phone || "",
      collegeId: user.collegeId ? String(user.collegeId) : null,
      collegeName: user.collegeName || "Platform",
      role: user.role || "User",
      active,
      loginEnabled: user.loginEnabled !== false,
      accountStatus: active ? "Active" : "Inactive",
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt || null,
    };
  });

  // 3. Colleges
  data.colleges = (res.colleges ?? []).map((college) => {
    const id = String(college.id || college.collegeId || "");
    const status = college.status || college.collegeStatus || "Active";
    return {
      ...college,
      id,
      collegeId: Number(college.collegeId || college.id || 0),
      name: college.name || "",
      code: college.code || "",
      email: college.email || "",
      phone: college.phone || "",
      address: college.address || "",
      logo: college.logo || "",
      admin: college.admin || "",
      plan: college.plan || "Free",
      status,
      collegeStatus: status,
      registered: college.registered ? String(college.registered).slice(0, 10) : "",
      renewal: college.renewal ? String(college.renewal).slice(0, 10) : "",
      activeAccounts: Number(college.activeAccounts || 0),
      accountLimit: Number(college.accountLimit || 0),
    };
  });

  // 4. Registrations (Pending or explicit registration applications)
  data.registrations = (res.registrations ?? []).map((reg) => ({
    id: String(reg.id || reg.collegeId || ""),
    collegeId: reg.collegeId ? String(reg.collegeId) : null,
    name: reg.name || "",
    code: reg.code || "",
    email: reg.email || "",
    contact: reg.phone || reg.contact || "",
    applicantName: reg.applicantName || reg.admin || "",
    applicantEmail: reg.applicantEmail || reg.email || "",
    plan: reg.plan || "Free",
    registrationStatus: reg.registrationStatus || reg.status || "Pending",
    submittedAt: reg.submittedAt || reg.registered || null,
    reviewedAt: reg.reviewedAt || null,
  }));

  // Auto-fill registrations from colleges that have Pending or Rejected status
  data.colleges.forEach((c) => {
    if ((c.status === "Pending" || c.status === "Rejected") && !data.registrations.some((r) => r.id === c.id)) {
      data.registrations.push({
        id: c.id,
        collegeId: c.status === "Approved" ? c.id : null,
        name: c.name,
        code: c.code,
        email: c.email,
        contact: c.phone || "",
        applicantName: c.admin || c.name,
        applicantEmail: c.email,
        plan: c.plan || "Free",
        registrationStatus: c.status,
        submittedAt: c.registered || null,
        reviewedAt: null,
      });
    }
  });

  // 5. Payments & Invoices
  data.payments = (res.payments ?? []).map((p) => ({
    id: String(p.id || p.paymentId || ""),
    paymentId: Number(p.paymentId || p.id || 0),
    invoice: p.invoice || `INV-${p.id || p.paymentId}`,
    collegeId: String(p.collegeId || ""),
    collegeName: p.collegeName || "",
    amount: Number(p.amount || 0),
    date: p.date ? String(p.date).slice(0, 10) : "",
    status: p.status || "Paid",
    paymentMethod: p.paymentMethod || "Online",
    transactionReference: p.transactionReference || "",
  }));

  // 6. Platform Audit Activities
  data.activities = (res.activities ?? []).map((a) => ({
    id: String(a.id || a.auditLogId || crypto.randomUUID()),
    auditLogId: Number(a.auditLogId || 0),
    message: a.message || "",
    performedBy: a.performedBy || "Super Admin",
    module: a.module || "",
    college: a.college || "Platform Global",
    collegeId: a.collegeId ? String(a.collegeId) : null,
    at: a.at || new Date().toISOString(),
    actionType: a.actionType || "Action",
    status: a.status || "Success",
    scope: a.scope || "Platform",
    details: a.details || null,
  }));

  // 7. Global Platform Settings
  data.settings = {
    platformName: res.settings?.platformName || "PIRNAV CMS",
    supportEmail: res.settings?.supportEmail || "support@example.test",
    renewalDays: Number(res.settings?.renewalDays ?? 30),
  };

  // 8. Notifications
  data.notifications = (res.notifications ?? []).map((n) => ({
    id: String(n.id || n.notificationId || crypto.randomUUID()),
    notificationId: Number(n.notificationId || 0),
    title: n.title || "",
    message: n.message || "",
    category: n.category || "System Alerts",
    date: n.date || "",
    status: n.status || "Delivered",
    recipientScope: n.recipientScope || "Platform",
    read: n.read || "Unread",
  }));

  data.readNotificationIds = data.notifications
    .filter((n) => n.read === "Read")
    .map((n) => n.id);

  return data;
}

export default function SuperAdminProvider({ session, children }) {
  const [data, setData] = useState(() => emptyState());
  const latest = useRef(data);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLivePlatformData = useCallback(async () => {
    try {
      const res = await superAdminApi.getBootstrap();
      if (res) {
        const normalized = normalizeLiveData(res);
        latest.current = normalized;
        setData(normalized);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to load platform data from API:", err);
      setMessage(getApiErrorMessage(err));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLivePlatformData();
  }, [loadLivePlatformData]);

  const update = async (label, action, details = {}) => {
    setMessage("");
    try {
      let apiResult = null;
      const mod = details?.module;
      const act = details?.actionType;

      // 1. Colleges
      if (mod === "Colleges") {
        if (act === "Status change" && details.collegeId) {
          const current = latest.current.colleges.find(
            (c) => c.id === String(details.collegeId) || c.collegeId === Number(details.collegeId)
          );
          const nextStatus = current?.status === "Active" ? "Inactive" : "Active";
          apiResult = await superAdminApi.updateCollegeStatus(details.collegeId, nextStatus);
        } else if (act === "Create") {
          const payload = details.payload || details.newValues || {};
          apiResult = await superAdminApi.createCollege(payload);
        } else if (act === "Update" && (details.collegeId || details.payload?.id)) {
          const cid = details.collegeId || details.payload?.id;
          const payload = details.payload || details.newValues || {};
          apiResult = await superAdminApi.updateCollege(cid, payload);
        }
      }
      // 2. Registrations
      else if (mod === "Registrations") {
        if (act === "Approved" || act === "Rejected") {
          const cid = details.collegeId || details.id;
          apiResult = await superAdminApi.updateCollegeStatus(cid, act === "Approved" ? "Active" : "Inactive");
        } else if (act === "Create" || act === "Update") {
          const form = details.payload || details.newValues || {};
          apiResult = await superAdminApi.createCollege({ ...form, status: "Pending" });
        }
      }
      // 3. College Admins
      else if (mod === "College Admins") {
        if (act === "Create" || act === "Assign / Update") {
          const payload = details.payload || details.newValues || {};
          apiResult = await superAdminApi.createCollegeAdmin({
            name: payload.name,
            email: payload.email,
            collegeId: Number(payload.collegeId),
          });
        } else if (act === "Access change" && details.userId) {
          const payload = details.payload || details.newValues || {};
          const status = payload.active ? "Active" : "Inactive";
          apiResult = await superAdminApi.updateUserStatus(details.userId, status);
        }
      }
      // 4. Subscriptions
      else if (mod === "Subscriptions") {
        const cid = details.collegeId;
        if (act === "Changed subscription") {
          const planName = details.newValues?.plan || details.planName;
          apiResult = await superAdminApi.changeCollegePlan(cid, planName);
        } else if (act === "Renewed subscription") {
          apiResult = await superAdminApi.renewCollegeSubscription(cid, 30);
        } else if (act === "Cancelled subscription") {
          apiResult = await superAdminApi.cancelCollegeSubscription(cid);
        }
      }
      // 5. Plans
      else if (mod === "Plans") {
        if (act === "Create" || act === "Update") {
          const payload = details.payload || details.newValues || {};
          const planId = details.planId || payload.planId || null;
          apiResult = await superAdminApi.savePlan(payload, planId);
        } else if (act === "Status change" && (details.planId || details.id)) {
          const pid = details.planId || details.id;
          const currentPlan = latest.current.plans.find((p) => p.id === pid || p.planId === pid);
          const nextStatus = currentPlan?.active ? "Inactive" : "Active";
          apiResult = await superAdminApi.updatePlanStatus(pid, nextStatus);
        }
      }
      // 6. Module Management
      else if (mod === "Module Management") {
        const draftPlans = details.draft || details.newValues || [];
        for (const p of draftPlans) {
          if (p.planId) {
            for (const modName of MODULES) {
              const isEnabled = p.modules.includes(modName);
              await superAdminApi.updatePlanModule(p.planId, modName, isEnabled);
            }
          }
        }
        apiResult = { success: true, message: "Plan modules updated successfully." };
      }
      // 7. Settings
      else if (mod === "Settings") {
        const payload = details.payload || details.newValues || details.settings || {};
        apiResult = await superAdminApi.updateSettings(payload);
      }
      // 8. Notifications
      else if (mod === "Notifications") {
        if (act === "Draft") {
          const payload = details.payload || details.newValues || {};
          apiResult = await superAdminApi.createNotification({
            title: payload.title || "Platform Broadcast",
            message: payload.message,
            category: payload.category || "System Alerts",
          });
        } else if (act === "Read" && (details.id || details.notificationId)) {
          const nid = details.id || details.notificationId;
          apiResult = await superAdminApi.markNotificationRead(nid);
        }
      }

      // If action is a synchronous preview transformer function, execute as fallback/optimistic
      if (typeof action === "function") {
        try {
          const next = action(latest.current);
          if (next) {
            latest.current = next;
            setData(next);
          }
        } catch {
          /* optimistic failure tolerated */
        }
      }

      // Re-fetch authoritative state from backend API
      await loadLivePlatformData();
      setMessage(apiResult?.message || `${label} completed successfully.`);
      return true;
    } catch (err) {
      console.error(`SuperAdmin operation failed during "${label}":`, err);
      setMessage(getApiErrorMessage(err));
      return false;
    }
  };

  const refresh = async () => {
    const success = await loadLivePlatformData();
    if (success) {
      setMessage("Platform data refreshed successfully from database.");
    }
    return success;
  };

  return (
    <Context.Provider
      value={{
        session,
        data,
        loading,
        update,
        refresh,
        message,
        clearMessage: () => setMessage(""),
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useSuperAdmin = () => useContext(Context);
