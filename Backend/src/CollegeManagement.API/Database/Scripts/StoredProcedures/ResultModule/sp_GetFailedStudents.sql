DROP PROCEDURE IF EXISTS sp_GetFailedStudents;
DELIMITER //

CREATE PROCEDURE sp_GetFailedStudents(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN
    SELECT
        r.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNumber,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, '') AS StudentName,

        r.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,

        r.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,

        r.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,

        r.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,

        r.ExamId,
        COALESCE(e.ExamName, '') AS ExamName,

        r.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,

        COALESCE(r.InternalMarks, 0.00) AS InternalMarks,
        COALESCE(r.PracticalMarks, 0.00) AS PracticalMarks,
        COALESCE(r.ExternalMarks, 0.00) AS ExternalMarks,
        COALESCE(r.TotalMarks, 0.00) AS TotalMarks,
        COALESCE(r.TotalMarks, 0.00) AS GrandTotal,
        COALESCE(r.TotalMarks, 0.00) AS Total,
        COALESCE(r.Grade, '') AS Grade,
        COALESCE(r.Grade, '') AS OverallGrade,
        COALESCE(r.ResultStatus, 'Fail') AS ResultStatus,
        COALESCE(r.ResultStatus, 'Fail') AS FinalResult,
        COALESCE(r.ResultStatus, 'Fail') AS Result,
        COALESCE(r.ResultStatus, 'Fail') AS Status,
        r.Rank,
        r.PublishedDate,
        r.IsPublished

    FROM Results r

    LEFT JOIN Students s
        ON s.StudentId = r.StudentId

    LEFT JOIN Boards b
        ON b.BoardId = r.BoardId

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = r.AcademicYearId

    LEFT JOIN AcademicLevels al
        ON al.AcademicLevelId = r.AcademicLevelId

    LEFT JOIN `Groups` g
        ON g.GroupId = r.GroupId

    LEFT JOIN Examinations e
        ON e.ExamId = r.ExamId

    LEFT JOIN Subjects sub
        ON sub.SubjectId = r.SubjectId

    WHERE (r.ResultStatus = 'Fail' OR r.ResultStatus = 'FAIL')
      AND r.IsPublished = 1
      AND (p_BoardId IS NULL OR r.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR r.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR r.GroupId = p_GroupId)
      AND (p_ExamId IS NULL OR r.ExamId = p_ExamId)

    ORDER BY s.RollNo;
END //

DELIMITER ;