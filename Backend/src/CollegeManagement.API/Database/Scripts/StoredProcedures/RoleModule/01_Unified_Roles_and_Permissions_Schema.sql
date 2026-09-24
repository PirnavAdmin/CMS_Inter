-- ====================================================================================
-- UNIFIED ROLES & PERMISSIONS MODULE SCHEMA & PROCEDURES
-- Pirnav College Management System
-- Canonical Roles, 4-Tier Matrix (View/Add/Edit/Delete), User Assignments & Overrides
-- ====================================================================================

-- 1. Ensure Columns in Roles Table
SET @dbname = DATABASE();
SET @tablename = 'Roles';

SET @precheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'Description');
SET @sql = IF(@precheck = 0, 'ALTER TABLE `Roles` ADD COLUMN `Description` VARCHAR(255) NULL AFTER `RoleName`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @precheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'IsSystemRole');
SET @sql = IF(@precheck = 0, 'ALTER TABLE `Roles` ADD COLUMN `IsSystemRole` TINYINT(1) NOT NULL DEFAULT 0 AFTER `Description`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @precheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'IsActive');
SET @sql = IF(@precheck = 0, 'ALTER TABLE `Roles` ADD COLUMN `IsActive` TINYINT(1) NOT NULL DEFAULT 1 AFTER `IsSystemRole`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @precheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'CreatedAt');
SET @sql = IF(@precheck = 0, 'ALTER TABLE `Roles` ADD COLUMN `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `IsActive`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @precheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'UpdatedAt');
SET @sql = IF(@precheck = 0, 'ALTER TABLE `Roles` ADD COLUMN `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `CreatedAt`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Upsert Canonical Roles
INSERT INTO `Roles` (`RoleId`, `RoleName`, `Description`, `IsSystemRole`, `IsActive`)
VALUES 
(1, 'Super Admin', 'Unrestricted administrative access across all system modules', 1, 1),
(2, 'Admin', 'Campus administrative control over academics, staff, students, and fees', 1, 1),
(3, 'HOD', 'Department timetable substitutions, subject allocations, and faculty approvals', 0, 1),
(4, 'Faculty', 'Daily student attendance, marks entry, syllabus, and personal leave', 1, 1),
(5, 'Student', 'Self-service attendance, timetable, results, fee receipts, and hall tickets', 1, 1),
(6, 'Parent', 'Student academic progress, attendance, and fee notices', 0, 1),
(7, 'Accounts', 'Fee structures, fee collection receipts, payroll, and salary processing', 0, 1),
(8, 'Examination Cell', 'Exam timetables, hall ticket generation, marks processing, and results', 0, 1),
(9, 'Library / Librarian', 'Book cataloging, issue/return transactions, and student library cards', 0, 1),
(10, 'Hostel Warden', 'Block & room management, student bed allocations, and hostel attendance', 0, 1),
(11, 'Placement Officer', 'Recruiter management, campus drive scheduling, and student placement eligibility', 0, 1),
(12, 'Bus Driver', 'Assigned bus route view, student passenger checklist, and boarding attendance', 0, 1)
ON DUPLICATE KEY UPDATE 
    `RoleName` = VALUES(`RoleName`),
    `Description` = VALUES(`Description`),
    `IsSystemRole` = VALUES(`IsSystemRole`),
    `IsActive` = VALUES(`IsActive`);

-- 3. Create Permissions Table
CREATE TABLE IF NOT EXISTS `Permissions` (
    `PermissionId` INT NOT NULL AUTO_INCREMENT,
    `Module` VARCHAR(60) NOT NULL,
    `SubModule` VARCHAR(60) NOT NULL,
    `Action` VARCHAR(20) NOT NULL, -- 'View', 'Add', 'Edit', 'Delete'
    `PermissionCode` VARCHAR(100) NOT NULL,
    `DisplayName` VARCHAR(100) NOT NULL,
    `CategoryLabel` VARCHAR(60) NOT NULL,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`PermissionId`),
    UNIQUE KEY `UQ_Permissions_Code` (`PermissionCode`),
    INDEX `IX_Permissions_SubModule` (`SubModule`),
    INDEX `IX_Permissions_Module_Action` (`Module`, `Action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create RolePermissions Table
CREATE TABLE IF NOT EXISTS `RolePermissions` (
    `RolePermissionId` INT NOT NULL AUTO_INCREMENT,
    `RoleId` INT NOT NULL,
    `PermissionId` INT NOT NULL,
    `AssignedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`RolePermissionId`),
    UNIQUE KEY `UQ_RolePermissions_Role_Permission` (`RoleId`, `PermissionId`),
    INDEX `IX_RolePermissions_RoleId` (`RoleId`),
    INDEX `IX_RolePermissions_PermissionId` (`PermissionId`),
    CONSTRAINT `FK_RolePermissions_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`) ON DELETE CASCADE,
    CONSTRAINT `FK_RolePermissions_Permissions` FOREIGN KEY (`PermissionId`) REFERENCES `Permissions` (`PermissionId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create UserPermissions Table (Member Overrides)
CREATE TABLE IF NOT EXISTS `UserPermissions` (
    `UserPermissionId` INT NOT NULL AUTO_INCREMENT,
    `UserId` INT NOT NULL,
    `PermissionId` INT NOT NULL,
    `IsGranted` TINYINT(1) NOT NULL DEFAULT 1, -- 1 = Enabled, 0 = Disabled
    `AssignedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `AssignedByUserId` INT NULL,
    `Notes` VARCHAR(255) NULL,
    PRIMARY KEY (`UserPermissionId`),
    UNIQUE KEY `UQ_UserPermissions_User_Permission` (`UserId`, `PermissionId`),
    INDEX `IX_UserPermissions_UserId` (`UserId`),
    INDEX `IX_UserPermissions_PermissionId` (`PermissionId`),
    CONSTRAINT `FK_UserPermissions_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE,
    CONSTRAINT `FK_UserPermissions_Permissions` FOREIGN KEY (`PermissionId`) REFERENCES `Permissions` (`PermissionId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Populate Canonical Module Permissions Matrix (28 Modules x 4 Actions = 112 Permissions)
INSERT IGNORE INTO `Permissions` (`Module`, `SubModule`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`) VALUES
-- Overview
('Overview', 'Dashboard', 'View', 'overview.dashboard.view', 'View Dashboard', 'Overview', 1),
('Overview', 'Dashboard', 'Add', 'overview.dashboard.add', 'Add Dashboard Widgets', 'Overview', 2),
('Overview', 'Dashboard', 'Edit', 'overview.dashboard.edit', 'Edit Dashboard Layout', 'Overview', 3),
('Overview', 'Dashboard', 'Delete', 'overview.dashboard.delete', 'Delete Dashboard Widgets', 'Overview', 4),

-- Academic
('Academic', 'Group Management', 'View', 'academic.groups.view', 'View Groups & Courses', 'Academic', 10),
('Academic', 'Group Management', 'Add', 'academic.groups.add', 'Create Groups', 'Academic', 11),
('Academic', 'Group Management', 'Edit', 'academic.groups.edit', 'Edit Groups', 'Academic', 12),
('Academic', 'Group Management', 'Delete', 'academic.groups.delete', 'Delete Groups', 'Academic', 13),

('Academic', 'Subject Management', 'View', 'academic.subjects.view', 'View Subjects & Syllabus', 'Academic', 20),
('Academic', 'Subject Management', 'Add', 'academic.subjects.add', 'Add Subjects', 'Academic', 21),
('Academic', 'Subject Management', 'Edit', 'academic.subjects.edit', 'Edit Subjects', 'Academic', 22),
('Academic', 'Subject Management', 'Delete', 'academic.subjects.delete', 'Delete Subjects', 'Academic', 23),

('Academic', 'Section & Room', 'View', 'academic.sections.view', 'View Sections & Rooms', 'Academic', 30),
('Academic', 'Section & Room', 'Add', 'academic.sections.add', 'Add Sections & Rooms', 'Academic', 31),
('Academic', 'Section & Room', 'Edit', 'academic.sections.edit', 'Edit Sections & Rooms', 'Academic', 32),
('Academic', 'Section & Room', 'Delete', 'academic.sections.delete', 'Delete Sections & Rooms', 'Academic', 33),

('Academic', 'Timetable', 'View', 'academic.timetable.view', 'View Timetables', 'Academic', 40),
('Academic', 'Timetable', 'Add', 'academic.timetable.add', 'Create Timetables', 'Academic', 41),
('Academic', 'Timetable', 'Edit', 'academic.timetable.edit', 'Edit & Substitute Timetable', 'Academic', 42),
('Academic', 'Timetable', 'Delete', 'academic.timetable.delete', 'Delete Timetables', 'Academic', 43),

('Academic', 'Holiday Management', 'View', 'academic.holidays.view', 'View Academic Holidays', 'Academic', 50),
('Academic', 'Holiday Management', 'Add', 'academic.holidays.add', 'Add Holidays', 'Academic', 51),
('Academic', 'Holiday Management', 'Edit', 'academic.holidays.edit', 'Edit Holidays', 'Academic', 52),
('Academic', 'Holiday Management', 'Delete', 'academic.holidays.delete', 'Delete Holidays', 'Academic', 53),

-- Student
('Student', 'Student Admission', 'View', 'student.admission.view', 'View Admission Pipeline', 'Student', 60),
('Student', 'Student Admission', 'Add', 'student.admission.add', 'Create Admission Application', 'Student', 61),
('Student', 'Student Admission', 'Edit', 'student.admission.edit', 'Edit Admission Records', 'Student', 62),
('Student', 'Student Admission', 'Delete', 'student.admission.delete', 'Cancel Admissions', 'Student', 63),

('Student', 'Student Management', 'View', 'student.records.view', 'View Student Profiles', 'Student', 70),
('Student', 'Student Management', 'Add', 'student.records.add', 'Enroll Students', 'Student', 71),
('Student', 'Student Management', 'Edit', 'student.records.edit', 'Update Student Details', 'Student', 72),
('Student', 'Student Management', 'Delete', 'student.records.delete', 'Archive Students', 'Student', 73),

('Student', 'Section Allocation', 'View', 'student.allocation.view', 'View Section Allocations', 'Student', 80),
('Student', 'Section Allocation', 'Add', 'student.allocation.add', 'Allocate Students to Sections', 'Student', 81),
('Student', 'Section Allocation', 'Edit', 'student.allocation.edit', 'Reallocate Sections', 'Student', 82),
('Student', 'Section Allocation', 'Delete', 'student.allocation.delete', 'Remove Section Allocations', 'Student', 83),

('Student', 'Attendance', 'View', 'student.attendance.view', 'View Student Attendance', 'Student', 90),
('Student', 'Attendance', 'Add', 'student.attendance.add', 'Mark Student Attendance', 'Student', 91),
('Student', 'Attendance', 'Edit', 'student.attendance.edit', 'Modify Attendance Entries', 'Student', 92),
('Student', 'Attendance', 'Delete', 'student.attendance.delete', 'Reset Attendance Records', 'Student', 93),

('Student', 'Promotion', 'View', 'student.promotion.view', 'View Promotion Eligibility', 'Student', 100),
('Student', 'Promotion', 'Add', 'student.promotion.add', 'Execute Batch Promotions', 'Student', 101),
('Student', 'Promotion', 'Edit', 'student.promotion.edit', 'Modify Promotion Status', 'Student', 102),
('Student', 'Promotion', 'Delete', 'student.promotion.delete', 'Revert Promotions', 'Student', 103),

-- Staff
('Staff', 'Staff Management', 'View', 'staff.management.view', 'View Staff Directory', 'Staff', 110),
('Staff', 'Staff Management', 'Add', 'staff.management.add', 'Register New Staff', 'Staff', 111),
('Staff', 'Staff Management', 'Edit', 'staff.management.edit', 'Edit Staff Details', 'Staff', 112),
('Staff', 'Staff Management', 'Delete', 'staff.management.delete', 'Terminate / Deactivate Staff', 'Staff', 113),

('Staff', 'Department & Designation', 'View', 'staff.departments.view', 'View Departments & Designations', 'Staff', 120),
('Staff', 'Department & Designation', 'Add', 'staff.departments.add', 'Add Departments', 'Staff', 121),
('Staff', 'Department & Designation', 'Edit', 'staff.departments.edit', 'Edit Departments', 'Staff', 122),
('Staff', 'Department & Designation', 'Delete', 'staff.departments.delete', 'Delete Departments', 'Staff', 123),

('Staff', 'Staff Attendance', 'View', 'staff.attendance.view', 'View Staff Biometrics & Logs', 'Staff', 130),
('Staff', 'Staff Attendance', 'Add', 'staff.attendance.add', 'Record Staff Attendance', 'Staff', 131),
('Staff', 'Staff Attendance', 'Edit', 'staff.attendance.edit', 'Regularize Staff Attendance', 'Staff', 132),
('Staff', 'Staff Attendance', 'Delete', 'staff.attendance.delete', 'Clear Attendance Logs', 'Staff', 133),

('Staff', 'Staff Leave Management', 'View', 'staff.leaves.view', 'View Leave Applications', 'Staff', 140),
('Staff', 'Staff Leave Management', 'Add', 'staff.leaves.add', 'Apply For Staff Leave', 'Staff', 141),
('Staff', 'Staff Leave Management', 'Edit', 'staff.leaves.edit', 'Approve / Reject Leaves', 'Staff', 142),
('Staff', 'Staff Leave Management', 'Delete', 'staff.leaves.delete', 'Cancel Leave Applications', 'Staff', 143),

-- Examinations
('Examinations', 'Examination', 'View', 'examinations.exams.view', 'View Examinations & Schedules', 'Examinations', 150),
('Examinations', 'Examination', 'Add', 'examinations.exams.add', 'Create Examination', 'Examinations', 151),
('Examinations', 'Examination', 'Edit', 'examinations.exams.edit', 'Edit Examination & Schedules', 'Examinations', 152),
('Examinations', 'Examination', 'Delete', 'examinations.exams.delete', 'Cancel Examinations', 'Examinations', 153),

('Examinations', 'Marks Evaluation', 'View', 'examinations.marks.view', 'View Marks & Evaluations', 'Examinations', 160),
('Examinations', 'Marks Evaluation', 'Add', 'examinations.marks.add', 'Enter Examination Marks', 'Examinations', 161),
('Examinations', 'Marks Evaluation', 'Edit', 'examinations.marks.edit', 'Approve / Update Marks', 'Examinations', 162),
('Examinations', 'Marks Evaluation', 'Delete', 'examinations.marks.delete', 'Clear Marks Entry', 'Examinations', 163),

('Examinations', 'Results', 'View', 'examinations.results.view', 'View Processed & Published Results', 'Examinations', 170),
('Examinations', 'Results', 'Add', 'examinations.results.add', 'Generate Examination Results', 'Examinations', 171),
('Examinations', 'Results', 'Edit', 'examinations.results.edit', 'Publish Results & Section Memos', 'Examinations', 172),
('Examinations', 'Results', 'Delete', 'examinations.results.delete', 'Unpublish / Reset Results', 'Examinations', 173),

-- Finance
('Finance', 'Fee Management', 'View', 'finance.fees.view', 'View Fee Structures & Dues', 'Finance', 180),
('Finance', 'Fee Management', 'Add', 'finance.fees.add', 'Collect Fees & Generate Receipts', 'Finance', 181),
('Finance', 'Fee Management', 'Edit', 'finance.fees.edit', 'Adjust Fee Discounts / Penalties', 'Finance', 182),
('Finance', 'Fee Management', 'Delete', 'finance.fees.delete', 'Cancel Receipts & Void Payments', 'Finance', 183),

('Finance', 'Payroll', 'View', 'finance.payroll.view', 'View Payroll & Payslips', 'Finance', 190),
('Finance', 'Payroll', 'Add', 'finance.payroll.add', 'Process Monthly Payroll', 'Finance', 191),
('Finance', 'Payroll', 'Edit', 'finance.payroll.edit', 'Update Salary Components', 'Finance', 192),
('Finance', 'Payroll', 'Delete', 'finance.payroll.delete', 'Void Payroll Batches', 'Finance', 193),

-- Documents & Reports
('Documents & Reports', 'Certificates', 'View', 'reports.certificates.view', 'View Issued Certificates', 'Documents & Reports', 200),
('Documents & Reports', 'Certificates', 'Add', 'reports.certificates.add', 'Generate & Issue Certificates', 'Documents & Reports', 201),
('Documents & Reports', 'Certificates', 'Edit', 'reports.certificates.edit', 'Re-issue Certificates', 'Documents & Reports', 202),
('Documents & Reports', 'Certificates', 'Delete', 'reports.certificates.delete', 'Revoke Certificates', 'Documents & Reports', 203),

('Documents & Reports', 'Reports & Analytics', 'View', 'reports.analytics.view', 'View Reports & BI Dashboards', 'Documents & Reports', 210),
('Documents & Reports', 'Reports & Analytics', 'Add', 'reports.analytics.add', 'Create Custom Reports', 'Documents & Reports', 211),
('Documents & Reports', 'Reports & Analytics', 'Edit', 'reports.analytics.edit', 'Export Reports to Excel/PDF', 'Documents & Reports', 212),
('Documents & Reports', 'Reports & Analytics', 'Delete', 'reports.analytics.delete', 'Delete Report Templates', 'Documents & Reports', 213),

-- Hostel Management
('Hostel Management', 'Hostel Management', 'View', 'hostel.management.view', 'View Hostel Rooms & Allocations', 'Hostel Management', 220),
('Hostel Management', 'Hostel Management', 'Add', 'hostel.management.add', 'Allocate Beds & Register Students', 'Hostel Management', 221),
('Hostel Management', 'Hostel Management', 'Edit', 'hostel.management.edit', 'Modify Bed Allocations', 'Hostel Management', 222),
('Hostel Management', 'Hostel Management', 'Delete', 'hostel.management.delete', 'Vacate / Deallocate Beds', 'Hostel Management', 223),

-- Operations
('Operations', 'Transport', 'View', 'operations.transport.view', 'View Transport Routes & Buses', 'Operations', 230),
('Operations', 'Transport', 'Add', 'operations.transport.add', 'Assign Students to Routes', 'Operations', 231),
('Operations', 'Transport', 'Edit', 'operations.transport.edit', 'Update Vehicle & Driver Info', 'Operations', 232),
('Operations', 'Transport', 'Delete', 'operations.transport.delete', 'Remove Route Assignments', 'Operations', 233),

('Operations', 'Library', 'View', 'operations.library.view', 'View Books & Circulation', 'Operations', 240),
('Operations', 'Library', 'Add', 'operations.library.add', 'Issue Books & Add Catalog', 'Operations', 241),
('Operations', 'Library', 'Edit', 'operations.library.edit', 'Return Books & Collect Fines', 'Operations', 242),
('Operations', 'Library', 'Delete', 'operations.library.delete', 'Discard Damaged Books', 'Operations', 243),

('Operations', 'Placement', 'View', 'operations.placement.view', 'View Drives & Offers', 'Operations', 250),
('Operations', 'Placement', 'Add', 'operations.placement.add', 'Schedule Placement Drives', 'Operations', 251),
('Operations', 'Placement', 'Edit', 'operations.placement.edit', 'Record Offers & Shortlists', 'Operations', 252),
('Operations', 'Placement', 'Delete', 'operations.placement.delete', 'Cancel Placement Drives', 'Operations', 253),

-- Administration
('Administration', 'Settings', 'View', 'administration.settings.view', 'View College Settings', 'Administration', 260),
('Administration', 'Settings', 'Add', 'administration.settings.add', 'Configure Number Series & Years', 'Administration', 261),
('Administration', 'Settings', 'Edit', 'administration.settings.edit', 'Update Campus Policy Rules', 'Administration', 262),
('Administration', 'Settings', 'Delete', 'administration.settings.delete', 'Reset Settings', 'Administration', 263),

('Administration', 'Roles & Permissions', 'View', 'administration.roles.view', 'View Roles & Access Matrix', 'Administration', 270),
('Administration', 'Roles & Permissions', 'Add', 'administration.roles.add', 'Assign User Roles', 'Administration', 271),
('Administration', 'Roles & Permissions', 'Edit', 'administration.roles.edit', 'Configure Module Permissions', 'Administration', 272),
('Administration', 'Roles & Permissions', 'Delete', 'administration.roles.delete', 'Revoke Roles & Overrides', 'Administration', 273);

-- 7. Seed Default Role Permissions
-- Super Admin (Role 1) & Admin (Role 2) get all permissions
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 1, `PermissionId` FROM `Permissions`;

INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 2, `PermissionId` FROM `Permissions`
WHERE `PermissionCode` NOT IN ('administration.roles.delete');

-- HOD (Role 3): Academic, Attendance, Marks, Results, Staff view/edit
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 3, `PermissionId` FROM `Permissions`
WHERE `Module` IN ('Overview', 'Academic')
   OR `SubModule` IN ('Attendance', 'Staff Attendance', 'Staff Leave Management', 'Marks Evaluation', 'Results', 'Reports & Analytics')
   AND `Action` IN ('View', 'Add', 'Edit');

-- Faculty (Role 4): Attendance, Marks, Timetable, Leave
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 4, `PermissionId` FROM `Permissions`
WHERE (`SubModule` = 'Dashboard' AND `Action` = 'View')
   OR (`SubModule` IN ('Timetable', 'Holiday Management', 'Subject Management') AND `Action` = 'View')
   OR (`SubModule` = 'Attendance' AND `Action` IN ('View', 'Add', 'Edit'))
   OR (`SubModule` = 'Marks Evaluation' AND `Action` IN ('View', 'Add', 'Edit'))
   OR (`SubModule` = 'Staff Leave Management' AND `Action` IN ('View', 'Add'));

-- Bus Driver (Role 12): Transport view & Passenger checklist
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 12, `PermissionId` FROM `Permissions`
WHERE (`SubModule` = 'Dashboard' AND `Action` = 'View')
   OR (`SubModule` = 'Transport' AND `Action` IN ('View', 'Edit'));

-- Accounts (Role 7): Fee Management, Payroll
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 7, `PermissionId` FROM `Permissions`
WHERE (`SubModule` = 'Dashboard' AND `Action` = 'View')
   OR `Module` = 'Finance';

-- Examination Cell (Role 8): Examinations, Marks, Results
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 8, `PermissionId` FROM `Permissions`
WHERE (`SubModule` = 'Dashboard' AND `Action` = 'View')
   OR `Module` = 'Examinations';

-- Hostel Warden (Role 10): Hostel Management
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 10, `PermissionId` FROM `Permissions`
WHERE (`SubModule` = 'Dashboard' AND `Action` = 'View')
   OR `Module` = 'Hostel Management';

-- Library (Role 9): Library
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 9, `PermissionId` FROM `Permissions`
WHERE (`SubModule` = 'Dashboard' AND `Action` = 'View')
   OR `SubModule` = 'Library';

-- Placement Officer (Role 11): Placement
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 11, `PermissionId` FROM `Permissions`
WHERE (`SubModule` = 'Dashboard' AND `Action` = 'View')
   OR `SubModule` = 'Placement';

-- Student (Role 5): Self portal views
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 5, `PermissionId` FROM `Permissions`
WHERE `Action` = 'View'
  AND `SubModule` IN ('Dashboard', 'Timetable', 'Attendance', 'Results', 'Fee Management');

-- Parent (Role 6): Parent portal views
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`)
SELECT 6, `PermissionId` FROM `Permissions`
WHERE `Action` = 'View'
  AND `SubModule` IN ('Dashboard', 'Attendance', 'Results', 'Fee Management');

-- ====================================================================================
-- 8. STORED PROCEDURES
-- ====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetRoleCards`;
DELIMITER //
CREATE PROCEDURE `sp_GetRoleCards`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        r.RoleId,
        r.RoleName,
        COALESCE(r.Description, '') AS Description,
        r.IsSystemRole,
        r.IsActive,
        CASE 
            WHEN r.RoleId = 1 THEN (SELECT COUNT(*) FROM `Users` WHERE RoleId = 1 AND IsActive = 1)
            WHEN r.RoleId = 2 THEN (
                SELECT COUNT(*) FROM `Users` u 
                LEFT JOIN `Staff` st ON st.Id = u.StaffId
                WHERE u.RoleId = 2 AND u.IsActive = 1
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
            )
            WHEN r.RoleId = 3 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                WHERE st.IsDeleted = 0 AND st.StaffType = 'Teaching' 
                  AND (st.Designation LIKE '%HOD%' OR st.Designation LIKE '%Head of Department%')
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
                  AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL)
            )
            WHEN r.RoleId = 4 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                WHERE st.IsDeleted = 0 AND st.StaffType = 'Teaching'
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
                  AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL)
            )
            WHEN r.RoleId = 5 THEN (
                SELECT COUNT(*) FROM `Students` stu 
                WHERE stu.IsActive = 1
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR stu.CampusId = p_CampusId)
                  AND (p_BoardId IS NULL OR p_BoardId = 0 OR stu.BoardId = p_BoardId)
                  AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
            )
            WHEN r.RoleId = 6 THEN (
                SELECT COUNT(*) FROM `Students` stu 
                WHERE stu.IsActive = 1 AND stu.FatherName IS NOT NULL AND stu.FatherName != ''
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR stu.CampusId = p_CampusId)
                  AND (p_BoardId IS NULL OR p_BoardId = 0 OR stu.BoardId = p_BoardId)
                  AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
            )
            WHEN r.RoleId = 7 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
                WHERE st.IsDeleted = 0 AND st.StaffType = 'Non-Teaching'
                  AND (st.Designation LIKE '%Account%' OR d.DepartmentName LIKE '%Account%' OR st.Designation LIKE '%Cashier%' OR st.Designation LIKE '%Finance%')
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
            )
            WHEN r.RoleId = 8 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
                WHERE st.IsDeleted = 0 AND st.StaffType = 'Non-Teaching'
                  AND (st.Designation LIKE '%Exam%' OR d.DepartmentName LIKE '%Exam%' OR st.Designation LIKE '%Controller%')
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
            )
            WHEN r.RoleId = 9 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
                WHERE st.IsDeleted = 0 AND st.StaffType = 'Non-Teaching'
                  AND (st.Designation LIKE '%Librar%' OR d.DepartmentName LIKE '%Library%')
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
            )
            WHEN r.RoleId = 10 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
                WHERE st.IsDeleted = 0 
                  AND (st.Designation LIKE '%Warden%' OR d.DepartmentName LIKE '%Hostel%')
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
            )
            WHEN r.RoleId = 11 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
                WHERE st.IsDeleted = 0 
                  AND (st.Designation LIKE '%Placement%' OR d.DepartmentName LIKE '%Placement%')
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
            )
            WHEN r.RoleId = 12 THEN (
                SELECT COUNT(*) FROM `Staff` st 
                WHERE st.IsDeleted = 0 
                  AND (st.IsDriver = 1 OR st.Designation LIKE '%Driver%')
                  AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
            )
            ELSE (SELECT COUNT(*) FROM `Users` u WHERE u.RoleId = r.RoleId AND u.IsActive = 1)
        END AS UserCount,
        (SELECT COUNT(DISTINCT rp.PermissionId) FROM `RolePermissions` rp WHERE rp.RoleId = r.RoleId) AS PermissionsCount,
        r.CreatedAt,
        r.UpdatedAt
    FROM `Roles` r
    WHERE r.IsActive = 1
    ORDER BY r.RoleId ASC;
END //
DELIMITER ;

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

    -- Returns the permission matrix per sub-module with 4 actions: View, Add, Edit, Delete
    -- If p_UserId is passed, member overrides take precedence over role defaults
    SELECT 
        p.Module,
        p.SubModule,
        p.CategoryLabel,
        MIN(p.DisplayOrder) AS DisplayOrder,
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
    FROM `Permissions` p
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = v_RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = p_UserId
    GROUP BY p.Module, p.SubModule, p.CategoryLabel
    ORDER BY MIN(p.DisplayOrder) ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetUserRoleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_GetUserRoleAssignments`(
    IN p_Search VARCHAR(100),
    IN p_RoleId INT,
    IN p_UserType VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    IF p_PageNumber IS NULL OR p_PageNumber < 1 THEN SET p_PageNumber = 1; END IF;
    IF p_PageSize IS NULL OR p_PageSize < 1 THEN SET p_PageSize = 10; END IF;
    SET v_Offset = (p_PageNumber - 1) * p_PageSize;

    -- Result Set 1: Total Records
    SELECT COUNT(DISTINCT u.UserId) AS TotalCount
    FROM `Users` u
    LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
    LEFT JOIN `Staff` st ON st.Id = u.StaffId
    LEFT JOIN `Students` stu ON stu.StudentId = u.StudentId
    LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
    LEFT JOIN `Designations` des ON des.Id = st.DesignationId
    WHERE (p_RoleId IS NULL OR p_RoleId = 0 OR u.RoleId = p_RoleId)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId OR stu.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR stu.BoardId = p_BoardId OR st.BoardId IS NULL)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
      AND (p_UserType IS NULL OR p_UserType = '' OR p_UserType = 'all' OR 
           CASE 
               WHEN stu.StudentId IS NOT NULL THEN 'Student'
               WHEN st.StaffType = 'Non-Teaching' THEN 'Operational'
               WHEN st.StaffType = 'Teaching' THEN 'Faculty'
               WHEN u.AdminId IS NOT NULL THEN 'Staff'
               ELSE 'Staff'
           END = p_UserType)
      AND (p_Search IS NULL OR p_Search = '' OR 
           u.FullName LIKE CONCAT('%', p_Search, '%') OR
           u.Email LIKE CONCAT('%', p_Search, '%') OR
           COALESCE(st.EmployeeId, stu.AdmissionNo, CONCAT('USR-', LPAD(u.UserId, 3, '0'))) LIKE CONCAT('%', p_Search, '%') OR
           r.RoleName LIKE CONCAT('%', p_Search, '%') OR
           COALESCE(d.DepartmentName, '') LIKE CONCAT('%', p_Search, '%') OR
           COALESCE(st.Designation, des.Name, '') LIKE CONCAT('%', p_Search, '%'));

    -- Result Set 2: Paginated User Assignment Rows
    SELECT 
        u.UserId,
        u.FullName AS Name,
        COALESCE(st.EmployeeId, stu.AdmissionNo, CONCAT('ADM-', LPAD(u.UserId, 3, '0'))) AS UserCode,
        CASE 
            WHEN stu.StudentId IS NOT NULL THEN 'Student'
            WHEN st.StaffType = 'Non-Teaching' THEN 'Operational'
            WHEN st.StaffType = 'Teaching' THEN 'Faculty'
            WHEN u.AdminId IS NOT NULL THEN 'Staff'
            ELSE 'Staff'
        END AS UserType,
        COALESCE(d.DepartmentName, 'Administration') AS Department,
        COALESCE(st.Designation, des.Name, IF(stu.StudentId IS NOT NULL, 'Student', 'Administrator')) AS Designation,
        r.RoleId,
        COALESCE(r.RoleName, 'Unassigned') AS RoleName,
        CASE WHEN u.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
    FROM `Users` u
    LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
    LEFT JOIN `Staff` st ON st.Id = u.StaffId
    LEFT JOIN `Students` stu ON stu.StudentId = u.StudentId
    LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
    LEFT JOIN `Designations` des ON des.Id = st.DesignationId
    WHERE (p_RoleId IS NULL OR p_RoleId = 0 OR u.RoleId = p_RoleId)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId OR stu.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR stu.BoardId = p_BoardId OR st.BoardId IS NULL)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
      AND (p_UserType IS NULL OR p_UserType = '' OR p_UserType = 'all' OR 
           CASE 
               WHEN stu.StudentId IS NOT NULL THEN 'Student'
               WHEN st.StaffType = 'Non-Teaching' THEN 'Operational'
               WHEN st.StaffType = 'Teaching' THEN 'Faculty'
               WHEN u.AdminId IS NOT NULL THEN 'Staff'
               ELSE 'Staff'
           END = p_UserType)
      AND (p_Search IS NULL OR p_Search = '' OR 
           u.FullName LIKE CONCAT('%', p_Search, '%') OR
           u.Email LIKE CONCAT('%', p_Search, '%') OR
           COALESCE(st.EmployeeId, stu.AdmissionNo, CONCAT('USR-', LPAD(u.UserId, 3, '0'))) LIKE CONCAT('%', p_Search, '%') OR
           r.RoleName LIKE CONCAT('%', p_Search, '%') OR
           COALESCE(d.DepartmentName, '') LIKE CONCAT('%', p_Search, '%') OR
           COALESCE(st.Designation, des.Name, '') LIKE CONCAT('%', p_Search, '%'))
    ORDER BY u.UserId ASC
    LIMIT p_PageSize OFFSET v_Offset;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetUserRoleDetails`;
DELIMITER //
CREATE PROCEDURE `sp_GetUserRoleDetails`(
    IN p_UserId INT
)
BEGIN
    -- Result Set 1: User Profile & Role Info
    SELECT 
        u.UserId,
        u.FullName,
        COALESCE(st.EmployeeId, CONCAT('ADM-', LPAD(u.UserId, 3, '0'))) AS UserCode,
        CASE 
            WHEN st.StaffType = 'Non-Teaching' THEN 'Operational'
            WHEN st.Id IS NOT NULL THEN 'Faculty'
            WHEN u.AdminId IS NOT NULL THEN 'Staff'
            ELSE 'Staff'
        END AS UserType,
        COALESCE(d.DepartmentName, 'Administration') AS Department,
        COALESCE(st.Designation, des.Name, 'Administrator') AS Designation,
        CASE WHEN u.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        r.RoleId,
        COALESCE(r.RoleName, 'Unassigned') AS RoleName,
        CASE WHEN r.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS RoleStatus
    FROM `Users` u
    LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
    LEFT JOIN `Staff` st ON st.Id = u.StaffId
    LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
    LEFT JOIN `Designations` des ON des.Id = st.DesignationId
    WHERE u.UserId = p_UserId;

    -- Result Set 2: Permission Matrix with Enabled/Disabled pill status
    SELECT 
        p.Module,
        p.SubModule,
        p.CategoryLabel,
        MIN(p.DisplayOrder) AS DisplayOrder,
        MAX(CASE WHEN p.Action = 'View' THEN 
            CASE 
                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS ViewEnabled,
        MAX(CASE WHEN p.Action = 'Add' THEN 
            CASE 
                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS AddEnabled,
        MAX(CASE WHEN p.Action = 'Edit' THEN 
            CASE 
                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS EditEnabled,
        MAX(CASE WHEN p.Action = 'Delete' THEN 
            CASE 
                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS DeleteEnabled,
        MAX(CASE WHEN up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
    FROM `Permissions` p
    INNER JOIN `Users` u ON u.UserId = p_UserId
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = p_UserId
    GROUP BY p.Module, p.SubModule, p.CategoryLabel
    ORDER BY MIN(p.DisplayOrder) ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateRolePermissions`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateRolePermissions`(
    IN p_RoleId INT,
    IN p_PermissionsJson JSON
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF NOT EXISTS (SELECT 1 FROM `Roles` WHERE `RoleId` = p_RoleId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role was not found.';
    END IF;

    START TRANSACTION;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;
    CREATE TEMPORARY TABLE tmp_module_updates (
        SubModule VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );

    INSERT INTO tmp_module_updates (SubModule, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        jt.SubModule,
        IF(jt.CanView = 1, 1, 0),
        IF(jt.CanAdd = 1, 1, 0),
        IF(jt.CanEdit = 1, 1, 0),
        IF(jt.CanDelete = 1, 1, 0)
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

    -- Delete existing RolePermissions for the updated submodules
    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE rp.RoleId = p_RoleId;

    -- Insert enabled permissions for View, Add, Edit, Delete
    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE (p.Action = 'View' AND t.CanView = 1)
       OR (p.Action = 'Add' AND t.CanAdd = 1)
       OR (p.Action = 'Edit' AND t.CanEdit = 1)
       OR (p.Action = 'Delete' AND t.CanDelete = 1);

    -- Update Role timestamp
    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;

    COMMIT;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetRoleMembers`;
DELIMITER //
CREATE PROCEDURE `sp_GetRoleMembers`(
    IN p_RoleId INT,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    -- 1. Auto-create user records for any staff matching this role who do not yet have a record in Users
    IF p_RoleId IN (3, 4, 7, 8, 9, 10, 11, 12) THEN
        INSERT INTO `Users` (`FullName`, `Email`, `PasswordHash`, `PhoneNumber`, `RoleId`, `StaffId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
        SELECT 
            TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))),
            CASE 
                WHEN st.Email IS NOT NULL AND st.Email != '' AND NOT EXISTS (SELECT 1 FROM `Users` u2 WHERE u2.Email = st.Email) THEN st.Email
                ELSE CONCAT('staff_', st.Id, '@cms.local')
            END AS Email,
            '',
            COALESCE(st.Mobile, ''),
            p_RoleId,
            st.Id,
            1,
            UTC_TIMESTAMP(),
            UTC_TIMESTAMP()
        FROM `Staff` st
        LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
        WHERE st.IsDeleted = 0
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL)
          AND (
              (p_RoleId = 4 AND st.StaffType = 'Teaching') OR
              (p_RoleId = 3 AND st.StaffType = 'Teaching' AND (st.Designation LIKE '%HOD%' OR st.Designation LIKE '%Head of Department%')) OR
              (p_RoleId = 12 AND (st.IsDriver = 1 OR st.Designation LIKE '%Driver%')) OR
              (p_RoleId = 10 AND (st.Designation LIKE '%Warden%' OR d.DepartmentName LIKE '%Hostel%')) OR
              (p_RoleId = 9 AND (st.Designation LIKE '%Librar%' OR d.DepartmentName LIKE '%Library%')) OR
              (p_RoleId = 8 AND (st.Designation LIKE '%Exam%' OR d.DepartmentName LIKE '%Exam%' OR st.Designation LIKE '%Controller%')) OR
              (p_RoleId = 7 AND (st.Designation LIKE '%Account%' OR d.DepartmentName LIKE '%Account%' OR st.Designation LIKE '%Cashier%' OR st.Designation LIKE '%Finance%')) OR
              (p_RoleId = 11 AND (st.Designation LIKE '%Placement%' OR d.DepartmentName LIKE '%Placement%'))
          )
          AND NOT EXISTS (SELECT 1 FROM `Users` WHERE `StaffId` = st.Id)
        ON DUPLICATE KEY UPDATE `UpdatedAt` = UTC_TIMESTAMP();
    END IF;

    -- 2. Auto-create user records for students matching Role 5
    IF p_RoleId = 5 THEN
        INSERT INTO `Users` (`FullName`, `Email`, `PasswordHash`, `PhoneNumber`, `RoleId`, `StudentId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
        SELECT 
            TRIM(stu.StudentName),
            CASE 
                WHEN stu.Email IS NOT NULL AND stu.Email != '' AND NOT EXISTS (SELECT 1 FROM `Users` u2 WHERE u2.Email = stu.Email) THEN stu.Email
                ELSE CONCAT('student_', stu.StudentId, '@cms.local')
            END AS Email,
            '',
            COALESCE(stu.MobileNumber, ''),
            5,
            stu.StudentId,
            1,
            UTC_TIMESTAMP(),
            UTC_TIMESTAMP()
        FROM `Students` stu
        WHERE stu.IsActive = 1
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR stu.CampusId = p_CampusId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR stu.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
          AND NOT EXISTS (SELECT 1 FROM `Users` WHERE `StudentId` = stu.StudentId)
        ON DUPLICATE KEY UPDATE `UpdatedAt` = UTC_TIMESTAMP();
    END IF;

    -- 3. Return members for the role
    IF p_RoleId = 5 THEN
        -- Student Role
        SELECT 
            u.UserId,
            stu.StudentName AS Name,
            COALESCE(stu.AdmissionNo, CONCAT('STU-', LPAD(stu.StudentId, 4, '0'))) AS UserCode,
            'Student' AS UserType,
            COALESCE(g.GroupName, 'General') AS Department,
            'Student' AS Designation,
            5 AS RoleId,
            'Student' AS RoleName,
            CASE WHEN stu.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
            (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
        FROM `Students` stu
        INNER JOIN `Users` u ON u.StudentId = stu.StudentId
        LEFT JOIN `Groups` g ON g.GroupId = stu.GroupId
        WHERE stu.IsActive = 1
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR stu.CampusId = p_CampusId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR stu.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
        ORDER BY stu.StudentName ASC;

    ELSEIF p_RoleId IN (3, 4, 7, 8, 9, 10, 11, 12) THEN
        -- Staff-based roles
        SELECT 
            u.UserId,
            TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS Name,
            COALESCE(st.EmployeeId, CONCAT('EMP-', LPAD(st.Id, 4, '0'))) AS UserCode,
            CASE 
                WHEN st.StaffType = 'Teaching' THEN 'Faculty'
                WHEN st.StaffType = 'Non-Teaching' THEN 'Operational'
                ELSE 'Staff'
            END AS UserType,
            COALESCE(d.DepartmentName, 'Academic') AS Department,
            COALESCE(st.Designation, des.Name, 'Staff') AS Designation,
            p_RoleId AS RoleId,
            (SELECT RoleName FROM `Roles` WHERE RoleId = p_RoleId) AS RoleName,
            CASE WHEN st.Status = 'Active' AND st.IsDeleted = 0 THEN 'Active' ELSE 'Inactive' END AS Status,
            (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
        FROM `Staff` st
        INNER JOIN `Users` u ON u.StaffId = st.Id
        LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
        LEFT JOIN `Designations` des ON des.Id = st.DesignationId
        WHERE st.IsDeleted = 0
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR st.BoardId = p_BoardId OR st.BoardId IS NULL)
          AND (
              (p_RoleId = 4 AND st.StaffType = 'Teaching') OR
              (p_RoleId = 3 AND st.StaffType = 'Teaching' AND (st.Designation LIKE '%HOD%' OR st.Designation LIKE '%Head of Department%')) OR
              (p_RoleId = 12 AND (st.IsDriver = 1 OR st.Designation LIKE '%Driver%')) OR
              (p_RoleId = 10 AND (st.Designation LIKE '%Warden%' OR d.DepartmentName LIKE '%Hostel%')) OR
              (p_RoleId = 9 AND (st.Designation LIKE '%Librar%' OR d.DepartmentName LIKE '%Library%')) OR
              (p_RoleId = 8 AND (st.Designation LIKE '%Exam%' OR d.DepartmentName LIKE '%Exam%' OR st.Designation LIKE '%Controller%')) OR
              (p_RoleId = 7 AND (st.Designation LIKE '%Account%' OR d.DepartmentName LIKE '%Account%' OR st.Designation LIKE '%Cashier%' OR st.Designation LIKE '%Finance%')) OR
              (p_RoleId = 11 AND (st.Designation LIKE '%Placement%' OR d.DepartmentName LIKE '%Placement%'))
          )
        ORDER BY st.FirstName ASC, st.LastName ASC;

    ELSE
        -- Generic user-role lookup (Super Admin, Admin, Parent, or explicitly assigned users)
        SELECT 
            u.UserId,
            u.FullName AS Name,
            COALESCE(st.EmployeeId, CONCAT('ADM-', LPAD(u.UserId, 3, '0'))) AS UserCode,
            CASE 
                WHEN st.StaffType = 'Non-Teaching' THEN 'Operational'
                WHEN st.StaffType = 'Teaching' THEN 'Faculty'
                WHEN u.AdminId IS NOT NULL THEN 'Staff'
                ELSE 'Staff'
            END AS UserType,
            COALESCE(d.DepartmentName, 'Administration') AS Department,
            COALESCE(st.Designation, des.Name, 'Administrator') AS Designation,
            r.RoleId,
            COALESCE(r.RoleName, 'Unassigned') AS RoleName,
            CASE WHEN u.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
            (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
        FROM `Users` u
        LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
        LEFT JOIN `Staff` st ON st.Id = u.StaffId
        LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
        LEFT JOIN `Designations` des ON des.Id = st.DesignationId
        WHERE u.RoleId = p_RoleId AND u.IsActive = 1
        ORDER BY u.FullName ASC;
    END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_AssignUserRole`;
DELIMITER //
CREATE PROCEDURE `sp_AssignUserRole`(
    IN p_UserId INT,
    IN p_RoleId INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM `Users` WHERE `UserId` = p_UserId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User was not found.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM `Roles` WHERE `RoleId` = p_RoleId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Role was not found.';
    END IF;

    UPDATE `Users` 
    SET `RoleId` = p_RoleId, `UpdatedAt` = UTC_TIMESTAMP() 
    WHERE `UserId` = p_UserId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_RemoveUserRole`;
DELIMITER //
CREATE PROCEDURE `sp_RemoveUserRole`(
    IN p_UserId INT
)
BEGIN
    DECLARE v_DefaultRoleId INT DEFAULT 0;

    SELECT COALESCE(
        (SELECT `RoleId` FROM `Roles` WHERE `RoleName` = 'Unassigned' LIMIT 1),
        (SELECT MIN(`RoleId`) FROM `Roles` WHERE `RoleName` = 'Student' LIMIT 1),
        0
    ) INTO v_DefaultRoleId;

    UPDATE `Users` 
    SET `RoleId` = v_DefaultRoleId, `UpdatedAt` = UTC_TIMESTAMP() 
    WHERE `UserId` = p_UserId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_SaveUserPermissionOverrides`;
DELIMITER //
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
        SubModule VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );

    INSERT INTO tmp_user_overrides (SubModule, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        jt.SubModule,
        IF(jt.CanView = 1, 1, 0),
        IF(jt.CanAdd = 1, 1, 0),
        IF(jt.CanEdit = 1, 1, 0),
        IF(jt.CanDelete = 1, 1, 0)
    FROM JSON_TABLE(
        p_OverridesJson,
        '$[*]' COLUMNS(
            SubModule VARCHAR(100) PATH '$.SubModule',
            CanView INT PATH '$.CanView',
            CanAdd INT PATH '$.CanAdd',
            CanEdit INT PATH '$.CanEdit',
            CanDelete INT PATH '$.CanDelete'
        )
    ) jt;

    -- Upsert View
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanView, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE p.Action = 'View'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Add
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanAdd, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE p.Action = 'Add'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Edit
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanEdit, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE p.Action = 'Edit'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    -- Upsert Delete
    INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
    SELECT p_UserId, p.PermissionId, t.CanDelete, UTC_TIMESTAMP(), p_AdminUserId, COALESCE(p_Notes, 'Manual override')
    FROM `Permissions` p
    INNER JOIN tmp_user_overrides t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE p.Action = 'Delete'
    ON DUPLICATE KEY UPDATE 
        `IsGranted` = VALUES(`IsGranted`), 
        `AssignedAt` = UTC_TIMESTAMP(),
        `AssignedByUserId` = VALUES(`AssignedByUserId`),
        `Notes` = VALUES(`Notes`);

    DROP TEMPORARY TABLE IF EXISTS tmp_user_overrides;

    COMMIT;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_ResetUserPermissionOverrides`;
DELIMITER //
CREATE PROCEDURE `sp_ResetUserPermissionOverrides`(
    IN p_UserId INT
)
BEGIN
    DELETE FROM `UserPermissions` WHERE `UserId` = p_UserId;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckUserPermission`;
DELIMITER //
CREATE PROCEDURE `sp_CheckUserPermission`(
    IN p_UserId INT,
    IN p_PermissionCode VARCHAR(100)
)
BEGIN
    SELECT 
        CASE 
            WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
            WHEN rp.PermissionId IS NOT NULL THEN 1
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
