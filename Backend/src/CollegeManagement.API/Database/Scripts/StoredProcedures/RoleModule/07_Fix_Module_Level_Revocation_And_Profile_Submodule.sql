-- ====================================================================================
-- 07_Fix_Module_Level_Revocation_And_Profile_Submodule.sql
-- 1. Seed 'My Profile' as distinct canonical SubModule in Permissions table
-- 2. Update ModuleKeyAliases to map profile keys to 'My Profile'
-- 3. Fix sp_UpdateRolePermissions so module-level revocation (ScreenId = '') properly
--    deletes all screen-level and module-level permissions for that submodule
-- ====================================================================================

-- 1. Seed 'My Profile' in Permissions
INSERT IGNORE INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`) VALUES
('Overview', 'My Profile', 'View', 'overview.profile.view', 'View My Profile', 'Overview', 5, '', 'My Profile'),
('Overview', 'My Profile', 'Add', 'overview.profile.add', 'Add My Profile', 'Overview', 6, '', 'My Profile'),
('Overview', 'My Profile', 'Edit', 'overview.profile.edit', 'Edit My Profile', 'Overview', 7, '', 'My Profile'),
('Overview', 'My Profile', 'Delete', 'overview.profile.delete', 'Delete My Profile', 'Overview', 8, '', 'My Profile');

-- 2. Update ModuleKeyAliases for Profile
UPDATE `ModuleKeyAliases` 
SET `CanonicalSubModule` = 'My Profile', `CategoryLabel` = 'Overview'
WHERE `AliasKey` IN ('profile', 'my-profile', 'driver-profile', 'accountant-profile', 'exam-cell-profile', 'inventory-profile', 'warden-profile', 'parent-profile');

INSERT IGNORE INTO `ModuleKeyAliases` (`AliasKey`, `CanonicalSubModule`, `CategoryLabel`, `DisplayOrder`) VALUES
('profile', 'My Profile', 'Overview', 5),
('my-profile', 'My Profile', 'Overview', 5),
('driver-profile', 'My Profile', 'Overview', 5),
('accountant-profile', 'My Profile', 'Overview', 5),
('exam-cell-profile', 'My Profile', 'Overview', 5),
('inventory-profile', 'My Profile', 'Overview', 5),
('warden-profile', 'My Profile', 'Overview', 5),
('parent-profile', 'My Profile', 'Overview', 5);

-- 3. Fix sp_UpdateRolePermissions
DROP PROCEDURE IF EXISTS `sp_UpdateRolePermissions`;
DELIMITER //
CREATE DEFINER="avnadmin"@"%" PROCEDURE `sp_UpdateRolePermissions`(
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

    DROP TEMPORARY TABLE IF EXISTS tmp_module_raw;
    CREATE TEMPORARY TABLE tmp_module_raw (
        RawSubModule VARCHAR(100),
        ScreenId VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );

    -- Parse JSON input
    INSERT INTO tmp_module_raw (RawSubModule, ScreenId, CanView, CanAdd, CanEdit, CanDelete)
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

    -- Resolve aliases to canonical SubModule
    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;
    CREATE TEMPORARY TABLE tmp_module_updates (
        SubModule VARCHAR(100),
        ScreenId VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );

    INSERT INTO tmp_module_updates (SubModule, ScreenId, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        COALESCE(mka.CanonicalSubModule, r.RawSubModule) AS SubModule,
        r.ScreenId,
        MAX(r.CanView) AS CanView,
        MAX(r.CanAdd) AS CanAdd,
        MAX(r.CanEdit) AS CanEdit,
        MAX(r.CanDelete) AS CanDelete
    FROM tmp_module_raw r
    LEFT JOIN `ModuleKeyAliases` mka ON LOWER(mka.AliasKey) = LOWER(TRIM(r.RawSubModule))
    GROUP BY COALESCE(mka.CanonicalSubModule, r.RawSubModule), r.ScreenId;

    -- 1. Delete existing RolePermissions for the canonical submodules and screens being updated.
    -- Crucial: When t.ScreenId = '', it represents a whole-module update, so all permissions
    -- (module-level AND screen-level) for that submodule must be cleared!
    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE rp.RoleId = p_RoleId
      AND (
          t.ScreenId = ''
          OR LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, ''))
          OR LOWER(t.ScreenId) = LOWER(COALESCE(p.Screen, ''))
      );

    -- 2. Insert enabled permissions for this role.
    -- When t.ScreenId = '', insert module-level permissions (p.ScreenCode = '')
    -- When t.ScreenId != '', insert screen-specific permissions
    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (
            (t.ScreenId != '' AND (LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, '')) OR LOWER(t.ScreenId) = LOWER(COALESCE(p.Screen, ''))))
            OR (t.ScreenId = '' AND COALESCE(p.ScreenCode, '') = '')
        )
    WHERE (
          (p.Action = 'View' AND t.CanView = 1)
       OR (p.Action = 'Add' AND t.CanAdd = 1)
       OR (p.Action = 'Edit' AND t.CanEdit = 1)
       OR (p.Action = 'Delete' AND t.CanDelete = 1)
    );

    -- 3. Auto-sync newly granted submodules into RoleModules table
    INSERT IGNORE INTO `RoleModules` (`RoleId`, `SubModule`, `ModuleKey`, `CreatedAt`)
    SELECT DISTINCT 
        p_RoleId, 
        t.SubModule, 
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(t.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')), 
        UTC_TIMESTAMP()
    FROM tmp_module_updates t
    WHERE t.CanView = 1 OR t.CanAdd = 1 OR t.CanEdit = 1 OR t.CanDelete = 1;

    -- 4. Clean up RoleModules if all permissions for an updated submodule were revoked
    DELETE rm FROM `RoleModules` rm
    WHERE rm.RoleId = p_RoleId
      AND EXISTS (
          SELECT 1 FROM tmp_module_updates t 
          WHERE LOWER(t.SubModule) = LOWER(rm.SubModule)
            AND t.CanView = 0 AND t.CanAdd = 0 AND t.CanEdit = 0 AND t.CanDelete = 0
      )
      AND NOT EXISTS (
          SELECT 1 FROM `RolePermissions` rp
          INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
          WHERE rp.RoleId = p_RoleId AND LOWER(p.SubModule) = LOWER(rm.SubModule)
      );

    -- 5. Update Role timestamp
    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_raw;
    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;

    COMMIT;
END //
DELIMITER ;
