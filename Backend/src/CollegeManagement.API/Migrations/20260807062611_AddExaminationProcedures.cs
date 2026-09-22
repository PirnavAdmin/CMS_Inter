using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddExaminationProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Get Examination Details
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS sp_GetExaminationDetails;
                CREATE PROCEDURE sp_GetExaminationDetails(
                    IN p_ExaminationId INT
                )
                BEGIN
                    SELECT 
                        e.ExaminationId,
                        e.ExamName,
                        e.StartDate,
                        e.EndDate,
                        e.Status,
                        e.IsActive,
                        ay.AcademicYearName,
                        g.GroupName,
                        b.BoardName,
                        al.AcademicLevelName,
                        at.AssessmentTypeName
                    FROM Examinations e
                    LEFT JOIN AcademicYears ay ON e.AcademicYearId = ay.AcademicYearId
                    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
                    LEFT JOIN Boards b ON e.BoardId = b.BoardId
                    LEFT JOIN AcademicLevels al ON e.AcademicLevelId = al.AcademicLevelId
                    LEFT JOIN AssessmentTypes at ON e.AssessmentTypeId = at.AssessmentTypeId
                    WHERE e.ExaminationId = p_ExaminationId;
                END;
            ");

            // 2. Get Exam Schedules for an Examination
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS sp_GetExamSchedulesByExamination;
                CREATE PROCEDURE sp_GetExamSchedulesByExamination(
                    IN p_ExaminationId INT
                )
                BEGIN
                    SELECT 
                        es.ExamScheduleId,
                        es.ExaminationId,
                        es.ExamDate,
                        es.ExamTime,
                        es.Hall,
                        es.Invigilator,
                        s.SubjectName,
                        s.SubjectCode
                    FROM ExamSchedules es
                    INNER JOIN Subjects s ON es.SubjectId = s.SubjectId
                    WHERE es.ExaminationId = p_ExaminationId AND es.IsActive = 1
                    ORDER BY es.ExamDate ASC, es.ExamTime ASC;
                END;
            ");

            // 3. Bulk Generate Hall Tickets
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS sp_GenerateHallTicketsForBatch;
                CREATE PROCEDURE sp_GenerateHallTicketsForBatch(
                    IN p_ExaminationId INT,
                    IN p_BatchId INT
                )
                BEGIN
                    INSERT INTO HallTickets (ExaminationId, StudentId, BatchId, GeneratedAt)
                    SELECT 
                        p_ExaminationId,
                        u.UserId,
                        p_BatchId,
                        NOW(6)
                    FROM Users u
                    WHERE u.UserId NOT IN (
                        SELECT ht.StudentId 
                        FROM HallTickets ht 
                        WHERE ht.ExaminationId = p_ExaminationId
                    );
                END;
            ");

            // 4. Publish Exam Schedules
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS sp_PublishExamSchedules;
                CREATE PROCEDURE sp_PublishExamSchedules(
                    IN p_ScheduleIds TEXT
                )
                BEGIN
                    UPDATE ExamSchedules 
                    SET IsActive = 1 
                    WHERE FIND_IN_SET(ExamScheduleId, p_ScheduleIds) > 0;
                END;
            ");

            // 5. Get Invigilator Assignments
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS sp_GetInvigilatorsBySchedule;
                CREATE PROCEDURE sp_GetInvigilatorsBySchedule(
                    IN p_ExamScheduleId INT
                )
                BEGIN
                    SELECT 
                        ia.InvigilatorAssignmentId,
                        ia.ExamScheduleId,
                        ia.InvigilatorId,
                        ia.HallNumber,
                        ia.AssignedAt,
                        u.FullName AS InvigilatorName,
                        u.Email AS InvigilatorEmail
                    FROM InvigilatorAssignments ia
                    INNER JOIN Users u ON ia.InvigilatorId = u.UserId
                    WHERE ia.ExamScheduleId = p_ExamScheduleId;
                END;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetExaminationDetails;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetExamSchedulesByExamination;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GenerateHallTicketsForBatch;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_PublishExamSchedules;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetInvigilatorsBySchedule;");
        }
    }
}