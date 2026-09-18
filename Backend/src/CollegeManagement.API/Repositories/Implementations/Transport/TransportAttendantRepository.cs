using CollegeManagement.API.Data;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Common;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Dtos.Transport.Operations;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Dtos.Transport.Reports;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;

using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportAttendantRepository : ITransportAttendantRepository
    {
        private readonly AppDbContext _context;

        public TransportAttendantRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<PagedResult<TransportAttendantDto>> GetAllAsync(TransportAttendantFilterDto filter)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    a.AttendantId, a.EmployeeId, a.AttendantName, a.MobileNumber,
                    a.Gender, a.BranchName, a.AlternateMobileNumber, a.Address,
                    a.BloodGroup, a.EmergencyContactName, a.EmergencyContactNumber,
                    a.AssignedVehicleId, v.VehicleRegistrationNo AS AssignedVehicleNumber,
                    a.Status
                FROM TransportAttendants a
                LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId
                WHERE a.IsDeleted = 0";
                
            var items = await c.QueryAsync<dynamic>(sql);
            
            var list = items.Select(x => new TransportAttendantDto {
                AttendantId = x.AttendantId,
                EmployeeId = x.EmployeeId,
                AttendantName = x.AttendantName ?? "",
                MobileNumber = x.MobileNumber ?? "",
                Gender = x.Gender,
                BranchName = x.BranchName,
                AlternateMobileNumber = x.AlternateMobileNumber,
                Address = x.Address,
                BloodGroup = x.BloodGroup,
                EmergencyContactName = x.EmergencyContactName,
                EmergencyContactNumber = x.EmergencyContactNumber,
                AssignedVehicleId = x.AssignedVehicleId,
                
                Status = (bool)x.Status ? "Active" : "Inactive"
            }).AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.Search)) {
                var search = filter.Search.Trim().ToLower();
                list = list.Where(x => x.AttendantName.ToLower().Contains(search) || x.MobileNumber.ToLower().Contains(search) || x.Address != null && x.Address.ToLower().Contains(search));
            }
            if (filter.Status.HasValue) list = list.Where(x => x.Status == (filter.Status.Value ? "Active" : "Inactive"));
            
            var totalCount = list.Count();
            var paged = list.Skip((filter.PageNumber - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            
            return new PagedResult<TransportAttendantDto> { Items = paged, TotalCount = totalCount, PageNumber = filter.PageNumber, PageSize = filter.PageSize };
        }

        public async Task<TransportAttendantDto?> GetByIdAsync(long attendantId)
        {
            using var c = Connection();
            var sql = @"
                SELECT 
                    a.AttendantId, a.EmployeeId, a.AttendantName, a.MobileNumber,
                    a.Gender, a.BranchName, a.AlternateMobileNumber, a.Address,
                    a.BloodGroup, a.EmergencyContactName, a.EmergencyContactNumber,
                    a.AssignedVehicleId, v.VehicleRegistrationNo AS AssignedVehicleNumber,
                    a.Status
                FROM TransportAttendants a
                LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId
                WHERE a.IsDeleted = 0 AND a.AttendantId = @Id";
                
            var x = await c.QueryFirstOrDefaultAsync<dynamic>(sql, new { Id = attendantId });
            if (x == null) return null;

            return new TransportAttendantDto {
                AttendantId = x.AttendantId,
                EmployeeId = x.EmployeeId,
                AttendantName = x.AttendantName ?? "",
                MobileNumber = x.MobileNumber ?? "",
                Gender = x.Gender,
                BranchName = x.BranchName,
                AlternateMobileNumber = x.AlternateMobileNumber,
                Address = x.Address,
                BloodGroup = x.BloodGroup,
                EmergencyContactName = x.EmergencyContactName,
                EmergencyContactNumber = x.EmergencyContactNumber,
                AssignedVehicleId = x.AssignedVehicleId,
                
                Status = (bool)x.Status ? "Active" : "Inactive"
            };
        }

        public async Task<long> CreateAsync(CreateTransportAttendantDto dto, long? userId)
        {
            using var c = Connection();
            return await c.ExecuteScalarAsync<long>(
                "sp_CreateTransportAttendants",
                new
                {
                    p_EmployeeId = dto.EmployeeId?.Trim(),
                    p_AttendantName = dto.AttendantName.Trim(),
                    p_MobileNumber = dto.MobileNumber.Trim(),
                    p_Gender = dto.Gender?.Trim(),
                    p_BranchName = dto.BranchCampus?.Trim(),
                    p_AlternateMobileNumber = dto.AlternateMobileNumber?.Trim(),
                    p_Address = dto.Address?.Trim(),
                    p_BloodGroup = dto.BloodGroup?.Trim(),
                    p_EmergencyContactName = dto.EmergencyContactName?.Trim(),
                    p_EmergencyContactNumber = dto.EmergencyContactNumber?.Trim(),
                    p_AssignedVehicleId = dto.AssignedVehicleId > 0 ? dto.AssignedVehicleId : (long?)null,
                    p_Status = dto.Status,
                    p_IsDeleted = false,
                    p_CreatedBy = userId,
                    p_UpdatedBy = (long?)null
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(long attendantId, UpdateTransportAttendantDto dto, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_UpdateTransportAttendants",
                new
                {
                    p_Id = attendantId,
                    p_EmployeeId = dto.EmployeeId?.Trim(),
                    p_AttendantName = dto.AttendantName.Trim(),
                    p_MobileNumber = dto.MobileNumber.Trim(),
                    p_Gender = dto.Gender?.Trim(),
                    p_BranchName = dto.BranchCampus?.Trim(),
                    p_AlternateMobileNumber = dto.AlternateMobileNumber?.Trim(),
                    p_Address = dto.Address?.Trim(),
                    p_BloodGroup = dto.BloodGroup?.Trim(),
                    p_EmergencyContactName = dto.EmergencyContactName?.Trim(),
                    p_EmergencyContactNumber = dto.EmergencyContactNumber?.Trim(),
                    p_AssignedVehicleId = dto.AssignedVehicleId > 0 ? dto.AssignedVehicleId : (long?)null,
                    p_Status = dto.Status,
                    p_IsDeleted = false,
                    p_CreatedBy = (long?)null,
                    p_UpdatedBy = userId
                },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<bool> DeleteAsync(long attendantId, long? userId)
        {
            using var c = Connection();
            var rows = await c.ExecuteAsync(
                "sp_DeleteTransportAttendants",
                new { p_Id = attendantId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<IEnumerable<TransportAttendantLookupDto>> GetLookupAsync()
        {
            using var c = Connection();
            var sql = "SELECT AttendantId, AttendantName, MobileNumber FROM TransportAttendants WHERE IsDeleted = 0 AND Status = 1 ORDER BY AttendantName";
            var items = await c.QueryAsync<dynamic>(sql);
            return items.Select(x => new TransportAttendantLookupDto {
                AttendantId = x.AttendantId,
                AttendantName = x.AttendantName ?? "",
                MobileNumber = x.MobileNumber ?? "",
                DisplayName = $"{x.AttendantName} ({x.MobileNumber})"
            });
        }

        public async Task<TransportAttendantDto?> GetByIdOrNameAsync(string attendantIdOrName)
        {
            if (string.IsNullOrWhiteSpace(attendantIdOrName)) return null;
            string search = attendantIdOrName.Trim();
            
            if (long.TryParse(search, out long attendantId))
            {
                var byId = await GetByIdAsync(attendantId);
                if (byId != null) return byId;
            }
            
            using var c = Connection();
            var sql = "SELECT AttendantId FROM TransportAttendants WHERE IsDeleted = 0 AND (LOWER(AttendantName) = @SearchStr OR LOWER(MobileNumber) = @SearchStr) LIMIT 1";
            var id = await c.QueryFirstOrDefaultAsync<long?>(sql, new { SearchStr = search.ToLower() });
            if (id.HasValue) return await GetByIdAsync(id.Value);
            return null;
        }
    }
}





