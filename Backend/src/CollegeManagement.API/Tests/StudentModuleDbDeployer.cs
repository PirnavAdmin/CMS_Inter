using System;
using System.Linq;
using System.Data;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using MySqlConnector;
using Dapper;

namespace CollegeManagement.API.Tests
{
    public static class StudentModuleDbDeployer
    {
        public static async Task<bool> DeployProceduresAsync(string connectionString)
        {
            Console.WriteLine("[StudentModuleDbDeployer] Connecting to MySQL...");
            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            Console.WriteLine("[StudentModuleDbDeployer] Connected successfully.");

            // 1. sp_GetStudentTimetable (Correct SectionId mapping)
            string spTimetable = @"
DROP PROCEDURE IF EXISTS `sp_GetStudentTimetable`;
CREATE PROCEDURE `sp_GetStudentTimetable`(
    IN p_StudentId INT
)
BEGIN
    DECLARE v_SectionId INT;
    DECLARE v_AcademicYearId INT;
    DECLARE v_CampusId INT;

    SELECT SectionId, AcademicYearId, CampusId INTO v_SectionId, v_AcademicYearId, v_CampusId FROM Students WHERE StudentId = p_StudentId;
    IF v_SectionId IS NULL THEN
        SET v_SectionId = 1;
    END IF;

    CALL sp_GetTimetables(NULL, NULL, v_AcademicYearId, NULL, v_SectionId, NULL, NULL, NULL, 1, v_CampusId);
END;";

            // 2. sp_GetStudentSelfResults
            string spSelfResults = @"
DROP PROCEDURE IF EXISTS `sp_GetStudentSelfResults`;
CREATE PROCEDURE `sp_GetStudentSelfResults`(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        MIN(m.MarkId) AS ResultId,
        m.ExaminationId,
        COALESCE(e.ExamName, CONCAT('Exam #', m.ExaminationId)) AS ExaminationName,
        COALESCE(e.ExamCode, '') AS ExamCode,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        SUM(COALESCE(m.TotalMarks, 0)) AS TotalMarks,
        CASE 
            WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks 
            ELSE COUNT(m.MarkId) * 100 
        END AS MaxTotalMarks,
        ROUND(
            (SUM(COALESCE(m.TotalMarks, 0)) / 
            NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 
            2
        ) AS Percentage,
        CASE 
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 85 THEN 'A+'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 75 THEN 'A'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 65 THEN 'B'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 55 THEN 'C'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 35 THEN 'D'
            ELSE 'F'
        END AS Grade,
        CASE 
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= COALESCE(NULLIF(e.PassPercentage, 0), 35) THEN 'PASS'
            ELSE 'FAIL'
        END AS ResultStatus,
        1 AS IsPublished,
        MAX(m.PublishedAt) AS PublishedAt
    FROM Marks m
    LEFT JOIN Examinations e ON e.ExamId = m.ExaminationId
    LEFT JOIN Sections sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = m.AcademicYearId
    WHERE m.StudentId = p_StudentId 
      AND m.IsActive = 1 
      AND m.IsPublished = 1
    GROUP BY m.ExaminationId, e.ExamName, e.ExamCode, e.TotalMarks, e.PassPercentage, ay.AcademicYearName, g.GroupName, sec.SectionName;
END;";

            // 3. sp_GetStudentSelfResultMemo
            string spSelfMemo = @"
DROP PROCEDURE IF EXISTS `sp_GetStudentSelfResultMemo`;
CREATE PROCEDURE `sp_GetStudentSelfResultMemo`(
    IN p_StudentId INT,
    IN p_ExaminationId INT
)
BEGIN
    SELECT 
        s.StudentId,
        COALESCE(s.RollNo, CONCAT('STU-', LPAD(s.StudentId, 4, '0'))) AS RollNo,
        COALESCE(s.StudentName, CONCAT('Student #', s.StudentId)) AS StudentName,
        COALESCE(s.FatherName, '') AS FatherName,
        COALESCE(e.ExamName, '') AS ExaminationName,
        COALESCE(e.ExamCode, '') AS ExamCode,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(g.GroupName, '') AS CourseName,
        COALESCE(sec.SectionName, '') AS SectionName,
        SUM(COALESCE(m.TotalMarks, 0)) AS TotalMarks,
        CASE 
            WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks 
            ELSE COUNT(m.MarkId) * 100 
        END AS MaxTotalMarks,
        ROUND(
            (SUM(COALESCE(m.TotalMarks, 0)) / 
            NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 
            2
        ) AS Percentage,
        CASE 
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 85 THEN 'A+'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 75 THEN 'A'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 65 THEN 'B'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 55 THEN 'C'
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= 35 THEN 'D'
            ELSE 'F'
        END AS Grade,
        CASE 
            WHEN ROUND((SUM(COALESCE(m.TotalMarks, 0)) / NULLIF(CASE WHEN COALESCE(e.TotalMarks, 0) > 0 THEN e.TotalMarks ELSE COUNT(m.MarkId) * 100 END, 0)) * 100, 2) >= COALESCE(NULLIF(e.PassPercentage, 0), 35) THEN 'PASS'
            ELSE 'FAIL'
        END AS ResultStatus
    FROM Marks m
    INNER JOIN Students s ON s.StudentId = m.StudentId
    LEFT JOIN Examinations e ON e.ExamId = m.ExaminationId
    LEFT JOIN Sections sec ON sec.SectionId = m.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = m.GroupId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = m.AcademicYearId
    WHERE m.StudentId = p_StudentId 
      AND m.ExaminationId = p_ExaminationId
      AND m.IsActive = 1 
      AND m.IsPublished = 1
    GROUP BY s.StudentId, s.RollNo, s.StudentName, s.FatherName, e.ExamName, e.ExamCode, e.TotalMarks, e.PassPercentage, ay.AcademicYearName, g.GroupName, sec.SectionName;

    SELECT 
        m.SubjectId,
        COALESCE(sub.SubjectCode, CONCAT('SUB', LPAD(m.SubjectId, 3, '0'))) AS SubjectCode,
        COALESCE(sub.SubjectName, CONCAT('Subject #', m.SubjectId)) AS SubjectName,
        COALESCE(sub.TotalMarks, 100) AS MaxMarks,
        COALESCE(sub.PassingMarks, 35) AS PassingMarks,
        m.InternalMarks,
        m.PracticalMarks,
        m.TheoryMarks,
        m.TotalMarks,
        CASE 
            WHEN m.TotalMarks >= COALESCE(sub.PassingMarks, 35) THEN 'PASS'
            ELSE 'FAIL'
        END AS ResultStatus
    FROM Marks m
    LEFT JOIN Subjects sub ON sub.SubjectId = m.SubjectId
    WHERE m.StudentId = p_StudentId 
      AND m.ExaminationId = p_ExaminationId
      AND m.IsActive = 1 
      AND m.IsPublished = 1;
END;";

            foreach (var (sql, name) in new[] { (spTimetable, "sp_GetStudentTimetable"), (spSelfResults, "sp_GetStudentSelfResults"), (spSelfMemo, "sp_GetStudentSelfResultMemo") })
            {
                try
                {
                    await connection.ExecuteAsync(sql);
                    Console.WriteLine($"  [DEPLOYED] {name}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [FAILED] {name}: {ex.Message}");
                    return false;
                }
            }

            return true;
        }
    }
}
