using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class TimetableOptimizationTester
    {
        private readonly string _connectionString;

        public TimetableOptimizationTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task RunAsync()
        {
            Console.WriteLine("===============================================================");
            Console.WriteLine("        TIMETABLE PERFORMANCE & OPTIMIZATION DIAGNOSTIC");
            Console.WriteLine("===============================================================");

            var swTotal = Stopwatch.StartNew();

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            Console.WriteLine("\n[1] Checking Timetable Table Row Counts & Existing Indexes...");
            var ttCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Timetables`;");
            var backupCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `TimetableBackups`;");
            var backupSlotCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `TimetableBackupSlots`;");
            var periodsCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Periods`;");
            var roomsCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Rooms`;");

            Console.WriteLine($"  - Timetables: {ttCount} rows");
            Console.WriteLine($"  - TimetableBackups: {backupCount} rows");
            Console.WriteLine($"  - TimetableBackupSlots: {backupSlotCount} rows");
            Console.WriteLine($"  - Periods: {periodsCount} rows");
            Console.WriteLine($"  - Rooms: {roomsCount} rows");

            var indexes = (await conn.QueryAsync<dynamic>("SHOW INDEX FROM `Timetables`;")).ToList();
            Console.WriteLine($"  - Timetables Index Count: {indexes.Count}");
            foreach (var idx in indexes)
            {
                Console.WriteLine($"     Index: {idx.Key_name} on Column: {idx.Column_name} (Seq: {idx.Seq_in_index})");
            }

            // Benchmark a typical section timetable query
            var sampleSectionId = await conn.ExecuteScalarAsync<int?>("SELECT SectionId FROM `Timetables` LIMIT 1;") ?? 1;
            var sampleYearId = await conn.ExecuteScalarAsync<int?>("SELECT AcademicYearId FROM `Timetables` WHERE SectionId = @sampleSectionId LIMIT 1;", new { sampleSectionId }) ?? 1;

            Console.WriteLine($"\n[2] Benchmarking Timetable Queries for SectionId: {sampleSectionId}, YearId: {sampleYearId}...");
            
            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            using var dbContext = new AppDbContext(optionsBuilder.Options);

            var repo = new TimetableRepository(dbContext);

            // Test 1: GetBySectionIdAsync (Current vs Optimized)
            var sw = Stopwatch.StartNew();
            var sectionSlots = (await repo.GetBySectionIdAsync(sampleSectionId, sampleYearId)).ToList();
            sw.Stop();
            Console.WriteLine($"  - Current GetBySectionIdAsync: {sw.ElapsedMilliseconds} ms (Returned {sectionSlots.Count} slots)");

            // Test 1b: Optimized GetBySectionId (pre-sorted on Timetables index or joined index)
            sw.Restart();
            string optSectionSql = @"
                SELECT 
                    t.`Id`, t.`Id` AS TimetableId, t.`CampusId`, c.`CampusName`,
                    t.`BoardId`, b.`BoardName`, t.`AcademicLevelId`, al.`LevelName` AS AcademicLevelName, al.`LevelName`,
                    t.`AcademicYearId`, ay.`AcademicYearName`, t.`GroupId`, g.`GroupName`,
                    t.`ProgramId`, p.`ProgramName`, t.`SectionId`, s.`SectionName`,
                    t.`DayOfWeek`,
                    CASE t.`DayOfWeek` WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday' WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday' WHEN 6 THEN 'Saturday' WHEN 7 THEN 'Sunday' ELSE '' END AS DayName,
                    t.`PeriodId`, prd.`PeriodName`, prd.`DisplayOrder` AS PeriodNumber, prd.`StartTime`, prd.`EndTime`, prd.`IsBreak`,
                    t.`SubjectId`, sub.`SubjectName`, sub.`SubjectCode`,
                    t.`StaffId`, t.`StaffId` AS FacultyId, st.`EmployeeId` AS StaffEmployeeId, st.`EmployeeId` AS FacultyEmployeeId,
                    CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, '')) AS StaffName,
                    CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, '')) AS FacultyName,
                    t.`RoomId`, rm.`RoomCode`, rm.`RoomName`,
                    t.`IsPublished`, t.`ApprovalStatus`,
                    CASE t.`ApprovalStatus` WHEN 0 THEN 'Draft' WHEN 1 THEN 'Published' WHEN 2 THEN 'Archived' WHEN 3 THEN 'Approved' ELSE 'Draft' END AS ApprovalStatusName,
                    t.`Remarks`, t.`CreatedAt`, t.`UpdatedAt`
                FROM `Timetables` t
                STRAIGHT_JOIN `Sections` s ON s.`SectionId` = t.`SectionId`
                LEFT JOIN `Campuses` c ON c.`CampusId` = t.`CampusId`
                LEFT JOIN `Boards` b ON b.`BoardId` = t.`BoardId`
                LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = t.`AcademicLevelId`
                LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = t.`AcademicYearId`
                LEFT JOIN `Groups` g ON g.`GroupId` = t.`GroupId`
                LEFT JOIN `Programs` p ON p.`ProgramId` = t.`ProgramId`
                LEFT JOIN `Periods` prd ON prd.`PeriodId` = t.`PeriodId`
                LEFT JOIN `Subjects` sub ON sub.`SubjectId` = t.`SubjectId`
                LEFT JOIN `Staff` st ON st.`Id` = t.`StaffId`
                LEFT JOIN `Rooms` rm ON rm.`RoomId` = t.`RoomId`
                WHERE t.`SectionId` = @sampleSectionId AND t.`AcademicYearId` = @sampleYearId
                ORDER BY t.`DayOfWeek`, t.`PeriodId`;
            ";
            var optSlots = (await conn.QueryAsync<TimetableResponseDto>(optSectionSql, new { sampleSectionId, sampleYearId })).ToList();
            sw.Stop();
            Console.WriteLine($"  - Optimized Query GetBySection: {sw.ElapsedMilliseconds} ms (Returned {optSlots.Count} slots)");

            // Test 2: Conflict checks: 3 Sequential vs 1 Single Consolidated Check
            sw.Restart();
            var conf1 = await repo.HasSectionSlotConflictAsync(sampleYearId, sampleSectionId, 1, 1);
            var conf2 = await repo.HasFacultySlotConflictAsync(sampleYearId, 1, 1, 1);
            var conf3 = await repo.HasRoomSlotConflictAsync(sampleYearId, 1, 1, 1);
            sw.Stop();
            Console.WriteLine($"  - 3 Sequential Conflict Checks: {sw.ElapsedMilliseconds} ms");

            sw.Restart();
            string singleConflictSql = @"
                SELECT 
                    CASE 
                        WHEN `SectionId` = @sampleSectionId THEN 'SECTION'
                        WHEN `StaffId` = 1 THEN 'STAFF'
                        WHEN `RoomId` > 0 AND `RoomId` = 1 THEN 'ROOM'
                    END AS ConflictType
                FROM `Timetables`
                WHERE `AcademicYearId` = @sampleYearId 
                  AND `DayOfWeek` = 1 
                  AND `PeriodId` = 1
                  AND (`SectionId` = @sampleSectionId OR `StaffId` = 1 OR (`RoomId` > 0 AND `RoomId` = 1))
                LIMIT 1;
            ";
            var conflictType = await conn.QueryFirstOrDefaultAsync<string>(singleConflictSql, new { sampleYearId, sampleSectionId });
            sw.Stop();
            Console.WriteLine($"  - 1 Single Consolidated Conflict Check: {sw.ElapsedMilliseconds} ms (Result: {conflictType ?? "None"})");

            // Test 3: Batch Section Fetching (e.g. 5 sections)
            // Test 3: Batch Section Fetching (e.g. 5 sections)
            var sectionIds = new[] { sampleSectionId, 1, 2, 3, 4 };
            sw.Restart();
            var batchOptSlots = (await repo.GetBySectionIdsBatchAsync(sectionIds, sampleYearId)).ToList();
            sw.Stop();
            Console.WriteLine($"  - 5 Sections Batch Fetch (GetBySectionIdsBatchAsync): {sw.ElapsedMilliseconds} ms (Total slots: {batchOptSlots.Count})");

            // Test 4: Repository CheckSlotConflictAsync
            sw.Restart();
            var repoConflict = await repo.CheckSlotConflictAsync(sampleYearId, sampleSectionId, 1, 1, 1, 1);
            sw.Stop();
            Console.WriteLine($"  - Repository CheckSlotConflictAsync: {sw.ElapsedMilliseconds} ms (Conflict: {repoConflict ?? "None"})");

            // Test 5: TimetableSubstitutionRepository GetSubstitutionsByIdsAsync
            var subRepo = new TimetableSubstitutionRepository(dbContext);
            sw.Restart();
            var subs = (await subRepo.GetSubstitutionsByIdsAsync(new[] { 1, 2, 3 })).ToList();
            sw.Stop();
            Console.WriteLine($"  - Batch GetSubstitutionsByIdsAsync (IDs 1,2,3): {sw.ElapsedMilliseconds} ms (Found: {subs.Count})");

            // Test 6: Hierarchy query for PDF Export
            sw.Restart();
            const string hierarchySql = @"
                SELECT 
                    b.BoardId, b.BoardName, b.IsActive AS BoardIsActive,
                    al.AcademicLevelId, al.LevelName, al.IsActive AS LevelIsActive,
                    ay.AcademicYearId, ay.AcademicYearName, ay.IsActive AS YearIsActive,
                    g.GroupId, g.GroupName, g.BoardId AS GroupBoardId, g.AcademicLevelId AS GroupAcademicLevelId, g.IsActive AS GroupIsActive,
                    p.ProgramId, p.ProgramName, p.IsActive AS ProgramIsActive,
                    s.SectionId, s.SectionName, s.BoardId AS SectionBoardId, s.AcademicLevelId AS SectionAcademicLevelId,
                    s.GroupId AS SectionGroupId, s.ProgramId AS SectionProgramId, s.AcademicYearId AS SectionAcademicYearId, s.IsActive AS SectionIsActive
                FROM (SELECT 1 AS bId, 1 AS alId, @sampleYearId AS ayId, 1 AS gId, 1 AS pId, @sampleSectionId AS sId) params
                LEFT JOIN Boards b ON b.BoardId = params.bId
                LEFT JOIN AcademicLevels al ON al.AcademicLevelId = params.alId
                LEFT JOIN AcademicYears ay ON ay.AcademicYearId = params.ayId
                LEFT JOIN `Groups` g ON g.GroupId = params.gId
                LEFT JOIN Programs p ON p.ProgramId = params.pId
                LEFT JOIN Sections s ON s.SectionId = params.sId;";
            var hierRow = await conn.QueryFirstOrDefaultAsync(hierarchySql, new { sampleYearId, sampleSectionId });
            sw.Stop();
            Console.WriteLine($"  - Consolidated Hierarchy Validation Query: {sw.ElapsedMilliseconds} ms");

            swTotal.Stop();
            Console.WriteLine($"\n===============================================================");
            Console.WriteLine($"Diagnostic Completed successfully in {swTotal.ElapsedMilliseconds} ms.");
            Console.WriteLine($"===============================================================");
        }
    }
}
