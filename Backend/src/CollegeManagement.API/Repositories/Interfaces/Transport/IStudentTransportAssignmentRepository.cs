using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStudentTransportAssignmentRepository
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

        Task<bool> HasOverlappingAssignmentAsync(
            string admissionNo,
            DateTime effectiveFrom,
            DateTime? effectiveTo,
            long? excludeAssignmentId = null);

        Task<IEnumerable<StudentTransportAssignmentLookupDto>>
            GetLookupAsync();
    }
}
