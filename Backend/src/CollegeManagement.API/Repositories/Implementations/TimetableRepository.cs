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
    public class TimetableRepository : ITimetableRepository
    {
        private readonly AppDbContext _context;

        public TimetableRepository(AppDbContext context)
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

        private const string BaseSelectSql = @"
            SELECT 
                t.`Id`,
                t.`Id` AS TimetableId,
                t.`CampusId`,
                c.`CampusName`,
                t.`BoardId`,
                b.`BoardName`,
                t.`AcademicLevelId`,
                al.`LevelName` AS AcademicLevelName,
                al.`LevelName`,
                t.`AcademicYearId`,
                ay.`AcademicYearName`,
                t.`GroupId`,
                g.`GroupName`,
                t.`ProgramId`,
                p.`ProgramName`,
                t.`SectionId`,
                s.`SectionName`,
                t.`DayOfWeek`,
                CASE t.`DayOfWeek`
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                    WHEN 7 THEN 'Sunday'
                    ELSE ''
                END AS DayName,
                t.`PeriodId`,
                prd.`PeriodName`,
                COALESCE(prd.`DisplayOrder`, t.`PeriodId`) AS PeriodNumber,
                prd.`StartTime`,
                prd.`EndTime`,
                COALESCE(prd.`IsBreak`, 0) AS IsBreak,
                t.`SubjectId`,
                sub.`SubjectName`,
                sub.`SubjectCode`,
                t.`StaffId`,
                t.`StaffId` AS FacultyId,
                st.`EmployeeId` AS StaffEmployeeId,
                st.`EmployeeId` AS FacultyEmployeeId,
                CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, '')) AS StaffName,
                CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, '')) AS FacultyName,
                t.`RoomId`,
                rm.`RoomCode`,
                rm.`RoomName`,
                t.`IsPublished`,
                t.`ApprovalStatus`,
                CASE t.`ApprovalStatus`
                    WHEN 0 THEN 'Draft'
                    WHEN 1 THEN 'Published'
                    WHEN 2 THEN 'Archived'
                    WHEN 3 THEN 'Approved'
                    ELSE 'Draft'
                END AS ApprovalStatusName,
                t.`Remarks`,
                t.`CreatedAt`,
                t.`UpdatedAt`
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
        ";

        public async Task<TimetableResponseDto?> GetByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            string sql = BaseSelectSql + " WHERE t.`Id` = @id LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<TimetableResponseDto>(sql, new { id });
        }

        public async Task<(IEnumerable<TimetableResponseDto> Items, int TotalCount)> GetPagedAsync(TimetableQueryParams queryParams)
        {
            var conn = await GetOpenConnectionAsync();
            var whereSb = new StringBuilder(" WHERE 1=1");
            if (queryParams.BoardId.HasValue && queryParams.BoardId.Value > 0) whereSb.Append(" AND t.`BoardId` = @BoardId");
            if (queryParams.AcademicLevelId.HasValue && queryParams.AcademicLevelId.Value > 0) whereSb.Append(" AND t.`AcademicLevelId` = @AcademicLevelId");
            if (queryParams.AcademicYearId.HasValue && queryParams.AcademicYearId.Value > 0) whereSb.Append(" AND t.`AcademicYearId` = @AcademicYearId");
            if (queryParams.GroupId.HasValue && queryParams.GroupId.Value > 0) whereSb.Append(" AND t.`GroupId` = @GroupId");
            if (queryParams.ProgramId.HasValue && queryParams.ProgramId.Value > 0) whereSb.Append(" AND t.`ProgramId` = @ProgramId");
            if (queryParams.SectionId.HasValue && queryParams.SectionId.Value > 0) whereSb.Append(" AND t.`SectionId` = @SectionId");
            if (queryParams.DayOfWeek.HasValue && queryParams.DayOfWeek.Value > 0) whereSb.Append(" AND t.`DayOfWeek` = @DayOfWeek");
            if (queryParams.StaffId.HasValue && queryParams.StaffId.Value > 0) whereSb.Append(" AND t.`StaffId` = @StaffId");
            if (queryParams.RoomId.HasValue && queryParams.RoomId.Value > 0) whereSb.Append(" AND t.`RoomId` = @RoomId");
            if (queryParams.IsPublished.HasValue) whereSb.Append(" AND t.`IsPublished` = @IsPublished");
            if (queryParams.ApprovalStatus.HasValue) whereSb.Append(" AND t.`ApprovalStatus` = @ApprovalStatus");
            if (queryParams.CampusId.HasValue && queryParams.CampusId.Value > 0) whereSb.Append(" AND (t.`CampusId` = @CampusId OR s.`CampusId` = @CampusId)");

            int offset = (queryParams.PageNumber - 1) * queryParams.PageSize;
            string countSql = "SELECT COUNT(*) FROM `Timetables` t " + (queryParams.CampusId.HasValue ? "LEFT JOIN `Sections` s ON s.`SectionId` = t.`SectionId`" : "") + whereSb.ToString() + ";";
            string querySql = BaseSelectSql + whereSb.ToString() + " ORDER BY t.`DayOfWeek`, t.`PeriodId` LIMIT @PageSize OFFSET @Offset;";

            string multiSql = countSql + querySql;
            using var multi = await conn.QueryMultipleAsync(multiSql, new
            {
                queryParams.BoardId,
                queryParams.AcademicLevelId,
                queryParams.AcademicYearId,
                queryParams.GroupId,
                queryParams.ProgramId,
                queryParams.SectionId,
                queryParams.DayOfWeek,
                queryParams.StaffId,
                queryParams.RoomId,
                IsPublished = queryParams.IsPublished.HasValue ? (queryParams.IsPublished.Value ? 1 : 0) : (int?)null,
                ApprovalStatus = queryParams.ApprovalStatus.HasValue ? (int)queryParams.ApprovalStatus.Value : (int?)null,
                queryParams.CampusId,
                queryParams.PageSize,
                Offset = offset
            });

            int totalCount = await multi.ReadFirstAsync<int>();
            var items = (await multi.ReadAsync<TimetableResponseDto>())
                .OrderBy(s => s.DayOfWeek)
                .ThenBy(s => s.PeriodNumber)
                .ThenBy(s => s.StartTime)
                .ToList();
            return (items, totalCount);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetByFacultyIdAsync(int facultyId, int? academicYearId = null, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var sb = new StringBuilder(BaseSelectSql);
            sb.Append(" WHERE t.`StaffId` = @facultyId");
            if (academicYearId.HasValue && academicYearId.Value > 0)
                sb.Append(" AND t.`AcademicYearId` = @academicYearId");
            if (campusId.HasValue && campusId.Value > 0)
                sb.Append(" AND (t.`CampusId` = @campusId OR st.`CampusId` = @campusId)");
            sb.Append(" ORDER BY t.`DayOfWeek`, t.`PeriodId`;");
            
            var items = await conn.QueryAsync<TimetableResponseDto>(sb.ToString(), new { facultyId, academicYearId, campusId });
            return items.OrderBy(s => s.DayOfWeek)
                        .ThenBy(s => s.PeriodNumber)
                        .ThenBy(s => s.StartTime)
                        .ToList();
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetBySectionIdAsync(int sectionId, int? academicYearId = null, bool? isPublished = null, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var sb = new StringBuilder(BaseSelectSql);
            sb.Append(" WHERE t.`SectionId` = @sectionId");
            if (academicYearId.HasValue && academicYearId.Value > 0)
                sb.Append(" AND t.`AcademicYearId` = @academicYearId");
            if (isPublished.HasValue)
                sb.Append(" AND t.`IsPublished` = @isPublished");
            if (campusId.HasValue && campusId.Value > 0)
                sb.Append(" AND (t.`CampusId` = @campusId OR s.`CampusId` = @campusId)");
            sb.Append(" ORDER BY t.`DayOfWeek`, t.`PeriodId`;");

            var items = await conn.QueryAsync<TimetableResponseDto>(sb.ToString(), new
            {
                sectionId,
                academicYearId,
                isPublished = isPublished.HasValue ? (isPublished.Value ? 1 : 0) : (int?)null,
                campusId
            });

            return items.OrderBy(s => s.DayOfWeek)
                        .ThenBy(s => s.PeriodNumber)
                        .ThenBy(s => s.StartTime)
                        .ToList();
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetBySectionIdsBatchAsync(IEnumerable<int> sectionIds, int? academicYearId = null, bool? isPublished = null, int? campusId = null)
        {
            var secIdList = sectionIds?.Distinct().ToList() ?? new List<int>();
            if (!secIdList.Any()) return Enumerable.Empty<TimetableResponseDto>();

            var conn = await GetOpenConnectionAsync();
            var sb = new StringBuilder(BaseSelectSql);
            sb.Append(" WHERE t.`SectionId` IN @secIdList");
            if (academicYearId.HasValue && academicYearId.Value > 0)
                sb.Append(" AND t.`AcademicYearId` = @academicYearId");
            if (isPublished.HasValue)
                sb.Append(" AND t.`IsPublished` = @isPublished");
            if (campusId.HasValue && campusId.Value > 0)
                sb.Append(" AND (t.`CampusId` = @campusId OR s.`CampusId` = @campusId)");
            sb.Append(" ORDER BY t.`SectionId`, t.`DayOfWeek`, t.`PeriodId`;");

            var items = await conn.QueryAsync<TimetableResponseDto>(sb.ToString(), new
            {
                secIdList,
                academicYearId,
                isPublished = isPublished.HasValue ? (isPublished.Value ? 1 : 0) : (int?)null,
                campusId
            });

            return items.OrderBy(s => s.SectionId)
                        .ThenBy(s => s.DayOfWeek)
                        .ThenBy(s => s.PeriodNumber)
                        .ThenBy(s => s.StartTime)
                        .ToList();
        }

        public async Task<string?> CheckSlotConflictAsync(int academicYearId, int sectionId, int staffId, int roomId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            string sql = @"
                SELECT 
                    CASE 
                        WHEN `SectionId` = @sectionId THEN 'SECTION'
                        WHEN `StaffId` = @staffId THEN 'STAFF'
                        WHEN `RoomId` > 0 AND `RoomId` = @roomId THEN 'ROOM'
                    END AS ConflictType
                FROM `Timetables`
                WHERE `AcademicYearId` = @academicYearId 
                  AND `DayOfWeek` = @dayOfWeek 
                  AND `PeriodId` = @periodId 
                  AND (@excludeId IS NULL OR `Id` != @excludeId)
                  AND (`SectionId` = @sectionId OR `StaffId` = @staffId OR (@roomId > 0 AND `RoomId` = @roomId))
                LIMIT 1;
            ";
            return await conn.QueryFirstOrDefaultAsync<string?>(sql, new { academicYearId, sectionId, staffId, roomId, dayOfWeek, periodId, excludeId });
        }

        public async Task<int> AddAsync(CreateTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            string sql = @"
                INSERT INTO `Timetables` (`CampusId`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`, `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `RoomId`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`)
                VALUES (@CampusId, @BoardId, @AcademicLevelId, @AcademicYearId, @GroupId, @ProgramId, @SectionId, @DayOfWeek, @PeriodId, @SubjectId, @StaffId, @RoomId, @IsPublished, @ApprovalStatus, @Remarks, UTC_TIMESTAMP());
                SELECT LAST_INSERT_ID();
            ";
            return await conn.ExecuteScalarAsync<int>(sql, new
            {
                dto.CampusId,
                dto.BoardId,
                dto.AcademicLevelId,
                dto.AcademicYearId,
                dto.GroupId,
                dto.ProgramId,
                dto.SectionId,
                dto.DayOfWeek,
                dto.PeriodId,
                dto.SubjectId,
                dto.StaffId,
                dto.RoomId,
                IsPublished = dto.IsPublished ? 1 : 0,
                ApprovalStatus = dto.IsPublished ? (int)TimetableApprovalStatus.Published : (int)TimetableApprovalStatus.Draft,
                dto.Remarks
            });
        }

        public async Task UpdateAsync(int id, UpdateTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            string sql = @"
                UPDATE `Timetables` SET 
                    `CampusId` = @CampusId,
                    `BoardId` = @BoardId,
                    `AcademicLevelId` = @AcademicLevelId,
                    `AcademicYearId` = @AcademicYearId,
                    `GroupId` = @GroupId,
                    `ProgramId` = @ProgramId,
                    `SectionId` = @SectionId,
                    `DayOfWeek` = @DayOfWeek,
                    `PeriodId` = @PeriodId,
                    `SubjectId` = @SubjectId,
                    `StaffId` = @StaffId,
                    `RoomId` = @RoomId,
                    `IsPublished` = @IsPublished,
                    `Remarks` = @Remarks,
                    `UpdatedAt` = UTC_TIMESTAMP()
                WHERE `Id` = @Id;
            ";
            await conn.ExecuteAsync(sql, new
            {
                Id = id,
                dto.CampusId,
                dto.BoardId,
                dto.AcademicLevelId,
                dto.AcademicYearId,
                dto.GroupId,
                dto.ProgramId,
                dto.SectionId,
                dto.DayOfWeek,
                dto.PeriodId,
                dto.SubjectId,
                dto.StaffId,
                dto.RoomId,
                IsPublished = dto.IsPublished ? 1 : 0,
                dto.Remarks
            });
        }

        public async Task DeleteAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync("DELETE FROM `Timetables` WHERE `Id` = @id;", new { id });
        }

        public async Task TogglePublishSlotAsync(int id, bool isPublished)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(@"
                UPDATE `Timetables` 
                SET `IsPublished` = @IsPublished, 
                    `ApprovalStatus` = @ApprovalStatus, 
                    `UpdatedAt` = UTC_TIMESTAMP() 
                WHERE `Id` = @Id;
            ", new
            {
                Id = id,
                IsPublished = isPublished ? 1 : 0,
                ApprovalStatus = isPublished ? (int)TimetableApprovalStatus.Published : (int)TimetableApprovalStatus.Draft
            });
        }

        public async Task PublishSectionTimetableAsync(int sectionId, int academicYearId, bool isPublished)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(@"
                UPDATE `Timetables` 
                SET `IsPublished` = @IsPublished, 
                    `ApprovalStatus` = @ApprovalStatus, 
                    `UpdatedAt` = UTC_TIMESTAMP() 
                WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId;
            ", new
            {
                sectionId,
                academicYearId,
                IsPublished = isPublished ? 1 : 0,
                ApprovalStatus = isPublished ? (int)TimetableApprovalStatus.Published : (int)TimetableApprovalStatus.Draft
            });
        }

        public async Task<bool> HasSectionSlotConflictAsync(int academicYearId, int sectionId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.ExecuteScalarAsync<bool>(@"
                SELECT EXISTS(
                    SELECT 1 FROM `Timetables` 
                    WHERE `AcademicYearId` = @academicYearId 
                      AND `SectionId` = @sectionId 
                      AND `DayOfWeek` = @dayOfWeek 
                      AND `PeriodId` = @periodId 
                      AND (@excludeId IS NULL OR `Id` != @excludeId)
                    LIMIT 1
                );
            ", new { academicYearId, sectionId, dayOfWeek, periodId, excludeId });
        }

        public async Task<bool> HasFacultySlotConflictAsync(int academicYearId, int facultyId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.ExecuteScalarAsync<bool>(@"
                SELECT EXISTS(
                    SELECT 1 FROM `Timetables` 
                    WHERE `AcademicYearId` = @academicYearId 
                      AND `StaffId` = @facultyId 
                      AND `DayOfWeek` = @dayOfWeek 
                      AND `PeriodId` = @periodId 
                      AND (@excludeId IS NULL OR `Id` != @excludeId)
                    LIMIT 1
                );
            ", new { academicYearId, facultyId, dayOfWeek, periodId, excludeId });
        }

        public async Task<bool> HasRoomSlotConflictAsync(int academicYearId, int roomId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.ExecuteScalarAsync<bool>(@"
                SELECT EXISTS(
                    SELECT 1 FROM `Timetables` 
                    WHERE `AcademicYearId` = @academicYearId 
                      AND `RoomId` = @roomId 
                      AND `DayOfWeek` = @dayOfWeek 
                      AND `PeriodId` = @periodId 
                      AND (@excludeId IS NULL OR `Id` != @excludeId)
                    LIMIT 1
                );
            ", new { academicYearId, roomId, dayOfWeek, periodId, excludeId });
        }

        public async Task<IEnumerable<AllocatedFacultyDto>> GetAllocatedFacultiesAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? sectionId, int? subjectId, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            string sql = @"
                SELECT 
                    st.`Id` AS StaffId,
                    st.`EmployeeId` AS StaffEmployeeId,
                    CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, '')) AS StaffName,
                    COALESCE(st.`Email`, '') AS Email,
                    COALESCE(st.`Mobile`, '') AS Mobile,
                    COALESCE(st.`Designation`, '') AS Designation
                FROM `StaffSubjectAllocations` ssa
                STRAIGHT_JOIN `Staff` st ON st.`Id` = ssa.`StaffId`
                WHERE st.`IsDeleted` = 0 
                  AND st.`Status` = 'Active'
                  AND (@subjectId IS NULL OR @subjectId <= 0 OR ssa.`SubjectId` = @subjectId)
                  AND (@campusId IS NULL OR @campusId <= 0 OR st.`CampusId` = @campusId)
                GROUP BY st.`Id`;
            ";
            return await conn.QueryAsync<AllocatedFacultyDto>(sql, new { subjectId, campusId });
        }

        public async Task CopySectionTimetableAsync(CopyTimetableDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            string sql = @"
                DELETE FROM `Timetables` WHERE `SectionId` = @TargetSectionId AND `AcademicYearId` = @TargetAcademicYearId;
                INSERT INTO `Timetables` (`CampusId`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`, `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `RoomId`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`)
                SELECT 
                    COALESCE(sec.`CampusId`, t.`CampusId`),
                    t.`BoardId`,
                    t.`AcademicLevelId`,
                    @TargetAcademicYearId,
                    t.`GroupId`,
                    t.`ProgramId`,
                    @TargetSectionId,
                    t.`DayOfWeek`,
                    t.`PeriodId`,
                    t.`SubjectId`,
                    t.`StaffId`,
                    t.`RoomId`,
                    0,
                    0,
                    CONCAT('Copied from Section ', @SourceSectionId),
                    UTC_TIMESTAMP()
                FROM `Timetables` t
                LEFT JOIN `Sections` sec ON sec.`SectionId` = @TargetSectionId
                WHERE t.`SectionId` = @SourceSectionId AND t.`AcademicYearId` = @SourceAcademicYearId;
            ";
            await conn.ExecuteAsync(sql, dto);
        }
    }
}
