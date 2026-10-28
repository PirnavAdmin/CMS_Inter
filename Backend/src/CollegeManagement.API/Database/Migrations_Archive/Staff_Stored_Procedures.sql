-- ====================================================================================================
-- COLLEGE MANAGEMENT SYSTEM (CMS) - STAFF MANAGEMENT MODULE
-- STORED PROCEDURES & DATABASE OPTIMIZATION QUERIES
-- Database Stack: MySQL 8.0+ / MariaDB 10.5+
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 1. PERFORMANCE INDEXES FOR STAFF MANAGEMENT (Standard MySQL Syntax)
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateStaffIndexes;
DELIMITER //
CREATE PROCEDURE sp_CreateStaffIndexes()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Staff' AND index_name = 'idx_staff_perf_type_status') THEN
        CREATE INDEX idx_staff_perf_type_status ON `Staff` (StaffType, Status, IsDeleted);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Staff' AND index_name = 'idx_staff_perf_dept_desig') THEN
        CREATE INDEX idx_staff_perf_dept_desig ON `Staff` (DepartmentId, DesignationId, IsDeleted);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Staff' AND index_name = 'idx_staff_perf_board') THEN
        CREATE INDEX idx_staff_perf_board ON `Staff` (BoardId, IsDeleted);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Staff' AND index_name = 'idx_staff_perf_empid') THEN
        CREATE INDEX idx_staff_perf_empid ON `Staff` (EmployeeId);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Staff' AND index_name = 'idx_staff_perf_email_phone') THEN
        CREATE INDEX idx_staff_perf_email_phone ON `Staff` (Email, Mobile);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'Staff' AND index_name = 'idx_staff_perf_created') THEN
        CREATE INDEX idx_staff_perf_created ON `Staff` (CreatedAt DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'StaffSubjectAllocations' AND index_name = 'idx_ssa_staff_subject') THEN
        CREATE INDEX idx_ssa_staff_subject ON `StaffSubjectAllocations` (StaffId, SubjectId);
    END IF;
END //
DELIMITER ;

CALL sp_CreateStaffIndexes();
DROP PROCEDURE IF EXISTS sp_CreateStaffIndexes;

-- ----------------------------------------------------------------------------------------------------
-- 2. STORED PROCEDURE: sp_GetPagedStaff
-- Purpose: Retrieves paginated staff records with pre-pagination TotalCount, normalized StaffType,
--          multi-column search, relations fallback, and subject allocation list.
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetPagedStaff;

DELIMITER $$
CREATE PROCEDURE sp_GetPagedStaff(
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchTerm VARCHAR(255),
    IN p_Department VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_StaffType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_ProfileStatus VARCHAR(50),
    IN p_BoardId INT,
    IN p_BoardName VARCHAR(100),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10)
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    DECLARE v_PageSize INT DEFAULT 10;
    DECLARE v_PageNumber INT DEFAULT 1;
    DECLARE v_TotalCount INT DEFAULT 0;
    DECLARE v_StaffTypeNorm VARCHAR(50) DEFAULT NULL;

    -- Normalize Page Number & Size
    IF p_PageNumber IS NOT NULL AND p_PageNumber > 0 THEN
        SET v_PageNumber = p_PageNumber;
    END IF;

    IF p_PageSize IS NOT NULL AND p_PageSize > 0 THEN
        SET v_PageSize = p_PageSize;
    END IF;

    -- Offset Calculation: (PageNumber - 1) * PageSize
    SET v_Offset = (v_PageNumber - 1) * v_PageSize;

    -- Normalize Staff Type ("Teaching", "Non-Teaching", "NonTeaching", "All")
    IF p_StaffType IS NOT NULL AND TRIM(p_StaffType) != '' AND LOWER(TRIM(p_StaffType)) != 'all' THEN
        IF LOWER(TRIM(p_StaffType)) IN ('nonteaching', 'non-teaching', 'non teaching') THEN
            SET v_StaffTypeNorm = 'Non-Teaching';
        ELSEIF LOWER(TRIM(p_StaffType)) = 'teaching' THEN
            SET v_StaffTypeNorm = 'Teaching';
        ELSE
            SET v_StaffTypeNorm = TRIM(p_StaffType);
        END IF;
    END IF;

    -- Calculate Pre-Pagination TotalCount
    SELECT COUNT(*) INTO v_TotalCount
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    LEFT JOIN Boards b ON s.BoardId = b.BoardId
    WHERE s.IsDeleted = 0
      -- Search filter
      AND (
          p_SearchTerm IS NULL OR TRIM(p_SearchTerm) = '' OR
          s.FirstName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.LastName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.MiddleName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          CONCAT(s.FirstName, ' ', s.LastName) LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.EmployeeId LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Email LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Mobile LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Designation LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          des.Name LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%')
      )
      -- StaffType filter
      AND (
          v_StaffTypeNorm IS NULL OR
          (v_StaffTypeNorm = 'Non-Teaching' AND s.StaffType IN ('Non-Teaching', 'NonTeaching', 'Non Teaching')) OR
          (v_StaffTypeNorm = 'Teaching' AND (s.StaffType = 'Teaching' OR s.StaffType IS NULL OR s.StaffType = '')) OR
          (v_StaffTypeNorm NOT IN ('Teaching', 'Non-Teaching') AND s.StaffType = v_StaffTypeNorm)
      )
      -- Department filter
      AND (
          (p_DepartmentId IS NOT NULL AND p_DepartmentId > 0 AND s.DepartmentId = p_DepartmentId) OR
          (
              (p_DepartmentId IS NULL OR p_DepartmentId <= 0) AND
              (p_Department IS NULL OR TRIM(p_Department) = '' OR LOWER(TRIM(p_Department)) IN ('all', 'all departments') OR
               d.DepartmentName = TRIM(p_Department) OR d.DepartmentCode = TRIM(p_Department))
          )
      )
      -- Designation filter
      AND (
          (p_DesignationId IS NOT NULL AND p_DesignationId > 0 AND s.DesignationId = p_DesignationId) OR
          (
              (p_DesignationId IS NULL OR p_DesignationId <= 0) AND
              (p_Designation IS NULL OR TRIM(p_Designation) = '' OR LOWER(TRIM(p_Designation)) IN ('all', 'all designations') OR
               s.Designation = TRIM(p_Designation) OR des.Name = TRIM(p_Designation))
          )
      )
      -- Board filter
      AND (
          (p_BoardId IS NOT NULL AND p_BoardId > 0 AND s.BoardId = p_BoardId) OR
          (
              (p_BoardId IS NULL OR p_BoardId <= 0) AND
              (p_BoardName IS NULL OR TRIM(p_BoardName) = '' OR LOWER(TRIM(p_BoardName)) IN ('all', 'all boards') OR
               b.BoardName = TRIM(p_BoardName) OR b.BoardCode = TRIM(p_BoardName))
          )
      )
      -- Status filter
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) IN ('all', 'all status') OR
          s.Status = TRIM(p_Status)
      )
      -- Profile Status filter
      AND (
          p_ProfileStatus IS NULL OR TRIM(p_ProfileStatus) = '' OR LOWER(TRIM(p_ProfileStatus)) IN ('all', 'all profile status') OR
          s.ProfileStatus = TRIM(p_ProfileStatus)
      );

    -- Result Set 1: Pagination Metadata
    SELECT 
        v_TotalCount AS TotalCount,
        v_PageNumber AS PageNumber,
        v_PageSize AS PageSize,
        CEIL(v_TotalCount / v_PageSize) AS TotalPages,
        (v_PageNumber > 1) AS HasPreviousPage,
        (v_PageNumber < CEIL(v_TotalCount / v_PageSize)) AS HasNextPage;

    -- Result Set 2: Paged Staff List
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.MiddleName,
        s.LastName,
        CONCAT(s.FirstName, IF(s.MiddleName IS NOT NULL AND s.MiddleName != '', CONCAT(' ', s.MiddleName), ''), ' ', s.LastName) AS FullName,
        s.FatherOrHusbandName,
        s.FatherOrHusbandName AS GuardianName,
        s.Gender,
        s.DateOfBirth,
        s.MaritalStatus,
        s.Nationality,
        s.Aadhaar,
        s.PanNumber,
        s.PanNumber AS Pan,
        s.Mobile,
        s.Mobile AS Phone,
        s.AlternateMobile,
        s.Email,
        s.BloodGroup,
        s.CurrentAddress,
        s.PermanentAddress,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.Pincode AS Pin,
        s.Country,
        s.Qualification,
        s.Designation,
        s.DesignationId,
        COALESCE(des.Name, s.Designation) AS DesignationName,
        s.StaffType,
        s.DepartmentId,
        COALESCE(d.DepartmentName, '') AS Department,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        s.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(b.BoardCode, '') AS BoardCode,
        s.JoiningDate,
        s.JoiningDate AS DateOfJoining,
        s.Experience,
        s.EmploymentType,
        s.Status,
        s.PhotoPath,
        s.PhotoPath AS PhotoUrl,
        s.PhotoPath AS Photo,
        s.ProfileStatus,
        s.ProfileCompletionPercentage,
        s.ProfileCompletionPercentage AS ProfileCompletion,
        (s.ProfileLinkSentAt IS NOT NULL OR s.ProfileStatus IN ('Link Sent', 'LinkSent')) AS LinkSent,
        DATE_FORMAT(s.ProfileLinkSentAt, '%Y-%m-%d') AS LinkSentAt,
        s.ProfileLinkSentAt,
        s.CorrectionNotes,
        s.CorrectionNotes AS CorrectionNote,
        s.ReviewStatus,
        s.CreatedAt,
        (
            SELECT GROUP_CONCAT(DISTINCT sub.SubjectName ORDER BY sub.SubjectName SEPARATOR ', ')
            FROM StaffSubjectAllocations ssa
            JOIN Subjects sub ON ssa.SubjectId = sub.SubjectId
            WHERE ssa.StaffId = s.Id
        ) AS AllocatedSubjectsText,
        (
            SELECT JSON_ARRAYAGG(sub.SubjectName)
            FROM StaffSubjectAllocations ssa
            JOIN Subjects sub ON ssa.SubjectId = sub.SubjectId
            WHERE ssa.StaffId = s.Id
        ) AS AllocatedSubjectsJson
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    LEFT JOIN Boards b ON s.BoardId = b.BoardId
    WHERE s.IsDeleted = 0
      -- Search filter
      AND (
          p_SearchTerm IS NULL OR TRIM(p_SearchTerm) = '' OR
          s.FirstName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.LastName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.MiddleName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          CONCAT(s.FirstName, ' ', s.LastName) LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.EmployeeId LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Email LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Mobile LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Designation LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          des.Name LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%')
      )
      -- StaffType filter
      AND (
          v_StaffTypeNorm IS NULL OR
          (v_StaffTypeNorm = 'Non-Teaching' AND s.StaffType IN ('Non-Teaching', 'NonTeaching', 'Non Teaching')) OR
          (v_StaffTypeNorm = 'Teaching' AND (s.StaffType = 'Teaching' OR s.StaffType IS NULL OR s.StaffType = '')) OR
          (v_StaffTypeNorm NOT IN ('Teaching', 'Non-Teaching') AND s.StaffType = v_StaffTypeNorm)
      )
      -- Department filter
      AND (
          (p_DepartmentId IS NOT NULL AND p_DepartmentId > 0 AND s.DepartmentId = p_DepartmentId) OR
          (
              (p_DepartmentId IS NULL OR p_DepartmentId <= 0) AND
              (p_Department IS NULL OR TRIM(p_Department) = '' OR LOWER(TRIM(p_Department)) IN ('all', 'all departments') OR
               d.DepartmentName = TRIM(p_Department) OR d.DepartmentCode = TRIM(p_Department))
          )
      )
      -- Designation filter
      AND (
          (p_DesignationId IS NOT NULL AND p_DesignationId > 0 AND s.DesignationId = p_DesignationId) OR
          (
              (p_DesignationId IS NULL OR p_DesignationId <= 0) AND
              (p_Designation IS NULL OR TRIM(p_Designation) = '' OR LOWER(TRIM(p_Designation)) IN ('all', 'all designations') OR
               s.Designation = TRIM(p_Designation) OR des.Name = TRIM(p_Designation))
          )
      )
      -- Board filter
      AND (
          (p_BoardId IS NOT NULL AND p_BoardId > 0 AND s.BoardId = p_BoardId) OR
          (
              (p_BoardId IS NULL OR p_BoardId <= 0) AND
              (p_BoardName IS NULL OR TRIM(p_BoardName) = '' OR LOWER(TRIM(p_BoardName)) IN ('all', 'all boards') OR
               b.BoardName = TRIM(p_BoardName) OR b.BoardCode = TRIM(p_BoardName))
          )
      )
      -- Status filter
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) IN ('all', 'all status') OR
          s.Status = TRIM(p_Status)
      )
      -- Profile Status filter
      AND (
          p_ProfileStatus IS NULL OR TRIM(p_ProfileStatus) = '' OR LOWER(TRIM(p_ProfileStatus)) IN ('all', 'all profile status') OR
          s.ProfileStatus = TRIM(p_ProfileStatus)
      )
    ORDER BY 
        CASE WHEN p_SortBy = 'Name' AND UPPER(p_SortOrder) = 'ASC' THEN CONCAT(s.FirstName, ' ', s.LastName) END ASC,
        CASE WHEN p_SortBy = 'Name' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'DESC') THEN CONCAT(s.FirstName, ' ', s.LastName) END DESC,
        CASE WHEN p_SortBy = 'EmployeeId' AND UPPER(p_SortOrder) = 'ASC' THEN s.EmployeeId END ASC,
        CASE WHEN p_SortBy = 'EmployeeId' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'DESC') THEN s.EmployeeId END DESC,
        CASE WHEN p_SortBy = 'DateOfJoining' AND UPPER(p_SortOrder) = 'ASC' THEN s.JoiningDate END ASC,
        CASE WHEN p_SortBy = 'DateOfJoining' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'DESC') THEN s.JoiningDate END DESC,
        s.Id DESC
    LIMIT v_Offset, v_PageSize;

END$$
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 3. STORED PROCEDURE: sp_GetStaffProfileById
-- Purpose: Retrieves complete full profile with flattened root fields and subject allocations list.
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffProfileById;

DELIMITER $$
CREATE PROCEDURE sp_GetStaffProfileById(
    IN p_StaffId INT
)
BEGIN
    -- Result Set 1: Full Staff Profile
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.MiddleName,
        s.LastName,
        CONCAT(s.FirstName, IF(s.MiddleName IS NOT NULL AND s.MiddleName != '', CONCAT(' ', s.MiddleName), ''), ' ', s.LastName) AS FullName,
        s.FatherOrHusbandName,
        s.FatherOrHusbandName AS GuardianName,
        s.Gender,
        s.DateOfBirth,
        s.DateOfBirth AS Dob,
        s.MaritalStatus,
        s.Nationality,
        s.Aadhaar,
        s.PanNumber,
        s.PanNumber AS Pan,
        s.Mobile,
        s.Mobile AS Phone,
        s.AlternateMobile,
        s.Email,
        s.BloodGroup,
        s.CurrentAddress,
        s.PermanentAddress,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.Pincode AS Pin,
        s.Country,
        s.Qualification,
        s.Designation,
        s.DesignationId,
        COALESCE(des.Name, s.Designation) AS DesignationName,
        s.StaffType,
        s.DepartmentId,
        COALESCE(d.DepartmentName, '') AS Department,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        s.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(b.BoardCode, '') AS BoardCode,
        s.JoiningDate,
        s.JoiningDate AS DateOfJoining,
        s.Experience,
        s.EmploymentType,
        s.Status,
        s.PhotoPath,
        s.PhotoPath AS PhotoUrl,
        s.PhotoPath AS Photo,
        s.ProfileStatus,
        s.ProfileCompletionPercentage,
        s.ProfileCompletionPercentage AS ProfileCompletion,
        (s.ProfileLinkSentAt IS NOT NULL OR s.ProfileStatus IN ('Link Sent', 'LinkSent')) AS LinkSent,
        DATE_FORMAT(s.ProfileLinkSentAt, '%Y-%m-%d') AS LinkSentAt,
        s.ProfileLinkSentAt,
        s.CorrectionNotes,
        s.CorrectionNotes AS CorrectionNote,
        s.ReviewStatus,
        s.EducationJson,
        s.ExperienceJson,
        s.DocumentsJson,
        s.BankDetailsJson,
        s.EmergencyContactJson,
        s.CreatedAt
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    LEFT JOIN Boards b ON s.BoardId = b.BoardId
    WHERE s.Id = p_StaffId AND s.IsDeleted = 0;

    -- Result Set 2: Subject Allocations
    SELECT 
        ssa.Id,
        ssa.StaffId,
        ssa.SubjectId,
        sub.SubjectCode,
        sub.SubjectName,
        sub.SubjectType,
        ssa.CreatedAt
    FROM StaffSubjectAllocations ssa
    JOIN Subjects sub ON ssa.SubjectId = sub.SubjectId
    WHERE ssa.StaffId = p_StaffId;

END$$
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 4. STORED PROCEDURE: sp_GetStaffDashboardStats
-- Purpose: Retrieves real-time KPI metrics for Staff Overview Dashboard.
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffDashboardStats;

DELIMITER $$
CREATE PROCEDURE sp_GetStaffDashboardStats(
    IN p_BoardId INT
)
BEGIN
    SELECT 
        COUNT(*) AS TotalStaff,
        COUNT(*) AS TotalCount,
        SUM(CASE WHEN s.StaffType = 'Teaching' OR s.StaffType IS NULL OR s.StaffType = '' THEN 1 ELSE 0 END) AS TeachingStaff,
        SUM(CASE WHEN s.StaffType IN ('Non-Teaching', 'NonTeaching', 'Non Teaching') THEN 1 ELSE 0 END) AS NonTeachingStaff,
        SUM(CASE WHEN s.Status = 'Active' THEN 1 ELSE 0 END) AS ActiveStaff,
        SUM(CASE WHEN s.Status != 'Active' THEN 1 ELSE 0 END) AS InactiveStaff,
        SUM(CASE WHEN s.ProfileStatus = 'Completed' OR s.ProfileCompletionPercentage = 100 THEN 1 ELSE 0 END) AS CompletedProfiles,
        SUM(CASE WHEN s.ProfileStatus = 'Completed' OR s.ProfileCompletionPercentage = 100 THEN 1 ELSE 0 END) AS Completed,
        SUM(CASE WHEN s.ProfileStatus != 'Completed' AND (s.ProfileCompletionPercentage < 100 OR s.ProfileCompletionPercentage IS NULL) THEN 1 ELSE 0 END) AS PendingProfileCompletion,
        SUM(CASE WHEN s.ProfileStatus = 'PendingLink' OR s.ProfileStatus = 'Pending' OR s.ProfileStatus IS NULL THEN 1 ELSE 0 END) AS Pending,
        SUM(CASE WHEN s.ProfileStatus = 'InProgress' THEN 1 ELSE 0 END) AS InProgress,
        SUM(CASE WHEN s.ProfileStatus = 'NeedsCorrection' THEN 1 ELSE 0 END) AS NeedsCorrection,
        SUM(CASE WHEN s.ProfileStatus = 'Submitted' THEN 1 ELSE 0 END) AS Submitted,
        SUM(CASE WHEN s.ProfileLinkSentAt IS NOT NULL OR s.ProfileStatus IN ('Link Sent', 'LinkSent') THEN 1 ELSE 0 END) AS LinkSentCount
    FROM Staff s
    WHERE s.IsDeleted = 0
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId);
END$$
DELIMITER ;

-- ----------------------------------------------------------------------------------------------------
-- 5. STORED PROCEDURE: sp_GetStaffLookups
-- Purpose: Retrieves Departments, Designations, and Subjects for Staff filters and modal dropdowns.
-- ----------------------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLookups;

DELIMITER $$
CREATE PROCEDURE sp_GetStaffLookups()
BEGIN
    -- Result Set 1: Departments
    SELECT DepartmentId, DepartmentName, DepartmentCode, IsActive
    FROM Departments
    WHERE IsActive = 1
    ORDER BY DepartmentName ASC;

    -- Result Set 2: Designations
    SELECT Id AS DesignationId, Name AS DesignationName, StaffType, IsActive
    FROM Designations
    WHERE IsActive = 1
    ORDER BY Name ASC;

    -- Result Set 3: Available Subjects
    SELECT SubjectId, SubjectCode, SubjectName, SubjectType, IsActive
    FROM Subjects
    WHERE IsActive = 1
    ORDER BY SubjectName ASC;

    -- Result Set 4: Boards
    SELECT BoardId, BoardCode, BoardName, IsActive
    FROM Boards
    WHERE IsActive = 1
    ORDER BY BoardName ASC;
END$$
DELIMITER ;
