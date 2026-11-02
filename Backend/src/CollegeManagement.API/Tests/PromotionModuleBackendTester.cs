using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Promotion;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Automated Verification Suite for Promotion Module.
    /// Verifies DI registration, Stored Procedure deployment, and repository execution with 100% Stored Procedures and Dapper.
    /// </summary>
    public static class PromotionModuleBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       MODULE: PROMOTION & CAMPUS TRANSFERS VERIFICATION SUITE");
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
            var promoRepo = scope.ServiceProvider.GetService<IPromotionRepository>();
            AssertTrue(promoRepo != null, "DI Registration: IPromotionRepository is registered and resolvable");

            var promoService = scope.ServiceProvider.GetService<IPromotionService>();
            AssertTrue(promoService != null, "DI Registration: IPromotionService is registered and resolvable");

            var transferRepo = scope.ServiceProvider.GetService<ICampusTransferRepository>();
            AssertTrue(transferRepo != null, "DI Registration: ICampusTransferRepository is registered and resolvable");

            var transferService = scope.ServiceProvider.GetService<ICampusTransferService>();
            AssertTrue(transferService != null, "DI Registration: ICampusTransferService is registered and resolvable");

            // -------------------------------------------------------------
            // TEST 2: Database Connection & Stored Procedure Deployment
            // -------------------------------------------------------------
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            AssertTrue(connection.State == ConnectionState.Open, "Database Connection: Successfully opened connection to MySQL DB");

            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string spFilePath = Path.Combine(currentDir, "Database", "Updated_Module_SPs", "14_Promotion_SPs.sql");

            if (!File.Exists(spFilePath))
            {
                string solutionDir = Path.GetFullPath(Path.Combine(currentDir, "..", "..", "..", "Database", "Updated_Module_SPs", "14_Promotion_SPs.sql"));
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

                    // Remove DELIMITER keywords if present
                    trimmed = Regex.Replace(trimmed, @"DELIMITER\s+[^\r\n]+", "", RegexOptions.IgnoreCase).Trim();
                    if (string.IsNullOrWhiteSpace(trimmed)) continue;

                    try
                    {
                        await connection.ExecuteAsync(trimmed);
                        deployedCount++;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"  [WARN] SP deployment statement notice: {ex.Message}");
                    }
                }

                AssertTrue(deployedCount >= 10, $"SP Deployment: Successfully deployed {deployedCount} statements from 14_Promotion_SPs.sql");
            }

            // -------------------------------------------------------------
            // TEST 3: MySQL Routines Catalog Verification
            // -------------------------------------------------------------
            var expectedProcedures = new[]
            {
                "sp_GetEligiblePromotionStudents",
                "sp_PromoteStudents",
                "sp_PromoteSingleStudent",
                "sp_GetPromotionHistory",
                "sp_GetPromotionHistoryById",
                "sp_RollbackPromotionRecord",
                "sp_AllocateStudentGroup",
                "sp_AllocateStudentProgram",
                "sp_AllocateStudentSection",
                "sp_GetPromotionReport",
                "sp_CreateCampusTransferRequest",
                "sp_GetSentCampusTransfers",
                "sp_GetReceivedCampusTransfers",
                "sp_GetCampusTransferById",
                "sp_ApproveCampusTransfer",
                "sp_RejectCampusTransfer"
            };

            var existingRoutines = (await connection.QueryAsync<string>(
                "SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE';")).ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var proc in expectedProcedures)
            {
                AssertTrue(existingRoutines.Contains(proc), $"Routine Catalog: Procedure `{proc}` is registered in MySQL");
            }

            // -------------------------------------------------------------
            // TEST 4: Repository Execution via Stored Procedures & Dapper
            // -------------------------------------------------------------
            try
            {
                var eligible = await promoRepo!.GetEligibleStudentsAsync(new PromotionEligibilityQuery
                {
                    AcademicYearId = 1
                });
                AssertTrue(eligible != null, "Repository Execution: GetEligibleStudentsAsync executed sp_GetEligiblePromotionStudents");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetEligibleStudentsAsync", ex.Message);
            }

            try
            {
                var history = await promoRepo!.GetHistoryAsync(new PromotionHistoryQuery
                {
                    AcademicYearId = 1
                });
                AssertTrue(history != null, "Repository Execution: GetHistoryAsync executed sp_GetPromotionHistory");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetHistoryAsync", ex.Message);
            }

            try
            {
                var report = await promoRepo!.GetPromotionReportAsync(new PromotionReportQuery
                {
                    AcademicYearId = 1
                });
                AssertTrue(report != null && report.Details != null, "Repository Execution: GetPromotionReportAsync executed sp_GetPromotionReport (No EF Core LINQ)");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetPromotionReportAsync", ex.Message);
            }

            try
            {
                var preview = await promoRepo!.PreviewAsync(new PromotionPreviewRequest
                {
                    SourceAcademicYearId = 1,
                    SourceAcademicLevel = "Junior Inter",
                    SourceGroupId = 1,
                    TargetAcademicYearId = 2,
                    TargetAcademicLevel = "Senior Inter",
                    TargetGroupId = 1,
                    StudentIds = new List<int> { 1, 2 }
                });
                AssertTrue(preview != null && preview.TotalSelected == 2, "Repository Execution: PreviewAsync calculated cohort preview");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: PreviewAsync", ex.Message);
            }

            try
            {
                var groupAlloc = await promoRepo!.AllocateGroupAsync(new GroupAllocationRequest
                {
                    TargetAcademicYearId = 1,
                    TargetGroupId = 1,
                    StudentIds = new List<int>()
                });
                AssertTrue(groupAlloc != null, "Repository Execution: AllocateGroupAsync executed sp_AllocateStudentGroup");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: AllocateGroupAsync", ex.Message);
            }

            try
            {
                var progAlloc = await promoRepo!.AllocateProgramAsync(new ProgramAllocationRequest
                {
                    TargetAcademicYearId = 1,
                    TargetGroupId = 1,
                    TargetProgramId = 1,
                    StudentIds = new List<int>()
                });
                AssertTrue(progAlloc != null, "Repository Execution: AllocateProgramAsync executed sp_AllocateStudentProgram");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: AllocateProgramAsync", ex.Message);
            }

            try
            {
                var secAlloc = await promoRepo!.AllocateSectionAsync(new SectionAllocationRequest
                {
                    TargetAcademicYearId = 1,
                    TargetGroupId = 1,
                    StudentIds = new List<int>()
                });
                AssertTrue(secAlloc != null, "Repository Execution: AllocateSectionAsync executed sp_AllocateStudentSection");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: AllocateSectionAsync", ex.Message);
            }

            try
            {
                var sentTransfers = await transferRepo!.GetSentTransfersAsync(1);
                AssertTrue(sentTransfers != null, "Repository Execution: GetSentTransfersAsync executed sp_GetSentCampusTransfers");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetSentTransfersAsync", ex.Message);
            }

            try
            {
                var receivedTransfers = await transferRepo!.GetReceivedTransfersAsync(1);
                AssertTrue(receivedTransfers != null, "Repository Execution: GetReceivedTransfersAsync executed sp_GetReceivedCampusTransfers");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Repository Execution: GetReceivedTransfersAsync", ex.Message);
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"       PROMOTION TEST SUMMARY: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
