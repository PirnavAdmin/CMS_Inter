DROP PROCEDURE IF EXISTS sp_GetDashboardSummary;
CREATE PROCEDURE sp_GetDashboardSummary()
BEGIN
    SELECT
      (SELECT COUNT(*) FROM Students WHERE IsActive = 1) AS TotalStudents,
      (SELECT COUNT(*) FROM Faculties WHERE IsActive = 1) AS TotalFaculty,
      (SELECT COUNT(*) FROM Groups WHERE IsActive = 1) AS TotalGroups,
      (SELECT COUNT(*) FROM Subjects WHERE IsActive = 1) AS TotalSubjects,
      (SELECT COUNT(*) FROM Sections WHERE IsActive = 1) AS TotalSections,
      (SELECT COUNT(*) FROM StudentAdmissions WHERE IsActive = 1 AND IsApproved = 0 AND IsRejected = 0) AS PendingAdmissions;
END;
