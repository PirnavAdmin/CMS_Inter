namespace CollegeManagement.API.Services.Interfaces;

using CollegeManagement.API.Dtos;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface ITransportService
{
    // Vehicles
    Task<List<TransportVehicleDto>> GetAllVehiclesAsync();
    Task<TransportVehicleDto> GetVehicleByIdAsync(long id);
    Task<TransportVehicleDto> CreateVehicleAsync(CreateTransportVehicleDto dto);
    Task<TransportVehicleDto> UpdateVehicleAsync(long id, CreateTransportVehicleDto dto);
    Task<bool> DeleteVehicleAsync(long id);

    // Routes
    Task<List<TransportRouteDto>> GetAllRoutesAsync();
    Task<TransportRouteDto> GetRouteByIdAsync(long id);
    Task<TransportRouteDto> CreateRouteAsync(CreateTransportRouteDto dto);
    Task<TransportRouteDto> UpdateRouteAsync(long id, CreateTransportRouteDto dto);
    Task<bool> DeleteRouteAsync(long id);

    // Drivers
    Task<List<TransportDriverDto>> GetAllDriversAsync();
    Task<TransportDriverDto> GetDriverByIdAsync(long id);
    Task<TransportDriverDto> CreateDriverAsync(CreateTransportDriverDto dto);
    Task<TransportDriverDto> UpdateDriverAsync(long id, CreateTransportDriverDto dto);
    Task<bool> DeleteDriverAsync(long id);
}

