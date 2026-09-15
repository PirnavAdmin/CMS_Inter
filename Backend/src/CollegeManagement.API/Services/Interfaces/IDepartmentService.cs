using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IDepartmentService
    {
        Task<IEnumerable<DepartmentResponseDto>> GetActiveDepartmentsAsync();
        Task<IEnumerable<DepartmentResponseDto>> GetDepartmentsAsync(string? staffType = null, bool includeInactive = true);
        Task<DepartmentResponseDto?> GetByIdAsync(int id);
        Task<DepartmentResponseDto> CreateDepartmentAsync(CreateDepartmentDto dto);
        Task<DepartmentResponseDto?> UpdateDepartmentAsync(int id, UpdateDepartmentDto dto);
        Task<(bool Success, string Message)> DeleteDepartmentAsync(int id);
        Task<DepartmentSummaryDto> GetSummaryAsync();
        Task<bool> ValidateCodeAsync(string code, int? excludeId = null);
        Task<bool> ValidateNameAsync(string name, int? excludeId = null);
        Task<MasterImportResultDto> ImportDepartmentsFromExcelAsync(Microsoft.AspNetCore.Http.IFormFile file, string? defaultStaffType = null);
        Task<MasterImportResultDto> BulkImportDepartmentsAsync(IEnumerable<CreateDepartmentDto> dtos, string? defaultStaffType = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDepartmentTemplateExcelAsync(string? staffType = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> ExportDepartmentsExcelAsync(string? staffType = null);
    }
}
