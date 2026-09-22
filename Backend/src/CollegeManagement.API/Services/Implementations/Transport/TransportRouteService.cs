using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportRouteService : ITransportRouteService
    {
        private readonly ITransportRouteRepository _repository;

        public TransportRouteService(
            ITransportRouteRepository repository)
        {
            _repository = repository;
        }

        public async Task<PagedResult<TransportRouteDto>>
            GetAllAsync(TransportRouteFilterDto filter)
        {
            return await _repository.GetAllAsync(filter);
        }

        public async Task<TransportRouteDto?> GetByIdAsync(
            long routeId)
        {
            if (routeId <= 0)
                throw new ValidationException(
                    "Invalid route ID specified.");

            return await _repository.GetByIdAsync(routeId);
        }

        public async Task<long> CreateAsync(
            CreateTransportRouteDto dto,
            long? userId)
        {
            NormalizeCreateDto(dto);

            bool codeExists = await _repository.RouteCodeExistsAsync(dto.RouteCode);
            if (codeExists)
            {
                dto.RouteCode = $"{dto.RouteCode}-{Random.Shared.Next(10, 99)}";
            }

            return await _repository.CreateAsync(dto, userId);
        }

        public async Task<bool> UpdateAsync(
            long routeId,
            UpdateTransportRouteDto dto,
            long? userId)
        {
            if (routeId <= 0)
                return false;

            TransportRouteDto? existingRoute = await _repository.GetByIdAsync(routeId);
            if (existingRoute is null)
                return false;

            NormalizeUpdateDto(dto);

            return await _repository.UpdateAsync(routeId, dto, userId);
        }

        public async Task<bool> DeleteAsync(
            long routeId,
            long? userId)
        {
            if (routeId <= 0)
                throw new ValidationException(
                    "Invalid route ID specified.");

            return await _repository.DeleteAsync(
                routeId,
                userId);
        }

        public async Task<TransportRouteDto?> GetByIdOrCodeAsync(string routeIdOrCode)
        {
            return await _repository.GetByIdOrCodeAsync(routeIdOrCode);
        }

        public async Task<IEnumerable<TransportRouteLookupDto>>
            GetLookupAsync(string? search, int limit)
        {
            return await _repository.GetLookupAsync(
                search,
                limit);
        }

        private static void NormalizeCreateDto(
            CreateTransportRouteDto dto)
        {
            dto.RouteCode =
                dto.RouteCode.Trim().ToUpperInvariant();

            dto.RouteName = dto.RouteName.Trim();
            dto.StartLocation = dto.StartLocation.Trim();
            dto.EndLocation = dto.EndLocation.Trim();

            dto.Description =
                string.IsNullOrWhiteSpace(dto.Description)
                    ? null
                    : dto.Description.Trim();
        }

        private static void NormalizeUpdateDto(
            UpdateTransportRouteDto dto)
        {
            dto.RouteCode =
                dto.RouteCode.Trim().ToUpperInvariant();

            dto.RouteName = dto.RouteName.Trim();
            dto.StartLocation = dto.StartLocation.Trim();
            dto.EndLocation = dto.EndLocation.Trim();

            dto.Description =
                string.IsNullOrWhiteSpace(dto.Description)
                    ? null
                    : dto.Description.Trim();
        }

        private static void ValidateLocations(
            string startLocation,
            string endLocation)
        {
            if (string.Equals(
                startLocation.Trim(),
                endLocation.Trim(),
                StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException(
                    "Start location and end location cannot be the same.");
            }
        }
    }
}

