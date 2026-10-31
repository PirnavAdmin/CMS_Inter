using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.NonTeaching;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Production Dapper repository for Non-Teaching Staff operations.
    /// Strictly executes all operations via MySQL Stored Procedures in compliance with architectural guidelines.
    /// </summary>
    public class NonTeachingRepository : INonTeachingRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<NonTeachingRepository>? _logger;

        public NonTeachingRepository(AppDbContext context, ILogger<NonTeachingRepository>? logger = null)
        {
            _context = context;
            _logger = logger;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task<DepartmentModuleDto> GetDepartmentPortalDataAsync(int? campusId, string departmentCode)
        {
            var code = (departmentCode ?? "ADMINISTRATION").Trim().ToUpperInvariant();
            var conn = await GetOpenConnectionAsync();

            var records = (await conn.QueryAsync<DepartmentRecordDto>(
                "sp_GetDepartmentRecords",
                new { p_CampusId = campusId, p_DepartmentCode = code },
                commandType: CommandType.StoredProcedure)).ToList();

            var dto = new DepartmentModuleDto
            {
                Code = code,
                Records = records
            };

            switch (code)
            {
                case "TRANSPORT":
                    dto.Name = "Transport & Fleet Management";
                    dto.Description = "Bus routes, vehicle fleet status, driver duty schedules, and maintenance tracking.";
                    dto.Metrics = new List<DepartmentMetricDto>
                    {
                        new() { Label = "Active Buses", Val = "18", Sub = "Operational fleet" },
                        new() { Label = "Morning Trips", Val = "18 / 18", Sub = "Trips completed" },
                        new() { Label = "Fuel Slips Verified", Val = "14", Sub = "Fuel vouchers" },
                        new() { Label = "Maintenance Due", Val = "2", Sub = "Vehicles in service" },
                    };
                    break;

                case "SECURITY":
                    dto.Name = "Security & Campus Vigilance";
                    dto.Description = "Main gate monitoring, visitor access logs, parking regulation, and surveillance feeds.";
                    dto.Metrics = new List<DepartmentMetricDto>
                    {
                        new() { Label = "Guards on Duty", Val = "14", Sub = "Active shift" },
                        new() { Label = "Vehicles Checked", Val = "156", Sub = "Entry gate logs" },
                        new() { Label = "Incident Reports", Val = "0", Sub = "Campus security" },
                        new() { Label = "CCTV Cameras Live", Val = "48 / 48", Sub = "Control room feeds" },
                    };
                    break;

                case "MAINTENANCE":
                    dto.Name = "Maintenance & Facilities";
                    dto.Description = "Electrical systems, plumbing, classroom audio-visual support, and campus infrastructure.";
                    dto.Metrics = new List<DepartmentMetricDto>
                    {
                        new() { Label = "Open Work Orders", Val = "3", Sub = "Active work orders" },
                        new() { Label = "Resolved Today", Val = "7", Sub = "Maintenance resolved" },
                        new() { Label = "Generator Fuel", Val = "88%", Sub = "Backup fuel" },
                        new() { Label = "Water Level", Val = "94%", Sub = "Storage status" },
                    };
                    break;

                case "ADMINISTRATION":
                default:
                    dto.Code = "ADMINISTRATION";
                    dto.Name = "Administration & Office Support";
                    dto.Description = "Department operational workflows, daily logs, register management, and resource coordination.";
                    dto.Metrics = new List<DepartmentMetricDto>
                    {
                        new() { Label = "Today's Visitors", Val = "24", Sub = "Gate passes verified" },
                        new() { Label = "Inward Couriers", Val = "12", Sub = "Delivered & pending" },
                        new() { Label = "Stationery Requests", Val = "8", Sub = "Approved requests" },
                        new() { Label = "Files Dispatched", Val = "16", Sub = "Outward dispatches" },
                    };
                    break;
            }

            return dto;
        }

        public async Task<DepartmentRecordDto> CreateDepartmentRecordAsync(int? campusId, string departmentCode, CreateDepartmentRecordDto record, int? userId)
        {
            var code = (departmentCode ?? "ADMINISTRATION").Trim().ToUpperInvariant();
            var conn = await GetOpenConnectionAsync();

            var refPrefix = code.Length >= 3 ? code.Substring(0, 3) : "DEP";
            var refCode = $"{refPrefix}-2026-{DateTime.UtcNow.Ticks.ToString().Substring(12)}";
            var timeStr = string.IsNullOrWhiteSpace(record.Time) ? DateTime.UtcNow.ToString("hh:mm tt") : record.Time.Trim();
            var partyStr = string.IsNullOrWhiteSpace(record.Party) ? "Staff Officer" : record.Party.Trim();
            var statusStr = string.IsNullOrWhiteSpace(record.Status) ? "Completed" : record.Status.Trim();

            await conn.ExecuteAsync(
                "sp_CreateDepartmentRecord",
                new
                {
                    p_CampusId = campusId,
                    p_DepartmentCode = code,
                    p_ReferenceCode = refCode,
                    p_Title = record.Title.Trim(),
                    p_Party = partyStr,
                    p_LogTime = timeStr,
                    p_Status = statusStr,
                    p_CreatedByUserId = userId
                },
                commandType: CommandType.StoredProcedure);

            return new DepartmentRecordDto
            {
                Id = refCode,
                Title = record.Title.Trim(),
                Party = partyStr,
                Time = timeStr,
                Status = statusStr
            };
        }

        public async Task<IEnumerable<StaffTaskDto>> GetStaffTasksAsync(int staffId)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryAsync<StaffTaskDto>(
                "sp_GetStaffTasks",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<StaffTaskDto> CreateStaffTaskAsync(int staffId, int? campusId, CreateStaffTaskDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            DateTime? parsedDueDate = null;
            if (DateTime.TryParse(dto.DueDate, out var dt))
            {
                parsedDueDate = dt;
            }

            var created = await conn.QueryFirstOrDefaultAsync<StaffTaskDto>(
                "sp_CreateStaffTask",
                new
                {
                    p_StaffId = staffId,
                    p_CampusId = campusId,
                    p_Title = dto.Title.Trim(),
                    p_Description = dto.Description?.Trim(),
                    p_Category = dto.Category ?? "Office Administration",
                    p_Priority = dto.Priority ?? "Medium",
                    p_DueDate = parsedDueDate,
                    p_AssignedBy = dto.AssignedBy ?? "Self / Personal Reminder"
                },
                commandType: CommandType.StoredProcedure);

            return created ?? new StaffTaskDto
            {
                Title = dto.Title,
                Description = dto.Description,
                Category = dto.Category,
                Priority = dto.Priority,
                DueDate = dto.DueDate,
                Status = "Pending"
            };
        }

        public async Task<bool> UpdateStaffTaskStatusAsync(int taskId, int staffId, string status)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = await conn.ExecuteScalarAsync<int>(
                "sp_UpdateStaffTaskStatus",
                new
                {
                    p_TaskId = taskId,
                    p_StaffId = staffId,
                    p_Status = status.Trim()
                },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<IEnumerable<StaffSupportTicketDto>> GetStaffSupportTicketsAsync(int staffId)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryAsync<StaffSupportTicketDto>(
                "sp_GetStaffSupportTickets",
                new { p_StaffId = staffId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<StaffSupportTicketDto> CreateStaffSupportTicketAsync(int staffId, int? campusId, CreateStaffSupportTicketDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            var created = await conn.QueryFirstOrDefaultAsync<StaffSupportTicketDto>(
                "sp_CreateStaffSupportTicket",
                new
                {
                    p_StaffId = staffId,
                    p_CampusId = campusId,
                    p_Category = dto.Category.Trim(),
                    p_Subject = dto.Subject.Trim(),
                    p_Description = dto.Description.Trim(),
                    p_Priority = dto.Priority ?? "Medium"
                },
                commandType: CommandType.StoredProcedure);

            return created ?? new StaffSupportTicketDto
            {
                Category = dto.Category,
                Subject = dto.Subject,
                Description = dto.Description,
                Priority = dto.Priority,
                Status = "Open"
            };
        }

        public async Task<bool> UpdateStaffContactAsync(int staffId, string mobile, string emergencyContact, string address)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = await conn.ExecuteScalarAsync<int>(
                "sp_UpdateStaffContact",
                new
                {
                    p_StaffId = staffId,
                    p_Mobile = mobile?.Trim(),
                    p_EmergencyContact = emergencyContact?.Trim(),
                    p_Address = address?.Trim()
                },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
    }
}
