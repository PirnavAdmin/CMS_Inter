using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NonTeaching;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface INonTeachingRepository
    {
        Task<DepartmentModuleDto> GetDepartmentPortalDataAsync(int? campusId, string departmentCode);
        Task<DepartmentRecordDto> CreateDepartmentRecordAsync(int? campusId, string departmentCode, CreateDepartmentRecordDto record, int? userId);
        Task<IEnumerable<StaffTaskDto>> GetStaffTasksAsync(int staffId);
        Task<StaffTaskDto> CreateStaffTaskAsync(int staffId, int? campusId, CreateStaffTaskDto dto);
        Task<bool> UpdateStaffTaskStatusAsync(int taskId, int staffId, string status);
        Task<IEnumerable<StaffSupportTicketDto>> GetStaffSupportTicketsAsync(int staffId);
        Task<StaffSupportTicketDto> CreateStaffSupportTicketAsync(int staffId, int? campusId, CreateStaffSupportTicketDto dto);
        Task<bool> UpdateStaffContactAsync(int staffId, string mobile, string emergencyContact, string address);
    }
}
