-- ====================================================================================
-- 10_Fix_CheckUserModuleAction_Collation.sql
-- Fixes MySQL Error 1267:
--   Illegal mix of collations (utf8mb4_unicode_ci,IMPLICIT) and (utf8mb4_0900_ai_ci,IMPLICIT)
-- in sp_CheckUserModuleAction, which caused HTTP 500 on all [RequirePermission] endpoints
-- for non-Admin/non-Principal users (Accountant, Parent, Student, Faculty, Warden, etc.).
-- ====================================================================================

DROP PROCEDURE IF EXISTS `sp_CheckUserModuleAction`;

CREATE PROCEDURE `sp_CheckUserModuleAction`(
    IN p_UserId INT,
    IN p_ModuleIdentifier VARCHAR(100),
    IN p_Action VARCHAR(50)
)
BEGIN
    DECLARE v_NormAction VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_Result INT DEFAULT 0;
    DECLARE v_TargetModule VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_CleanInput VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    SET v_CleanInput = LOWER(TRIM(COALESCE(p_ModuleIdentifier, ''))) COLLATE utf8mb4_unicode_ci;

    SET v_NormAction = CASE LOWER(TRIM(COALESCE(p_Action, 'view'))) COLLATE utf8mb4_unicode_ci
        WHEN 'create' THEN 'Add'
        WHEN 'add' THEN 'Add'
        WHEN 'edit' THEN 'Edit'
        WHEN 'update' THEN 'Edit'
        WHEN 'delete' THEN 'Delete'
        ELSE 'View'
    END;

    -- Resolve module aliases to canonical SubModule names via ModuleKeyAliases
    SELECT CanonicalSubModule COLLATE utf8mb4_unicode_ci INTO v_TargetModule
    FROM `ModuleKeyAliases`
    WHERE LOWER(AliasKey) COLLATE utf8mb4_unicode_ci = v_CleanInput
    LIMIT 1;

    IF v_TargetModule IS NULL OR v_TargetModule = '' THEN
        SET v_TargetModule = TRIM(COALESCE(p_ModuleIdentifier, '')) COLLATE utf8mb4_unicode_ci;
    END IF;

    -- 1. Check if the action is granted in UserPermissions (override) or RolePermissions (role default)
    SELECT
        COALESCE(MAX(CASE
            WHEN u.RoleId IN (1, 2) THEN 1 -- Super Admin / Admin unrestricted
            WHEN up.IsGranted IS NOT NULL THEN up.IsGranted -- User Override
            WHEN rp.PermissionId IS NOT NULL THEN 1 -- Role Default
            ELSE 0
        END), 0) INTO v_Result
    FROM `Users` u
    INNER JOIN `Permissions` p ON (
        LOWER(p.SubModule) COLLATE utf8mb4_unicode_ci = LOWER(v_TargetModule) COLLATE utf8mb4_unicode_ci
        OR LOWER(p.Module) COLLATE utf8mb4_unicode_ci = LOWER(v_TargetModule) COLLATE utf8mb4_unicode_ci
        OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')) COLLATE utf8mb4_unicode_ci = LOWER(v_TargetModule) COLLATE utf8mb4_unicode_ci
    ) AND LOWER(p.Action) COLLATE utf8mb4_unicode_ci = LOWER(v_NormAction) COLLATE utf8mb4_unicode_ci
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
    WHERE u.UserId = p_UserId
      AND (
          u.RoleId IN (1, 2)
          OR up.IsGranted = 1
          OR (up.IsGranted IS NULL AND rp.PermissionId IS NOT NULL)
      );

    -- 2. If action is Add/Edit/Delete, enforce that View must ALSO be granted
    IF v_Result = 1 AND v_NormAction != 'View' THEN
        IF NOT EXISTS (
            SELECT 1
            FROM `Users` u
            INNER JOIN `Permissions` p ON (
                LOWER(p.SubModule) COLLATE utf8mb4_unicode_ci = LOWER(v_TargetModule) COLLATE utf8mb4_unicode_ci
                OR LOWER(p.Module) COLLATE utf8mb4_unicode_ci = LOWER(v_TargetModule) COLLATE utf8mb4_unicode_ci
                OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')) COLLATE utf8mb4_unicode_ci = LOWER(v_TargetModule) COLLATE utf8mb4_unicode_ci
            ) AND LOWER(p.Action) COLLATE utf8mb4_unicode_ci = 'view'
            LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
            LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
            WHERE u.UserId = p_UserId
              AND (
                  u.RoleId IN (1, 2)
                  OR (up.IsGranted = 1)
                  OR (up.IsGranted IS NULL AND rp.PermissionId IS NOT NULL)
              )
        ) THEN
            SET v_Result = 0;
        END IF;
    END IF;

    SELECT COALESCE(v_Result, 0) AS HasPermission;
END;
