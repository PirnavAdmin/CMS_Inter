DROP PROCEDURE IF EXISTS sp_CreateSubject;
DELIMITER //
CREATE PROCEDURE sp_CreateSubject(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_SubjectName VARCHAR(100),
    IN p_SubjectCode VARCHAR(50),
    IN p_SubjectType VARCHAR(30),
    IN p_TheoryMarks DECIMAL(10,2),
    IN p_PracticalMarks DECIMAL(10,2),
    IN p_InternalMarks DECIMAL(10,2),
    IN p_ExternalMarks DECIMAL(10,2),
    IN p_MaximumMarks DECIMAL(10,2),
    IN p_PassingMarks DECIMAL(10,2),
    IN p_Credits INT,
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    INSERT INTO Subjects
    (
        BoardId,
        AcademicYearId,
        AcademicLevel,
        GroupId,
        SubjectName,
        SubjectCode,
        SubjectType,
        TheoryMarks,
        PracticalMarks,
        InternalMarks,
        ExternalMarks,
        MaximumMarks,
        PassingMarks,
        Credits,
        Description,
        IsActive,
        CreatedAt
    )
    VALUES
    (
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevel,
        p_GroupId,
        p_SubjectName,
        p_SubjectCode,
        p_SubjectType,
        p_TheoryMarks,
        p_PracticalMarks,
        p_InternalMarks,
        p_ExternalMarks,
        p_MaximumMarks,
        p_PassingMarks,
        p_Credits,
        p_Description,
        p_IsActive,
        NOW()
    );

    SELECT
        s.SubjectId,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevel,
        s.GroupId,
        g.GroupName,
        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,
        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,
        s.Credits,
        s.Description,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    WHERE s.SubjectId = LAST_INSERT_ID();
END //
DELIMITER ;
