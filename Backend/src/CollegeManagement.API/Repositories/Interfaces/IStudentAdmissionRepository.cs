using System.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStudentAdmissionRepository
    {
        // =====================================================
        // ADMISSION CRUD & QUERIES
        // =====================================================

        Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request,
            string? studentPhoto,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null);

        Task ValidateMasterReferencesAsync(CreateStudentAdmissionRequest request);

        Task ValidateFeeSelectionInputsAsync(int admissionId, IReadOnlyCollection<int> componentIds);

        Task<AdmissionIdempotencyRecordDto?> TryBeginIdempotencyAsync(
            string idempotencyKey,
            int? campusId,
            int? createdByUserId,
            string requestHash,
            DateTime expiresAtUtc);

        Task CompleteIdempotencyAsync(
            string idempotencyKey,
            int admissionId,
            string? admissionNo,
            int httpStatusCode,
            string responseJson,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null);

        Task FailIdempotencyAsync(
            string idempotencyKey,
            int httpStatusCode,
            string errorMessage);

        Task<AdmissionIdempotencyRecordDto?> GetIdempotencyRecordAsync(string idempotencyKey);

        Task<StudentAdmissionResponseDto?> GetByIdAsync(
            int admissionId);

        Task<Student?> GetStudentByAdmissionIdAsync(
            int admissionId,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null);

        Task<IEnumerable<StudentAdmissionResponseDto>> GetAllAsync(
            int? campusId = null);

        Task<StudentAdmissionResponseDto?> UpdateAsync(
            int admissionId,
            UpdateStudentAdmissionRequest request,
            string? studentPhoto);

        Task<bool> UpdateAdmissionNumberAsync(
            int admissionId,
            string admissionNo,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null);

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



        // =====================================================
        // VERIFY / APPROVE / REJECT
        // =====================================================

        Task<bool> VerifyAsync(
            VerifyStudentAdmissionRequest request);

        Task<IEnumerable<StudentAdmissionResponseDto>> GetOutgoingRequestsAsync(int campusId);
        Task<IEnumerable<StudentAdmissionResponseDto>> GetIncomingRequestsAsync(int campusId);
        Task<bool> ApproveAdmissionRequestAsync(int admissionId, string generatedAdmissionNo, string? remarks, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> RejectAdmissionRequestAsync(int admissionId, string rejectionReason, string? remarks);
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
