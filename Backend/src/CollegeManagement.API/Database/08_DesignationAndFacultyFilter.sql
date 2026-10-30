-- ============================================================================
-- Phase 6D: Faculty Type Filter & Designation Master
-- Tables, Constraints, Seed Data, Backfill, and Stored Procedures
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: Designations (Master)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Designations` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(100) NOT NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_Designations_Name` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- 2. Add DesignationId Column to Faculties (if not exists)
-- ----------------------------------------------------------------------------
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'Faculties' 
  AND column_name = 'DesignationId';

SET @sql_add_col = IF(@col_exists = 0,
    'ALTER TABLE `Faculties` ADD COLUMN `DesignationId` INT NULL AFTER `Designation`;',
    'SELECT "Column DesignationId already exists in Faculties" AS Notice;');
PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3. Add Foreign Key: FK_Faculties_Designation
-- ----------------------------------------------------------------------------
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND table_name = 'Faculties'
  AND constraint_name = 'FK_Faculties_Designation';

SET @sql_add_fk = IF(@fk_exists = 0,
    'ALTER TABLE `Faculties` ADD CONSTRAINT `FK_Faculties_Designation` FOREIGN KEY (`DesignationId`) REFERENCES `Designations` (`Id`) ON DELETE RESTRICT;',
    'SELECT "Foreign key FK_Faculties_Designation already exists" AS Notice;');
PREPARE stmt_fk FROM @sql_add_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- ----------------------------------------------------------------------------
-- 4. Seed Initial Designation Master Records
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO `Designations` (`Name`, `IsActive`, `CreatedAt`)
VALUES 
    ('Lecturer', 1, UTC_TIMESTAMP()),
    ('Senior Lecturer', 1, UTC_TIMESTAMP()),
    ('Assistant Professor', 1, UTC_TIMESTAMP()),
    ('Associate Professor', 1, UTC_TIMESTAMP()),
    ('Professor', 1, UTC_TIMESTAMP()),
    ('Head of Department (HOD)', 1, UTC_TIMESTAMP()),
    ('Lab Assistant', 1, UTC_TIMESTAMP()),
    ('Librarian', 1, UTC_TIMESTAMP()),
    ('Accountant', 1, UTC_TIMESTAMP()),
    ('Administrative Officer', 1, UTC_TIMESTAMP()),
    ('Clerk', 1, UTC_TIMESTAMP());

-- Also insert any other distinct designation strings currently in Faculties
INSERT IGNORE INTO `Designations` (`Name`, `IsActive`, `CreatedAt`)
SELECT DISTINCT TRIM(f.Designation), 1, UTC_TIMESTAMP()
FROM `Faculties` f
WHERE f.Designation IS NOT NULL 
  AND TRIM(f.Designation) != ''
  AND NOT EXISTS (
      SELECT 1 FROM `Designations` d WHERE LOWER(TRIM(d.Name)) = LOWER(TRIM(f.Designation))
  );

-- ----------------------------------------------------------------------------
-- 5. Backfill Existing Faculties.DesignationId from Designation Strings
-- ----------------------------------------------------------------------------
UPDATE `Faculties` f
JOIN `Designations` d ON LOWER(TRIM(d.Name)) = LOWER(TRIM(f.Designation))
SET f.DesignationId = d.Id
WHERE f.DesignationId IS NULL OR f.DesignationId = 0;

-- ----------------------------------------------------------------------------
-- 6. Stored Procedures for Designation Master
-- ----------------------------------------------------------------------------

-- A. sp_GetDesignations
DROP PROCEDURE IF EXISTS `sp_GetDesignations`;
DELIMITER //
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive INT
)
BEGIN
    SELECT 
        Id,
        Name,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Designations
    WHERE (p_IncludeInactive = 1 OR IsActive = 1)
    ORDER BY Name ASC;
END //
DELIMITER ;

-- B. sp_GetDesignationById
DROP PROCEDURE IF EXISTS `sp_GetDesignationById`;
DELIMITER //
CREATE PROCEDURE `sp_GetDesignationById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        Id,
        Name,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Designations
    WHERE Id = p_Id;
END //
DELIMITER ;

-- C. sp_GetDesignationByName
DROP PROCEDURE IF EXISTS `sp_GetDesignationByName`;
DELIMITER //
CREATE PROCEDURE `sp_GetDesignationByName`(
    IN p_Name VARCHAR(100)
)
BEGIN
    SELECT 
        Id,
        Name,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Designations
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name))
    LIMIT 1;
END //
DELIMITER ;

-- D. sp_CheckDesignationNameUnique
DROP PROCEDURE IF EXISTS `sp_CheckDesignationNameUnique`;
DELIMITER //
CREATE PROCEDURE `sp_CheckDesignationNameUnique`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM Designations
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name))
      AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id != p_ExcludeId);
END //
DELIMITER ;

-- E. sp_CheckDesignationAssignedToFaculty
DROP PROCEDURE IF EXISTS `sp_CheckDesignationAssignedToFaculty`;
DELIMITER //
CREATE PROCEDURE `sp_CheckDesignationAssignedToFaculty`(
    IN p_DesignationId INT
)
BEGIN
    SELECT COUNT(*)
    FROM Faculties
    WHERE DesignationId = p_DesignationId
      AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;

-- F. sp_CreateDesignation
DROP PROCEDURE IF EXISTS `sp_CreateDesignation`;
DELIMITER //
CREATE PROCEDURE `sp_CreateDesignation`(
    IN p_Name VARCHAR(100),
    IN p_IsActive INT
)
BEGIN
    INSERT INTO Designations (Name, IsActive, CreatedAt)
    VALUES (TRIM(p_Name), IFNULL(p_IsActive, 1), UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- G. sp_UpdateDesignation
DROP PROCEDURE IF EXISTS `sp_UpdateDesignation`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateDesignation`(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_IsActive INT
)
BEGIN
    UPDATE Designations
    SET Name = TRIM(p_Name),
        IsActive = IFNULL(p_IsActive, 1),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //
DELIMITER ;

-- H. sp_DeleteDesignation
DROP PROCEDURE IF EXISTS `sp_DeleteDesignation`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteDesignation`(
    IN p_Id INT
)
BEGIN
    DELETE FROM Designations WHERE Id = p_Id;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 7. Updated Faculty Stored Procedures
-- ----------------------------------------------------------------------------

-- A. sp_GetPagedFaculties (Updated with p_FacultyType and p_DesignationId)
DROP PROCEDURE IF EXISTS `sp_GetPagedFaculties`;
DELIMITER //
CREATE PROCEDURE `sp_GetPagedFaculties`(
    IN p_SearchTerm VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_Status VARCHAR(50),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    SET v_Offset = (IFNULL(p_PageNumber, 1) - 1) * IFNULL(p_PageSize, 10);

    -- Result Set 1: Total Count
    SELECT COUNT(*) 
    FROM Faculties f
    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId
    WHERE (f.IsDeleted = 0 OR f.IsDeleted IS NULL)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
           f.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           f.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (p_Department IS NULL OR p_Department = '' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_DesignationId IS NULL OR p_DesignationId <= 0 OR f.DesignationId = p_DesignationId)
      AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
      AND (p_FacultyType IS NULL OR p_FacultyType = '' OR p_FacultyType = 'All' OR f.FacultyType = p_FacultyType)
      AND (p_Status IS NULL OR p_Status = '' OR f.Status = p_Status);

    -- Result Set 2: Paged Items
    SELECT 
        f.Id,
        f.EmployeeId,
        f.FirstName,
        f.LastName,
        f.Gender,
        f.DateOfBirth,
        f.Aadhaar,
        f.Mobile,
        f.Email,
        f.BloodGroup,
        f.Qualification,
        f.Designation,
        f.DesignationId,
        IFNULL(f.FacultyType, 'Teaching') AS FacultyType,
        f.DepartmentId,
        d.DepartmentName AS Department,
        f.JoiningDate,
        f.Experience,
        f.Status,
        f.PhotoPath,
        f.CreatedAt,
        f.UpdatedAt,
        f.IsDeleted
    FROM Faculties f
    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId
    WHERE (f.IsDeleted = 0 OR f.IsDeleted IS NULL)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
           f.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           f.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (p_Department IS NULL OR p_Department = '' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_DesignationId IS NULL OR p_DesignationId <= 0 OR f.DesignationId = p_DesignationId)
      AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
      AND (p_FacultyType IS NULL OR p_FacultyType = '' OR p_FacultyType = 'All' OR f.FacultyType = p_FacultyType)
      AND (p_Status IS NULL OR p_Status = '' OR f.Status = p_Status)
    ORDER BY 
        CASE WHEN p_SortBy = 'FirstName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.FirstName END ASC,
        CASE WHEN p_SortBy = 'FirstName' AND p_SortOrder = 'DESC' THEN f.FirstName END DESC,
        CASE WHEN p_SortBy = 'LastName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.LastName END ASC,
        CASE WHEN p_SortBy = 'LastName' AND p_SortOrder = 'DESC' THEN f.LastName END DESC,
        CASE WHEN p_SortBy = 'EmployeeId' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.EmployeeId END ASC,
        CASE WHEN p_SortBy = 'EmployeeId' AND p_SortOrder = 'DESC' THEN f.EmployeeId END DESC,
        CASE WHEN (p_SortBy IS NULL OR p_SortBy = '' OR p_SortBy = 'Id') THEN f.Id END DESC
    LIMIT p_PageSize OFFSET v_Offset;
END //
DELIMITER ;

-- B. sp_GetFacultyDropdown (Updated with FacultyType filter and Designation details)
DROP PROCEDURE IF EXISTS `sp_GetFacultyDropdown`;
DELIMITER //
CREATE PROCEDURE `sp_GetFacultyDropdown`(
    IN p_FacultyType VARCHAR(20)
)
BEGIN
    SELECT 
        Id,
        EmployeeId,
        CONCAT(FirstName, ' ', LastName) AS FullName,
        Designation,
        DesignationId,
        IFNULL(FacultyType, 'Teaching') AS FacultyType
    FROM Faculties
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND Status = 'Active'
      AND (p_FacultyType IS NULL OR p_FacultyType = '' OR p_FacultyType = 'All' OR FacultyType = p_FacultyType)
    ORDER BY FirstName ASC;
END //
DELIMITER ;

-- C. sp_CreateFaculty (Updated to accept p_DesignationId)
DROP PROCEDURE IF EXISTS `sp_CreateFaculty`;
DELIMITER //
CREATE PROCEDURE `sp_CreateFaculty`(
    IN p_EmployeeId VARCHAR(50),
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(65,30),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    INSERT INTO Faculties (
        EmployeeId, FirstName, LastName, Gender, DateOfBirth, Aadhaar, Mobile, Email, BloodGroup, 
        Qualification, Designation, DesignationId, FacultyType, DepartmentId, JoiningDate, Experience, Status, PhotoPath, CreatedAt, IsDeleted
    ) VALUES (
        p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, 
        p_Qualification, p_Designation, p_DesignationId, IFNULL(p_FacultyType, 'Teaching'), p_DepartmentId, p_JoiningDate, p_Experience, IFNULL(p_Status, 'Active'), p_PhotoPath, UTC_TIMESTAMP(), 0
    );
    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- D. sp_UpdateFaculty (Updated to accept p_DesignationId)
DROP PROCEDURE IF EXISTS `sp_UpdateFaculty`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateFaculty`(
    IN p_Id INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(65,30),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    UPDATE Faculties SET
        FirstName = p_FirstName,
        LastName = p_LastName,
        Gender = p_Gender,
        DateOfBirth = p_DateOfBirth,
        Aadhaar = p_Aadhaar,
        Mobile = p_Mobile,
        Email = p_Email,
        BloodGroup = p_BloodGroup,
        Qualification = p_Qualification,
        Designation = p_Designation,
        DesignationId = p_DesignationId,
        FacultyType = IFNULL(p_FacultyType, 'Teaching'),
        DepartmentId = p_DepartmentId,
        JoiningDate = p_JoiningDate,
        Experience = p_Experience,
        Status = p_Status,
        PhotoPath = p_PhotoPath,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //
DELIMITER ;
