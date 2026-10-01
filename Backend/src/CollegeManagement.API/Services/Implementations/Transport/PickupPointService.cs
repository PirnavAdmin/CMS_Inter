using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class PickupPointService : IPickupPointService
    {
        private readonly IPickupPointRepository _repository;
        private readonly ITransportRouteRepository _routeRepository;

        public PickupPointService(
            IPickupPointRepository repository,
            ITransportRouteRepository routeRepository)
        {
            _repository = repository;
            _routeRepository = routeRepository;
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
            var route = await _routeRepository.GetByIdAsync(dto.RouteId);
            if (route == null)
                throw new KeyNotFoundException($"Route with ID {dto.RouteId} not found.");

            if (string.Equals(route.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException($"Route with ID {dto.RouteId} is inactive.");

            dto.CampusId = route.CampusId;

            var exists = await _repository.ExistsAsync(
                dto.RouteId,
                dto.PickupPointName);

            if (exists)
                throw new InvalidOperationException("Pickup point already exists for this route.");

            if (dto.SequenceNo > 0)
            {
                var seqExists = await _repository.SequenceExistsAsync(dto.RouteId, dto.SequenceNo);
                if (seqExists)
                    throw new InvalidOperationException("Pickup point sequence number already exists for this route.");
            }

            return await _repository.CreateAsync(dto, userId);
        }

        public async Task<bool> UpdateAsync(
            long pickupPointId,
            UpdatePickupPointDto dto,
            long? userId)
        {
            var route = await _routeRepository.GetByIdAsync(dto.RouteId);
            if (route == null)
                throw new KeyNotFoundException($"Route with ID {dto.RouteId} not found.");

            dto.CampusId = route.CampusId;

            var exists = await _repository.ExistsAsync(
                dto.RouteId,
                dto.PickupPointName,
                pickupPointId);

            if (exists)
                throw new InvalidOperationException("Pickup point already exists for this route.");

            if (dto.SequenceNo > 0)
            {
                var seqExists = await _repository.SequenceExistsAsync(dto.RouteId, dto.SequenceNo, pickupPointId);
                if (seqExists)
                    throw new InvalidOperationException("Pickup point sequence number already exists for this route.");
            }

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

        public async Task<bool> ExistsAsync(long routeId, string pickupPointName, long? excludePickupPointId = null)
        {
            return await _repository.ExistsAsync(routeId, pickupPointName, excludePickupPointId);
        }

        public async Task<bool> SequenceExistsAsync(long routeId, int sequenceNo, long? excludePickupPointId = null)
        {
            return await _repository.SequenceExistsAsync(routeId, sequenceNo, excludePickupPointId);
        }
    }
}

