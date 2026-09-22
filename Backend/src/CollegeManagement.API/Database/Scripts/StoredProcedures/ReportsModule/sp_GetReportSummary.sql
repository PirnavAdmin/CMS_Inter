DROP PROCEDURE IF EXISTS sp_GetReportSummary;
CREATE PROCEDURE sp_GetReportSummary()
BEGIN
    SELECT
      (SELECT COUNT(*) FROM Students WHERE IsActive = 1) AS Students,
      (SELECT COUNT(*) FROM StudentAdmissions) AS Admissions,
      (SELECT COUNT(*) FROM StudentAdmissions WHERE IsApproved = 1) AS ApprovedAdmissions,
      (SELECT COUNT(*) FROM StudentAdmissions WHERE IsRejected = 1) AS RejectedAdmissions,
      (SELECT COUNT(*) FROM Faculties WHERE IsActive = 1) AS Faculty,
      (SELECT COUNT(*) FROM Subjects WHERE IsActive = 1) AS Subjects,
      (SELECT COUNT(*) FROM Groups WHERE IsActive = 1) AS GroupsCount,
      (SELECT COUNT(*) FROM Sections WHERE IsActive = 1) AS SectionsCount,
      (SELECT COALESCE(SUM(Amount),0) FROM FeeCollections WHERE Status <> 'Inactive') AS TotalFeeCollected;
END;
