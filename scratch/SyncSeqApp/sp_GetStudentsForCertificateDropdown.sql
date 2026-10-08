CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GetStudentsForCertificateDropdown`()
BEGIN
    SELECT 
        StudentId, AdmissionNo, RollNo, StudentName, GroupName, AcademicYear, AcademicLevel, Section
    FROM (
        SELECT 
            s.StudentId AS StudentId,
            COALESCE(NULLIF(s.AdmissionNo, ''), CONCAT('ADM-', s.StudentId)) AS AdmissionNo,
            COALESCE(s.RollNo, '') AS RollNo,
            COALESCE(NULLIF(s.StudentName, ''), 'Student') AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            COALESCE(al.LevelName, '1st Year') AS AcademicLevel,
            COALESCE(sec.SectionName, '') AS Section,
            COALESCE(s.IsActive, 1) AS IsActive
        FROM `Students` s
        LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
        LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
        LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId

        UNION ALL

        SELECT 
            sa.AdmissionId AS StudentId,
            COALESCE(NULLIF(sa.AdmissionNo, ''), CONCAT('ADM-', sa.AdmissionId)) AS AdmissionNo,
            '' AS RollNo,
            TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))) AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            '1st Year' AS AcademicLevel,
            '' AS Section,
            COALESCE(sa.IsActive, 1) AS IsActive
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        WHERE NOT EXISTS (SELECT 1 FROM `Students` s2 WHERE s2.AdmissionNo = sa.AdmissionNo AND sa.AdmissionNo IS NOT NULL AND sa.AdmissionNo <> '')
    ) combined
    WHERE IsActive = 1
    ORDER BY StudentName ASC;
END