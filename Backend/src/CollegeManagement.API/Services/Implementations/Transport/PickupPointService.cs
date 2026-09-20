using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class PickupPointService : IPickupPointService
    {
        private readonly IPickupPointRepository _repository;

        public PickupPointService(IPickupPointRepository repository)
        {
            _repository = repository;
        }

        public async Task<PagedResult<PickupPointDto>> GetAllAsync(PickupPointFilterDto filter)
        {
            return await _repository.GetAllAsync(filter);
        }

        public async Task<PickupPointDto?> GetByIdAsync(long pickupPointId)
        {
            return await _repository.GetByIdAsync(pickupPointId);
        }

        public async Task<long> CreateAsync(CreatePickupPointDto dto, long? userId)
        {
            var exists = await _repository.ExistsAsync(
                dto.RouteId,
                dto.PickupPointName);

            if (exists)
                throw new Exception("Pickup point already exists for this route.");

            return await _repository.CreateAsync(dto, userId);
        }

        public async Task<bool> UpdateAsync(
            long pickupPointId,
            UpdatePickupPointDto dto,
            long? userId)
        {
            var exists = await _repository.ExistsAsync(
                dto.RouteId,
                dto.PickupPointName,
                pickupPointId);

            if (exists)
                throw new Exception("Pickup point already exists for this route.");

            return await _repository.UpdateAsync(
                pickupPointId,
                dto,
                userId);
        }

        public async Task<bool> DeleteAsync(
            long pickupPointId,
            long? userId)
        {
            return await _repository.DeleteAsync(
                pickupPointId,
                userId);
        }

        public async Task<IEnumerable<PickupPointLookupDto>> GetLookupAsync(long? routeId)
        {
            return await _repository.GetLookupAsync(routeId);
        }

        public async Task<PickupPointDto?> GetByIdOrNameAsync(string pickupIdOrName)
        {
            return await _repository.GetByIdOrNameAsync(pickupIdOrName);
        }
    }
}
