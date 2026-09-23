-- =============================================================================
-- 15_MasterData_Staff_Timing_Transport_StoredProcedures.sql
-- COMPLETE STORED PROCEDURES SCRIPT FOR MASTER DATA, HR/STAFF, TIMING,
-- TRANSPORT RESIDUALS, TIMETABLES & ACADEMIC YEAR CASCADE
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- =============================================================================
-- SECTION 1: STAFF SUBJECT ALLOCATION STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationById;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectAllocationById(
    IN p_Id INT
)
BEGIN
    SELECT 
        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
        s.Id AS StaffRecordId, s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Email, s.Mobile, s.Designation, s.StaffType,
        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(al.LevelName, '') AS AcademicLevel
    FROM StaffSubjectAllocations a
    INNER JOIN Staff s ON s.Id = a.StaffId
    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE a.Id = p_Id
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationsByStaffId;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectAllocationsByStaffId(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
        s.Id AS StaffRecordId, s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Email, s.Mobile, s.Designation, s.StaffType,
        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(al.LevelName, '') AS AcademicLevel
    FROM StaffSubjectAllocations a
    INNER JOIN Staff s ON s.Id = a.StaffId
    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE a.StaffId = p_StaffId
    ORDER BY a.Id DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationsBySubjectId;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectAllocationsBySubjectId(
    IN p_SubjectId INT
)
BEGIN
    SELECT 
        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
        s.Id AS StaffRecordId, s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Email, s.Mobile, s.Designation, s.StaffType,
        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(al.LevelName, '') AS AcademicLevel
    FROM StaffSubjectAllocations a
    INNER JOIN Staff s ON s.Id = a.StaffId
    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE a.SubjectId = p_SubjectId
    ORDER BY a.Id DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckDuplicateStaffSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_CheckDuplicateStaffSubjectAllocation(
    IN p_StaffId INT,
    IN p_SubjectId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM StaffSubjectAllocations 
    WHERE StaffId = p_StaffId 
      AND SubjectId = p_SubjectId 
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_ResolveSubjectId;
DELIMITER //
CREATE PROCEDURE sp_ResolveSubjectId(
    IN p_SubjectName VARCHAR(150),
    IN p_Board VARCHAR(100),
    IN p_Group VARCHAR(100),
    IN p_AcademicLevel VARCHAR(100)
)
BEGIN
    SELECT sub.SubjectId
    FROM Subjects sub
    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE (
        LOWER(TRIM(sub.SubjectName)) = LOWER(TRIM(p_SubjectName))
        OR LOWER(TRIM(sub.SubjectCode)) = LOWER(TRIM(p_SubjectName))
    )
    AND (p_Board IS NULL OR TRIM(p_Board) = '' OR LOWER(TRIM(b.BoardName)) = LOWER(TRIM(p_Board)))
    AND (p_Group IS NULL OR TRIM(p_Group) = '' OR LOWER(TRIM(g.GroupName)) = LOWER(TRIM(p_Group)))
    AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' OR LOWER(TRIM(al.LevelName)) = LOWER(TRIM(p_AcademicLevel)))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetSubjectById;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectById(
    IN p_SubjectId INT
)
BEGIN
    SELECT 
        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType,
        sub.BoardId, sub.GroupId, sub.AcademicLevelId, sub.TotalMarks, sub.PassingMarks, sub.IsActive,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(al.LevelName, '') AS AcademicLevel
    FROM Subjects sub
    LEFT JOIN Boards b ON b.BoardId = sub.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = sub.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = sub.AcademicLevelId
    WHERE sub.SubjectId = p_SubjectId
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateStaffSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_CreateStaffSubjectAllocation(
    IN p_StaffId INT,
    IN p_SubjectId INT
)
BEGIN
    INSERT INTO StaffSubjectAllocations (StaffId, SubjectId, CreatedAt)
    VALUES (p_StaffId, p_SubjectId, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateStaffSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_UpdateStaffSubjectAllocation(
    IN p_Id INT,
    IN p_SubjectId INT
)
BEGIN
    UPDATE StaffSubjectAllocations
    SET SubjectId = p_SubjectId,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteStaffSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_DeleteStaffSubjectAllocation(
    IN p_Id INT
)
BEGIN
    DELETE FROM StaffSubjectAllocations WHERE Id = p_Id;
    SELECT ROW_COUNT();
END //
DELIMITER ;

-- =============================================================================
-- SECTION 2: DEPARTMENT STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_GetDepartments;
DELIMITER //
CREATE PROCEDURE sp_GetDepartments(
    IN p_StaffType VARCHAR(50),
    IN p_IncludeInactive TINYINT(1)
)
BEGIN
    SELECT 
        d.DepartmentId,
        d.DepartmentName,
        d.DepartmentCode,
        COALESCE(d.StaffType, 'Both') AS StaffType,
        d.Description,
        d.IsActive,
        d.CreatedAt,
        d.UpdatedAt,
        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
    FROM `Departments` d
    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
    WHERE (p_IncludeInactive = 1 OR d.IsActive = 1)
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
          )
          OR LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', ''))
      )
    GROUP BY 
        d.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        d.StaffType, 
        d.Description, 
        d.IsActive, 
        d.CreatedAt, 
        d.UpdatedAt
    ORDER BY d.DepartmentName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDepartmentById;
DELIMITER //
CREATE PROCEDURE sp_GetDepartmentById(
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        d.DepartmentId,
        d.DepartmentName,
        d.DepartmentCode,
        COALESCE(d.StaffType, 'Both') AS StaffType,
        d.Description,
        d.IsActive,
        d.CreatedAt,
        d.UpdatedAt,
        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
    FROM `Departments` d
    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
    WHERE d.DepartmentId = p_DepartmentId
    GROUP BY 
        d.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        d.StaffType, 
        d.Description, 
        d.IsActive, 
        d.CreatedAt, 
        d.UpdatedAt
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateDepartment;
DELIMITER //
CREATE PROCEDURE sp_CreateDepartment(
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Departments` 
        (`DepartmentName`, `DepartmentCode`, `StaffType`, `Description`, `IsActive`, `CreatedAt`)
    VALUES 
        (TRIM(p_DepartmentName), TRIM(p_DepartmentCode), COALESCE(p_StaffType, 'Both'), p_Description, p_IsActive, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateDepartment;
DELIMITER //
CREATE PROCEDURE sp_UpdateDepartment(
    IN p_DepartmentId INT,
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Departments`
    SET `DepartmentName` = TRIM(p_DepartmentName),
        `DepartmentCode` = TRIM(p_DepartmentCode),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `Description` = p_Description,
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `DepartmentId` = p_DepartmentId;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteDepartment;
DELIMITER //
CREATE PROCEDURE sp_DeleteDepartment(
    IN p_DepartmentId INT
)
BEGIN
    DELETE FROM `Departments` WHERE `DepartmentId` = p_DepartmentId;
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDepartmentSummary;
DELIMITER //
CREATE PROCEDURE sp_GetDepartmentSummary()
BEGIN
    SELECT 
        COUNT(*) AS TotalDepartments,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
        (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1) AS TotalDesignations,
        (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL)) AS TotalStaff
    FROM `Departments`;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDepartmentDependencies;
DELIMITER //
CREATE PROCEDURE sp_GetDepartmentDependencies(
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM `Designations` WHERE DepartmentId = p_DepartmentId AND IsActive = 1) AS DesignationCount,
        (SELECT COUNT(*) FROM `Staff` WHERE DepartmentId = p_DepartmentId AND IsDeleted = 0) AS StaffCount;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_ValidateDepartmentCode;
DELIMITER //
CREATE PROCEDURE sp_ValidateDepartmentCode(
    IN p_Code VARCHAR(50),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentCode) = UPPER(TRIM(p_Code)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_ValidateDepartmentName;
DELIMITER //
CREATE PROCEDURE sp_ValidateDepartmentName(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentName) = UPPER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId);
END //
DELIMITER ;

-- =============================================================================
-- SECTION 3: DESIGNATION STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_GetDesignations;
DELIMITER //
CREATE PROCEDURE sp_GetDesignations(
    IN p_IncludeInactive TINYINT(1),
    IN p_StaffType VARCHAR(50),
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        COALESCE(d.DepartmentName, '') AS DepartmentName,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        COALESCE(des.StaffType, 'Both') AS StaffType,
        des.IsActive,
        des.CreatedAt,
        des.UpdatedAt,
        COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id
    WHERE (p_IncludeInactive = 1 OR des.IsActive = 1)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR des.DepartmentId = p_DepartmentId)
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
          )
          OR LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', ''))
      )
    GROUP BY 
        des.Id, 
        des.Name, 
        des.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        des.StaffType, 
        des.IsActive, 
        des.CreatedAt, 
        des.UpdatedAt
    ORDER BY des.Name ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDesignationById;
DELIMITER //
CREATE PROCEDURE sp_GetDesignationById(
    IN p_DesignationId INT
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        COALESCE(d.DepartmentName, '') AS DepartmentName,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        COALESCE(des.StaffType, 'Both') AS StaffType,
        des.IsActive,
        des.CreatedAt,
        des.UpdatedAt,
        COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id
    WHERE des.Id = p_DesignationId
    GROUP BY 
        des.Id, 
        des.Name, 
        des.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        des.StaffType, 
        des.IsActive, 
        des.CreatedAt, 
        des.UpdatedAt
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDesignationByName;
DELIMITER //
CREATE PROCEDURE sp_GetDesignationByName(
    IN p_Name VARCHAR(100)
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        des.StaffType,
        des.IsActive,
        des.CreatedAt,
        des.UpdatedAt
    FROM `Designations` des
    WHERE LOWER(TRIM(des.Name)) = LOWER(TRIM(p_Name))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_ValidateDesignationNameUnique;
DELIMITER //
CREATE PROCEDURE sp_ValidateDesignationNameUnique(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Designations` 
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDesignationAssignedStaffCount;
DELIMITER //
CREATE PROCEDURE sp_GetDesignationAssignedStaffCount(
    IN p_DesignationId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Staff` 
    WHERE DesignationId = p_DesignationId 
      AND IsDeleted = 0;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateDesignation;
DELIMITER //
CREATE PROCEDURE sp_CreateDesignation(
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Designations` 
        (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `CreatedAt`)
    VALUES 
        (TRIM(p_Name), IF(p_DepartmentId > 0, p_DepartmentId, NULL), COALESCE(p_StaffType, 'Both'), p_IsActive, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateDesignation;
DELIMITER //
CREATE PROCEDURE sp_UpdateDesignation(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Designations`
    SET `Name` = TRIM(p_Name),
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteDesignation;
DELIMITER //
CREATE PROCEDURE sp_DeleteDesignation(
    IN p_Id INT
)
BEGIN
    DELETE FROM `Designations` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDesignationSummary;
DELIMITER //
CREATE PROCEDURE sp_GetDesignationSummary()
BEGIN
    SELECT 
        COUNT(*) AS TotalDesignations,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
        (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0) AS AssignedStaffCount
    FROM `Designations`;
END //
DELIMITER ;

-- =============================================================================
-- SECTION 4: HOLIDAY STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_GetHolidaySummary;
DELIMITER //
CREATE PROCEDURE sp_GetHolidaySummary(
    IN p_AcademicYearId INT,
    IN p_BoardId INT
)
BEGIN
    SELECT 
        COUNT(*) AS Total,
        SUM(CASE WHEN HolidayType = 'National Holiday' THEN 1 ELSE 0 END) AS National,
        SUM(CASE WHEN HolidayType LIKE '%Festival%' THEN 1 ELSE 0 END) AS Festival,
        SUM(CASE WHEN EndDate >= CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END) AS Upcoming,
        SUM(CASE WHEN EndDate < CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END) AS Completed
    FROM `Holidays`
    WHERE IsDeleted = 0
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId OR AcademicYearId IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId = p_BoardId OR BoardId IS NULL);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetHolidays;
DELIMITER //
CREATE PROCEDURE sp_GetHolidays(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_Search VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Type VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_MonthNum INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Limit INT,
    IN p_Offset INT
)
BEGIN
    -- Query 1: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM `Holidays`
    WHERE IsDeleted = 0
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId OR AcademicYearId IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId = p_BoardId OR BoardId IS NULL)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = ''
          OR HolidayName LIKE CONCAT('%', TRIM(p_Search), '%')
          OR Description LIKE CONCAT('%', TRIM(p_Search), '%')
          OR HolidayType LIKE CONCAT('%', TRIM(p_Search), '%')
          OR AppliesTo LIKE CONCAT('%', TRIM(p_Search), '%')
      )
      AND (
          p_Type IS NULL OR TRIM(p_Type) = '' OR LOWER(TRIM(p_Type)) = 'all'
          OR (p_Type LIKE '%Festival%' AND HolidayType LIKE '%Festival%')
          OR HolidayType = p_Type
      )
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) = 'all'
          OR (LOWER(TRIM(p_Status)) = 'completed' AND Status = 'Active' AND EndDate < CURRENT_DATE())
          OR ((LOWER(TRIM(p_Status)) = 'active' OR LOWER(TRIM(p_Status)) = 'upcoming') AND Status = 'Active' AND EndDate >= CURRENT_DATE())
          OR (LOWER(TRIM(p_Status)) = 'inactive' AND Status = 'Inactive')
      )
      AND (
          p_MonthNum IS NULL OR p_MonthNum <= 0
          OR MONTH(StartDate) = p_MonthNum OR MONTH(EndDate) = p_MonthNum
      )
      AND (p_FromDate IS NULL OR EndDate >= p_FromDate)
      AND (p_ToDate IS NULL OR StartDate <= p_ToDate);

    -- Query 2: Paged Items
    SELECT 
        Id, HolidayCode, AcademicYearId, BoardId, HolidayName, HolidayType,
        AppliesTo, DateType, StartDate, EndDate, Status, Description,
        IsDeleted, CreatedAt, UpdatedAt
    FROM `Holidays`
    WHERE IsDeleted = 0
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId OR AcademicYearId IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId = p_BoardId OR BoardId IS NULL)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = ''
          OR HolidayName LIKE CONCAT('%', TRIM(p_Search), '%')
          OR Description LIKE CONCAT('%', TRIM(p_Search), '%')
          OR HolidayType LIKE CONCAT('%', TRIM(p_Search), '%')
          OR AppliesTo LIKE CONCAT('%', TRIM(p_Search), '%')
      )
      AND (
          p_Type IS NULL OR TRIM(p_Type) = '' OR LOWER(TRIM(p_Type)) = 'all'
          OR (p_Type LIKE '%Festival%' AND HolidayType LIKE '%Festival%')
          OR HolidayType = p_Type
      )
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) = 'all'
          OR (LOWER(TRIM(p_Status)) = 'completed' AND Status = 'Active' AND EndDate < CURRENT_DATE())
          OR ((LOWER(TRIM(p_Status)) = 'active' OR LOWER(TRIM(p_Status)) = 'upcoming') AND Status = 'Active' AND EndDate >= CURRENT_DATE())
          OR (LOWER(TRIM(p_Status)) = 'inactive' AND Status = 'Inactive')
      )
      AND (
          p_MonthNum IS NULL OR p_MonthNum <= 0
          OR MONTH(StartDate) = p_MonthNum OR MONTH(EndDate) = p_MonthNum
      )
      AND (p_FromDate IS NULL OR EndDate >= p_FromDate)
      AND (p_ToDate IS NULL OR StartDate <= p_ToDate)
    ORDER BY StartDate ASC, Id ASC
    LIMIT p_Limit OFFSET p_Offset;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetHolidayById;
DELIMITER //
CREATE PROCEDURE sp_GetHolidayById(
    IN p_Id INT
)
BEGIN
    SELECT 
        Id, HolidayCode, AcademicYearId, BoardId, HolidayName, HolidayType,
        AppliesTo, DateType, StartDate, EndDate, Status, Description,
        IsDeleted, CreatedAt, UpdatedAt
    FROM `Holidays` 
    WHERE Id = p_Id AND IsDeleted = 0 
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckDuplicateHoliday;
DELIMITER //
CREATE PROCEDURE sp_CheckDuplicateHoliday(
    IN p_HolidayName VARCHAR(150),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_ExcludeId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Holidays` 
    WHERE LOWER(TRIM(HolidayName)) = LOWER(TRIM(p_HolidayName))
      AND StartDate = p_StartDate 
      AND EndDate = p_EndDate
      AND IsDeleted = 0
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId)
      AND (p_AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateHoliday;
DELIMITER //
CREATE PROCEDURE sp_CreateHoliday(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    DECLARE v_MaxId INT DEFAULT 0;
    DECLARE v_HolidayCode VARCHAR(20);
    
    SELECT COALESCE(MAX(Id), 0) INTO v_MaxId FROM `Holidays`;
    SET v_HolidayCode = CONCAT('HOL-', LPAD(v_MaxId + 1, 3, '0'));
    
    INSERT INTO `Holidays`
    (`HolidayCode`, `AcademicYearId`, `BoardId`, `HolidayName`, `HolidayType`, `AppliesTo`, `DateType`, `StartDate`, `EndDate`, `Status`, `Description`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
    VALUES
    (v_HolidayCode, IF(p_AcademicYearId > 0, p_AcademicYearId, NULL), IF(p_BoardId > 0, p_BoardId, NULL), TRIM(p_HolidayName), COALESCE(p_HolidayType, 'Festival Holiday'), COALESCE(p_AppliesTo, 'All Students & Staff'), COALESCE(p_DateType, 'Single Day'), p_StartDate, p_EndDate, COALESCE(p_Status, 'Active'), p_Description, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateHoliday;
DELIMITER //
CREATE PROCEDURE sp_UpdateHoliday(
    IN p_Id INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `Holidays`
    SET `HolidayName` = TRIM(p_HolidayName),
        `HolidayType` = COALESCE(p_HolidayType, 'Festival Holiday'),
        `AppliesTo` = COALESCE(p_AppliesTo, 'All Students & Staff'),
        `DateType` = COALESCE(p_DateType, 'Single Day'),
        `StartDate` = p_StartDate,
        `EndDate` = p_EndDate,
        `Status` = COALESCE(p_Status, 'Active'),
        `Description` = p_Description,
        `AcademicYearId` = IF(p_AcademicYearId > 0, p_AcademicYearId, NULL),
        `BoardId` = IF(p_BoardId > 0, p_BoardId, NULL),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteHoliday;
DELIMITER //
CREATE PROCEDURE sp_DeleteHoliday(
    IN p_Id INT
)
BEGIN
    UPDATE `Holidays` 
    SET `IsDeleted` = 1, `UpdatedAt` = UTC_TIMESTAMP() 
    WHERE `Id` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckIsHoliday;
DELIMITER //
CREATE PROCEDURE sp_CheckIsHoliday(
    IN p_QueryDate DATE,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT HolidayName, HolidayType
    FROM `Holidays`
    WHERE IsDeleted = 0 
      AND Status = 'Active'
      AND p_QueryDate >= StartDate AND p_QueryDate <= EndDate
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (
          p_AppliesTo IS NULL 
          OR AppliesTo = 'All Students & Staff' 
          OR AppliesTo = p_AppliesTo
      )
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetHolidaysBetweenDates;
DELIMITER //
CREATE PROCEDURE sp_GetHolidaysBetweenDates(
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT *
    FROM `Holidays`
    WHERE IsDeleted = 0 
      AND Status = 'Active'
      AND StartDate <= p_EndDate AND EndDate >= p_StartDate
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (
          p_AppliesTo IS NULL 
          OR AppliesTo = 'All Students & Staff' 
          OR AppliesTo = p_AppliesTo
      )
    ORDER BY StartDate ASC;
END //
DELIMITER ;

-- =============================================================================
-- SECTION 5: NUMBER SERIES STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_GetNumberSeriesConfigurations;
DELIMITER //
CREATE PROCEDURE sp_GetNumberSeriesConfigurations()
BEGIN
    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
           `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `IsActive` = 1
    ORDER BY `Id` ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetNumberSeriesByCode;
DELIMITER //
CREATE PROCEDURE sp_GetNumberSeriesByCode(
    IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
           `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateNumberSeriesByCode;
DELIMITER //
CREATE PROCEDURE sp_UpdateNumberSeriesByCode(
    IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Prefix VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_FormatPattern VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_NumberLength INT,
    IN p_StartNumber INT,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `NumberSeriesConfigurations`
    SET `Prefix` = p_Prefix,
        `FormatPattern` = p_FormatPattern,
        `NumberLength` = p_NumberLength,
        `StartNumber` = p_StartNumber,
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SeriesCode` = p_SeriesCode;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GenerateNextNumberSeries;
DELIMITER //
CREATE PROCEDURE sp_GenerateNextNumberSeries(
    IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_CurrentSeq INT;
    DECLARE v_StartNum INT;
    DECLARE v_NextSeq INT;

    SELECT `CurrentSequence`, `StartNumber`
    INTO v_CurrentSeq, v_StartNum
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
    FOR UPDATE;

    IF v_CurrentSeq < v_StartNum THEN
        SET v_NextSeq = v_StartNum;
    ELSE
        SET v_NextSeq = v_CurrentSeq + 1;
    END IF;

    UPDATE `NumberSeriesConfigurations`
    SET `CurrentSequence` = v_NextSeq,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SeriesCode` = p_SeriesCode;

    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
           `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode;
END //
DELIMITER ;

-- =============================================================================
-- SECTION 6: ATTENDANCE TIMING CONFIG STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_GetAttendanceTimingConfigs;
DELIMITER //
CREATE PROCEDURE sp_GetAttendanceTimingConfigs()
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    ORDER BY Id ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetAttendanceTimingConfigById;
DELIMITER //
CREATE PROCEDURE sp_GetAttendanceTimingConfigById(
    IN p_Id INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    WHERE Id = p_Id 
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetEffectiveAttendanceTimingConfig;
DELIMITER //
CREATE PROCEDURE sp_GetEffectiveAttendanceTimingConfig(
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs`
    WHERE IsActive = 1
      AND (p_StaffType IS NULL OR StaffType = p_StaffType OR StaffType IS NULL)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR DepartmentId = p_DepartmentId OR DepartmentId IS NULL)
    ORDER BY 
      (CASE WHEN StaffType = p_StaffType AND DepartmentId = p_DepartmentId THEN 1
            WHEN DepartmentId = p_DepartmentId AND StaffType IS NULL THEN 2
            WHEN StaffType = p_StaffType AND DepartmentId IS NULL THEN 3
            WHEN StaffType IS NULL AND DepartmentId IS NULL THEN 4
            ELSE 5 END) ASC
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateAttendanceTimingConfig;
DELIMITER //
CREATE PROCEDURE sp_CreateAttendanceTimingConfig(
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    INSERT INTO `AttendanceTimingConfigs`
    (`ConfigName`, `StaffType`, `DepartmentId`, `WorkStartTime`, `WorkEndTime`, `LateThreshold`, `EarlyCheckoutThreshold`, `GracePeriodMinutes`, `MinWorkingHours`, `IsActive`, `Description`, `CreatedAt`)
    VALUES
    (TRIM(p_ConfigName), p_StaffType, IF(p_DepartmentId > 0, p_DepartmentId, NULL), p_WorkStartTime, p_WorkEndTime, p_LateThreshold, p_EarlyCheckoutThreshold, COALESCE(p_GracePeriodMinutes, 5), COALESCE(p_MinWorkingHours, 7.00), COALESCE(p_IsActive, 1), p_Description, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateAttendanceTimingConfig;
DELIMITER //
CREATE PROCEDURE sp_UpdateAttendanceTimingConfig(
    IN p_Id INT,
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `AttendanceTimingConfigs`
    SET `ConfigName` = TRIM(p_ConfigName),
        `StaffType` = p_StaffType,
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `WorkStartTime` = p_WorkStartTime,
        `WorkEndTime` = p_WorkEndTime,
        `LateThreshold` = p_LateThreshold,
        `EarlyCheckoutThreshold` = p_EarlyCheckoutThreshold,
        `GracePeriodMinutes` = COALESCE(p_GracePeriodMinutes, 5),
        `MinWorkingHours` = COALESCE(p_MinWorkingHours, 7.00),
        `IsActive` = COALESCE(p_IsActive, 1),
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteAttendanceTimingConfig;
DELIMITER //
CREATE PROCEDURE sp_DeleteAttendanceTimingConfig(
    IN p_Id INT
)
BEGIN
    DELETE FROM `AttendanceTimingConfigs` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //
DELIMITER ;

-- =============================================================================
-- SECTION 7: SECTION RESIDUAL STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_CheckFacultyExists;
DELIMITER //
CREATE PROCEDURE sp_CheckFacultyExists(
    IN p_Id INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Staff` 
    WHERE Id = p_Id AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetGroupAndProgramByGroupProgramId;
DELIMITER //
CREATE PROCEDURE sp_GetGroupAndProgramByGroupProgramId(
    IN p_GroupProgramId INT
)
BEGIN
    SELECT GroupId, ProgramId 
    FROM `GroupPrograms` 
    WHERE GroupProgramId = p_GroupProgramId 
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckProgramValidForGroup;
DELIMITER //
CREATE PROCEDURE sp_CheckProgramValidForGroup(
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `GroupPrograms` 
    WHERE GroupId = p_GroupId 
      AND ProgramId = p_ProgramId 
      AND IsActive = 1;
END //
DELIMITER ;

-- =============================================================================
-- SECTION 8: ACADEMIC YEAR CASCADE DELETION STORED PROCEDURE
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_DeleteAcademicYearWithCascade;
DELIMITER //
CREATE PROCEDURE sp_DeleteAcademicYearWithCascade(
    IN p_AcademicYearId INT
)
BEGIN
    -- Disable foreign keys for atomic cascade cleanup
    SET FOREIGN_KEY_CHECKS = 0;
    
    -- Cleanup dependent records across academic modules
    DELETE FROM Results WHERE ExamId IN (SELECT ExamId FROM Examinations WHERE AcademicYearId = p_AcademicYearId);
    DELETE FROM Examinations WHERE AcademicYearId = p_AcademicYearId;
    DELETE FROM Marks WHERE AcademicYearId = p_AcademicYearId;
    DELETE FROM FeeStructures WHERE AcademicYearId = p_AcademicYearId;
    DELETE FROM Timetables WHERE AcademicYearId = p_AcademicYearId;
    DELETE FROM AttendanceSessions WHERE AcademicYearId = p_AcademicYearId;
    DELETE FROM `Groups` WHERE AcademicYearId = p_AcademicYearId;
    
    -- Nullify foreign key references on student admissions & profiles
    UPDATE Students SET AcademicYearId = NULL WHERE AcademicYearId = p_AcademicYearId;
    UPDATE StudentAdmissions SET AcademicYearId = NULL WHERE AcademicYearId = p_AcademicYearId;
    
    -- Finally delete the academic year record itself
    DELETE FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId;
    
    SET FOREIGN_KEY_CHECKS = 1;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

-- =============================================================================
-- SECTION 9: TRANSPORT RESIDUAL STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_CheckTransportRouteCodeExists;
DELIMITER //
CREATE PROCEDURE sp_CheckTransportRouteCodeExists(
    IN p_RouteCode VARCHAR(50),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE IsDeleted = 0 
      AND LOWER(TRIM(RouteCode)) = LOWER(TRIM(p_RouteCode)) 
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckTransportRouteNameExists;
DELIMITER //
CREATE PROCEDURE sp_CheckTransportRouteNameExists(
    IN p_RouteName VARCHAR(100),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE IsDeleted = 0 
      AND LOWER(TRIM(RouteName)) = LOWER(TRIM(p_RouteName)) 
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckPickupPointSequenceExists;
DELIMITER //
CREATE PROCEDURE sp_CheckPickupPointSequenceExists(
    IN p_RouteId BIGINT,
    IN p_SequenceNo INT,
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM PickupPoints 
    WHERE RouteId = p_RouteId 
      AND StopOrder = p_SequenceNo 
      AND IsDeleted = 0 
      AND (p_ExcludeId IS NULL OR PickupPointId != p_ExcludeId);
END //
DELIMITER ;

-- =============================================================================
-- SECTION 10: TIMETABLE & TIMETABLE SUBSTITUTION STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_GetTimetableSubstitutionById;
DELIMITER //
CREATE PROCEDURE sp_GetTimetableSubstitutionById(
    IN p_Id INT
)
BEGIN
    SELECT 
        ts.Id AS SubstitutionId,
        ts.SubstitutionDate,
        ts.TimetableId,
        ts.StaffLeaveRequestId,
        ts.OriginalStaffId,
        TRIM(CONCAT(COALESCE(origSt.FirstName, ''), ' ', COALESCE(origSt.LastName, ''))) AS OriginalStaffName,
        origSt.EmployeeId AS OriginalStaffEmployeeId,
        ts.SubstituteStaffId,
        TRIM(CONCAT(COALESCE(subSt.FirstName, ''), ' ', COALESCE(subSt.LastName, ''))) AS SubstituteStaffName,
        subSt.EmployeeId AS SubstituteStaffEmployeeId,
        t.SubjectId,
        sub.SubjectName,
        sub.SubjectCode,
        b.BoardName,
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        ts.SectionId,
        sec.SectionName,
        ts.PeriodId,
        per.PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        t.RoomId,
        r.RoomNumber,
        r.RoomName,
        ts.Status,
        ts.Remarks,
        ts.CreatedAt,
        ts.UpdatedAt
    FROM TimetableSubstitutions ts
    INNER JOIN Timetables t ON t.Id = ts.TimetableId
    INNER JOIN Staff origSt ON origSt.Id = ts.OriginalStaffId
    INNER JOIN Staff subSt ON subSt.Id = ts.SubstituteStaffId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Boards b ON b.BoardId = t.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
    LEFT JOIN Programs p ON p.ProgramId = t.ProgramId
    LEFT JOIN Sections sec ON sec.SectionId = ts.SectionId
    LEFT JOIN Periods per ON per.PeriodId = ts.PeriodId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE ts.Id = p_Id
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetTimetablesFull;
DELIMITER //
CREATE PROCEDURE sp_GetTimetablesFull(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_StaffId INT,
    IN p_RoomId INT,
    IN p_IsPublished TINYINT(1),
    IN p_ApprovalStatus INT
)
BEGIN
    SELECT 
        t.Id,
        t.Id AS TimetableId,
        t.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        t.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(al.LevelName, '') AS LevelName,
        t.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        t.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        t.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        t.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        t.DayOfWeek,
        CASE t.DayOfWeek
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        t.PeriodId,
        COALESCE(per.PeriodName, '') AS PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        per.IsBreak,
        t.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        t.StaffId,
        t.StaffId AS FacultyId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
        t.IsPublished,
        t.ApprovalStatus,
        CASE t.ApprovalStatus
            WHEN 0 THEN 'Draft'
            WHEN 1 THEN 'Approved'
            WHEN 2 THEN 'Published'
            ELSE 'Draft'
        END AS ApprovalStatusName,
        t.Remarks,
        t.CreatedAt,
        t.UpdatedAt
    FROM Timetables t
    LEFT JOIN Boards b ON t.BoardId = b.BoardId
    LEFT JOIN AcademicLevels al ON t.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN AcademicYears ay ON t.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON t.GroupId = g.GroupId
    LEFT JOIN Programs p ON t.ProgramId = p.ProgramId
    LEFT JOIN Sections s ON t.SectionId = s.SectionId
    LEFT JOIN Periods per ON t.PeriodId = per.PeriodId
    LEFT JOIN Subjects sub ON t.SubjectId = sub.SubjectId
    LEFT JOIN Staff st ON t.StaffId = st.Id
    LEFT JOIN Rooms r ON t.RoomId = r.RoomId
    WHERE (p_BoardId IS NULL OR t.BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR t.AcademicLevelId = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR t.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR t.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR t.SectionId = p_SectionId)
      AND (p_DayOfWeek IS NULL OR t.DayOfWeek = p_DayOfWeek)
      AND (p_StaffId IS NULL OR t.StaffId = p_StaffId)
      AND (p_RoomId IS NULL OR t.RoomId = p_RoomId)
      AND (p_IsPublished IS NULL OR t.IsPublished = p_IsPublished)
      AND (p_ApprovalStatus IS NULL OR t.ApprovalStatus = p_ApprovalStatus)
    ORDER BY t.DayOfWeek ASC, per.StartTime ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetTimetableByIdFull;
DELIMITER //
CREATE PROCEDURE sp_GetTimetableByIdFull(
    IN p_Id INT
)
BEGIN
    SELECT 
        t.Id,
        t.Id AS TimetableId,
        t.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        t.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(al.LevelName, '') AS LevelName,
        t.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        t.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        t.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        t.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        t.DayOfWeek,
        CASE t.DayOfWeek
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        t.PeriodId,
        COALESCE(per.PeriodName, '') AS PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        per.IsBreak,
        t.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        t.StaffId,
        t.StaffId AS FacultyId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
        t.IsPublished,
        t.ApprovalStatus,
        CASE t.ApprovalStatus
            WHEN 0 THEN 'Draft'
            WHEN 1 THEN 'Approved'
            WHEN 2 THEN 'Published'
            ELSE 'Draft'
        END AS ApprovalStatusName,
        t.Remarks,
        t.CreatedAt,
        t.UpdatedAt
    FROM Timetables t
    LEFT JOIN Boards b ON t.BoardId = b.BoardId
    LEFT JOIN AcademicLevels al ON t.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN AcademicYears ay ON t.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON t.GroupId = g.GroupId
    LEFT JOIN Programs p ON t.ProgramId = p.ProgramId
    LEFT JOIN Sections s ON t.SectionId = s.SectionId
    LEFT JOIN Periods per ON t.PeriodId = per.PeriodId
    LEFT JOIN Subjects sub ON t.SubjectId = sub.SubjectId
    LEFT JOIN Staff st ON t.StaffId = st.Id
    LEFT JOIN Rooms r ON t.RoomId = r.RoomId
    WHERE t.Id = p_Id
    LIMIT 1;
END //
DELIMITER ;

-- =============================================================================
-- SECTION 11: GROUP & ATTENDANCE RESIDUAL STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_ActivateGroup;
DELIMITER //
CREATE PROCEDURE sp_ActivateGroup(
    IN p_GroupId INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Groups`
    SET `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `GroupId` = p_GroupId;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_ClearGroupPrograms;
DELIMITER //
CREATE PROCEDURE sp_ClearGroupPrograms(
    IN p_GroupId INT
)
BEGIN
    DELETE FROM `GroupPrograms` WHERE `GroupId` = p_GroupId;
    SELECT ROW_COUNT();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_AddGroupProgram;
DELIMITER //
CREATE PROCEDURE sp_AddGroupProgram(
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    INSERT INTO `GroupPrograms` (`GroupId`, `ProgramId`, `IsActive`, `CreatedAt`)
    VALUES (p_GroupId, p_ProgramId, 1, UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetAttendancesTotalCount;
DELIMITER //
CREATE PROCEDURE sp_GetAttendancesTotalCount(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_StudentId INT,
    IN p_Status TINYINT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_SearchText VARCHAR(100),
    IN p_PeriodId INT,
    IN p_TimetableId INT
)
BEGIN
    SELECT COUNT(*)
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    LEFT JOIN `Staff` st ON a.FacultyId = st.Id
    WHERE (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNo LIKE CONCAT('%', p_SearchText, '%') OR 
           CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) LIKE CONCAT('%', p_SearchText, '%'));
END //
DELIMITER ;

