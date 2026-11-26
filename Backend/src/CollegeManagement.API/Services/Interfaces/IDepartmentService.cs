using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IDepartmentService
    {
        Task<IEnumerable<DepartmentResponseDto>> GetActiveDepartmentsAsync(int? campusId = null, int? collegeId = null);
        Task<IEnumerable<DepartmentResponseDto>> GetDepartmentsAsync(string? staffType = null, bool includeInactive = true, int? campusId = null, int? collegeId = null);
        Task<DepartmentResponseDto?> GetByIdAsync(int id);
        Task<DepartmentResponseDto> CreateDepartmentAsync(CreateDepartmentDto dto, int? campusId = null, int? collegeId = null);
        Task<DepartmentResponseDto?> UpdateDepartmentAsync(int id, UpdateDepartmentDto dto, int? campusId = null, int? collegeId = null);
        Task<(bool Success, string Message)> DeleteDepartmentAsync(int id);
        Task<DepartmentSummaryDto> GetSummaryAsync(int? campusId = null, int? collegeId = null);
        Task<bool> ValidateCodeAsync(string code, int? excludeId = null, int? campusId = null, int? collegeId = null);
        Task<bool> ValidateNameAsync(string name, int? excludeId = null, int? campusId = null, int? collegeId = null);
        Task<MasterImportResultDto> ImportDepartmentsFromExcelAsync(Microsoft.AspNetCore.Http.IFormFile file, string? defaultStaffType = null, int? campusId = null, int? collegeId = null);
        Task<MasterImportResultDto> ImportDepartmentsAndDesignationsFromExcelAsync(Microsoft.AspNetCore.Http.IFormFile file, string? defaultStaffType = null, int? campusId = null, int? collegeId = null);
        Task<MasterImportResultDto> BulkImportDepartmentsAsync(IEnumerable<CreateDepartmentDto> dtos, string? defaultStaffType = null, int? campusId = null, int? collegeId = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDepartmentTemplateExcelAsync(string? staffType = null, int? campusId = null, int? collegeId = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateDepartmentDesignationTemplateExcelAsync(string? staffType = null, int? campusId = null, int? collegeId = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> ExportDepartmentsExcelAsync(string? staffType = null, int? campusId = null, int? collegeId = null);
    }
}
