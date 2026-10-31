using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ILeaveManagementRepository
    {
        Task<IEnumerable<StaffLeaveResponse>> GetStaffLeaveRequestsAsync(int? campusId = null, int? staffId = null, int? departmentId = null, LeaveStatus? status = null);
        Task<LeaveDetailsDto?> GetStaffLeaveDetailsAsync(int leaveRequestId);
        Task<StaffLeaveResponse> CreateStaffLeaveRequestAsync(CreateStaffLeaveRequest request, int userId);
        Task<StaffLeaveResponse> ActionStaffLeaveRequestAsync(int leaveRequestId, StaffLeaveActionRequest request, int userId);
        Task<IEnumerable<StaffLeaveHistorySummaryDto>> GetStaffLeaveHistorySummaryAsync(int? campusId = null, int? departmentId = null, string? staffType = null);
        Task<StaffLeaveHistoryDto> GetStaffLeaveHistoryAsync(int staffId, int? campusId = null);
    }
}
