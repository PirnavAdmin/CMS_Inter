using System.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStudentAdmissionRepository
    {
        // =====================================================
        // ADMISSION
        // =====================================================

        Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request,
            string? studentPhoto);

        Task<StudentAdmissionResponseDto?> GetByIdAsync(
            int admissionId);

        Task<Student?> GetStudentByAdmissionIdAsync(
            int admissionId,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null);

        Task<IEnumerable<StudentAdmissionResponseDto>> GetAllAsync();

        Task<StudentAdmissionResponseDto?> UpdateAsync(
            int admissionId,
            UpdateStudentAdmissionRequest request,
            string? studentPhoto);
        //optional check box//
        Task<int> SaveAdmissionFeeSelectionsAsync(
     int admissionId,
     SaveAdmissionFeeSelectionsRequest request);
        // Blood groups
        public Task<IEnumerable<string>> GetBloodGroupsAsync()
        {
            IEnumerable<string> bloodGroups = new[]
            {
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-"
            };

            return Task.FromResult(bloodGroups);
        }

        Task<string> GenerateAdmissionNumberAsync();

        // =====================================================
        // VERIFY / APPROVE / REJECT
        // =====================================================

        Task<bool> VerifyAsync(
            VerifyStudentAdmissionRequest request);

        Task<bool> ApproveAsync(
            ApproveStudentAdmissionRequest request,
            string? passwordHash = null,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null);

        Task<bool> RejectAsync(
            RejectStudentAdmissionRequest request);

        Task<bool> DeleteAsync(
            int admissionId);

        // =====================================================
        // SECTION ALLOCATION
        // =====================================================

        Task<bool> AllocateSectionAsync(
            AllocateSectionRequest request);

        Task<int> BulkAllocateSectionAsync(
            BulkSectionAllocationRequest request);

        // =====================================================
        // ROLL NUMBER ALLOCATION
        // =====================================================

        Task<int> BulkAllocateRollNumbersAsync(
            BulkRollNumberAllocationRequest request);
    }
}
