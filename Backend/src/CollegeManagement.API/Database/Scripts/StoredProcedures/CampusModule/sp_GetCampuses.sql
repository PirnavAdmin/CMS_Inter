DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_GetCampuses`$$

CREATE PROCEDURE `sp_GetCampuses`(
    IN p_Search VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive TINYINT,
    IN p_BoardId INT
)
BEGIN
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
        (SELECT COUNT(1) FROM `Students` s WHERE s.`CampusId` = c.`CampusId` AND (s.`IsActive` = 1 OR s.`IsActive` IS NULL)) AS `StudentCount`,
        (
            SELECT GROUP_CONCAT(CONCAT(b.`BoardId`, ':', b.`BoardCode`, ':', b.`BoardName`) SEPARATOR '||')
            FROM `CampusBoards` cb
            INNER JOIN `Boards` b ON cb.`BoardId` = b.`BoardId`
            WHERE cb.`CampusId` = c.`CampusId` AND cb.`IsActive` = 1
        ) AS `AffiliatedBoardsRaw`
    FROM `Campuses` c
    WHERE (p_Search IS NULL OR p_Search = '' OR 
           c.`CampusName` COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_Search, '%') OR 
           c.`CampusCode` COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_Search, '%') OR 
           c.`Address` COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_Search, '%') OR 
           c.`Email` COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_Search, '%') OR
           EXISTS (
               SELECT 1 FROM `CampusBoards` cb2 
               INNER JOIN `Boards` b2 ON cb2.`BoardId` = b2.`BoardId` 
               WHERE cb2.`CampusId` = c.`CampusId` AND (
                   b2.`BoardCode` COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_Search, '%') OR 
                   b2.`BoardName` COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_Search, '%')
               )
           ))
      AND (p_IsActive IS NULL OR c.`IsActive` = p_IsActive)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR EXISTS (
           SELECT 1 FROM `CampusBoards` cb3 WHERE cb3.`CampusId` = c.`CampusId` AND cb3.`BoardId` = p_BoardId AND cb3.`IsActive` = 1
      ))
    ORDER BY c.`IsHQ` DESC, c.`DisplayOrder` ASC, c.`CampusName` ASC;
END$$

DELIMITER ;
