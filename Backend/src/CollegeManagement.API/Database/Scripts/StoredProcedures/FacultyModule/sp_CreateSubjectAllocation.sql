DROP PROCEDURE IF EXISTS sp_CreateSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_CreateSubjectAllocation(
    IN p_FacultyId INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT
)
BEGIN
    INSERT INTO FacultySubjectAllocations (
        FacultyId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, SubjectId, CreatedAt
    ) VALUES (
        p_FacultyId, p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, p_SectionId, p_SubjectId, NOW()
    );
    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;
