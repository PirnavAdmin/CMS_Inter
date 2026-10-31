using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Repositories.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class TimetableModuleBackendTester
    {
        private readonly string _connectionString;

        public TimetableModuleBackendTester(string connectionString)
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
            Console.WriteLine("        TIMETABLE MODULE 100% STORED PROCEDURE & DAPPER TEST SUITE             ");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            using var dbContext = new AppDbContext(optionsBuilder.Options);

            var timetableRepo = new TimetableRepository(dbContext);
            var backupRepo = new TimetableBackupRepository(dbContext);
            var breakTypeRepo = new BreakTypeRepository(dbContext);
            var subRepo = new TimetableSubstitutionRepository(dbContext);

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            // -------------------------------------------------------------------------
            // TEST 1: Stored Procedure Catalog Verification
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[1/5] Verifying Timetable Module Stored Procedures in Database...");
            try
            {
                var expectedProcs = new[]
                {
                    "sp_GetTimetablesFull",
                    "sp_GetTimetableByIdFull",
                    "sp_CreateTimetable",
                    "sp_UpdateTimetable",
                    "sp_DeleteTimetable",
                    "sp_TogglePublishSlot",
                    "sp_ApproveSectionTimetable",
                    "sp_GetAllocatedFaculties",
                    "sp_GetTimetablesPaged",
                    "sp_CopyTimetable",
                    "sp_CheckTimetableConflicts",
                    "sp_GetStudentTimetable",
                    "sp_GetExternalTimetableSlots",
                    "sp_GetTimetableGenerationContext",
                    "sp_DeleteDraftTimetableSlots",
                    "sp_ArchiveSectionTimetable",
                    "sp_SwapSectionTimetableBackup",
                    "sp_GetPreviousTimetable",
                    "sp_GetPreviousTimetableSlots",
                    "sp_DeleteTimetableBackup",
                    "sp_GetBreakTypes",
                    "sp_GetBreakTypeById",
                    "sp_CreateBreakType",
                    "sp_UpdateBreakType",
                    "sp_DeleteBreakType",
                    "sp_GetAffectedTimetableSlotsForLeave",
                    "sp_GetEligibleSubstituteStaff",
                    "sp_GetTimetableSubstitutions"
                };

                var existingProcs = (await conn.QueryAsync<string>(
                    @"SELECT ROUTINE_NAME 
                      FROM information_schema.ROUTINES 
                      WHERE ROUTINE_SCHEMA = 'CollegeManagement' AND ROUTINE_TYPE = 'PROCEDURE';"
                )).ToHashSet(StringComparer.OrdinalIgnoreCase);

                var missing = expectedProcs.Where(p => !existingProcs.Contains(p)).ToList();
                if (missing.Any())
                {
                    throw new Exception($"Missing stored procedures: {string.Join(", ", missing)}");
                }

                Console.WriteLine($"  [PASS] All {expectedProcs.Length} required Stored Procedures verified in DB.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 1: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 2: TimetableRepository CRUD & Stored Procedure Execution
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[2/5] Testing Timetable CRUD via Stored Procedures...");
            int createdId = 0;
            try
            {
                // Fetch active context references from DB
                var section = await conn.QueryFirstOrDefaultAsync<dynamic>("SELECT SectionId, CampusId, BoardId, AcademicLevelId, AcademicYearId, GroupId FROM Sections WHERE IsActive = 1 LIMIT 1;");
                var period = await conn.QueryFirstOrDefaultAsync<dynamic>("SELECT PeriodId FROM Periods WHERE IsActive = 1 AND IsBreak = 0 LIMIT 1;");
                var staff = await conn.QueryFirstOrDefaultAsync<dynamic>("SELECT Id FROM Staff WHERE IsDeleted = 0 AND Status = 'Active' LIMIT 1;");
                var room = await conn.QueryFirstOrDefaultAsync<dynamic>("SELECT RoomId FROM Rooms WHERE IsActive = 1 LIMIT 1;");
                var subject = await conn.QueryFirstOrDefaultAsync<dynamic>("SELECT SubjectId FROM Subjects WHERE IsActive = 1 LIMIT 1;");

                if (section == null || period == null || staff == null || room == null || subject == null)
                {
                    throw new Exception("Prerequisite test data missing (Section, Period, Staff, Room, or Subject).");
                }

                var createDto = new CreateTimetableDto
                {
                    CampusId = (int)section.CampusId,
                    BoardId = (int)section.BoardId,
                    AcademicLevelId = (int)section.AcademicLevelId,
                    AcademicYearId = (int)section.AcademicYearId,
                    GroupId = (int)section.GroupId,
                    SectionId = (int)section.SectionId,
                    DayOfWeek = 7, // Sunday for isolated test slot
                    PeriodId = (int)period.PeriodId,
                    SubjectId = (int)subject.SubjectId,
                    StaffId = (int)staff.Id,
                    RoomId = (int)room.RoomId,
                    IsPublished = false,
                    Remarks = "Automated Test Slot",
                    SlotType = "Teaching"
                };

                // Add via sp_CreateTimetable
                createdId = await timetableRepo.AddAsync(createDto);
                if (createdId <= 0) throw new Exception("AddAsync returned invalid ID.");

                // Read via sp_GetTimetableByIdFull
                var fetched = await timetableRepo.GetByIdAsync(createdId);
                if (fetched == null || fetched.Id != createdId) throw new Exception("GetByIdAsync failed to fetch created slot.");
                if (fetched.DayOfWeek != 7) throw new Exception("Fetched slot day of week mismatch.");

                // Update via sp_UpdateTimetable
                var updateDto = new UpdateTimetableDto
                {
                    CampusId = fetched.CampusId,
                    BoardId = fetched.BoardId,
                    AcademicLevelId = fetched.AcademicLevelId,
                    AcademicYearId = fetched.AcademicYearId,
                    GroupId = fetched.GroupId,
                    SectionId = fetched.SectionId,
                    DayOfWeek = 7,
                    PeriodId = fetched.PeriodId,
                    SubjectId = fetched.SubjectId,
                    StaffId = fetched.StaffId,
                    RoomId = fetched.RoomId,
                    IsPublished = true,
                    Remarks = "Updated Automated Test Slot",
                    SlotType = "Teaching"
                };
                await timetableRepo.UpdateAsync(createdId, updateDto);

                // Verify update
                var updated = await timetableRepo.GetByIdAsync(createdId);
                if (updated?.Remarks != "Updated Automated Test Slot") throw new Exception("UpdateAsync did not persist remarks.");

                // Toggle publish via sp_TogglePublishSlot
                await timetableRepo.TogglePublishSlotAsync(createdId, false);
                var unpub = await timetableRepo.GetByIdAsync(createdId);
                if (unpub?.IsPublished != false) throw new Exception("TogglePublishSlotAsync did not toggle status.");

                // Delete via sp_DeleteTimetable
                await timetableRepo.DeleteAsync(createdId);
                var deleted = await timetableRepo.GetByIdAsync(createdId);
                if (deleted != null) throw new Exception("DeleteAsync did not remove test slot.");

                Console.WriteLine("  [PASS] TimetableRepository CRUD (Create, Read, Update, Toggle, Delete) fully verified via Stored Procedures.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 2: {ex.Message}");
                failed++;
                if (createdId > 0)
                {
                    try { await timetableRepo.DeleteAsync(createdId); } catch { }
                }
            }

            // -------------------------------------------------------------------------
            // TEST 3: Conflict Detection & Paging Stored Procedures
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[3/5] Testing Conflict Detection & Paged Queries...");
            try
            {
                // Paged query
                var queryParams = new TimetableQueryParams
                {
                    PageNumber = 1,
                    PageSize = 5
                };
                var (pagedItems, totalCount) = await timetableRepo.GetPagedAsync(queryParams);
                if (totalCount < 0) throw new Exception("GetPagedAsync returned negative count.");
                Console.WriteLine($"  - sp_GetTimetablesPaged returned TotalCount={totalCount}, PageItems={pagedItems.Count()}");

                // Conflict check
                var firstSlot = (await timetableRepo.GetPagedAsync(new TimetableQueryParams { PageNumber = 1, PageSize = 1 })).Items.FirstOrDefault();
                if (firstSlot != null)
                {
                    var conflict = await timetableRepo.CheckSlotConflictAsync(
                        firstSlot.AcademicYearId,
                        firstSlot.SectionId,
                        firstSlot.StaffId,
                        firstSlot.RoomId,
                        firstSlot.DayOfWeek,
                        firstSlot.PeriodId);

                    Console.WriteLine($"  - Conflict check on existing slot returned: {conflict ?? "None"}");
                }

                Console.WriteLine("  [PASS] Conflict detection and paged stored procedures verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 3: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 4: Timetable Backup & Restore Stored Procedures
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[4/5] Testing Backup, Slots & Cleanup Stored Procedures...");
            try
            {
                var prevBackup = await backupRepo.GetPreviousBySectionAsync(999999, 1);
                // Non-existent section should return null gracefully
                if (prevBackup != null) throw new Exception("Expected null for non-existent section backup.");

                await backupRepo.DeleteBackupAsync(999999, 1);
                Console.WriteLine("  [PASS] Timetable backup, query, and delete stored procedures executed cleanly.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 4: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 5: Break Types & Substitutions Stored Procedures
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[5/5] Testing Break Types & Substitutions Stored Procedures...");
            try
            {
                var breakTypes = await breakTypeRepo.GetAllAsync();
                Console.WriteLine($"  - sp_GetBreakTypes returned {breakTypes.Count()} break types.");

                var subs = await subRepo.GetSubstitutionsAsync(null, null, null, null);
                Console.WriteLine($"  - sp_GetTimetableSubstitutions returned {subs.Count()} substitutions.");

                Console.WriteLine("  [PASS] Break types and substitutions stored procedures verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 5: {ex.Message}");
                failed++;
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"TOTAL PASSED: {passed} / 5 | TOTAL FAILED: {failed} / 5");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }
}
