DROP PROCEDURE IF EXISTS sp_GetResultStatistics;

DELIMITER //

CREATE PROCEDURE sp_GetResultStatistics(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN

    SELECT

        COUNT(DISTINCT StudentId) AS TotalStudents,

        COUNT(DISTINCT
            CASE
                WHEN ResultStatus = 'Pass'
                THEN StudentId
            END
        ) AS PassedStudents,

        COUNT(DISTINCT
            CASE
                WHEN ResultStatus = 'Fail'
                THEN StudentId
            END
        ) AS FailedStudents,

        COALESCE(ROUND(
            COUNT(DISTINCT
                CASE
                    WHEN ResultStatus = 'Pass'
                    THEN StudentId
                END
            ) * 100.0
            /
            NULLIF(
                COUNT(DISTINCT StudentId),
                0
            ),
            2
        ), 0.00) AS PassPercentage,

        COALESCE(ROUND(
            AVG(TotalMarks),
            2
        ), 0.00) AS AverageMarks,

        COALESCE(MAX(TotalMarks), 0.00) AS HighestMarks,

        COALESCE(MIN(TotalMarks), 0.00) AS LowestMarks,

        COUNT(DISTINCT
            CASE
                WHEN TotalMarks >= 75
                THEN StudentId
            END
        ) AS DistinctionCount,

        COUNT(DISTINCT
            CASE
                WHEN TotalMarks >= 60
                 AND TotalMarks < 75
                THEN StudentId
            END
        ) AS FirstClassCount,

        COUNT(DISTINCT
            CASE
                WHEN TotalMarks >= 50
                 AND TotalMarks < 60
                THEN StudentId
            END
        ) AS SecondClassCount,

        COUNT(DISTINCT
            CASE
                WHEN TotalMarks >= 35
                 AND TotalMarks < 50
                THEN StudentId
            END
        ) AS ThirdClassCount

    FROM Results

    WHERE IsPublished = 1

      AND (p_BoardId IS NULL
           OR BoardId = p_BoardId)

      AND (p_AcademicYearId IS NULL
           OR AcademicYearId = p_AcademicYearId)

      AND (p_AcademicLevelId IS NULL
           OR AcademicLevelId = p_AcademicLevelId)

      AND (p_GroupId IS NULL
           OR GroupId = p_GroupId)

      AND (p_ExamId IS NULL
           OR ExamId = p_ExamId);

END //

DELIMITER ;