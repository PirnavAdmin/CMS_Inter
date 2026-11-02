using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Validators.Attendance;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Automated Verification Suite for Student Attendance Module.
    /// Verifies DI registration, FluentValidation rules, SP deployment, and repository execution with 100% Stored Procedures and Dapper.
    /// </summary>
    public static class StudentAttendanceModuleBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       MODULE: STUDENT ATTENDANCE VERIFICATION SUITE");
            Console.WriteLine("================================================================================\n");

            int passed = 0;
            int failed = 0;

            void AssertTrue(bool condition, string testName, string? details = null)
            {
                if (condition)
                {
                    Console.WriteLine($"  [PASS] {testName}");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] {testName} - {details ?? "Assertion failed"}");
                    failed++;
                }
            }

            using var scope = serviceProvider.CreateScope();

            // -------------------------------------------------------------
            // TEST 1: Service Provider & DI Registration
            // -------------------------------------------------------------
            var repo = scope.ServiceProvider.GetService<IAttendanceRepository>();
            AssertTrue(repo != null, "DI Registration: IAttendanceRepository is registered and resolvable");

            var service = scope.ServiceProvider.GetService<IAttendanceService>();
            AssertTrue(service != null, "DI Registration: IAttendanceService is registered and resolvable");

            var cache = scope.ServiceProvider.GetService<IAttendanceCacheService>();
            AssertTrue(cache != null, "DI Registration: IAttendanceCacheService is registered and resolvable");

            // -------------------------------------------------------------
            // TEST 2: FluentValidation - Create, Bulk & Report Validators
            // -------------------------------------------------------------
            var createValidator = new CreateAttendanceRequestValidator();
            var invalidCreate = new CreateAttendanceRequest
            {
                StudentId = 0,
                FacultyId = 0,
                SectionId = 0
            };
            var createResult = createValidator.Validate(invalidCreate);
            AssertTrue(!createResult.IsValid && createResult.Errors.Count >= 3,
                "FluentValidation: CreateAttendanceRequestValidator catches missing mandatory IDs");

            var adminBulkValidator = new AdminBulkSaveStudentAttendanceRequestValidator();
            var invalidBulk = new AdminBulkSaveStudentAttendanceRequest
            {
                AttendanceDate = DateTime.Today.AddDays(10), // in the future
                Attendances = new List<AdminStudentSessionAttendanceItem>()
            };
            var adminBulkResult = adminBulkValidator.Validate(invalidBulk);
            AssertTrue(!adminBulkResult.IsValid,
                "FluentValidation: AdminBulkSaveStudentAttendanceRequestValidator rejects future date and empty items");

            var monthlyReportValidator = new StudentMonthlyReportRequestValidator();
            var invalidReport = new StudentMonthlyReportRequest
            {
                Month = 15,
                Year = 1990
            };
            var reportResult = monthlyReportValidator.Validate(invalidReport);
            AssertTrue(!reportResult.IsValid && reportResult.Errors.Count >= 2,
                "FluentValidation: StudentMonthlyReportRequestValidator rejects invalid month (>12) and year (<2000)");

            // -------------------------------------------------------------
            // TEST 3: Database Connection & Stored Procedure Deployment
            // -------------------------------------------------------------
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            AssertTrue(connection.State == ConnectionState.Open, "Database Connection: Successfully opened connection to MySQL DB");

            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string spFilePath = Path.Combine(currentDir, "Database", "Updated_Module_SPs", "13_StudentAttendance_SPs.sql");

            if (!File.Exists(spFilePath))
            {
                string solutionDir = Path.GetFullPath(Path.Combine(currentDir, "..", "..", "..", "Database", "Updated_Module_SPs", "13_StudentAttendance_SPs.sql"));
                if (File.Exists(solutionDir))
                {
                    spFilePath = solutionDir;
                }
            }

            AssertTrue(File.Exists(spFilePath), $"SP Script Discovery: Found {Path.GetFileName(spFilePath)}");

            if (File.Exists(spFilePath))
            {
                var sqlScript = await File.ReadAllTextAsync(spFilePath);
                var sqlCleaned = Regex.Replace(sqlScript, @"--[^\r\n]*", "");
                var statements = sqlCleaned.Split(new[] { "//" }, StringSplitOptions.RemoveEmptyEntries);
                int deployedCount = 0;

                foreach (var rawStatement in statements)
                {
                    var trimmed = rawStatement.Trim();
                    if (string.IsNullOrWhiteSpace(trimmed)) continue;

                    trimmed = Regex.Replace(trimmed, @"(?i)^DELIMITER\s*;?", "").Trim();
                    trimmed = Regex.Replace(trimmed, @"(?i)DELIMITER\s*;?$", "").Trim();
                    if (string.IsNullOrWhiteSpace(trimmed)) continue;

                    try
                    {
                        await connection.ExecuteAsync(trimmed);
                        deployedCount++;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"  [WARN] SP deployment notice on statement: {ex.Message}");
                    }
                }

                AssertTrue(deployedCount >= 20, $"SP Deployment: Successfully deployed {deployedCount} statements from 13_StudentAttendance_SPs.sql");
            }

            // -------------------------------------------------------------
            // TEST 4: Information Schema Routine Verification
            // -------------------------------------------------------------
            var expectedProcedures = new[]
            {
                "sp_GetAttendances",
                "sp_GetAttendancesTotalCount",
                "sp_GetStudentsForAttendance",
                "sp_GetAttendanceSummary",
                "sp_GetAttendancePercentage",
                "sp_GetAttendanceReport",
                "sp_GetAttendanceById",
                "sp_CreateAttendance",
                "sp_UpdateAttendance",
                "sp_ChangeAttendanceStatus",
                "sp_AttendanceExists",
                "sp_GetAdminStudentsForAttendance",
                "sp_AdminBulkSaveStudentAttendance",
                "sp_GetAttendanceDefaulters",
                "sp_GetStudentAttendanceAcademicContext",
                "sp_GetFacultySubjectDerivation",
                "sp_GetStudentMonthlyReportGrid",
                "sp_GetStudentAttendances",
                "sp_GetStudentSubjectAttendance",
                "sp_GetStudentDailyPunchLogs",
                "sp_LockAttendanceSession",
                "sp_UnlockAttendanceSession",
                "sp_GetAttendanceAuditHistory",
                "sp_GetOrCreateAttendanceSession"
            };

            var existingProcs = (await connection.QueryAsync<string>(
                "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'")).ToHashSet(StringComparer.OrdinalIgnoreCase);

            int verifiedProcs = 0;
            foreach (var proc in expectedProcedures)
            {
                bool exists = existingProcs.Contains(proc);
                if (exists) verifiedProcs++;
                AssertTrue(exists, $"Routine Catalog: Procedure `{proc}` is registered in MySQL");
            }
            AssertTrue(verifiedProcs == expectedProcedures.Length, $"Routine Catalog Complete: All {expectedProcedures.Length} Student Attendance procedures are present");

            // -------------------------------------------------------------
            // TEST 5: Repository Execution (100% Stored Procedures)
            // -------------------------------------------------------------
            try
            {
                var academicContext = await repo!.GetAcademicContextAsync(1, 1);
                AssertTrue(true, "Repository Execution: GetAcademicContextAsync executed sp_GetStudentAttendanceAcademicContext");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetAcademicContextAsync failed", ex.Message);
            }

            try
            {
                var derivation = await repo!.GetFacultySubjectAllocationAsync(DateTime.UtcNow, 1, 1, 1);
                AssertTrue(true, "Repository Execution: GetFacultySubjectAllocationAsync executed sp_GetFacultySubjectDerivation");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetFacultySubjectAllocationAsync failed", ex.Message);
            }

            try
            {
                var adminStudents = await repo!.GetAdminStudentsForAttendanceAsync(new AttendanceSearchRequest
                {
                    CampusId = 1,
                    BoardId = 1,
                    AcademicYearId = 1,
                    GroupId = 1,
                    SectionId = 1,
                    Date = DateTime.UtcNow.ToString("yyyy-MM-dd")
                });
                AssertTrue(adminStudents != null, "Repository Execution: GetAdminStudentsForAttendanceAsync executed sp_GetAdminStudentsForAttendance");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetAdminStudentsForAttendanceAsync failed", ex.Message);
            }

            try
            {
                var attendances = await repo!.GetAttendancesAsync(new AttendanceSearchRequest
                {
                    PageNumber = 1,
                    PageSize = 5
                });
                var count = await repo.GetAttendancesTotalCountAsync(new AttendanceSearchRequest());
                AssertTrue(attendances != null && count >= 0, $"Repository Execution: GetAttendancesAsync returned records with total count: {count}");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetAttendancesAsync failed", ex.Message);
            }

            try
            {
                var summary = await repo!.GetAttendanceSummaryAsync(new AttendanceSearchRequest());
                AssertTrue(summary != null, "Repository Execution: GetAttendanceSummaryAsync executed sp_GetAttendanceSummary");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetAttendanceSummaryAsync failed", ex.Message);
            }

            try
            {
                var defaulters = await repo!.GetAttendanceDefaultersAsync(new AttendanceDefaultersRequest
                {
                    CampusId = 1,
                    BoardId = 1,
                    Month = DateTime.UtcNow.Month,
                    Year = DateTime.UtcNow.Year,
                    Threshold = 75.0
                });
                AssertTrue(defaulters != null, "Repository Execution: GetAttendanceDefaultersAsync executed sp_GetAttendanceDefaulters");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetAttendanceDefaultersAsync failed", ex.Message);
            }

            try
            {
                var grid = await repo!.GetStudentMonthlyReportGridAsync(new StudentMonthlyReportRequest
                {
                    CampusId = 1,
                    BoardId = 1,
                    Month = DateTime.UtcNow.Month,
                    Year = DateTime.UtcNow.Year
                });
                AssertTrue(grid != null && grid.DayHeaders != null, "Repository Execution: GetStudentMonthlyReportGridAsync executed sp_GetStudentMonthlyReportGrid with DayHeaders populated");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetStudentMonthlyReportGridAsync failed", ex.Message);
            }

            try
            {
                var auditHistory = await repo!.GetAuditHistoryAsync(new AuditHistorySearchRequest
                {
                    PageNumber = 1,
                    PageSize = 5
                });
                AssertTrue(auditHistory != null && auditHistory.Items != null, "Repository Execution: GetAuditHistoryAsync executed sp_GetAttendanceAuditHistory");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetAuditHistoryAsync failed", ex.Message);
            }

            try
            {
                var subjects = await repo!.GetStudentSubjectAttendanceAsync(1);
                AssertTrue(subjects != null, "Repository Execution: GetStudentSubjectAttendanceAsync executed sp_GetStudentSubjectAttendance");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetStudentSubjectAttendanceAsync failed", ex.Message);
            }

            try
            {
                var punchLogs = await repo!.GetStudentDailyPunchLogsAsync(1, DateTime.UtcNow.Month, DateTime.UtcNow.Year);
                AssertTrue(punchLogs != null, "Repository Execution: GetStudentDailyPunchLogsAsync executed sp_GetStudentDailyPunchLogs");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetStudentDailyPunchLogsAsync failed", ex.Message);
            }

            // -------------------------------------------------------------
            // SUMMARY
            // -------------------------------------------------------------
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"       STUDENT ATTENDANCE TEST SUMMARY: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
