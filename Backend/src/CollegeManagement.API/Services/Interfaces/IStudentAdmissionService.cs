using CollegeManagement.API.DTOs.StudentAdmission;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStudentAdmissionService
    {
        // Admission
        Task<StudentAdmissionResponseDto> CreateAsync(
            CreateStudentAdmissionRequest request);

        Task<StudentAdmissionResponseDto?> GetByIdAsync(
            int admissionId);

        Task<IEnumerable<StudentAdmissionResponseDto>> GetAllAsync();

        Task<StudentAdmissionResponseDto?> UpdateAsync(
            int admissionId,
            UpdateStudentAdmissionRequest request);
        Task<IEnumerable<string>> GetBloodGroupsAsync();
        //generate//
        Task<string> GenerateAdmissionNumberAsync();


        // Verify / Approve / Reject
        Task<bool> VerifyAsync(
            VerifyStudentAdmissionRequest request);

        Task<bool> ApproveAsync(
            ApproveStudentAdmissionRequest request);

        Task<bool> RejectAsync(
            RejectStudentAdmissionRequest request);


        // Section
        Task<bool> AllocateSectionAsync(
            AllocateSectionRequest request);

        Task<int> BulkAllocateSectionAsync(
            BulkSectionAllocationRequest request);

        //option check box//
        Task<int> SaveAdmissionFeeSelectionsAsync(
    int admissionId,
    SaveAdmissionFeeSelectionsRequest request);
        // Roll Number
        Task<int> BulkAllocateRollNumbersAsync(
            BulkRollNumberAllocationRequest request);
    }
}