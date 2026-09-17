using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStaffService
    {
        Task<PagedResult<StaffResponseDto>> GetPagedStaffAsync(StaffQueryParams queryParams);
        Task<IEnumerable<StaffDropdownDto>> GetStaffDropdownAsync(string? staffType = null);
        Task<StaffResponseDto?> GetStaffByIdAsync(int id);
        Task<StaffResponseDto?> GetStaffByEmployeeIdAsync(string employeeId);
        Task<StaffProfileFullDto> GetStaffProfileFullAsync(int id);
        Task<StaffProfileFullDto> GetStaffProfileByEmployeeIdAsync(string employeeId);
        Task<StaffProfileFullDto> GetStaffProfileByTokenAsync(string token);
        Task<string> GetNextEmployeeIdAsync(string staffType);
        Task<StaffDashboardStatsDto> GetDashboardStatsAsync(int? boardId = null);

        Task<StaffResponseDto> CreateStaffAsync(CreateStaffDto dto);
        Task<StaffResponseDto> UpdateStaffAsync(int id, UpdateStaffDto dto);
        Task<bool> DeleteStaffAsync(int id);

        Task<SendProfileLinkResponseDto> SendProfileLinkAsync(int id, SendProfileLinkRequestDto dto);
        Task<StaffBulkSendResultDto> BulkSendProfileLinksAsync(StaffBulkSendLinksDto dto);

        Task<StaffProfileFullDto> SaveProfileDraftAsync(int id, UpdateStaffProfileSectionDto dto);
        Task<StaffProfileFullDto> SaveProfileDraftByTokenAsync(string token, UpdateStaffProfileSectionDto dto);

        Task<StaffProfileFullDto> SubmitProfileAsync(int id);
        Task<StaffProfileFullDto> SubmitProfileByTokenAsync(string token);

        Task<StaffResponseDto> AdminReviewProfileAsync(int id, AdminReviewStaffDto dto);

        Task<StaffProfileFullDto> UploadDocumentAsync(int staffId, string documentType, IFormFile file);
        Task<StaffProfileFullDto> UploadDocumentByTokenAsync(string token, string documentType, IFormFile file);
        Task<StaffProfileFullDto> DeleteDocumentAsync(int staffId, string documentType);
        Task<StaffProfileFullDto> DeleteDocumentByTokenAsync(string token, string documentType);

        Task<StaffImportResultDto> ImportStaffFromExcelAsync(IFormFile file, string? defaultStaffType = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> ExportStaffExcelAsync(StaffQueryParams queryParams);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateTemplateExcelAsync(string? staffType = null);
        Task<(byte[] Bytes, string ContentType, string FileName)> GenerateProfilePdfAsync(int id);

        Task<StaffResponseDto> UploadPhotoAsync(UploadStaffPhotoDto dto);
        Task<(string PhysicalPath, string ContentType)> GetPhotoAsync(int id);

        Task<StaffSubjectAllocationResponseDto> AssignSubjectAsync(AssignStaffSubjectDto dto);
        Task<StaffSubjectAllocationResponseDto> UpdateSubjectAllocationAsync(int id, UpdateStaffSubjectAllocationDto dto);
        Task<bool> DeleteSubjectAllocationAsync(int id);
        Task<List<StaffSubjectAllocationResponseDto>> GetStaffSubjectAllocationsAsync(int staffId);
        Task<StaffWorkloadResponseDto?> GetStaffWorkloadAsync(int staffId);
    }
}
