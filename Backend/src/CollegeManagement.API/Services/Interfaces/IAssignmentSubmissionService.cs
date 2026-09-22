using CollegeManagement.API.DTOs.AssignmentSubmission;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAssignmentSubmissionService
    {
        Task<AssignmentSubmissionResponseDto> CreateAsync(
            CreateAssignmentSubmissionDto dto);

        Task<List<AssignmentSubmissionResponseDto>>
    GetByAssignmentAsync(int assignmentId);


        Task<List<AssignmentSubmissionResponseDto>>
            GetByStudentAsync(int studentId);

        Task<AssignmentSubmissionResponseDto>
            GetByIdAsync(int submissionId);
    }
}