import notificationApi from "@/services/notificationApi.js";
import notificationHubService from "@/services/notificationHubService.js";
import { getAuthToken, getAuthUser } from "@/features/authStorage.js";

const HISTORY_LIMIT = 10;
const CHANNEL_NAME = "cms_notifications_sync";

function sortNewestFirst(items) {
  return [...items].sort((a, b) => {
    const timeDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (timeDiff !== 0) return timeDiff;
    return Number(b.notificationId || 0) - Number(a.notificationId || 0);
  });
}

function dedupeById(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const id = item?.notificationId;
    if (id != null) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    result.push(item);
  }
  return result;
}

function resolveSessionKey() {
  const token = (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return "";
  const user = getAuthUser();
  const uid = user?.userId ?? user?.id ?? user?.Id ?? "";
  return `${uid}:${token.slice(-16)}`;
}

function createInitialState() {
  return {
    sessionKey: "",
    unreadCount: 0,
    allNotifications: [],
    allTotal: 0,
    allLoaded: false,
    loadingAll: false,
    errorAll: "",
    historyNotifications: [],
    historyLoaded: false,
    loadingHistory: false,
    errorHistory: "",
  };
}

class NotificationStore {
  constructor() {
    this.state = createInitialState();
    this.listeners = new Set();
    this.activePromise = null;
    this.historyPromise = null;
    this.hubBound = false;
    this.channel = null;
    this.bindCrossTabChannel();
    this.bindAuthReset();
  }

  getSnapshot = () => this.state;

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setState(updater) {
    const next = typeof updater === "function" ? updater(this.state) : { ...this.state, ...updater };
    if (next === this.state) return;
    this.state = next;
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("[NotificationStore] Listener error:", err);
      }
    });
  }

  reset() {
    this.activePromise = null;
    this.historyPromise = null;
    this.state = createInitialState();
    this.listeners.forEach((listener) => listener());
  }

  bindAuthReset() {
    if (typeof window === "undefined") return;
    window.addEventListener("cms-auth-logout", () => this.reset());
    window.addEventListener("storage", (e) => {
      if (e.key === "token" && !e.newValue) {
        this.reset();
      }
    });
  }

  bindCrossTabChannel() {
    if (typeof BroadcastChannel === "undefined") return;
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        const msg = event?.data;
        if (!msg || msg.sessionKey !== resolveSessionKey()) return;
        if (msg.type === "mark-read" && msg.notification) {
          this.applyLocalMarkRead(msg.notification, false);
        } else if (msg.type === "mark-all-read") {
          this.applyLocalMarkAllRead(false);
        } else if (msg.type === "incoming" && msg.notification) {
          this.applyIncomingNotification(msg.notification, false);
        }
      };
    } catch {
      this.channel = null;
    }
  }

  broadcast(type, extra = {}) {
    if (!this.channel) return;
    try {
      this.channel.postMessage({ type, sessionKey: resolveSessionKey(), ...extra });
    } catch {
      // ignore cross-tab channel errors
    }
  }

  ensureSession() {
    const key = resolveSessionKey();
    if (!key) {
      if (this.state.sessionKey) this.reset();
      return "";
    }
    if (this.state.sessionKey && this.state.sessionKey !== key) {
      this.reset();
    }
    if (!this.state.sessionKey) {
      this.setState({ sessionKey: key });
    }
    return key;
  }

  ensureHubBound() {
    if (this.hubBound) return;
    this.hubBound = true;

    notificationHubService.subscribe((payload) => {
      if (!resolveSessionKey() || !payload) return;
      if (!payload.notificationId && (!payload.title || !payload.message)) return;
      const newNotif = {
        notificationId: payload.notificationId || Date.now(),
        title: payload.title || "New Notification",
        message: payload.message || "",
        type: payload.type || "General",
        referenceId: payload.referenceId ?? null,
        actionUrl: payload.actionUrl || null,
        groupKey: payload.groupKey || "",
        groupCount: Number(payload.groupCount || 1),
        isRequestGroup: Boolean(payload.isRequestGroup),
        isGrouped: Boolean(payload.isGrouped || Number(payload.groupCount || 1) > 1),
        notificationIds: Array.isArray(payload.notificationIds) ? payload.notificationIds : [payload.notificationId].filter(Boolean),
        unreadCount: typeof payload.unreadCount === "number" ? payload.unreadCount : undefined,
        isRead: false,
        createdAt: payload.createdAt || new Date().toISOString(),
        timeAgo: "Just now",
      };
      this.applyIncomingNotification(newNotif, true);
    });

    notificationHubService.subscribeReadEvents(({ kind, payload }) => {
      if (!resolveSessionKey()) return;
      if (kind === "single" && (payload?.notificationId || payload?.groupKey)) {
        const existing = this.state.allNotifications.find((n) =>
          (payload.groupKey && n.groupKey && n.groupKey === payload.groupKey) ||
          (payload.notificationId && n.notificationId === payload.notificationId) ||
          (Array.isArray(n.notificationIds) && payload.notificationId && n.notificationIds.includes(payload.notificationId))
        );
        if (existing) {
          this.applyLocalMarkRead(existing, false, payload.unreadCount);
        } else if (typeof payload.unreadCount === "number") {
          this.setState({ unreadCount: payload.unreadCount, historyLoaded: false });
        }
      } else if (kind === "all") {
        this.applyLocalMarkAllRead(false);
      }
    });

    // Only resync over HTTP after an actual reconnect from server downtime
    notificationHubService.subscribeResync(() => {
      if (!resolveSessionKey()) return;
      this.loadActiveNotifications({ force: true });
      if (this.state.historyLoaded) {
        this.loadHistoryNotifications({ force: true });
      }
    });
  }

  /**
   * Single-flight initialization called when NotificationBell mounts.
   * Reuses in-memory cache across all route changes & StrictMode double-renders so
   * zero redundant HTTP calls are fired when navigating or waiting idle.
   */
  initialize() {
    const key = this.ensureSession();
    if (!key) return;
    this.ensureHubBound();
    if (!this.state.allLoaded && !this.activePromise) {
      this.loadActiveNotifications();
    }
  }

  async loadActiveNotifications({ force = false } = {}) {
    const key = this.ensureSession();
    if (!key) return null;
    if (this.activePromise) return this.activePromise;
    if (this.state.allLoaded && !force) return this.state.allNotifications;

    this.setState({ loadingAll: !this.state.allLoaded, errorAll: "" });
    this.activePromise = (async () => {
      try {
        const res = await notificationApi.getNotifications({
          page: 1,
          pageSize: 50,
          unreadOnly: true,
          skipNetworkRetry: true,
        });
        if (resolveSessionKey() !== key) return [];
        if (res?.success) {
          const activeOnly = (res.items || []).filter((item) => !item.isRead);
          this.setState({
            allNotifications: activeOnly,
            allTotal: res.unreadCount ?? activeOnly.length,
            unreadCount: res.unreadCount ?? activeOnly.length,
            allLoaded: true,
            loadingAll: false,
            errorAll: "",
          });
          return activeOnly;
        }
        this.setState({
          loadingAll: false,
          errorAll: res?.error || "Unable to load notifications.",
        });
        return [];
      } catch (err) {
        this.setState({
          loadingAll: false,
          errorAll: err?.message || "Unable to load notifications.",
        });
        return [];
      } finally {
        this.activePromise = null;
      }
    })();
    return this.activePromise;
  }

  async loadHistoryNotifications({ force = false } = {}) {
    const key = this.ensureSession();
    if (!key) return [];
    if (this.historyPromise) return this.historyPromise;
    if (this.state.historyLoaded && !force) return this.state.historyNotifications;

    this.setState({ loadingHistory: !this.state.historyLoaded, errorHistory: "" });
    this.historyPromise = (async () => {
      try {
        const res = await notificationApi.getHistory({ limit: HISTORY_LIMIT, skipNetworkRetry: true });
        if (resolveSessionKey() !== key) return [];
        if (res?.success) {
          const items = sortNewestFirst(dedupeById((res.items || []).filter((item) => item.isRead))).slice(0, HISTORY_LIMIT);
          this.setState({
            historyNotifications: items,
            historyLoaded: true,
            loadingHistory: false,
            errorHistory: "",
            unreadCount: typeof res.unreadCount === "number" ? res.unreadCount : this.state.unreadCount,
          });
          return items;
        }
        this.setState({
          loadingHistory: false,
          errorHistory: res?.error || "Unable to load notification history.",
        });
        return [];
      } catch (err) {
        this.setState({
          loadingHistory: false,
          errorHistory: err?.message || "Unable to load notification history.",
        });
        return [];
      } finally {
        this.historyPromise = null;
      }
    })();
    return this.historyPromise;
  }

  applyIncomingNotification(notif, shouldBroadcast = true) {
    this.setState((prev) => {
      const matchFn = (n) =>
        (notif.groupKey && n.groupKey && n.groupKey === notif.groupKey) ||
        (notif.notificationId && n.notificationId === notif.notificationId);
      const existingIdx = prev.allNotifications.findIndex(matchFn);
      let nextAll;
      if (existingIdx >= 0) {
        const existing = prev.allNotifications[existingIdx];
        const merged = {
          ...existing,
          ...notif,
          groupCount: Math.max(Number(notif.groupCount || 1), existing.groupKey === notif.groupKey ? Number(existing.groupCount || 1) : 1),
        };
        nextAll = prev.allNotifications.map((item, idx) => (idx === existingIdx ? merged : item));
        nextAll = sortNewestFirst(nextAll);
      } else {
        nextAll = sortNewestFirst(dedupeById([notif, ...prev.allNotifications]));
      }
      const nextUnread =
        typeof notif.unreadCount === "number"
          ? notif.unreadCount
          : existingIdx >= 0
          ? prev.unreadCount
          : prev.unreadCount + 1;
      return {
        ...prev,
        allNotifications: nextAll,
        allTotal: nextUnread,
        unreadCount: nextUnread,
        allLoaded: true,
      };
    });
    if (shouldBroadcast) this.broadcast("incoming", { notification: notif });
  }

  applyLocalMarkRead(notif, shouldBroadcast = true, serverUnreadCount = null) {
    if (!notif?.notificationId && !notif?.groupKey) return;
    const readItem = { ...notif, isRead: true, readAt: notif.readAt || new Date().toISOString() };
    this.setState((prev) => {
      const matchesTarget = (n) =>
        (notif.groupKey && n.groupKey && n.groupKey === notif.groupKey) ||
        (notif.notificationId && n.notificationId === notif.notificationId);
      const existedInActive = prev.allNotifications.some(matchesTarget);
      const nextAll = prev.allNotifications.filter((n) => !matchesTarget(n));
      const nextHistory = sortNewestFirst(dedupeById([readItem, ...prev.historyNotifications])).slice(0, HISTORY_LIMIT);
      const computedUnread =
        typeof serverUnreadCount === "number"
          ? serverUnreadCount
          : Math.max(0, prev.unreadCount - (existedInActive ? 1 : 0));
      return {
        ...prev,
        allNotifications: nextAll,
        allTotal: computedUnread,
        unreadCount: computedUnread,
        historyNotifications: nextHistory,
        historyLoaded: Number(notif.groupCount || 1) > 1 ? false : prev.historyLoaded,
      };
    });
    if (shouldBroadcast) this.broadcast("mark-read", { notification: readItem });
  }

  applyLocalMarkAllRead(shouldBroadcast = true) {
    this.setState((prev) => {
      const nowIso = new Date().toISOString();
      const moved = prev.allNotifications.map((n) => ({ ...n, isRead: true, readAt: n.readAt || nowIso }));
      const nextHistory = sortNewestFirst(dedupeById([...moved, ...prev.historyNotifications])).slice(0, HISTORY_LIMIT);
      return {
        ...prev,
        allNotifications: [],
        allTotal: 0,
        unreadCount: 0,
        historyNotifications: nextHistory,
      };
    });
    if (shouldBroadcast) this.broadcast("mark-all-read");
  }

  async markAsRead(notif) {
    if (!notif?.notificationId && !notif?.groupKey) return false;
    if (notif.isRead) return true;
    const ok = notif.notificationId
      ? await notificationApi.markAsRead(notif.notificationId)
      : await notificationApi.markGroupAsRead(notif.groupKey);
    if (ok) {
      this.applyLocalMarkRead(notif, true);
    }
    return ok;
  }

  async markAllAsRead() {
    const ok = await notificationApi.markAllAsRead();
    if (ok) {
      this.applyLocalMarkAllRead(true);
    }
    return ok;
  }
}

export const notificationStore = new NotificationStore();
export default notificationStore;
