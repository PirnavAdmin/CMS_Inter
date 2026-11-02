-- ====================================================================================
-- 04_Fix_Role_Permissions_Sync_And_Checks.sql
-- Fix sp_UpdateRolePermissions, sp_CheckUserModuleAction, and sp_GetRolePermissionMatrix
-- ====================================================================================

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
        AND (t.ScreenId = '' OR LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, '')) OR LOWER(t.ScreenId) = LOWER(COALESCE(p.Screen, '')))
    WHERE rp.RoleId = p_RoleId;

    -- 2. Insert enabled permissions for this role
    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (t.ScreenId = '' OR LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, '')) OR LOWER(t.ScreenId) = LOWER(COALESCE(p.Screen, '')))
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
DELIMITER ;

-- Recreate sp_CheckUserModuleAction with robust alias resolution and permission validation
DROP PROCEDURE IF EXISTS `sp_CheckUserModuleAction`;
DELIMITER //
CREATE PROCEDURE `sp_CheckUserModuleAction`(
    IN p_UserId INT,
    IN p_ModuleIdentifier VARCHAR(100),
    IN p_Action VARCHAR(50)
)
BEGIN
    DECLARE v_NormAction VARCHAR(50);
    DECLARE v_Result INT DEFAULT 0;
    DECLARE v_TargetModule VARCHAR(100);

    SET v_NormAction = CASE LOWER(TRIM(p_Action))
        WHEN 'create' THEN 'Add'
        WHEN 'add' THEN 'Add'
        WHEN 'edit' THEN 'Edit'
        WHEN 'update' THEN 'Edit'
        WHEN 'delete' THEN 'Delete'
        ELSE 'View'
    END;

    -- Resolve module aliases to canonical SubModule names
    SET v_TargetModule = CASE LOWER(TRIM(p_ModuleIdentifier))
        WHEN 'academic-calendar' THEN 'Holiday Management'
        WHEN 'academic_calendar' THEN 'Holiday Management'
        WHEN 'academic-calendar-events' THEN 'Holiday Management'
        WHEN 'reimbursement' THEN 'Staff Reimbursements'
        WHEN 'reimbursements' THEN 'Staff Reimbursements'
        WHEN 'staff-reimbursement' THEN 'Staff Reimbursements'
        WHEN 'staff-reimbursements' THEN 'Staff Reimbursements'
        WHEN 'reports' THEN 'Reports & Analytics'
        WHEN 'reports-analytics' THEN 'Reports & Analytics'
        WHEN 'inventory' THEN 'Inventory Management'
        WHEN 'inventory-management' THEN 'Inventory Management'
        WHEN 'board-academic-year' THEN 'Board & Academic Year'
        WHEN 'board-academic-years' THEN 'Board & Academic Year'
        WHEN 'courses' THEN 'Group Management'
        WHEN 'group-management' THEN 'Group Management'
        WHEN 'examination' THEN 'Examination'
        WHEN 'examinations' THEN 'Examination'
        ELSE TRIM(p_ModuleIdentifier)
    END;

    -- 1. Check if the action is granted in UserPermissions (override) or RolePermissions (role default)
    SELECT 
        COALESCE(MAX(CASE 
            WHEN u.RoleId = 1 THEN 1 -- Super Admin unrestricted
            WHEN up.IsGranted IS NOT NULL THEN up.IsGranted -- User Override
            WHEN rp.PermissionId IS NOT NULL THEN 1 -- Role Default
            ELSE 0
        END), 0) INTO v_Result
    FROM `Users` u
    INNER JOIN `Permissions` p ON (
        LOWER(p.SubModule) = LOWER(v_TargetModule)
        OR LOWER(p.Module) = LOWER(v_TargetModule)
        OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')) = LOWER(v_TargetModule)
    ) AND LOWER(p.Action) = LOWER(v_NormAction)
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
    WHERE u.UserId = p_UserId
      AND (
          u.RoleId = 1 
          OR up.IsGranted = 1 
          OR (up.IsGranted IS NULL AND rp.PermissionId IS NOT NULL)
      );

    -- 2. If action is Add/Edit/Delete, enforce that View must ALSO be granted
    IF v_Result = 1 AND v_NormAction != 'View' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM `Users` u
            INNER JOIN `Permissions` p ON (
                LOWER(p.SubModule) = LOWER(v_TargetModule)
                OR LOWER(p.Module) = LOWER(v_TargetModule)
                OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')) = LOWER(v_TargetModule)
            ) AND p.Action = 'View'
            LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
            LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
            WHERE u.UserId = p_UserId
              AND (
                  u.RoleId = 1
                  OR (up.IsGranted = 1)
                  OR (up.IsGranted IS NULL AND rp.PermissionId IS NOT NULL)
              )
        ) THEN
            SET v_Result = 0;
        END IF;
    END IF;

    SELECT COALESCE(v_Result, 0) AS HasPermission;
END //
DELIMITER ;
