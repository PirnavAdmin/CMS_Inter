using System;
using System.Data;
using MySqlConnector;

class Program
{
    static void Main()
    {
        string connStr = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;";
        using (var conn = new MySqlConnection(connStr))
        {
            try {
                conn.Open();
                var sql = @"
DROP PROCEDURE IF EXISTS `sp_GetDashboardStudentAttendance`;
CREATE PROCEDURE `sp_GetDashboardStudentAttendance`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_ViewBy VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_HalfDay INT DEFAULT 0;
    DECLARE v_AttPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_LatestAttTime DATETIME DEFAULT NULL;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    SELECT COUNT(*) INTO v_TotalStudents
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
          AND (p_CampusId IS NULL OR sa.CampusId = p_CampusId);
    END IF;

    SELECT 
        COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0)
    INTO v_Present, v_HalfDay
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (
        DATE(a.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(a.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(a.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId);

    SELECT MAX(COALESCE(a.UpdatedAt, a.CreatedAt)) INTO v_LatestAttTime
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (
        DATE(a.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(a.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(a.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId);

    SET v_Absent = GREATEST(0, v_TotalStudents - v_Present - v_HalfDay);

    IF v_TotalStudents > 0 THEN
        SET v_AttPct = ROUND((v_Present + 0.5 * v_HalfDay) * 100.0 / v_TotalStudents, 1);
    END IF;

    SELECT 
        p_ViewBy AS ViewBy,
        v_TotalStudents AS TotalStudents,
        v_Present AS Present,
        v_Absent AS Absent,
        v_HalfDay AS HalfDayCount,
        v_AttPct AS AttendancePercentage,
        DATE_FORMAT(v_TargetDate, '%Y-%m-%d') AS AttendanceDate,
        DATE_FORMAT(NOW(), '%d %b %Y, %h:%i %p') AS LastUpdatedFormatted;

    IF p_ViewBy = 'Academic Level' THEN
        SELECT 
            COALESCE(al.Name, 'Unknown') AS CategoryName,
            COUNT(s.StudentId) AS TotalStudents,
            SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS Present,
            GREATEST(0, COUNT(s.StudentId) - SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) - SUM(CASE WHEN a.Status IN (3,4) THEN 1 ELSE 0 END)) AS Absent,
            SUM(CASE WHEN a.Status IN (3,4) THEN 1 ELSE 0 END) AS HalfDay
        FROM `Students` s
        LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.Id
        LEFT JOIN `Attendances` a ON s.StudentId = a.StudentId 
             AND (DATE(a.AttendanceDate) = v_TargetDate OR DATE(a.CreatedAt) = v_TargetDate)
             AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
          AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
        GROUP BY al.Name;
    ELSEIF p_ViewBy = 'Group' THEN
        SELECT 
            COALESCE(g.Name, 'Unknown') AS CategoryName,
            COUNT(s.StudentId) AS TotalStudents,
            SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS Present,
            GREATEST(0, COUNT(s.StudentId) - SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) - SUM(CASE WHEN a.Status IN (3,4) THEN 1 ELSE 0 END)) AS Absent,
            SUM(CASE WHEN a.Status IN (3,4) THEN 1 ELSE 0 END) AS HalfDay
        FROM `Students` s
        LEFT JOIN `Groups` g ON s.GroupId = g.Id
        LEFT JOIN `Attendances` a ON s.StudentId = a.StudentId 
             AND (DATE(a.AttendanceDate) = v_TargetDate OR DATE(a.CreatedAt) = v_TargetDate)
             AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
          AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
        GROUP BY g.Name;
    ELSEIF p_ViewBy = 'Section' THEN
        SELECT 
            COALESCE(sec.Name, 'Unknown') AS CategoryName,
            COUNT(s.StudentId) AS TotalStudents,
            SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS Present,
            GREATEST(0, COUNT(s.StudentId) - SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) - SUM(CASE WHEN a.Status IN (3,4) THEN 1 ELSE 0 END)) AS Absent,
            SUM(CASE WHEN a.Status IN (3,4) THEN 1 ELSE 0 END) AS HalfDay
        FROM `Students` s
        LEFT JOIN `Sections` sec ON s.SectionId = sec.Id
        LEFT JOIN `Attendances` a ON s.StudentId = a.StudentId 
             AND (DATE(a.AttendanceDate) = v_TargetDate OR DATE(a.CreatedAt) = v_TargetDate)
             AND (a.IsActive = 1 OR a.IsActive IS NULL)
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
          AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
        GROUP BY sec.Name;
    ELSE
        SELECT 'All Students' AS CategoryName, 
               v_TotalStudents AS TotalStudents, 
               v_Present AS Present, 
               v_Absent AS Absent, 
               v_HalfDay AS HalfDay;
    END IF;
END;
";
                using (var cmd = new MySqlCommand(sql, conn))
                {
                    cmd.ExecuteNonQuery();
                    Console.WriteLine("SP updated successfully.");
                }
            } catch(Exception ex) { Console.WriteLine(ex.Message); }
        }
    }
}
