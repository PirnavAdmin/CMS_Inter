-- ====================================================================================
-- 09_Complete_Portal_RBAC_Parity.sql
-- Idempotent RBAC & Portal Parity Migration
-- 1. Upsert all missing portal sidebar ModuleKeyAliases
-- 2. Ensure module-level Permissions rows exist for My Profile, Board & Academic Year,
--    Enquiry Management, and Settings screens (offer-letter-configuration, payment-gateway)
-- 3. Ensure Roles exist for Transport Manager and Inventory Manager
-- 4. Ensure RoleModules for Parent (RoleId 6) include all Parent portal modules
--    and Student (RoleId 5) includes Transport
-- ====================================================================================

-- 1. Upsert missing ModuleKeyAliases (matches ModuleKeyResolver.cs)
INSERT INTO `ModuleKeyAliases` (`AliasKey`, `CanonicalSubModule`, `CategoryLabel`, `DisplayOrder`) VALUES
('parent-dashboard', 'Dashboard', 'Overview', 1),
('accountant-dashboard', 'Dashboard', 'Overview', 1),
('exam-cell-dashboard', 'Dashboard', 'Overview', 1),
('driver-dashboard', 'Dashboard', 'Overview', 1),
('inventory-notifications', 'Dashboard', 'Overview', 1),
('exam-cell-holiday-management', 'Holiday Management', 'Academic', 7),
('warden-settings', 'Settings', 'Administration', 90),
('transport-manager-setup', 'Transport', 'Student', 50),
('transport-manager-operations', 'Transport', 'Student', 50),
('parent-profile', 'My Profile', 'Overview', 5),
('enquiry-management', 'Enquiry Management', 'Student', 15),
('enquiries', 'Enquiry Management', 'Student', 15)
ON DUPLICATE KEY UPDATE
    `CanonicalSubModule` = VALUES(`CanonicalSubModule`),
    `CategoryLabel` = VALUES(`CategoryLabel`),
    `DisplayOrder` = VALUES(`DisplayOrder`);

-- 2. Ensure module-level Permissions rows (COALESCE(ScreenCode, '') = '') and Settings screen rows exist
-- 2a. My Profile (module-level)
INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Overview', 'My Profile', 'View', 'overview.profile.view', 'View My Profile', 'Overview', 5, '', 'My Profile'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'my profile' AND LOWER(`Action`) = 'view' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'overview.profile.view');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Overview', 'My Profile', 'Add', 'overview.profile.add', 'Add My Profile', 'Overview', 6, '', 'My Profile'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'my profile' AND LOWER(`Action`) = 'add' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'overview.profile.add');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Overview', 'My Profile', 'Edit', 'overview.profile.edit', 'Edit My Profile', 'Overview', 7, '', 'My Profile'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'my profile' AND LOWER(`Action`) = 'edit' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'overview.profile.edit');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Overview', 'My Profile', 'Delete', 'overview.profile.delete', 'Delete My Profile', 'Overview', 8, '', 'My Profile'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'my profile' AND LOWER(`Action`) = 'delete' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'overview.profile.delete');

-- 2b. Board & Academic Year (module-level)
INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Academic', 'Board & Academic Year', 'View', 'academic.board_academic_year.view', 'View Boards & Academic Years', 'Academic', 9, '', 'Board & Academic Year'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'board & academic year' AND LOWER(`Action`) = 'view' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'academic.board_academic_year.view');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Academic', 'Board & Academic Year', 'Add', 'academic.board_academic_year.add', 'Create Boards & Academic Years', 'Academic', 9, '', 'Board & Academic Year'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'board & academic year' AND LOWER(`Action`) = 'add' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'academic.board_academic_year.add');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Academic', 'Board & Academic Year', 'Edit', 'academic.board_academic_year.edit', 'Edit Boards & Academic Years', 'Academic', 9, '', 'Board & Academic Year'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'board & academic year' AND LOWER(`Action`) = 'edit' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'academic.board_academic_year.edit');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Academic', 'Board & Academic Year', 'Delete', 'academic.board_academic_year.delete', 'Delete Boards & Academic Years', 'Academic', 9, '', 'Board & Academic Year'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'board & academic year' AND LOWER(`Action`) = 'delete' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'academic.board_academic_year.delete');

-- 2c. Enquiry Management (module-level)
INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Student', 'Enquiry Management', 'View', 'student.enquiry_management.view', 'View Admission Enquiries', 'Student', 55, '', 'Enquiry Management'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'enquiry management' AND LOWER(`Action`) = 'view' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'student.enquiry_management.view');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Student', 'Enquiry Management', 'Add', 'student.enquiry_management.add', 'Create Admission Enquiries', 'Student', 56, '', 'Enquiry Management'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'enquiry management' AND LOWER(`Action`) = 'add' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'student.enquiry_management.add');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Student', 'Enquiry Management', 'Edit', 'student.enquiry_management.edit', 'Update Enquiry Status & Notes', 'Student', 57, '', 'Enquiry Management'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'enquiry management' AND LOWER(`Action`) = 'edit' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'student.enquiry_management.edit');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Student', 'Enquiry Management', 'Delete', 'student.enquiry_management.delete', 'Delete Admission Enquiries', 'Student', 58, '', 'Enquiry Management'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'enquiry management' AND LOWER(`Action`) = 'delete' AND COALESCE(`ScreenCode`, '') = '')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'student.enquiry_management.delete');

-- 2d. Settings -> Offer Letter Configuration (screen-level)
INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'View', 'administration.settings.offer_letter_configuration.view', 'View Offer Letter Configuration', 'Administration', 264, 'offer-letter-configuration', 'Offer Letter Configuration'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'offer-letter-configuration' AND LOWER(`Action`) = 'view')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.offer_letter_configuration.view');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'Add', 'administration.settings.offer_letter_configuration.add', 'Create Offer Letter Configuration', 'Administration', 265, 'offer-letter-configuration', 'Offer Letter Configuration'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'offer-letter-configuration' AND LOWER(`Action`) = 'add')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.offer_letter_configuration.add');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'Edit', 'administration.settings.offer_letter_configuration.edit', 'Edit Offer Letter Configuration', 'Administration', 266, 'offer-letter-configuration', 'Offer Letter Configuration'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'offer-letter-configuration' AND LOWER(`Action`) = 'edit')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.offer_letter_configuration.edit');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'Delete', 'administration.settings.offer_letter_configuration.delete', 'Delete Offer Letter Configuration', 'Administration', 267, 'offer-letter-configuration', 'Offer Letter Configuration'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'offer-letter-configuration' AND LOWER(`Action`) = 'delete')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.offer_letter_configuration.delete');

-- 2e. Settings -> Payment Gateway (screen-level)
INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'View', 'administration.settings.payment_gateway.view', 'View Payment Gateway Settings', 'Administration', 268, 'payment-gateway', 'Payment Gateway'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'payment-gateway' AND LOWER(`Action`) = 'view')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.payment_gateway.view');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'Add', 'administration.settings.payment_gateway.add', 'Create Payment Gateway Settings', 'Administration', 268, 'payment-gateway', 'Payment Gateway'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'payment-gateway' AND LOWER(`Action`) = 'add')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.payment_gateway.add');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'Edit', 'administration.settings.payment_gateway.edit', 'Edit Payment Gateway Settings', 'Administration', 269, 'payment-gateway', 'Payment Gateway'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'payment-gateway' AND LOWER(`Action`) = 'edit')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.payment_gateway.edit');

INSERT INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`, `ScreenCode`, `Screen`)
SELECT 'Administration', 'Settings', 'Delete', 'administration.settings.payment_gateway.delete', 'Delete Payment Gateway Settings', 'Administration', 269, 'payment-gateway', 'Payment Gateway'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Permissions` WHERE LOWER(`SubModule`) = 'settings' AND LOWER(COALESCE(`ScreenCode`, '')) = 'payment-gateway' AND LOWER(`Action`) = 'delete')
  AND NOT EXISTS (SELECT 1 FROM `Permissions` WHERE `PermissionCode` = 'administration.settings.payment_gateway.delete');

-- Grant Super Admin (RoleId 1) and Admin (RoleId 2) any newly added permissions
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 1, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE EXISTS (SELECT 1 FROM `Roles` WHERE `RoleId` = 1)
  AND `PermissionCode` IN (
      'overview.profile.view', 'overview.profile.add', 'overview.profile.edit', 'overview.profile.delete',
      'academic.board_academic_year.view', 'academic.board_academic_year.add', 'academic.board_academic_year.edit', 'academic.board_academic_year.delete',
      'student.enquiry_management.view', 'student.enquiry_management.add', 'student.enquiry_management.edit', 'student.enquiry_management.delete',
      'administration.settings.offer_letter_configuration.view', 'administration.settings.offer_letter_configuration.add', 'administration.settings.offer_letter_configuration.edit', 'administration.settings.offer_letter_configuration.delete',
      'administration.settings.payment_gateway.view', 'administration.settings.payment_gateway.add', 'administration.settings.payment_gateway.edit', 'administration.settings.payment_gateway.delete'
  );

INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 2, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE EXISTS (SELECT 1 FROM `Roles` WHERE `RoleId` = 2)
  AND `PermissionCode` IN (
      'overview.profile.view', 'overview.profile.add', 'overview.profile.edit', 'overview.profile.delete',
      'academic.board_academic_year.view', 'academic.board_academic_year.add', 'academic.board_academic_year.edit', 'academic.board_academic_year.delete',
      'student.enquiry_management.view', 'student.enquiry_management.add', 'student.enquiry_management.edit', 'student.enquiry_management.delete',
      'administration.settings.offer_letter_configuration.view', 'administration.settings.offer_letter_configuration.add', 'administration.settings.offer_letter_configuration.edit', 'administration.settings.offer_letter_configuration.delete',
      'administration.settings.payment_gateway.view', 'administration.settings.payment_gateway.add', 'administration.settings.payment_gateway.edit', 'administration.settings.payment_gateway.delete'
  );

-- 3. Ensure Roles exist for Transport Manager and Inventory Manager
INSERT INTO `Roles` (`RoleName`, `Description`, `StaffType`, `IsSystemRole`, `IsActive`, `CreatedAt`, `UpdatedAt`)
SELECT 'Transport Manager', 'Fleet setup, route management, driver assignments, and transport operations', 'Non-Teaching', 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Roles` WHERE LOWER(`RoleName`) = 'transport manager');

INSERT INTO `Roles` (`RoleName`, `Description`, `StaffType`, `IsSystemRole`, `IsActive`, `CreatedAt`, `UpdatedAt`)
SELECT 'Inventory Manager', 'Inventory items catalog, stock movements, suppliers, purchase orders, and returns', 'Non-Teaching', 0, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `Roles` WHERE LOWER(`RoleName`) = 'inventory manager');

-- Seed default RoleModules for Transport Manager (only if role has no RoleModules yet)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT r.RoleId, m.ModuleKey, m.SubModule, UTC_TIMESTAMP()
FROM `Roles` r
CROSS JOIN (
    SELECT 'dashboard' AS ModuleKey, 'Dashboard' AS SubModule
    UNION ALL SELECT 'transport', 'Transport'
    UNION ALL SELECT 'holiday-management', 'Holiday Management'
    UNION ALL SELECT 'staff-attendance', 'Staff Attendance'
    UNION ALL SELECT 'staff-leave-management', 'Staff Leave Management'
    UNION ALL SELECT 'staff-reimbursements', 'Staff Reimbursements'
    UNION ALL SELECT 'payroll', 'Payroll'
    UNION ALL SELECT 'reports-analytics', 'Reports & Analytics'
    UNION ALL SELECT 'settings', 'Settings'
    UNION ALL SELECT 'my-profile', 'My Profile'
) m
WHERE LOWER(r.RoleName) = 'transport manager'
  AND NOT EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = r.RoleId);

-- Seed default RoleModules for Inventory Manager (only if role has no RoleModules yet)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT r.RoleId, m.ModuleKey, m.SubModule, UTC_TIMESTAMP()
FROM `Roles` r
CROSS JOIN (
    SELECT 'dashboard' AS ModuleKey, 'Dashboard' AS SubModule
    UNION ALL SELECT 'inventory-management', 'Inventory Management'
    UNION ALL SELECT 'staff-leave-management', 'Staff Leave Management'
    UNION ALL SELECT 'payroll', 'Payroll'
    UNION ALL SELECT 'reports-analytics', 'Reports & Analytics'
    UNION ALL SELECT 'settings', 'Settings'
    UNION ALL SELECT 'my-profile', 'My Profile'
) m
WHERE LOWER(r.RoleName) = 'inventory manager'
  AND NOT EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = r.RoleId);

-- 4. Ensure RoleModules for Parent (RoleId 6) include all Parent portal modules
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT 6, m.ModuleKey, m.SubModule, UTC_TIMESTAMP()
FROM (
    SELECT 'dashboard' AS ModuleKey, 'Dashboard' AS SubModule
    UNION ALL SELECT 'student-management', 'Student Management'
    UNION ALL SELECT 'attendance', 'Attendance'
    UNION ALL SELECT 'results', 'Results'
    UNION ALL SELECT 'examination', 'Examination'
    UNION ALL SELECT 'fee-management', 'Fee Management'
    UNION ALL SELECT 'timetable', 'Timetable'
    UNION ALL SELECT 'reports-analytics', 'Reports & Analytics'
    UNION ALL SELECT 'certificates', 'Certificates'
    UNION ALL SELECT 'settings', 'Settings'
    UNION ALL SELECT 'my-profile', 'My Profile'
) m
WHERE EXISTS (SELECT 1 FROM `Roles` WHERE `RoleId` = 6);

-- 5. Ensure RoleModules for Student (RoleId 5) include Transport
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT 5, 'transport', 'Transport', UTC_TIMESTAMP()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM `Roles` WHERE `RoleId` = 5);

-- Ensure Super Admin (RoleId 1) and Admin (RoleId 2) RoleModules include My Profile, Board & Academic Year, and Enquiry Management
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT r.RoleId, m.ModuleKey, m.SubModule, UTC_TIMESTAMP()
FROM `Roles` r
CROSS JOIN (
    SELECT 'my-profile' AS ModuleKey, 'My Profile' AS SubModule
    UNION ALL SELECT 'board-academic-year', 'Board & Academic Year'
    UNION ALL SELECT 'enquiry-management', 'Enquiry Management'
) m
WHERE r.RoleId IN (1, 2);

-- ====================================================================================
-- NOTE ON sp_GetRoleCards (Parent user count):
-- PermissionRepository.GetRoleCardsAsync calls sp_GetRoleCards with 4 parameters:
--   (p_CampusId, p_BoardId, p_AcademicYearId, p_IncludeInactive)
-- and maps StaffType on RoleCardDto, whereas 01_Unified_Roles_and_Permissions_Schema.sql
-- only contains an older 3-parameter definition. To avoid breaking the live 4-parameter
-- signature, sp_GetRoleCards is intentionally NOT dropped/recreated here.
-- After inspecting `SHOW CREATE PROCEDURE sp_GetRoleCards;` on the target database,
-- replace the `WHEN r.RoleId = 6 THEN (...)` branch with:
--
--   WHEN r.RoleId = 6 THEN (
--       SELECT COUNT(DISTINCT u.UserId)
--       FROM `Users` u
--       LEFT JOIN `ParentStudentMappings` psm ON psm.ParentUserId = u.UserId
--       LEFT JOIN `Students` stu ON stu.StudentId = psm.StudentId AND stu.IsActive = 1
--       WHERE u.RoleId = 6 AND u.IsActive = 1
--         AND (p_CampusId IS NULL OR p_CampusId = 0 OR stu.CampusId = p_CampusId)
--         AND (p_BoardId IS NULL OR p_BoardId = 0 OR stu.BoardId = p_BoardId)
--         AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
--   )
-- ====================================================================================
