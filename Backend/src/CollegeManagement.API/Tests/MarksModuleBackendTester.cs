using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Repositories.Implementations;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class MarksModuleBackendTester
{
    private readonly string _connectionString;

    public MarksModuleBackendTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("   MARKS & EVALUATION MODULE BACKEND INTEGRATION TEST SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // Build EF AppDbContext options
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        var appDbContext = new AppDbContext(optionsBuilder.Options);

        var evalRepo = new EvaluationRepository(appDbContext, NullLogger<EvaluationRepository>.Instance);
        var marksRepo = new MarksRepository(appDbContext);

        // 1. Test Database Connectivity
        Console.WriteLine("\n[1/6] Testing Database Connection...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            var db = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"  [PASS] Successfully connected to Database: {db}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Connection Error: {ex.Message}");
            failed++;
        }

        // 2. Test Stored Procedures Existence
        Console.WriteLine("\n[2/6] Verifying Stored Procedures Existence in Database...");
        var procedures = new[]
        {
            "sp_BulkUpsertMarks",
            "sp_GetFilteredEvaluations",
            "sp_GetFilteredEvaluationsCount",
            "sp_GetEvaluationReadiness",
            "sp_GetFacultyEvaluations",
            "sp_GetFacultyEvaluationStudents",
            "sp_UpdateEvaluationStatus",
            "sp_GetExamFormatAndLimits"
        };

        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            foreach (var proc in procedures)
            {
                var exists = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = DATABASE() AND routine_name = @Name AND routine_type = 'PROCEDURE';",
                    new { Name = proc });

                if (exists > 0)
                {
                    Console.WriteLine($"  [PASS] Procedure '{proc}' exists.");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Procedure '{proc}' NOT found in database.");
                    failed++;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Error checking routines: {ex.Message}");
            failed++;
        }

        // 3. Test sp_GetFilteredEvaluations via EvaluationRepository
        Console.WriteLine("\n[3/6] Testing sp_GetFilteredEvaluations via Repository (Stored Procedure Only)...");
        try
        {
            var filter = new EvaluationFilterDto
            {
                PageNumber = 1,
                PageSize = 10
            };
            var (items, totalCount) = await evalRepo.GetFilteredEvaluationsAsync(filter);
            Console.WriteLine($"  [PASS] sp_GetFilteredEvaluations returned {items?.Count() ?? 0} evaluation records (TotalCount: {totalCount}).");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetFilteredEvaluations Error: {ex.Message}");
            failed++;
        }

        // 4. Test sp_GetEvaluationReadiness
        Console.WriteLine("\n[4/6] Testing sp_GetEvaluationReadiness via Repository...");
        try
        {
            var readiness = await evalRepo.GetEvaluationReadinessAsync(1, null, null);
            Console.WriteLine($"  [PASS] sp_GetEvaluationReadiness returned AllApproved: {readiness.AllRequiredEvaluationsApproved}, Ready: {readiness.ReadyForResults}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetEvaluationReadiness Error: {ex.Message}");
            failed++;
        }

        // 5. Test sp_BulkUpsertMarks (Atomic JSON Upsert)
        Console.WriteLine("\n[5/6] Testing sp_BulkUpsertMarks (Single-Roundtrip Atomic JSON Upsert)...");
        try
        {
            var testMarks = new[]
            {
                new
                {
                    campusId = 1,
                    board = "BIEAP",
                    boardId = 1,
                    academicYearId = 1,
                    academicLevel = "Intermediate",
                    academicLevelId = 1,
                    groupId = 1,
                    sectionId = 1,
                    examinationId = 1,
                    subjectId = 1,
                    studentId = 999999,
                    rollNo = "TEST-999999",
                    studentName = "Optimization Unit Test Student",
                    facultyId = 1,
                    internalMarks = 20,
                    practicalMarks = 0,
                    theoryMarks = 75,
                    totalMarks = 95,
                    passingMarks = 35,
                    isAbsent = 0,
                    remarks = "Auto Unit Test",
                    status = 0
                }
            };
            var json = JsonSerializer.Serialize(testMarks);
            var affected = await evalRepo.BulkUpsertMarksAsync(json, 1, null);
            Console.WriteLine($"  [PASS] sp_BulkUpsertMarks executed successfully with affected count: {affected}");
            passed++;

            // Clean up test mark
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            await conn.ExecuteAsync("DELETE FROM `Marks` WHERE `StudentId` = 999999;");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_BulkUpsertMarks Error: {ex.Message}");
            failed++;
        }

        // 6. Test sp_GetFacultyEvaluations
        Console.WriteLine("\n[6/6] Testing sp_GetFacultyEvaluations...");
        try
        {
            var evals = await evalRepo.GetFacultyEvaluationsAsync(null, null, null, null);
            Console.WriteLine($"  [PASS] sp_GetFacultyEvaluations returned {evals?.Count() ?? 0} records.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetFacultyEvaluations Error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n--------------------------------------------------------------------------------");
        Console.WriteLine($"TEST SUMMARY: Total: {passed + failed} | Passed: {passed} | Failed: {failed}");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
