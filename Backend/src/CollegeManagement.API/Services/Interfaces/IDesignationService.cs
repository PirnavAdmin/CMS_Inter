using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IDesignationService
    {
        Task<IEnumerable<DesignationResponseDto>> GetAllAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null);
        Task<DesignationResponseDto?> GetByIdAsync(int id);
        Task<DesignationResponseDto> CreateAsync(CreateDesignationDto dto);
        Task<DesignationResponseDto?> UpdateAsync(int id, UpdateDesignationDto dto);
        Task<(bool Success, string Message)> DeleteAsync(int id);
        Task<bool> DeleteByIdAsync(int id);
        Task<DesignationSummaryDto> GetSummaryAsync();
        Task<bool> ValidateNameAsync(string name, int? excludeId = null);
        Task<MasterImportResultDto> ImportDesignationsFromExcelAsync(Microsoft.AspNetCore.Http.IFormFile file, string? defaultStaffType = null, int? defaultDepartmentId = null);
        Task<MasterImportResultDto> BulkImportDesignationsAsync(IEnumerable<CreateDesignationDto> dtos, string? defaultStaffType = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDesignationTemplateExcelAsync(string? staffType = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> ExportDesignationsExcelAsync(string? staffType = null, int? departmentId = null);
    }
}
