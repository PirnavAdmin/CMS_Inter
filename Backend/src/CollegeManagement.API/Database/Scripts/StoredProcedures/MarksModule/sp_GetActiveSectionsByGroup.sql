DROP PROCEDURE IF EXISTS `sp_GetActiveSectionsByGroup`;
DELIMITER //
CREATE PROCEDURE `sp_GetActiveSectionsByGroup`(
    IN p_GroupId INT
)
BEGIN
    SELECT 
        SectionId AS sectionId, 
        SectionName AS sectionName 
    FROM `Sections` 
    WHERE GroupId = p_GroupId AND IsActive = 1 
    ORDER BY SectionName;
END //
DELIMITER ;
