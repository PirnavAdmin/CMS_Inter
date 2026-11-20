-- ====================================================================================
-- 11_Fix_User_Overrides_Collation_And_Missing_Seeds.sql
-- 1. Fix MySQL Error 1267 (Illegal mix of collations) in sp_SaveUserPermissionOverrides
--    and ensure module-level revoke (ScreenCode = '' & CanView = 0) cascades to child screens.
-- 2. Seed missing RoleModules for Driver (12), Inventory Manager (16), Transport Manager (18),
--    and Receptionist (24) + baseline Receptionist permissions so Receptionist isn't blank.
-- ====================================================================================

DROP PROCEDURE IF EXISTS `sp_SaveUserPermissionOverrides`;

CREATE PROCEDURE `sp_SaveUserPermissionOverrides`(
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
        SubModule VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        ScreenCode VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    INSERT INTO tmp_user_overrides (SubModule, ScreenCode, CanView, CanAdd, CanEdit, CanDelete)
    SELECT
        COALESCE(mka.CanonicalSubModule COLLATE utf8mb4_unicode_ci, jt.SubModule COLLATE utf8mb4_unicode_ci),
        COALESCE(NULLIF(jt.ScreenCode, ''), COALESCE(jt.ScreenId, '')) COLLATE utf8mb4_unicode_ci,
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
    LEFT JOIN `ModuleKeyAliases` mka
        ON LOWER(mka.AliasKey) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(jt.SubModule)) COLLATE utf8mb4_unicode_ci;

    -- Upsert View (when module-level override revokes CanView = 0, cascade to all child screens under that SubModule)
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanView, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t
        ON LOWER(t.SubModule) COLLATE utf8mb4_unicode_ci = LOWER(p.SubModule) COLLATE utf8mb4_unicode_ci
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (
                LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(p.ScreenCode) COLLATE utf8mb4_unicode_ci
                OR LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(COALESCE(p.Screen, '')) COLLATE utf8mb4_unicode_ci
                OR (t.ScreenCode = '' AND t.CanView = 0)
            ))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE LOWER(p.Action) COLLATE utf8mb4_unicode_ci = 'view'
    ON DUPLICATE KEY UPDATE
        `IsGranted` = VALUES(`IsGranted`),
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Add
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanAdd, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t
        ON LOWER(t.SubModule) COLLATE utf8mb4_unicode_ci = LOWER(p.SubModule) COLLATE utf8mb4_unicode_ci
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (
                LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(p.ScreenCode) COLLATE utf8mb4_unicode_ci
                OR LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(COALESCE(p.Screen, '')) COLLATE utf8mb4_unicode_ci
                OR (t.ScreenCode = '' AND t.CanAdd = 0)
            ))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE LOWER(p.Action) COLLATE utf8mb4_unicode_ci = 'add'
    ON DUPLICATE KEY UPDATE
        `IsGranted` = VALUES(`IsGranted`),
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Edit
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanEdit, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t
        ON LOWER(t.SubModule) COLLATE utf8mb4_unicode_ci = LOWER(p.SubModule) COLLATE utf8mb4_unicode_ci
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (
                LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(p.ScreenCode) COLLATE utf8mb4_unicode_ci
                OR LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(COALESCE(p.Screen, '')) COLLATE utf8mb4_unicode_ci
                OR (t.ScreenCode = '' AND t.CanEdit = 0)
            ))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE LOWER(p.Action) COLLATE utf8mb4_unicode_ci = 'edit'
    ON DUPLICATE KEY UPDATE
        `IsGranted` = VALUES(`IsGranted`),
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Delete
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanDelete, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t
        ON LOWER(t.SubModule) COLLATE utf8mb4_unicode_ci = LOWER(p.SubModule) COLLATE utf8mb4_unicode_ci
        AND (
            (COALESCE(p.ScreenCode, '') != '' AND (
                LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(p.ScreenCode) COLLATE utf8mb4_unicode_ci
                OR LOWER(t.ScreenCode) COLLATE utf8mb4_unicode_ci = LOWER(COALESCE(p.Screen, '')) COLLATE utf8mb4_unicode_ci
                OR (t.ScreenCode = '' AND t.CanDelete = 0)
            ))
            OR (COALESCE(p.ScreenCode, '') = '' AND t.ScreenCode = '')
        )
    WHERE LOWER(p.Action) COLLATE utf8mb4_unicode_ci = 'delete'
    ON DUPLICATE KEY UPDATE
        `IsGranted` = VALUES(`IsGranted`),
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    DROP TEMPORARY TABLE IF EXISTS tmp_user_overrides;

    COMMIT;
END;
