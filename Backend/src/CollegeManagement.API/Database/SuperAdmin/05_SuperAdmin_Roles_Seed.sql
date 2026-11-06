-- =============================================================================
-- SCRIPT 05: 05_SuperAdmin_Roles_Seed.sql
-- PURPOSE: Idempotent RoleCode & Scope Seeding
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- CRITICAL REQUIREMENT: PRESERVE RoleName = 'Admin' for RoleId 2 for C# Controller Compatibility!
-- =============================================================================

USE `CollegeManagement`;

START TRANSACTION;

-- Upsert Canonical Platform & College Roles with RoleCode and Scope
-- INVARIANT: RoleName for RoleId 2 MUST remain 'Admin' so existing [Authorize(Roles = "Admin")] controllers continue working!
INSERT INTO `Roles` (`RoleId`, `RoleCode`, `RoleName`, `Description`, `StaffType`, `Scope`, `IsSystemRole`, `IsActive`)
VALUES 
(1, 'SUPER_ADMIN', 'Super Admin', 'Platform Owner with Global Administrative Rights', 'Both', 'PLATFORM', 1, 1),
(2, 'COLLEGE_ADMIN', 'Admin', 'Campus administrative control over academics, staff, students, and fees', 'Both', 'COLLEGE', 1, 1),
(3, 'HOD', 'HOD', 'Department timetable substitutions, subject allocations, and faculty approvals', 'Teaching', 'COLLEGE', 0, 1),
(4, 'FACULTY', 'Faculty', 'Daily student attendance, marks entry, syllabus, and personal leave', 'Teaching', 'COLLEGE', 1, 1),
(5, 'STUDENT', 'Student', 'Self-service attendance, timetable, results, fee receipts, and hall tickets', 'Both', 'COLLEGE', 1, 1),
(6, 'PARENT', 'Parent', 'Student academic progress, attendance, and fee notices', 'Both', 'COLLEGE', 0, 1),
(7, 'ACCOUNTS', 'Accounts', 'Fee structures, fee collection receipts, payroll, and salary processing', 'Non-Teaching', 'COLLEGE', 0, 1),
(8, 'EXAM_CELL', 'Examination Cell', 'Exam timetables, hall ticket generation, marks processing, and results', 'Both', 'COLLEGE', 0, 1),
(9, 'LIBRARIAN', 'Library / Librarian', 'Book cataloging, issue/return transactions, and student library cards', 'Non-Teaching', 'COLLEGE', 0, 1),
(10, 'HOSTEL_WARDEN', 'Hostel Warden', 'Block & room management, student bed allocations, and hostel attendance', 'Non-Teaching', 'COLLEGE', 0, 1),
(11, 'PLACEMENT_OFFICER', 'Placement Officer', 'Recruiter management, campus drive scheduling, and student placement eligibility', 'Non-Teaching', 'COLLEGE', 0, 1),
(12, 'BUS_DRIVER', 'Bus Driver', 'Assigned bus route view, student passenger checklist, and boarding attendance', 'Non-Teaching', 'COLLEGE', 0, 1)
ON DUPLICATE KEY UPDATE 
    `RoleCode` = VALUES(`RoleCode`),
    `Scope` = VALUES(`Scope`),
    `IsSystemRole` = VALUES(`IsSystemRole`),
    `IsActive` = VALUES(`IsActive`);

-- Verify canonical platform role invariant
UPDATE `Roles` SET `Scope` = 'PLATFORM' WHERE `RoleCode` = 'SUPER_ADMIN';
UPDATE `Roles` SET `Scope` = 'COLLEGE' WHERE `RoleCode` != 'SUPER_ADMIN';

COMMIT;

SELECT 'ROLES_SEED_COMPLETED_SUCCESSFULLY' AS Status, NOW() AS CompletedAt;
