-- ====================================================================================
-- 12_Seed_Receptionist_And_NonTeaching_RBAC.sql
-- Idempotent RBAC Migration for Receptionist & Non-Teaching Portal Aliases
-- 1. Upsert all Receptionist & Non-Teaching sidebar ModuleKeyAliases
-- 2. Insert RoleModules (INSERT IGNORE) for Receptionist
-- 3. Seed baseline RolePermissions (INSERT IGNORE) for Receptionist when unseeded
-- ====================================================================================

-- 1. Upsert Receptionist & Non-Teaching ModuleKeyAliases (matches ModuleKeyResolver.cs)
INSERT INTO `ModuleKeyAliases` (`AliasKey`, `CanonicalSubModule`, `CategoryLabel`, `DisplayOrder`) VALUES
-- Dashboard
('receptionist-dashboard', 'Dashboard', 'Overview', 1),
('receptionist-my-tasks', 'Dashboard', 'Overview', 1),
('non-teaching-dashboard', 'Dashboard', 'Overview', 1),
('non-teaching-tasks', 'Dashboard', 'Overview', 1),

-- My Profile
('receptionist-profile', 'My Profile', 'Overview', 5),
('non-teaching-profile', 'My Profile', 'Overview', 5),

-- Staff Attendance
('receptionist-my-attendance', 'Staff Attendance', 'Staff', 22),
('non-teaching-attendance', 'Staff Attendance', 'Staff', 22),

-- Staff Leave Management
('receptionist-leave-management', 'Staff Leave Management', 'Staff', 23),
('non-teaching-leave', 'Staff Leave Management', 'Staff', 23),

-- Payroll
('receptionist-payslips', 'Payroll', 'Finance', 41),
('non-teaching-payslip', 'Payroll', 'Finance', 41),

-- Reports & Analytics
('receptionist-announcements', 'Reports & Analytics', 'Documents & Reports', 81),
('non-teaching-announcements', 'Reports & Analytics', 'Documents & Reports', 81),

-- Enquiry Management
('receptionist-enquiries', 'Enquiry Management', 'Student', 15),
('non-teaching-enquiries', 'Enquiry Management', 'Student', 15),

-- Department & Designation
('receptionist-department-portal', 'Department & Designation', 'Staff', 21),
('non-teaching-department', 'Department & Designation', 'Staff', 21),

-- Settings
('receptionist-help-support', 'Settings', 'Administration', 90),
('non-teaching-support', 'Settings', 'Administration', 90)
ON DUPLICATE KEY UPDATE
    `CanonicalSubModule` = VALUES(`CanonicalSubModule`),
    `CategoryLabel` = VALUES(`CategoryLabel`),
    `DisplayOrder` = VALUES(`DisplayOrder`);

-- 2. Insert RoleModules (INSERT IGNORE) for Receptionist
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT r.RoleId, m.ModuleKey, m.SubModule, UTC_TIMESTAMP()
FROM `Roles` r
CROSS JOIN (
    SELECT 'dashboard' AS ModuleKey, 'Dashboard' AS SubModule
    UNION ALL SELECT 'my-profile', 'My Profile'
    UNION ALL SELECT 'staff-attendance', 'Staff Attendance'
    UNION ALL SELECT 'staff-leave-management', 'Staff Leave Management'
    UNION ALL SELECT 'payroll', 'Payroll'
    UNION ALL SELECT 'reports-analytics', 'Reports & Analytics'
    UNION ALL SELECT 'enquiry-management', 'Enquiry Management'
    UNION ALL SELECT 'department-designation', 'Department & Designation'
    UNION ALL SELECT 'settings', 'Settings'
) m
WHERE LOWER(r.RoleName) = 'receptionist';

-- 3. Seed baseline RolePermissions (INSERT IGNORE) for Receptionist only if it currently has 0 RolePermissions
SET @receptionistRoleId = (
    SELECT `RoleId`
    FROM `Roles`
    WHERE LOWER(`RoleName`) = 'receptionist'
    LIMIT 1
);

SET @receptionistExistingPermCount = (
    SELECT COUNT(*)
    FROM `RolePermissions`
    WHERE `RoleId` = @receptionistRoleId
);

INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT @receptionistRoleId, p.PermissionId, UTC_TIMESTAMP()
FROM `Permissions` p
WHERE @receptionistRoleId IS NOT NULL
  AND @receptionistExistingPermCount = 0
  AND (
      -- Module-level View on all 9 Receptionist modules
      (
          COALESCE(p.ScreenCode, '') = ''
          AND LOWER(p.Action) = 'view'
          AND LOWER(p.SubModule) IN (
              'dashboard',
              'my profile',
              'staff attendance',
              'staff leave management',
              'payroll',
              'reports & analytics',
              'enquiry management',
              'department & designation',
              'settings'
          )
      )
      -- Add & Edit on Enquiry Management
      OR (
          COALESCE(p.ScreenCode, '') = ''
          AND LOWER(p.SubModule) = 'enquiry management'
          AND LOWER(p.Action) IN ('add', 'edit')
      )
      -- Add on Staff Leave Management
      OR (
          COALESCE(p.ScreenCode, '') = ''
          AND LOWER(p.SubModule) = 'staff leave management'
          AND LOWER(p.Action) = 'add'
      )
      -- Edit on My Profile
      OR (
          COALESCE(p.ScreenCode, '') = ''
          AND LOWER(p.SubModule) = 'my profile'
          AND LOWER(p.Action) = 'edit'
      )
      -- View on my-attendance screen under Staff Attendance (if present)
      OR (
          LOWER(p.SubModule) = 'staff attendance'
          AND LOWER(COALESCE(p.ScreenCode, '')) = 'my-attendance'
          AND LOWER(p.Action) = 'view'
      )
  );
