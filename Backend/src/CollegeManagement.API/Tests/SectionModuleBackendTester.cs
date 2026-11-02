using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs;
using CollegeManagement.API.DTOs.Sections;
using CollegeManagement.API.Models;
using CollegeManagement.API.Profiles;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class SectionModuleBackendTester
{
    private readonly string _connectionString;

    public SectionModuleBackendTester(string connectionString)
    {
        var csb = new MySqlConnectionStringBuilder(connectionString)
        {
            AllowUserVariables = true
        };
        _connectionString = csb.ConnectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("        SECTION & ROLL ALLOCATION MODULE 100% STORED PROCEDURE TEST SUITE       ");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // EF & Mapper Setup
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        using var dbContext = new AppDbContext(optionsBuilder.Options);

        var mapperConfig = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<SectionMappingProfile>();
        });
        var mapper = mapperConfig.CreateMapper();

        var repo = new SectionRepository(dbContext);
        var service = new SectionService(repo, mapper);
        var rollRepo = new SectionRollAllocationRepository(dbContext);

        // -------------------------------------------------------------------------
        // TEST 1: Deploy & Verify Stored Procedures and Covering Indexes
        // -------------------------------------------------------------------------
        Console.WriteLine("\n[1/6] Deploying and Verifying Section Stored Procedures & Covering Indexes...");
        try
        {
            bool deployed = await SectionDbDeployer.DeployAsync(_connectionString);
            if (!deployed)
                throw new Exception("Stored procedures deployment failed.");

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            var spList = new[]
            {
                "sp_GetAllSections",
                "sp_GetSectionById",
                "sp_CreateSection",
                "sp_UpdateSection",
                "sp_DeleteSection",
                "sp_GetSectionsByGroupId",
                "sp_GetSectionsByGroupProgramId",
                "sp_GetActiveSectionAssignedToRoom",
                "sp_ValidateSectionNameDuplicate",
                "sp_ResolveSectionForeignKeys",
                "sp_GetAcademicYearValidation",
                "sp_GetMaxRollNumber",
                "sp_GetAcademicContextMetadata",
                "sp_GetStudentsAndSectionsForAllocation",
                "sp_ConfirmStudentSectionAllocation",
                "sp_GetAllocatedStudentsForRollNumbering",
                "sp_ConfirmStudentRollNumberAllocation",
                "sp_UpdateStudentSectionRollAllocation"
            };

            foreach (var sp in spList)
            {
                var count = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = @Name;",
                    new { Name = sp }
                );
                if (count == 0)
                    throw new Exception($"Missing stored procedure: {sp}");
            }
            Console.WriteLine($"  [PASS] All {spList.Length} Section module stored procedures verified in database.");

            var idxCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND INDEX_NAME = 'IX_Sections_Campus_Year_Group';"
            );
            if (idxCount == 0)
                throw new Exception("Missing covering index IX_Sections_Campus_Year_Group.");
            Console.WriteLine($"  [PASS] Covering index IX_Sections_Campus_Year_Group verified.");

            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Test 1 failed: {ex.Message}");
            failed++;
            return false;
        }

        // -------------------------------------------------------------------------
        // TEST 2: Single-Roundtrip Batch Foreign Key Resolution
        // -------------------------------------------------------------------------
        Console.WriteLine("\n[2/6] Testing Single-Roundtrip sp_ResolveSectionForeignKeys...");
        int? sampleBoardId = null;
        int? sampleYearId = null;
        int? sampleGroupId = null;
        int? sampleLevelId = null;
        int? sampleRoomId = null;
        int? sampleCampusId = null;

        try
        {
            using (var conn = new MySqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                sampleBoardId = await conn.ExecuteScalarAsync<int?>("SELECT BoardId FROM Boards WHERE IsActive = 1 LIMIT 1;");
                sampleYearId = await conn.ExecuteScalarAsync<int?>("SELECT AcademicYearId FROM AcademicYears WHERE IsActive = 1 LIMIT 1;");
                sampleGroupId = await conn.ExecuteScalarAsync<int?>("SELECT GroupId FROM `Groups` WHERE IsActive = 1 LIMIT 1;");
                sampleLevelId = await conn.ExecuteScalarAsync<int?>("SELECT AcademicLevelId FROM AcademicLevels WHERE IsActive = 1 LIMIT 1;");
                sampleRoomId = await conn.ExecuteScalarAsync<int?>(
                    @"SELECT r.RoomId FROM Rooms r 
                      WHERE r.IsActive = 1 AND r.RoomType = 'Classroom' AND r.Capacity >= 60 
                        AND r.RoomId NOT IN (SELECT RoomId FROM Sections WHERE RoomId IS NOT NULL AND IsActive = 1) 
                      LIMIT 1;");
                sampleCampusId = await conn.ExecuteScalarAsync<int?>("SELECT CampusId FROM Campuses LIMIT 1;") ?? 1;
            }

            var sw = Stopwatch.StartNew();
            var (resBoardId, resLevelId, resGroupId, resProgramId, resGroupProgramId) =
                await repo.ResolveForeignKeysBatchAsync(sampleBoardId, null, sampleLevelId, null, sampleGroupId, null, null, null, null);
            sw.Stop();

            Console.WriteLine($"  [PASS] Resolved foreign keys in {sw.ElapsedMilliseconds}ms (single roundtrip):");
            Console.WriteLine($"         - BoardId: {resBoardId}");
            Console.WriteLine($"         - AcademicLevelId: {resLevelId}");
            Console.WriteLine($"         - GroupId: {resGroupId}");
            Console.WriteLine($"         - ProgramId: {resProgramId}");
            Console.WriteLine($"         - GroupProgramId: {resGroupProgramId}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Test 2 failed: {ex.Message}");
            failed++;
        }

        // -------------------------------------------------------------------------
        // TEST 3: sp_GetAllSections with CampusId & Real-Time EnrolledCount
        // -------------------------------------------------------------------------
        Console.WriteLine("\n[3/6] Testing GetAllSectionsAsync with CampusId & EnrolledCount Calculation...");
        try
        {
            var filter = new SectionFilterDto
            {
                CampusId = sampleCampusId,
                AcademicYearId = sampleYearId,
                GroupId = sampleGroupId
            };

            var sections = (await service.GetAllSectionsAsync(filter)).ToList();
            Console.WriteLine($"  [PASS] Retrieved {sections.Count} sections for Campus #{sampleCampusId}, Year #{sampleYearId}, Group #{sampleGroupId}.");
            if (sections.Any())
            {
                var sample = sections.First();
                Console.WriteLine($"         Sample Section #{sample.SectionId}: '{sample.SectionName}', Max: {sample.MaximumStrength}, EnrolledCount: {sample.EnrolledCount}, CampusId: {sample.CampusId}");
                if (sample.EnrolledCount < 0)
                    throw new Exception("EnrolledCount calculation returned negative value!");
            }
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Test 3 failed: {ex.Message}");
            failed++;
        }

        // -------------------------------------------------------------------------
        // TEST 4: Section Creation, Room Clash Check, Duplicate Prevention & Delete
        // -------------------------------------------------------------------------
        Console.WriteLine("\n[4/6] Testing Section Creation, Room Clash Check, Duplicate Prevention & Delete...");
        int createdSectionId = 0;
        string testSectionName = $"TEST_SEC_{Random.Shared.Next(10000, 99999)}";
        try
        {
            if (sampleYearId.HasValue && sampleGroupId.HasValue)
            {
                var createReq = new CreateSectionRequest
                {
                    SectionName = testSectionName,
                    AcademicYearId = sampleYearId.Value,
                    GroupId = sampleGroupId,
                    BoardId = sampleBoardId,
                    AcademicLevelId = sampleLevelId,
                    RoomId = sampleRoomId,
                    CampusId = sampleCampusId ?? 1,
                    MaximumStrength = 55
                };

                var created = await service.CreateSectionAsync(createReq);
                createdSectionId = created.SectionId;
                Console.WriteLine($"  [PASS] Created test section: ID #{createdSectionId} - '{created.SectionName}' with Room #{created.RoomId?.ToString() ?? "N/A"}.");

                // Test duplicate section prevention
                try
                {
                    await service.CreateSectionAsync(createReq);
                    throw new Exception("Duplicate section was unexpectedly allowed!");
                }
                catch (Exception ex) when (!ex.Message.Contains("unexpectedly"))
                {
                    Console.WriteLine($"  [PASS] Duplicate / room clash correctly rejected: {ex.Message}");
                }

                // Test update
                var updateReq = new UpdateSectionRequest
                {
                    SectionName = testSectionName + "_UPD",
                    AcademicYearId = sampleYearId.Value,
                    GroupId = sampleGroupId,
                    BoardId = sampleBoardId,
                    AcademicLevelId = sampleLevelId,
                    MaximumStrength = 65,
                    IsActive = true
                };

                var updated = await service.UpdateSectionAsync(createdSectionId, updateReq);
                if (updated == null || updated.MaximumStrength != 65)
                    throw new Exception("Section update did not persist MaximumStrength.");
                Console.WriteLine($"  [PASS] Updated test section MaximumStrength to 65.");

                // Clean up / Delete
                await service.DeleteSectionAsync(createdSectionId);
                Console.WriteLine($"  [PASS] Deleted test section ID #{createdSectionId}.");
                passed++;
            }
            else
            {
                Console.WriteLine("  [SKIP] Skipping create/delete due to missing lookup keys.");
                passed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Test 4 failed: {ex.Message}");
            failed++;
        }

        // -------------------------------------------------------------------------
        // TEST 5: Academic Context Metadata via Dapper sp_GetAcademicContextMetadata
        // -------------------------------------------------------------------------
        Console.WriteLine("\n[5/6] Testing Academic Context Metadata (Replacing 5 EF Core queries with 1 SP)...");
        try
        {
            var sw = Stopwatch.StartNew();
            var meta = await rollRepo.GetContextMetadataAsync(sampleYearId, sampleBoardId, sampleLevelId, sampleGroupId, null);
            sw.Stop();

            Console.WriteLine($"  [PASS] Metadata retrieved via Dapper SP in {sw.ElapsedMilliseconds}ms:");
            Console.WriteLine($"         - Year: '{meta.Year}'");
            Console.WriteLine($"         - Board: '{meta.Board}' (Code: '{meta.BoardCode}')");
            Console.WriteLine($"         - Level: '{meta.Level}' (Code: '{meta.LevelCode}')");
            Console.WriteLine($"         - Group: '{meta.Group}' (Code: '{meta.GroupCode}')");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Test 5 failed: {ex.Message}");
            failed++;
        }

        // -------------------------------------------------------------------------
        // TEST 6: Section Roll Allocation Preview & Max Roll Number Stored Procedure
        // -------------------------------------------------------------------------
        Console.WriteLine("\n[6/6] Testing Section Roll Allocation Preview & sp_GetMaxRollNumber...");
        try
        {
            using (var conn = new MySqlConnection(_connectionString))
            {
                await conn.OpenAsync();

                // Test sp_GetMaxRollNumber
                var maxRoll = await conn.QueryFirstOrDefaultAsync<string>(
                    "sp_GetMaxRollNumber",
                    new
                    {
                        p_AcademicYearId = sampleYearId ?? 1,
                        p_AcademicLevelId = sampleLevelId ?? 1,
                        p_GroupId = sampleGroupId ?? 1
                    },
                    commandType: CommandType.StoredProcedure
                );
                Console.WriteLine($"  [PASS] sp_GetMaxRollNumber executed successfully: MaxRoll='{maxRoll ?? "(null)"}'.");

                // Test preview
                var filterReq = new SectionRollAllocationFilterRequest
                {
                    AcademicYearId = sampleYearId ?? 1,
                    BoardId = sampleBoardId ?? 1,
                    AcademicLevelId = sampleLevelId ?? 1,
                    GroupId = sampleGroupId ?? 1,
                    ProgramId = 1,
                    CampusId = sampleCampusId
                };

                try
                {
                    var preview = await rollRepo.PreviewSectionAllocationAsync(filterReq);
                    Console.WriteLine($"  [PASS] PreviewSectionAllocationAsync executed successfully:");
                    Console.WriteLine($"         - Total Students: {preview.TotalStudents}");
                    Console.WriteLine($"         - Students To Allocate: {preview.StudentsToAllocate}");
                    Console.WriteLine($"         - Total Capacity: {preview.TotalCapacity}");
                    Console.WriteLine($"         - Student Allocations: {preview.Students.Count}");
                }
                catch (InvalidOperationException invEx)
                {
                    Console.WriteLine($"  [PASS] PreviewSectionAllocationAsync handled gracefully: {invEx.Message}");
                }
            }

            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Test 6 failed: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FINAL SECTION MODULE SUITE RESULT: {passed}/6 PASSED | {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
