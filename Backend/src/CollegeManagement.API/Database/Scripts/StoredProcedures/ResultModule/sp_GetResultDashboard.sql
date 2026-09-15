DROP PROCEDURE IF EXISTS sp_GetResultDashboard;

DELIMITER //

CREATE PROCEDURE sp_GetResultDashboard(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    SELECT

        COUNT(DISTINCT m.StudentId) AS TotalResults,
        COUNT(DISTINCT m.StudentId) AS TotalStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultId IS NOT NULL
                THEN m.StudentId
            END
        ) AS ProcessedResults,
        COUNT(DISTINCT
            CASE
                WHEN r.ResultId IS NOT NULL
                THEN m.StudentId
            END
        ) AS ProcessedStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultId IS NULL
                THEN m.StudentId
            END
        ) AS PendingResults,
        COUNT(DISTINCT
            CASE
                WHEN r.ResultId IS NULL
                THEN m.StudentId
            END
        ) AS PendingStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.IsPublished = 1
                THEN r.StudentId
            END
        ) AS PublishedResults,
        COUNT(DISTINCT
            CASE
                WHEN r.IsPublished = 1
                THEN r.StudentId
            END
        ) AS PublishedStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultStatus = 'Pass'
                THEN r.StudentId
            END
        ) AS PassedStudents,

        COUNT(DISTINCT
            CASE
                WHEN r.ResultStatus = 'Fail'
                THEN r.StudentId
            END
        ) AS FailedStudents,

        COALESCE(ROUND(
            COUNT(DISTINCT
                CASE
                    WHEN r.ResultStatus = 'Pass'
                    THEN r.StudentId
                END
            ) * 100.0
            /
            NULLIF(
                COUNT(DISTINCT r.StudentId),
                0
            ),
            2
        ), 0.00) AS PassPercentage,

        COALESCE(ROUND(
            AVG(r.TotalMarks),
            2
        ), 0.00) AS AverageMarks,

        COALESCE(MAX(r.TotalMarks), 0.00) AS HighestMarks,

        COALESCE(MIN(r.TotalMarks), 0.00) AS LowestMarks

    FROM Marks m

    LEFT JOIN Results r
        ON r.StudentId = m.StudentId
        AND r.BoardId = m.BoardId
        AND r.AcademicYearId = m.AcademicYearId
        AND r.AcademicLevelId = m.AcademicLevelId
        AND r.GroupId = m.GroupId
        AND r.ExamId = m.ExaminationId
        AND r.SubjectId = m.SubjectId

    WHERE (p_BoardId IS NULL OR m.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR m.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR m.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR m.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR m.ExaminationId = p_ExamId)
      AND m.IsActive = 1;

END //

DELIMITER ;