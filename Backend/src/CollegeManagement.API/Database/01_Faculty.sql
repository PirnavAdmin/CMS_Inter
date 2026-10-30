-- =============================================================================
-- MODULE: FACULTY MANAGEMENT
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: Contains all MySQL Stored Procedures for Faculty CRUD and Lookups
-- =============================================================================

USE u819242402_CLM_System;

-- -----------------------------------------------------------------------------
-- 1. sp_GetPagedFaculties
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetPagedFaculties;
DELIMITER //
CREATE PROCEDURE sp_GetPagedFaculties(
    IN p_SearchTerm VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Designation VARCHAR(100),
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
      AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
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
      AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
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

-- -----------------------------------------------------------------------------
-- 2. sp_GetFacultyById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyById;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyById(
    IN p_Id INT
)
BEGIN
    -- Result Set 1: Faculty Details
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
    WHERE f.Id = p_Id AND (f.IsDeleted = 0 OR f.IsDeleted IS NULL);

    -- Result Set 2: Subject Allocations
    SELECT 
        fsa.Id,
        fsa.FacultyId,
        fsa.BoardId,
        fsa.AcademicLevelId,
        fsa.AcademicYearId,
        fsa.GroupId,
        fsa.SectionId,
        fsa.SubjectId,
        fsa.CreatedAt,
        fsa.UpdatedAt
    FROM FacultySubjectAllocations fsa
    WHERE fsa.FacultyId = p_Id
    ORDER BY fsa.Id DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_CreateFaculty
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateFaculty;
DELIMITER //
CREATE PROCEDURE sp_CreateFaculty(
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
    IN p_FacultyType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(65,30),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    INSERT INTO Faculties (
        EmployeeId, FirstName, LastName, Gender, DateOfBirth, Aadhaar, Mobile, Email, BloodGroup, Qualification, Designation, FacultyType, DepartmentId, JoiningDate, Experience, Status, PhotoPath, CreatedAt, IsDeleted
    ) VALUES (
        p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, IFNULL(p_FacultyType, 'Teaching'), p_DepartmentId, p_JoiningDate, p_Experience, IFNULL(p_Status, 'Active'), p_PhotoPath, NOW(), 0
    );
    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_UpdateFaculty
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateFaculty;
DELIMITER //
CREATE PROCEDURE sp_UpdateFaculty(
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
        FacultyType = IFNULL(p_FacultyType, 'Teaching'),
        DepartmentId = p_DepartmentId,
        JoiningDate = p_JoiningDate,
        Experience = p_Experience,
        Status = p_Status,
        PhotoPath = p_PhotoPath,
        UpdatedAt = NOW()
    WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_SoftDeleteFaculty
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_SoftDeleteFaculty;
DELIMITER //
CREATE PROCEDURE sp_SoftDeleteFaculty(
    IN p_Id INT
)
BEGIN
    UPDATE Faculties SET IsDeleted = 1, UpdatedAt = NOW() WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_GetFacultyDropdown
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyDropdown;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyDropdown()
BEGIN
    SELECT 
        Id,
        EmployeeId,
        CONCAT(FirstName, ' ', LastName) AS FullName
    FROM Faculties
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
    ORDER BY FirstName ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_GetFacultyByEmployeeId
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyByEmployeeId;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyByEmployeeId(
    IN p_EmployeeId VARCHAR(50)
)
BEGIN
    SELECT * FROM Faculties WHERE EmployeeId = p_EmployeeId AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_GetFacultyByEmail
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyByEmail;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyByEmail(
    IN p_Email VARCHAR(150)
)
BEGIN
    SELECT * FROM Faculties WHERE Email = p_Email AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_GetFacultyByMobile
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyByMobile;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyByMobile(
    IN p_Mobile VARCHAR(15)
)
BEGIN
    SELECT * FROM Faculties WHERE Mobile = p_Mobile AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_GetFacultyByAadhaar
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyByAadhaar;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyByAadhaar(
    IN p_Aadhaar VARCHAR(12)
)
BEGIN
    SELECT * FROM Faculties WHERE Aadhaar = p_Aadhaar AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFacultyByUsername;

-- -----------------------------------------------------------------------------
-- 12. sp_GetFacultyPhotoPath
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyPhotoPath;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyPhotoPath(
    IN p_Id INT
)
BEGIN
    SELECT PhotoPath FROM Faculties WHERE Id = p_Id AND (IsDeleted = 0 OR IsDeleted IS NULL);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. sp_UpdateFacultyPhotoPath
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateFacultyPhotoPath;
DELIMITER //
CREATE PROCEDURE sp_UpdateFacultyPhotoPath(
    IN p_Id INT,
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    UPDATE Faculties SET PhotoPath = p_PhotoPath, UpdatedAt = NOW() WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 14. Uniqueness Checks (sp_CheckEmployeeIdUnique, sp_CheckEmailUnique, etc.)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CheckEmployeeIdUnique;
DELIMITER //
CREATE PROCEDURE sp_CheckEmployeeIdUnique(
    IN p_EmployeeId VARCHAR(50),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) FROM Faculties WHERE EmployeeId = p_EmployeeId AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckEmailUnique;
DELIMITER //
CREATE PROCEDURE sp_CheckEmailUnique(
    IN p_Email VARCHAR(150),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) FROM Faculties WHERE Email = p_Email AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckMobileUnique;
DELIMITER //
CREATE PROCEDURE sp_CheckMobileUnique(
    IN p_Mobile VARCHAR(15),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) FROM Faculties WHERE Mobile = p_Mobile AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckAadhaarUnique;
DELIMITER //
CREATE PROCEDURE sp_CheckAadhaarUnique(
    IN p_Aadhaar VARCHAR(12),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) FROM Faculties WHERE Aadhaar = p_Aadhaar AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckUsernameUnique;
