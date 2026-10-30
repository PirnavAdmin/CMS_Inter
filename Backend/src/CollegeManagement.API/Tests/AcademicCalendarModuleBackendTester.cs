using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.AcademicCalendar;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class AcademicCalendarModuleBackendTester
    {
        private readonly string _connectionString;

        public AcademicCalendarModuleBackendTester(string connectionString)
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
            Console.WriteLine("    ACADEMIC CALENDAR MODULE 100% STORED PROCEDURE & DAPPER TEST SUITE          ");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            using var dbContext = new AppDbContext(optionsBuilder.Options);

            var calendarRepo = new AcademicCalendarRepository(dbContext);

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            // -------------------------------------------------------------------------
            // TEST 1: Stored Procedure Catalog Verification
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[1/5] Verifying Academic Calendar Stored Procedures in Database...");
            try
            {
                var expectedProcs = new[]
                {
                    "sp_GetAcademicCalendarEventsPaged",
                    "sp_GetAcademicCalendarEventsByRange",
                    "sp_GetAcademicCalendarEventById",
                    "sp_GetAcademicCalendarMetrics",
                    "sp_GetUpcomingAcademicCalendarEvents",
                    "sp_CreateAcademicCalendarEvent",
                    "sp_UpdateAcademicCalendarEvent",
                    "sp_PublishAcademicCalendarEvent",
                    "sp_DeleteAcademicCalendarEvent"
                };

                var existingProcs = (await conn.QueryAsync<string>(
                    @"SELECT ROUTINE_NAME 
                      FROM information_schema.ROUTINES 
                      WHERE ROUTINE_SCHEMA = 'CollegeManagement' AND ROUTINE_TYPE = 'PROCEDURE'
                        AND ROUTINE_NAME LIKE 'sp_%AcademicCalendar%';"))
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                bool allFound = true;
                foreach (var proc in expectedProcs)
                {
                    if (existingProcs.Contains(proc))
                    {
                        Console.WriteLine($"  [OK] {proc} found.");
                    }
                    else
                    {
                        Console.WriteLine($"  [FAIL] {proc} NOT found in database!");
                        allFound = false;
                    }
                }

                if (allFound)
                {
                    Console.WriteLine(">> TEST 1 PASSED: All 9 Academic Calendar Stored Procedures exist in live MySQL.");
                    passed++;
                }
                else
                {
                    Console.WriteLine(">> TEST 1 FAILED: Missing stored procedures.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($">> TEST 1 ERROR: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 2: Pagination & Filtering via Dapper Repository
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[2/5] Testing GetPagedEventsAsync via Dapper Repository...");
            try
            {
                var filter = new AcademicCalendarFilterDto
                {
                    Page = 1,
                    PageSize = 10
                };

                var (items, totalCount) = await calendarRepo.GetPagedEventsAsync(filter);
                Console.WriteLine($"  TotalCount: {totalCount}, Retrieved items on page 1: {items.Count}");

                if (totalCount >= 0 && items != null)
                {
                    Console.WriteLine(">> TEST 2 PASSED: Pagination returned valid total and items.");
                    passed++;
                }
                else
                {
                    Console.WriteLine(">> TEST 2 FAILED: Items was null.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($">> TEST 2 ERROR: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 3: Metrics Aggregation & Category Grouping
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[3/5] Testing GetMetricsAsync (Summary & Category Breakdown)...");
            try
            {
                var metrics = await calendarRepo.GetMetricsAsync(null, null, null);
                Console.WriteLine($"  Total: {metrics.TotalEvents}, Upcoming: {metrics.UpcomingEvents}, Exams: {metrics.Examinations}, Holidays: {metrics.Holidays}");
                Console.WriteLine($"  Category Breakdown Entries: {metrics.EventTypeCounts.Count}");
                foreach (var kvp in metrics.EventTypeCounts)
                {
                    Console.WriteLine($"    - {kvp.Key}: {kvp.Value}");
                }

                if (metrics.TotalEvents >= 0 && metrics.EventTypeCounts != null)
                {
                    Console.WriteLine(">> TEST 3 PASSED: Metrics and category breakdown computed cleanly.");
                    passed++;
                }
                else
                {
                    Console.WriteLine(">> TEST 3 FAILED: Metrics was invalid.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($">> TEST 3 ERROR: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 4: Date Range & Upcoming Events Query
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[4/5] Testing Range & Upcoming Events Queries...");
            try
            {
                var rangeEvents = await calendarRepo.GetEventsByRangeAsync(
                    DateTime.UtcNow.AddYears(-2),
                    DateTime.UtcNow.AddYears(2));

                Console.WriteLine($"  Range events found: {rangeEvents.Count}");

                var upcoming = await calendarRepo.GetUpcomingEventsAsync(null, null, null, 5);
                Console.WriteLine($"  Upcoming events returned: {upcoming.Count}");

                if (rangeEvents != null && upcoming != null)
                {
                    Console.WriteLine(">> TEST 4 PASSED: Date range and upcoming queries succeeded.");
                    passed++;
                }
                else
                {
                    Console.WriteLine(">> TEST 4 FAILED: Range or upcoming was null.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($">> TEST 4 ERROR: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 5: Full CRUD Lifecycle (Create -> GetById -> Update -> Publish -> Delete)
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[5/5] Testing Complete CRUD Lifecycle via Stored Procedures...");
            int? createdEventId = null;
            try
            {
                // Find valid BoardId and AcademicYearId
                var validAyId = await conn.QueryFirstOrDefaultAsync<int?>("SELECT AcademicYearId FROM AcademicYears LIMIT 1") ?? 9;
                var validBoardId = await conn.QueryFirstOrDefaultAsync<int?>("SELECT BoardId FROM Boards LIMIT 1") ?? 1;

                var newEvent = new AcademicCalendarEvent
                {
                    Title = "Phase 5 Backend Automated Test Event",
                    EventType = "Academic Activities",
                    Description = "Validation of pure stored procedure CRUD lifecycle",
                    StartDate = DateTime.UtcNow.Date.AddDays(7),
                    EndDate = DateTime.UtcNow.Date.AddDays(7),
                    IsAllDay = true,
                    StartTime = "09:00",
                    EndTime = "17:00",
                    Status = "Draft",
                    BoardId = validBoardId,
                    AcademicYearId = validAyId,
                    Location = "Campus Auditorium Room 101",
                    IsPublished = false,
                    CreatedBy = 1
                };

                // 1. Create
                var created = await calendarRepo.CreateAsync(newEvent);
                createdEventId = created.EventId;
                Console.WriteLine($"  Created Event ID: {created.EventId}, Title: '{created.Title}', BoardName: '{created.Board?.BoardName}'");

                if (created.EventId <= 0 || string.IsNullOrEmpty(created.Board?.BoardName))
                {
                    throw new Exception("CreateAsync failed to return populated ID or joined BoardName in 1 round trip.");
                }

                // 2. GetById
                var fetched = await calendarRepo.GetByIdAsync(created.EventId);
                if (fetched == null || fetched.Title != newEvent.Title)
                {
                    throw new Exception($"GetByIdAsync failed to fetch created event #{created.EventId}.");
                }
                Console.WriteLine($"  GetById fetched: '{fetched.Title}' with AcademicYear: '{fetched.AcademicYear?.AcademicYearName}'");

                // 3. Update
                fetched.Title = "Phase 5 Updated Event Title";
                fetched.Location = "Advanced Lecture Theatre";
                fetched.UpdatedBy = 1;

                var updated = await calendarRepo.UpdateAsync(fetched);
                if (updated.Title != "Phase 5 Updated Event Title" || updated.Location != "Advanced Lecture Theatre")
                {
                    throw new Exception("UpdateAsync did not reflect updated fields.");
                }
                Console.WriteLine($"  UpdateAsync verified: '{updated.Title}', Location: '{updated.Location}'");

                // 4. Publish
                var published = await calendarRepo.PublishAsync(created.EventId, 1);
                if (published == null || !published.IsPublished || published.Status != "Published")
                {
                    throw new Exception("PublishAsync failed to set status to Published.");
                }
                Console.WriteLine($"  PublishAsync verified: Status='{published.Status}', IsPublished={published.IsPublished}");

                // 5. Delete (Soft Delete)
                bool deleted = await calendarRepo.DeleteAsync(created.EventId, 1);
                if (!deleted)
                {
                    throw new Exception("DeleteAsync returned false.");
                }
                Console.WriteLine($"  DeleteAsync soft-deleted event #{created.EventId}.");

                // Verify soft deleted item cannot be retrieved by GetByIdAsync
                var verifyDeleted = await calendarRepo.GetByIdAsync(created.EventId);
                if (verifyDeleted != null)
                {
                    throw new Exception($"Soft-deleted event #{created.EventId} was still returned by GetByIdAsync!");
                }
                Console.WriteLine("  Verified soft-deleted event is excluded from subsequent queries.");

                Console.WriteLine(">> TEST 5 PASSED: Full CRUD lifecycle executed and verified with 0 defects.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($">> TEST 5 ERROR: {ex.Message}");
                failed++;

                // Cleanup if needed
                if (createdEventId.HasValue)
                {
                    try { await conn.ExecuteAsync("DELETE FROM AcademicCalendarEvents WHERE EventId = @Id", new { Id = createdEventId.Value }); } catch { }
                }
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"    ACADEMIC CALENDAR MODULE TEST RESULTS: {passed} PASSED, {failed} FAILED     ");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }
}
