using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class LeaveManagementService : ILeaveManagementService
    {
        private readonly ILeaveManagementRepository _repository;

        public LeaveManagementService(ILeaveManagementRepository repository)
        {
            _repository = repository;
        }

        public async Task<StaffLeaveResponse> CreateStaffLeaveRequestAsync(CreateStaffLeaveRequest request, int userId)
        {
            return await _repository.CreateStaffLeaveRequestAsync(request, userId);
        }

        public async Task<StaffLeaveResponse> ActionStaffLeaveRequestAsync(int leaveRequestId, StaffLeaveActionRequest request, int userId)
        {
            return await _repository.ActionStaffLeaveRequestAsync(leaveRequestId, request, userId);
        }

        public async Task<IEnumerable<StaffLeaveResponse>> GetStaffLeaveRequestsAsync(int? campusId = null, int? staffId = null, int? departmentId = null, LeaveStatus? status = null)
        {
            return await _repository.GetStaffLeaveRequestsAsync(campusId, staffId, departmentId, status);
        }

        public async Task<LeaveDetailsDto> GetStaffLeaveDetailsAsync(int leaveRequestId)
        {
            var details = await _repository.GetStaffLeaveDetailsAsync(leaveRequestId);
            if (details == null)
            {
                throw new NotFoundException($"Staff leave request with ID {leaveRequestId} not found.");
            }
            return details;
        }

        public async Task<IEnumerable<StaffLeaveHistorySummaryDto>> GetStaffLeaveHistorySummaryAsync(int? campusId = null, int? departmentId = null, string? staffType = null)
        {
            return await _repository.GetStaffLeaveHistorySummaryAsync(campusId, departmentId, staffType);
        }

        public async Task<StaffLeaveHistoryDto> GetStaffLeaveHistoryAsync(int staffId)
        {
            return await _repository.GetStaffLeaveHistoryAsync(staffId);
        }
    }
}
