DROP PROCEDURE IF EXISTS sp_GetAllAdmissions;
DELIMITER //
CREATE PROCEDURE sp_GetAllAdmissions()
BEGIN
    SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, s.SectionName
    FROM StudentAdmissions sa
    LEFT JOIN Boards b ON sa.BoardId=b.BoardId
    LEFT JOIN AcademicYears ay ON sa.AcademicYearId=ay.AcademicYearId
    LEFT JOIN `Groups` g ON sa.GroupId=g.GroupId
    LEFT JOIN Sections s ON sa.SectionId=s.SectionId
    WHERE sa.IsActive = 1
    ORDER BY sa.AdmissionId DESC;
END //
DELIMITER ;
