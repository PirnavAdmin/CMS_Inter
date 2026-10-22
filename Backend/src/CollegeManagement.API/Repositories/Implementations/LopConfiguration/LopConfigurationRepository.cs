using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.LopConfiguration;
using CollegeManagement.API.Repositories.Interfaces.LopConfiguration;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations.LopConfiguration
{
    public class LopConfigurationRepository : ILopConfigurationRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LopConfigurationRepository> _logger;

        public LopConfigurationRepository(AppDbContext context, ILogger<LopConfigurationRepository> logger)
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

        public async Task<LopPolicyDto> GetPolicyAsync()
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var result = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                    "sp_LopPolicy_Get",
                    commandType: CommandType.StoredProcedure);

                if (result != null) return result;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Stored procedure sp_LopPolicy_Get failed, trying direct query.");
                try
                {
                    var conn = await GetOpenConnectionAsync();
                    var sql = @"SELECT 
                                    PolicyId,
                                    IsEnabled AS Enabled,
                                    AppliesTo,
                                    ShiftStart,
                                    GraceMinutes,
                                    AllowedLateLogins,
                                    LateLoginsPerPenalty,
                                    PenaltyDays,
                                    Basis,
                                    EffectiveFrom
                                FROM LopPolicies 
                                ORDER BY PolicyId DESC 
                                LIMIT 1";

                    var fallback = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(sql);
                    if (fallback != null) return fallback;
                }
                catch (Exception dbEx)
                {
                    _logger.LogWarning(dbEx, "Direct query on LopPolicies failed. Returning default in-memory policy.");
                }
            }

            return new LopPolicyDto();
        }

        public async Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? updatedByUserId = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var parameters = new DynamicParameters();
                parameters.Add("p_IsEnabled", request.Enabled ? 1 : 0);
                parameters.Add("p_ShiftStart", request.ShiftStart ?? "09:00");
                parameters.Add("p_GraceMinutes", request.GraceMinutes);
                parameters.Add("p_AllowedLateLogins", request.AllowedLateLogins);
                parameters.Add("p_LateLoginsPerPenalty", request.LateLoginsPerPenalty);
                parameters.Add("p_PenaltyDays", request.PenaltyDays);
                parameters.Add("p_Basis", request.Basis ?? "calendar");
                parameters.Add("p_EffectiveFrom", request.EffectiveFrom ?? DateTime.UtcNow.ToString("yyyy-MM"));
                parameters.Add("p_UpdatedByUserId", updatedByUserId);

                var saved = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                    "sp_LopPolicy_Save",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (saved != null) return saved;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Stored procedure sp_LopPolicy_Save failed, trying direct SQL upsert.");
                try
                {
                    var conn = await GetOpenConnectionAsync();
                    var checkSql = "SELECT PolicyId FROM LopPolicies ORDER BY PolicyId DESC LIMIT 1";
                    var existingId = await conn.ExecuteScalarAsync<int?>(checkSql);

                    if (existingId.HasValue)
                    {
                        var updateSql = @"UPDATE LopPolicies 
                                          SET IsEnabled = @Enabled,
                                              ShiftStart = @ShiftStart,
                                              GraceMinutes = @GraceMinutes,
                                              AllowedLateLogins = @AllowedLateLogins,
                                              LateLoginsPerPenalty = @LateLoginsPerPenalty,
                                              PenaltyDays = @PenaltyDays,
                                              Basis = @Basis,
                                              EffectiveFrom = @EffectiveFrom,
                                              UpdatedByUserId = @UpdatedByUserId,
                                              UpdatedAt = UTC_TIMESTAMP()
                                          WHERE PolicyId = @PolicyId";

                        await conn.ExecuteAsync(updateSql, new
                        {
                            Enabled = request.Enabled ? 1 : 0,
                            ShiftStart = request.ShiftStart ?? "09:00",
                            GraceMinutes = request.GraceMinutes,
                            AllowedLateLogins = request.AllowedLateLogins,
                            LateLoginsPerPenalty = request.LateLoginsPerPenalty,
                            PenaltyDays = request.PenaltyDays,
                            Basis = request.Basis ?? "calendar",
                            EffectiveFrom = request.EffectiveFrom ?? DateTime.UtcNow.ToString("yyyy-MM"),
                            UpdatedByUserId = updatedByUserId,
                            PolicyId = existingId.Value
                        });
                    }
                    else
                    {
                        var insertSql = @"INSERT INTO LopPolicies 
                                          (IsEnabled, AppliesTo, ShiftStart, GraceMinutes, AllowedLateLogins, LateLoginsPerPenalty, PenaltyDays, Basis, EffectiveFrom, UpdatedByUserId)
                                          VALUES (@Enabled, 'All college staff — all departments', @ShiftStart, @GraceMinutes, @AllowedLateLogins, @LateLoginsPerPenalty, @PenaltyDays, @Basis, @EffectiveFrom, @UpdatedByUserId)";

                        await conn.ExecuteAsync(insertSql, new
                        {
                            Enabled = request.Enabled ? 1 : 0,
                            ShiftStart = request.ShiftStart ?? "09:00",
                            GraceMinutes = request.GraceMinutes,
                            AllowedLateLogins = request.AllowedLateLogins,
                            LateLoginsPerPenalty = request.LateLoginsPerPenalty,
                            PenaltyDays = request.PenaltyDays,
                            Basis = request.Basis ?? "calendar",
                            EffectiveFrom = request.EffectiveFrom ?? DateTime.UtcNow.ToString("yyyy-MM"),
                            UpdatedByUserId = updatedByUserId
                        });
                    }

                    return await GetPolicyAsync();
                }
                catch (Exception dbEx)
                {
                    _logger.LogError(dbEx, "Direct SQL upsert on LopPolicies failed.");
                }
            }

            return new LopPolicyDto
            {
                Enabled = request.Enabled,
                ShiftStart = request.ShiftStart,
                GraceMinutes = request.GraceMinutes,
                AllowedLateLogins = request.AllowedLateLogins,
                LateLoginsPerPenalty = request.LateLoginsPerPenalty,
                PenaltyDays = request.PenaltyDays,
                Basis = request.Basis,
                EffectiveFrom = request.EffectiveFrom
            };
        }

        public async Task<IEnumerable<LopStaffRecordDto>> GetStaffRecordsAsync(string? month = null, string? searchTerm = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());
                parameters.Add("p_SearchTerm", string.IsNullOrWhiteSpace(searchTerm) ? null : searchTerm.Trim());

                var rows = await conn.QueryAsync<LopStaffRecordDto>(
                    "sp_LopStaffRecords_GetAll",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (rows != null && rows.Any()) return rows;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Stored procedure sp_LopStaffRecords_GetAll failed, falling back to direct SQL.");
                try
                {
                    var conn = await GetOpenConnectionAsync();
                    var sql = @"SELECT 
                                    Id,
                                    StaffId,
                                    EmployeeId,
                                    StaffName AS Name,
                                    Department,
                                    Month,
                                    MonthlySalary,
                                    LopDays,
                                    Basis,
                                    PeriodDays,
                                    Deduction,
                                    SalaryAfterLop,
                                    Reason,
                                    CreatedAt
                                FROM LopStaffRecords
                                WHERE IsDeleted = 0
                                  AND (@Month IS NULL OR Month = @Month)
                                  AND (@SearchTerm IS NULL OR EmployeeId LIKE @SearchPattern OR StaffName LIKE @SearchPattern OR Department LIKE @SearchPattern)
                                ORDER BY Id DESC";

                    var trimmedMonth = string.IsNullOrWhiteSpace(month) ? null : month.Trim();
                    var trimmedSearch = string.IsNullOrWhiteSpace(searchTerm) ? null : searchTerm.Trim();

                    var rows = await conn.QueryAsync<LopStaffRecordDto>(sql, new
                    {
                        Month = trimmedMonth,
                        SearchTerm = trimmedSearch,
                        SearchPattern = $"%{trimmedSearch}%"
                    });

                    if (rows != null && rows.Any()) return rows;
                }
                catch (Exception dbEx)
                {
                    _logger.LogWarning(dbEx, "Direct SQL query on LopStaffRecords failed.");
                }
            }

            return Enumerable.Empty<LopStaffRecordDto>();
        }

        public async Task<LopStaffRecordDto?> GetStaffRecordByIdAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var sql = @"SELECT 
                                Id,
                                StaffId,
                                EmployeeId,
                                StaffName AS Name,
                                Department,
                                Month,
                                MonthlySalary,
                                LopDays,
                                Basis,
                                PeriodDays,
                                Deduction,
                                SalaryAfterLop,
                                Reason,
                                CreatedAt
                            FROM LopStaffRecords
                            WHERE Id = @Id AND IsDeleted = 0
                            LIMIT 1";

                return await conn.QueryFirstOrDefaultAsync<LopStaffRecordDto>(sql, new { Id = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting staff record by id: {Id}", id);
                return null;
            }
        }

        public async Task<LopKpisDto> GetKpisAsync(string? month = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());

                var kpi = await conn.QueryFirstOrDefaultAsync<LopKpisDto>(
                    "sp_LopStaffRecords_GetKpis",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (kpi != null) return kpi;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Stored procedure sp_LopStaffRecords_GetKpis failed, falling back to direct SQL.");
                try
                {
                    var conn = await GetOpenConnectionAsync();
                    var sql = @"SELECT 
                                    COUNT(DISTINCT StaffId) AS StaffWithLop,
                                    COALESCE(SUM(LopDays), 0) AS TotalLopDays,
                                    COALESCE(SUM(Deduction), 0) AS TotalDeduction
                                FROM LopStaffRecords
                                WHERE IsDeleted = 0
                                  AND (@Month IS NULL OR Month = @Month)";

                    var kpi = await conn.QueryFirstOrDefaultAsync<LopKpisDto>(sql, new
                    {
                        Month = string.IsNullOrWhiteSpace(month) ? null : month.Trim()
                    });

                    if (kpi != null) return kpi;
                }
                catch (Exception dbEx)
                {
                    _logger.LogWarning(dbEx, "Direct SQL for LOP KPIs failed.");
                }
            }

            return new LopKpisDto();
        }

        public async Task<int> SaveStaffRecordAsync(LopStaffRecordDto record, int? createdByUserId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var sql = @"INSERT INTO LopStaffRecords
                        (StaffId, EmployeeId, StaffName, Department, Month, MonthlySalary, LopDays, Basis, PeriodDays, Deduction, SalaryAfterLop, Reason, IsDeleted, CreatedAt, CreatedByUserId)
                        VALUES
                        (@StaffId, @EmployeeId, @Name, @Department, @Month, @MonthlySalary, @LopDays, @Basis, @PeriodDays, @Deduction, @SalaryAfterLop, @Reason, 0, UTC_TIMESTAMP(), @CreatedByUserId);
                        SELECT LAST_INSERT_ID();";

            return await conn.QuerySingleAsync<int>(sql, new
            {
                record.StaffId,
                record.EmployeeId,
                record.Name,
                record.Department,
                record.Month,
                record.MonthlySalary,
                record.LopDays,
                record.Basis,
                record.PeriodDays,
                record.Deduction,
                record.SalaryAfterLop,
                record.Reason,
                CreatedByUserId = createdByUserId
            });
        }

        public async Task<bool> UpdateStaffRecordAsync(int id, decimal days, string basis, int periodDays, decimal deduction, decimal salaryAfterLop, string reason, int? updatedByUserId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var sql = @"UPDATE LopStaffRecords
                        SET LopDays = @Days,
                            Basis = @Basis,
                            PeriodDays = @PeriodDays,
                            Deduction = @Deduction,
                            SalaryAfterLop = @SalaryAfterLop,
                            Reason = @Reason,
                            UpdatedAt = UTC_TIMESTAMP(),
                            CreatedByUserId = COALESCE(@UpdatedByUserId, CreatedByUserId)
                        WHERE Id = @Id AND IsDeleted = 0";

            var rowsAffected = await conn.ExecuteAsync(sql, new
            {
                Id = id,
                Days = days,
                Basis = basis,
                PeriodDays = periodDays,
                Deduction = deduction,
                SalaryAfterLop = salaryAfterLop,
                Reason = reason,
                UpdatedByUserId = updatedByUserId
            });

            return rowsAffected > 0;
        }

        public async Task<bool> DeleteStaffRecordAsync(int id, int? deletedByUserId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var sql = @"UPDATE LopStaffRecords
                        SET IsDeleted = 1,
                            UpdatedAt = UTC_TIMESTAMP()
                        WHERE Id = @Id";

            var rowsAffected = await conn.ExecuteAsync(sql, new { Id = id });
            return rowsAffected > 0;
        }

        public async Task<IEnumerable<LopStaffDropdownDto>> GetStaffListForLopAsync()
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var sql = @"SELECT 
                                CAST(s.Id AS CHAR) AS StaffId,
                                s.EmployeeId,
                                CONCAT(s.FirstName, ' ', s.LastName) AS Name,
                                COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
                                COALESCE(sa.GrossSalary, sa.BasicPay, 30000.00) AS Salary
                            FROM Staff s
                            LEFT JOIN Departments d ON s.DepartmentId = d.Id
                            LEFT JOIN (
                                SELECT StaffId, GrossSalary, BasicPay 
                                FROM PayrollSalaryAssignments 
                                WHERE Status = 'Active' 
                                ORDER BY Id DESC
                            ) sa ON sa.StaffId = s.Id
                            WHERE s.IsDeleted = 0 AND (s.Status = 'Active' OR s.Status IS NULL)
                            ORDER BY s.FirstName, s.LastName";

                var list = await conn.QueryAsync<LopStaffDropdownDto>(sql);
                if (list != null && list.Any())
                {
                    return list;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load staff list from database. Falling back to default mock list.");
            }

            // Fallback sample staff matching UI mock data
            return new List<LopStaffDropdownDto>
            {
                new LopStaffDropdownDto
                {
                    StaffId = "1",
                    EmployeeId = "EMP001",
                    Name = "Ramesh Kumar",
                    Department = "Transport",
                    Salary = 30000.00m
                },
                new LopStaffDropdownDto
                {
                    StaffId = "2",
                    EmployeeId = "EMP002",
                    Name = "Priya Sharma",
                    Department = "Teaching",
                    Salary = 45000.00m
                },
                new LopStaffDropdownDto
                {
                    StaffId = "3",
                    EmployeeId = "EMP003",
                    Name = "Inventory Manager",
                    Department = "Stores & Inventory",
                    Salary = 34000.00m
                }
            };
        }
    }
}
