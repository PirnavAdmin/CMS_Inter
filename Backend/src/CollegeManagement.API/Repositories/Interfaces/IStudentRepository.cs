using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories
{
    public interface IStudentRepository
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

        // STUDENT ACADEMIC
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

        Task<bool> UpdatePhotoPathAsync(int studentId, string photoPath);
        Task<bool> UpdateDocumentPathAsync(int studentId, string documentColumn, string documentPath);
        Task<bool> ResetPasswordAsync(
            int studentId);


        // =========================================================
        // STUDENT DASHBOARD
        // =========================================================

        Task<StudentDashboardDto?> GetDashboardAsync(
            int studentId);


        Task<List<StudentListItemDto>> SearchAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            int? sectionId,
            bool? isActive);

        Task<List<StudentListItemDto>> GetByGroupAsync(
            int groupId);

        Task<List<StudentListItemDto>> GetBySectionAsync(
            int sectionId);

        Task<List<StudentListItemDto>> GetActiveAsync();

        Task<bool> EmailExistsAsync(
            string email,
            int? excludeStudentId = null);

        Task<bool> MobileExistsAsync(
            string mobile,
            int? excludeStudentId = null);
    }
}
