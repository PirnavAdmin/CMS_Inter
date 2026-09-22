DROP PROCEDURE IF EXISTS sp_GetAdmissionById;
DELIMITER //
CREATE PROCEDURE sp_GetAdmissionById
(
    IN p_AdmissionId INT
)
BEGIN
    SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, s.SectionName
    FROM StudentAdmissions sa
    LEFT JOIN Boards b ON sa.BoardId=b.BoardId
    LEFT JOIN AcademicYears ay ON sa.AcademicYearId=ay.AcademicYearId
    LEFT JOIN `Groups` g ON sa.GroupId=g.GroupId
    LEFT JOIN Sections s ON sa.SectionId=s.SectionId
    WHERE sa.AdmissionId = p_AdmissionId;
END //
DELIMITER ;
