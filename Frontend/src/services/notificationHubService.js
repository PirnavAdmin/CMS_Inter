import { HubConnectionBuilder, LogLevel, HubConnectionState } from "@microsoft/signalr";
import { getAuthToken } from "@/features/authStorage.js";
import { env } from "@/config/env.js";

const BACKOFF_STEPS_MS = [3000, 6000, 12000, 25000, 45000, 60000];

const withJitter = (ms) => {
  const factor = 0.85 + Math.random() * 0.3;
  return Math.round(ms * factor);
};

/**
 * Singleton service for managing the SignalR Notification Hub connection.
 * Maintains one persistent connection across all route transitions, avoids
 * negotiate/reconnect storms when the backend server stops and restarts, and
 * pushes server events directly to subscribers with zero idle polling.
 */
class NotificationHubService {
  constructor() {
    this.connection = null;
    this.connectingPromise = null;
    this.subscribers = new Set();
    this.readSubscribers = new Set();
    this.resyncSubscribers = new Set();
    this.currentCampusId = null;
    this.recentEventKeys = new Map();

    this.retryAttempt = 0;
    this.nextAllowedConnectAt = 0;
    this.reconnectTimer = null;
    this.resyncDebounceTimer = null;
    this.wasDisconnected = false;
    this.manualDisconnect = false;
    this.activeTokenKey = "";
    this.lifecycleBound = false;
  }

  getNormalizedToken() {
    return (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim();
  }

  bindWindowLifecycle() {
    if (this.lifecycleBound || typeof window === "undefined") return;
    this.lifecycleBound = true;

    const resumeIfNeeded = () => {
      if (document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (!this.getNormalizedToken()) return;
      if (!this.connection || this.connection.state === HubConnectionState.Disconnected) {
        this.connect().catch(() => {});
      }
    };

    window.addEventListener("online", resumeIfNeeded);
    document.addEventListener("visibilitychange", resumeIfNeeded);
  }

  scheduleRecoveryReconnect() {
    if (this.manualDisconnect || this.reconnectTimer) return;
    if (!this.getNormalizedToken()) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    const baseDelay = BACKOFF_STEPS_MS[Math.min(this.retryAttempt, BACKOFF_STEPS_MS.length - 1)];
    const delayMs = withJitter(baseDelay);
    this.retryAttempt = Math.min(this.retryAttempt + 1, BACKOFF_STEPS_MS.length);
    this.nextAllowedConnectAt = Date.now() + delayMs;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, delayMs);
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  emitResyncDebounced() {
    if (this.resyncDebounceTimer) {
      clearTimeout(this.resyncDebounceTimer);
    }
    this.resyncDebounceTimer = setTimeout(() => {
      this.resyncDebounceTimer = null;
      this.resyncSubscribers.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error("[NotificationHubService] Resync listener error:", err);
        }
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cms-notifications-resync"));
      }
    }, 600);
  }

  async connect() {
    const token = this.getNormalizedToken();
    if (!token) {
      return null;
    }

    this.bindWindowLifecycle();
    this.manualDisconnect = false;

    const tokenTail = token.slice(-24);
    if (this.activeTokenKey && this.activeTokenKey !== tokenTail) {
      await this.disconnect({ keepSubscribers: true });
    }
    this.activeTokenKey = tokenTail;

    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      return this.connection;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    if (
      this.connection &&
      (this.connection.state === HubConnectionState.Connecting ||
        this.connection.state === HubConnectionState.Reconnecting)
    ) {
      return this.connection;
    }

    // Respect backoff cooldown so repeated StrictMode / route mounts never hammer /negotiate when backend is down
    if (Date.now() < this.nextAllowedConnectAt) {
      return null;
    }

    this.connectingPromise = (async () => {
      try {
        const base = env.useDevProxy ? "" : (env.apiBaseUrl || "").replace(/\/$/, "");

        if (!this.connection) {
          const builder = new HubConnectionBuilder()
            .withUrl(`${base}/hubs/notifications`, {
              accessTokenFactory: () => this.getNormalizedToken(),
              headers: { "ngrok-skip-browser-warning": "true" },
            })
            .withAutomaticReconnect({
              nextRetryDelayInMilliseconds: (retryContext) => {
                if (!this.getNormalizedToken() || this.manualDisconnect) return null;
                if (typeof navigator !== "undefined" && navigator.onLine === false) return 30000;
                const idx = Math.min(retryContext.previousRetryCount, BACKOFF_STEPS_MS.length - 1);
                return withJitter(BACKOFF_STEPS_MS[idx]);
              },
            })
            .configureLogging(LogLevel.None);

          this.connection = builder.build();

          const handleIncoming = (payload) => {
            if (!payload) return;
            const now = Date.now();
            const eventKey = payload.notificationId
              ? `id:${payload.notificationId}:${payload.groupKey || ""}:${payload.groupCount || 1}:${payload.createdAt || ""}`
              : `msg:${payload.type || ""}:${payload.title || ""}:${payload.message || ""}:${payload.actionUrl || ""}`;

            for (const [k, ts] of this.recentEventKeys.entries()) {
              if (now - ts > 8000) this.recentEventKeys.delete(k);
            }
            if (this.recentEventKeys.has(eventKey)) {
              return;
            }
            this.recentEventKeys.set(eventKey, now);
            this.notifySubscribers(payload);
          };

          this.connection.on("ReceiveNotification", handleIncoming);
          this.connection.on("NotificationReceived", handleIncoming);
          this.connection.on("NotificationRead", (payload) => {
            this.readSubscribers.forEach((cb) => {
              try {
                cb({ kind: "single", payload });
              } catch {
                // ignore
              }
            });
          });
          this.connection.on("AllNotificationsRead", (payload) => {
            this.readSubscribers.forEach((cb) => {
              try {
                cb({ kind: "all", payload });
              } catch {
                // ignore
              }
            });
          });

          this.connection.onreconnecting(() => {
            this.wasDisconnected = true;
          });

          this.connection.onreconnected(async () => {
            this.retryAttempt = 0;
            this.nextAllowedConnectAt = 0;
            this.clearReconnectTimer();

            if (this.currentCampusId && this.connection?.state === HubConnectionState.Connected) {
              try {
                await this.connection.invoke("JoinCampus", Number(this.currentCampusId));
              } catch {
                // Ignore silent join error on reconnect
              }
            }

            if (this.wasDisconnected) {
              this.wasDisconnected = false;
              this.emitResyncDebounced();
            }
          });

          this.connection.onclose(() => {
            if (!this.manualDisconnect && this.getNormalizedToken()) {
              this.wasDisconnected = true;
              this.scheduleRecoveryReconnect();
            }
          });
        }

        if (this.connection.state === HubConnectionState.Disconnected) {
          await this.connection.start();
          this.retryAttempt = 0;
          this.nextAllowedConnectAt = 0;
          this.clearReconnectTimer();

          if (this.currentCampusId && this.connection.state === HubConnectionState.Connected) {
            try {
              await this.connection.invoke("JoinCampus", Number(this.currentCampusId));
            } catch {
              // Ignore silent join error
            }
          }

          // Recover missed notifications if we came back after an earlier offline drop
          if (this.wasDisconnected) {
            this.wasDisconnected = false;
            this.emitResyncDebounced();
          }
        }

        return this.connection;
      } catch {
        this.wasDisconnected = true;
        this.scheduleRecoveryReconnect();
        return null;
      } finally {
        this.connectingPromise = null;
      }
    })();

    return this.connectingPromise;
  }

  notifySubscribers(payload) {
    this.subscribers.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error("[NotificationHubService] Subscriber callback error:", err);
      }
    });
  }

  subscribe(callback) {
    if (typeof callback === "function") {
      this.subscribers.add(callback);
      this.connect().catch(() => {});
    }

    return () => {
      this.subscribers.delete(callback);
    };
  }

  subscribeReadEvents(callback) {
    if (typeof callback === "function") {
      this.readSubscribers.add(callback);
    }
    return () => {
      this.readSubscribers.delete(callback);
    };
  }

  subscribeResync(callback) {
    if (typeof callback === "function") {
      this.resyncSubscribers.add(callback);
    }
    return () => {
      this.resyncSubscribers.delete(callback);
    };
  }

  async joinCampus(campusId) {
    if (!campusId || Number(campusId) <= 0) return;
    const numId = Number(campusId);
    if (this.currentCampusId === numId && this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    this.currentCampusId = numId;

    if (this.connection?.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke("JoinCampus", numId);
      } catch {
        // Ignore silent join error
      }
    } else if (!this.connectingPromise && Date.now() >= this.nextAllowedConnectAt) {
      await this.connect();
    }
  }

  async disconnect({ keepSubscribers = false } = {}) {
    this.manualDisconnect = true;
    this.clearReconnectTimer();
    if (this.resyncDebounceTimer) {
      clearTimeout(this.resyncDebounceTimer);
      this.resyncDebounceTimer = null;
    }
    if (!keepSubscribers) {
      this.subscribers.clear();
      this.readSubscribers.clear();
      this.resyncSubscribers.clear();
    }
    this.currentCampusId = null;
    this.wasDisconnected = false;
    this.retryAttempt = 0;
    this.nextAllowedConnectAt = 0;

    if (this.connection) {
      try {
        if (
          this.connection.state === HubConnectionState.Connected ||
          this.connection.state === HubConnectionState.Connecting ||
          this.connection.state === HubConnectionState.Reconnecting
        ) {
          await this.connection.stop();
        }
      } catch {
        // Ignore stop error
      }
      this.connection = null;
    }
  }
}

export const notificationHubService = new NotificationHubService();

if (typeof window !== "undefined") {
  window.addEventListener("cms-auth-logout", () => {
    notificationHubService.disconnect();
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "token" && !e.newValue) {
      notificationHubService.disconnect();
    }
  });
}

export default notificationHubService;
