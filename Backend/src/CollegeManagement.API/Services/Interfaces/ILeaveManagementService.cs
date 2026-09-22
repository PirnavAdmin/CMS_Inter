using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ILeaveManagementService
    {
        Task<StaffLeaveResponse> CreateStaffLeaveRequestAsync(CreateStaffLeaveRequest request, int userId);
        Task<StaffLeaveResponse> ActionStaffLeaveRequestAsync(int leaveRequestId, StaffLeaveActionRequest request, int userId);
        Task<IEnumerable<StaffLeaveResponse>> GetStaffLeaveRequestsAsync(int? staffId = null, int? departmentId = null, LeaveStatus? status = null);
        Task<LeaveDetailsDto> GetStaffLeaveDetailsAsync(int leaveRequestId);
        Task<IEnumerable<StaffLeaveHistorySummaryDto>> GetStaffLeaveHistorySummaryAsync(int? departmentId = null, string? staffType = null);
        Task<StaffLeaveHistoryDto> GetStaffLeaveHistoryAsync(int staffId);
    }
}
