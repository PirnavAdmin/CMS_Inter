DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_GetCampusAffiliatedBoards`$$

CREATE PROCEDURE `sp_GetCampusAffiliatedBoards`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        b.`BoardId`,
        b.`BoardCode`,
        b.`BoardName`,
        b.`BoardType`,
        b.`Description`,
        b.`IsActive`
    FROM `CampusBoards` cb
    INNER JOIN `Boards` b ON cb.`BoardId` = b.`BoardId`
    WHERE cb.`CampusId` = p_CampusId 
      AND cb.`IsActive` = 1 
      AND b.`IsActive` = 1
    ORDER BY b.`BoardName` ASC;
END$$

DELIMITER ;
