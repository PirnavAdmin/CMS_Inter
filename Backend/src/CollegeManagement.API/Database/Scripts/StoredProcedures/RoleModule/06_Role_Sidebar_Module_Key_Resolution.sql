-- ====================================================================================
-- 06_Role_Sidebar_Module_Key_Resolution.sql
-- Resolves role-specific sidebar navigation keys to canonical SubModules
-- Synchronizes RolePermissions, RoleModules, and dynamic permission checks
-- ====================================================================================

-- 1. Create and Seed ModuleKeyAliases Table
CREATE TABLE IF NOT EXISTS `ModuleKeyAliases` (
    `AliasKey` VARCHAR(100) NOT NULL,
    `CanonicalSubModule` VARCHAR(100) NOT NULL,
    `CategoryLabel` VARCHAR(60) NOT NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`AliasKey`),
    INDEX `IX_ModuleKeyAliases_SubModule` (`CanonicalSubModule`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `ModuleKeyAliases` (`AliasKey`, `CanonicalSubModule`, `CategoryLabel`, `DisplayOrder`) VALUES
-- Overview & Academic
('dashboard', 'Dashboard', 'Overview', 1),
('board-academic-year', 'Board & Academic Year', 'Academic', 2),
('board-academic-years', 'Board & Academic Year', 'Academic', 2),
('group-management', 'Group Management', 'Academic', 3),
('courses', 'Group Management', 'Academic', 3),
('academics', 'Group Management', 'Academic', 3),
('subject-management', 'Subject Management', 'Academic', 4),
('classes', 'Subject Management', 'Academic', 4),
('section-room', 'Section & Room', 'Academic', 5),
('timetable', 'Timetable', 'Academic', 6),
('parent-timetable', 'Timetable', 'Academic', 6),
('holiday-management', 'Holiday Management', 'Academic', 7),
('holidays', 'Holiday Management', 'Academic', 7),
('academic-calendar', 'Holiday Management', 'Academic', 7),
('academic_calendar', 'Holiday Management', 'Academic', 7),
('warden-holidays', 'Holiday Management', 'Academic', 7),
('driver-holidays', 'Holiday Management', 'Academic', 7),
('accountant-holidays', 'Holiday Management', 'Academic', 7),

-- Student & Admissions
('student-admission', 'Student Admission', 'Student', 10),
('student-management', 'Student Management', 'Student', 11),
('parent-children', 'Student Management', 'Student', 11),
('section-allocation', 'Section Allocation', 'Student', 12),
('attendance', 'Attendance', 'Student', 13),
('parent-attendance', 'Attendance', 'Student', 13),
('exam-cell-attendance', 'Attendance', 'Student', 13),
('promotion', 'Promotion', 'Student', 14),
('promotions', 'Promotion', 'Student', 14),
('exam-cell-promotions', 'Promotion', 'Student', 14),

-- Staff & HR
('staff-management', 'Staff Management', 'Staff', 20),
('department-designation', 'Department & Designation', 'Staff', 21),
('staff-attendance', 'Staff Attendance', 'Staff', 22),
('myattendance', 'Staff Attendance', 'Staff', 22),
('my-attendance', 'Staff Attendance', 'Staff', 22),
('warden-my-attendance', 'Staff Attendance', 'Staff', 22),
('driver-my-attendance', 'Staff Attendance', 'Staff', 22),
('accountant-my-attendance', 'Staff Attendance', 'Staff', 22),
('exam-cell-my-attendance', 'Staff Attendance', 'Staff', 22),
('staff-leave-management', 'Staff Leave Management', 'Staff', 23),
('leave', 'Staff Leave Management', 'Staff', 23),
('staff-leave', 'Staff Leave Management', 'Staff', 23),
('warden-staff-leave', 'Staff Leave Management', 'Staff', 23),
('driver-leave-management', 'Staff Leave Management', 'Staff', 23),
('accountant-staff-leave', 'Staff Leave Management', 'Staff', 23),
('inventory-leave-management', 'Staff Leave Management', 'Staff', 23),
('reimbursement', 'Staff Reimbursements', 'Staff', 24),
('reimbursements', 'Staff Reimbursements', 'Staff', 24),
('staff-reimbursement', 'Staff Reimbursements', 'Staff', 24),
('staff-reimbursements', 'Staff Reimbursements', 'Staff', 24),
('warden-reimbursements', 'Staff Reimbursements', 'Staff', 24),
('accountant-reimbursements', 'Staff Reimbursements', 'Staff', 24),

-- Examinations & Results
('examination', 'Examination', 'Examinations', 30),
('examinations', 'Examination', 'Examinations', 30),
('examduties', 'Examination', 'Examinations', 30),
('exam-duties', 'Examination', 'Examinations', 30),
('parent-examinations', 'Examination', 'Examinations', 30),
('exam-cell-examination', 'Examination', 'Examinations', 30),
('marks-evaluation', 'Marks Evaluation', 'Examinations', 31),
('marks', 'Marks Evaluation', 'Examinations', 31),
('exam-cell-marks-entry', 'Marks Evaluation', 'Examinations', 31),
('results', 'Results', 'Examinations', 32),
('parent-academics-results', 'Results', 'Examinations', 32),
('exam-cell-results', 'Results', 'Examinations', 32),

-- Finance & Payroll
('fee-management', 'Fee Management', 'Finance', 40),
('fees', 'Fee Management', 'Finance', 40),
('parent-fees-payments', 'Fee Management', 'Finance', 40),
('accountant-fee-management', 'Fee Management', 'Finance', 40),
('accountant-payment-history', 'Fee Management', 'Finance', 40),
('payroll', 'Payroll', 'Finance', 41),
('salary', 'Payroll', 'Finance', 41),
('payslips', 'Payroll', 'Finance', 41),
('driver-my-payslips', 'Payroll', 'Finance', 41),
('accountant-payroll', 'Payroll', 'Finance', 41),
('accountant-attendance-impact', 'Payroll', 'Finance', 41),
('inventory-my-payslips', 'Payroll', 'Finance', 41),

-- Transport & Fleet
('transport', 'Transport', 'Student', 50),
('driver-todays-trips', 'Transport', 'Student', 50),
('driver-route-stops', 'Transport', 'Student', 50),
('driver-live-navigation', 'Transport', 'Student', 50),
('driver-student-manifest', 'Transport', 'Student', 50),
('transport-manager-setup', 'Transport', 'Student', 50),
('transport-manager-operations', 'Transport', 'Student', 50),

-- Hostel
('hostel-management', 'Hostel Management', 'Hostel Management', 60),
('hostel', 'Hostel Management', 'Hostel Management', 60),
('warden-dashboard', 'Dashboard', 'Overview', 60),
('warden-rooms-beds', 'Hostel Management', 'Hostel Management', 60),
('warden-student-allocations', 'Hostel Management', 'Hostel Management', 60),
('warden-hostel-attendance', 'Hostel Management', 'Hostel Management', 60),
('warden-outpass-leaves', 'Hostel Management', 'Hostel Management', 60),
('warden-resident-students', 'Hostel Management', 'Hostel Management', 60),
('warden-hostel-reports', 'Hostel Management', 'Hostel Management', 60),

-- Inventory
('inventory', 'Inventory Management', 'Academic', 70),
('inventory-management', 'Inventory Management', 'Academic', 70),
('inventory-dashboard', 'Dashboard', 'Overview', 70),
('inventory-items', 'Inventory Management', 'Academic', 70),
('inventory-stock-in', 'Inventory Management', 'Academic', 70),
('inventory-stock-out', 'Inventory Management', 'Academic', 70),
('inventory-suppliers', 'Inventory Management', 'Academic', 70),
('inventory-categories', 'Inventory Management', 'Academic', 70),
('inventory-purchase-orders', 'Inventory Management', 'Academic', 70),
('inventory-returns', 'Inventory Management', 'Academic', 70),
('inventory-reports', 'Inventory Management', 'Academic', 70),

-- Documents, Reports & Settings
('certificates', 'Certificates', 'Documents & Reports', 80),
('documents', 'Certificates', 'Documents & Reports', 80),
('parent-documents', 'Certificates', 'Documents & Reports', 80),
('exam-cell-certificates', 'Certificates', 'Documents & Reports', 80),
('reports', 'Reports & Analytics', 'Documents & Reports', 81),
('reports-analytics', 'Reports & Analytics', 'Documents & Reports', 81),
('parent-announcements-events', 'Reports & Analytics', 'Documents & Reports', 81),
('parent-communication', 'Reports & Analytics', 'Documents & Reports', 81),
('driver-trip-reports', 'Reports & Analytics', 'Documents & Reports', 81),
('accountant-financial-reports', 'Reports & Analytics', 'Documents & Reports', 81),
('settings', 'Settings', 'Administration', 90),
('parent-settings', 'Settings', 'Administration', 90),
('driver-settings', 'Settings', 'Administration', 90),
('accountant-settings', 'Settings', 'Administration', 90),
('exam-cell-settings', 'Settings', 'Administration', 90),
('inventory-settings', 'Settings', 'Administration', 90),
('roles-permissions', 'Roles & Permissions', 'Administration', 91),
('profile', 'Dashboard', 'Overview', 99),
('driver-profile', 'Dashboard', 'Overview', 99),
('accountant-profile', 'Dashboard', 'Overview', 99),
('exam-cell-profile', 'Dashboard', 'Overview', 99),
('inventory-profile', 'Dashboard', 'Overview', 99)
ON DUPLICATE KEY UPDATE 
    `CanonicalSubModule` = VALUES(`CanonicalSubModule`),
    `CategoryLabel` = VALUES(`CategoryLabel`),
    `DisplayOrder` = VALUES(`DisplayOrder`);

-- 2. Enhanced sp_UpdateRolePermissions Procedure
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

    -- 1. Delete existing RolePermissions for the canonical submodules and screens being updated
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

    -- 3. Auto-sync newly granted submodules into RoleModules table
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

    DROP TEMPORARY TABLE IF EXISTS tmp_module_raw;
    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;

    COMMIT;
END //
DELIMITER ;

-- 3. Enhanced sp_CheckUserModuleAction Procedure
DROP PROCEDURE IF EXISTS `sp_CheckUserModuleAction`;
DELIMITER //
CREATE DEFINER="avnadmin"@"%" PROCEDURE `sp_CheckUserModuleAction`(
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

    -- Resolve module aliases to canonical SubModule names via ModuleKeyAliases
    SELECT CanonicalSubModule INTO v_TargetModule
    FROM `ModuleKeyAliases`
    WHERE LOWER(AliasKey) = LOWER(TRIM(p_ModuleIdentifier))
    LIMIT 1;

    IF v_TargetModule IS NULL OR v_TargetModule = '' THEN
        SET v_TargetModule = TRIM(p_ModuleIdentifier);
    END IF;

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
