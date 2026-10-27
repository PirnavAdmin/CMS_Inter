-- =========================================================================
-- 05_Precise_Screen_Level_Sync_Fix.sql
-- Fixes cross-talk join between module-level summary records and individual screen records.
-- Guarantees that toggling screens or modules persists without unintentional overrides.
-- =========================================================================

DROP PROCEDURE IF EXISTS sp_UpdateRolePermissions;

DELIMITER //

CREATE DEFINER="avnadmin"@"%" PROCEDURE sp_UpdateRolePermissions(
    IN p_RoleId INT,
    IN p_PermissionsJson LONGTEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;
    CREATE TEMPORARY TABLE tmp_module_updates (
        SubModule VARCHAR(100),
        ScreenId VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );

    -- Parse JSON input with ScreenId support
    INSERT INTO tmp_module_updates (SubModule, ScreenId, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        jt.SubModule,
        COALESCE(jt.ScreenId, ''),
        IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) AS CanView,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanAdd = 1, 1, 0) AS CanAdd,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanEdit = 1, 1, 0) AS CanEdit,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanDelete = 1, 1, 0) AS CanDelete
    FROM JSON_TABLE(
        p_PermissionsJson,
        '$[*]' COLUMNS(
            SubModule VARCHAR(100) PATH '$.SubModule',
            ScreenId VARCHAR(100) PATH '$.ScreenId',
            CanView INT PATH '$.CanView',
            CanAdd INT PATH '$.CanAdd',
            CanEdit INT PATH '$.CanEdit',
            CanDelete INT PATH '$.CanDelete'
        )
    ) jt;

    -- 1. Delete existing RolePermissions for the specific submodules & screens being updated
    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (LOWER(t.ScreenId) = LOWER(p.ScreenCode) OR LOWER(t.ScreenId) = LOWER(COALESCE(p.Screen, ''))))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenId = '')
        )
    WHERE rp.RoleId = p_RoleId;

    -- 2. Insert enabled permissions for this role
    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (LOWER(t.ScreenId) = LOWER(p.ScreenCode) OR LOWER(t.ScreenId) = LOWER(COALESCE(p.Screen, ''))))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenId = '')
        )
    WHERE (
          (p.Action = 'View' AND t.CanView = 1)
       OR (p.Action = 'Add' AND t.CanAdd = 1)
       OR (p.Action = 'Edit' AND t.CanEdit = 1)
       OR (p.Action = 'Delete' AND t.CanDelete = 1)
    );

    -- 3. Auto-sync newly granted submodules into RoleModules
    INSERT IGNORE INTO `RoleModules` (`RoleId`, `SubModule`, `ModuleKey`, `CreatedAt`)
    SELECT DISTINCT 
        p_RoleId, 
        p.SubModule, 
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')), 
        UTC_TIMESTAMP()
    FROM tmp_module_updates t
    INNER JOIN `Permissions` p ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE t.CanView = 1 OR t.CanAdd = 1 OR t.CanEdit = 1 OR t.CanDelete = 1;

    -- 4. Clean up RoleModules if all permissions for an updated submodule were revoked
    DELETE rm FROM `RoleModules` rm
    WHERE rm.RoleId = p_RoleId
      AND EXISTS (
          SELECT 1 FROM tmp_module_updates t 
          WHERE LOWER(t.SubModule) = LOWER(rm.SubModule)
      )
      AND NOT EXISTS (
          SELECT 1 FROM `RolePermissions` rp
          INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
          WHERE rp.RoleId = p_RoleId AND LOWER(p.SubModule) = LOWER(rm.SubModule)
      );

    -- 5. Update Role timestamp
    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;

    COMMIT;
END //

DROP PROCEDURE IF EXISTS sp_SaveUserPermissionOverrides //

CREATE DEFINER="avnadmin"@"%" PROCEDURE sp_SaveUserPermissionOverrides(
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
        jt.SubModule,
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
    ) jt;

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
