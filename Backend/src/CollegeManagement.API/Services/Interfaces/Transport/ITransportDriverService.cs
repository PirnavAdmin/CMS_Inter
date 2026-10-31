using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Driver;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportDriverService
    {
        Task<PagedResult<TransportDriverDto>> GetAllAsync(
            TransportDriverFilterDto filter);

        Task<TransportDriverDto?> GetByIdAsync(long driverId);

        Task<long> CreateAsync(
            CreateTransportDriverDto dto,
            long? userId);

        Task<bool> UpdateAsync(
            long driverId,
            UpdateTransportDriverDto dto,
            long? userId);

        Task<bool> DeleteAsync(
            long driverId,
            long? userId);

        Task<IEnumerable<TransportDriverLookupDto>> GetLookupAsync();

        Task<TransportDriverDto?> GetByIdOrNumberAsync(string driverIdOrNumber);

        Task<IEnumerable<DriverDocumentDto>> GetDocumentsAsync(long driverId);

        Task<DriverDocumentDto> CreateDocumentAsync(long driverId, DriverDocumentDto dto);

        Task<bool> DeleteDocumentAsync(long documentId, long driverId);
    }
}
