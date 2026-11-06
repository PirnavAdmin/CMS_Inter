import { HubConnectionBuilder, LogLevel, HubConnectionState } from "@microsoft/signalr";
import { getAuthToken } from "@/features/authStorage.js";
import { env } from "@/config/env.js";

/**
 * Singleton service for managing the SignalR Notification Hub connection.
 * Maintains a single persistent connection across all dashboard route transitions,
 * preventing repeated /hubs/notifications/negotiate polling loops and reconnect storms.
 */
class NotificationHubService {
  constructor() {
    this.connection = null;
    this.connectingPromise = null;
    this.subscribers = new Set();
    this.currentCampusId = null;
  }

  /**
   * Connect to the SignalR notification hub if not already connected.
   * Returns a promise resolving to the active HubConnection.
   */
  async connect() {
    const rawToken = getAuthToken();
    const token = (rawToken || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return null;
    }

    // If already connected, reuse existing socket (stay idle)
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      return this.connection;
    }

    // If already connecting or reconnecting, wait for current operation
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

    this.connectingPromise = (async () => {
      try {
        const base = env.useDevProxy ? "" : (env.apiBaseUrl || "").replace(/\/$/, "");

        if (!this.connection) {
          const builder = new HubConnectionBuilder()
            .withUrl(`${base}/hubs/notifications`, {
              accessTokenFactory: () => (getAuthToken() || "").replace(/^Bearer\s+/i, "").trim(),
              headers: { "ngrok-skip-browser-warning": "true" },
            })
            .withAutomaticReconnect([2000, 5000, 10000, 30000])
            .configureLogging(LogLevel.None);

          this.connection = builder.build();

          this.connection.on("NotificationReceived", (payload) => {
            this.notifySubscribers(payload);
          });

          this.connection.onreconnected(async () => {
            if (this.currentCampusId && this.connection?.state === HubConnectionState.Connected) {
              try {
                await this.connection.invoke("JoinCampus", Number(this.currentCampusId));
              } catch {
                // Ignore silent join error on reconnect
              }
            }
          });
        }

        if (this.connection.state === HubConnectionState.Disconnected) {
          await this.connection.start();

          if (this.currentCampusId && this.connection.state === HubConnectionState.Connected) {
            try {
              await this.connection.invoke("JoinCampus", Number(this.currentCampusId));
            } catch {
              // Ignore silent join error
            }
          }
        }

        return this.connection;
      } catch (err) {
        // Return null on failure; automatic reconnect will retry if configured
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

  /**
   * Subscribe to real-time notification events.
   * Automatically connects to the hub if not already connected.
   * Returns an unsubscribe function.
   */
  subscribe(callback) {
    if (typeof callback === "function") {
      this.subscribers.add(callback);
      this.connect().catch(() => {});
    }

    return () => {
      this.subscribers.delete(callback);
      // NOTE: We deliberately DO NOT stop the connection on component unmount.
      // Keeping the connection open and idle across route transitions prevents
      // the repeated /negotiate storm when users browse the dashboard.
    };
  }

  /**
   * Join a campus room dynamically without dropping or rebuilding the socket.
   */
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
    } else {
      // Connect if not yet active
      await this.connect();
    }
  }

  /**
   * Completely disconnect the hub. Only called upon user logout.
   */
  async disconnect() {
    this.subscribers.clear();
    this.currentCampusId = null;

    if (this.connection) {
      try {
        if (
          this.connection.state === HubConnectionState.Connected ||
          this.connection.state === HubConnectionState.Connecting
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
