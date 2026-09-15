import apiClient from "@/api/apiClient.js";

// Note: Ensure the base endpoint path correctly resolves to /api/v1
// apiClient handles baseUrl and auth headers automatically.

const getAuthHeaders = () => { /* Not needed since apiClient handles it */ };

const mapLeaveType = (type) => {
    switch(type) {
        case 1: return "Casual Leave";
        case 2: return "Sick Leave";
        case 3: return "Earned Leave";
        case 4: return "Maternity Leave";
        case 5: return "Other";
        default: return type;
    }
};

export const LEAVE_STATUS = {
    PENDING: 1,
    APPROVED: 2,
    REJECTED: 3
};

const mapLeaveStatus = (status) => {
    switch(status) {
        case LEAVE_STATUS.PENDING: return "Pending";
        case LEAVE_STATUS.APPROVED: return "Approved";
        case LEAVE_STATUS.REJECTED: return "Rejected";
        default: return status;
    }
};

const mapLeaveRequest = (req) => {
    if (!req) return req;
    return {
        ...req,
        leaveType: req.leaveCategoryName || mapLeaveType(req.leaveType),
        status: mapLeaveStatus(req.status),
        fromDate: req.startDate ? req.startDate.split('T')[0] : null,
        toDate: req.endDate ? req.endDate.split('T')[0] : null,
        days: req.totalDays
    };
};

export const getLeaveRequests = async (staffId = null, departmentId = null, status = null) => {
    try {
        const params = new URLSearchParams();
        if (staffId) params.append('staffId', staffId);
        if (departmentId) params.append('departmentId', departmentId);
        if (status) params.append('status', status);

        const response = await apiClient.get(`/api/v1/staff-attendance/leave?${params.toString()}`);
        const data = response.data?.data || response.data?.Data || [];
        return data.map(mapLeaveRequest);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        throw error;
    }
};

export const getLeaveDetails = async (leaveRequestId) => {
    try {
        const response = await apiClient.get(`/api/v1/staff-attendance/leave/${leaveRequestId}`);
        const data = response.data?.data || response.data?.Data;
        return mapLeaveRequest(data);
    } catch (error) {
        console.error(`Error fetching leave details for ID ${leaveRequestId}:`, error);
        throw error;
    }
};

export const submitLeaveRequest = async (requestPayload) => {
    try {
        const response = await apiClient.post(`/api/v1/staff-attendance/leave`, requestPayload);
        return response.data?.data || response.data?.Data;
    } catch (error) {
        console.error('Error submitting leave request:', error);
        throw error;
    }
};

export const reviewLeaveRequest = async (leaveRequestId, actionPayload) => {
    try {
        const response = await apiClient.post(`/api/v1/staff-attendance/leave/${leaveRequestId}/action`, actionPayload);
        const data = response.data?.data || response.data?.Data;
        return mapLeaveRequest(data);
    } catch (error) {
        console.error(`Error reviewing leave request ID ${leaveRequestId}:`, error);
        throw error;
    }
};

export const revokeApprovedLeave = async (leaveRequestId, adminRemark) => {
    return reviewLeaveRequest(leaveRequestId, {
        status: 3, // 3 mapped to Rejected in Enum
        rejectionReason: adminRemark
    });
};

export const getLeaveHistorySummary = async (departmentId = null, staffType = null) => {
    try {
        const params = new URLSearchParams();
        if (departmentId) params.append('departmentId', departmentId);
        if (staffType) params.append('staffType', staffType);

        const response = await apiClient.get(`/api/v1/staff-attendance/leave/history?${params.toString()}`);
        return response.data?.data || response.data?.Data || [];
    } catch (error) {
        console.error('Error fetching leave history summary:', error);
        throw error;
    }
};

export const getLeaveHistory = async (staffId) => {
    try {
        const response = await apiClient.get(`/api/v1/staff-attendance/leave/history/staff/${staffId}`);
        const data = response.data?.data || response.data?.Data;
        if (data) {
            const rawList = data.history || data.History || [];
            return {
                ...data,
                history: rawList.map(mapLeaveRequest)
            };
        }
        return data;
    } catch (error) {
        console.error(`Error fetching leave history for staff ID ${staffId}:`, error);
        throw error;
    }
};

const mapAffectedClass = (ac) => {
    if (!ac) return ac;
    const formatTime = (timeSpan) => {
        if (!timeSpan) return "";
        const [h, m] = timeSpan.split(':');
        const d = new Date(); d.setHours(h, m);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };
    return {
        id: ac.timetableId,
        date: ac.substitutionDate ? ac.substitutionDate.split('T')[0] : null,
        period: ac.periodName || `P${ac.periodNumber}`,
        time: `${formatTime(ac.startTime)} - ${formatTime(ac.endTime)}`,
        program: ac.programName || ac.groupName,
        group: ac.groupName,
        section: ac.sectionName,
        subject: ac.subjectName,
        originalFaculty: ac.originalStaffName,
        substitution: ac.existingSubstitutionId ? {
            id: ac.existingSubstitutionId,
            substituteName: ac.existingSubstituteStaffName,
            substituteId: ac.existingSubstituteStaffEmployeeId,
            status: ac.currentSubstitutionStatus
        } : null
    };
};

export const getAffectedClasses = async (leaveRequestId) => {
    try {
        const response = await apiClient.get(`/api/v1/staff-leaves/${leaveRequestId}/affected-classes`);
        const data = response.data?.data || response.data?.Data || [];
        return data.map(mapAffectedClass);
    } catch (error) {
        console.error(`Error fetching affected classes for leave ID ${leaveRequestId}:`, error);
        throw error;
    }
};

const mapSubstitute = (sub) => {
    if (!sub) return sub;
    return {
        id: sub.employeeId,
        staffId: sub.staffId,
        name: sub.staffName,
        department: sub.departmentName,
        subjects: [], // Can map if backend provides
        classes: sub.weeklyLoadCount,
        active: true,
        busy: sub.dateSubstitutionCount > 0 ? ["busy"] : []
    };
};

export const getEligibleSubstitutes = async (leaveRequestId, timetableId, date) => {
    try {
        const params = new URLSearchParams({ date });
        const response = await apiClient.get(`/api/v1/staff-leaves/${leaveRequestId}/slots/${timetableId}/eligible-substitutes?${params.toString()}`);
        const data = response.data?.data || response.data?.Data || [];
        return data.map(mapSubstitute);
    } catch (error) {
        console.error('Error fetching eligible substitutes:', error);
        throw error;
    }
};

export const assignSubstitutes = async (leaveRequestId, requestPayload) => {
    try {
        const response = await apiClient.post(`/api/v1/staff-leaves/${leaveRequestId}/substitutions`, requestPayload);
        return response.data?.data || response.data?.Data || [];
    } catch (error) {
        console.error('Error assigning substitutes:', error);
        throw error;
    }
};
