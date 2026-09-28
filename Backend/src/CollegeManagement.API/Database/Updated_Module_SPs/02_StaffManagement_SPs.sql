-- =========================================================================
-- MODULE: StaffManagement_SPs
-- Generated on: 2026-09-23T10:38:34.232Z
-- =========================================================================

USE `u819242402_CLM_System`;

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_CheckStaffEmployeeIdUnique` //
CREATE PROCEDURE `sp_CheckStaffEmployeeIdUnique`(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
BEGIN
                    SELECT COUNT(*) FROM Staff
                    WHERE EmployeeId = p_EmployeeId AND (IsDeleted = 0 OR IsDeleted IS NULL) AND (p_ExcludeId IS NULL OR Id != p_ExcludeId);
                END //

DROP PROCEDURE IF EXISTS `sp_CreateFaculty` //
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
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20)
)
BEGIN
    CALL sp_CreateStaff(p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, p_DesignationId, p_FacultyType, p_DepartmentId, p_JoiningDate, p_Experience, p_Status);
END //

DROP PROCEDURE IF EXISTS `sp_CreateStaff` //
CREATE PROCEDURE `sp_CreateStaff`(
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
                    IN p_StaffType VARCHAR(20),
                    IN p_DepartmentId INT,
                    IN p_JoiningDate DATETIME(6),
                    IN p_Experience DECIMAL(5,2),
                    IN p_Status VARCHAR(20),
                    IN p_PhotoPath VARCHAR(500)
                )
BEGIN
                    INSERT INTO Staff (
                        EmployeeId, FirstName, LastName, Gender, DateOfBirth,
                        Aadhaar, Mobile, Email, BloodGroup, Qualification,
                        Designation, DesignationId, StaffType, DepartmentId,
                        JoiningDate, Experience, Status, PhotoPath,
                        CreatedAt, IsDeleted
                    )
                    VALUES (
                        TRIM(p_EmployeeId), TRIM(p_FirstName), TRIM(p_LastName), p_Gender, p_DateOfBirth,
                        p_Aadhaar, TRIM(p_Mobile), TRIM(p_Email), p_BloodGroup, TRIM(p_Qualification),
                        TRIM(p_Designation), p_DesignationId, IFNULL(p_StaffType, 'Teaching'), p_DepartmentId,
                        p_JoiningDate, IFNULL(p_Experience, 0.00), IFNULL(p_Status, 'Active'), p_PhotoPath,
                        UTC_TIMESTAMP(), 0
                    );
                    SELECT LAST_INSERT_ID();
                END //

DROP PROCEDURE IF EXISTS `sp_CreateStaffSubjectAllocation` //
CREATE PROCEDURE `sp_CreateStaffSubjectAllocation`(
    IN p_StaffId INT,
    IN p_SubjectId INT
)
BEGIN
    INSERT INTO StaffSubjectAllocations (StaffId, SubjectId, CreatedAt)
    VALUES (p_StaffId, p_SubjectId, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_DeleteFaculty` //
CREATE PROCEDURE `sp_DeleteFaculty`(IN p_Id INT)
BEGIN
    CALL sp_DeleteStaff(p_Id);
END //

DROP PROCEDURE IF EXISTS `sp_DeleteStaff` //
CREATE PROCEDURE `sp_DeleteStaff`(IN p_Id INT)
BEGIN
    UPDATE `Staffs` SET 
        `IsDeleted` = 1,
        `Status` = 'Inactive',
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteStaffSubjectAllocation` //
CREATE PROCEDURE `sp_DeleteStaffSubjectAllocation`(
    IN p_Id INT
)
BEGIN
    DELETE FROM StaffSubjectAllocations WHERE Id = p_Id;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_GenerateStaffEmployeeId` //
CREATE PROCEDURE `sp_GenerateStaffEmployeeId`(IN p_StaffType VARCHAR(20))
BEGIN
                    DECLARE v_Prefix VARCHAR(10);
                    DECLARE v_MaxId INT DEFAULT 0;
                    DECLARE v_NextSeq INT DEFAULT 1;

                    IF LOWER(TRIM(p_StaffType)) = 'non-teaching' THEN
                        SET v_Prefix = 'PJCNTCH';
                    ELSE
                        SET v_Prefix = 'PJCTCH';
                    END IF;

                    SELECT IFNULL(MAX(CAST(SUBSTRING(EmployeeId, LENGTH(v_Prefix) + 1) AS UNSIGNED)), 0)
                    INTO v_MaxId
                    FROM Staff
                    WHERE EmployeeId LIKE CONCAT(v_Prefix, '%')
                      AND LENGTH(EmployeeId) > LENGTH(v_Prefix);

                    SET v_NextSeq = v_MaxId + 1;
                    SELECT CONCAT(v_Prefix, LPAD(v_NextSeq, 4, '0')) AS NextEmployeeId;
                END //

DROP PROCEDURE IF EXISTS `sp_GetAllStaff` //
CREATE PROCEDURE `sp_GetAllStaff`(
    IN p_StaffType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_DesignationId INT,
    IN p_Status VARCHAR(20),
    IN p_SearchTerm VARCHAR(100),
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Limit INT;
    DECLARE v_Offset INT;

    SET v_Limit = COALESCE(p_PageSize, 10);
    SET v_Offset = (COALESCE(p_Page, 1) - 1) * v_Limit;

    -- Main result set
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        CONCAT(s.FirstName, ' ', s.LastName) AS FullName,
        s.Gender,
        s.DateOfBirth,
        s.Aadhaar,
        s.Mobile,
        s.Email,
        s.BloodGroup,
        s.Qualification,
        s.DesignationId,
        COALESCE(d.Name, s.Designation) AS Designation,
        s.StaffType,
        s.DepartmentId,
        COALESCE(dep.DepartmentName, '') AS Department,
        s.JoiningDate,
        s.Experience,
        s.Status,
        s.PhotoPath,
        s.CreatedAt,
        s.UpdatedAt
    FROM Staffs s
    LEFT JOIN Designations d ON d.Id = s.DesignationId
    LEFT JOIN Departments dep ON dep.DepartmentId = s.DepartmentId
    WHERE s.IsDeleted = 0
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR s.StaffType = p_StaffType)
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_DesignationId IS NULL OR p_DesignationId = 0 OR s.DesignationId = p_DesignationId)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR s.Status = p_Status)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
           s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Mobile LIKE CONCAT('%', p_SearchTerm, '%')
      ))
    ORDER BY s.Id DESC
    LIMIT v_Offset, v_Limit;

    -- Total count
    SELECT COUNT(1) AS TotalCount
    FROM Staffs s
    WHERE s.IsDeleted = 0
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR s.StaffType = p_StaffType)
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_DesignationId IS NULL OR p_DesignationId = 0 OR s.DesignationId = p_DesignationId)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR s.Status = p_Status)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
           s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Mobile LIKE CONCAT('%', p_SearchTerm, '%')
      ));
END //

DROP PROCEDURE IF EXISTS `sp_GetFacultyById` //
CREATE PROCEDURE `sp_GetFacultyById`(IN p_Id INT)
BEGIN
    CALL sp_GetStaffById(p_Id);
END //

DROP PROCEDURE IF EXISTS `sp_GetFacultyDropdown` //
CREATE PROCEDURE `sp_GetFacultyDropdown`(IN p_FacultyType VARCHAR(50))
BEGIN
    CALL sp_GetStaffDropdown(p_FacultyType);
END //

DROP PROCEDURE IF EXISTS `sp_GetPagedStaff` //
CREATE PROCEDURE `sp_GetPagedStaff`(
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

    -- Normalize Staff Type ("Teaching", "Non-Teaching", "All")
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

END //

DROP PROCEDURE IF EXISTS `sp_GetStaffAttendanceBreakdown` //
CREATE PROCEDURE `sp_GetStaffAttendanceBreakdown`(
    IN p_BoardId INT,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    CALL sp_GetDashboardStaffAttendanceToday(p_BoardId, p_StaffType);
END //

DROP PROCEDURE IF EXISTS `sp_GetStaffByEmployeeId` //
CREATE PROCEDURE `sp_GetStaffByEmployeeId`(IN p_EmployeeId VARCHAR(50))
BEGIN
                    SELECT 
                        s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Gender, s.DateOfBirth,
                        s.Aadhaar, s.Mobile, s.Email, s.BloodGroup, s.Qualification, s.Designation,
                        s.DesignationId, s.StaffType, s.DepartmentId,
                        d.DepartmentName AS Department,
                        s.JoiningDate, s.Experience, s.Status, s.PhotoPath, s.CreatedAt, s.UpdatedAt, s.IsDeleted
                    FROM Staff s
                    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
                    WHERE s.EmployeeId = p_EmployeeId AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL);
                END //

DROP PROCEDURE IF EXISTS `sp_GetStaffById` //
CREATE PROCEDURE `sp_GetStaffById`(IN p_Id INT)
BEGIN
                    SELECT 
                        s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Gender, s.DateOfBirth,
                        s.Aadhaar, s.Mobile, s.Email, s.BloodGroup, s.Qualification, s.Designation,
                        s.DesignationId, s.StaffType, s.DepartmentId,
                        d.DepartmentName AS Department,
                        s.JoiningDate, s.Experience, s.Status, s.PhotoPath, s.CreatedAt, s.UpdatedAt, s.IsDeleted
                    FROM Staff s
                    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
                    WHERE s.Id = p_Id AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL);

                    SELECT 
                        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
                        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType
                    FROM StaffSubjectAllocations a
                    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
                    WHERE a.StaffId = p_Id;
                END //

DROP PROCEDURE IF EXISTS `sp_GetStaffDropdown` //
CREATE PROCEDURE `sp_GetStaffDropdown`(IN p_StaffType VARCHAR(20))
BEGIN
                    SELECT 
                        Id,
                        EmployeeId,
                        CONCAT(FirstName, ' ', LastName) AS FullName,
                        Designation,
                        DesignationId,
                        StaffType
                    FROM Staff
                    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
                      AND Status = 'Active'
                      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR StaffType = p_StaffType)
                    ORDER BY FirstName ASC;
                END //

DROP PROCEDURE IF EXISTS `sp_GetStaffDropdowns` //
CREATE PROCEDURE `sp_GetStaffDropdowns`(
    IN p_StaffType VARCHAR(50)
)
BEGIN
    -- 1. Departments Filtered by StaffType
    SELECT 
        d.DepartmentId AS `Value`,
        d.DepartmentName AS `Text`,
        d.DepartmentCode AS `Code`,
        COALESCE(d.StaffType, 'Both') AS `StaffType`
    FROM `Departments` d
    WHERE d.IsActive = 1
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
      )
    ORDER BY d.DepartmentName ASC;

    -- 2. Designations Filtered by StaffType
    SELECT 
        des.Id AS `Value`,
        des.Name AS `Text`,
        UPPER(des.Name) AS `Code`,
        COALESCE(des.StaffType, 'Both') AS `StaffType`,
        des.DepartmentId
    FROM `Designations` des
    WHERE des.IsActive = 1
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
      )
    ORDER BY des.Name ASC;

    -- 3. Boards List
    SELECT 
        b.BoardId AS `Value`,
        b.BoardName AS `Text`,
        b.BoardCode AS `Code`
    FROM `Boards` b
    WHERE b.IsActive = 1
    ORDER BY b.BoardName ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetStaffLookups` //
CREATE PROCEDURE `sp_GetStaffLookups`()
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
END //

DROP PROCEDURE IF EXISTS `sp_RestoreStaff` //
CREATE PROCEDURE `sp_RestoreStaff`(
    IN p_Id INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Staffs WHERE Id = p_Id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff member not found.';
    END IF;

    UPDATE Staffs
    SET IsDeleted = 0, IsActive = 1, Status = 'Active', UpdatedAt = NOW()
    WHERE Id = p_Id;

    SELECT ROW_COUNT() AS RowsAffected;
END //

DROP PROCEDURE IF EXISTS `sp_SoftDeleteStaff` //
CREATE PROCEDURE `sp_SoftDeleteStaff`(IN p_Id INT)
BEGIN
                    UPDATE Staff
                    SET IsDeleted = 1,
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE Id = p_Id;
                END //

DROP PROCEDURE IF EXISTS `sp_UpdateFaculty` //
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
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20)
)
BEGIN
    CALL sp_UpdateStaff(p_Id, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, p_DesignationId, p_FacultyType, p_DepartmentId, p_JoiningDate, p_Experience, p_Status);
END //

DROP PROCEDURE IF EXISTS `sp_UpdateFacultyPhotoPath` //
CREATE PROCEDURE `sp_UpdateFacultyPhotoPath`(
    IN p_Id INT,
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    UPDATE Faculties SET PhotoPath = p_PhotoPath, UpdatedAt = NOW() WHERE Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateStaff` //
CREATE PROCEDURE `sp_UpdateStaff`(
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
                    IN p_StaffType VARCHAR(20),
                    IN p_DepartmentId INT,
                    IN p_JoiningDate DATETIME(6),
                    IN p_Experience DECIMAL(5,2),
                    IN p_Status VARCHAR(20),
                    IN p_PhotoPath VARCHAR(500)
                )
BEGIN
                    UPDATE Staff
                    SET FirstName = TRIM(p_FirstName),
                        LastName = TRIM(p_LastName),
                        Gender = p_Gender,
                        DateOfBirth = p_DateOfBirth,
                        Aadhaar = p_Aadhaar,
                        Mobile = TRIM(p_Mobile),
                        Email = TRIM(p_Email),
                        BloodGroup = p_BloodGroup,
                        Qualification = TRIM(p_Qualification),
                        Designation = TRIM(p_Designation),
                        DesignationId = p_DesignationId,
                        StaffType = IFNULL(p_StaffType, 'Teaching'),
                        DepartmentId = p_DepartmentId,
                        JoiningDate = p_JoiningDate,
                        Experience = IFNULL(p_Experience, 0.00),
                        Status = IFNULL(p_Status, 'Active'),
                        PhotoPath = IFNULL(p_PhotoPath, PhotoPath),
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE Id = p_Id;
                END //

DROP PROCEDURE IF EXISTS `sp_UpdateStaffPhotoPath` //
CREATE PROCEDURE `sp_UpdateStaffPhotoPath`(IN p_Id INT, IN p_PhotoPath VARCHAR(500))
BEGIN
                    UPDATE Staff SET PhotoPath = p_PhotoPath, UpdatedAt = UTC_TIMESTAMP() WHERE Id = p_Id;
                END //

DROP PROCEDURE IF EXISTS `sp_UpdateStaffProfileStatus` //
CREATE PROCEDURE `sp_UpdateStaffProfileStatus`(
    IN p_StaffId INT,
    IN p_ProfileStatus VARCHAR(50),
    IN p_CompletionPercentage INT,
    IN p_CorrectionNotes VARCHAR(1000)
)
BEGIN
    UPDATE `Staff` 
    SET 
        `ProfileStatus` = p_ProfileStatus,
        `ProfileCompletionPercentage` = p_CompletionPercentage,
        `CorrectionNotes` = IF(p_CorrectionNotes IS NOT NULL, p_CorrectionNotes, `CorrectionNotes`),
        `CorrectionRequestedAt` = IF(p_ProfileStatus = 'NeedsCorrection', NOW(), `CorrectionRequestedAt`),
        `SubmittedAt` = IF(p_ProfileStatus = 'Submitted', NOW(), `SubmittedAt`),
        `ApprovedAt` = IF(p_ProfileStatus IN ('Completed', 'Approved'), NOW(), `ApprovedAt`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_StaffId AND `IsDeleted` = 0;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateStaffSubjectAllocation` //
CREATE PROCEDURE `sp_UpdateStaffSubjectAllocation`(
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
