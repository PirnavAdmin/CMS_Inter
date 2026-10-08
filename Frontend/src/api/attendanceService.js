import apiClient from './apiClient';
import { apiEndpoints } from './apiEndpoints';

export const attendanceService = {
  // Student Attendance
  getAcademicContext: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.academicContext, { params });
    return response.data;
  },
  
  getStudents: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.students, { params });
    return response.data;
  },

  getAdminDailyStudents: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.studentAdminDaily, { params });
    return response.data;
  },

  createAttendance: async (data) => {
    const response = await apiClient.post(apiEndpoints.attendance.create, data);
    return response.data;
  },

  bulkSaveAttendance: async (data) => {
    const response = await apiClient.post(apiEndpoints.attendance.bulk, data);
    return response.data;
  },

  updateAttendance: async (data) => {
    const response = await apiClient.put(apiEndpoints.attendance.update, data);
    return response.data;
  },

  bulkUpdateAttendance: async (data) => {
    const response = await apiClient.put(apiEndpoints.attendance.bulkUpdate, data);
    return response.data;
  },

  getStudentMonthlyReport: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.studentMonthlyReport, { params });
    return response.data;
  },

  getFacultySubjectAttendance: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.facultySubject, { params });
    return response.data;
  },

  saveFacultySubjectAttendance: async (data) => {
    const response = await apiClient.post(apiEndpoints.attendance.bulk, data);
    return response.data;
  },


  getDefaulters: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.studentDefaulters, { params });
    return response.data;
  },

  getSummary: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.summary, { params });
    return response.data;
  },

  getPercentage: async (params) => {
    const response = await apiClient.get(apiEndpoints.attendance.percentage, { params });
    return response.data;
  },

  lockSession: async (sessionId) => {
    const response = await apiClient.post(apiEndpoints.attendance.lockSession(sessionId));
    return response.data;
  },

  unlockSession: async (sessionId) => {
    const response = await apiClient.post(apiEndpoints.attendance.unlockSession(sessionId));
    return response.data;
  },

  // Staff Attendance
  loadStaffAttendance: async (params) => {
    const response = await apiClient.post(apiEndpoints.staffAttendance.load, params);
    return response.data;
  },

  updateStaffAttendance: async (data) => {
    const response = await apiClient.put(apiEndpoints.staffAttendance.update, data);
    return response.data;
  },

  bulkSaveStaffAttendance: async (data) => {
    const response = await apiClient.post(apiEndpoints.staffAttendance.bulk, data);
    return response.data;
  },

  getStaffMonthlyReport: async (params) => {
    const response = await apiClient.get(apiEndpoints.staffAttendance.monthlyReport, { params });
    return response.data;
  },

  getLeaveRequests: async (params) => {
    const response = await apiClient.get(apiEndpoints.staffAttendance.leave, { params });
    return response.data;
  },

  createLeaveRequest: async (data) => {
    const response = await apiClient.post(apiEndpoints.staffAttendance.leave, data);
    return response.data;
  },

  actionLeaveRequest: async (id, actionData) => {
    const response = await apiClient.post(apiEndpoints.staffAttendance.leaveAction(id), actionData);
    return response.data;
  },
};
