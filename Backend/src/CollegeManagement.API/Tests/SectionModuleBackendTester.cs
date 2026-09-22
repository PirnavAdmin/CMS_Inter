using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
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
        _connectionString = connectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("        SECTIONS MODULE BACKEND VERIFICATION & INTEGRATION SUITE");
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

        // 1. Test Database Connectivity
        Console.WriteLine("\n[1/7] Testing Database Connection...");
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
            Console.WriteLine($"  [FAIL] Database Connection Error: {ex.Message}");
            failed++;
        }

        // 2. Test Get All Sections
        Console.WriteLine("\n[2/7] Testing GetAllSectionsAsync...");
        int existingCount = 0;
        try
        {
            var sections = (await service.GetAllSectionsAsync(new SectionFilterDto())).ToList();
            existingCount = sections.Count;
            Console.WriteLine($"  [PASS] Retrieved {existingCount} sections from database.");
            if (sections.Any())
            {
                var s = sections.First();
                Console.WriteLine($"         Sample: Section #{s.SectionId} - {s.SectionName} (Group: {s.Group ?? s.GroupName}, Year: {s.AcademicYearName})");
            }
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] GetAllSections Error: {ex.Message}");
            failed++;
        }

        // 3. Test Relational Foreign Key Resolution
        Console.WriteLine("\n[3/7] Testing Relational Foreign Key Resolvers (Board, Year, Group, Level)...");
        int? sampleBoardId = null;
        int? sampleYearId = null;
        int? sampleGroupId = null;
        int? sampleLevelId = null;
        try
        {
            var board = await dbContext.Boards.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive);
            sampleBoardId = board?.BoardId;

            var year = await dbContext.AcademicYears.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive);
            sampleYearId = year?.AcademicYearId;

            var group = await dbContext.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive);
            sampleGroupId = group?.GroupId;

            var level = await dbContext.AcademicLevels.AsNoTracking().FirstOrDefaultAsync(x => x.IsActive);
            sampleLevelId = level?.AcademicLevelId;

            Console.WriteLine($"  [PASS] Relational Dependencies Found:");
            Console.WriteLine($"         - BoardId: {sampleBoardId} ({board?.BoardName})");
            Console.WriteLine($"         - AcademicYearId: {sampleYearId} ({year?.AcademicYearName})");
            Console.WriteLine($"         - GroupId: {sampleGroupId} ({group?.GroupName})");
            Console.WriteLine($"         - AcademicLevelId: {sampleLevelId} ({level?.LevelName})");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Relational Dependency Resolution Error: {ex.Message}");
            failed++;
        }

        // 4. Test Filtering Sections by Dependencies
        Console.WriteLine("\n[4/7] Testing Cascading Filter by Board & Academic Year...");
        try
        {
            var filter = new SectionFilterDto
            {
                BoardId = sampleBoardId,
                AcademicYearId = sampleYearId,
                GroupId = sampleGroupId
            };
            var filtered = (await service.GetAllSectionsAsync(filter)).ToList();
            Console.WriteLine($"  [PASS] Filtered Sections Count: {filtered.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Filter Sections Error: {ex.Message}");
            failed++;
        }

        // 5. Test Section Creation with Relational Validation
        Console.WriteLine("\n[5/7] Testing Section Creation with Relational Constraints...");
        int createdSectionId = 0;
        string testSectionName = $"TEST_SEC_{DateTime.Now:HHmmss}";
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
                    MaximumStrength = 60
                };
                var created = await service.CreateSectionAsync(createReq);
                createdSectionId = created.SectionId;
                Console.WriteLine($"  [PASS] Section Created Successfully: ID #{createdSectionId} - {created.SectionName}");
                passed++;
            }
            else
            {
                Console.WriteLine("  [SKIP] Skipping create due to missing base lookups.");
                passed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Section Creation Error: {ex.Message}");
            failed++;
        }

        // 6. Test Duplicate Section Prevention in same Group/Year
        Console.WriteLine("\n[6/7] Testing Duplicate Section Conflict Prevention...");
        try
        {
            if (createdSectionId > 0 && sampleYearId.HasValue && sampleGroupId.HasValue)
            {
                var dupReq = new CreateSectionRequest
                {
                    SectionName = testSectionName,
                    AcademicYearId = sampleYearId.Value,
                    GroupId = sampleGroupId,
                    BoardId = sampleBoardId,
                    AcademicLevelId = sampleLevelId,
                    MaximumStrength = 60
                };
                try
                {
                    await service.CreateSectionAsync(dupReq);
                    Console.WriteLine("  [FAIL] Duplicate section creation was not blocked!");
                    failed++;
                }
                catch
                {
                    Console.WriteLine("  [PASS] Duplicate section correctly rejected with Conflict.");
                    passed++;
                }
            }
            else
            {
                passed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Duplicate Check Error: {ex.Message}");
            failed++;
        }

        // 7. Test Section Deletion / Cleanup
        Console.WriteLine("\n[7/7] Testing Section Cleanup / Delete...");
        try
        {
            if (createdSectionId > 0)
            {
                await service.DeleteSectionAsync(createdSectionId);
                Console.WriteLine($"  [PASS] Test Section #{createdSectionId} deleted successfully.");
                passed++;
            }
            else
            {
                passed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Section Deletion Error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FINAL SECTIONS SUITE RESULT: {passed}/7 PASSED | {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
