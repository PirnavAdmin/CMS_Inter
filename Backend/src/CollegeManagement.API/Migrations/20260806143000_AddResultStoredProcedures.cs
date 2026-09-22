using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddResultStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_GetResults;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetResults()
        BEGIN

            SELECT
                ResultId,
                StudentId,
                BoardId,
                AcademicYearId,
                AcademicLevelId,
                GroupId,
                ExamId,
                SubjectId,
                InternalMarks,
                PracticalMarks,
                ExternalMarks,
                TotalMarks,
                Grade,
                ResultStatus,
                Rank,
                IsPublished,
                PublishedDate,
                CreatedAt,
                UpdatedAt

            FROM Results

            ORDER BY ResultId DESC;

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
            """
        DROP PROCEDURE IF EXISTS sp_GetResultById;
        """,
            suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetResultById
        (
            IN p_ResultId INT
        )
        BEGIN

            IF NOT EXISTS
            (
                SELECT 1
                FROM Results
                WHERE ResultId = p_ResultId
            )
            THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT='Result not found';
            END IF;

            SELECT
                ResultId,
                StudentId,
                BoardId,
                AcademicYearId,
                AcademicLevelId,
                GroupId,
                ExamId,
                SubjectId,
                InternalMarks,
                PracticalMarks,
                ExternalMarks,
                TotalMarks,
                Grade,
                ResultStatus,
                Rank,
                IsPublished,
                PublishedDate,
                CreatedAt,
                UpdatedAt

            FROM Results

            WHERE ResultId = p_ResultId;

        END;
        """,
                    suppressTransaction: true);



                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_ProcessResults;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_ProcessResults
        (
            IN p_BoardId INT,
            IN p_AcademicYearId INT,
            IN p_AcademicLevelId INT,
            IN p_GroupId INT,
            IN p_ExamId INT
        )
        BEGIN

            UPDATE Results

            SET

                TotalMarks =
                    IFNULL(InternalMarks,0)+
                    IFNULL(PracticalMarks,0)+
                    IFNULL(ExternalMarks,0),

                Grade =
                CASE

                    WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=90 THEN 'A+'

                    WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=80 THEN 'A'

                    WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=70 THEN 'B'

                    WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=60 THEN 'C'

                    WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=50 THEN 'D'

                    ELSE 'F'

                END,

                ResultStatus =
                CASE

                    WHEN (IFNULL(InternalMarks,0)+IFNULL(PracticalMarks,0)+IFNULL(ExternalMarks,0))>=35

                    THEN 'Pass'

                    ELSE 'Fail'

                END,

                UpdatedAt = UTC_TIMESTAMP()

            WHERE

                BoardId = p_BoardId

                AND AcademicYearId = p_AcademicYearId

                AND AcademicLevelId = p_AcademicLevelId

                AND GroupId = p_GroupId

                AND ExamId = p_ExamId;

            SELECT ROW_COUNT() AS ProcessedResults;

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_PublishResults;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_PublishResults
        (
            IN p_BoardId INT,
            IN p_AcademicYearId INT,
            IN p_AcademicLevelId INT,
            IN p_GroupId INT,
            IN p_ExamId INT
        )
        BEGIN

            UPDATE Results

            SET

                IsPublished = TRUE,

                PublishedDate = UTC_TIMESTAMP(),

                UpdatedAt = UTC_TIMESTAMP()

            WHERE

                BoardId = p_BoardId

                AND AcademicYearId = p_AcademicYearId

                AND AcademicLevelId = p_AcademicLevelId

                AND GroupId = p_GroupId

                AND ExamId = p_ExamId;

            SELECT ROW_COUNT() AS PublishedResults;

        END;
        """,
                    suppressTransaction: true);



                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_UpdateResult;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_UpdateResult
        (
            IN p_ResultId INT,
            IN p_InternalMarks DECIMAL(5,2),
            IN p_PracticalMarks DECIMAL(5,2),
            IN p_ExternalMarks DECIMAL(5,2),
            IN p_Grade VARCHAR(10),
            IN p_ResultStatus VARCHAR(20),
            IN p_Rank INT
        )
        BEGIN

            DECLARE v_TotalMarks DECIMAL(5,2);

            IF NOT EXISTS
            (
                SELECT 1
                FROM Results
                WHERE ResultId = p_ResultId
            )
            THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT='Result not found';
            END IF;

            SET v_TotalMarks =
                IFNULL(p_InternalMarks,0)
              + IFNULL(p_PracticalMarks,0)
              + IFNULL(p_ExternalMarks,0);

            UPDATE Results
            SET

                InternalMarks=p_InternalMarks,
                PracticalMarks=p_PracticalMarks,
                ExternalMarks=p_ExternalMarks,
                TotalMarks=v_TotalMarks,
                Grade=p_Grade,
                ResultStatus=p_ResultStatus,
                Rank=p_Rank,
                UpdatedAt=UTC_TIMESTAMP()

            WHERE ResultId=p_ResultId;

            CALL sp_GetResultById(p_ResultId);

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_DeleteResult;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_DeleteResult
        (
            IN p_ResultId INT
        )
        BEGIN

            DELETE FROM Results
            WHERE ResultId=p_ResultId;

            SELECT IF(ROW_COUNT()>0,1,0) AS Deleted;

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_GetResultsByStudent;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetResultsByStudent
        (
            IN p_StudentId INT
        )
        BEGIN

        SELECT

        r.ResultId,

        s.StudentId,
        s.StudentName,
        s.RollNo,

        sub.SubjectId,
        sub.SubjectName,
        sub.SubjectCode,

        e.ExaminationId,
        e.ExamName,

        ay.AcademicYearName,

        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,
        r.TotalMarks,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.IsPublished

        FROM Results r

        LEFT JOIN Students s
        ON s.StudentId=r.StudentId

        LEFT JOIN Subjects sub
        ON sub.SubjectId=r.SubjectId

        LEFT JOIN Examinations e
        ON e.ExaminationId=r.ExamId

        LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId=r.AcademicYearId

        WHERE r.StudentId=p_StudentId

        ORDER BY sub.SubjectName;

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_GetResultsByExam;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetResultsByExam
        (
            IN p_ExamId INT
        )
        BEGIN

        SELECT

        r.ResultId,

        s.StudentName,
        s.RollNo,

        sub.SubjectName,

        e.ExamName,

        r.TotalMarks,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.IsPublished

        FROM Results r

        LEFT JOIN Students s
        ON s.StudentId=r.StudentId

        LEFT JOIN Subjects sub
        ON sub.SubjectId=r.SubjectId

        LEFT JOIN Examinations e
        ON e.ExaminationId=r.ExamId

        WHERE r.ExamId=p_ExamId

        ORDER BY s.RollNo;

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_GetResultsBySubject;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetResultsBySubject
        (
            IN p_SubjectId INT
        )
        BEGIN

        SELECT

        r.ResultId,

        s.StudentName,
        s.RollNo,

        sub.SubjectName,

        r.InternalMarks,
        r.PracticalMarks,
        r.ExternalMarks,
        r.TotalMarks,
        r.Grade,
        r.ResultStatus

        FROM Results r

        LEFT JOIN Students s
        ON s.StudentId=r.StudentId

        LEFT JOIN Subjects sub
        ON sub.SubjectId=r.SubjectId

        WHERE r.SubjectId=p_SubjectId

        ORDER BY s.RollNo;

        END;
        """,
                    suppressTransaction: true);



                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_PublishResult;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_PublishResult
        (
            IN p_ResultId INT
        )
        BEGIN

            IF NOT EXISTS
            (
                SELECT 1
                FROM Results
                WHERE ResultId = p_ResultId
            )
            THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT='Result not found';
            END IF;

            UPDATE Results
            SET

                IsPublished = 1,
                PublishedDate = UTC_TIMESTAMP(),
                UpdatedAt = UTC_TIMESTAMP()

            WHERE ResultId = p_ResultId;

            CALL sp_GetResultById(p_ResultId);

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_GetPublishedResults;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetPublishedResults()
        BEGIN

        SELECT

        r.ResultId,

        s.StudentName,
        s.RollNo,

        sub.SubjectName,

        e.ExamName,

        ay.AcademicYearName,

        r.TotalMarks,
        r.Grade,
        r.ResultStatus,
        r.Rank,
        r.PublishedDate

        FROM Results r

        LEFT JOIN Students s
        ON s.StudentId = r.StudentId

        LEFT JOIN Subjects sub
        ON sub.SubjectId = r.SubjectId

        LEFT JOIN Examinations e
        ON e.ExaminationId = r.ExamId

        LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = r.AcademicYearId

        WHERE r.IsPublished = 1

        ORDER BY s.RollNo;

        END;
        """,
                    suppressTransaction: true);


                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_GetRankList;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetRankList
        (
            IN p_ExamId INT
        )
        BEGIN

        SELECT

        s.StudentId,
        s.StudentName,
        s.RollNo,

        SUM(r.TotalMarks) AS TotalMarks,

        RANK() OVER
        (
        ORDER BY SUM(r.TotalMarks) DESC
        ) AS RankPosition

        FROM Results r

        INNER JOIN Students s
        ON s.StudentId = r.StudentId

        WHERE r.ExamId = p_ExamId

        GROUP BY

        s.StudentId,
        s.StudentName,
        s.RollNo

        ORDER BY TotalMarks DESC;

        END;
        """,
                    suppressTransaction: true);



                    migrationBuilder.Sql(
        """
        DROP PROCEDURE IF EXISTS sp_GetStudentResultSummary;
        """,
        suppressTransaction: true);

                    migrationBuilder.Sql(
                    """
        CREATE PROCEDURE sp_GetStudentResultSummary
        (
            IN p_StudentId INT
        )
        BEGIN

        SELECT

        s.StudentId,
        s.StudentName,
        s.RollNo,

        COUNT(r.ResultId) AS TotalSubjects,

        SUM(r.TotalMarks) AS TotalMarks,

        AVG(r.TotalMarks) AS AverageMarks,

        MAX(r.TotalMarks) AS HighestMarks,

        MIN(r.TotalMarks) AS LowestMarks

        FROM Students s

        LEFT JOIN Results r
        ON r.StudentId = s.StudentId

        WHERE s.StudentId = p_StudentId

        GROUP BY

        s.StudentId,
        s.StudentName,
        s.RollNo;

        END;
        """,
                    suppressTransaction: true);



        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetStudentResultSummary;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetRankList;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetPublishedResults;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_PublishResult;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetResultsBySubject;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetResultsByExam;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetResultsByStudent;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_DeleteResult;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_UpdateResult;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_PublishResults;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_ProcessResults;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetResultById;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetResults;
    """,
            suppressTransaction: true);

            migrationBuilder.DropTable(
                name: "Results");
        }
    }
}
