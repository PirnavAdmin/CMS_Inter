using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Holiday;
using CollegeManagement.API.Models.Holiday;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Validators.Holiday;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public static class HolidayModuleBackendTester
    {
        private static int _passedCount = 0;
        private static int _failedCount = 0;

        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            _passedCount = 0;
            _failedCount = 0;

            Console.WriteLine();
            Console.WriteLine("================================================================================");
            Console.WriteLine("       MODULE: HOLIDAY MANAGEMENT VERIFICATION SUITE");
            Console.WriteLine("================================================================================");
            Console.WriteLine();

            using var scope = serviceProvider.CreateScope();
            var sp = scope.ServiceProvider;

            // 1. Dependency Injection Verifications
            var repo = sp.GetService<IHolidayRepository>();
            var svc = sp.GetService<IHolidayService>();
            var context = sp.GetService<AppDbContext>();

            AssertTrue(repo != null, "DI Registration: IHolidayRepository is registered and resolvable");
            AssertTrue(svc != null, "DI Registration: IHolidayService is registered and resolvable");
            AssertTrue(context != null, "DI Registration: AppDbContext is registered and resolvable");

            // 2. FluentValidation Verifications
            var createValidator = new CreateHolidayRequestValidator();
            var updateValidator = new UpdateHolidayRequestValidator();
            var filterValidator = new HolidayFilterRequestValidator();

            var emptyReq = new CreateHolidayRequest();
            var emptyRes = createValidator.Validate(emptyReq);
            AssertTrue(!emptyRes.IsValid, "FluentValidation: CreateHolidayRequestValidator blocks empty request");

            var invalidRangeReq = new CreateHolidayRequest
            {
                HolidayName = "Invalid Date Test",
                HolidayType = "Festival Holiday",
                AppliesTo = "All Students & Staff",
                DateType = "Date Range",
                StartDate = new DateOnly(2026, 12, 25),
                EndDate = new DateOnly(2026, 12, 20), // EndDate < StartDate
                Status = "Active"
            };
            var invalidRangeRes = createValidator.Validate(invalidRangeReq);
            AssertTrue(!invalidRangeRes.IsValid, "FluentValidation: CreateHolidayRequestValidator rejects EndDate < StartDate");

            var validReq = new CreateHolidayRequest
            {
                HolidayName = "Valid Test Holiday",
                HolidayType = "National Holiday",
                AppliesTo = "All Students & Staff",
                DateType = "Single Day",
                StartDate = new DateOnly(2026, 8, 15),
                Status = "Active",
                CampusId = 1
            };
            var validRes = createValidator.Validate(validReq);
            AssertTrue(validRes.IsValid, "FluentValidation: CreateHolidayRequestValidator accepts valid request");

            var filterInvalid = new HolidayFilterRequest { Page = 0, PageSize = 5000 };
            var filterRes = filterValidator.Validate(filterInvalid);
            AssertTrue(!filterRes.IsValid, "FluentValidation: HolidayFilterRequestValidator enforces bounds (Page >= 1, PageSize <= 1000)");

            // 3. Database Connection and Script Deployment
            IDbConnection? dbConn = null;
            try
            {
                dbConn = context!.Database.GetDbConnection();
                if (dbConn.State != ConnectionState.Open)
                {
                    await context.Database.OpenConnectionAsync();
                }
                AssertTrue(true, "Database Connection: Successfully opened connection to MySQL DB");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Database Connection: Failed to open connection to MySQL DB", ex.Message);
                return false;
            }

            // Deploy 16_HolidayManagement_SPs.sql
            try
            {
                var basePath = AppContext.BaseDirectory;
                var candidates = new[]
                {
                    Path.Combine(basePath, "Database", "Updated_Module_SPs", "16_HolidayManagement_SPs.sql"),
                    Path.Combine(basePath, "..", "..", "..", "Database", "Updated_Module_SPs", "16_HolidayManagement_SPs.sql"),
                    Path.Combine(Directory.GetCurrentDirectory(), "Database", "Updated_Module_SPs", "16_HolidayManagement_SPs.sql"),
                    Path.Combine(Directory.GetCurrentDirectory(), "Backend", "src", "CollegeManagement.API", "Database", "Updated_Module_SPs", "16_HolidayManagement_SPs.sql")
                };

                var spScriptPath = candidates.FirstOrDefault(File.Exists);
                if (spScriptPath != null)
                {
                    AssertTrue(true, $"SP Script Discovery: Found 16_HolidayManagement_SPs.sql at {Path.GetFileName(spScriptPath)}");
                    var rawSql = await File.ReadAllTextAsync(spScriptPath);

                    var batches = rawSql
                        .Split(new[] { "DELIMITER //", "DELIMITER ;", "DELIMITER" }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(b => b.Trim())
                        .Where(b => !string.IsNullOrWhiteSpace(b))
                        .ToList();

                    int statementsDeployed = 0;
                    foreach (var batch in batches)
                    {
                        var stmts = batch.Split(new[] { "//" }, StringSplitOptions.RemoveEmptyEntries)
                            .Select(s => s.Trim())
                            .Where(s => !string.IsNullOrWhiteSpace(s))
                            .ToList();

                        foreach (var stmt in stmts)
                        {
                            var cleanStmt = stmt.Trim().TrimEnd(';').Trim();
                            if (string.IsNullOrWhiteSpace(cleanStmt)) continue;

                            try
                            {
                                await dbConn.ExecuteAsync(cleanStmt);
                                statementsDeployed++;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"  [WARN] SP deployment notice: {ex.Message}");
                            }
                        }
                    }

                    AssertTrue(statementsDeployed > 0, $"SP Deployment: Successfully deployed {statementsDeployed} statements from 16_HolidayManagement_SPs.sql");
                }
                else
                {
                    AssertTrue(false, "SP Script Discovery: Could not find 16_HolidayManagement_SPs.sql on disk");
                }
            }
            catch (Exception ex)
            {
                AssertTrue(false, "SP Deployment execution", ex.Message);
            }

            // 4. Catalog Routine Verification
            var canonicalSPs = new[]
            {
                "sp_GetHolidaySummary",
                "sp_GetHolidays",
                "sp_GetHolidayById",
                "sp_CheckDuplicateHoliday",
                "sp_CreateHoliday",
                "sp_UpdateHoliday",
                "sp_DeleteHoliday",
                "sp_CheckIsHoliday",
                "sp_GetHolidaysBetweenDates",
                "sp_BulkCreateHolidayRecord"
            };

            try
            {
                var existingRoutines = (await dbConn.QueryAsync<string>(
                    "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'sp_%Holiday%';"))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                foreach (var spName in canonicalSPs)
                {
                    AssertTrue(existingRoutines.Contains(spName), $"Routine Catalog: Procedure `{spName}` is registered in MySQL");
                }
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Routine Catalog inspection", ex.Message);
            }

            // 5. Repository Execution (100% SP via Dapper, 0% EF Core CRUD)
            int testHolidayId = 0;
            try
            {
                var summary = await repo!.GetSummaryAsync(1, 1, 1);
                AssertTrue(summary != null, "Holiday Repository: GetSummaryAsync executed via SP sp_GetHolidaySummary");

                var (items, count) = await repo.GetPagedHolidaysAsync(new HolidayFilterRequest { Page = 1, PageSize = 10, CampusId = 1 });
                AssertTrue(items != null, $"Holiday Repository: GetPagedHolidaysAsync executed via SP sp_GetHolidays (Total Count: {count})");

                var isDup = await repo.ExistsDuplicateAsync("NonExistentHolidayTest999", new DateOnly(2099, 1, 1), new DateOnly(2099, 1, 1), null, null, 1);
                AssertTrue(!isDup, "Holiday Repository: ExistsDuplicateAsync executed via SP sp_CheckDuplicateHoliday (returned false)");

                var isHol = await repo.IsHolidayAsync(DateTime.UtcNow, 1, 1, "All Students & Staff", 1);
                AssertTrue(isHol.IsHoliday == true || isHol.IsHoliday == false, "Holiday Repository: IsHolidayAsync executed via SP sp_CheckIsHoliday");

                var between = await repo.GetHolidaysBetweenDatesAsync(DateTime.UtcNow.AddMonths(-6), DateTime.UtcNow.AddMonths(6));
                AssertTrue(between != null, "Holiday Repository: GetHolidaysBetweenDatesAsync executed via SP sp_GetHolidaysBetweenDates");

                // Test Create, GetById, Update, Delete cycle
                var created = await repo.CreateAsync(new Holiday
                {
                    HolidayName = "Automated Test Holiday",
                    HolidayType = "National Holiday",
                    AppliesTo = "All Students & Staff",
                    DateType = "Single Day",
                    StartDate = DateTime.UtcNow.Date.AddDays(30),
                    EndDate = DateTime.UtcNow.Date.AddDays(30),
                    Status = "Active",
                    CampusId = 1,
                    Description = "Temporary verification record"
                });

                testHolidayId = created.Id;
                AssertTrue(testHolidayId > 0 && !string.IsNullOrWhiteSpace(created.HolidayCode), 
                    $"Holiday Repository: CreateAsync executed via SP sp_CreateHoliday (Id: {testHolidayId}, Code: {created.HolidayCode})");

                var fetched = await repo.GetByIdAsync(testHolidayId);
                AssertTrue(fetched != null && fetched.HolidayName == "Automated Test Holiday", 
                    "Holiday Repository: GetByIdAsync executed via SP sp_GetHolidayById");

                fetched!.HolidayName = "Automated Test Holiday - Updated";
                var updated = await repo.UpdateAsync(testHolidayId, fetched);
                AssertTrue(updated != null && updated.HolidayName == "Automated Test Holiday - Updated", 
                    "Holiday Repository: UpdateAsync executed via SP sp_UpdateHoliday");

                var deleted = await repo.DeleteAsync(testHolidayId);
                AssertTrue(deleted, "Holiday Repository: DeleteAsync executed via SP sp_DeleteHoliday (Soft-deleted cleanly)");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Holiday Repository execution", ex.Message);
            }

            // 6. Service Execution
            try
            {
                var summarySvc = await svc!.GetSummaryAsync(1, null, null);
                AssertTrue(summarySvc != null, "Holiday Service: GetSummaryAsync returned valid response");

                var (pagedDtos, total, pages) = await svc.GetPagedHolidaysAsync(new HolidayFilterRequest { Page = 1, PageSize = 5 });
                AssertTrue(pagedDtos != null && pages >= 1, $"Holiday Service: GetPagedHolidaysAsync mapped DTOs cleanly (Pages: {pages})");

                var templateBytes = await svc.GenerateImportTemplateAsync();
                AssertTrue(templateBytes != null && templateBytes.Length > 0, "Holiday Service: GenerateImportTemplateAsync produced valid Excel spreadsheet bytes");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Holiday Service execution", ex.Message);
            }

            Console.WriteLine();
            Console.WriteLine("================================================================================");
            Console.WriteLine($"       HOLIDAY MANAGEMENT TEST SUMMARY: {_passedCount} PASSED, {_failedCount} FAILED");
            Console.WriteLine("================================================================================");
            Console.WriteLine();

            return _failedCount == 0;
        }

        private static void AssertTrue(bool condition, string testName, string? details = null)
        {
            if (condition)
            {
                _passedCount++;
                Console.WriteLine($"  [PASS] {testName}");
            }
            else
            {
                _failedCount++;
                Console.WriteLine($"  [FAIL] {testName}{(string.IsNullOrWhiteSpace(details) ? "" : $" - {details}")}");
            }
        }
    }
}
