using System;
using System.Collections.Generic;
using System.Threading.Tasks;
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

        public async Task<PagedResult<TransportDriverDto>> GetAllAsync(TransportDriverFilterDto filter)
        {
            return await _repository.GetAllAsync(filter);
        }

        public async Task<TransportDriverDto?> GetByIdAsync(long driverId)
        {
            var driver = await _repository.GetByIdAsync(driverId);
            if (driver == null)
            {
                driver = await _repository.GetByIdOrNumberAsync(driverId.ToString());
            }
            return driver;
        }

        public Task<long> CreateAsync(CreateTransportDriverDto dto, long? userId)
        {
            throw new InvalidOperationException("Independent driver creation in the Transport module has been decommissioned. Drivers are created and maintained solely through the Staff module (Non-Teaching Staff with Role: Driver).");
        }

        public async Task<bool> UpdateAsync(long driverId, UpdateTransportDriverDto dto, long? userId)
        {
            return await _repository.UpdateAsync(driverId, dto, userId);
        }

        public async Task<bool> DeleteAsync(long driverId, long? userId)
        {
            return await _repository.DeleteAsync(driverId, userId);
        }

        public async Task<IEnumerable<TransportDriverLookupDto>> GetLookupAsync()
        {
            return await _repository.GetLookupAsync();
        }

        public async Task<TransportDriverDto?> GetByIdOrNumberAsync(string driverIdOrNumber)
        {
            var driver = await _repository.GetByIdOrNumberAsync(driverIdOrNumber);
            if (driver == null && long.TryParse(driverIdOrNumber.Trim(), out var numericId))
            {
                driver = await _repository.GetByIdAsync(numericId);
            }
            return driver;
        }

        public async Task<IEnumerable<DriverDocumentDto>> GetDocumentsAsync(long driverId)
        {
            return await _repository.GetDocumentsAsync(driverId);
        }

        public async Task<DriverDocumentDto> CreateDocumentAsync(long driverId, DriverDocumentDto dto)
        {
            return await _repository.CreateDocumentAsync(driverId, dto);
        }

        public async Task<bool> DeleteDocumentAsync(long documentId, long driverId)
        {
            return await _repository.DeleteDocumentAsync(documentId, driverId);
        }
    }
}
