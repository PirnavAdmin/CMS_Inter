namespace CollegeManagement.API.Repositories.Implementations;

using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;

public class TransportRepository : ITransportRepository
{
    private readonly AppDbContext _context;

    public TransportRepository(AppDbContext context)
    {
        _context = context;
    }

    // Vehicles
    public async Task<List<TransportVehicle>> GetAllVehiclesAsync() =>
        await _context.TransportVehicles.AsNoTracking().ToListAsync();

    public async Task<TransportVehicle?> GetVehicleByIdAsync(long id) =>
        await _context.TransportVehicles.FindAsync(id);

    public async Task AddVehicleAsync(TransportVehicle vehicle) =>
        await _context.TransportVehicles.AddAsync(vehicle);

    public void RemoveVehicle(TransportVehicle vehicle) =>
        _context.TransportVehicles.Remove(vehicle);

    // Routes
    public async Task<List<TransportRoute>> GetAllRoutesAsync() =>
        await _context.TransportRoutes.AsNoTracking().Include(r => r.Vehicle).ToListAsync();

    public async Task<TransportRoute?> GetRouteByIdAsync(long id) =>
        await _context.TransportRoutes.Include(r => r.Vehicle).FirstOrDefaultAsync(r => r.RouteId == id);

    public async Task AddRouteAsync(TransportRoute route) =>
        await _context.TransportRoutes.AddAsync(route);

    public void RemoveRoute(TransportRoute route) =>
        _context.TransportRoutes.Remove(route);

    // Drivers
    public async Task<List<TransportDriver>> GetAllDriversAsync() =>
        await _context.TransportDrivers.AsNoTracking().Include(d => d.AssignedVehicle).ToListAsync();

    public async Task<TransportDriver?> GetDriverByIdAsync(long id) =>
        await _context.TransportDrivers.Include(d => d.AssignedVehicle).FirstOrDefaultAsync(d => d.DriverId == id);

    public async Task AddDriverAsync(TransportDriver driver) =>
        await _context.TransportDrivers.AddAsync(driver);

    public void RemoveDriver(TransportDriver driver) =>
        _context.TransportDrivers.Remove(driver);

    public async Task SaveChangesAsync() => await _context.SaveChangesAsync();
}

