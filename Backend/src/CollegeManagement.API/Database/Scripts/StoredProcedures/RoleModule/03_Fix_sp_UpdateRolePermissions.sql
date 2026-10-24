-- ============================================================================
-- Stored Procedure: sp_UpdateRolePermissions
-- Description: Updates role permissions with ScreenId granularity, enforces
--              View prerequisites, and auto-syncs RoleModules applicability
--              using correct column CreatedAt.
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_UpdateRolePermissions`;
DELIMITER //

CREATE PROCEDURE `sp_UpdateRolePermissions`(
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

    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_module_updates (
        SubModule VARCHAR(100),
        ScreenId VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );
    TRUNCATE TABLE tmp_module_updates;

    -- Parse JSON input
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

    -- Delete existing RolePermissions for the specific submodules & screens being updated
    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule) 
        AND (t.ScreenId = '' OR LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, '')))
    WHERE rp.RoleId = p_RoleId;

    -- Insert enabled permissions for this role
    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (t.ScreenId = '' OR LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, '')))
    WHERE (
          (p.Action = 'View' AND t.CanView = 1)
       OR (p.Action = 'Add' AND t.CanAdd = 1)
       OR (p.Action = 'Edit' AND t.CanEdit = 1)
       OR (p.Action = 'Delete' AND t.CanDelete = 1)
    );

    -- Ensure all submodules being granted are auto-synced into RoleModules (using CreatedAt)
    INSERT IGNORE INTO `RoleModules` (`RoleId`, `SubModule`, `ModuleKey`, `CreatedAt`)
    SELECT DISTINCT p_RoleId, p.SubModule, LOWER(REPLACE(REPLACE(p.SubModule, ' & ', '-'), ' ', '-')), UTC_TIMESTAMP()
    FROM tmp_module_updates t
    INNER JOIN `Permissions` p ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE t.CanView = 1 OR t.CanAdd = 1 OR t.CanEdit = 1 OR t.CanDelete = 1;

    -- Update Role timestamp
    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    COMMIT;
END //
DELIMITER ;
