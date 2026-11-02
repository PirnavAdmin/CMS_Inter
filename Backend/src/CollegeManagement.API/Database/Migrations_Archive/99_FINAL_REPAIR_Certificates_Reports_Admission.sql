-- FINAL REPAIR: Certificates + AuditLogs + Reports stored procedures + Admission relation
-- Run this in the target MySQL database if EF reports "database is already up to date"
-- while Certificates/AuditLogs are missing.
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `AuditLogs` (
  `AuditLogId` BIGINT NOT NULL AUTO_INCREMENT,
  `UserName` VARCHAR(150) NULL,
  `Action` VARCHAR(100) NOT NULL,
  `EntityName` VARCHAR(100) NOT NULL,
  `EntityId` INT NULL,
  `Description` VARCHAR(1000) NULL,
  `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`AuditLogId`),
  KEY `IX_AuditLogs_CreatedAt` (`CreatedAt`),
  KEY `IX_AuditLogs_Entity` (`EntityName`,`EntityId`)
) CHARACTER SET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Certificates` (
  `CertificateId` INT NOT NULL AUTO_INCREMENT,
  `CertificateNumber` VARCHAR(40) NOT NULL,
  `StudentId` INT NOT NULL,
  `AdmissionNo` VARCHAR(30) NOT NULL,
  `StudentName` VARCHAR(150) NOT NULL,
  `GroupName` VARCHAR(100) NULL,
  `AcademicLevel` VARCHAR(100) NULL,
  `AcademicYear` VARCHAR(50) NULL,
  `CertificateType` VARCHAR(100) NOT NULL,
  `Purpose` VARCHAR(250) NOT NULL,
  `Remarks` VARCHAR(1000) NULL,
  `Status` VARCHAR(30) NOT NULL DEFAULT 'Generated',
  `GeneratedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ReviewedAt` DATETIME(6) NULL,
  `ApprovedAt` DATETIME(6) NULL,
  `IssuedAt` DATETIME(6) NULL,
  `IssuedBy` VARCHAR(150) NULL,
  `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`CertificateId`),
  UNIQUE KEY `IX_Certificates_CertificateNumber` (`CertificateNumber`),
  KEY `IX_Certificates_StudentId` (`StudentId`),
  KEY `IX_Certificates_Status` (`Status`)
) CHARACTER SET=utf8mb4;

SET @exists_fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='Certificates' AND CONSTRAINT_NAME='FK_Certificates_Students_StudentId');
SET @sql := IF(@exists_fk=0, 'ALTER TABLE `Certificates` ADD CONSTRAINT `FK_Certificates_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Students' AND COLUMN_NAME='AdmissionId');
SET @sql := IF(@exists_col=0, 'ALTER TABLE `Students` ADD COLUMN `AdmissionId` INT NULL AFTER `StudentId`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists_col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Students' AND COLUMN_NAME='PreviousHallTicketNumber');
SET @sql := IF(@exists_col>0, 'ALTER TABLE `Students` DROP COLUMN `PreviousHallTicketNumber`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `Students` s
JOIN (
  SELECT AdmissionId, MIN(StudentId) KeepStudentId
  FROM `Students`
  WHERE AdmissionId IS NOT NULL
  GROUP BY AdmissionId
  HAVING COUNT(*) > 1
) d ON d.AdmissionId=s.AdmissionId
SET s.AdmissionId=NULL
WHERE s.StudentId<>d.KeepStudentId;

SET @exists_idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Students' AND INDEX_NAME='UX_Students_AdmissionId');
SET @sql := IF(@exists_idx=0, 'CREATE UNIQUE INDEX `UX_Students_AdmissionId` ON `Students` (`AdmissionId`)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists_fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='Students' AND CONSTRAINT_NAME='FK_Students_StudentAdmissions_AdmissionId');
SET @sql := IF(@exists_fk=0, 'ALTER TABLE `Students` ADD CONSTRAINT `FK_Students_StudentAdmissions_AdmissionId` FOREIGN KEY (`AdmissionId`) REFERENCES `StudentAdmissions` (`AdmissionId`) ON DELETE RESTRICT ON UPDATE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS=1;


DELIMITER $$

DROP PROCEDURE IF EXISTS sp_Report_Dashboard;
CREATE PROCEDURE sp_Report_Dashboard(
 IN p_BoardId INT, IN p_AcademicYearId INT, IN p_AcademicLevelId INT,
 IN p_GroupId INT, IN p_SectionId INT, IN p_FromDate DATETIME, IN p_ToDate DATETIME)
BEGIN
 SELECT
   (SELECT COUNT(*) FROM StudentAdmissions sa WHERE sa.IsActive=1 AND (p_BoardId IS NULL OR sa.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR sa.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR sa.GroupId=p_GroupId) AND (p_SectionId IS NULL OR sa.SectionId=p_SectionId) AND (p_FromDate IS NULL OR sa.AdmissionDate>=p_FromDate) AND (p_ToDate IS NULL OR sa.AdmissionDate<=p_ToDate)) Admissions,
   ROUND(CASE WHEN (SELECT COUNT(*) FROM Attendances a WHERE a.IsActive=1 AND (p_BoardId IS NULL OR a.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR a.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR a.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR a.GroupId=p_GroupId) AND (p_SectionId IS NULL OR a.SectionId=p_SectionId) AND (p_FromDate IS NULL OR a.AttendanceDate>=p_FromDate) AND (p_ToDate IS NULL OR a.AttendanceDate<=p_ToDate))=0 THEN 0 ELSE (SELECT COUNT(*) FROM Attendances a WHERE a.IsActive=1 AND a.Status=1 AND (p_BoardId IS NULL OR a.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR a.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR a.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR a.GroupId=p_GroupId) AND (p_SectionId IS NULL OR a.SectionId=p_SectionId) AND (p_FromDate IS NULL OR a.AttendanceDate>=p_FromDate) AND (p_ToDate IS NULL OR a.AttendanceDate<=p_ToDate)) * 100.0 / (SELECT COUNT(*) FROM Attendances a WHERE a.IsActive=1 AND (p_BoardId IS NULL OR a.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR a.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR a.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR a.GroupId=p_GroupId) AND (p_SectionId IS NULL OR a.SectionId=p_SectionId) AND (p_FromDate IS NULL OR a.AttendanceDate>=p_FromDate) AND (p_ToDate IS NULL OR a.AttendanceDate<=p_ToDate)) END,2) Attendance,
   (SELECT COALESCE(SUM(fc.PaidAmount),0) FROM FeeCollections fc JOIN Students s ON s.StudentId=fc.StudentId WHERE (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) AND (p_FromDate IS NULL OR fc.PaymentDate>=p_FromDate) AND (p_ToDate IS NULL OR fc.PaymentDate<=p_ToDate)) FeeCollection,
   (SELECT COALESCE(SUM(sf.DueAmount),0) FROM StudentFees sf JOIN Students s ON s.StudentId=sf.StudentId WHERE sf.FeeStatus<>'Cancelled' AND (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)) DueFees,
   (SELECT COUNT(*) FROM Examinations e WHERE e.IsActive=1 AND (p_BoardId IS NULL OR e.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR e.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR e.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR e.GroupId=p_GroupId) AND (p_FromDate IS NULL OR e.StartDate>=DATE(p_FromDate)) AND (p_ToDate IS NULL OR e.EndDate<=DATE(p_ToDate))) Examinations,
   (SELECT COUNT(DISTINCT r.ExamId) FROM Results r JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)) ResultsPublished,
   (SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE,p.StartTime,p.EndTime))/60,0) FROM Timetables t JOIN Periods p ON p.PeriodId=t.PeriodId WHERE t.IsPublished=1 AND p.IsBreak=0 AND (p_BoardId IS NULL OR t.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR t.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR t.GroupId=p_GroupId) AND (p_SectionId IS NULL OR t.SectionId=p_SectionId)) FacultyWorkload,
   (SELECT COUNT(*) FROM Students s WHERE s.IsActive=1 AND (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)) StudentStrength,
   ROUND(CASE WHEN (SELECT COUNT(*) FROM Results r JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId))=0 THEN 0 ELSE (SELECT COUNT(*) FROM Results r JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND r.ResultStatus IN ('Pass','Passed','PASS') AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId))*100.0/(SELECT COUNT(*) FROM Results r JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)) END,2) PassPercentage,
   (SELECT COUNT(DISTINCT r.StudentId) FROM Results r JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND r.Rank IS NOT NULL AND r.Rank<=10 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)) ToppersIdentified;

 SELECT DATE_FORMAT(sa.AdmissionDate,'%b') Label, COUNT(*) Value, COUNT(*) Target, 0 Due FROM StudentAdmissions sa WHERE sa.IsActive=1 AND (p_BoardId IS NULL OR sa.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR sa.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR sa.GroupId=p_GroupId) AND (p_SectionId IS NULL OR sa.SectionId=p_SectionId) AND (p_FromDate IS NULL OR sa.AdmissionDate>=p_FromDate) AND (p_ToDate IS NULL OR sa.AdmissionDate<=p_ToDate) GROUP BY YEAR(sa.AdmissionDate),MONTH(sa.AdmissionDate),DATE_FORMAT(sa.AdmissionDate,'%b') ORDER BY YEAR(sa.AdmissionDate),MONTH(sa.AdmissionDate);
 SELECT DATE_FORMAT(a.AttendanceDate,'%b') Label, ROUND(SUM(a.Status=1)*100.0/NULLIF(COUNT(*),0),2) Value, 0 Target, 0 Due FROM Attendances a WHERE a.IsActive=1 AND (p_BoardId IS NULL OR a.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR a.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR a.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR a.GroupId=p_GroupId) AND (p_SectionId IS NULL OR a.SectionId=p_SectionId) AND (p_FromDate IS NULL OR a.AttendanceDate>=p_FromDate) AND (p_ToDate IS NULL OR a.AttendanceDate<=p_ToDate) GROUP BY YEAR(a.AttendanceDate),MONTH(a.AttendanceDate),DATE_FORMAT(a.AttendanceDate,'%b') ORDER BY YEAR(a.AttendanceDate),MONTH(a.AttendanceDate);
 SELECT DATE_FORMAT(fc.PaymentDate,'%b') Label, COALESCE(SUM(fc.PaidAmount),0) Value, 0 Target, COALESCE(SUM(sf.DueAmount),0) Due FROM FeeCollections fc JOIN Students s ON s.StudentId=fc.StudentId LEFT JOIN StudentFees sf ON sf.StudentId=fc.StudentId WHERE (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) AND (p_FromDate IS NULL OR fc.PaymentDate>=p_FromDate) AND (p_ToDate IS NULL OR fc.PaymentDate<=p_ToDate) GROUP BY YEAR(fc.PaymentDate),MONTH(fc.PaymentDate),DATE_FORMAT(fc.PaymentDate,'%b') ORDER BY YEAR(fc.PaymentDate),MONTH(fc.PaymentDate);
 SELECT rnk.Rank, rnk.StudentId, rnk.StudentName, rnk.RollNo, rnk.GroupName, rnk.SectionName, rnk.TotalMarks, rnk.Percentage FROM (
   SELECT s.StudentId,s.StudentName,s.RollNo,g.GroupName,se.SectionName,SUM(r.TotalMarks) TotalMarks,AVG((r.TotalMarks/NULLIF((SELECT MAX(r2.TotalMarks) FROM Results r2 WHERE r2.ExamId=r.ExamId AND r2.StudentId=r.StudentId),0))*100) Percentage,
          DENSE_RANK() OVER(ORDER BY SUM(r.TotalMarks) DESC) Rank
   FROM Results r JOIN Students s ON s.StudentId=r.StudentId LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN Sections se ON se.SectionId=s.SectionId
   WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)
   GROUP BY s.StudentId,s.StudentName,s.RollNo,g.GroupName,se.SectionName
 ) rnk WHERE rnk.Rank<=10 ORDER BY rnk.Rank;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Admissions;
CREATE PROCEDURE sp_Report_Admissions(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT DATE_FORMAT(sa.AdmissionDate,'%Y-%m') Period,COUNT(*) Admissions,SUM(sa.IsApproved=1) Approved,SUM(sa.IsRejected=1) Rejected,SUM(sa.IsApproved=0 AND sa.IsRejected=0) Pending
 FROM StudentAdmissions sa WHERE sa.IsActive=1 AND (p_BoardId IS NULL OR sa.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR sa.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR sa.GroupId=p_GroupId) AND (p_SectionId IS NULL OR sa.SectionId=p_SectionId) AND (p_FromDate IS NULL OR sa.AdmissionDate>=p_FromDate) AND (p_ToDate IS NULL OR sa.AdmissionDate<=p_ToDate)
 GROUP BY YEAR(sa.AdmissionDate),MONTH(sa.AdmissionDate),DATE_FORMAT(sa.AdmissionDate,'%Y-%m') ORDER BY YEAR(sa.AdmissionDate),MONTH(sa.AdmissionDate);
END;$$

DROP PROCEDURE IF EXISTS sp_Report_StudentStrength;
CREATE PROCEDURE sp_Report_StudentStrength(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT COALESCE(g.GroupName,'') GroupName,COALESCE(se.SectionName,s.Section) SectionName,COUNT(*) StudentCount
 FROM Students s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN Sections se ON se.SectionId=s.SectionId
 WHERE s.IsActive=1 AND (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR EXISTS(SELECT 1 FROM AcademicLevels al WHERE al.AcademicLevelId=p_AcademicLevelId AND al.LevelName=s.AcademicLevel)) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)
 GROUP BY g.GroupName,COALESCE(se.SectionName,s.Section) ORDER BY g.GroupName,SectionName;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Attendance;
CREATE PROCEDURE sp_Report_Attendance(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT DATE_FORMAT(a.AttendanceDate,'%Y-%m-%d') Period,SUM(a.Status=1) Present,SUM(a.Status=2) Absent,SUM(a.Status=3) Late,SUM(a.Status=4) Leave,ROUND(SUM(a.Status=1)*100.0/NULLIF(COUNT(*),0),2) AttendancePercentage
 FROM Attendances a WHERE a.IsActive=1 AND (p_BoardId IS NULL OR a.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR a.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR a.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR a.GroupId=p_GroupId) AND (p_SectionId IS NULL OR a.SectionId=p_SectionId) AND (p_FromDate IS NULL OR a.AttendanceDate>=p_FromDate) AND (p_ToDate IS NULL OR a.AttendanceDate<=p_ToDate)
 GROUP BY DATE(a.AttendanceDate) ORDER BY DATE(a.AttendanceDate);
END;$$

DROP PROCEDURE IF EXISTS sp_Report_FacultyAttendance;
CREATE PROCEDURE sp_Report_FacultyAttendance(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT a.FacultyId,TRIM(CONCAT(COALESCE(f.FirstName,''),' ',COALESCE(f.LastName,''))) FacultyName,SUM(a.Status=1) Present,SUM(a.Status=2) Absent,SUM(a.Status=3) Late,SUM(a.Status=4) Leave,ROUND(SUM(a.Status=1)*100.0/NULLIF(COUNT(*),0),2) AttendancePercentage
 FROM Attendances a LEFT JOIN Faculties f ON f.Id=a.FacultyId WHERE a.IsActive=1 AND (p_BoardId IS NULL OR a.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR a.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR a.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR a.GroupId=p_GroupId) AND (p_SectionId IS NULL OR a.SectionId=p_SectionId) AND (p_FromDate IS NULL OR a.AttendanceDate>=p_FromDate) AND (p_ToDate IS NULL OR a.AttendanceDate<=p_ToDate)
 GROUP BY a.FacultyId,f.FirstName,f.LastName ORDER BY FacultyName;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_FeeCollection;
CREATE PROCEDURE sp_Report_FeeCollection(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT DATE_FORMAT(fc.PaymentDate,'%Y-%m') Period,COALESCE(SUM(fc.PaidAmount),0) Collected,0 Discount,0 Fine,COUNT(*) Transactions
 FROM FeeCollections fc JOIN Students s ON s.StudentId=fc.StudentId WHERE (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) AND (p_FromDate IS NULL OR fc.PaymentDate>=p_FromDate) AND (p_ToDate IS NULL OR fc.PaymentDate<=p_ToDate)
 GROUP BY YEAR(fc.PaymentDate),MONTH(fc.PaymentDate),DATE_FORMAT(fc.PaymentDate,'%Y-%m') ORDER BY YEAR(fc.PaymentDate),MONTH(fc.PaymentDate);
END;$$

DROP PROCEDURE IF EXISTS sp_Report_OutstandingFees;
CREATE PROCEDURE sp_Report_OutstandingFees(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT s.StudentId,s.AdmissionNo,s.RollNo,s.StudentName,COALESCE(SUM(sf.TotalAmount),0) TotalAmount,COALESCE(SUM(sf.PaidAmount),0) PaidAmount,COALESCE(SUM(sf.DueAmount),0) DueAmount,MAX(sf.FeeStatus) FeeStatus
 FROM StudentFees sf JOIN Students s ON s.StudentId=sf.StudentId WHERE sf.FeeStatus<>'Cancelled' AND (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) GROUP BY s.StudentId,s.AdmissionNo,s.RollNo,s.StudentName HAVING COALESCE(SUM(sf.DueAmount),0)>0 ORDER BY DueAmount DESC;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Examinations;
CREATE PROCEDURE sp_Report_Examinations(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT e.ExamId ExaminationId,e.ExamName,COALESCE(ay.AcademicYearName,'') AcademicYear,COALESCE(g.GroupName,'') GroupName,DATE_FORMAT(e.StartDate,'%Y-%m-%d') StartDate,DATE_FORMAT(e.EndDate,'%Y-%m-%d') EndDate,COUNT(DISTINCT r.ResultId) ResultCount,COUNT(DISTINCT CASE WHEN r.IsPublished=1 THEN r.ResultId END) PublishedCount
 FROM Examinations e LEFT JOIN AcademicYears ay ON ay.AcademicYearId=e.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=e.GroupId LEFT JOIN Results r ON r.ExamId=e.ExamId LEFT JOIN Students s ON s.StudentId=r.StudentId
 WHERE e.IsActive=1 AND (p_BoardId IS NULL OR e.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR e.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR e.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR e.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) AND (p_FromDate IS NULL OR e.StartDate>=DATE(p_FromDate)) AND (p_ToDate IS NULL OR e.EndDate<=DATE(p_ToDate)) GROUP BY e.ExamId,e.ExamName,ay.AcademicYearName,g.GroupName,e.StartDate,e.EndDate ORDER BY e.StartDate DESC;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Results;
CREATE PROCEDURE sp_Report_Results(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT COALESCE(e.ExamName,'') ExamName,COUNT(*) TotalResults,SUM(r.ResultStatus IN ('Pass','Passed','PASS')) Passed,SUM(r.ResultStatus NOT IN ('Pass','Passed','PASS')) Failed,ROUND(AVG(r.TotalMarks),2) AveragePercentage
 FROM Results r LEFT JOIN Examinations e ON e.ExamId=r.ExamId LEFT JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) AND (p_FromDate IS NULL OR r.PublishedDate>=p_FromDate) AND (p_ToDate IS NULL OR r.PublishedDate<=p_ToDate) GROUP BY e.ExamName ORDER BY e.ExamName;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_PassPercentage;
CREATE PROCEDURE sp_Report_PassPercentage(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT COALESCE(e.ExamName,'') ExamName,SUM(r.ResultStatus IN ('Pass','Passed','PASS')) Passed,SUM(r.ResultStatus NOT IN ('Pass','Passed','PASS')) Failed,ROUND(SUM(r.ResultStatus IN ('Pass','Passed','PASS'))*100.0/NULLIF(COUNT(*),0),2) PassPercentage
 FROM Results r LEFT JOIN Examinations e ON e.ExamId=r.ExamId LEFT JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) GROUP BY e.ExamName ORDER BY PassPercentage DESC;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Toppers;
CREATE PROCEDURE sp_Report_Toppers(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT DENSE_RANK() OVER(ORDER BY x.TotalMarks DESC) Rank,x.StudentId,x.StudentName,x.RollNo,x.GroupName,x.SectionName,x.TotalMarks,x.Percentage
 FROM (SELECT s.StudentId,s.StudentName,s.RollNo,COALESCE(g.GroupName,'') GroupName,COALESCE(se.SectionName,s.Section) SectionName,SUM(r.TotalMarks) TotalMarks,ROUND(AVG(r.TotalMarks),2) Percentage
       FROM Results r JOIN Students s ON s.StudentId=r.StudentId LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN Sections se ON se.SectionId=s.SectionId
       WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId)
       GROUP BY s.StudentId,s.StudentName,s.RollNo,g.GroupName,se.SectionName,s.Section) x
 ORDER BY Rank LIMIT 20;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Subjects;
CREATE PROCEDURE sp_Report_Subjects(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT r.SubjectId,COALESCE(su.SubjectName,'') SubjectName,COUNT(*) Students,ROUND(AVG(r.TotalMarks),2) AverageMarks,ROUND(SUM(r.ResultStatus IN ('Pass','Passed','PASS'))*100.0/NULLIF(COUNT(*),0),2) PassPercentage
 FROM Results r LEFT JOIN Subjects su ON su.SubjectId=r.SubjectId LEFT JOIN Students s ON s.StudentId=r.StudentId WHERE r.IsPublished=1 AND (p_BoardId IS NULL OR r.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR r.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR r.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR r.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) GROUP BY r.SubjectId,su.SubjectName ORDER BY su.SubjectName;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Groups;
CREATE PROCEDURE sp_Report_Groups(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT g.GroupId,g.GroupName,COUNT(DISTINCT s.StudentId) StudentCount,COALESCE(ROUND(AVG(r.TotalMarks),2),0) AveragePercentage,COALESCE(ROUND(SUM(r.ResultStatus IN ('Pass','Passed','PASS'))*100.0/NULLIF(COUNT(r.ResultId),0),2),0) PassPercentage
 FROM `Groups` g LEFT JOIN Students s ON s.GroupId=g.GroupId AND s.IsActive=1 LEFT JOIN Results r ON r.StudentId=s.StudentId AND r.IsPublished=1 WHERE g.IsActive=1 AND (p_AcademicYearId IS NULL OR g.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR EXISTS(SELECT 1 FROM AcademicLevels al WHERE al.AcademicLevelId=p_AcademicLevelId AND al.LevelName=g.AcademicLevel)) AND (p_GroupId IS NULL OR g.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) GROUP BY g.GroupId,g.GroupName ORDER BY g.GroupName;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_Sections;
CREATE PROCEDURE sp_Report_Sections(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT se.SectionId,se.SectionName,COALESCE(g.GroupName,se.`Group`) GroupName,COUNT(DISTINCT s.StudentId) StudentCount,COALESCE(ROUND(AVG(r.TotalMarks),2),0) AveragePercentage,COALESCE(ROUND(SUM(r.ResultStatus IN ('Pass','Passed','PASS'))*100.0/NULLIF(COUNT(r.ResultId),0),2),0) PassPercentage
 FROM Sections se LEFT JOIN `Groups` g ON g.GroupId=se.GroupId LEFT JOIN Students s ON s.SectionId=se.SectionId AND s.IsActive=1 LEFT JOIN Results r ON r.StudentId=s.StudentId AND r.IsPublished=1 WHERE se.IsActive=1 AND (p_BoardId IS NULL OR se.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR se.AcademicYearId=p_AcademicYearId) AND (p_GroupId IS NULL OR se.GroupId=p_GroupId) AND (p_SectionId IS NULL OR se.SectionId=p_SectionId) GROUP BY se.SectionId,se.SectionName,g.GroupName,se.`Group` ORDER BY se.SectionName;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_FacultyWorkload;
CREATE PROCEDURE sp_Report_FacultyWorkload(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT t.FacultyId,TRIM(CONCAT(COALESCE(f.FirstName,''),' ',COALESCE(f.LastName,''))) FacultyName,COUNT(*) PeriodCount,ROUND(SUM(TIMESTAMPDIFF(MINUTE,p.StartTime,p.EndTime))/60,2) HoursPerWeek
 FROM Timetables t JOIN Periods p ON p.PeriodId=t.PeriodId LEFT JOIN Faculties f ON f.Id=t.FacultyId WHERE t.IsPublished=1 AND p.IsBreak=0 AND (p_BoardId IS NULL OR t.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR t.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR t.AcademicLevelId=p_AcademicLevelId) AND (p_GroupId IS NULL OR t.GroupId=p_GroupId) AND (p_SectionId IS NULL OR t.SectionId=p_SectionId) GROUP BY t.FacultyId,f.FirstName,f.LastName ORDER BY HoursPerWeek DESC;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_StudentPerformance;
CREATE PROCEDURE sp_Report_StudentPerformance(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT s.StudentId,s.AdmissionNo,s.RollNo,s.StudentName,COALESCE(ROUND(AVG(r.TotalMarks),2),0) AveragePercentage,SUM(r.ResultStatus IN ('Pass','Passed','PASS')) PassedSubjects,SUM(r.ResultStatus NOT IN ('Pass','Passed','PASS')) FailedSubjects,s.AttendancePercentage,MAX(r.Grade) Grade
 FROM Students s LEFT JOIN Results r ON r.StudentId=s.StudentId AND r.IsPublished=1 WHERE s.IsActive=1 AND (p_BoardId IS NULL OR s.BoardId=p_BoardId) AND (p_AcademicYearId IS NULL OR s.AcademicYearId=p_AcademicYearId) AND (p_AcademicLevelId IS NULL OR EXISTS(SELECT 1 FROM AcademicLevels al WHERE al.AcademicLevelId=p_AcademicLevelId AND al.LevelName=s.AcademicLevel)) AND (p_GroupId IS NULL OR s.GroupId=p_GroupId) AND (p_SectionId IS NULL OR s.SectionId=p_SectionId) GROUP BY s.StudentId,s.AdmissionNo,s.RollNo,s.StudentName,s.AttendancePercentage ORDER BY AveragePercentage DESC;
END;$$

DROP PROCEDURE IF EXISTS sp_Report_AuditLogs;
CREATE PROCEDURE sp_Report_AuditLogs(IN p_BoardId INT,IN p_AcademicYearId INT,IN p_AcademicLevelId INT,IN p_GroupId INT,IN p_SectionId INT,IN p_FromDate DATETIME,IN p_ToDate DATETIME)
BEGIN
 SELECT AuditLogId,UserName,Action,EntityName,EntityId,Description,CreatedAt FROM AuditLogs WHERE (p_FromDate IS NULL OR CreatedAt>=p_FromDate) AND (p_ToDate IS NULL OR CreatedAt<=p_ToDate) ORDER BY CreatedAt DESC LIMIT 1000;
END;$$

DROP PROCEDURE IF EXISTS sp_GetCertificates;
CREATE PROCEDURE sp_GetCertificates(IN p_Search VARCHAR(150), IN p_Status VARCHAR(30))
BEGIN
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive
 FROM Certificates WHERE IsActive=1 AND (p_Status IS NULL OR p_Status='' OR p_Status='All' OR Status=p_Status) AND (p_Search IS NULL OR p_Search='' OR CertificateNumber LIKE CONCAT('%',p_Search,'%') OR AdmissionNo LIKE CONCAT('%',p_Search,'%') OR StudentName LIKE CONCAT('%',p_Search,'%') OR CertificateType LIKE CONCAT('%',p_Search,'%')) ORDER BY CertificateId DESC;
END;$$

DROP PROCEDURE IF EXISTS sp_GetCertificateById;
CREATE PROCEDURE sp_GetCertificateById(IN p_CertificateId INT)
BEGIN SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=p_CertificateId; END;$$

DROP PROCEDURE IF EXISTS sp_UpdateCertificate;
CREATE PROCEDURE sp_UpdateCertificate(IN p_CertificateId INT,IN p_StudentId INT,IN p_CertificateType VARCHAR(100),IN p_Purpose VARCHAR(250),IN p_Remarks VARCHAR(1000))
BEGIN
 IF NOT EXISTS(SELECT 1 FROM Certificates WHERE CertificateId=p_CertificateId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Certificate not found'; END IF;
 IF (SELECT Status FROM Certificates WHERE CertificateId=p_CertificateId) <> 'Generated' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only Generated certificates can be edited'; END IF;
 UPDATE Certificates c JOIN Students s ON s.StudentId=p_StudentId LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId SET c.StudentId=s.StudentId,c.AdmissionNo=s.AdmissionNo,c.StudentName=s.StudentName,c.GroupName=g.GroupName,c.AcademicLevel=s.AcademicLevel,c.AcademicYear=ay.AcademicYearName,c.CertificateType=TRIM(p_CertificateType),c.Purpose=TRIM(p_Purpose),c.Remarks=NULLIF(TRIM(p_Remarks),'') WHERE c.CertificateId=p_CertificateId AND s.IsActive=1;
 INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'UPDATE','Certificate',p_CertificateId,'Certificate updated');
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=p_CertificateId;
END;$$

DROP PROCEDURE IF EXISTS sp_GetCertificateHistory;
CREATE PROCEDURE sp_GetCertificateHistory(IN p_StudentId INT)
BEGIN SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE (p_StudentId IS NULL OR StudentId=p_StudentId) ORDER BY CertificateId DESC; END;$$

DROP PROCEDURE IF EXISTS sp_VerifyCertificate;
CREATE PROCEDURE sp_VerifyCertificate(IN p_CertificateNumber VARCHAR(40))
BEGIN SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateNumber=p_CertificateNumber AND IsActive=1 AND Status<>'Cancelled'; END;$$

DROP PROCEDURE IF EXISTS sp_ReissueCertificate;
CREATE PROCEDURE sp_ReissueCertificate(IN p_CertificateId INT,IN p_Remarks VARCHAR(1000))
BEGIN
 DECLARE v_OldNumber VARCHAR(40); DECLARE v_NewNumber VARCHAR(40); DECLARE v_NewCertificateId INT; DECLARE v_StudentId INT; DECLARE v_Type VARCHAR(100); DECLARE v_Purpose VARCHAR(250);
 SELECT CertificateNumber,StudentId,CertificateType,Purpose INTO v_OldNumber,v_StudentId,v_Type,v_Purpose FROM Certificates WHERE CertificateId=p_CertificateId;
 IF v_OldNumber IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Certificate not found'; END IF;
 SELECT CONCAT('CERT-',YEAR(CURRENT_DATE),'-',LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(CertificateNumber,'-',-1) AS UNSIGNED)),0)+1,4,'0')) INTO v_NewNumber FROM Certificates WHERE CertificateNumber LIKE CONCAT('CERT-',YEAR(CURRENT_DATE),'-%');
 UPDATE Certificates SET Status='Cancelled',IsActive=0,Remarks=CONCAT(COALESCE(Remarks,''),' Reissued as ',v_NewNumber) WHERE CertificateId=p_CertificateId;
 INSERT INTO Certificates(CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,IsActive)
 SELECT v_NewNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,NULLIF(TRIM(p_Remarks),''),'Generated',CURRENT_TIMESTAMP(6),1 FROM Certificates WHERE CertificateId=p_CertificateId;
 SET v_NewCertificateId=LAST_INSERT_ID();
 INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'REISSUE','Certificate',v_NewCertificateId,CONCAT('Reissued from ',v_OldNumber));
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=v_NewCertificateId;
END;$$

DROP PROCEDURE IF EXISTS sp_CancelCertificate;
CREATE PROCEDURE sp_CancelCertificate(IN p_CertificateId INT)
BEGIN
 IF NOT EXISTS(SELECT 1 FROM Certificates WHERE CertificateId=p_CertificateId) THEN SELECT 0; ELSEIF (SELECT Status FROM Certificates WHERE CertificateId=p_CertificateId)='Issued' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Issued certificates cannot be cancelled'; ELSE UPDATE Certificates SET Status='Cancelled',IsActive=0 WHERE CertificateId=p_CertificateId; INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'CANCEL','Certificate',p_CertificateId,'Certificate cancelled'); SELECT 1; END IF;
END;$$

DROP PROCEDURE IF EXISTS sp_MoveCertificateStatus;
CREATE PROCEDURE sp_MoveCertificateStatus(IN p_CertificateId INT,IN p_Status VARCHAR(30),IN p_IssuedBy VARCHAR(150))
BEGIN
 DECLARE v_Status VARCHAR(30); SELECT Status INTO v_Status FROM Certificates WHERE CertificateId=p_CertificateId;
 IF v_Status IS NULL THEN SELECT 0; ELSEIF p_Status='Reviewed' AND v_Status='Generated' THEN UPDATE Certificates SET Status='Reviewed',ReviewedAt=CURRENT_TIMESTAMP(6) WHERE CertificateId=p_CertificateId; INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(p_IssuedBy,'REVIEW','Certificate',p_CertificateId,'Certificate reviewed'); SELECT 1; ELSEIF p_Status='Approved' AND v_Status='Reviewed' THEN UPDATE Certificates SET Status='Approved',ApprovedAt=CURRENT_TIMESTAMP(6) WHERE CertificateId=p_CertificateId; INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(p_IssuedBy,'APPROVE','Certificate',p_CertificateId,'Certificate approved'); SELECT 1; ELSEIF p_Status='Issued' AND v_Status='Approved' THEN UPDATE Certificates SET Status='Issued',IssuedAt=CURRENT_TIMESTAMP(6),IssuedBy=p_IssuedBy WHERE CertificateId=p_CertificateId; INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(p_IssuedBy,'ISSUE','Certificate',p_CertificateId,'Certificate issued'); SELECT 1; ELSE SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid certificate status transition'; END IF;
END;$$

DROP PROCEDURE IF EXISTS sp_GenerateBonafideCertificate;
CREATE PROCEDURE sp_GenerateBonafideCertificate(IN p_StudentId INT,IN p_Purpose VARCHAR(250),IN p_IssueDate DATETIME,IN p_Remarks VARCHAR(1000))
BEGIN
 DECLARE v_Number VARCHAR(40); DECLARE v_CertificateId INT; DECLARE v_AdmissionNo VARCHAR(30); DECLARE v_StudentName VARCHAR(150); DECLARE v_GroupName VARCHAR(100); DECLARE v_Level VARCHAR(100); DECLARE v_Year VARCHAR(50);
 SELECT s.AdmissionNo,s.StudentName,g.GroupName,s.AcademicLevel,ay.AcademicYearName INTO v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year FROM Students s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE s.StudentId=p_StudentId AND s.IsActive=1 LIMIT 1;
 IF v_AdmissionNo IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student not found or inactive'; END IF;
 SELECT CONCAT('CERT-',YEAR(CURRENT_DATE),'-',LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(CertificateNumber,'-',-1) AS UNSIGNED)),0)+1,4,'0')) INTO v_Number FROM Certificates WHERE CertificateNumber LIKE CONCAT('CERT-',YEAR(CURRENT_DATE),'-%');
 INSERT INTO Certificates(CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,IssuedAt,IsActive) VALUES(v_Number,p_StudentId,v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year,'Bonafide Certificate',TRIM(p_Purpose),NULLIF(TRIM(p_Remarks),''),'Generated',CURRENT_TIMESTAMP(6),p_IssueDate,1);
 SET v_CertificateId=LAST_INSERT_ID();
 INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'GENERATE','Certificate',v_CertificateId,CONCAT('Bonafide Certificate generated for ',v_StudentName));
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=v_CertificateId;
END$$

DROP PROCEDURE IF EXISTS sp_GenerateStudyCertificate;
CREATE PROCEDURE sp_GenerateStudyCertificate(IN p_StudentId INT,IN p_Purpose VARCHAR(250),IN p_IssueDate DATETIME,IN p_Remarks VARCHAR(1000))
BEGIN
 DECLARE v_Number VARCHAR(40); DECLARE v_CertificateId INT; DECLARE v_AdmissionNo VARCHAR(30); DECLARE v_StudentName VARCHAR(150); DECLARE v_GroupName VARCHAR(100); DECLARE v_Level VARCHAR(100); DECLARE v_Year VARCHAR(50);
 SELECT s.AdmissionNo,s.StudentName,g.GroupName,s.AcademicLevel,ay.AcademicYearName INTO v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year FROM Students s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE s.StudentId=p_StudentId AND s.IsActive=1 LIMIT 1;
 IF v_AdmissionNo IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student not found or inactive'; END IF;
 SELECT CONCAT('CERT-',YEAR(CURRENT_DATE),'-',LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(CertificateNumber,'-',-1) AS UNSIGNED)),0)+1,4,'0')) INTO v_Number FROM Certificates WHERE CertificateNumber LIKE CONCAT('CERT-',YEAR(CURRENT_DATE),'-%');
 INSERT INTO Certificates(CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,IssuedAt,IsActive) VALUES(v_Number,p_StudentId,v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year,'Study Certificate',TRIM(p_Purpose),NULLIF(TRIM(p_Remarks),''),'Generated',CURRENT_TIMESTAMP(6),p_IssueDate,1);
 SET v_CertificateId=LAST_INSERT_ID();
 INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'GENERATE','Certificate',v_CertificateId,CONCAT('Study Certificate generated for ',v_StudentName));
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=v_CertificateId;
END$$

DROP PROCEDURE IF EXISTS sp_GenerateConductCertificate;
CREATE PROCEDURE sp_GenerateConductCertificate(IN p_StudentId INT,IN p_Purpose VARCHAR(250),IN p_IssueDate DATETIME,IN p_Remarks VARCHAR(1000))
BEGIN
 DECLARE v_Number VARCHAR(40); DECLARE v_CertificateId INT; DECLARE v_AdmissionNo VARCHAR(30); DECLARE v_StudentName VARCHAR(150); DECLARE v_GroupName VARCHAR(100); DECLARE v_Level VARCHAR(100); DECLARE v_Year VARCHAR(50);
 SELECT s.AdmissionNo,s.StudentName,g.GroupName,s.AcademicLevel,ay.AcademicYearName INTO v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year FROM Students s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE s.StudentId=p_StudentId AND s.IsActive=1 LIMIT 1;
 IF v_AdmissionNo IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student not found or inactive'; END IF;
 SELECT CONCAT('CERT-',YEAR(CURRENT_DATE),'-',LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(CertificateNumber,'-',-1) AS UNSIGNED)),0)+1,4,'0')) INTO v_Number FROM Certificates WHERE CertificateNumber LIKE CONCAT('CERT-',YEAR(CURRENT_DATE),'-%');
 INSERT INTO Certificates(CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,IssuedAt,IsActive) VALUES(v_Number,p_StudentId,v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year,'Conduct Certificate',TRIM(p_Purpose),NULLIF(TRIM(p_Remarks),''),'Generated',CURRENT_TIMESTAMP(6),p_IssueDate,1);
 SET v_CertificateId=LAST_INSERT_ID();
 INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'GENERATE','Certificate',v_CertificateId,CONCAT('Conduct Certificate generated for ',v_StudentName));
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=v_CertificateId;
END$$

DROP PROCEDURE IF EXISTS sp_GenerateFeeCertificate;
CREATE PROCEDURE sp_GenerateFeeCertificate(IN p_StudentId INT,IN p_Purpose VARCHAR(250),IN p_IssueDate DATETIME,IN p_Remarks VARCHAR(1000))
BEGIN
 DECLARE v_Number VARCHAR(40); DECLARE v_CertificateId INT; DECLARE v_AdmissionNo VARCHAR(30); DECLARE v_StudentName VARCHAR(150); DECLARE v_GroupName VARCHAR(100); DECLARE v_Level VARCHAR(100); DECLARE v_Year VARCHAR(50);
 SELECT s.AdmissionNo,s.StudentName,g.GroupName,s.AcademicLevel,ay.AcademicYearName INTO v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year FROM Students s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE s.StudentId=p_StudentId AND s.IsActive=1 LIMIT 1;
 IF v_AdmissionNo IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student not found or inactive'; END IF;
 SELECT CONCAT('CERT-',YEAR(CURRENT_DATE),'-',LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(CertificateNumber,'-',-1) AS UNSIGNED)),0)+1,4,'0')) INTO v_Number FROM Certificates WHERE CertificateNumber LIKE CONCAT('CERT-',YEAR(CURRENT_DATE),'-%');
 INSERT INTO Certificates(CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,IssuedAt,IsActive) VALUES(v_Number,p_StudentId,v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year,'Fee Certificate',TRIM(p_Purpose),NULLIF(TRIM(p_Remarks),''),'Generated',CURRENT_TIMESTAMP(6),p_IssueDate,1);
 SET v_CertificateId=LAST_INSERT_ID();
 INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'GENERATE','Certificate',v_CertificateId,CONCAT('Fee Certificate generated for ',v_StudentName));
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=v_CertificateId;
END$$

DROP PROCEDURE IF EXISTS sp_GenerateTransferCertificate;
CREATE PROCEDURE sp_GenerateTransferCertificate(IN p_StudentId INT,IN p_Purpose VARCHAR(250),IN p_IssueDate DATETIME,IN p_Remarks VARCHAR(1000))
BEGIN
 DECLARE v_Number VARCHAR(40); DECLARE v_CertificateId INT; DECLARE v_AdmissionNo VARCHAR(30); DECLARE v_StudentName VARCHAR(150); DECLARE v_GroupName VARCHAR(100); DECLARE v_Level VARCHAR(100); DECLARE v_Year VARCHAR(50);
 SELECT s.AdmissionNo,s.StudentName,g.GroupName,s.AcademicLevel,ay.AcademicYearName INTO v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year FROM Students s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE s.StudentId=p_StudentId AND s.IsActive=1 LIMIT 1;
 IF v_AdmissionNo IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student not found or inactive'; END IF;
 SELECT CONCAT('CERT-',YEAR(CURRENT_DATE),'-',LPAD(COALESCE(MAX(CAST(SUBSTRING_INDEX(CertificateNumber,'-',-1) AS UNSIGNED)),0)+1,4,'0')) INTO v_Number FROM Certificates WHERE CertificateNumber LIKE CONCAT('CERT-',YEAR(CURRENT_DATE),'-%');
 INSERT INTO Certificates(CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,IssuedAt,IsActive) VALUES(v_Number,p_StudentId,v_AdmissionNo,v_StudentName,v_GroupName,v_Level,v_Year,'Transfer Certificate',TRIM(p_Purpose),NULLIF(TRIM(p_Remarks),''),'Generated',CURRENT_TIMESTAMP(6),p_IssueDate,1);
 SET v_CertificateId=LAST_INSERT_ID();
 INSERT INTO AuditLogs(UserName,Action,EntityName,EntityId,Description) VALUES(NULL,'GENERATE','Certificate',v_CertificateId,CONCAT('Transfer Certificate generated for ',v_StudentName));
 SELECT CertificateId,CertificateNumber,StudentId,AdmissionNo,StudentName,GroupName,AcademicLevel,AcademicYear,CertificateType,Purpose,Remarks,Status,GeneratedAt,ReviewedAt,ApprovedAt,IssuedAt,IssuedBy,IsActive FROM Certificates WHERE CertificateId=v_CertificateId;
END$$

DELIMITER ;
