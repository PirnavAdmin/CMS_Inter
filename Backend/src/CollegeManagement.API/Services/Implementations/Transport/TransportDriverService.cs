using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportDriverService : ITransportDriverService
    {
        private readonly ITransportDriverRepository _repository;
        private readonly AppDbContext _context;

        public TransportDriverService(ITransportDriverRepository repository, AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<PagedResult<TransportDriverDto>> GetAllAsync(
            TransportDriverFilterDto filter)
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

        public Task<long> CreateAsync(
            CreateTransportDriverDto dto,
            long? userId)
        {
            throw new InvalidOperationException("Independent driver creation in the Transport module has been decommissioned. Drivers are created and maintained solely through the Staff module (Non-Teaching Staff with Role: Driver).");
        }

        public async Task<bool> UpdateAsync(
            long driverId,
            UpdateTransportDriverDto dto,
            long? userId)
        {
            var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == driverId && !s.IsDeleted && s.IsDriver);
            TransportDriver? legacy = null;
            if (staff == null)
            {
                legacy = await _context.TransportDrivers.FirstOrDefaultAsync(d => d.DriverId == driverId && !d.IsDeleted);
                if (legacy?.StaffId != null)
                {
                    staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == legacy.StaffId.Value && !s.IsDeleted);
                }
            }
            else
            {
                legacy = await _context.TransportDrivers.FirstOrDefaultAsync(d => (d.StaffId == staff.Id || d.DriverId == driverId) && !d.IsDeleted);
            }

            if (staff == null)
            {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(dto.LicenseNumber) && !dto.LicenseNumber.Equals("string", StringComparison.OrdinalIgnoreCase))
            {
                var licNum = dto.LicenseNumber.Trim();
                var exists = await _context.Staffs.AnyAsync(s => s.Id != staff.Id && !s.IsDeleted && s.IsDriver && s.DrivingLicenseNumber == licNum);
                if (exists)
                {
                    throw new InvalidOperationException("Another driver with the same License Number already exists.");
                }
                staff.DrivingLicenseNumber = licNum;
            }

            if (dto.LicenseExpiryDate.HasValue)
            {
                staff.DrivingLicenseExpiryDate = dto.LicenseExpiryDate.Value;
            }

            if (dto.ExperienceYears.HasValue && dto.ExperienceYears.Value > 0)
            {
                staff.DrivingExperienceYears = dto.ExperienceYears.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.MobileNumber) && !dto.MobileNumber.Equals("0000000000"))
            {
                staff.Mobile = dto.MobileNumber.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.DriverName) && !dto.DriverName.Equals("string", StringComparison.OrdinalIgnoreCase))
            {
                var names = dto.DriverName.Trim().Split(' ', 2);
                staff.FirstName = names[0];
                staff.LastName = names.Length > 1 ? names[1] : string.Empty;
            }

            if (!string.IsNullOrWhiteSpace(dto.Address))
            {
                staff.CurrentAddress = dto.Address.Trim();
            }

            staff.Status = dto.Status ? "Active" : "Inactive";
            staff.UpdatedAt = DateTime.UtcNow;

            var deptDict = DeserializeDict(staff.DepartmentSpecificJson);
            if (!string.IsNullOrWhiteSpace(staff.DrivingLicenseNumber)) deptDict["licenseNumber"] = staff.DrivingLicenseNumber;
            if (staff.DrivingLicenseExpiryDate.HasValue) deptDict["licenseExpiry"] = staff.DrivingLicenseExpiryDate.Value.ToString("yyyy-MM-dd");
            if (staff.DrivingExperienceYears.HasValue) deptDict["experienceYears"] = staff.DrivingExperienceYears.Value;
            staff.DepartmentSpecificJson = JsonSerializer.Serialize(deptDict);

            // Keep TransportDrivers table in sync if legacy record exists
            if (legacy != null)
            {
                legacy.DriverName = $"{staff.FirstName} {staff.LastName}".Trim();
                legacy.EmployeeId = staff.EmployeeId;
                legacy.MobileNumber = staff.Mobile;
                legacy.LicenceNumber = staff.DrivingLicenseNumber;
                legacy.LicenceExpiry = staff.DrivingLicenseExpiryDate;
                legacy.Experience = staff.DrivingExperienceYears;
                legacy.Address = staff.CurrentAddress;
                legacy.Status = dto.Status;
                legacy.AssignedVehicleId = dto.AssignedVehicleId;
                legacy.UpdatedAt = DateTime.UtcNow;
            }

            // If AssignedVehicleId is provided, manage vehicle assignment
            if (dto.AssignedVehicleId.HasValue && dto.AssignedVehicleId.Value > 0)
            {
                var va = await _context.TransportVehicleAssignments
                    .FirstOrDefaultAsync(a => a.DriverId == staff.Id && !a.IsDeleted && a.Status);
                if (va != null)
                {
                    va.VehicleId = dto.AssignedVehicleId.Value;
                    va.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(
            long driverId,
            long? userId)
        {
            var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == driverId && !s.IsDeleted);
            if (staff == null)
            {
                var legacy = await _context.TransportDrivers.FirstOrDefaultAsync(d => d.DriverId == driverId && !d.IsDeleted);
                if (legacy?.StaffId != null)
                {
                    staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == legacy.StaffId.Value && !s.IsDeleted);
                }
            }

            if (staff == null)
            {
                return false;
            }

            // Unmark as driver in Staff without deleting the Staff member
            staff.IsDriver = false;
            staff.UpdatedAt = DateTime.UtcNow;

            // Deactivate any active vehicle assignments for this driver
            var activeAssignments = await _context.TransportVehicleAssignments
                .Where(a => a.DriverId == staff.Id && !a.IsDeleted && a.Status)
                .ToListAsync();
            foreach (var a in activeAssignments)
            {
                a.Status = false;
                a.EffectiveTo = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
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

        private static Dictionary<string, object> DeserializeDict(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, object>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                       ?? new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            }
            catch
            {
                return new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);
            }
        }
    }
}
