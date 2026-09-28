import apiClient from "./apiClient.js";

export const getDashboard = () => apiClient.get('/api/v1/transport/driver/dashboard');
export const getRoute = () => apiClient.get('/api/v1/transport/driver/route');
export const getTrips = () => apiClient.get('/api/v1/transport/driver/trips');
export const startTrip = (tripId) => apiClient.post(`/api/v1/transport/driver/trips/${tripId}/start`);
export const endTrip = (tripId) => apiClient.post(`/api/v1/transport/driver/trips/${tripId}/end`);
export const getStudents = (filters) => apiClient.get('/api/v1/transport/driver/students', { params: filters });
export const updateStudentAttendance = (studentId, data) => apiClient.post(`/api/v1/transport/driver/students/${studentId}/attendance`, data);
export const bulkAttendance = (data) => apiClient.post('/api/v1/transport/driver/students/attendance/bulk', data);
export const getGps = () => apiClient.get('/api/v1/transport/driver/gps/current');
export const sendGpsLocation = (data) => apiClient.post('/api/v1/transport/driver/gps/location', data);
export const getReports = (filters) => apiClient.get('/api/v1/transport/driver/reports', { params: filters });
export const getProfile = () => apiClient.get('/api/v1/transport/driver/profile');
export const updateProfileContact = (data) => apiClient.put('/api/v1/transport/driver/profile/contact', data);
