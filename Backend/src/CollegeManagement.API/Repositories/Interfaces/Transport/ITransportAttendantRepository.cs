using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Attendant;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITransportAttendantRepository
    {
        Task<PagedResult<TransportAttendantDto>> GetAllAsync(TransportAttendantFilterDto filter);
        Task<TransportAttendantDto?> GetByIdAsync(long attendantId);
        Task<long> CreateAsync(CreateTransportAttendantDto dto, long? userId);
        Task<bool> UpdateAsync(long attendantId, UpdateTransportAttendantDto dto, long? userId);
        Task<bool> DeleteAsync(long attendantId, long? userId);
        Task<IEnumerable<TransportAttendantLookupDto>> GetLookupAsync();
        Task<TransportAttendantDto?> GetByIdOrNameAsync(string attendantIdOrName);
    }
}

