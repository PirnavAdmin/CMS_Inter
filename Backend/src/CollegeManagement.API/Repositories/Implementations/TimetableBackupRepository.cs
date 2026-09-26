using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TimetableBackupRepository : ITimetableBackupRepository
    {
        private readonly AppDbContext _context;

        public TimetableBackupRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<IDbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }
            return conn;
        }

        public async Task<TimetableBackupResponseDto?> GetPreviousBySectionAsync(int sectionId, int? academicYearId = null)
        {
            var conn = await GetOpenConnectionAsync();

            string headerSql = @"
                SELECT 
                    tb.`Id`,
                    tb.`BoardId`,
                    b.`BoardName`,
                    tb.`AcademicLevelId`,
                    al.`LevelName` AS AcademicLevelName,
                    tb.`AcademicYearId`,
                    ay.`AcademicYearName`,
                    tb.`GroupId`,
                    g.`GroupName`,
                    tb.`SectionId`,
                    s.`SectionName`,
                    tb.`ArchivedAt`,
                    tb.`ArchivedBy`,
                    tb.`ArchiveReason`
                FROM `TimetableBackups` tb
                LEFT JOIN `Boards` b ON b.`BoardId` = tb.`BoardId`
                LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = tb.`AcademicLevelId`
                LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = tb.`AcademicYearId`
                LEFT JOIN `Groups` g ON g.`GroupId` = tb.`GroupId`
                LEFT JOIN `Sections` s ON s.`SectionId` = tb.`SectionId`
                WHERE tb.`SectionId` = @sectionId 
                  AND (@academicYearId IS NULL OR @academicYearId <= 0 OR tb.`AcademicYearId` = @academicYearId)
                ORDER BY tb.`ArchivedAt` DESC
                LIMIT 1;
            ";

            var header = await conn.QueryFirstOrDefaultAsync<TimetableBackupResponseDto>(headerSql, new { sectionId, academicYearId });
            if (header == null) return null;

            string slotsSql = @"
                SELECT 
                    tbs.`OriginalTimetableId` AS Id,
                    tbs.`OriginalTimetableId` AS TimetableId,
                    tbs.`BoardId`,
                    b.`BoardName`,
                    tbs.`AcademicLevelId`,
                    al.`LevelName` AS AcademicLevelName,
                    al.`LevelName`,
                    tbs.`AcademicYearId`,
                    ay.`AcademicYearName`,
                    tbs.`GroupId`,
                    g.`GroupName`,
                    tbs.`ProgramId`,
                    p.`ProgramName`,
                    tbs.`SectionId`,
                    s.`SectionName`,
                    tbs.`DayOfWeek`,
                    CASE tbs.`DayOfWeek`
                        WHEN 1 THEN 'Monday'
                        WHEN 2 THEN 'Tuesday'
                        WHEN 3 THEN 'Wednesday'
                        WHEN 4 THEN 'Thursday'
                        WHEN 5 THEN 'Friday'
                        WHEN 6 THEN 'Saturday'
                        WHEN 7 THEN 'Sunday'
                        ELSE ''
                    END AS DayName,
                    tbs.`PeriodId`,
                    prd.`PeriodName`,
                    prd.`DisplayOrder` AS PeriodNumber,
                    prd.`StartTime`,
                    prd.`EndTime`,
                    prd.`IsBreak`,
                    tbs.`SubjectId`,
                    sub.`SubjectName`,
                    sub.`SubjectCode`,
                    tbs.`StaffId`,
                    tbs.`StaffId` AS FacultyId,
                    st.`EmployeeId` AS StaffEmployeeId,
                    st.`EmployeeId` AS FacultyEmployeeId,
                    CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, '')) AS StaffName,
                    CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, '')) AS FacultyName,
                    tbs.`RoomId`,
                    rm.`RoomCode`,
                    rm.`RoomName`,
                    tbs.`IsPublished`,
                    tbs.`ApprovalStatus`,
                    CASE tbs.`ApprovalStatus`
                        WHEN 0 THEN 'Draft'
                        WHEN 1 THEN 'Published'
                        WHEN 2 THEN 'Archived'
                        WHEN 3 THEN 'Approved'
                        ELSE 'Draft'
                    END AS ApprovalStatusName,
                    tbs.`Remarks`,
                    tbs.`CreatedAt`
                FROM `TimetableBackupSlots` tbs
                LEFT JOIN `Boards` b ON b.`BoardId` = tbs.`BoardId`
                LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = tbs.`AcademicLevelId`
                LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = tbs.`AcademicYearId`
                LEFT JOIN `Groups` g ON g.`GroupId` = tbs.`GroupId`
                LEFT JOIN `Programs` p ON p.`ProgramId` = tbs.`ProgramId`
                LEFT JOIN `Sections` s ON s.`SectionId` = tbs.`SectionId`
                LEFT JOIN `Periods` prd ON prd.`PeriodId` = tbs.`PeriodId`
                LEFT JOIN `Subjects` sub ON sub.`SubjectId` = tbs.`SubjectId`
                LEFT JOIN `Staff` st ON st.`Id` = tbs.`StaffId`
                LEFT JOIN `Rooms` rm ON rm.`RoomId` = tbs.`RoomId`
                WHERE tbs.`TimetableBackupId` = @backupId
                ORDER BY tbs.`DayOfWeek`, prd.`DisplayOrder`;
            ";

            var slots = (await conn.QueryAsync<TimetableResponseDto>(slotsSql, new { backupId = header.Id })).ToList();
            header.Slots = slots;
            header.TotalSlots = slots.Count;
            return header;
        }

        public async Task<int> ArchiveSectionTimetableAsync(int sectionId, int academicYearId, string? reason = null, string? user = null)
        {
            var conn = await GetOpenConnectionAsync();

            var currentSlots = (await conn.QueryAsync<Timetable>("SELECT * FROM `Timetables` WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId;", new { sectionId, academicYearId })).ToList();
            if (!currentSlots.Any()) return 0;

            // Delete old backups
            var oldBackupIds = (await conn.QueryAsync<int>("SELECT `Id` FROM `TimetableBackups` WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId;", new { sectionId, academicYearId })).ToList();
            if (oldBackupIds.Any())
            {
                await conn.ExecuteAsync("DELETE FROM `TimetableBackupSlots` WHERE `TimetableBackupId` IN @oldBackupIds;", new { oldBackupIds });
                await conn.ExecuteAsync("DELETE FROM `TimetableBackups` WHERE `Id` IN @oldBackupIds;", new { oldBackupIds });
            }

            var first = currentSlots.First();
            int newBackupId = await conn.ExecuteScalarAsync<int>(@"
                INSERT INTO `TimetableBackups` (`BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `SectionId`, `ArchivedAt`, `ArchivedBy`, `ArchiveReason`, `CreatedAt`)
                VALUES (@BoardId, @AcademicLevelId, @academicYearId, @GroupId, @sectionId, UTC_TIMESTAMP(), @user, @reason, UTC_TIMESTAMP());
                SELECT LAST_INSERT_ID();
            ", new
            {
                first.BoardId,
                first.AcademicLevelId,
                academicYearId,
                first.GroupId,
                sectionId,
                user = user ?? "System",
                reason = reason ?? "Archived by user"
            });

            var sb = new StringBuilder();
            sb.Append("INSERT INTO `TimetableBackupSlots` (`TimetableBackupId`, `OriginalTimetableId`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`, `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `RoomId`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`) VALUES ");
            var p = new DynamicParameters();
            for (int i = 0; i < currentSlots.Count; i++)
            {
                if (i > 0) sb.Append(", ");
                sb.Append($"(@bkId{i}, @origId{i}, @b{i}, @al{i}, @ay{i}, @g{i}, @pr{i}, @s{i}, @d{i}, @p{i}, @sub{i}, @st{i}, @r{i}, @pub{i}, @app{i}, @rem{i}, UTC_TIMESTAMP())");
                var s = currentSlots[i];
                p.Add($"bkId{i}", newBackupId);
                p.Add($"origId{i}", s.Id);
                p.Add($"b{i}", s.BoardId);
                p.Add($"al{i}", s.AcademicLevelId);
                p.Add($"ay{i}", s.AcademicYearId);
                p.Add($"g{i}", s.GroupId);
                p.Add($"pr{i}", s.ProgramId);
                p.Add($"s{i}", s.SectionId);
                p.Add($"d{i}", s.DayOfWeek);
                p.Add($"p{i}", s.PeriodId);
                p.Add($"sub{i}", s.SubjectId);
                p.Add($"st{i}", s.StaffId > 0 ? s.StaffId : 1);
                p.Add($"r{i}", s.RoomId > 0 ? s.RoomId : 1);
                p.Add($"pub{i}", s.IsPublished ? 1 : 0);
                p.Add($"app{i}", (int)s.ApprovalStatus);
                p.Add($"rem{i}", s.Remarks);
            }
            sb.AppendLine(";");
            sb.AppendLine("DELETE FROM `Timetables` WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId;");
            p.Add("sectionId", sectionId);
            p.Add("academicYearId", academicYearId);

            await conn.ExecuteAsync(sb.ToString(), p);
            return newBackupId;
        }

        public async Task<int> SwapRestoreSectionTimetableAsync(int sectionId, int academicYearId, string? user = null)
        {
            var conn = await GetOpenConnectionAsync();

            int previousBackupId = await conn.ExecuteScalarAsync<int>(@"
                SELECT `Id` FROM `TimetableBackups` 
                WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId 
                ORDER BY `ArchivedAt` DESC LIMIT 1;
            ", new { sectionId, academicYearId });

            if (previousBackupId <= 0) return 0;

            var backupSlots = (await conn.QueryAsync<TimetableBackupSlot>(@"
                SELECT * FROM `TimetableBackupSlots` WHERE `TimetableBackupId` = @previousBackupId;
            ", new { previousBackupId })).ToList();

            if (!backupSlots.Any()) return 0;

            // Delete existing current slots
            await conn.ExecuteAsync("DELETE FROM `Timetables` WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId;", new { sectionId, academicYearId });

            // Insert backup slots into Timetables
            var sb = new StringBuilder();
            sb.Append("INSERT INTO `Timetables` (`CampusId`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`, `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `RoomId`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`) VALUES ");
            var p = new DynamicParameters();
            for (int i = 0; i < backupSlots.Count; i++)
            {
                if (i > 0) sb.Append(", ");
                sb.Append($"(@c{i}, @b{i}, @al{i}, @ay{i}, @g{i}, @pr{i}, @s{i}, @d{i}, @p{i}, @sub{i}, @st{i}, @r{i}, 0, 0, @rem{i}, UTC_TIMESTAMP())");
                var bs = backupSlots[i];
                p.Add($"c{i}", 1);
                p.Add($"b{i}", bs.BoardId);
                p.Add($"al{i}", bs.AcademicLevelId);
                p.Add($"ay{i}", bs.AcademicYearId);
                p.Add($"g{i}", bs.GroupId);
                p.Add($"pr{i}", bs.ProgramId);
                p.Add($"s{i}", bs.SectionId);
                p.Add($"d{i}", bs.DayOfWeek);
                p.Add($"p{i}", bs.PeriodId);
                p.Add($"sub{i}", bs.SubjectId);
                p.Add($"st{i}", bs.StaffId);
                p.Add($"r{i}", bs.RoomId);
                p.Add($"rem{i}", bs.Remarks ?? "Restored from backup");
            }
            sb.AppendLine(";");

            // Delete used backup
            sb.AppendLine("DELETE FROM `TimetableBackupSlots` WHERE `TimetableBackupId` = @previousBackupId;");
            sb.AppendLine("DELETE FROM `TimetableBackups` WHERE `Id` = @previousBackupId;");
            p.Add("previousBackupId", previousBackupId);

            await conn.ExecuteAsync(sb.ToString(), p);
            return backupSlots.Count;
        }

        public async Task DeleteBackupAsync(int sectionId, int academicYearId)
        {
            var conn = await GetOpenConnectionAsync();
            var oldBackupIds = (await conn.QueryAsync<int>("SELECT `Id` FROM `TimetableBackups` WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId;", new { sectionId, academicYearId })).ToList();
            if (oldBackupIds.Any())
            {
                await conn.ExecuteAsync("DELETE FROM `TimetableBackupSlots` WHERE `TimetableBackupId` IN @oldBackupIds;", new { oldBackupIds });
                await conn.ExecuteAsync("DELETE FROM `TimetableBackups` WHERE `Id` IN @oldBackupIds;", new { oldBackupIds });
            }
        }
    }
}
