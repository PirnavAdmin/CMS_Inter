-- ====================================================================================
-- 02_Role_Modules_Applicability_Migration.sql
-- Role -> Module Applicability Relationship, Stored Procedures & Backfill
-- ====================================================================================

-- 1. Create RoleModules Table
CREATE TABLE IF NOT EXISTS `RoleModules` (
    `RoleModuleId` INT NOT NULL AUTO_INCREMENT,
    `RoleId` INT NOT NULL,
    `ModuleKey` VARCHAR(100) NOT NULL,
    `SubModule` VARCHAR(100) NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`RoleModuleId`),
    UNIQUE KEY `UQ_RoleModules_Role_SubModule` (`RoleId`, `SubModule`),
    INDEX `IX_RoleModules_RoleId` (`RoleId`),
    INDEX `IX_RoleModules_ModuleKey` (`ModuleKey`),
    CONSTRAINT `FK_RoleModules_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 2. Backfill helper procedure for safe seeding without overwriting existing data
DROP PROCEDURE IF EXISTS `sp_SeedRoleModulesIfEmpty`;
DELIMITER //
CREATE PROCEDURE `sp_SeedRoleModulesIfEmpty`(
    IN p_RoleId INT,
    IN p_SubModule VARCHAR(100),
    IN p_ModuleKey VARCHAR(100)
)
BEGIN
    INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
    VALUES (p_RoleId, p_ModuleKey, p_SubModule, UTC_TIMESTAMP());
END //
DELIMITER ;

-- Safe backfill from existing RolePermissions if any roles already have permission rows
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT DISTINCT 
    rp.RoleId, 
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')),
    p.SubModule,
    UTC_TIMESTAMP()
FROM `RolePermissions` rp
INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId;

-- Canonical Seeding for Roles that do not have RoleModules yet
-- Role 1: Super Admin (All 28 modules)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT DISTINCT 1, LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')), SubModule, UTC_TIMESTAMP()
FROM `Permissions`;

-- Role 2: Admin (All 28 modules)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT DISTINCT 2, LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')), SubModule, UTC_TIMESTAMP()
FROM `Permissions`;

-- Role 15: Principal (Institution Leadership & Academics)
CALL sp_SeedRoleModulesIfEmpty(15, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(15, 'Group Management', 'group-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Subject Management', 'subject-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Section & Room', 'section-room');
CALL sp_SeedRoleModulesIfEmpty(15, 'Timetable', 'timetable');
CALL sp_SeedRoleModulesIfEmpty(15, 'Holiday Management', 'holiday-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Student Admission', 'student-admission');
CALL sp_SeedRoleModulesIfEmpty(15, 'Student Management', 'student-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Section Allocation', 'section-allocation');
CALL sp_SeedRoleModulesIfEmpty(15, 'Attendance', 'attendance');
CALL sp_SeedRoleModulesIfEmpty(15, 'Promotion', 'promotion');
CALL sp_SeedRoleModulesIfEmpty(15, 'Staff Management', 'staff-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Department & Designation', 'department-designation');
CALL sp_SeedRoleModulesIfEmpty(15, 'Staff Attendance', 'staff-attendance');
CALL sp_SeedRoleModulesIfEmpty(15, 'Staff Leave Management', 'staff-leave-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Examination', 'examination');
CALL sp_SeedRoleModulesIfEmpty(15, 'Marks Evaluation', 'marks-evaluation');
CALL sp_SeedRoleModulesIfEmpty(15, 'Results', 'results');
CALL sp_SeedRoleModulesIfEmpty(15, 'Fee Management', 'fee-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Certificates', 'certificates');
CALL sp_SeedRoleModulesIfEmpty(15, 'Reports & Analytics', 'reports-analytics');
CALL sp_SeedRoleModulesIfEmpty(15, 'Hostel Management', 'hostel-management');
CALL sp_SeedRoleModulesIfEmpty(15, 'Transport', 'transport');
CALL sp_SeedRoleModulesIfEmpty(15, 'Library', 'library');
CALL sp_SeedRoleModulesIfEmpty(15, 'Placement', 'placement');

-- Role 14: Dean
CALL sp_SeedRoleModulesIfEmpty(14, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(14, 'Group Management', 'group-management');
CALL sp_SeedRoleModulesIfEmpty(14, 'Subject Management', 'subject-management');
CALL sp_SeedRoleModulesIfEmpty(14, 'Timetable', 'timetable');
CALL sp_SeedRoleModulesIfEmpty(14, 'Attendance', 'attendance');
CALL sp_SeedRoleModulesIfEmpty(14, 'Staff Management', 'staff-management');
CALL sp_SeedRoleModulesIfEmpty(14, 'Examination', 'examination');
CALL sp_SeedRoleModulesIfEmpty(14, 'Marks Evaluation', 'marks-evaluation');
CALL sp_SeedRoleModulesIfEmpty(14, 'Results', 'results');
CALL sp_SeedRoleModulesIfEmpty(14, 'Reports & Analytics', 'reports-analytics');

-- Role 3: HOD
CALL sp_SeedRoleModulesIfEmpty(3, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(3, 'Group Management', 'group-management');
CALL sp_SeedRoleModulesIfEmpty(3, 'Subject Management', 'subject-management');
CALL sp_SeedRoleModulesIfEmpty(3, 'Section & Room', 'section-room');
CALL sp_SeedRoleModulesIfEmpty(3, 'Timetable', 'timetable');
CALL sp_SeedRoleModulesIfEmpty(3, 'Holiday Management', 'holiday-management');
CALL sp_SeedRoleModulesIfEmpty(3, 'Attendance', 'attendance');
CALL sp_SeedRoleModulesIfEmpty(3, 'Staff Attendance', 'staff-attendance');
CALL sp_SeedRoleModulesIfEmpty(3, 'Staff Leave Management', 'staff-leave-management');
CALL sp_SeedRoleModulesIfEmpty(3, 'Marks Evaluation', 'marks-evaluation');
CALL sp_SeedRoleModulesIfEmpty(3, 'Results', 'results');
CALL sp_SeedRoleModulesIfEmpty(3, 'Reports & Analytics', 'reports-analytics');

-- Role 4: Faculty (7 modules)
CALL sp_SeedRoleModulesIfEmpty(4, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(4, 'Timetable', 'timetable');
CALL sp_SeedRoleModulesIfEmpty(4, 'Holiday Management', 'holiday-management');
CALL sp_SeedRoleModulesIfEmpty(4, 'Subject Management', 'subject-management');
CALL sp_SeedRoleModulesIfEmpty(4, 'Attendance', 'attendance');
CALL sp_SeedRoleModulesIfEmpty(4, 'Marks Evaluation', 'marks-evaluation');
CALL sp_SeedRoleModulesIfEmpty(4, 'Staff Leave Management', 'staff-leave-management');

-- Role 5: Student (5 modules)
-- Note: clean up previous accidental 90 modules for Student in RoleModules if any, ensuring student has canonical self-service modules
CALL sp_SeedRoleModulesIfEmpty(5, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(5, 'Timetable', 'timetable');
CALL sp_SeedRoleModulesIfEmpty(5, 'Attendance', 'attendance');
CALL sp_SeedRoleModulesIfEmpty(5, 'Results', 'results');
CALL sp_SeedRoleModulesIfEmpty(5, 'Fee Management', 'fee-management');

-- Role 6: Parent (4 modules)
CALL sp_SeedRoleModulesIfEmpty(6, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(6, 'Attendance', 'attendance');
CALL sp_SeedRoleModulesIfEmpty(6, 'Results', 'results');
CALL sp_SeedRoleModulesIfEmpty(6, 'Fee Management', 'fee-management');

-- Role 7: Accountant (4 modules)
CALL sp_SeedRoleModulesIfEmpty(7, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(7, 'Fee Management', 'fee-management');
CALL sp_SeedRoleModulesIfEmpty(7, 'Payroll', 'payroll');
CALL sp_SeedRoleModulesIfEmpty(7, 'Reports & Analytics', 'reports-analytics');

-- Role 8: Examination Cell (5 modules)
CALL sp_SeedRoleModulesIfEmpty(8, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(8, 'Examination', 'examination');
CALL sp_SeedRoleModulesIfEmpty(8, 'Marks Evaluation', 'marks-evaluation');
CALL sp_SeedRoleModulesIfEmpty(8, 'Results', 'results');
CALL sp_SeedRoleModulesIfEmpty(8, 'Reports & Analytics', 'reports-analytics');

-- Role 9: Library / Librarian (2 modules)
CALL sp_SeedRoleModulesIfEmpty(9, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(9, 'Library', 'library');

-- Role 10: Hostel Warden (2 modules)
CALL sp_SeedRoleModulesIfEmpty(10, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(10, 'Hostel Management', 'hostel-management');

-- Role 11: Placement Officer (2 modules)
CALL sp_SeedRoleModulesIfEmpty(11, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(11, 'Placement', 'placement');

-- Role 12: Bus Driver (2 modules)
CALL sp_SeedRoleModulesIfEmpty(12, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(12, 'Transport', 'transport');

-- Role 13: Attendant (2 modules)
CALL sp_SeedRoleModulesIfEmpty(13, 'Dashboard', 'dashboard');
CALL sp_SeedRoleModulesIfEmpty(13, 'Attendance', 'attendance');

DROP PROCEDURE IF EXISTS `sp_SeedRoleModulesIfEmpty`;

-- 3. Stored Procedure: sp_GetRoleModules
DROP PROCEDURE IF EXISTS `sp_GetRoleModules`;
DELIMITER //
CREATE PROCEDURE `sp_GetRoleModules`(
    IN p_RoleId INT
)
BEGIN
    SELECT 
        rm.ModuleKey AS Id,
        rm.SubModule AS Name,
        rm.SubModule,
        COALESCE(p.Module, 'General') AS Module,
        COALESCE(p.CategoryLabel, p.Module, 'General') AS Section,
        MIN(COALESCE(p.DisplayOrder, 999)) AS DisplayOrder,
        CASE rm.ModuleKey
            WHEN 'dashboard' THEN '/dashboard'
            WHEN 'group-management' THEN '/dashboard/courses'
            WHEN 'subject-management' THEN '/dashboard/subjects'
            WHEN 'section-room' THEN '/dashboard/sections'
            WHEN 'timetable' THEN '/dashboard/timetable'
            WHEN 'holiday-management' THEN '/dashboard/holidays'
            WHEN 'student-admission' THEN '/dashboard/admission'
            WHEN 'student-management' THEN '/dashboard/students'
            WHEN 'section-allocation' THEN '/dashboard/section-allocation'
            WHEN 'attendance' THEN '/dashboard/attendance/student'
            WHEN 'promotion' THEN '/dashboard/promotion'
            WHEN 'transport' THEN '/dashboard/transport'
            WHEN 'staff-management' THEN '/dashboard/staff'
            WHEN 'department-designation' THEN '/dashboard/departments'
            WHEN 'staff-attendance' THEN '/dashboard/attendance/staff'
            WHEN 'staff-leave-management' THEN '/dashboard/staff/leaves'
            WHEN 'examination' THEN '/dashboard/examinations'
            WHEN 'marks-evaluation' THEN '/dashboard/marks'
            WHEN 'results' THEN '/dashboard/results'
            WHEN 'fee-management' THEN '/dashboard/fees'
            WHEN 'payroll' THEN '/dashboard/payroll'
            WHEN 'certificates' THEN '/dashboard/certificates'
            WHEN 'reports-analytics' THEN '/dashboard/reports'
            WHEN 'hostel-management' THEN '/dashboard/hostel'
            WHEN 'library' THEN '/dashboard/library'
            WHEN 'placement' THEN '/dashboard/placement'
            WHEN 'settings' THEN '/dashboard/settings'
            WHEN 'roles-permissions' THEN '/dashboard/roles'
            ELSE CONCAT('/dashboard/', rm.ModuleKey)
        END AS Route
    FROM `RoleModules` rm
    LEFT JOIN `Permissions` p ON LOWER(p.SubModule) = LOWER(rm.SubModule)
    WHERE rm.RoleId = p_RoleId
    GROUP BY rm.ModuleKey, rm.SubModule, p.Module, p.CategoryLabel
    ORDER BY DisplayOrder ASC, rm.SubModule ASC;
END //
DELIMITER ;

-- 4. Stored Procedure: sp_SetRoleModules
DROP PROCEDURE IF EXISTS `sp_SetRoleModules`;
DELIMITER //
CREATE PROCEDURE `sp_SetRoleModules`(
    IN p_RoleId INT,
    IN p_ModulesJson LONGTEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_set_modules (
        ModuleKey VARCHAR(100),
        SubModule VARCHAR(100)
    );
    TRUNCATE TABLE tmp_set_modules;

    INSERT INTO tmp_set_modules (ModuleKey, SubModule)
    SELECT 
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(jt.ModuleKey), '&', ''), '/', '-'), '  ', ' '), ' ', '-')),
        jt.SubModule
    FROM JSON_TABLE(
        p_ModulesJson,
        '$[*]' COLUMNS(
            ModuleKey VARCHAR(100) PATH '$.ModuleKey',
            SubModule VARCHAR(100) PATH '$.SubModule'
        )
    ) jt;

    -- Replace RoleModules for this role
    DELETE FROM `RoleModules` WHERE `RoleId` = p_RoleId;

    INSERT INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
    SELECT DISTINCT p_RoleId, t.ModuleKey, t.SubModule, UTC_TIMESTAMP()
    FROM tmp_set_modules t
    WHERE t.SubModule IS NOT NULL AND t.SubModule != '';

    -- Delete any RolePermissions that are no longer in the applicable modules
    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    WHERE rp.RoleId = p_RoleId
      AND NOT EXISTS (
          SELECT 1 FROM `RoleModules` rm 
          WHERE rm.RoleId = p_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule)
      );

    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_set_modules;

    COMMIT;
END //
DELIMITER ;

-- 5. Stored Procedure: sp_GetRolePermissionMatrix (Updated with RoleModules applicability)
DROP PROCEDURE IF EXISTS `sp_GetRolePermissionMatrix`;
DELIMITER //
CREATE PROCEDURE `sp_GetRolePermissionMatrix`(
    IN p_RoleId INT,
    IN p_UserId INT
)
BEGIN
    DECLARE v_RoleId INT DEFAULT p_RoleId;
    IF (v_RoleId IS NULL OR v_RoleId = 0) AND p_UserId IS NOT NULL THEN
        SELECT RoleId INTO v_RoleId FROM `Users` WHERE UserId = p_UserId LIMIT 1;
    END IF;

    -- If the role has specific applicable modules in RoleModules, return ONLY those modules
    IF EXISTS (SELECT 1 FROM `RoleModules` WHERE RoleId = v_RoleId) THEN
        SELECT 
            COALESCE(p.Module, 'General') AS Module,
            rm.SubModule,
            COALESCE(p.CategoryLabel, p.Module, 'General') AS CategoryLabel,
            MIN(COALESCE(p.DisplayOrder, 999)) AS DisplayOrder,
            -- View Action Flag
            MAX(CASE WHEN p.Action = 'View' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanView,
            -- Add Action Flag
            MAX(CASE WHEN p.Action = 'Add' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanAdd,
            -- Edit Action Flag
            MAX(CASE WHEN p.Action = 'Edit' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanEdit,
            -- Delete Action Flag
            MAX(CASE WHEN p.Action = 'Delete' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanDelete,
            -- Member Override Indicator
            MAX(CASE WHEN p_UserId IS NOT NULL AND up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
        FROM `RoleModules` rm
        LEFT JOIN `Permissions` p ON LOWER(p.SubModule) = LOWER(rm.SubModule)
        LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = v_RoleId
        LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = p_UserId
        WHERE rm.RoleId = v_RoleId
        GROUP BY p.Module, rm.SubModule, p.CategoryLabel
        ORDER BY DisplayOrder ASC, rm.SubModule ASC;
    ELSE
        -- Fallback to all Permissions if no RoleModules configured yet
        SELECT 
            p.Module,
            p.SubModule,
            p.CategoryLabel,
            MIN(p.DisplayOrder) AS DisplayOrder,
            MAX(CASE WHEN p.Action = 'View' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanView,
            MAX(CASE WHEN p.Action = 'Add' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanAdd,
            MAX(CASE WHEN p.Action = 'Edit' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanEdit,
            MAX(CASE WHEN p.Action = 'Delete' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanDelete,
            MAX(CASE WHEN p_UserId IS NOT NULL AND up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
        FROM `Permissions` p
        LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = v_RoleId
        LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = p_UserId
        GROUP BY p.Module, p.SubModule, p.CategoryLabel
        ORDER BY DisplayOrder ASC, p.SubModule ASC;
    END IF;
END //
DELIMITER ;

-- 6. Stored Procedure: sp_UpdateRolePermissions (Enforcing RoleModules applicability and View dependencies)
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
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );
    TRUNCATE TABLE tmp_module_updates;

    -- Parse JSON and enforce: Add/Edit/Delete require View
    -- If View is 0, then Add/Edit/Delete MUST be 0
    -- If Add/Edit/Delete is 1, then View MUST be 1
    INSERT INTO tmp_module_updates (SubModule, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        jt.SubModule,
        IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) AS CanView,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanAdd = 1, 1, 0) AS CanAdd,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanEdit = 1, 1, 0) AS CanEdit,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanDelete = 1, 1, 0) AS CanDelete
    FROM JSON_TABLE(
        p_PermissionsJson,
        '$[*]' COLUMNS(
            SubModule VARCHAR(100) PATH '$.SubModule',
            CanView INT PATH '$.CanView',
            CanAdd INT PATH '$.CanAdd',
            CanEdit INT PATH '$.CanEdit',
            CanDelete INT PATH '$.CanDelete'
        )
    ) jt;

    -- Delete existing RolePermissions ONLY for submodules that are APPLICABLE to this role AND in update list
    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE rp.RoleId = p_RoleId
      AND (
          NOT EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId)
          OR EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule))
      );

    -- Insert enabled permissions ONLY for applicable modules for p_RoleId
    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE (
            NOT EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId)
            OR EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule))
          )
      AND (
          (p.Action = 'View' AND t.CanView = 1)
       OR (p.Action = 'Add' AND t.CanAdd = 1)
       OR (p.Action = 'Edit' AND t.CanEdit = 1)
       OR (p.Action = 'Delete' AND t.CanDelete = 1)
      );

    -- Update Role timestamp strictly for p_RoleId
    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;

    COMMIT;
END //
DELIMITER ;

-- 7. Stored Procedure: sp_CheckUserPermission (Returns 1 if authorized, 0 otherwise)
DROP PROCEDURE IF EXISTS `sp_CheckUserPermission`;
DELIMITER //
CREATE PROCEDURE `sp_CheckUserPermission`(
    IN p_UserId INT,
    IN p_PermissionCode VARCHAR(100)
)
BEGIN
    SELECT 
        CASE 
            WHEN u.RoleId = 1 THEN 1 -- Super Admin unrestricted
            WHEN up.IsGranted IS NOT NULL THEN up.IsGranted -- User Override
            WHEN rp.PermissionId IS NOT NULL THEN 1 -- Role Default
            ELSE 0
        END AS HasPermission
    FROM `Users` u
    INNER JOIN `Permissions` p ON p.PermissionCode = p_PermissionCode
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
    WHERE u.UserId = p_UserId
    LIMIT 1;
END //
DELIMITER ;

-- 8. Stored Procedure: sp_CheckUserModuleAction (User -> Role -> Module -> Action check)
DROP PROCEDURE IF EXISTS `sp_CheckUserModuleAction`;
DELIMITER //
CREATE PROCEDURE `sp_CheckUserModuleAction`(
    IN p_UserId INT,
    IN p_ModuleIdentifier VARCHAR(100),
    IN p_Action VARCHAR(50)
)
BEGIN
    DECLARE v_NormAction VARCHAR(50);
    SET v_NormAction = CASE LOWER(TRIM(p_Action))
        WHEN 'create' THEN 'Add'
        WHEN 'add' THEN 'Add'
        WHEN 'edit' THEN 'Edit'
        WHEN 'update' THEN 'Edit'
        WHEN 'delete' THEN 'Delete'
        ELSE 'View'
    END;

    SELECT 
        CASE 
            WHEN u.RoleId = 1 THEN 1 -- Super Admin unrestricted
            WHEN up.IsGranted IS NOT NULL THEN up.IsGranted -- User Override
            WHEN rp.PermissionId IS NOT NULL THEN 1 -- Role Default
            ELSE 0
        END AS HasPermission
    FROM `Users` u
    INNER JOIN `Permissions` p ON (
        LOWER(p.SubModule) = LOWER(TRIM(p_ModuleIdentifier))
        OR LOWER(p.Module) = LOWER(TRIM(p_ModuleIdentifier))
        OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')) = LOWER(TRIM(p_ModuleIdentifier))
    ) AND LOWER(p.Action) = LOWER(v_NormAction)
    LEFT JOIN `RoleModules` rm ON rm.RoleId = u.RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule)
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
    WHERE u.UserId = p_UserId
      AND (u.RoleId = 1 OR rm.RoleModuleId IS NOT NULL OR NOT EXISTS (SELECT 1 FROM `RoleModules` WHERE RoleId = u.RoleId))
    LIMIT 1;
END //
DELIMITER ;
