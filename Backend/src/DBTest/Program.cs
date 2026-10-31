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
            conn.Open();
            string sql = @"
DROP PROCEDURE IF EXISTS `sp_GetCertificates`;
CREATE PROCEDURE `sp_GetCertificates`(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_CertificateType VARCHAR(100)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS S_AdmissionNo,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS S_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS S_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS S_MotherName,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS S_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS S_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS S_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS S_AcademicYear,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS S_SectionName,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS S_BoardName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS S_DateOfBirth,
        c.CertificateType,
        c.Purpose,
        COALESCE(c.RequestDate, c.IssueDate, c.CreatedAt) AS RequestDate,
        COALESCE(c.IssueDate, c.RequestDate, c.CreatedAt) AS IssueDate,
        c.Remarks,
        CASE WHEN c.Status = 'Active' THEN 'Generated' ELSE c.Status END AS Status,
        COALESCE(c.GeneratedAt, c.CreatedAt) AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.Status != 'Deleted'
      AND (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' 
           OR c.Status = p_Status 
           OR (p_Status = 'Generated' AND c.Status = 'Active'))
      AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType = p_CertificateType)
      AND (p_Search IS NULL OR p_Search = '' 
           OR c.CertificateNo LIKE CONCAT('%', p_Search, '%')
           OR c.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR sa.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR c.StudentName LIKE CONCAT('%', p_Search, '%')
           OR s.StudentName LIKE CONCAT('%', p_Search, '%')
           OR CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, '')) LIKE CONCAT('%', p_Search, '%')
           OR c.CertificateType LIKE CONCAT('%', p_Search, '%')
           OR c.Purpose LIKE CONCAT('%', p_Search, '%'))
    GROUP BY c.Id
    ORDER BY c.Id DESC;
END;

DROP PROCEDURE IF EXISTS `sp_DeleteCertificate`;
CREATE PROCEDURE `sp_DeleteCertificate`(
    IN p_CertificateId INT
)
BEGIN
    DELETE FROM `certificates`
    WHERE `Id` = p_CertificateId;

    SELECT ROW_COUNT() AS AffectedRows;
END;
";
            using (var cmd = new MySqlCommand(sql, conn))
            {
                cmd.ExecuteNonQuery();
                Console.WriteLine("Successfully patched sp_GetCertificates and sp_DeleteCertificate.");
            }
        }
    }
}
