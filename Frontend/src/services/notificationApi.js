import apiClient from "@/api/apiClient.js";

/**
 * Centralized API client for all notification operations across CMS.
 */
export const notificationApi = {
  /**
   * Get paginated notifications for the current authenticated user.
   */
  async getNotifications({ page = 1, pageSize = 20, unreadOnly = null } = {}) {
    try {
      const params = { page, pageSize };
      if (unreadOnly !== null && unreadOnly !== undefined) {
        params.unreadOnly = unreadOnly;
      }
      const response = await apiClient.get("/api/v1/notifications", { params });
      return {
        success: true,
        items: response.data?.data || [],
        total: response.data?.total || 0,
        unreadCount: response.data?.unreadCount || 0,
        page: response.data?.page || 1,
        pageSize: response.data?.pageSize || pageSize,
      };
    } catch (error) {
      console.warn("[notificationApi] Failed to fetch notifications:", error.message);
      return { success: false, items: [], total: 0, unreadCount: 0 };
    }
  },

  /**
   * Get unread notifications count for the topbar badge.
   */
  async getUnreadCount() {
    try {
      const response = await apiClient.get("/api/v1/notifications/unread-count");
      return response.data?.unreadCount ?? 0;
    } catch (error) {
      console.warn("[notificationApi] Failed to fetch unread count:", error.message);
      return 0;
    }
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId) {
    if (!notificationId) return false;
    try {
      const response = await apiClient.put(`/api/v1/notifications/${notificationId}/read`);
      return response.data?.success ?? true;
    } catch (error) {
      console.warn("[notificationApi] Failed to mark as read:", error.message);
      return false;
    }
  },

  /**
   * Mark all notifications as read for current user.
   */
  async markAllAsRead() {
    try {
      const response = await apiClient.put("/api/v1/notifications/read-all");
      return response.data?.success ?? true;
    } catch (error) {
      console.warn("[notificationApi] Failed to mark all as read:", error.message);
      return false;
    }
  },
};

export default notificationApi;

