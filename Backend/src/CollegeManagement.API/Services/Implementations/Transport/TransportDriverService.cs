using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportDriverService : ITransportDriverService
    {
        private readonly ITransportDriverRepository _repository;

        public TransportDriverService(ITransportDriverRepository repository)
        {
            _repository = repository;
        }

        public async Task<PagedResult<TransportDriverDto>> GetAllAsync(
            TransportDriverFilterDto filter)
        {
            return await _repository.GetAllAsync(filter);
        }

        public async Task<TransportDriverDto?> GetByIdAsync(long driverId)
        {
            return await _repository.GetByIdAsync(driverId);
        }

        public async Task<long> CreateAsync(
            CreateTransportDriverDto dto,
            long? userId)
        {
            var exists = await _repository.ExistsAsync(
                dto.LicenceNumber,
                dto.MobileNumber);

            if (exists)
                throw new Exception(
                    "Driver with the same Licence Number or Mobile Number already exists.");

            return await _repository.CreateAsync(dto, userId);
        }

        public async Task<bool> UpdateAsync(
            long driverId,
            UpdateTransportDriverDto dto,
            long? userId)
        {
            var exists = await _repository.ExistsAsync(
                dto.LicenceNumber,
                dto.MobileNumber,
                driverId);

            if (exists)
                throw new Exception(
                    "Driver with the same Licence Number or Mobile Number already exists.");

            return await _repository.UpdateAsync(
                driverId,
                dto,
                userId);
        }

        public async Task<bool> DeleteAsync(
            long driverId,
            long? userId)
        {
            return await _repository.DeleteAsync(driverId, userId);
        }

        public async Task<IEnumerable<TransportDriverLookupDto>> GetLookupAsync()
        {
            return await _repository.GetLookupAsync();
        }

        public async Task<TransportDriverDto?> GetByIdOrNumberAsync(string driverIdOrNumber)
        {
            return await _repository.GetByIdOrNumberAsync(driverIdOrNumber);
        }
    }
}
