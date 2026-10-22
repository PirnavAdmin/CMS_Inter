-- ====================================================================================
-- 04_Fix_Role_Counts_Members_And_Permissions.sql
-- Fix Role Card Counts, Role Members Fetching, and Seed Default Permissions
-- ====================================================================================

-- 1. Harmonized sp_GetRoleCards
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
        (
            SELECT COUNT(DISTINCT u.UserId) 
            FROM `Users` u 
            LEFT JOIN `Staff` st ON st.Id = u.StaffId
            LEFT JOIN `Students` stu ON stu.StudentId = u.StudentId
            WHERE u.RoleId = r.RoleId 
              AND u.IsActive = 1
              AND (st.Id IS NULL OR st.IsDeleted = 0)
              AND (stu.StudentId IS NULL OR stu.IsActive = 1)
              AND (
                  p_CampusId IS NULL OR p_CampusId = 0 
                  OR st.CampusId = p_CampusId 
                  OR stu.CampusId = p_CampusId 
                  OR st.CampusId IS NULL
                  OR (st.Id IS NULL AND stu.StudentId IS NULL)
              )
              AND (
                  p_BoardId IS NULL OR p_BoardId = 0 
                  OR (st.Id IS NOT NULL AND st.StaffType = 'Non-Teaching')
                  OR st.BoardId = p_BoardId 
                  OR stu.BoardId = p_BoardId 
                  OR st.BoardId IS NULL
                  OR (st.Id IS NULL AND stu.StudentId IS NULL)
              )
              AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.StudentId IS NULL OR stu.AcademicYearId = p_AcademicYearId)
        ) AS UserCount,
        (SELECT COUNT(DISTINCT rp.PermissionId) FROM `RolePermissions` rp WHERE rp.RoleId = r.RoleId) AS PermissionsCount,
        r.CreatedAt,
        r.UpdatedAt
    FROM `Roles` r
    WHERE r.IsActive = 1
    ORDER BY r.RoleId ASC;
END //
DELIMITER ;

-- 2. Harmonized sp_GetRoleMembers (Clean Read-Only, No Side-Effects, Unified Filtering)
DROP PROCEDURE IF EXISTS `sp_GetRoleMembers`;
DELIMITER //
CREATE PROCEDURE `sp_GetRoleMembers`(
    IN p_RoleId INT,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    IF p_RoleId = 5 THEN
        -- Student Role
        SELECT 
            u.UserId,
            stu.StudentName AS FullName,
            stu.StudentName AS Name,
            COALESCE(stu.AdmissionNo, CONCAT('STU-', LPAD(stu.StudentId, 4, '0'))) AS UserCode,
            'Student' AS UserType,
            COALESCE(g.GroupName, 'General') AS Department,
            'Student' AS Designation,
            5 AS RoleId,
            'Student' AS RoleName,
            CASE WHEN u.IsActive = 1 AND stu.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
            (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
        FROM `Users` u
        INNER JOIN `Students` stu ON stu.StudentId = u.StudentId
        LEFT JOIN `Groups` g ON g.GroupId = stu.GroupId
        WHERE u.RoleId = 5
          AND u.IsActive = 1
          AND stu.IsActive = 1
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR stu.CampusId = p_CampusId)
          AND (p_BoardId IS NULL OR p_BoardId = 0 OR stu.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.AcademicYearId = p_AcademicYearId)
        ORDER BY stu.StudentName ASC;

    ELSEIF p_RoleId IN (3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16) THEN
        -- Staff-based roles
        SELECT 
            u.UserId,
            u.FullName,
            u.FullName AS Name,
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
            CASE WHEN u.IsActive = 1 AND (st.Id IS NULL OR st.IsDeleted = 0) THEN 'Active' ELSE 'Inactive' END AS Status,
            (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
        FROM `Users` u
        LEFT JOIN `Staff` st ON st.Id = u.StaffId
        LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
        LEFT JOIN `Designations` des ON des.Id = st.DesignationId
        WHERE u.RoleId = p_RoleId
          AND u.IsActive = 1
          AND (st.Id IS NULL OR st.IsDeleted = 0)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId OR st.CampusId IS NULL)
          AND (
              p_BoardId IS NULL OR p_BoardId = 0 
              OR (st.Id IS NOT NULL AND st.StaffType = 'Non-Teaching')
              OR st.BoardId = p_BoardId 
              OR st.BoardId IS NULL
          )
        ORDER BY u.FullName ASC;

    ELSE
        -- Generic / Custom / Admin / Parent / Unassigned roles
        SELECT 
            u.UserId,
            u.FullName,
            u.FullName AS Name,
            COALESCE(st.EmployeeId, stu.AdmissionNo, CONCAT('USR-', LPAD(u.UserId, 4, '0'))) AS UserCode,
            CASE 
                WHEN stu.StudentId IS NOT NULL THEN 'Student'
                WHEN st.StaffType = 'Non-Teaching' THEN 'Operational'
                WHEN st.StaffType = 'Teaching' THEN 'Faculty'
                ELSE 'Staff'
            END AS UserType,
            COALESCE(d.DepartmentName, g.GroupName, 'General') AS Department,
            COALESCE(st.Designation, des.Name, IF(stu.StudentId IS NOT NULL, 'Student', r.RoleName)) AS Designation,
            p_RoleId AS RoleId,
            COALESCE(r.RoleName, 'Unassigned') AS RoleName,
            CASE WHEN u.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
            (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
        FROM `Users` u
        LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
        LEFT JOIN `Staff` st ON st.Id = u.StaffId
        LEFT JOIN `Students` stu ON stu.StudentId = u.StudentId
        LEFT JOIN `Departments` d ON d.DepartmentId = st.DepartmentId
        LEFT JOIN `Designations` des ON des.Id = st.DesignationId
        LEFT JOIN `Groups` g ON g.GroupId = stu.GroupId
        WHERE u.RoleId = p_RoleId
          AND u.IsActive = 1
          AND (st.Id IS NULL OR st.IsDeleted = 0)
          AND (stu.StudentId IS NULL OR stu.IsActive = 1)
          AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId OR stu.CampusId = p_CampusId OR st.CampusId IS NULL OR (st.CampusId IS NULL AND stu.CampusId IS NULL))
          AND (
              p_BoardId IS NULL OR p_BoardId = 0 
              OR (st.Id IS NOT NULL AND st.StaffType = 'Non-Teaching')
              OR st.BoardId = p_BoardId 
              OR stu.BoardId = p_BoardId 
              OR st.BoardId IS NULL
              OR (st.BoardId IS NULL AND stu.BoardId IS NULL)
          )
          AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR stu.StudentId IS NULL OR stu.AcademicYearId = p_AcademicYearId)
        ORDER BY u.FullName ASC;
    END IF;
END //
DELIMITER ;

-- 3. Seed Default Permissions for Faculty (RoleId = 4)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 4, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE (
    -- Attendance (View, Add, Edit)
    (`SubModule` IN ('Attendance', 'Student Attendance') AND `Action` IN ('View', 'Add', 'Edit'))
    -- Staff Leave Management (View, Add)
    OR (`SubModule` = 'Staff Leave Management' AND `Action` IN ('View', 'Add') AND `ScreenCode` != 'leave-approvals')
    -- Examination & Marks (View, Add, Edit)
    OR (`SubModule` IN ('Examination', 'Marks Evaluation') AND `Action` IN ('View', 'Add', 'Edit'))
    -- Read-only academic catalogs
    OR (`SubModule` IN ('Timetable', 'Subject Management', 'Holiday Management', 'Group Management', 'Section & Room', 'Dashboard') AND `Action` = 'View')
);

-- 4. Seed Default Permissions for Accountant (RoleId = 7)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 7, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE (
    `SubModule` IN ('Fee Management', 'Payroll', 'Reimbursement', 'Staff Reimbursements', 'Reports & Analytics', 'Dashboard')
    OR (`SubModule` = 'Staff Leave Management' AND `Action` = 'View')
);

-- 5. Seed Default Permissions for Examination Cell (RoleId = 8)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 8, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE (
    `SubModule` IN ('Examination', 'Marks Evaluation', 'Results', 'Certificates', 'Reports & Analytics', 'Dashboard')
);

-- 6. Seed Default Permissions for Library / Librarian (RoleId = 9)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 9, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE `SubModule` LIKE '%Librar%'
   OR (`SubModule` = 'Dashboard' AND `Action` = 'View');

-- 7. Seed Default Permissions for Hostel Warden (RoleId = 10)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 10, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE `SubModule` IN ('Hostel Management', 'Dashboard');

-- 8. Seed Default Permissions for Placement Officer (RoleId = 11)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 11, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE `SubModule` LIKE '%Placement%'
   OR (`SubModule` = 'Dashboard' AND `Action` = 'View');

-- 9. Seed Default Permissions for Bus Driver (RoleId = 12)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 12, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE `SubModule` IN ('Transport', 'Dashboard');

-- 10. Seed Default Permissions for Inventory Manager (RoleId = 16)
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 16, `PermissionId`, UTC_TIMESTAMP()
FROM `Permissions`
WHERE `SubModule` LIKE '%Inventory%'
   OR (`SubModule` = 'Dashboard' AND `Action` = 'View');
