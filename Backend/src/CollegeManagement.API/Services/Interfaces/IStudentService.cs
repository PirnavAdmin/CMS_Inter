using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services
{
    public interface IStudentService
    {
        // =========================================================
        // STUDENT CRUD
        // =========================================================

        Task<List<StudentListItemDto>> GetAllAsync();

        Task<StudentResponse?> GetByIdAsync(
            int studentId);

        Task<StudentResponse> CreateAsync(
            CreateStudentRequest request);

        Task<StudentResponse?> UpdateAsync(
            int studentId,
            UpdateStudentRequest request);

        Task<bool> DeleteAsync(
            int studentId);


        // =========================================================
        // STUDENT PROFILE (ADMIN)
        // =========================================================

        Task<StudentProfileDto?> GetProfileAsync(
            int studentId);

        Task<StudentProfileDto?> UpdateProfileAsync(
            int studentId,
            StudentProfileDto request);


        // =========================================================
        // SELF-SERVICE PROFILE & CREDENTIALS
        // =========================================================

        Task<StudentSelfProfileResponseDto?> GetSelfProfileAsync(
            int studentId);

        Task<bool> UpdateSelfProfileAsync(
            int studentId,
            StudentSelfProfileDto request);


        // =========================================================

        // ACADEMIC OPERATIONS
        // =========================================================

        Task<bool> ChangeSectionAsync(
            int studentId,
            ChangeSectionRequest request);

        Task<bool> ChangeGroupAsync(
            int studentId,
            ChangeGroupRequest request);

        Task<bool> TransferAsync(
            int studentId,
            TransferStudentRequest request);


        // =========================================================
        // STUDENT STATUS
        // =========================================================

        Task<bool> SuspendAsync(
            int studentId,
            SuspendStudentRequest request);

        Task<bool> ActivateAsync(
            int studentId);


        // =========================================================
        // AUTHENTICATION & FILES
        // =========================================================

        Task<StudentPhotoUploadResultDto> UploadPhotoAsync(int studentId, IFormFile file, CancellationToken ct = default);
        Task<StudentDocumentUploadResultDto> UploadDocumentAsync(int studentId, string documentType, IFormFile file, CancellationToken ct = default);
        Task<bool> ResetPasswordAsync(
            int studentId);


        // =========================================================
        // DASHBOARD
        // =========================================================

        Task<StudentDashboardDto?> GetDashboardAsync(
            int studentId);


        // =========================================================
        // SEARCH / FILTER
        // =========================================================

        Task<List<StudentListItemDto>> SearchAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            int? sectionId,
            bool? isActive);


        // =========================================================
        // GET BY GROUP
        // =========================================================

        Task<List<StudentListItemDto>> GetByGroupAsync(
            int groupId);


        // =========================================================
        // GET BY SECTION
        // =========================================================

        Task<List<StudentListItemDto>> GetBySectionAsync(
            int sectionId);


        // =========================================================
        // GET ACTIVE STUDENTS
        // =========================================================

        Task<List<StudentListItemDto>> GetActiveAsync();


        // =========================================================
        // VALIDATION
        // =========================================================

        Task<bool> EmailExistsAsync(
            string email,
            int? excludeStudentId = null);

        Task<bool> MobileExistsAsync(
            string mobile,
            int? excludeStudentId = null);
    }
}
