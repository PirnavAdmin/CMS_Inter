import { HttpTransportType, HubConnectionBuilder, LogLevel, HubConnectionState } from "@microsoft/signalr";
import { getAuthToken } from "@/features/authStorage.js";
import { env } from "@/config/env.js";

const RECONNECT_COOLDOWN_MS = 5000;
const BLIP_RETRY_DELAY_MS = 2500;

/**
 * Singleton service for managing the SignalR Notification Hub connection.
 * Maintains one persistent WebSocket connection while the server is up
 * (zero idle HTTP polling), allows at most 1 fast recovery check on an
 * unexpected network blip, and enters an idle paused state whenever the
 * server stops so `/negotiate` is never hammered repeatedly.
 * Automatically resumes once backend reachability is confirmed (via an API
 * response, browser `online` event, or explicit user interaction).
 */
class NotificationHubService {
  constructor() {
    this.connection = null;
    this.connectingPromise = null;
    this.subscribers = new Set();
    this.domainSubscribers = new Set();
    this.readSubscribers = new Set();
    this.resyncSubscribers = new Set();
    this.currentCampusId = null;
    this.recentEventKeys = new Map();

    this.lastConnectAttemptAt = 0;
    this.pausedForServerDown = false;
    this.wasConnectedBeforeDrop = false;
    this.blipRetryUsed = false;
    this.blipRetryTimer = null;
    this.resyncDebounceTimer = null;
    this.wasDisconnected = false;
    this.manualDisconnect = false;
    this.activeTokenKey = "";
    this.lifecycleBound = false;
  }

  clearBlipRetryTimer() {
    if (this.blipRetryTimer) {
      clearTimeout(this.blipRetryTimer);
      this.blipRetryTimer = null;
    }
  }

  getNormalizedToken() {
    return (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim();
  }

  getStatus() {
    if (this.connection?.state === HubConnectionState.Connected) return "Connected";
    if (this.connection?.state === HubConnectionState.Connecting || this.connectingPromise) return "Connecting";
    if (this.connection?.state === HubConnectionState.Reconnecting || this.blipRetryTimer) return "Reconnecting";
    if (this.pausedForServerDown) return "Paused";
    return "Disconnected";
  }

  bindWindowLifecycle() {
    if (this.lifecycleBound || typeof window === "undefined") return;
    this.lifecycleBound = true;

    const resumeIfOnline = () => {
      this.notifyBackendReachable({ source: "online" });
    };

    const resumeOnReachableApi = () => {
      this.notifyBackendReachable({ source: "api" });
    };

    const resumeOnVisibility = () => {
      if (document.visibilityState === "hidden") return;
      if (this.pausedForServerDown) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      if (!this.getNormalizedToken()) return;
      if (!this.connection || this.connection.state === HubConnectionState.Disconnected) {
        this.connect().catch(() => {});
      }
    };

    window.addEventListener("online", resumeIfOnline);
    window.addEventListener("cms-backend-reachable", resumeOnReachableApi);
    document.addEventListener("visibilitychange", resumeOnVisibility);
  }

  notifyBackendReachable({ source = "api" } = {}) {
    if (this.manualDisconnect) return null;
    if (!this.getNormalizedToken()) return null;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return null;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return null;

    if (
      this.connection &&
      (this.connection.state === HubConnectionState.Connected ||
        this.connection.state === HubConnectionState.Connecting ||
        this.connection.state === HubConnectionState.Reconnecting)
    ) {
      return this.connection;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    const forceBypassCooldown = source === "api";
    if (!forceBypassCooldown && Date.now() - this.lastConnectAttemptAt < RECONNECT_COOLDOWN_MS) {
      return null;
    }

    this.clearBlipRetryTimer();
    this.pausedForServerDown = false;
    this.blipRetryUsed = false;
    return this.connect({ force: forceBypassCooldown }).catch(() => null);
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

  async connect({ force = false } = {}) {
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
      this.pausedForServerDown = false;
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

    // While server is known to be stopped/unreachable, stay completely idle with zero /negotiate hits
    if (!force && this.pausedForServerDown) {
      return null;
    }

    if (!force && Date.now() - this.lastConnectAttemptAt < RECONNECT_COOLDOWN_MS) {
      return null;
    }

    this.lastConnectAttemptAt = Date.now();

    this.connectingPromise = (async () => {
      try {
        const base = env.useDevProxy ? "" : (env.apiBaseUrl || "").replace(/\/$/, "");

        if (!this.connection) {
          const builder = new HubConnectionBuilder()
            .withUrl(`${base}/hubs/notifications`, {
              accessTokenFactory: () => this.getNormalizedToken(),
              headers: { "ngrok-skip-browser-warning": "true" },
              ...(env.signalrSkipNegotiation
                ? { transport: HttpTransportType.WebSockets, skipNegotiation: true }
                : {}),
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
          this.connection.on("NotificationReceived", (payload) => {
            if (!payload) return;
            // Only real user notifications enter Bell subscribers; lightweight module refresh signals route to domainSubscribers
            if (payload.notificationId || (payload.title && payload.message)) {
              handleIncoming(payload);
            } else {
              this.notifyDomainSubscribers(payload);
            }
          });
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

          this.connection.onclose(() => {
            if (!this.manualDisconnect && this.getNormalizedToken()) {
              this.wasDisconnected = true;
              const canRetrySingleBlip =
                this.wasConnectedBeforeDrop &&
                !this.blipRetryUsed &&
                (typeof navigator === "undefined" || navigator.onLine !== false) &&
                (typeof document === "undefined" || document.visibilityState !== "hidden");

              if (canRetrySingleBlip) {
                this.blipRetryUsed = true;
                this.clearBlipRetryTimer();
                this.blipRetryTimer = setTimeout(() => {
                  this.blipRetryTimer = null;
                  if (!this.manualDisconnect && this.getNormalizedToken()) {
                    this.connect({ force: true }).catch(() => {});
                  }
                }, BLIP_RETRY_DELAY_MS);
              } else {
                this.pausedForServerDown = true;
              }
            }
          });
        }

        if (this.connection.state === HubConnectionState.Disconnected) {
          await this.connection.start();
          this.clearBlipRetryTimer();
          this.pausedForServerDown = false;
          this.wasConnectedBeforeDrop = true;
          this.blipRetryUsed = false;
          this.lastConnectAttemptAt = 0;

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
        this.wasConnectedBeforeDrop = false;
        this.pausedForServerDown = true;
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

  notifyDomainSubscribers(payload) {
    this.domainSubscribers.forEach((callback) => {
      try {
        callback(payload);
      } catch (err) {
        console.error("[NotificationHubService] Domain subscriber callback error:", err);
      }
    });
  }

  subscribeDomainEvents(callback) {
    if (typeof callback === "function") {
      this.domainSubscribers.add(callback);
      if (!this.pausedForServerDown) {
        this.connect().catch(() => {});
      }
    }

    return () => {
      this.domainSubscribers.delete(callback);
    };
  }

  subscribe(callback) {
    if (typeof callback === "function") {
      this.subscribers.add(callback);
      if (!this.pausedForServerDown) {
        this.connect().catch(() => {});
      }
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
    } else if (!this.connectingPromise && !this.pausedForServerDown) {
      await this.connect();
    }
  }

  async disconnect({ keepSubscribers = false } = {}) {
    this.manualDisconnect = true;
    this.pausedForServerDown = false;
    this.wasConnectedBeforeDrop = false;
    this.blipRetryUsed = false;
    this.clearBlipRetryTimer();
    if (this.resyncDebounceTimer) {
      clearTimeout(this.resyncDebounceTimer);
      this.resyncDebounceTimer = null;
    }
    if (!keepSubscribers) {
      this.subscribers.clear();
      this.domainSubscribers.clear();
      this.readSubscribers.clear();
      this.resyncSubscribers.clear();
    }
    this.currentCampusId = null;
    this.wasDisconnected = false;
    this.lastConnectAttemptAt = 0;

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
