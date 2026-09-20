namespace CollegeManagement.API.Services.Implementations;

using CollegeManagement.API.Dtos;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class TransportService : ITransportService
{
    private readonly ITransportRepository _repository;

    public TransportService(ITransportRepository repository)
    {
        _repository = repository;
    }

    // --- VEHICLES ---
    public async Task<List<TransportVehicleDto>> GetAllVehiclesAsync()
    {
        var list = await _repository.GetAllVehiclesAsync();
        return list.Select(v => MapToVehicleDto(v)).ToList();
    }

    public async Task<TransportVehicleDto> GetVehicleByIdAsync(long id)
    {
        var vehicle = await _repository.GetVehicleByIdAsync(id)
            ?? throw new NotFoundException($"Transport Vehicle with ID '{id}' not found.");
        return MapToVehicleDto(vehicle);
    }

    public async Task<TransportVehicleDto> CreateVehicleAsync(CreateTransportVehicleDto dto)
    {
        var vehicle = new TransportVehicle
        {
            VehicleNumber = dto.VehicleNumber,
            RegistrationNumber = dto.RegistrationNumber,
            VehicleType = dto.VehicleType,
            Capacity = dto.Capacity,
            IsAC = dto.IsAC,
            Status = dto.Status.Equals("Active", System.StringComparison.OrdinalIgnoreCase)
        };

        await _repository.AddVehicleAsync(vehicle);
        await _repository.SaveChangesAsync();
        return MapToVehicleDto(vehicle);
    }

    public async Task<TransportVehicleDto> UpdateVehicleAsync(long id, CreateTransportVehicleDto dto)
    {
        var vehicle = await _repository.GetVehicleByIdAsync(id)
            ?? throw new NotFoundException($"Transport Vehicle with ID '{id}' not found.");

        vehicle.VehicleNumber = dto.VehicleNumber;
        vehicle.RegistrationNumber = dto.RegistrationNumber;
        vehicle.VehicleType = dto.VehicleType;
        vehicle.Capacity = dto.Capacity;
        vehicle.IsAC = dto.IsAC;
        vehicle.Status = dto.Status.Equals("Active", System.StringComparison.OrdinalIgnoreCase);

        await _repository.SaveChangesAsync();
        return MapToVehicleDto(vehicle);
    }

    public async Task<bool> DeleteVehicleAsync(long id)
    {
        var vehicle = await _repository.GetVehicleByIdAsync(id)
            ?? throw new NotFoundException($"Transport Vehicle with ID '{id}' not found.");

        _repository.RemoveVehicle(vehicle);
        await _repository.SaveChangesAsync();
        return true;
    }

    private static TransportVehicleDto MapToVehicleDto(TransportVehicle v) => new()
    {
        VehicleId = v.VehicleId,
        VehicleNumber = v.VehicleNumber ?? string.Empty,
        RegistrationNumber = v.RegistrationNumber ?? string.Empty,
        VehicleType = v.VehicleType ?? "Bus",
        Capacity = v.Capacity,
        IsAC = v.IsAC,
        Status = v.Status ? "Active" : "Inactive",
        StatusText = v.Status ? "Active" : "Inactive"
    };

    // --- ROUTES ---
    public async Task<List<TransportRouteDto>> GetAllRoutesAsync()
    {
        var list = await _repository.GetAllRoutesAsync();
        return list.Select(r => MapToRouteDto(r)).ToList();
    }

    public async Task<TransportRouteDto> GetRouteByIdAsync(long id)
    {
        var route = await _repository.GetRouteByIdAsync(id)
            ?? throw new NotFoundException($"Transport Route with ID '{id}' not found.");
        return MapToRouteDto(route);
    }

    public async Task<TransportRouteDto> CreateRouteAsync(CreateTransportRouteDto dto)
    {
        var route = new TransportRoute
        {
            RouteCode = dto.RouteCode,
            RouteName = dto.RouteName,
            PickupPoint = dto.PickupPoint ?? string.Empty,
            DropPoint = dto.DropPoint ?? string.Empty,
            DistanceKm = dto.DistanceKm,
            MonthlyFee = dto.MonthlyFee,
            Status = string.Equals(dto.Status, "Active", System.StringComparison.OrdinalIgnoreCase),
            VehicleId = dto.VehicleId
        };

        await _repository.AddRouteAsync(route);
        await _repository.SaveChangesAsync();
        return MapToRouteDto(route);
    }

    public async Task<TransportRouteDto> UpdateRouteAsync(long id, CreateTransportRouteDto dto)
    {
        var route = await _repository.GetRouteByIdAsync(id)
            ?? throw new NotFoundException($"Transport Route with ID '{id}' not found.");

        route.RouteCode = dto.RouteCode;
        route.RouteName = dto.RouteName;
        route.PickupPoint = dto.PickupPoint ?? string.Empty;
        route.DropPoint = dto.DropPoint ?? string.Empty;
        route.DistanceKm = dto.DistanceKm;
        route.MonthlyFee = dto.MonthlyFee;
        route.Status = string.Equals(dto.Status, "Active", System.StringComparison.OrdinalIgnoreCase);
        route.VehicleId = dto.VehicleId;

        await _repository.SaveChangesAsync();
        return MapToRouteDto(route);
    }

    public async Task<bool> DeleteRouteAsync(long id)
    {
        var route = await _repository.GetRouteByIdAsync(id)
            ?? throw new NotFoundException($"Transport Route with ID '{id}' not found.");

        _repository.RemoveRoute(route);
        await _repository.SaveChangesAsync();
        return true;
    }

    private static TransportRouteDto MapToRouteDto(TransportRoute r) => new()
    {
        RouteId = r.RouteId,
        RouteCode = r.RouteCode ?? string.Empty,
        RouteName = r.RouteName ?? string.Empty,
        PickupPoint = r.PickupPoint ?? string.Empty,
        DropPoint = r.DropPoint ?? string.Empty,
        DistanceKm = r.DistanceKm,
        MonthlyFee = r.MonthlyFee,
        Status = r.Status ? "Active" : "Inactive",
        VehicleId = r.VehicleId,
        VehicleNumber = r.Vehicle?.VehicleNumber
    };

    // --- DRIVERS ---
    public async Task<List<TransportDriverDto>> GetAllDriversAsync()
    {
        var list = await _repository.GetAllDriversAsync();
        return list.Select(d => MapToDriverDto(d)).ToList();
    }

    public async Task<TransportDriverDto> GetDriverByIdAsync(long id)
    {
        var driver = await _repository.GetDriverByIdAsync(id)
            ?? throw new NotFoundException($"Transport Driver with ID '{id}' not found.");
        return MapToDriverDto(driver);
    }

    public async Task<TransportDriverDto> CreateDriverAsync(CreateTransportDriverDto dto)
    {
        var driver = new TransportDriver
        {
            DriverName = dto.DriverName,
            LicenceNumber = dto.LicenseNumber,
            MobileNumber = dto.Phone,
            Status = dto.Status.Equals("Active", System.StringComparison.OrdinalIgnoreCase),
            AssignedVehicleId = dto.AssignedVehicleId
        };

        await _repository.AddDriverAsync(driver);
        await _repository.SaveChangesAsync();
        return MapToDriverDto(driver);
    }

    public async Task<TransportDriverDto> UpdateDriverAsync(long id, CreateTransportDriverDto dto)
    {
        var driver = await _repository.GetDriverByIdAsync(id)
            ?? throw new NotFoundException($"Transport Driver with ID '{id}' not found.");

        driver.DriverName = dto.DriverName;
        driver.LicenceNumber = dto.LicenseNumber;
        driver.MobileNumber = dto.Phone;
        driver.Status = dto.Status.Equals("Active", System.StringComparison.OrdinalIgnoreCase);
        driver.AssignedVehicleId = dto.AssignedVehicleId;

        await _repository.SaveChangesAsync();
        return MapToDriverDto(driver);
    }

    public async Task<bool> DeleteDriverAsync(long id)
    {
        var driver = await _repository.GetDriverByIdAsync(id)
            ?? throw new NotFoundException($"Transport Driver with ID '{id}' not found.");

        _repository.RemoveDriver(driver);
        await _repository.SaveChangesAsync();
        return true;
    }

    private static TransportDriverDto MapToDriverDto(TransportDriver d) => new()
    {
        DriverId = d.DriverId,
        DriverName = d.DriverName ?? string.Empty,
        LicenseNumber = d.LicenceNumber ?? string.Empty,
        Phone = d.MobileNumber ?? string.Empty,
        Status = d.Status ? "Active" : "Inactive",
        AssignedVehicleId = d.AssignedVehicleId,
        AssignedVehicleNumber = d.AssignedVehicle?.VehicleNumber
    };
}

