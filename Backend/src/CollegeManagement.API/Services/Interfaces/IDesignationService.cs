using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IDesignationService
    {
        Task<IEnumerable<DesignationResponseDto>> GetAllAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null, int? campusId = null);
        Task<DesignationResponseDto?> GetByIdAsync(int id);
        Task<DesignationResponseDto> CreateAsync(CreateDesignationDto dto, int? campusId = null);
        Task<DesignationResponseDto?> UpdateAsync(int id, UpdateDesignationDto dto, int? campusId = null);
        Task<(bool Success, string Message)> DeleteAsync(int id);
        Task<bool> DeleteByIdAsync(int id);
        Task<DesignationSummaryDto> GetSummaryAsync(int? campusId = null);
        Task<bool> ValidateNameAsync(string name, int? excludeId = null, int? campusId = null);
        Task<MasterImportResultDto> ImportDesignationsFromExcelAsync(Microsoft.AspNetCore.Http.IFormFile file, string? defaultStaffType = null, int? defaultDepartmentId = null, int? campusId = null);
        Task<MasterImportResultDto> BulkImportDesignationsAsync(IEnumerable<CreateDesignationDto> dtos, string? defaultStaffType = null, int? campusId = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDesignationTemplateExcelAsync(string? staffType = null, int? campusId = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> ExportDesignationsExcelAsync(string? staffType = null, int? departmentId = null, int? campusId = null);
    }
}
