using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport.Vehicle;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportVehicleService
    {
        Task<PagedResult<TransportVehicleDto>> GetAllAsync(TransportVehicleFilterDto filter);

        Task<TransportVehicleDto?> GetByIdAsync(long vehicleId);

        Task<long> CreateAsync(CreateTransportVehicleDto dto, long? userId);

        Task<bool> UpdateAsync(long vehicleId, UpdateTransportVehicleDto dto, long? userId);

        Task<bool> DeleteAsync(long vehicleId, long? userId);

        Task<IEnumerable<TransportVehicleLookupDto>> GetLookupAsync();

        Task<TransportVehicleDto?> GetByIdOrNumberAsync(string vehicleIdOrNumber);
    }
}
