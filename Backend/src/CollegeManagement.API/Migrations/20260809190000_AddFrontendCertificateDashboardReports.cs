using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations;

[Migration("20260809190000_AddFrontendCertificateDashboardReports")]
public partial class AddFrontendCertificateDashboardReports : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS `Certificates` (
  `CertificateId` int NOT NULL AUTO_INCREMENT,
  `CertificateNumber` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
  `StudentId` int NOT NULL,
  `AdmissionNo` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
  `StudentName` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
  `GroupName` varchar(100) CHARACTER SET utf8mb4 NULL,
  `AcademicLevel` varchar(100) CHARACTER SET utf8mb4 NULL,
  `AcademicYear` varchar(50) CHARACTER SET utf8mb4 NULL,
  `CertificateType` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
  `Purpose` varchar(250) CHARACTER SET utf8mb4 NOT NULL,
  `Remarks` varchar(1000) CHARACTER SET utf8mb4 NULL,
  `Status` varchar(30) CHARACTER SET utf8mb4 NOT NULL DEFAULT 'Generated',
  `GeneratedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `ReviewedAt` datetime(6) NULL,
  `ApprovedAt` datetime(6) NULL,
  `IssuedAt` datetime(6) NULL,
  `IssuedBy` varchar(150) CHARACTER SET utf8mb4 NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT 1,
  CONSTRAINT `PK_Certificates` PRIMARY KEY (`CertificateId`),
  UNIQUE KEY `IX_Certificates_CertificateNumber` (`CertificateNumber`),
  KEY `IX_Certificates_StudentId` (`StudentId`),
  KEY `IX_Certificates_Status` (`Status`),
  CONSTRAINT `FK_Certificates_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;");

        migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetCertificates;
CREATE PROCEDURE sp_GetCertificates(IN p_Search VARCHAR(150), IN p_Status VARCHAR(30))
BEGIN
    SELECT CertificateId, CertificateNumber, StudentId, AdmissionNo, StudentName, GroupName, AcademicLevel, AcademicYear,
           CertificateType, Purpose, Remarks, Status, GeneratedAt, ReviewedAt, ApprovedAt, IssuedAt, IssuedBy, IsActive
    FROM Certificates
    WHERE (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR Status = p_Status)
      AND (p_Search IS NULL OR p_Search = '' OR CertificateNumber LIKE CONCAT('%',p_Search,'%')
           OR AdmissionNo LIKE CONCAT('%',p_Search,'%') OR StudentName LIKE CONCAT('%',p_Search,'%')
           OR CertificateType LIKE CONCAT('%',p_Search,'%'))
    ORDER BY CertificateId DESC;
END;");

        migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetCertificateById;
CREATE PROCEDURE sp_GetCertificateById(IN p_CertificateId INT)
BEGIN SELECT * FROM Certificates WHERE CertificateId = p_CertificateId; END;");

        migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetDashboardSummary;
CREATE PROCEDURE sp_GetDashboardSummary()
BEGIN
 SELECT (SELECT COUNT(*) FROM Students WHERE IsActive=1) AS TotalStudents,
        (SELECT COUNT(*) FROM Faculties WHERE IsActive=1) AS TotalFaculty,
        (SELECT COUNT(*) FROM Groups WHERE IsActive=1) AS TotalGroups,
        (SELECT COUNT(*) FROM Subjects WHERE IsActive=1) AS TotalSubjects,
        (SELECT COUNT(*) FROM Sections WHERE IsActive=1) AS TotalSections,
        (SELECT COUNT(*) FROM StudentAdmissions WHERE IsActive=1 AND IsApproved=0 AND IsRejected=0) AS PendingAdmissions;
END;");

        migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetReportSummary;
CREATE PROCEDURE sp_GetReportSummary()
BEGIN
 SELECT (SELECT COUNT(*) FROM Students WHERE IsActive=1) AS Students,
        (SELECT COUNT(*) FROM StudentAdmissions) AS Admissions,
        (SELECT COUNT(*) FROM StudentAdmissions WHERE IsApproved=1) AS ApprovedAdmissions,
        (SELECT COUNT(*) FROM StudentAdmissions WHERE IsRejected=1) AS RejectedAdmissions,
        (SELECT COUNT(*) FROM Faculties WHERE IsActive=1) AS Faculty,
        (SELECT COUNT(*) FROM Subjects WHERE IsActive=1) AS Subjects,
        (SELECT COUNT(*) FROM Groups WHERE IsActive=1) AS GroupsCount,
        (SELECT COUNT(*) FROM Sections WHERE IsActive=1) AS SectionsCount,
        (SELECT COALESCE(SUM(Amount),0) FROM FeeCollections WHERE Status <> 'Inactive') AS TotalFeeCollected;
END;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetCertificates;");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetCertificateById;");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetDashboardSummary;");
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetReportSummary;");
        migrationBuilder.Sql("DROP TABLE IF EXISTS Certificates;");
    }
}
