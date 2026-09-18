using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportVehicleAssignmentService
    {
        Task<PagedResult<TransportVehicleAssignmentDto>> GetAllAsync(
            TransportVehicleAssignmentFilterDto filter);

        Task<TransportVehicleAssignmentDto?> GetByIdAsync(long assignmentId);

        Task<long> CreateAsync(
            CreateTransportVehicleAssignmentDto dto,
            long? userId);

        Task<bool> UpdateAsync(
            long assignmentId,
            UpdateTransportVehicleAssignmentDto dto,
            long? userId);

        Task<bool> DeleteAsync(
            long assignmentId,
            long? userId);

        Task<IEnumerable<TransportVehicleAssignmentLookupDto>> GetLookupAsync();
    }
}
