using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportRouteService
    {
        Task<PagedResult<TransportRouteDto>> GetAllAsync(
            TransportRouteFilterDto filter);

        Task<TransportRouteDto?> GetByIdAsync(long routeId);

        Task<long> CreateAsync(
            CreateTransportRouteDto dto,
            long? userId);

        Task<bool> UpdateAsync(
            long routeId,
            UpdateTransportRouteDto dto,
            long? userId);

        Task<bool> DeleteAsync(
            long routeId,
            long? userId);

        Task<TransportRouteDto?> GetByIdOrCodeAsync(string routeIdOrCode);

        Task<IEnumerable<TransportRouteLookupDto>>
            GetLookupAsync(string? search, int limit);
    }
}
