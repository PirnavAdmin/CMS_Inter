using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportAttendantService : ITransportAttendantService
    {
        private readonly ITransportAttendantRepository _repository;

        public TransportAttendantService(ITransportAttendantRepository repository)
        {
            _repository = repository;
        }

        public async Task<PagedResult<TransportAttendantDto>> GetAllAsync(TransportAttendantFilterDto filter)
        {
            return await _repository.GetAllAsync(filter);
        }

        public async Task<TransportAttendantDto?> GetByIdAsync(long attendantId)
        {
            return await _repository.GetByIdAsync(attendantId);
        }

        public async Task<long> CreateAsync(CreateTransportAttendantDto dto, long? userId)
        {
            return await _repository.CreateAsync(dto, userId);
        }

        public async Task<bool> UpdateAsync(long attendantId, UpdateTransportAttendantDto dto, long? userId)
        {
            return await _repository.UpdateAsync(attendantId, dto, userId);
        }

        public async Task<bool> DeleteAsync(long attendantId, long? userId)
        {
            return await _repository.DeleteAsync(attendantId, userId);
        }

        public async Task<IEnumerable<TransportAttendantLookupDto>> GetLookupAsync()
        {
            return await _repository.GetLookupAsync();
        }

        public async Task<TransportAttendantDto?> GetByIdOrNameAsync(string attendantIdOrName)
        {
            return await _repository.GetByIdOrNameAsync(attendantIdOrName);
        }
    }
}

