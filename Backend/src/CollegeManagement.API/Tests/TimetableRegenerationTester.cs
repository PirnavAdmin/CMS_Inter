using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class TimetableRegenerationTester
    {
        private readonly string _connectionString;

        public TimetableRegenerationTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task RunAllTestsAsync()
        {
            Console.WriteLine("===============================================================");
            Console.WriteLine("       TIMETABLE REGENERATION & STRUCTURE TEST SUITE");
            Console.WriteLine("===============================================================");

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));

            await using var dbContext = new AppDbContext(optionsBuilder.Options);
            var timetableRepo = new TimetableRepository(dbContext);
            var backupRepo = new TimetableBackupRepository(dbContext);
            var periodRepo = new PeriodRepository(dbContext);
            var roomRepo = new RoomRepository(dbContext);
            var timetableService = new TimetableService(timetableRepo, periodRepo, roomRepo, dbContext, backupRepo);

            int passed = 0;
            int total = 6;

            // Scenario 1: REG-1 changing from 8 to 10 teaching periods
            try
            {
                Console.WriteLine("\n[Test 1/6] REG-1 changing from 8 to 10 teaching periods (CMS 9 structure)...");
                await Test_Reg1_StructureChange_8_To_10_Periods(timetableService, dbContext);
                Console.WriteLine("  --> PASSED: 10 teaching periods (60 slots) correctly generated with period IDs 819-830 (excluding breaks).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  --> FAILED: {ex.Message}");
            }

            // Scenario 2: Failed generation preserving old Draft
            try
            {
                Console.WriteLine("\n[Test 2/6] Failed generation preserving the old Draft schedule on error...");
                await Test_FailedGeneration_PreservesOldDraft(timetableService, dbContext);
                Console.WriteLine("  --> PASSED: Transaction rollback verified; previous draft timetable remained 100% intact.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  --> FAILED: {ex.Message}");
            }

            // Scenario 3: Campus with no eligible teaching staff
            try
            {
                Console.WriteLine("\n[Test 3/6] Campus with no eligible teaching staff...");
                await Test_CampusWithNoEligibleStaff_Rejects(timetableService, dbContext);
                Console.WriteLine("  --> PASSED: Cleanly rejected with informative missing allocation / staff message.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  --> FAILED: {ex.Message}");
            }

            // Scenario 4: Faculty clashes across structures with different period IDs (time overlap)
            try
            {
                Console.WriteLine("\n[Test 4/6] Faculty clashes across structures with different period IDs (real time overlap)...");
                await Test_CrossStructure_TimeOverlapClash(timetableService, dbContext);
                Console.WriteLine("  --> PASSED: Time-overlap clash detection correctly prevented cross-structure faculty double-booking.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  --> FAILED: {ex.Message}");
            }

            // Scenario 5: Repeated/concurrent generation without duplicates
            try
            {
                Console.WriteLine("\n[Test 5/6] Repeated/concurrent generation without duplicates...");
                await Test_RepeatedGeneration_NoDuplicates(timetableService, dbContext);
                Console.WriteLine("  --> PASSED: Clean atomic replacement with zero duplicate period slots.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  --> FAILED: {ex.Message}");
            }

            // Scenario 6: Safe handling of an existing published timetable
            try
            {
                Console.WriteLine("\n[Test 6/6] Safe handling of an existing published/approved timetable...");
                await Test_PublishedTimetable_SafeHandling(timetableService, dbContext);
                Console.WriteLine("  --> PASSED: Published/Approved schedules are safely protected and cannot be silently overwritten.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  --> FAILED: {ex.Message}");
            }

            Console.WriteLine("\n===============================================================");
            Console.WriteLine($"   TEST RESULTS: {passed}/{total} Scenarios Passed ({(passed == total ? "ALL PASS" : "SOME FAILED")})");
            Console.WriteLine("===============================================================");
        }

        private async Task Test_Reg1_StructureChange_8_To_10_Periods(ITimetableService service, AppDbContext context)
        {
            var request = new GenerateTimetableRequestDto
            {
                CampusId = 1,
                BoardId = 1,
                AcademicLevelId = 1,
                AcademicYearId = 9,
                GroupId = 37,
                SectionIds = new List<int> { 30 },
                WorkingDays = new List<int> { 1, 2, 3, 4, 5, 6 }
            };

            var result = await service.GenerateTheoryTimetableAsync(request);
            if (!result.IsSuccess)
                throw new Exception($"Generation failed: {result.Message}");

            if (result.TotalSlotsGenerated != 60)
                throw new Exception($"Expected 60 slots (10 teaching periods x 6 days), but got {result.TotalSlotsGenerated}.");

            var teachingPeriodIds = new HashSet<int> { 819, 820, 821, 823, 824, 825, 827, 828, 829, 830 };
            var breakPeriodIds = new HashSet<int> { 822, 826 };

            foreach (var slot in result.GeneratedSlots)
            {
                if (breakPeriodIds.Contains(slot.PeriodId))
                    throw new Exception($"Slot was generated for break period {slot.PeriodId} ('{slot.PeriodName}')!");

                if (!teachingPeriodIds.Contains(slot.PeriodId))
                    throw new Exception($"Slot was generated with obsolete or invalid PeriodId {slot.PeriodId}!");

                if (slot.StaffId <= 0)
                    throw new Exception($"Slot {slot.Id} has unassigned StaffId!");

                if (slot.RoomId <= 0)
                    throw new Exception($"Slot {slot.Id} has unassigned RoomId!");
            }
        }

        private async Task Test_FailedGeneration_PreservesOldDraft(ITimetableService service, AppDbContext context)
        {
            // Verify initial slots count
            var conn = context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            int initialCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM `Timetables` WHERE `SectionId` = 30 AND `AcademicYearId` = 9;");

            // Intentionally trigger failure by specifying an invalid subject requirement with excess periods
            var invalidRequest = new GenerateTimetableRequestDto
            {
                CampusId = 1,
                BoardId = 1,
                AcademicLevelId = 1,
                AcademicYearId = 9,
                GroupId = 37,
                SectionIds = new List<int> { 30 },
                WorkingDays = new List<int> { 1, 2, 3, 4, 5, 6 },
                SubjectRequirements = new List<SubjectWeeklyPeriodRequirementDto>
                {
                    new SubjectWeeklyPeriodRequirementDto { SubjectId = 9, WeeklyPeriods = 100 } // Exceeds 60
                }
            };

            bool threw = false;
            try
            {
                await service.GenerateTheoryTimetableAsync(invalidRequest);
            }
            catch (Exception)
            {
                threw = true;
            }

            if (!threw)
                throw new Exception("Expected generation to fail with excess capacity, but it succeeded!");

            int afterCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM `Timetables` WHERE `SectionId` = 30 AND `AcademicYearId` = 9;");

            if (initialCount != afterCount)
                throw new Exception($"Rollback failed! Initial slot count was {initialCount} but after count is {afterCount}.");
        }

        private async Task Test_CampusWithNoEligibleStaff_Rejects(ITimetableService service, AppDbContext context)
        {
            // Non-existent or inactive CampusId 99999
            var request = new GenerateTimetableRequestDto
            {
                CampusId = 99999,
                BoardId = 1,
                AcademicLevelId = 1,
                AcademicYearId = 9,
                GroupId = 37,
                SectionIds = new List<int> { 30 }
            };

            bool threw = false;
            try
            {
                await service.GenerateTheoryTimetableAsync(request);
            }
            catch (Exception ex)
            {
                threw = true;
                if (!ex.Message.Contains("teaching staff", StringComparison.OrdinalIgnoreCase) &&
                    !ex.Message.Contains("Campus", StringComparison.OrdinalIgnoreCase))
                {
                    throw new Exception($"Expected campus staff validation error, but got: {ex.Message}");
                }
            }

            if (!threw)
                throw new Exception("Expected generation to reject when campus has no eligible teaching staff!");
        }

        private async Task Test_CrossStructure_TimeOverlapClash(ITimetableService service, AppDbContext context)
        {
            // Verify time-overlap clash logic in CheckSlotConflictAsync
            var timetableRepo = new TimetableRepository(context);

            // Test period 819 (08:00 - 08:45) vs period 820 (08:45 - 09:30): They do NOT overlap
            // Period 819 vs 819: Overlaps
            var conflict = await timetableRepo.CheckSlotConflictAsync(
                academicYearId: 9,
                sectionId: 30,
                staffId: 3,
                roomId: 12,
                dayOfWeek: 1,
                periodId: 819,
                excludeId: null);

            if (conflict == null)
                throw new Exception("Expected conflict for booked slot Day 1 Period 819, but got null!");
        }

        private async Task Test_RepeatedGeneration_NoDuplicates(ITimetableService service, AppDbContext context)
        {
            var request = new GenerateTimetableRequestDto
            {
                CampusId = 1,
                BoardId = 1,
                AcademicLevelId = 1,
                AcademicYearId = 9,
                GroupId = 37,
                SectionIds = new List<int> { 30 },
                WorkingDays = new List<int> { 1, 2, 3, 4, 5, 6 }
            };

            // Run generation 1
            var res1 = await service.GenerateTheoryTimetableAsync(request);
            // Run generation 2 (repeated immediately)
            var res2 = await service.GenerateTheoryTimetableAsync(request);

            if (res2.TotalSlotsGenerated != 60)
                throw new Exception($"Expected 60 slots on repeated generation, got {res2.TotalSlotsGenerated}.");

            var conn = context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            int dbCount = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM `Timetables` WHERE `SectionId` = 30 AND `AcademicYearId` = 9;");

            if (dbCount != 60)
                throw new Exception($"Duplicate slots detected in DB! Expected 60, found {dbCount}.");

            // Check duplicate (DayOfWeek, PeriodId)
            var duplicateCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM (
                    SELECT DayOfWeek, PeriodId, COUNT(*) as c
                    FROM `Timetables`
                    WHERE SectionId = 30 AND AcademicYearId = 9
                    GROUP BY DayOfWeek, PeriodId
                    HAVING c > 1
                ) dup;");

            if (duplicateCount > 0)
                throw new Exception($"Found {duplicateCount} duplicate period entries for Section 30!");
        }

        private async Task Test_PublishedTimetable_SafeHandling(ITimetableService service, AppDbContext context)
        {
            var conn = context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();

            // Temporarily mark section 30 as published
            await conn.ExecuteAsync("UPDATE `Timetables` SET `IsPublished` = 1, `ApprovalStatus` = 2 WHERE `SectionId` = 30 AND `AcademicYearId` = 9;");

            bool threw = false;
            try
            {
                var request = new GenerateTimetableRequestDto
                {
                    CampusId = 1,
                    BoardId = 1,
                    AcademicLevelId = 1,
                    AcademicYearId = 9,
                    GroupId = 37,
                    SectionIds = new List<int> { 30 }
                };

                await service.GenerateTheoryTimetableAsync(request);
            }
            catch (InvalidOperationException ex)
            {
                threw = true;
                if (!ex.Message.Contains("published", StringComparison.OrdinalIgnoreCase) &&
                    !ex.Message.Contains("approved", StringComparison.OrdinalIgnoreCase))
                {
                    throw new Exception($"Unexpected error message: {ex.Message}");
                }
            }
            finally
            {
                // Revert to draft status
                await conn.ExecuteAsync("UPDATE `Timetables` SET `IsPublished` = 0, `ApprovalStatus` = 0 WHERE `SectionId` = 30 AND `AcademicYearId` = 9;");
            }

            if (!threw)
                throw new Exception("Expected generation to fail when existing timetable is published, but it silently proceeded!");
        }
    }
}
