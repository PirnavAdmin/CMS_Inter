using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportVehicleService : ITransportVehicleService
    {
        private readonly ITransportVehicleRepository _repository;

        public TransportVehicleService(ITransportVehicleRepository repository)
        {
            _repository = repository;
        }

        public async Task<PagedResult<TransportVehicleDto>> GetAllAsync(
            TransportVehicleFilterDto filter)
        {
            return await _repository.GetAllAsync(filter);
        }

        public async Task<TransportVehicleDto?> GetByIdAsync(long vehicleId)
        {
            return await _repository.GetByIdAsync(vehicleId);
        }

        public async Task<long> CreateAsync(
            CreateTransportVehicleDto dto,
            long? userId)
        {
            var exists = await _repository.ExistsAsync(
                dto.VehicleNumber,
                dto.RegistrationNumber);

            if (exists)
            {
                dto.VehicleNumber = $"{dto.VehicleNumber}-{Random.Shared.Next(10, 99)}";
                dto.RegistrationNumber = $"{dto.RegistrationNumber}-{Random.Shared.Next(10, 99)}";
            }

            return await _repository.CreateAsync(dto, userId);
        }

        public async Task<bool> UpdateAsync(
            long vehicleId,
            UpdateTransportVehicleDto dto,
            long? userId)
        {
            return await _repository.UpdateAsync(
                vehicleId,
                dto,
                userId);
        }

        public async Task<bool> DeleteAsync(
            long vehicleId,
            long? userId)
        {
            return await _repository.DeleteAsync(vehicleId, userId);
        }

        public async Task<IEnumerable<TransportVehicleLookupDto>> GetLookupAsync()
        {
            return await _repository.GetLookupAsync();
        }

        public async Task<TransportVehicleDto?> GetByIdOrNumberAsync(string vehicleIdOrNumber)
        {
            return await _repository.GetByIdOrNumberAsync(vehicleIdOrNumber);
        }
    }
}
