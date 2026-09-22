using CollegeManagement.API.DTOs.Assignment;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAssignmentRepository
    {
        Task<IEnumerable<Assignment>> GetAllAsync();

        Task<Assignment?> GetByIdAsync(int id);

        Task AddAsync(Assignment assignment);

        Task UpdateAsync(Assignment assignment);

        Task DeleteAsync(Assignment assignment);



        Task<bool> PublishAssignmentAsync(int assignmentId);

        Task<IEnumerable<Assignment>> GetPublishedAssignmentsAsync();

        Task<Assignment?> CreateAdminAssignmentAsync(Assignment assignment);

        Task<IEnumerable<Assignment>> GetAdminAssignmentsAsync();

        Task<IEnumerable<SubjectDropdownDto>>
GetSubjectsByGroupAsync(int groupId);

        Task<IEnumerable<FacultyDropdownDto>>
        GetFacultyBySubjectAsync(
            int subjectId,
            int groupId,
            int academicYearId,
            string academicLevel);
    }


}