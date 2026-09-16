using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.PickupPoint;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IPickupPointRepository
    {
        Task<PagedResult<PickupPointDto>> GetAllAsync(PickupPointFilterDto filter);

        Task<PickupPointDto?> GetByIdAsync(long pickupPointId);

        Task<long> CreateAsync(CreatePickupPointDto dto, long? userId);

        Task<bool> UpdateAsync(long pickupPointId, UpdatePickupPointDto dto, long? userId);

        Task<bool> DeleteAsync(long pickupPointId, long? userId);

        Task<IEnumerable<PickupPointLookupDto>> GetLookupAsync(long? routeId);

        Task<PickupPointDto?> GetByIdOrNameAsync(string pickupIdOrName);

        Task<bool> ExistsAsync(
            long routeId,
            string pickupPointName,
            long? excludePickupPointId = null);
    }
}
