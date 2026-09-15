DROP PROCEDURE IF EXISTS `sp_GetActiveSubjectsByGroup`;
DELIMITER //
CREATE PROCEDURE `sp_GetActiveSubjectsByGroup`(
    IN p_GroupId INT
)
BEGIN
    SELECT 
        SubjectId AS subjectId, 
        SubjectName AS subjectName, 
        SubjectCode AS subjectCode 
    FROM `Subjects` 
    WHERE GroupId = p_GroupId AND IsActive = 1 
    ORDER BY SubjectName;
END //
DELIMITER ;
