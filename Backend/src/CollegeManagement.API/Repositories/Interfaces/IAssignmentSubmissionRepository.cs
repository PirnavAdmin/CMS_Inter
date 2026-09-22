using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAssignmentSubmissionRepository
    {
        Task<AssignmentSubmission?> CreateAsync(
            AssignmentSubmission submission);

        Task<List<AssignmentSubmission>> GetByAssignmentAsync(
            int assignmentId);

        Task<List<AssignmentSubmission>> GetByStudentAsync(
            int studentId);

        Task<AssignmentSubmission?> GetByIdAsync(
            int submissionId);
    }
}