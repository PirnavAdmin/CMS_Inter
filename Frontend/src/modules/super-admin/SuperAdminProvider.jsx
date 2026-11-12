import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import superAdminApi, { getApiErrorMessage } from "@/api/superAdminApi.js";
import { MODULES, createPreviewData, normalizeMockData } from "./superAdminPreview.js";

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
    return {
      ...row,
      id: idOf(row),
      collegeId: Number(row.collegeId ?? row.id ?? 0),
      name: row.name ?? row.collegeName ?? "-",
      code: row.code ?? row.collegeCode ?? "-",
      status,
      collegeStatus: status,
      trustSociety: row.trustSociety ?? row.TrustSociety ?? row.trust_society ?? "-",
      campuses: row.campuses ?? row.Campuses ?? row.totalCampuses ?? (row.campusesCount != null ? row.campusesCount : "-"),
      students: row.students != null && row.students !== "-" ? Number(row.students) : (row.totalStudents != null ? Number(row.totalStudents) : 0),
      modules: row.modules ?? row.Modules ?? row.modulesSummary ?? "-",
      plan: row.plan ?? row.planName ?? "-",
      registered: row.registered ?? row.registeredAt ?? row.createdAt ?? "-",
      renewal: row.renewal ?? row.renewalDate ?? "-",
      activeAccounts: row.activeAccounts != null ? Number(row.activeAccounts) : (row.accountCount != null ? Number(row.accountCount) : "-"),
      accountLimit: row.accountLimit != null ? Number(row.accountLimit) : "-",
    };
  });
  const pending = choose(sources.pending, bootstrap, "registrations", "colleges");
  data.registrations = pending.filter((row) => (row.registrationStatus ?? row.status ?? row.collegeStatus ?? "Pending").toLowerCase() === "pending" || row.registrationStatus === "Approved" || row.registrationStatus === "Rejected").map((row) => ({ ...row, id: idOf(row), collegeId: row.collegeId ? String(row.collegeId) : null, name: row.name ?? row.collegeName ?? "", code: row.code ?? row.collegeCode ?? "", contact: row.phone ?? row.contact ?? "", applicantName: row.applicantName ?? row.admin ?? "", applicantEmail: row.applicantEmail ?? row.email ?? "", plan: row.plan ?? row.planName ?? "Free", registrationStatus: row.registrationStatus ?? row.status ?? row.collegeStatus ?? "Pending", submittedAt: row.submittedAt ?? row.registeredAt ?? row.createdAt ?? null }));
  if (!sources.pending?.ok && !data.registrations.length) data.registrations = data.colleges.filter((row) => ["Pending", "Rejected"].includes(row.status)).map((row) => ({ ...row, registrationStatus: row.status, applicantName: row.admin ?? "", applicantEmail: row.email }));

  data.plans = choose(sources.plans, bootstrap, "plans").map((row) => ({ ...row, id: row.planId ?? row.id ?? row.name, planId: Number(row.planId ?? row.id ?? 0), name: row.name ?? row.planName ?? "", description: row.description ?? "", price: Number(row.price ?? 0), limit: Number(row.limit ?? row.accountLimit ?? 0), durationDays: Number(row.durationDays ?? 30), active: row.active !== false && row.status !== "Inactive", modules: Array.isArray(row.modules) ? row.modules : [] }));
  const users = choose(sources.users, bootstrap, "users", "globalUsers");
  const admins = choose(sources.admins, bootstrap, "collegeAdmins", "admins");
  data.collegeAdmins = admins.map((row) => ({
    ...row,
    id: idOf(row),
    userId: Number(row.userId ?? row.id ?? 0),
    name: row.name ?? row.fullName ?? "-",
    role: row.role ?? "CollegeAdmin",
    email: row.email ?? "-",
    phone: row.phone || row.phoneNumber || row.contact || row.mobileNumber || "-",
    phoneNumber: row.phoneNumber || row.phone || "-",
    lastLogin: row.lastLogin || row.lastLoginAt || "-",
    collegeId: row.collegeId ? String(row.collegeId) : null,
    collegeName: row.collegeName ?? "-"
  }));
  data.users = [...new Map([...users, ...admins].map((row) => [idOf(row), row])).values()].map((row) => {
    const active = row.active ?? (row.accountStatus === "Active" || row.status === "Active");
    return {
      ...row,
      id: idOf(row),
      userId: Number(row.userId ?? row.id ?? 0),
      name: row.name ?? row.fullName ?? "-",
      fullName: row.fullName ?? row.name ?? "-",
      email: row.email ?? "-",
      phone: row.phone || row.phoneNumber || row.mobileNumber || "-",
      phoneNumber: row.phoneNumber || row.phone || "-",
      collegeId: row.collegeId ? String(row.collegeId) : null,
      collegeName: row.collegeName ?? "-",
      role: row.role ?? "User",
      active: Boolean(active),
      loginEnabled: row.loginEnabled !== false,
      accountStatus: row.accountStatus ?? row.status ?? (active ? "Active" : "Inactive"),
      lastLogin: row.lastLogin || row.lastLoginAt || "-"
    };
  });
  data.payments = choose(sources.payments, bootstrap, "payments", "invoices").map((row) => ({ ...row, id: idOf(row), paymentId: Number(row.paymentId ?? row.id ?? 0), invoice: row.invoice ?? row.invoiceNumber ?? `INV-${idOf(row)}`, collegeId: String(row.collegeId ?? ""), amount: Number(row.amount ?? 0), date: row.date ?? row.paymentDate ?? row.createdAt ?? "", status: row.status ?? "Pending" }));
  data.activities = choose(sources.audit, bootstrap, "activities", "auditLogs", "items").map((row) => ({
    ...row,
    id: idOf(row) || String(row.auditLogId ?? `${row.createdAt}-${row.actionType}`),
    message: row.message ?? row.description ?? row.action ?? "",
    performedBy: row.performedBy ?? row.userName ?? "Super Administrator",
    role: row.role ?? (String(row.performedBy || row.userName || "").includes("ADM") ? "College Admin" : "Super Admin"),
    module: row.module ?? row.entityName ?? "Platform",
    college: row.college ?? row.collegeName ?? (row.collegeId ? `COL-${row.collegeId}` : "All Colleges"),
    at: row.at ?? row.createdAt ?? row.timestamp ?? "",
    actionType: row.actionType ?? row.action ?? "",
    scope: row.scope ?? "Platform"
  }));
  data.notifications = choose(sources.notifications, bootstrap, "notifications").map((row) => {
    const readValue = row.isRead ?? row.read ?? row.status;
    const isRead = readValue === true || readValue === 1 || ["true", "1", "read"].includes(String(readValue ?? "").toLowerCase());
    return { ...row, id: idOf(row), notificationId: Number(row.notificationId ?? row.id ?? 0), date: row.date ?? row.createdAt ?? "", isRead, read: isRead ? "Read" : "Unread" };
  });
  data.readNotificationIds = data.notifications.filter((row) => row.isRead).map((row) => row.id);
  const rawSubs = list(sources.subscriptions, "subscriptions");
  data.subscriptions = rawSubs.map((row) => {
    const plan = row.plan || row.planName;
    const limit = row.limit ?? row.accountLimit;
    const start = row.subscriptionStart || row.startDate;
    const renewal = row.renewal || row.renewalDate;
    const status = row.subscriptionStatus || row.status;
    const hasPlan = plan && plan !== "-" && plan !== "—" && plan.toLowerCase() !== "null";
    const hasStart = start && start !== "-" && start !== "—" && start.toLowerCase() !== "null";
    const hasRenewal = renewal && renewal !== "-" && renewal !== "—" && renewal.toLowerCase() !== "null";
    const hasStatus = status && status !== "-" && status !== "—" && status.toLowerCase() !== "null";

    return {
      ...row,
      id: row.subscriptionId ? `SUB-${row.subscriptionId}` : (row.id ?? `SUB-${row.collegeId}`),
      subscriptionId: Number(row.subscriptionId ?? 0),
      collegeId: row.collegeId ? String(row.collegeId) : null,
      name: row.name || row.collegeName || "—",
      collegeName: row.name || row.collegeName || "—",
      code: row.code || row.collegeCode || "—",
      collegeCode: row.code || row.collegeCode || "—",
      plan: hasPlan ? plan : "—",
      limit: limit != null && limit !== "-" && limit !== "—" && limit !== "null" ? Number(limit) : null,
      accountLimit: limit != null && limit !== "-" && limit !== "—" && limit !== "null" ? Number(limit) : "—",
      active: Number(row.active ?? row.activeAccounts ?? row.activeUsersCount ?? 0),
      activeAccounts: Number(row.active ?? row.activeAccounts ?? row.activeUsersCount ?? 0),
      startDate: hasStart ? String(start).slice(0, 10) : "—",
      renewalDate: hasRenewal ? String(renewal).slice(0, 10) : "—",
      status: hasStatus ? status : "—",
      daysRemaining: row.days ?? row.daysRemaining ?? null,
      modules: Array.isArray(row.modules) ? row.modules : []
    };
  });
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
      if (session?.preview) {
        const preview = normalizeMockData(createPreviewData());
        latest.current = preview;
        setData(preview);
        setLoading(false);
        return true;
      }
      // Match the Admin notification bell behavior: background fetch failures
      // should leave the page usable and the notification dropdown can show its
      // normal empty state. Reserve the page banner for explicit user actions.
      setLoading(false);
      return false;
    }
    const normalized = normalizeLiveData(sources);
    latest.current = normalized;
    setData(normalized);
    setLoading(false);
    return true;
  }, [session?.preview]);

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
        const rawCid = payload?.collegeId ?? details?.collegeId;
        const matchedCollege = latest.current.colleges.find((c) => String(c.id).toLowerCase() === String(rawCid).toLowerCase() || String(c.collegeId) === String(rawCid));
        const numericCollegeId = Number(matchedCollege?.collegeId) || Number(rawCid) || (parseInt(String(rawCid).replace(/\D/g, ""), 10) || 0);
        if (act === "Create") result = await superAdminApi.createCollegeAdmin({ name: payload.name, email: payload.email, phone: payload.phone || payload.phoneNumber, collegeId: numericCollegeId });
        else if (act === "Update") result = await superAdminApi.updateCollegeAdmin(details.userId ?? details.id, { name: payload.name, email: payload.email, phone: payload.phone || payload.phoneNumber, active: payload.active, collegeId: numericCollegeId });
        else if (act === "Access change") result = await superAdminApi.updateUserStatus(details.userId, payload.active ? "Active" : "Inactive");
      } else if (mod === "Global Users") {
        if (act === "Status change") result = await superAdminApi.updateUserStatus(details.userId, details.status);
        else if (act === "Reset password") result = await superAdminApi.resetUserPassword(details.userId, details.newPassword);
      } else if (mod === "Subscriptions" || mod === "Renewals") {
        const rawCid = details.collegeId ?? payload?.collegeId;
        const matchedCollege = latest.current.colleges.find((c) => String(c.id).toLowerCase() === String(rawCid).toLowerCase() || String(c.collegeId) === String(rawCid));
        const numericCollegeId = Number(matchedCollege?.collegeId) || Number(rawCid) || (parseInt(String(rawCid).replace(/\D/g, ""), 10) || 0);
        const planName = details.planName ?? payload?.plan ?? details.plan ?? payload?.planName;

        if (act === "Assign" || act === "Plan change" || act === "Changed subscription") {
          result = await superAdminApi.changeCollegePlan(numericCollegeId, planName);
        } else if (act === "Renew" || act === "Renewed subscription") {
          result = await superAdminApi.renewCollegeSubscription(numericCollegeId, details.extensionDays ?? payload?.extensionDays ?? 30);
        } else if (act === "Cancel" || act === "Cancelled subscription") {
          result = await superAdminApi.cancelCollegeSubscription(numericCollegeId);
        }
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
      return true;
    } catch (error) {
      console.error(`Super Admin API operation failed (${label}):`, error);
      setMessage(getApiErrorMessage(error));
      return false;
    }
  };

  const refresh = async () => {
    return loadLivePlatformData();
  };

  const markNotificationsRead = async (notificationIds) => {
    const ids = [...new Set((notificationIds || []).map(Number).filter((id) => Number.isFinite(id) && id > 0))];
    if (!ids.length) return true;
    const previous = latest.current;
    const idSet = new Set(ids);
    const next = {
      ...previous,
      notifications: previous.notifications.map((item) => idSet.has(Number(item.notificationId ?? item.id))
        ? { ...item, isRead: true, read: "Read" }
        : item),
      readNotificationIds: [...new Set([...(previous.readNotificationIds || []), ...ids.map(String)])],
    };
    latest.current = next;
    setData(next);
    try {
      await Promise.all(ids.map((id) => superAdminApi.markNotificationRead(id)));
      return true;
    } catch {
      // Keep the optimistic read state, as the Admin bell does, and avoid
      // turning a background notification request into a page-wide alert.
      return false;
    }
  };

  return <Context.Provider value={{ session, data, loading, update, refresh, markNotificationsRead, message, clearMessage: () => setMessage("") }}>{children}</Context.Provider>;
}

export const useSuperAdmin = () => useContext(Context);
