using System.Data;
using Dapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Promotion;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class PromotionRepository : IPromotionRepository
    {
        private readonly AppDbContext _context;

        public PromotionRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        private async Task OpenAsync()
        {
            if (Connection.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)Connection).OpenAsync();
            }
        }

        // ============================================================
        // 1. GET ELIGIBLE STUDENTS
        // ============================================================
        public async Task<IEnumerable<EligibleStudentDto>> GetEligibleStudentsAsync(
            PromotionEligibilityQuery q)
        {
            await OpenAsync();

            /*
             * Normal progression:
             *
             * Example:
             * Class 10 -> Intermediate 1st Year
             *
             * We intentionally do not use:
             * - StudentDisciplinaryClearances
             * - StudentFees
             * - Results
             *
             * This prevents 500 errors when optional tables do not exist.
             */

            const string sql = @"
SELECT
    s.StudentId,

    COALESCE(
        NULLIF(s.AdmissionNo, ''),
        NULLIF(s.RollNo, ''),
        CAST(s.StudentId AS CHAR)
    ) AS StudentCode,

    s.StudentName,

    s.AcademicYearId,
    ay.AcademicYearName AS AcademicYear,

    s.BoardId,
    COALESCE(b.BoardName, '') AS BoardName,

    COALESCE(al.LevelName, '') AS AcademicLevel,

    s.GroupId,
    g.GroupName,

    s.ProgramId,
    p.ProgramName,

    COALESCE(sec.SectionName, '') AS Section,
    s.Medium,

    @TargetAcademicYearId AS TargetAcademicYearId,
    tay.AcademicYearName AS TargetAcademicYear,

    @TargetAcademicLevel AS TargetAcademicLevel,

    @TargetGroupId AS TargetGroupId,
    tg.GroupName AS TargetGroupName,

    @TargetProgramId AS TargetProgramId,
    tp.ProgramName AS TargetProgramName,

    @TargetSection AS TargetSection,
    @TargetMedium AS TargetMedium,

    COALESCE(s.AttendancePercentage, 0) AS AttendancePercentage,

    'Not Checked' AS ResultStatus,
    '' AS FailedSubjects,
    0 AS Backlogs,

    'Eligible' AS EligibilityStatus,

    'Eligible for normal progression.' AS EligibilityReason

FROM Students s

LEFT JOIN AcademicYears ay
    ON ay.AcademicYearId = s.AcademicYearId

LEFT JOIN Boards b
    ON b.BoardId = s.BoardId

LEFT JOIN AcademicLevels al
    ON al.AcademicLevelId = s.AcademicLevelId

LEFT JOIN Sections sec
    ON sec.SectionId = s.SectionId

LEFT JOIN `Groups` g
    ON g.GroupId = s.GroupId

LEFT JOIN Programs p
    ON p.ProgramId = s.ProgramId

LEFT JOIN AcademicYears tay
    ON tay.AcademicYearId = @TargetAcademicYearId

LEFT JOIN `Groups` tg
    ON tg.GroupId = @TargetGroupId

LEFT JOIN Programs tp
    ON tp.ProgramId = @TargetProgramId

WHERE s.IsActive = 1

AND (
    @AcademicYearId IS NULL
    OR s.AcademicYearId = @AcademicYearId
)

AND (
    @BoardId IS NULL
    OR s.BoardId = @BoardId
)

AND (
    @AcademicLevel IS NULL
    OR TRIM(@AcademicLevel) = ''
    OR al.LevelName = TRIM(@AcademicLevel)
    OR (TRIM(@AcademicLevel) IN ('1st PUC', 'Intermediate 1st Year') AND s.AcademicLevelId IN (1, 5))
    OR (TRIM(@AcademicLevel) IN ('2nd PUC', 'Intermediate 2nd Year') AND s.AcademicLevelId IN (2, 6))
)

AND (
    @GroupId IS NULL
    OR @GroupId = 0
    OR s.GroupId = @GroupId
    OR (@GroupId IN (34, 37) AND s.GroupId IN (34, 37))
)

AND (
    @ProgramId IS NULL
    OR @ProgramId = 0
    OR s.ProgramId = @ProgramId
)

AND (
    @Section IS NULL
    OR TRIM(@Section) = ''
    OR sec.SectionName = TRIM(@Section)
)

AND (
    @Medium IS NULL
    OR TRIM(@Medium) = ''
    OR s.Medium = TRIM(@Medium)
)

AND (
    @Search IS NULL
    OR TRIM(@Search) = ''
    OR s.StudentName LIKE CONCAT('%', @Search, '%')
    OR s.AdmissionNo LIKE CONCAT('%', @Search, '%')
    OR s.RollNo LIKE CONCAT('%', @Search, '%')
    OR CAST(s.StudentId AS CHAR) LIKE CONCAT('%', @Search, '%')
)

AND (
    @EligibilityStatus IS NULL
    OR TRIM(@EligibilityStatus) = ''
    OR 'Eligible' = TRIM(@EligibilityStatus)
)

AND NOT EXISTS
(
    SELECT 1
    FROM PromotionHistories ph

    WHERE ph.StudentId = s.StudentId

    AND ph.IsRolledBack = 0

    AND (
        @TargetAcademicYearId IS NULL
        OR ph.ToAcademicYearId = @TargetAcademicYearId
    )
)

ORDER BY s.StudentName;
";

            return await Connection.QueryAsync<EligibleStudentDto>(
                sql,
                new
                {
                    q.AcademicYearId,
                    q.BoardId,
                    q.AcademicLevel,
                    q.GroupId,
                    q.ProgramId,
                    q.Section,
                    q.Medium,
                    q.TargetAcademicYearId,
                    q.TargetAcademicLevel,
                    q.TargetGroupId,
                    q.TargetSection,
                    q.TargetMedium,
                    q.Search,
                    q.EligibilityStatus
                });
        }

        // ============================================================
        // 2. PREVIEW
        // ============================================================
        public async Task<PromotionPreviewResponse> PreviewAsync(
            PromotionPreviewRequest request)
        {
            var students = await GetEligibleStudentsAsync(
                new PromotionEligibilityQuery
                {
                    AcademicYearId = request.SourceAcademicYearId,
                    BoardId = request.SourceBoardId,
                    AcademicLevel = request.SourceAcademicLevel,
                    GroupId = request.SourceGroupId,
                    Section = request.SourceSection,
                    Medium = request.SourceMedium,

                    TargetAcademicYearId = request.TargetAcademicYearId,
                    TargetBoardId = request.TargetBoardId,
                    TargetAcademicLevel = request.TargetAcademicLevel,
                    TargetGroupId = request.TargetGroupId,
                    TargetSection = request.TargetSection,
                    TargetMedium = request.TargetMedium
                });

            var byId = students.ToDictionary(x => x.StudentId);

            var response = new PromotionPreviewResponse
            {
                TotalSelected = request.StudentIds.Distinct().Count()
            };

            foreach (var studentId in request.StudentIds.Distinct())
            {
                if (byId.TryGetValue(studentId, out var student))
                {
                    response.Students.Add(
                        new PromotionPreviewStudentDto
                        {
                            StudentId = studentId,
                            StudentName = student.StudentName,
                            EligibilityStatus = student.EligibilityStatus,
                            EligibilityReason = student.EligibilityReason
                        });
                }
                else
                {
                    response.Students.Add(
                        new PromotionPreviewStudentDto
                        {
                            StudentId = studentId,
                            StudentName = string.Empty,
                            EligibilityStatus = "Not Eligible",
                            EligibilityReason =
                                "Student is not available in the selected source cohort or already has an active promotion."
                        });
                }
            }

            response.EligibleCount =
                response.Students.Count(x =>
                    x.EligibilityStatus.Equals(
                        "Eligible",
                        StringComparison.OrdinalIgnoreCase));

            response.NotEligibleCount =
                response.Students.Count - response.EligibleCount;

            return response;
        }

        // ============================================================
        // 3. EXECUTE PROMOTION
        // ============================================================
        public async Task<PromotionExecutionResponse> PromoteStudentsAsync(
            PromoteStudentsRequest request,
            string performedBy = "System")
        {
            await OpenAsync();

            var preview = await PreviewAsync(
                new PromotionPreviewRequest
                {
                    SourceAcademicYearId = request.SourceAcademicYearId,
                    SourceBoardId = request.SourceBoardId,
                    SourceAcademicLevel = request.SourceAcademicLevel,
                    SourceGroupId = request.SourceGroupId,
                    SourceSection = request.SourceSection,
                    SourceMedium = request.SourceMedium,

                    TargetAcademicYearId = request.TargetAcademicYearId,
                    TargetBoardId = request.TargetBoardId,
                    TargetAcademicLevel = request.TargetAcademicLevel,
                    TargetGroupId = request.TargetGroupId,
                    TargetSection = request.TargetSection,
                    TargetMedium = request.TargetMedium,

                    StudentIds = request.StudentIds
                });

            var response = new PromotionExecutionResponse
            {
                PromotionBatchId = Guid.NewGuid().ToString("N"),
                TotalRequested = request.StudentIds.Distinct().Count()
            };

            foreach (var item in preview.Students)
            {
                response.Students.Add(
                    new PromotionExecutionStudentDto
                    {
                        StudentId = item.StudentId,
                        StudentName = item.StudentName,

                        PromotionStatus =
                            item.EligibilityStatus.Equals(
                                "Eligible",
                                StringComparison.OrdinalIgnoreCase)
                                ? "Promoted"
                                : "Failed",

                        Message = item.EligibilityReason
                    });
            }

            var eligibleIds = preview.Students
                .Where(x =>
                    x.EligibilityStatus.Equals(
                        "Eligible",
                        StringComparison.OrdinalIgnoreCase))
                .Select(x => x.StudentId)
                .Distinct()
                .ToList();

            if (eligibleIds.Count == 0)
            {
                response.FailedCount =
                    response.TotalRequested;

                return response;
            }

            using var transaction = Connection.BeginTransaction();

            try
            {
                int? targetAcademicLevelId = request.TargetAcademicLevelId;
                if (!targetAcademicLevelId.HasValue || targetAcademicLevelId <= 0)
                {
                    if (!string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                    {
                        targetAcademicLevelId = await Connection.ExecuteScalarAsync<int?>(
                            "SELECT AcademicLevelId FROM AcademicLevels WHERE LOWER(TRIM(LevelName)) = LOWER(TRIM(@Level)) LIMIT 1;",
                            new { Level = request.TargetAcademicLevel }, transaction);
                    }
                }

                int? targetSectionId = request.TargetSectionId;
                if (!targetSectionId.HasValue || targetSectionId <= 0)
                {
                    if (!string.IsNullOrWhiteSpace(request.TargetSection))
                    {
                        targetSectionId = await Connection.ExecuteScalarAsync<int?>(
                            "SELECT SectionId FROM Sections WHERE LOWER(TRIM(SectionName)) = LOWER(TRIM(@Sec)) LIMIT 1;",
                            new { Sec = request.TargetSection }, transaction);
                    }
                }

                foreach (var studentId in eligibleIds)
                {
                    var student =
                        await Connection.QuerySingleOrDefaultAsync<dynamic>(
                            @"
SELECT
    s.StudentId,
    s.StudentName,
    s.AcademicYearId,
    s.BoardId,
    s.AcademicLevelId,
    COALESCE(al.LevelName, '') AS AcademicLevel,
    s.GroupId,
    s.SectionId,
    COALESCE(sec.SectionName, '') AS Section,
    s.Medium
FROM Students s
LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
WHERE s.StudentId = @StudentId
AND s.IsActive = 1
FOR UPDATE;
",
                            new
                            {
                                StudentId = studentId
                            },
                            transaction);

                    if (student == null)
                    {
                        continue;
                    }

                    await Connection.ExecuteAsync(
                        @"
INSERT INTO PromotionHistories
(
    StudentId,
    PromotionBatchId,
    FromBoardId,
    ToBoardId,
    FromAcademicYearId,
    ToAcademicYearId,

    FromClassId,
    ToClassId,

    FromSectionId,
    ToSectionId,

    FromGroupId,
    ToGroupId,

    PromotionDate,
    PromotedBy,
    Remarks,

    IsRollback,
    RollbackDate,
    RollbackBy,
    RollbackRemarks,

    IsRolledBack,

    FromAcademicLevel,
    ToAcademicLevel,

    FromSection,
    ToSection,

    Status
)
VALUES
(
    @StudentId,
    @PromotionBatchId,
    @FromBoardId,
    @ToBoardId,
    @FromAcademicYearId,
    @ToAcademicYearId,

    COALESCE(@FromClassId, 0),
    COALESCE((SELECT AcademicLevelId FROM AcademicLevels WHERE LevelName = @ToAcademicLevel OR LevelCode = @ToAcademicLevel LIMIT 1), 0),

    @FromSectionId,
    (SELECT SectionId FROM Sections WHERE SectionName = @ToSection LIMIT 1),

    @FromGroupId,
    @ToGroupId,

    UTC_TIMESTAMP(),
    @PromotedBy,
    @Remarks,

    0,
    NULL,
    NULL,
    NULL,

    0,

    @FromAcademicLevel,
    @ToAcademicLevel,

    @FromSection,
    @ToSection,

    'Promoted'
);
",
                        new
                        {
                            StudentId = studentId,
                            PromotionBatchId = response.PromotionBatchId,
                            FromBoardId = student.BoardId != null ? (int?)student.BoardId : null,
                            ToBoardId = request.TargetBoardId,

                            FromAcademicYearId = (int)student.AcademicYearId,

                            ToAcademicYearId = request.TargetAcademicYearId,

                            FromClassId = student.AcademicLevelId != null ? (int?)student.AcademicLevelId : null,

                            FromSectionId = student.SectionId != null ? (int?)student.SectionId : null,

                            FromGroupId = (int)student.GroupId,

                            ToGroupId = request.TargetGroupId,

                            FromAcademicLevel = (string)student.AcademicLevel,

                            ToAcademicLevel = request.TargetAcademicLevel,

                            FromSection = (string)student.Section,

                            ToSection = request.TargetSection,

                            PromotedBy = string.IsNullOrWhiteSpace(performedBy) ? "System" : performedBy,

                            Remarks = ""
                        },
                        transaction);

                    /* Target queries moved outside loop */

                    /*
                     * Update actual student record.
                     */
                    await Connection.ExecuteAsync(
                        @"
UPDATE Students
SET
    AcademicYearId = @AcademicYearId,
    BoardId = COALESCE(@BoardId, BoardId),
    AcademicLevelId = COALESCE(@TargetAcademicLevelId, AcademicLevelId),
    GroupId = @GroupId,
    SectionId = COALESCE(@TargetSectionId, SectionId),
    Medium = COALESCE(@Medium, Medium),
    UpdatedAt = UTC_TIMESTAMP()
WHERE StudentId = @StudentId;
",
                        new
                        {
                            AcademicYearId = request.TargetAcademicYearId,
                            BoardId = request.TargetBoardId,
                            TargetAcademicLevelId = targetAcademicLevelId,
                            GroupId = request.TargetGroupId,
                            TargetSectionId = targetSectionId,
                            Medium = request.TargetMedium,
                            StudentId = studentId
                        },
                        transaction);
                }

                transaction.Commit();

                response.PromotedCount =
                    eligibleIds.Count;

                response.FailedCount =
                    response.TotalRequested -
                    response.PromotedCount;

                return response;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        // ============================================================
        // 4. PROMOTION HISTORY
        // ============================================================
        public async Task<IEnumerable<PromotionHistoryDto>> GetHistoryAsync(
            PromotionHistoryQuery q)
        {
            await OpenAsync();

            /*
             * This SQL matches the ACTUAL PromotionHistories table.
             *
             * There is no FromBoardId / ToBoardId.
             * There is no FromMedium / ToMedium.
             * Primary key is Id.
             * Rollback date is RollbackDate.
             */

            const string sql = @"
SELECT

    ph.Id AS PromotionId,

    NULL AS PromotionBatchId,

    ph.StudentId,

    COALESCE(
        NULLIF(s.AdmissionNo, ''),
        NULLIF(s.RollNo, ''),
        CAST(s.StudentId AS CHAR)
    ) AS StudentCode,
    COALESCE(s.AdmissionNo, '') AS AdmissionNo,
    s.StudentName,

    fay.AcademicYearName AS SourceAcademicYear,

    s.BoardId AS SourceBoardId,
    COALESCE(fb.BoardName, '') AS SourceBoard,

    ph.FromAcademicLevel AS SourceAcademicLevel,

    ph.FromGroupId AS SourceGroupId,
    fg.GroupName AS SourceGroup,

    ph.FromSection AS SourceSection,

    s.Medium AS SourceMedium,

    tay.AcademicYearName AS TargetAcademicYear,

    s.BoardId AS TargetBoardId,
    COALESCE(tb.BoardName, '') AS TargetBoard,

    ph.ToAcademicLevel AS TargetAcademicLevel,

    ph.ToGroupId AS TargetGroupId,
    tg.GroupName AS TargetGroup,

    ph.ToSection AS TargetSection,

    s.Medium AS TargetMedium,

    ph.Status AS PromotionStatus,

    ph.PromotionDate,

    ph.PromotedBy,

    ph.IsRolledBack AS RollbackStatus,

    ph.RollbackDate AS RollbackDate,

    ph.RollbackRemarks AS RollbackReason

FROM PromotionHistories ph

INNER JOIN Students s
    ON s.StudentId = ph.StudentId

LEFT JOIN AcademicYears fay
    ON fay.AcademicYearId = ph.FromAcademicYearId

LEFT JOIN AcademicYears tay
    ON tay.AcademicYearId = ph.ToAcademicYearId

LEFT JOIN Boards fb
    ON fb.BoardId = s.BoardId

LEFT JOIN Boards tb
    ON tb.BoardId = s.BoardId

LEFT JOIN `Groups` fg
    ON fg.GroupId = ph.FromGroupId

LEFT JOIN `Groups` tg
    ON tg.GroupId = ph.ToGroupId

WHERE
    (
        @AcademicYearId IS NULL
        OR ph.FromAcademicYearId = @AcademicYearId
    )

AND
    (
        @TargetAcademicYearId IS NULL
        OR ph.ToAcademicYearId = @TargetAcademicYearId
    )

AND
    (
        @AcademicLevel IS NULL
        OR TRIM(@AcademicLevel) = ''
        OR ph.FromAcademicLevel = TRIM(@AcademicLevel)
    )

AND
    (
        @TargetAcademicLevel IS NULL
        OR TRIM(@TargetAcademicLevel) = ''
        OR ph.ToAcademicLevel = TRIM(@TargetAcademicLevel)
    )

AND
    (
        @GroupId IS NULL
        OR ph.FromGroupId = @GroupId
    )

AND
    (
        @Section IS NULL
        OR TRIM(@Section) = ''
        OR ph.FromSection = TRIM(@Section)
    )

AND
    (
        @StudentId IS NULL
        OR ph.StudentId = @StudentId
    )

AND
    (
        @Search IS NULL
        OR TRIM(@Search) = ''
        OR s.StudentName LIKE CONCAT('%', @Search, '%')
        OR s.AdmissionNo LIKE CONCAT('%', @Search, '%')
        OR s.RollNo LIKE CONCAT('%', @Search, '%')
    )

AND
    (
        @PromotionStatus IS NULL
        OR TRIM(@PromotionStatus) = ''
        OR ph.Status = TRIM(@PromotionStatus)
        OR (
            TRIM(@PromotionStatus) = 'RolledBack'
            AND ph.IsRolledBack = 1
        )
    )

AND
    (
        @FromDate IS NULL
        OR ph.PromotionDate >= @FromDate
    )

AND
    (
        @ToDate IS NULL
        OR ph.PromotionDate < DATE_ADD(@ToDate, INTERVAL 1 DAY)
    )

ORDER BY ph.Id DESC;
";

            return await Connection.QueryAsync<PromotionHistoryDto>(
                sql,
                q);
        }

        // ============================================================
        // 5. ROLLBACK
        // ============================================================
        public async Task<RollbackResponse> RollbackAsync(
            RollbackPromotionRequest request,
            string performedBy = "System")
        {
            await OpenAsync();

            using var transaction =
                Connection.BeginTransaction();

            try
            {
                var row =
                    await Connection.QuerySingleOrDefaultAsync<dynamic>(
                        @"
SELECT
    ph.Id,
    ph.StudentId,
    s.StudentName,
    ph.IsRolledBack
FROM PromotionHistories ph
INNER JOIN Students s
    ON s.StudentId = ph.StudentId
WHERE ph.Id = @PromotionId
FOR UPDATE;
",
                        new
                        {
                            PromotionId =
                                request.PromotionId
                        },
                        transaction);

                if (row == null)
                {
                    throw new InvalidOperationException(
                        "Promotion was not found.");
                }

                bool alreadyRolledBack =
                    Convert.ToBoolean(row.IsRolledBack);

                if (alreadyRolledBack)
                {
                    throw new InvalidOperationException(
                        "Promotion has already been rolled back.");
                }

                /*
                 * Only latest active promotion can be rolled back.
                 */
                var newer =
                    await Connection.ExecuteScalarAsync<int>(
                        @"
SELECT COUNT(*)
FROM PromotionHistories
WHERE StudentId = @StudentId
AND Id > @PromotionId
AND IsRolledBack = 0;
",
                        new
                        {
                            StudentId =
                                (int)row.StudentId,

                            PromotionId =
                                request.PromotionId
                        },
                        transaction);

                if (newer > 0)
                {
                    throw new InvalidOperationException(
                        "Only the latest active promotion can be rolled back.");
                }

                /*
                 * Restore student to previous academic details.
                 *
                 * Actual columns:
                 * FromAcademicYearId
                 * FromAcademicLevel
                 * FromGroupId
                 * FromSection
                 */
                await Connection.ExecuteAsync(
                    @"
UPDATE Students s

INNER JOIN PromotionHistories ph
    ON ph.Id = @PromotionId

SET
    s.AcademicYearId = ph.FromAcademicYearId,
    s.AcademicLevelId = COALESCE(NULLIF(ph.FromClassId, 0), s.AcademicLevelId),
    s.GroupId = ph.FromGroupId,
    s.SectionId = COALESCE(NULLIF(ph.FromSectionId, 0), s.SectionId),
    s.UpdatedAt = UTC_TIMESTAMP()

WHERE s.StudentId = ph.StudentId;
",
                    new
                    {
                        PromotionId =
                            request.PromotionId
                    },
                    transaction);

                /*
                 * Mark promotion as rolled back.
                 */
                await Connection.ExecuteAsync(
                    @"
UPDATE PromotionHistories

SET
    IsRollback = 1,
    IsRolledBack = 1,
    Status = 'RolledBack',
    RollbackDate = UTC_TIMESTAMP(),
    RollbackBy = @RollbackBy,
    RollbackRemarks = @Reason

WHERE Id = @PromotionId;
",
                    new
                    {
                        PromotionId =
                            request.PromotionId,

                        Reason =
                            request.Reason,

                        RollbackBy =
                            string.IsNullOrWhiteSpace(performedBy) ? "System" : performedBy
                    },
                    transaction);

                transaction.Commit();

                return new RollbackResponse
                {
                    PromotionId =
                        request.PromotionId,

                    StudentId =
                        (int)row.StudentId,

                    StudentName =
                        (string)row.StudentName,

                    RollbackStatus =
                        "RolledBack",

                    RollbackReason =
                        request.Reason,

                    RolledBackAt =
                        DateTime.UtcNow,

                    RolledBackBy =
                        string.IsNullOrWhiteSpace(performedBy) ? "System" : performedBy
                };
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        // ============================================================
        // 6. PROMOTE SINGLE STUDENT
        // ============================================================
        public async Task<PromotionHistoryDto?> PromoteSingleStudentAsync(
            int studentId,
            PromoteSingleStudentRequest request,
            string performedBy = "System")
        {
            await OpenAsync();

            var student =
                await Connection.QuerySingleOrDefaultAsync<dynamic>(
                    @"
SELECT
    s.StudentId,
    s.BoardId,
    s.AcademicYearId,
    s.AcademicLevelId,
    COALESCE(al.LevelName, '') AS AcademicLevel,
    s.GroupId,
    s.SectionId,
    COALESCE(sec.SectionName, '') AS Section,
    s.Medium
FROM Students s
LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
WHERE s.StudentId = @StudentId
AND s.IsActive = 1;
",
                    new
                    {
                        StudentId = studentId
                    });

            if (student == null)
            {
                return null;
            }

                    int sourceYearId = student.AcademicYearId != null ? Convert.ToInt32(student.AcademicYearId) : 1;
                    int sourceGroupId = student.GroupId != null ? Convert.ToInt32(student.GroupId) : 1;
                    string sourceLevel = student.AcademicLevel != null ? Convert.ToString(student.AcademicLevel) : "Junior Inter";
                    string sourceSection = student.Section != null ? Convert.ToString(student.Section) : "A";

                    var preview =
                        await PreviewAsync(
                            new PromotionPreviewRequest
                            {
                                SourceAcademicYearId = sourceYearId,
                                SourceBoardId = student.BoardId != null ? Convert.ToInt32(student.BoardId) : (int?)null,
                                SourceAcademicLevel = sourceLevel,
                                SourceGroupId = sourceGroupId,
                                SourceSection = sourceSection,
                                SourceMedium = student.Medium != null ? Convert.ToString(student.Medium) : (string?)null,

                        TargetAcademicYearId =
                            request.TargetAcademicYearId,

                        TargetBoardId =
                            request.TargetBoardId,

                        TargetAcademicLevel =
                            request.TargetAcademicLevel,

                        TargetGroupId =
                            request.TargetGroupId,

                        TargetSection =
                            request.TargetSection,

                        TargetMedium =
                            request.TargetMedium,

                        StudentIds =
                            new List<int>
                            {
                                studentId
                            }
                    });

            if (preview.EligibleCount == 0)
            {
                var reason = preview.Students.FirstOrDefault()?.EligibilityReason ?? "Student is not eligible for promotion.";
                throw new CollegeManagement.API.Exceptions.ValidationException(reason);
            }

            await PromoteStudentsAsync(
                new PromoteStudentsRequest
                {
                    StudentIds =
                        new List<int>
                        {
                            studentId
                        },

                    SourceAcademicYearId = sourceYearId,
                    SourceBoardId = student.BoardId != null ? Convert.ToInt32(student.BoardId) : (int?)null,
                    SourceAcademicLevel = sourceLevel,
                    SourceGroupId = sourceGroupId,
                    SourceSection = sourceSection,
                    SourceMedium = student.Medium != null ? Convert.ToString(student.Medium) : (string?)null,

                    TargetAcademicYearId =
                        request.TargetAcademicYearId,

                    TargetBoardId =
                        request.TargetBoardId,

                    TargetAcademicLevel =
                        request.TargetAcademicLevel,

                    TargetGroupId =
                        request.TargetGroupId,

                    TargetSection =
                        request.TargetSection,

                    TargetMedium =
                        request.TargetMedium
                },
                performedBy);

            return
                (await GetHistoryAsync(
                    new PromotionHistoryQuery
                    {
                        StudentId = studentId
                    }))
                .FirstOrDefault();
        }

        // ============================================================
        // 7. GROUP ALLOCATION
        // ============================================================
        public async Task<AllocationResponse> AllocateGroupAsync(
            GroupAllocationRequest request)
        {
            await OpenAsync();

            var response =
                new AllocationResponse();

            int? targetLevelId = request.TargetAcademicLevelId;
            if (!targetLevelId.HasValue || targetLevelId <= 0)
            {
                if (!string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                {
                    targetLevelId = await Connection.ExecuteScalarAsync<int?>(
                        "SELECT AcademicLevelId FROM AcademicLevels WHERE LOWER(TRIM(LevelName)) = LOWER(TRIM(@Level)) LIMIT 1;",
                        new { Level = request.TargetAcademicLevel });
                }
            }

            var ids = request.StudentIds.Distinct().ToList();
            if (ids.Count > 0)
            {
                try
                {
                    var affected = await Connection.ExecuteAsync(
                        @"
UPDATE Students
SET
    AcademicYearId = @AcademicYearId,
    AcademicLevelId = COALESCE(@TargetAcademicLevelId, AcademicLevelId),
    GroupId = @GroupId,
    UpdatedAt = UTC_TIMESTAMP()
WHERE StudentId IN @Ids
AND IsActive = 1;
",
                        new
                        {
                            AcademicYearId = request.TargetAcademicYearId,
                            TargetAcademicLevelId = targetLevelId,
                            GroupId = request.TargetGroupId,
                            Ids = ids
                        });

                    response.UpdatedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Updated",
                            Message = "Group allocated successfully."
                        });
                    }
                }
                catch (Exception ex)
                {
                    response.FailedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Failed",
                            Message = ex.Message
                        });
                    }
                }
            }

            return response;
        }

        // ============================================================
        // 7b. PROGRAM ALLOCATION
        // ============================================================
        public async Task<AllocationResponse> AllocateProgramAsync(
            ProgramAllocationRequest request)
        {
            await OpenAsync();

            var response = new AllocationResponse();

            int? targetLevelId = request.TargetAcademicLevelId;
            if (!targetLevelId.HasValue || targetLevelId <= 0)
            {
                if (!string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                {
                    targetLevelId = await Connection.ExecuteScalarAsync<int?>(
                        "SELECT AcademicLevelId FROM AcademicLevels WHERE LOWER(TRIM(LevelName)) = LOWER(TRIM(@Level)) LIMIT 1;",
                        new { Level = request.TargetAcademicLevel });
                }
            }

            var ids = request.StudentIds.Distinct().ToList();
            if (ids.Count > 0)
            {
                try
                {
                    var affected = await Connection.ExecuteAsync(
                        @"
UPDATE Students
SET
    AcademicYearId = CASE WHEN @AcademicYearId > 0 THEN @AcademicYearId ELSE AcademicYearId END,
    AcademicLevelId = COALESCE(@TargetAcademicLevelId, AcademicLevelId),
    GroupId = CASE WHEN @GroupId > 0 THEN @GroupId ELSE GroupId END,
    ProgramId = @ProgramId,
    UpdatedAt = UTC_TIMESTAMP()
WHERE StudentId IN @Ids
AND IsActive = 1;
",
                        new
                        {
                            AcademicYearId = request.TargetAcademicYearId,
                            TargetAcademicLevelId = targetLevelId,
                            GroupId = request.TargetGroupId,
                            ProgramId = request.TargetProgramId,
                            Ids = ids
                        });

                    response.UpdatedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Updated",
                            Message = "Program allocated successfully."
                        });
                    }
                }
                catch (Exception ex)
                {
                    response.FailedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Failed",
                            Message = ex.Message
                        });
                    }
                }
            }

            return response;
        }

        // ============================================================
        // 8. SECTION ALLOCATION
        // ============================================================
        public async Task<AllocationResponse> AllocateSectionAsync(
            SectionAllocationRequest request)
        {
            await OpenAsync();

            var response =
                new AllocationResponse();

            int? targetSecLevelId = request.TargetAcademicLevelId;
            if (!targetSecLevelId.HasValue || targetSecLevelId <= 0)
            {
                if (!string.IsNullOrWhiteSpace(request.TargetAcademicLevel))
                {
                    targetSecLevelId = await Connection.ExecuteScalarAsync<int?>(
                        "SELECT AcademicLevelId FROM AcademicLevels WHERE LOWER(TRIM(LevelName)) = LOWER(TRIM(@Level)) LIMIT 1;",
                        new { Level = request.TargetAcademicLevel });
                }
            }

            int? targetSecSectionId = request.TargetSectionId;
            if (!targetSecSectionId.HasValue || targetSecSectionId <= 0)
            {
                if (!string.IsNullOrWhiteSpace(request.TargetSection))
                {
                    targetSecSectionId = await Connection.ExecuteScalarAsync<int?>(
                        "SELECT SectionId FROM Sections WHERE LOWER(TRIM(SectionName)) = LOWER(TRIM(@Sec)) LIMIT 1;",
                        new { Sec = request.TargetSection });
                }
            }

            var ids = request.StudentIds.Distinct().ToList();
            if (ids.Count > 0)
            {
                try
                {
                    var affected = await Connection.ExecuteAsync(
                        @"
UPDATE Students
SET
    AcademicYearId = @AcademicYearId,
    AcademicLevelId = COALESCE(@TargetAcademicLevelId, AcademicLevelId),
    GroupId = @GroupId,
    SectionId = COALESCE(@TargetSectionId, SectionId),
    UpdatedAt = UTC_TIMESTAMP()
WHERE StudentId IN @Ids
AND IsActive = 1;
",
                        new
                        {
                            AcademicYearId = request.TargetAcademicYearId,
                            TargetAcademicLevelId = targetSecLevelId,
                            GroupId = request.TargetGroupId,
                            TargetSectionId = targetSecSectionId,
                            Ids = ids
                        });

                    response.UpdatedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Updated",
                            Message = "Section allocated successfully."
                        });
                    }
                }
                catch (Exception ex)
                {
                    response.FailedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Failed",
                            Message = ex.Message
                        });
                    }
                }
            }

            return response;
        }

        // ============================================================
        // 9. PROMOTION REPORT
        // ============================================================
        public async Task<PromotionReportResponse> GetPromotionReportAsync(
            PromotionReportQuery q)
        {
            await OpenAsync();

            /*
             * IMPORTANT:
             *
             * This query ONLY uses columns that exist in your
             * actual PromotionHistories table.
             *
             * Removed:
             * ph.FromBoardId
             * ph.ToBoardId
             * ph.FromMedium
             * ph.ToMedium
             *
             * Your previous 500 error was caused by:
             *
             * WHERE ph.FromBoardId = ...
             *
             * because FromBoardId does not exist.
             */

            const string sql = @"
SELECT
    ph.Id AS PromotionId,
    ph.StudentId,
    COALESCE(s.AdmissionNo, '') AS AdmissionNo,
    s.StudentName,
    fay.AcademicYearName AS SourceAcademicYear,
    ph.FromAcademicLevel AS SourceLevel,
    tay.AcademicYearName AS TargetAcademicYear,
    ph.ToAcademicLevel AS TargetLevel,
    fg.GroupName AS SourceGroup,
    tg.GroupName AS TargetGroup,
    ph.FromSection AS SourceSection,
    ph.ToSection AS TargetSection,
    CASE
        WHEN ph.IsRolledBack = 1
            THEN 'Not Eligible'
        ELSE 'Eligible'
    END AS EligibilityStatus,
    ph.Status AS PromotionStatus,
    ph.PromotionDate
FROM PromotionHistories ph
INNER JOIN Students s
    ON s.StudentId = ph.StudentId
LEFT JOIN AcademicYears fay
    ON fay.AcademicYearId = ph.FromAcademicYearId
LEFT JOIN AcademicYears tay
    ON tay.AcademicYearId = ph.ToAcademicYearId
LEFT JOIN `Groups` fg
    ON fg.GroupId = ph.FromGroupId
LEFT JOIN `Groups` tg
    ON tg.GroupId = ph.ToGroupId

WHERE

    (
        @AcademicYearId IS NULL
        OR ph.FromAcademicYearId = @AcademicYearId
    )

AND
    (
        @TargetAcademicYearId IS NULL
        OR ph.ToAcademicYearId = @TargetAcademicYearId
    )

AND
    (
        @AcademicLevel IS NULL
        OR TRIM(@AcademicLevel) = ''
        OR ph.FromAcademicLevel = TRIM(@AcademicLevel)
    )

AND
    (
        @TargetAcademicLevel IS NULL
        OR TRIM(@TargetAcademicLevel) = ''
        OR ph.ToAcademicLevel = TRIM(@TargetAcademicLevel)
    )

AND
    (
        @GroupId IS NULL
        OR ph.FromGroupId = @GroupId
    )

AND
    (
        @TargetGroupId IS NULL
        OR ph.ToGroupId = @TargetGroupId
    )

AND
    (
        @Section IS NULL
        OR TRIM(@Section) = ''
        OR ph.FromSection = TRIM(@Section)
    )

AND
    (
        @TargetSection IS NULL
        OR TRIM(@TargetSection) = ''
        OR ph.ToSection = TRIM(@TargetSection)
    )

AND
    (
        @PromotionStatus IS NULL
        OR TRIM(@PromotionStatus) = ''
        OR ph.Status = TRIM(@PromotionStatus)
    )

ORDER BY ph.Id DESC;
";

            var details =
                (await Connection.QueryAsync<PromotionReportDetailDto>(
                    sql,
                    q))
                .ToList();

            return new PromotionReportResponse
            {
                TotalStudents =
                    details.Count,

                EligibleStudents =
                    details.Count(x =>
                        x.EligibilityStatus.Equals(
                            "Eligible",
                            StringComparison.OrdinalIgnoreCase)),

                NotEligibleStudents =
                    details.Count(x =>
                        x.EligibilityStatus.Equals(
                            "Not Eligible",
                            StringComparison.OrdinalIgnoreCase)),

                PromotedStudents =
                    details.Count(x =>
                        x.PromotionStatus.Equals(
                            "Promoted",
                            StringComparison.OrdinalIgnoreCase)),

                NotPromotedStudents =
                    details.Count(x =>
                        !x.PromotionStatus.Equals(
                            "Promoted",
                            StringComparison.OrdinalIgnoreCase)),

                RolledBackStudents =
                    details.Count(x =>
                        x.PromotionStatus.Equals(
                            "RolledBack",
                            StringComparison.OrdinalIgnoreCase)),

                Details = details
            };
        }
    }
}