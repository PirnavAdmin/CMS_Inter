-- =====================================================================================
-- RBAC Baseline Synchronization Script for College Management System
-- Database Target: MySQL 8.0 (Aiven Cloud / Staging / Production)
-- Purpose: Idempotent baseline seed for RoleModules and RolePermissions across all roles.
-- Safety: Uses INSERT IGNORE. Zero destructive statements (NO DROP, NO TRUNCATE, NO DELETE).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Ensure RoleModules entries exist for all operational roles (Idempotent)
-- -------------------------------------------------------------------------------------

-- Student (RoleId 5)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(5, 'dashboard', 'Dashboard'),
(5, 'attendance', 'Attendance'),
(5, 'fee-management', 'Fee Management'),
(5, 'results', 'Results'),
(5, 'timetable', 'Timetable'),
(5, 'holiday-management', 'Holiday Management'),
(5, 'examination', 'Examination'),
(5, 'student-management', 'Student Management'),
(5, 'subject-management', 'Subject Management');

-- Parent (RoleId 6)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(6, 'dashboard', 'Dashboard'),
(6, 'attendance', 'Attendance'),
(6, 'fee-management', 'Fee Management'),
(6, 'results', 'Results'),
(6, 'timetable', 'Timetable'),
(6, 'examination', 'Examination'),
(6, 'marks-evaluation', 'Marks Evaluation'),
(6, 'holiday-management', 'Holiday Management'),
(6, 'student-management', 'Student Management');

-- Examination Cell (RoleId 8)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(8, 'dashboard', 'Dashboard'),
(8, 'examination', 'Examination'),
(8, 'marks-evaluation', 'Marks Evaluation'),
(8, 'reports-analytics', 'Reports & Analytics'),
(8, 'results', 'Results'),
(8, 'subject-management', 'Subject Management'),
(8, 'section-room', 'Section & Room'),
(8, 'group-management', 'Group Management'),
(8, 'student-management', 'Student Management'),
(8, 'timetable', 'Timetable');

-- Hostel Warden (RoleId 10)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(10, 'dashboard', 'Dashboard'),
(10, 'hostel-management', 'Hostel Management'),
(10, 'student-management', 'Student Management'),
(10, 'staff-management', 'Staff Management');

-- Bus Driver (RoleId 12)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(12, 'dashboard', 'Dashboard'),
(12, 'transport', 'Transport'),
(12, 'staff-management', 'Staff Management');

-- Attendant (RoleId 13)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(13, 'dashboard', 'Dashboard'),
(13, 'attendance', 'Attendance');

-- Dean (RoleId 14)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(14, 'dashboard', 'Dashboard'),
(14, 'attendance', 'Attendance'),
(14, 'examination', 'Examination'),
(14, 'group-management', 'Group Management'),
(14, 'marks-evaluation', 'Marks Evaluation'),
(14, 'reports-analytics', 'Reports & Analytics'),
(14, 'results', 'Results'),
(14, 'staff-management', 'Staff Management'),
(14, 'subject-management', 'Subject Management'),
(14, 'timetable', 'Timetable');

-- Inventory Manager (RoleId 16)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(16, 'dashboard', 'Dashboard'),
(16, 'inventory-management', 'Inventory Management');

-- Transport Manager (RoleId 18)
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`) VALUES
(18, 'dashboard', 'Dashboard'),
(18, 'transport', 'Transport'),
(18, 'staff-management', 'Staff Management'),
(18, 'student-management', 'Student Management'),
(18, 'inventory-management', 'Inventory Management');

-- -------------------------------------------------------------------------------------
-- 2. Populate RolePermissions for roles to ensure View/operational actions are granted
-- -------------------------------------------------------------------------------------

-- Dean (RoleId 14) - View permissions on all 10 dean modules
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 14, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN (
    'Dashboard', 'Attendance', 'Examination', 'Group Management', 
    'Marks Evaluation', 'Reports & Analytics', 'Results', 
    'Staff Management', 'Subject Management', 'Timetable'
) AND `Action` = 'View';

-- Attendant (RoleId 13) - View permissions on Attendance and Dashboard
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 13, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN ('Dashboard', 'Attendance') AND `Action` = 'View';

-- Student (RoleId 5) - View permissions on Student modules
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 5, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN ('Holiday Management', 'Examination', 'Student Management', 'Subject Management') AND `Action` = 'View';

-- Parent (RoleId 6) - View permissions on Parent modules
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 6, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN ('Timetable', 'Examination', 'Marks Evaluation', 'Holiday Management', 'Student Management') AND `Action` = 'View';

-- Examination Cell (RoleId 8) - View permissions on Exam Cell operational modules
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 8, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN ('Subject Management', 'Section & Room', 'Group Management', 'Student Management', 'Timetable') AND `Action` = 'View';

-- Hostel Warden (RoleId 10) - View permissions on Warden operational modules
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 10, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN ('Student Management', 'Staff Management') AND `Action` = 'View';

-- Bus Driver (RoleId 12) - View permissions on Staff Management
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 12, `PermissionId` FROM `Permissions` 
WHERE `SubModule` = 'Staff Management' AND `Action` = 'View';

-- Transport Manager (RoleId 18) - Full transport/dashboard and View on staff/student/inventory
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 18, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN ('Transport', 'Dashboard');

INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 18, `PermissionId` FROM `Permissions` 
WHERE `SubModule` IN ('Staff Management', 'Student Management', 'Inventory Management') AND `Action` = 'View';

-- Inventory Manager (RoleId 16) - View on Dashboard
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 16, `PermissionId` FROM `Permissions` 
WHERE `SubModule` = 'Dashboard' AND `Action` = 'View';
