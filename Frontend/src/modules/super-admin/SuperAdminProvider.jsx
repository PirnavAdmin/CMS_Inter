import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import superAdminApi, { getApiErrorMessage } from "@/api/superAdminApi.js";
import { MODULES } from "./superAdminPreview.js";

const Context = createContext(null);
const emptyState = () => ({
  colleges: [], registrations: [], users: [], collegeAdmins: [], plans: [], payments: [],
  activities: [], notifications: [], readNotificationIds: [], subscriptions: [], renewals: [],
  accountUsage: [], moduleMatrix: [], dashboard: {}, profile: null,
  settings: { platformName: "PIRNAV CMS", supportEmail: "", renewalDays: 30 },
});

const unwrap = (value) => value?.data?.data ?? value?.data ?? value;
const list = (value, ...keys) => {
  const item = unwrap(value);
  if (Array.isArray(item)) return item;
  for (const key of [...keys, "items", "results", "records", "rows"]) {
    if (Array.isArray(item?.[key])) return item[key];
  }
  return [];
};
const record = (value, ...keys) => {
  const item = unwrap(value);
  if (!item || typeof item !== "object") return {};
  for (const key of keys) if (item[key] && typeof item[key] === "object") return item[key];
  return item;
};
const idOf = (row) => String(row?.id ?? row?.collegeId ?? row?.userId ?? row?.planId ?? row?.paymentId ?? "");

function normalizeLiveData(sources) {
  const data = emptyState();
  const bootstrap = record(sources.bootstrap);
  const choose = (source, fallback, ...keys) => {
    const rows = list(source, ...keys);
    return rows.length || source?.ok ? rows : list(fallback, ...keys);
  };
  data.colleges = choose(sources.colleges, bootstrap, "colleges").map((row) => {
    const status = row.status ?? row.collegeStatus ?? "Active";
    return { ...row, id: idOf(row), collegeId: Number(row.collegeId ?? row.id ?? 0), name: row.name ?? row.collegeName ?? "", code: row.code ?? row.collegeCode ?? "", status, collegeStatus: status, plan: row.plan ?? row.planName ?? "Free", registered: row.registered ?? row.registeredAt ?? row.createdAt ?? "", renewal: row.renewal ?? row.renewalDate ?? "", activeAccounts: Number(row.activeAccounts ?? row.accountCount ?? 0), accountLimit: Number(row.accountLimit ?? 0) };
  });
  const pending = choose(sources.pending, bootstrap, "registrations", "colleges");
  data.registrations = pending.filter((row) => (row.registrationStatus ?? row.status ?? row.collegeStatus ?? "Pending").toLowerCase() === "pending" || row.registrationStatus === "Approved" || row.registrationStatus === "Rejected").map((row) => ({ ...row, id: idOf(row), collegeId: row.collegeId ? String(row.collegeId) : null, name: row.name ?? row.collegeName ?? "", code: row.code ?? row.collegeCode ?? "", contact: row.phone ?? row.contact ?? "", applicantName: row.applicantName ?? row.admin ?? "", applicantEmail: row.applicantEmail ?? row.email ?? "", plan: row.plan ?? row.planName ?? "Free", registrationStatus: row.registrationStatus ?? row.status ?? row.collegeStatus ?? "Pending", submittedAt: row.submittedAt ?? row.registeredAt ?? row.createdAt ?? null }));
  if (!sources.pending?.ok && !data.registrations.length) data.registrations = data.colleges.filter((row) => ["Pending", "Rejected"].includes(row.status)).map((row) => ({ ...row, registrationStatus: row.status, applicantName: row.admin ?? "", applicantEmail: row.email }));

  data.plans = choose(sources.plans, bootstrap, "plans").map((row) => ({ ...row, id: row.planId ?? row.id ?? row.name, planId: Number(row.planId ?? row.id ?? 0), name: row.name ?? row.planName ?? "", description: row.description ?? "", price: Number(row.price ?? 0), limit: Number(row.limit ?? row.accountLimit ?? 0), durationDays: Number(row.durationDays ?? 30), active: row.active !== false && row.status !== "Inactive", modules: Array.isArray(row.modules) ? row.modules : [] }));
  const users = choose(sources.users, bootstrap, "users", "globalUsers");
  const admins = choose(sources.admins, bootstrap, "collegeAdmins", "admins");
  data.collegeAdmins = admins.map((row) => ({ ...row, id: idOf(row), userId: Number(row.userId ?? row.id ?? 0), name: row.name ?? row.fullName ?? "", role: row.role ?? "CollegeAdmin", collegeId: row.collegeId ? String(row.collegeId) : null }));
  data.users = [...new Map([...users, ...admins].map((row) => [idOf(row), row])).values()].map((row) => {
    const active = row.active ?? (row.accountStatus === "Active" || row.status === "Active");
    return { ...row, id: idOf(row), userId: Number(row.userId ?? row.id ?? 0), name: row.name ?? row.fullName ?? "User", fullName: row.fullName ?? row.name ?? "User", email: row.email ?? "", phone: row.phone ?? row.mobileNumber ?? "", collegeId: row.collegeId ? String(row.collegeId) : null, collegeName: row.collegeName ?? "Platform", role: row.role ?? "User", active: Boolean(active), loginEnabled: row.loginEnabled !== false, accountStatus: row.accountStatus ?? row.status ?? (active ? "Active" : "Inactive") };
  });
  data.payments = choose(sources.payments, bootstrap, "payments", "invoices").map((row) => ({ ...row, id: idOf(row), paymentId: Number(row.paymentId ?? row.id ?? 0), invoice: row.invoice ?? row.invoiceNumber ?? `INV-${idOf(row)}`, collegeId: String(row.collegeId ?? ""), amount: Number(row.amount ?? 0), date: row.date ?? row.paymentDate ?? row.createdAt ?? "", status: row.status ?? "Pending" }));
  data.activities = choose(sources.audit, bootstrap, "activities", "auditLogs", "items").map((row) => ({ ...row, id: idOf(row) || String(row.auditLogId ?? `${row.createdAt}-${row.actionType}`), message: row.message ?? row.description ?? row.action ?? "", performedBy: row.performedBy ?? row.userName ?? "", at: row.at ?? row.createdAt ?? row.timestamp ?? "", actionType: row.actionType ?? row.action ?? "", scope: row.scope ?? "Platform" }));
  data.notifications = choose(sources.notifications, bootstrap, "notifications").map((row) => ({ ...row, id: idOf(row), notificationId: Number(row.notificationId ?? row.id ?? 0), date: row.date ?? row.createdAt ?? "", read: row.read ?? (row.isRead ? "Read" : "Unread") }));
  data.readNotificationIds = data.notifications.filter((row) => row.read === "Read").map((row) => row.id);
  data.subscriptions = list(sources.subscriptions, "subscriptions");
  data.accountUsage = list(sources.usage, "accountUsage", "items");
  data.renewals = list(sources.renewals, "renewals", "items");
  data.moduleMatrix = list(sources.modules, "modules", "plans", "items");
  const matrixRows = data.moduleMatrix.flatMap((row) => Array.isArray(row.modules) ? row.modules.map((module) => typeof module === "string" ? { planId: row.planId ?? row.id, moduleName: module, isEnabled: true } : { ...module, planId: module.planId ?? row.planId ?? row.id }) : [row]);
  if (matrixRows.some((row) => row.moduleName || row.module)) {
    data.plans = data.plans.map((plan) => {
      const matched = matrixRows.filter((row) => String(row.planId ?? row.subscriptionPlanId) === String(plan.planId ?? plan.id));
      return matched.length ? { ...plan, modules: matched.filter((row) => row.isEnabled !== false && row.enabled !== false).map((row) => row.moduleName ?? row.module) } : plan;
    });
  }
  data.dashboard = record(sources.dashboard, "dashboard", "summary");
  data.profile = record(sources.profile, "profile");
  const settings = record(sources.settings, "settings");
  data.settings = { ...data.settings, ...settings, renewalDays: Number(settings.renewalDays ?? 30) };
  return data;
}

export default function SuperAdminProvider({ session, children }) {
  const [data, setData] = useState(emptyState);
  const latest = useRef(data);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLivePlatformData = useCallback(async () => {
    const requests = {
      bootstrap: superAdminApi.getBootstrap,
      dashboard: superAdminApi.getDashboard,
      colleges: superAdminApi.getColleges,
      pending: () => superAdminApi.getColleges({ status: "Pending" }),
      users: superAdminApi.getGlobalUsers,
      admins: superAdminApi.getCollegeAdmins,
      plans: superAdminApi.getPlans,
      subscriptions: superAdminApi.getSubscriptions,
      usage: superAdminApi.getAccountUsage,
      renewals: superAdminApi.getRenewals,
      payments: superAdminApi.getPaymentsAndInvoices,
      modules: superAdminApi.getPlanModuleMatrix,
      notifications: superAdminApi.getNotifications,
      audit: superAdminApi.getAuditLogs,
      settings: superAdminApi.getSettings,
      profile: superAdminApi.getProfile,
    };
    const entries = await Promise.all(Object.entries(requests).map(async ([key, request]) => {
      try { return [key, { ok: true, value: await request() }]; }
      catch (error) { return [key, { ok: false, error }]; }
    }));
    const sources = Object.fromEntries(entries.map(([key, result]) => [key, result.ok ? result.value : null]));
    for (const [key, result] of entries) if (result.ok) sources[key] = { data: result.value, ok: true };
    const successful = entries.filter(([, result]) => result.ok).length;
    if (!successful) {
      const firstError = entries.find(([, result]) => !result.ok)?.[1].error;
      setMessage(getApiErrorMessage(firstError));
      setLoading(false);
      return false;
    }
    const normalized = normalizeLiveData(sources);
    latest.current = normalized;
    setData(normalized);
    const failed = entries.filter(([, result]) => !result.ok).map(([key]) => key);
    if (failed.length) setMessage(`Some platform data could not be loaded: ${failed.join(", ")}.`);
    setLoading(false);
    return true;
  }, []);

  useEffect(() => { loadLivePlatformData(); }, [loadLivePlatformData]);

  const update = async (label, _legacyAction, details = {}) => {
    setMessage("");
    try {
      const { module: mod, actionType: act } = details;
      const payload = details.payload ?? details.newValues ?? {};
      let result;
      if (mod === "Colleges") {
        if (act === "Status change") {
          const current = latest.current.colleges.find((row) => row.id === String(details.collegeId));
          result = await superAdminApi.updateCollegeStatus(details.collegeId, details.status ?? (current?.status === "Active" ? "Inactive" : "Active"));
        } else if (act === "Create") result = await superAdminApi.createCollege(payload);
        else if (act === "Update") result = await superAdminApi.updateCollege(details.collegeId ?? payload.id, payload);
      } else if (mod === "Registrations") {
        const cid = details.collegeId ?? details.id;
        if (act === "Approved" || act === "Rejected") result = await superAdminApi.updateCollegeStatus(cid, act === "Approved" ? "Active" : "Inactive");
        else if (act === "Create") result = await superAdminApi.createCollege({ ...payload, status: "Pending" });
        else if (act === "Update") result = await superAdminApi.updateCollege(cid, { ...payload, status: "Pending" });
      } else if (mod === "College Admins") {
        if (act === "Create") result = await superAdminApi.createCollegeAdmin({ name: payload.name, email: payload.email, collegeId: Number(payload.collegeId) });
        else if (act === "Access change") result = await superAdminApi.updateUserStatus(details.userId, payload.active ? "Active" : "Inactive");
      } else if (mod === "Global Users") {
        if (act === "Status change") result = await superAdminApi.updateUserStatus(details.userId, details.status);
        else if (act === "Reset password") result = await superAdminApi.resetUserPassword(details.userId, details.newPassword);
      } else if (mod === "Subscriptions") {
        const cid = details.collegeId;
        if (act === "Changed subscription") result = await superAdminApi.changeCollegePlan(cid, details.planName ?? payload.plan);
        else if (act === "Renewed subscription") result = await superAdminApi.renewCollegeSubscription(cid, details.extensionDays ?? 30);
        else if (act === "Cancelled subscription") result = await superAdminApi.cancelCollegeSubscription(cid);
      } else if (mod === "Plans") {
        if (act === "Create" || act === "Update") result = await superAdminApi.savePlan(payload, details.planId ?? payload.planId ?? null);
        else if (act === "Status change") {
          const current = latest.current.plans.find((row) => String(row.planId) === String(details.planId));
          result = await superAdminApi.updatePlanStatus(details.planId, details.status ?? (current?.active ? "Inactive" : "Active"));
        }
      } else if (mod === "Module Management" && act === "Update") {
        const plans = details.draft ?? [];
        const results = await Promise.all(plans.flatMap((plan) => MODULES.map((name) => superAdminApi.updatePlanModule(plan.planId ?? plan.id, name, plan.modules.includes(name)))));
        result = results.at(-1);
      } else if (mod === "Settings" && act === "Update") result = await superAdminApi.updateSettings(details.settings ?? payload);
      else if (mod === "Notifications") {
        if (act === "Draft") result = await superAdminApi.createNotification(payload);
        else if (act === "Read") result = await superAdminApi.markNotificationRead(details.notificationId ?? details.id);
      } else if (mod === "Payments" && act === "Verify") result = await superAdminApi.verifyPayment(details.paymentId);

      if (result === undefined) throw new Error(`No API action is configured for ${mod || "this feature"} / ${act || "this operation"}.`);
      await loadLivePlatformData();
      setMessage(result?.message ?? `${label} completed successfully.`);
      return true;
    } catch (error) {
      console.error(`Super Admin API operation failed (${label}):`, error);
      setMessage(getApiErrorMessage(error));
      return false;
    }
  };

  const refresh = async () => {
    const success = await loadLivePlatformData();
    if (success) setMessage("Platform data refreshed from the API.");
    return success;
  };

  return <Context.Provider value={{ session, data, loading, update, refresh, message, clearMessage: () => setMessage("") }}>{children}</Context.Provider>;
}

export const useSuperAdmin = () => useContext(Context);
