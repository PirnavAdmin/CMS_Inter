import apiClient from "@/api/apiClient.js";

export const getLeaveCategories = async () => {
  try {
    const response = await apiClient.get("/api/v1/leave-categories");
    return response.data?.data || response.data?.Data || [];
  } catch (error) {
    console.error("Error fetching leave categories:", error);
    throw error;
  }
};

export const getLeaveCategorySummary = async () => {
  try {
    const response = await apiClient.get("/api/v1/leave-categories/summary");
    return response.data?.data || response.data?.Data || { standardAnnualAllowance: 0, totalCategories: 0, badges: [] };
  } catch (error) {
    console.error("Error fetching leave category summary:", error);
    throw error;
  }
};

export const createLeaveCategory = async (payload) => {
  try {
    const response = await apiClient.post("/api/v1/leave-categories", payload);
    return response.data?.data || response.data?.Data;
  } catch (error) {
    console.error("Error creating leave category:", error);
    throw error;
  }
};

export const updateLeaveCategory = async (id, payload) => {
  try {
    const response = await apiClient.put(`/api/v1/leave-categories/${id}`, payload);
    return response.data?.data || response.data?.Data;
  } catch (error) {
    console.error(`Error updating leave category ${id}:`, error);
    throw error;
  }
};

export const deleteLeaveCategory = async (id) => {
  try {
    const response = await apiClient.delete(`/api/v1/leave-categories/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting leave category ${id}:`, error);
    throw error;
  }
};

export const resetDefaultLeaveCategories = async () => {
  try {
    const response = await apiClient.post("/api/v1/leave-categories/reset");
    return response.data;
  } catch (error) {
    console.error("Error resetting default leave categories:", error);
    throw error;
  }
};
