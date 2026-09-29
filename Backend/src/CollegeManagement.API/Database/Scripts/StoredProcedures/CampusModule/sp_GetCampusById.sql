DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_GetCampusById`$$

CREATE PROCEDURE `sp_GetCampusById`(
    IN p_CampusId INT
)
BEGIN
    -- Result 1: Campus details
    SELECT 
        c.`CampusId`,
        c.`CampusName`,
        c.`CampusCode`,
        c.`Address`,
        c.`ContactPhone`,
        c.`Email`,
        c.`IsHQ`,
        c.`IsActive`,
        c.`DisplayOrder`,
        c.`CreatedAt`,
        c.`UpdatedAt`,
        (SELECT COUNT(1) FROM `Students` s WHERE s.`CampusId` = c.`CampusId` AND (s.`IsActive` = 1 OR s.`IsActive` IS NULL)) AS `StudentCount`
    FROM `Campuses` c
    WHERE c.`CampusId` = p_CampusId
    LIMIT 1;

    -- Result 2: Affiliated Boards
    SELECT 
        b.`BoardId`,
        b.`BoardCode`,
        b.`BoardName`,
        cb.`IsActive`
    FROM `CampusBoards` cb
    INNER JOIN `Boards` b ON cb.`BoardId` = b.`BoardId`
    WHERE cb.`CampusId` = p_CampusId AND cb.`IsActive` = 1
    ORDER BY b.`BoardName` ASC;
END$$

DELIMITER ;
