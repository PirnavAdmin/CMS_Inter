using CollegeManagement.API.DTOs.Assignment;
using CollegeManagement.API.DTOs.Assignment.Admin;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.DTOs.AssignmentSubmission;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAssignmentService
    {
        Task<IEnumerable<AssignmentResponseDto>> GetAllAsync();

        Task<AssignmentResponseDto?> GetByIdAsync(int id);

        Task<AssignmentResponseDto> CreateAsync(CreateAssignmentDto dto);

        Task<AssignmentResponseDto?> UpdateAsync(int id, UpdateAssignmentDto dto);

        Task<bool> DeleteAsync(int id);

        Task<bool> PublishAssignmentAsync(int assignmentId);

        Task<bool> PublishAssignmentsAsync(List<int> assignmentIds);

        Task<IEnumerable<AssignmentResponseDto>> GetPublishedAssignmentsAsync();

        Task<List<AdminAssignmentResponseDto>> CreateAdminAssignmentAsync(
     CreateAdminAssignmentDto dto);

        Task<IEnumerable<AdminAssignmentResponseDto>>
        GetAdminAssignmentsAsync();



        Task<IEnumerable<SubjectDropdownDto>>
GetSubjectsByGroupAsync(int groupId);

        Task<IEnumerable<FacultyDropdownDto>>
        GetFacultyDropdownAsync(
            int subjectId,
            int groupId,
            int academicYearId,
            string academicLevel);
    }
}