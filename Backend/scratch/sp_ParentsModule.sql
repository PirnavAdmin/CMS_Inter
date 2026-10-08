DELIMITER //

CREATE PROCEDURE sp_GetParentChildren(IN p_ParentUserId INT)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        IFNULL(s.RollNo, '') AS RollNo,
        s.AdmissionNo,
        IFNULL(g.GroupName, '') AS ClassName,
        IFNULL(sec.SectionName, '') AS SectionName,
        IFNULL(s.Photo, '') AS PhotoUrl,
        s.Status
    FROM ParentStudentMappings psm
    INNER JOIN Students s ON psm.StudentId = s.StudentId
    LEFT JOIN Groups g ON s.GroupId = g.GroupId
    LEFT JOIN Sections sec ON s.SectionId = sec.SectionId
    WHERE psm.ParentUserId = p_ParentUserId
      AND s.IsActive = 1;
END //

CREATE PROCEDURE sp_CheckParentStudentMapping(IN p_ParentUserId INT, IN p_StudentId INT)
BEGIN
    SELECT COUNT(1)
    FROM ParentStudentMappings
    WHERE ParentUserId = p_ParentUserId AND StudentId = p_StudentId;
END //

DELIMITER ;
