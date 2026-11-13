import apiClient from "@/api/apiClient.js";

/**
 * Centralized API client for all notification operations across CMS.
 */
export const notificationApi = {
  /**
   * Get active (unread) notifications for the current authenticated user.
   */
  async getNotifications({ page = 1, pageSize = 50, unreadOnly = true, section = null, skipNetworkRetry = true } = {}) {
    try {
      const params = { page, pageSize };
      if (unreadOnly !== null && unreadOnly !== undefined) {
        params.unreadOnly = unreadOnly;
      }
      if (section) {
        params.section = section;
      }
      const response = await apiClient.get("/api/v1/notifications", {
        params,
        skipNetworkRetry,
        skipErrorLog: skipNetworkRetry,
      });
      return {
        success: true,
        items: response.data?.data || [],
        total: response.data?.total ?? 0,
        unreadCount: response.data?.unreadCount ?? 0,
        page: response.data?.page || 1,
        pageSize: response.data?.pageSize || pageSize,
      };
    } catch (error) {
      if (!skipNetworkRetry) {
        console.warn("[notificationApi] Failed to fetch notifications:", error.message);
      }
      return {
        success: false,
        items: [],
        total: 0,
        unreadCount: 0,
        error: error?.response?.data?.message || error?.message || "Failed to load notifications.",
      };
    }
  },

  /**
   * Get latest 10 read notification history items (newest first by creation time) for the current user.
   */
  async getHistory({ limit = 10, skipNetworkRetry = true } = {}) {
    try {
      const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 10);
      const response = await apiClient.get("/api/v1/notifications/history", {
        params: { limit: safeLimit },
        skipNetworkRetry,
        skipErrorLog: skipNetworkRetry,
      });
      return {
        success: true,
        items: response.data?.data || [],
        total: response.data?.total ?? (response.data?.data?.length || 0),
        unreadCount: response.data?.unreadCount ?? 0,
        limit: response.data?.limit ?? safeLimit,
      };
    } catch (error) {
      if (!skipNetworkRetry) {
        console.warn("[notificationApi] Failed to fetch notification history:", error.message);
      }
      return {
        success: false,
        items: [],
        total: 0,
        unreadCount: 0,
        limit: 10,
        error: error?.response?.data?.message || error?.message || "Failed to load notification history.",
      };
    }
  },

  /**
   * Get unread notifications count for the topbar badge.
   */
  async getUnreadCount({ skipNetworkRetry = true } = {}) {
    try {
      const response = await apiClient.get("/api/v1/notifications/unread-count", {
        skipNetworkRetry,
        skipErrorLog: skipNetworkRetry,
      });
      return response.data?.unreadCount ?? 0;
    } catch (error) {
      if (!skipNetworkRetry) {
        console.warn("[notificationApi] Failed to fetch unread count:", error.message);
      }
      return 0;
    }
  },

  /**
   * Mark a single notification (or its active screen+action group) as read.
   */
  async markAsRead(notificationId) {
    if (!notificationId) return false;
    try {
      const response = await apiClient.put(`/api/v1/notifications/${notificationId}/read`, null, {
        skipNetworkRetry: true,
      });
      return response.data?.success ?? true;
    } catch (error) {
      console.warn("[notificationApi] Failed to mark as read:", error.message);
      return false;
    }
  },

  /**
   * Mark all unread notifications belonging to a screen+action group as read.
   */
  async markGroupAsRead(groupKey) {
    if (!groupKey) return false;
    try {
      const response = await apiClient.put("/api/v1/notifications/group/read", { groupKey }, {
        skipNetworkRetry: true,
      });
      return response.data?.success ?? true;
    } catch (error) {
      console.warn("[notificationApi] Failed to mark group as read:", error.message);
      return false;
    }
  },

  /**
   * Mark all notifications as read for current user.
   */
  async markAllAsRead() {
    try {
      const response = await apiClient.put("/api/v1/notifications/read-all", null, {
        skipNetworkRetry: true,
      });
      return response.data?.success ?? true;
    } catch (error) {
      console.warn("[notificationApi] Failed to mark all as read:", error.message);
      return false;
    }
  },
};

export default notificationApi;
