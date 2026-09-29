DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_GetActiveHeaderCampuses`$$

CREATE PROCEDURE `sp_GetActiveHeaderCampuses`()
BEGIN
    SELECT 
        c.`CampusId`,
        c.`CampusName`,
        c.`CampusCode`,
        c.`IsHQ`,
        c.`IsActive`,
        c.`DisplayOrder`,
        (
            SELECT GROUP_CONCAT(b.`BoardId` SEPARATOR ',')
            FROM `CampusBoards` cb
            INNER JOIN `Boards` b ON cb.`BoardId` = b.`BoardId`
            WHERE cb.`CampusId` = c.`CampusId` AND cb.`IsActive` = 1 AND b.`IsActive` = 1
        ) AS `AffiliatedBoardIds`
    FROM `Campuses` c
    WHERE c.`IsActive` = 1
    ORDER BY c.`IsHQ` DESC, c.`DisplayOrder` ASC, c.`CampusName` ASC;
END$$

DELIMITER ;
