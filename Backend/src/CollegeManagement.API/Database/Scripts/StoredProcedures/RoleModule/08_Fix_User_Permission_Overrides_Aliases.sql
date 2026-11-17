-- ====================================================================================
-- 08_Fix_User_Permission_Overrides_Aliases.sql
-- Fix sp_SaveUserPermissionOverrides to resolve SubModule aliases via ModuleKeyAliases
-- Ensures user overrides for role-specific sidebar modules (warden-*, parent-*, driver-*, profile)
-- correctly match canonical SubModule names in Permissions table.
-- ====================================================================================

DROP PROCEDURE IF EXISTS `sp_SaveUserPermissionOverrides`;
DELIMITER //

CREATE DEFINER="avnadmin"@"%" PROCEDURE `sp_SaveUserPermissionOverrides`(
    IN p_UserId INT,
    IN p_OverridesJson JSON,
    IN p_AdminUserId INT,
    IN p_Notes VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF NOT EXISTS (SELECT 1 FROM `Users` WHERE `UserId` = p_UserId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User was not found.';
    END IF;

    START TRANSACTION;

    DROP TEMPORARY TABLE IF EXISTS tmp_user_overrides;
    CREATE TEMPORARY TABLE tmp_user_overrides (
        SubModule VARCHAR(100),
        ScreenCode VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );

    INSERT INTO tmp_user_overrides (SubModule, ScreenCode, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        COALESCE(mka.CanonicalSubModule, jt.SubModule),
        COALESCE(NULLIF(jt.ScreenCode, ''), COALESCE(jt.ScreenId, '')),
        IF(jt.CanView = 1, 1, 0),
        IF(jt.CanAdd = 1, 1, 0),
        IF(jt.CanEdit = 1, 1, 0),
        IF(jt.CanDelete = 1, 1, 0)
    FROM JSON_TABLE(
        p_OverridesJson,
        '$[*]' COLUMNS(
            SubModule VARCHAR(100) PATH '$.SubModule',
            ScreenCode VARCHAR(100) PATH '$.ScreenCode',
            ScreenId VARCHAR(100) PATH '$.ScreenId',
            CanView INT PATH '$.CanView',
            CanAdd INT PATH '$.CanAdd',
            CanEdit INT PATH '$.CanEdit',
            CanDelete INT PATH '$.CanDelete'
        )
    ) jt
    LEFT JOIN `ModuleKeyAliases` mka ON LOWER(mka.AliasKey) = LOWER(TRIM(jt.SubModule));

    -- Upsert View
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanView, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (LOWER(t.ScreenCode) = LOWER(p.ScreenCode) OR LOWER(t.ScreenCode) = LOWER(COALESCE(p.Screen, ''))))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE p.Action = 'View'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Add
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanAdd, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (LOWER(t.ScreenCode) = LOWER(p.ScreenCode) OR LOWER(t.ScreenCode) = LOWER(COALESCE(p.Screen, ''))))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE p.Action = 'Add'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Edit
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanEdit, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (LOWER(t.ScreenCode) = LOWER(p.ScreenCode) OR LOWER(t.ScreenCode) = LOWER(COALESCE(p.Screen, ''))))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE p.Action = 'Edit'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Delete
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanDelete, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (LOWER(t.ScreenCode) = LOWER(p.ScreenCode) OR LOWER(t.ScreenCode) = LOWER(COALESCE(p.Screen, ''))))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE p.Action = 'Delete'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    DROP TEMPORARY TABLE IF EXISTS tmp_user_overrides;

    COMMIT;
END //
DELIMITER ;
