using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportAttendantService : ITransportAttendantService
    {
        private readonly ITransportAttendantRepository _repository;
        private readonly AppDbContext _context;

        public TransportAttendantService(ITransportAttendantRepository repository, AppDbContext context)
        {
            _repository = repository;
            _context = context;
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
            // 1. Locate existing Staff record (Staff is single source of truth)
            Staff? linkedStaff = null;
            if (dto.StaffId.HasValue && dto.StaffId.Value > 0)
            {
                linkedStaff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == dto.StaffId.Value && !s.IsDeleted);
            }

            if (linkedStaff == null && !string.IsNullOrWhiteSpace(dto.EmployeeId) && !dto.EmployeeId.Equals("string", StringComparison.OrdinalIgnoreCase))
            {
                linkedStaff = await _context.Staffs.FirstOrDefaultAsync(s => s.EmployeeId == dto.EmployeeId.Trim() && !s.IsDeleted);
            }

            if (linkedStaff == null && !string.IsNullOrWhiteSpace(dto.MobileNumber) && !dto.MobileNumber.Equals("0000000000"))
            {
                linkedStaff = await _context.Staffs.FirstOrDefaultAsync(s => s.Mobile == dto.MobileNumber.Trim() && !s.IsDeleted);
            }

            // Reject if Staff does not exist
            if (linkedStaff == null)
            {
                throw new ArgumentException("Staff record not found. Transport attendant must be linked to an existing active Staff member.");
            }

            // Reject if Staff is inactive or deleted
            if (linkedStaff.IsDeleted || string.Equals(linkedStaff.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Staff record is inactive or deleted.");
            }

            // Reject if Staff is Teaching
            if (!string.Equals(linkedStaff.StaffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase) && linkedStaff.StaffType != "2")
            {
                throw new InvalidOperationException("Teaching staff cannot be assigned as transport attendant. StaffType must be Non-Teaching.");
            }

            // Reject if Staff is Driver
            if (linkedStaff.RoleId == 12 || linkedStaff.IsDriver)
            {
                throw new InvalidOperationException($"Staff member '{linkedStaff.EmployeeId}' is assigned as a Driver and cannot be assigned as Attendant.");
            }

            // Reject if Staff is not Attendant (RoleId != 13 and designation not Attendant)
            bool isAttendantRole = linkedStaff.RoleId == 13
                || string.Equals(linkedStaff.Designation, "Attendant", StringComparison.OrdinalIgnoreCase)
                || string.Equals(linkedStaff.Designation, "Bus Attendant", StringComparison.OrdinalIgnoreCase);

            if (!isAttendantRole)
            {
                throw new InvalidOperationException($"Staff member '{linkedStaff.EmployeeId}' is not an Attendant. Staff RoleId must be 13 (Attendant).");
            }

            // Prevent duplicate active attendant assignments
            if (await _context.TransportAttendants.AnyAsync(a => !a.IsDeleted && a.Status && (a.StaffId == linkedStaff.Id || a.EmployeeId == linkedStaff.EmployeeId)))
            {
                throw new InvalidOperationException($"Staff member '{linkedStaff.EmployeeId}' is already assigned as an active transport attendant.");
            }

            // Synchronize Staff record
            linkedStaff.StaffType = "Non-Teaching";
            linkedStaff.Designation = "Attendant";
            linkedStaff.DesignationId = 290;
            linkedStaff.RoleId = 13;
            linkedStaff.DepartmentId = 79;
            linkedStaff.Department = "Transport";
            linkedStaff.Status = dto.Status ? "Active" : "Inactive";
            linkedStaff.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            dto.StaffId = linkedStaff.Id;
            dto.EmployeeId = linkedStaff.EmployeeId;
            dto.AttendantName = $"{linkedStaff.FirstName} {linkedStaff.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(dto.MobileNumber) || dto.MobileNumber == "0000000000")
            {
                dto.MobileNumber = linkedStaff.Mobile;
            }
            if (string.IsNullOrWhiteSpace(dto.Gender))
            {
                dto.Gender = linkedStaff.Gender;
            }

            var attendantId = await _repository.CreateAsync(dto, userId);

            // Ensure StaffId is persisted on TransportAttendants
            var ta = await _context.TransportAttendants.FirstOrDefaultAsync(a => a.AttendantId == attendantId);
            if (ta != null && (!ta.StaffId.HasValue || ta.StaffId.Value <= 0))
            {
                ta.StaffId = linkedStaff.Id;
                await _context.SaveChangesAsync();
            }

            return attendantId;
        }

        public async Task<bool> UpdateAsync(long attendantId, UpdateTransportAttendantDto dto, long? userId)
        {
            var ta = await _context.TransportAttendants.FirstOrDefaultAsync(a => a.AttendantId == attendantId && !a.IsDeleted);
            if (ta == null) return false;

            var updated = await _repository.UpdateAsync(attendantId, dto, userId);

            if (updated)
            {
                if (dto.AssignedVehicleId.HasValue) ta.AssignedVehicleId = dto.AssignedVehicleId.Value;
                ta.Status = dto.Status;
                ta.UpdatedAt = DateTime.UtcNow;
                if (userId.HasValue) ta.UpdatedBy = userId;

                if (ta.StaffId.HasValue && ta.StaffId.Value > 0)
                {
                    var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == ta.StaffId.Value && !s.IsDeleted);
                    if (staff != null)
                    {
                        staff.Status = dto.Status ? "Active" : "Inactive";
                        staff.UpdatedAt = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();
            }

            return updated;
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
