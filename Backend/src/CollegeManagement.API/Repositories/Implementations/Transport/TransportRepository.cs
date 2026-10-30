namespace CollegeManagement.API.Repositories.Implementations;

using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

public class TransportRepository : ITransportRepository
{
    private readonly AppDbContext _context;

    public TransportRepository(AppDbContext context)
    {
        _context = context;
    }

    private IDbConnection Connection => _context.Database.GetDbConnection();

    private static bool ParseStatus(dynamic? val)
    {
        if (val == null) return true;
        var str = Convert.ToString(val);
        return string.Equals(str, "Active", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(str, "1", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(str, "True", StringComparison.OrdinalIgnoreCase);
    }

    private static bool ParseBool(dynamic? val)
    {
        if (val == null) return false;
        var str = Convert.ToString(val);
        return string.Equals(str, "1", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(str, "True", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(str, "Active", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(str, "AC", StringComparison.OrdinalIgnoreCase);
    }

    // Vehicles
    public async Task<List<TransportVehicle>> GetAllVehiclesAsync()
    {
        var conn = Connection;
        var list = (await conn.QueryAsync<dynamic>(
            "sp_GetTransportVehicles",
            new
            {
                p_Search = "",
                p_VehicleType = (string?)null,
                p_Status = (byte?)null,
                p_CampusId = (int?)null
            },
            commandType: CommandType.StoredProcedure)).ToList();

        return list.Select(v => new TransportVehicle
        {
            VehicleId = (long)(v.VehicleId ?? 0L),
            VehicleNumber = (string?)(v.VehicleNumber ?? ""),
            RegistrationNumber = (string?)(v.RegistrationNumber ?? v.VehicleRegistrationNo ?? ""),
            VehicleName = (string?)(v.VehicleName ?? ""),
            VehicleType = (string?)(v.VehicleType ?? "Bus"),
            Manufacturer = (string?)(v.Make ?? v.Manufacturer ?? ""),
            Model = (string?)(v.Model ?? ""),
            ChassisNumber = (string?)(v.ChassisNumber ?? ""),
            EngineNumber = (string?)(v.EngineNumber ?? ""),
            GpsDeviceId = (string?)(v.GpsDeviceId ?? ""),
            InsuranceNumber = (string?)(v.InsuranceNumber ?? ""),
            Capacity = (int)(v.Capacity ?? 40),
            IsAC = ParseBool(v.IsAC ?? v.IsAc),
            Status = ParseStatus(v.Status)
        }).ToList();
    }

    public async Task<TransportVehicle?> GetVehicleByIdAsync(long id)
    {
        var conn = Connection;
        var v = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "sp_GetTransportVehiclesById",
            new { p_Id = id },
            commandType: CommandType.StoredProcedure);

        if (v == null) return null;

        return new TransportVehicle
        {
            VehicleId = (long)(v.VehicleId ?? id),
            VehicleNumber = (string?)(v.VehicleNumber ?? ""),
            RegistrationNumber = (string?)(v.RegistrationNumber ?? v.VehicleRegistrationNo ?? ""),
            VehicleName = (string?)(v.VehicleName ?? ""),
            VehicleType = (string?)(v.VehicleType ?? "Bus"),
            Manufacturer = (string?)(v.Make ?? v.Manufacturer ?? ""),
            Model = (string?)(v.Model ?? ""),
            ChassisNumber = (string?)(v.ChassisNumber ?? ""),
            EngineNumber = (string?)(v.EngineNumber ?? ""),
            GpsDeviceId = (string?)(v.GpsDeviceId ?? ""),
            InsuranceNumber = (string?)(v.InsuranceNumber ?? ""),
            Capacity = (int)(v.Capacity ?? 40),
            IsAC = ParseBool(v.IsAC ?? v.IsAc),
            Status = ParseStatus(v.Status)
        };
    }

    public async Task AddVehicleAsync(TransportVehicle vehicle)
    {
        var conn = Connection;
        var id = await conn.ExecuteScalarAsync<long>(
            "sp_CreateTransportVehicles",
            new
            {
                p_VehicleNumber = vehicle.VehicleNumber ?? "",
                p_VehicleRegistrationNo = vehicle.RegistrationNumber ?? vehicle.VehicleNumber ?? "",
                p_VehicleName = vehicle.VehicleName ?? "",
                p_VehicleType = vehicle.VehicleType ?? "Bus",
                p_Make = vehicle.Manufacturer ?? "",
                p_Model = vehicle.Model ?? "",
                p_ChassisNumber = vehicle.ChassisNumber ?? "",
                p_EngineNumber = vehicle.EngineNumber ?? "",
                p_GpsDeviceId = vehicle.GpsDeviceId ?? "",
                p_InsuranceNumber = vehicle.InsuranceNumber ?? "",
                p_InsuranceExpiry = vehicle.InsuranceExpiry,
                p_PollutionExpiry = vehicle.PollutionExpiry,
                p_FitnessExpiry = vehicle.FitnessExpiry,
                p_Capacity = vehicle.Capacity,
                p_IsAC = vehicle.IsAC ? (byte)1 : (byte)0,
                p_Status = vehicle.Status ? (byte)1 : (byte)0,
                p_CreatedBy = vehicle.CreatedBy,
                p_CampusId = vehicle.CampusId ?? 1
            },
            commandType: CommandType.StoredProcedure);

        vehicle.VehicleId = id;
    }

    public void RemoveVehicle(TransportVehicle vehicle)
    {
        var conn = Connection;
        conn.Execute(
            "sp_DeleteTransportVehicles",
            new { p_VehicleId = vehicle.VehicleId, p_UpdatedBy = vehicle.UpdatedBy },
            commandType: CommandType.StoredProcedure);
    }

    // Routes
    public async Task<List<TransportRoute>> GetAllRoutesAsync()
    {
        var conn = Connection;
        var list = (await conn.QueryAsync<dynamic>(
            "sp_GetTransportRoutes",
            new
            {
                p_Search = "",
                p_Status = (byte?)null,
                p_BusType = (string?)null,
                p_CampusId = (int?)null
            },
            commandType: CommandType.StoredProcedure)).ToList();

        return list.Select(r => new TransportRoute
        {
            RouteId = (long)(r.RouteId ?? 0L),
            RouteCode = (string?)(r.RouteCode ?? ""),
            RouteName = (string?)(r.RouteName ?? ""),
            StartLocation = (string?)(r.StartLocation ?? ""),
            EndLocation = (string?)(r.EndLocation ?? ""),
            DistanceKm = r.DistanceKm != null ? Convert.ToDecimal(r.DistanceKm) : (r.Distance != null ? Convert.ToDecimal(r.Distance) : 0m),
            EstimatedDurationMinutes = (int)(r.EstimatedDurationMinutes ?? 30),
            MonthlyFee = r.DefaultMonthlyFee != null ? Convert.ToDecimal(r.DefaultMonthlyFee) : 0m,
            MinRangeKm = r.MinRangeKm != null ? Convert.ToDecimal(r.MinRangeKm) : 5m,
            NonAcBaseFare = r.NonAcBaseFare != null ? Convert.ToDecimal(r.NonAcBaseFare) : 1000m,
            NonAcRatePerKm = r.NonAcRatePerKm != null ? Convert.ToDecimal(r.NonAcRatePerKm) : 100m,
            AcBaseFare = r.AcBaseFare != null ? Convert.ToDecimal(r.AcBaseFare) : 1200m,
            AcRatePerKm = r.AcRatePerKm != null ? Convert.ToDecimal(r.AcRatePerKm) : 150m,
            Description = (string?)(r.Description ?? ""),
            Status = ParseStatus(r.Status),
            VehicleId = r.VehicleId != null ? Convert.ToInt64(r.VehicleId) : null
        }).ToList();
    }

    public async Task<TransportRoute?> GetRouteByIdAsync(long id)
    {
        var conn = Connection;
        var r = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "sp_GetTransportRouteById",
            new { p_Id = id },
            commandType: CommandType.StoredProcedure);

        if (r == null) return null;

        return new TransportRoute
        {
            RouteId = (long)(r.RouteId ?? id),
            RouteCode = (string?)(r.RouteCode ?? ""),
            RouteName = (string?)(r.RouteName ?? ""),
            StartLocation = (string?)(r.StartLocation ?? ""),
            EndLocation = (string?)(r.EndLocation ?? ""),
            DistanceKm = r.DistanceKm != null ? Convert.ToDecimal(r.DistanceKm) : (r.Distance != null ? Convert.ToDecimal(r.Distance) : 0m),
            EstimatedDurationMinutes = (int)(r.EstimatedDurationMinutes ?? 30),
            MonthlyFee = r.DefaultMonthlyFee != null ? Convert.ToDecimal(r.DefaultMonthlyFee) : 0m,
            MinRangeKm = r.MinRangeKm != null ? Convert.ToDecimal(r.MinRangeKm) : 5m,
            NonAcBaseFare = r.NonAcBaseFare != null ? Convert.ToDecimal(r.NonAcBaseFare) : 1000m,
            NonAcRatePerKm = r.NonAcRatePerKm != null ? Convert.ToDecimal(r.NonAcRatePerKm) : 100m,
            AcBaseFare = r.AcBaseFare != null ? Convert.ToDecimal(r.AcBaseFare) : 1200m,
            AcRatePerKm = r.AcRatePerKm != null ? Convert.ToDecimal(r.AcRatePerKm) : 150m,
            Description = (string?)(r.Description ?? ""),
            Status = ParseStatus(r.Status),
            VehicleId = r.VehicleId != null ? Convert.ToInt64(r.VehicleId) : null
        };
    }

    public async Task AddRouteAsync(TransportRoute route)
    {
        var conn = Connection;
        var id = await conn.ExecuteScalarAsync<long>(
            "sp_CreateTransportRoute",
            new
            {
                p_RouteCode = route.RouteCode ?? "",
                p_RouteName = route.RouteName ?? "",
                p_StartLocation = route.StartLocation ?? "",
                p_EndLocation = route.EndLocation ?? "",
                p_Distance = route.DistanceKm,
                p_EstimatedDurationMinutes = route.EstimatedDurationMinutes,
                p_DefaultMonthlyFee = route.MonthlyFee,
                p_MinRangeKm = route.MinRangeKm,
                p_NonAcBaseFare = route.NonAcBaseFare,
                p_NonAcRatePerKm = route.NonAcRatePerKm,
                p_AcBaseFare = route.AcBaseFare,
                p_AcRatePerKm = route.AcRatePerKm,
                p_Description = route.Description ?? "",
                p_Status = route.Status ? (byte)1 : (byte)0,
                p_CreatedBy = route.CreatedBy,
                p_CampusId = route.CampusId ?? 1
            },
            commandType: CommandType.StoredProcedure);

        route.RouteId = id;
    }

    public void RemoveRoute(TransportRoute route)
    {
        var conn = Connection;
        conn.Execute(
            "sp_DeleteTransportRoute",
            new { p_RouteId = route.RouteId, p_UpdatedBy = route.UpdatedBy },
            commandType: CommandType.StoredProcedure);
    }

    // Drivers
    public async Task<List<TransportDriver>> GetAllDriversAsync()
    {
        var conn = Connection;
        var list = (await conn.QueryAsync<dynamic>(
            "sp_GetTransportDrivers",
            new { p_Search = "", p_Status = (byte?)null, p_CampusId = (int?)null },
            commandType: CommandType.StoredProcedure)).ToList();

        return list.Select(d => new TransportDriver
        {
            DriverId = (long)(d.DriverId ?? 0L),
            StaffId = d.StaffId != null ? Convert.ToInt32(d.StaffId) : null,
            DriverName = (string?)(d.DriverName ?? ""),
            EmployeeId = (string?)(d.EmployeeId ?? ""),
            LicenceNumber = (string?)(d.LicenseNumber ?? d.LicenceNumber ?? d.LicenseNo ?? ""),
            MobileNumber = (string?)(d.MobileNumber ?? d.MobileNo ?? ""),
            AlternateMobileNumber = (string?)(d.AlternateMobileNumber ?? d.AlternateMobileNo ?? ""),
            Email = (string?)(d.Email ?? ""),
            Address = (string?)(d.Address ?? ""),
            BloodGroup = (string?)(d.BloodGroup ?? ""),
            EmergencyContactName = (string?)(d.EmergencyContactName ?? ""),
            EmergencyContactNumber = (string?)(d.EmergencyContactNumber ?? ""),
            Experience = d.ExperienceYears != null ? Convert.ToInt32(d.ExperienceYears) : (d.Experience != null ? Convert.ToInt32(d.Experience) : 5),
            AssignedVehicleId = d.AssignedVehicleId != null ? Convert.ToInt64(d.AssignedVehicleId) : null,
            Status = ParseStatus(d.Status)
        }).ToList();
    }

    public async Task<TransportDriver?> GetDriverByIdAsync(long id)
    {
        var conn = Connection;
        var d = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "sp_GetTransportDriversById",
            new { p_Id = id },
            commandType: CommandType.StoredProcedure);

        if (d == null) return null;

        return new TransportDriver
        {
            DriverId = (long)(d.DriverId ?? id),
            StaffId = d.StaffId != null ? Convert.ToInt32(d.StaffId) : null,
            DriverName = (string?)(d.DriverName ?? ""),
            EmployeeId = (string?)(d.EmployeeId ?? ""),
            LicenceNumber = (string?)(d.LicenseNumber ?? d.LicenceNumber ?? d.LicenseNo ?? ""),
            MobileNumber = (string?)(d.MobileNumber ?? d.MobileNo ?? ""),
            AlternateMobileNumber = (string?)(d.AlternateMobileNumber ?? d.AlternateMobileNo ?? ""),
            Email = (string?)(d.Email ?? ""),
            Address = (string?)(d.Address ?? ""),
            BloodGroup = (string?)(d.BloodGroup ?? ""),
            EmergencyContactName = (string?)(d.EmergencyContactName ?? ""),
            EmergencyContactNumber = (string?)(d.EmergencyContactNumber ?? ""),
            Experience = d.ExperienceYears != null ? Convert.ToInt32(d.ExperienceYears) : (d.Experience != null ? Convert.ToInt32(d.Experience) : 5),
            AssignedVehicleId = d.AssignedVehicleId != null ? Convert.ToInt64(d.AssignedVehicleId) : null,
            Status = ParseStatus(d.Status)
        };
    }

    public async Task AddDriverAsync(TransportDriver driver)
    {
        var conn = Connection;
        var id = await conn.ExecuteScalarAsync<long>(
            "sp_CreateTransportDrivers",
            new
            {
                p_StaffId = driver.StaffId,
                p_DriverName = driver.DriverName ?? "",
                p_EmployeeId = driver.EmployeeId ?? "DRV-1",
                p_LicenseNo = driver.LicenceNumber ?? "",
                p_LicenseExpiry = driver.LicenceExpiry,
                p_MobileNo = driver.MobileNumber ?? "",
                p_AlternateMobileNo = driver.AlternateMobileNumber ?? "",
                p_Email = driver.Email ?? "",
                p_Address = driver.Address ?? "",
                p_BloodGroup = driver.BloodGroup ?? "",
                p_EmergencyContactName = driver.EmergencyContactName ?? "",
                p_EmergencyContactNumber = driver.EmergencyContactNumber ?? "",
                p_Experience = driver.Experience ?? 5,
                p_AssignedVehicleId = driver.AssignedVehicleId,
                p_Status = driver.Status ? (byte)1 : (byte)0,
                p_CreatedBy = driver.CreatedBy
            },
            commandType: CommandType.StoredProcedure);

        driver.DriverId = id;
    }

    public void RemoveDriver(TransportDriver driver)
    {
        var conn = Connection;
        conn.Execute(
            "sp_DeleteTransportDrivers",
            new { p_DriverId = driver.DriverId, p_UpdatedBy = driver.UpdatedBy },
            commandType: CommandType.StoredProcedure);
    }

    public Task SaveChangesAsync()
    {
        // Stored procedures execute immediately with transactional integrity.
        return Task.CompletedTask;
    }
}
