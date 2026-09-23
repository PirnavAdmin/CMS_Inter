using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStudentTransportAssignmentService
    {
        Task<PagedResult<StudentTransportAssignmentDto>> GetAllAsync(
            StudentTransportAssignmentFilterDto filter);

        Task<StudentTransportAssignmentDto?> GetByIdAsync(
            long studentTransportAssignmentId);

        Task<long> CreateAsync(
            CreateStudentTransportAssignmentDto dto,
            long? userId);

        Task<bool> UpdateAsync(
            long studentTransportAssignmentId,
            UpdateStudentTransportAssignmentDto dto,
            long? userId);

        Task<bool> DeleteAsync(
            long studentTransportAssignmentId,
            long? userId);

        Task<IEnumerable<StudentTransportAssignmentLookupDto>>
            GetLookupAsync();
    }
}
