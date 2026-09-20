namespace CollegeManagement.API.Repositories.Interfaces;

using CollegeManagement.API.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

public interface ITransportRepository
{
    // Vehicles
    Task<List<TransportVehicle>> GetAllVehiclesAsync();
    Task<TransportVehicle?> GetVehicleByIdAsync(long id);
    Task AddVehicleAsync(TransportVehicle vehicle);
    void RemoveVehicle(TransportVehicle vehicle);

    // Routes
    Task<List<TransportRoute>> GetAllRoutesAsync();
    Task<TransportRoute?> GetRouteByIdAsync(long id);
    Task AddRouteAsync(TransportRoute route);
    void RemoveRoute(TransportRoute route);

    // Drivers
    Task<List<TransportDriver>> GetAllDriversAsync();
    Task<TransportDriver?> GetDriverByIdAsync(long id);
    Task AddDriverAsync(TransportDriver driver);
    void RemoveDriver(TransportDriver driver);

    Task SaveChangesAsync();
}

