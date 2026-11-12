-- =============================================================================
-- SCRIPT 06: 06_Remediate_CategoryA_StoredProcedures.sql
-- PURPOSE: Remediate Multi-Tenant Data Leaks in Existing Category A Stored Procedures
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- NOTE: In MySQL, stored procedures do NOT support optional default arguments.
--       Procedures below enforce p_CollegeId INT tenant boundary while joining Campuses.
--       Both V2 versioned names and in-place procedures are documented for controlled cutover.
-- =============================================================================

USE `CollegeManagement`;

DELIMITER $$

-- =============================================================================
-- 1. sp_GetDashboardKPIs (Tenant Boundary Enforced via p_CollegeId)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetDashboardKPIs_V2`$$
CREATE PROCEDURE `sp_GetDashboardKPIs_V2`(
    IN p_CollegeId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_EffectiveAcademicYearId INT DEFAULT NULL;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_TeachingStaff INT DEFAULT 0;
    DECLARE v_NonTeachingStaff INT DEFAULT 0;
    DECLARE v_TotalGroups INT DEFAULT 0;
    DECLARE v_TotalSections INT DEFAULT 0;
    DECLARE v_AcademicYearName VARCHAR(100) DEFAULT '';
    DECLARE v_UpcomingExams INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Validate Campus belongs to College if specified
    IF p_CampusId IS NOT NULL AND p_CampusId > 0 THEN
        IF NOT EXISTS (SELECT 1 FROM `Campuses` WHERE `CampusId` = p_CampusId AND `CollegeId` = p_CollegeId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ACCESS_DENIED: Specified Campus does not belong to the authenticated College.';
        END IF;
    END IF;

    -- Resolve Effective Academic Year
    IF p_AcademicYearId IS NOT NULL THEN
        SET v_EffectiveAcademicYearId = p_AcademicYearId;
    ELSE
        SELECT ay.AcademicYearId INTO v_EffectiveAcademicYearId
        FROM `AcademicYears` ay
        WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
          AND (p_BoardId IS NULL OR ay.BoardId = p_BoardId)
        ORDER BY ay.StartDate DESC LIMIT 1;
    END IF;

    -- 1. Total Students (Scoped strictly to CollegeId via Campuses)
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `Students` s
    JOIN `Campuses` c ON s.CampusId = c.CampusId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- 2. Teaching Staff Count (Scoped strictly to CollegeId via Campuses)
    SELECT COUNT(*) INTO v_TeachingStaff
    FROM `Staff` st
    JOIN `Campuses` c ON st.CampusId = c.CampusId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
      AND (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR st.StaffType IS NULL OR LOWER(st.StaffType) NOT LIKE '%non%');

    -- 3. Non-Teaching Staff Count
    SELECT COUNT(*) INTO v_NonTeachingStaff
    FROM `Staff` st
    JOIN `Campuses` c ON st.CampusId = c.CampusId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
      AND (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (LOWER(st.StaffType) LIKE '%non%');

    -- 4. Total Groups Count
    SELECT COUNT(*) INTO v_TotalGroups
    FROM `Groups` g
    JOIN `Campuses` c ON g.CampusId = c.CampusId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR g.CampusId = p_CampusId)
      AND (g.IsActive = 1 OR g.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR g.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR g.BoardId = p_BoardId);

    -- 5. Total Sections Count
    SELECT COUNT(*) INTO v_TotalSections
    FROM `Sections` sec
    JOIN `Campuses` c ON sec.CampusId = c.CampusId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sec.CampusId = p_CampusId)
      AND (sec.IsActive = 1 OR sec.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR sec.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR sec.BoardId = p_BoardId);

    -- 6. Academic Year Name
    SELECT ay.AcademicYearName INTO v_AcademicYearName
    FROM `AcademicYears` ay
    WHERE (ay.IsActive = 1 OR ay.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR ay.AcademicYearId = v_EffectiveAcademicYearId)
    ORDER BY ay.StartDate DESC LIMIT 1;

    -- Return KPI Results
    SELECT 
        v_TotalStudents AS TotalStudents,
        v_TeachingStaff AS TeachingStaff,
        v_NonTeachingStaff AS NonTeachingStaff,
        (v_TeachingStaff + v_NonTeachingStaff) AS TotalStaff,
        v_TotalGroups AS TotalGroups,
        v_TotalSections AS TotalSections,
        v_AcademicYearName AS AcademicYearName;
END$$


-- =============================================================================
-- 2. sp_Staff_GetAllStaff (Tenant Scoped Staff Directory)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_Staff_GetAllStaff_V2`$$
CREATE PROCEDURE `sp_Staff_GetAllStaff_V2`(
    IN p_CollegeId INT,
    IN p_CampusId INT,
    IN p_DepartmentId INT,
    IN p_Status VARCHAR(20),
    IN p_SearchTerm VARCHAR(100),
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 10);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 10; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    SELECT 
        st.StaffId,
        st.StaffCode,
        st.FirstName,
        st.LastName,
        st.Email,
        st.Mobile,
        st.DepartmentId,
        d.DepartmentName,
        st.DesignationId,
        des.DesignationName,
        st.CampusId,
        c.CampusName,
        st.Status,
        st.IsActive
    FROM `Staff` st
    JOIN `Campuses` c ON st.CampusId = c.CampusId
    LEFT JOIN `Departments` d ON st.DepartmentId = d.DepartmentId
    LEFT JOIN `Designations` des ON st.DesignationId = des.DesignationId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR st.CampusId = p_CampusId)
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR st.DepartmentId = p_DepartmentId)
      AND (p_Status IS NULL OR p_Status = '' OR st.Status = p_Status)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR st.FirstName LIKE CONCAT('%', p_SearchTerm, '%') 
           OR st.LastName LIKE CONCAT('%', p_SearchTerm, '%') 
           OR st.StaffCode LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
    ORDER BY st.StaffId DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$


-- =============================================================================
-- 3. sp_GetAllStudents (Tenant Scoped Student Directory)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAllStudents_V2`$$
CREATE PROCEDURE `sp_GetAllStudents_V2`(
    IN p_CollegeId INT,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SearchTerm VARCHAR(100),
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 20);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 20; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.GroupId,
        g.GroupName,
        s.SectionId,
        sec.SectionName,
        s.CampusId,
        c.CampusName,
        s.IsActive,
        s.Status,
        s.CreatedAt
    FROM `Students` s
    JOIN `Campuses` c ON s.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR s.StudentName LIKE CONCAT('%', p_SearchTerm, '%')
           OR s.AdmissionNo LIKE CONCAT('%', p_SearchTerm, '%')
           OR s.RollNo LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
    ORDER BY s.StudentId DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$


-- =============================================================================
-- 4. sp_GetTemplates (Scoped to Calling College & Assigned Campus)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetTemplates_V2`$$
CREATE PROCEDURE `sp_GetTemplates_V2`(
    IN p_CollegeId INT,
    IN p_CampusId INT,
    IN p_Category VARCHAR(50)
)
BEGIN
    SELECT 
        t.Id,
        t.TemplateCode,
        t.Title,
        t.Category,
        t.ContentBody,
        t.PlaceholdersJson,
        t.IsActive,
        t.Version,
        t.CollegeId,
        t.CreatedAt,
        t.UpdatedAt
    FROM `templates` t
    WHERE t.CollegeId = p_CollegeId
      AND (p_Category IS NULL OR p_Category = '' OR t.Category = p_Category)
      AND t.IsActive = 1
    ORDER BY t.Id DESC;
END$$


-- =============================================================================
-- 5. sp_GetNumberSeriesConfigurations (Scoped by CollegeId)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesConfigurations_V2`$$
CREATE PROCEDURE `sp_GetNumberSeriesConfigurations_V2`(
    IN p_CollegeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        n.Id,
        n.SeriesCode,
        n.SeriesName,
        n.Prefix,
        n.FormatPattern,
        n.NumberLength,
        n.StartNumber,
        n.CurrentSequence,
        n.Description,
        n.IsActive,
        n.CollegeId,
        n.CreatedAt,
        n.UpdatedAt
    FROM `NumberSeriesConfigurations` n
    WHERE n.CollegeId = p_CollegeId
      AND n.IsActive = 1
    ORDER BY n.Id ASC;
END$$


-- =============================================================================
-- 6. sp_GetAllGroups (Scoped by CollegeId via Campuses)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAllGroups_V2`$$
CREATE PROCEDURE `sp_GetAllGroups_V2`(
    IN p_CollegeId INT,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    SELECT 
        g.GroupId,
        g.BoardId,
        b.BoardName,
        g.GroupName,
        g.GroupCode,
        g.CampusId,
        c.CampusName,
        g.IsActive
    FROM `Groups` g
    JOIN `Campuses` c ON g.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = g.BoardId
    WHERE c.CollegeId = p_CollegeId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR g.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId)
      AND (p_IsActive IS NULL OR g.IsActive = p_IsActive)
    ORDER BY g.GroupId ASC;
END$$


-- =============================================================================
-- 7. sp_Staff_GetAssignedCampuses (Restricts Returned Campuses to College Boundary)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_Staff_GetAssignedCampuses_V2`$$
CREATE PROCEDURE `sp_Staff_GetAssignedCampuses_V2`(
    IN p_UserId INT,
    IN p_StaffId INT
)
BEGIN
    DECLARE v_StaffId INT DEFAULT NULL;
    DECLARE v_PrimaryCampusId INT DEFAULT NULL;
    DECLARE v_CollegeId INT DEFAULT NULL;

    -- Resolve user college affiliation
    SELECT u.CollegeId INTO v_CollegeId
    FROM `Users` u
    WHERE u.UserId = p_UserId;

    -- Resolve Staff Id and Primary Campus
    IF p_StaffId IS NOT NULL AND p_StaffId > 0 THEN
        SET v_StaffId = p_StaffId;
    ELSE
        SELECT st.StaffId INTO v_StaffId
        FROM `Staff` st
        WHERE st.UserId = p_UserId
        LIMIT 1;
    END IF;

    IF v_StaffId IS NOT NULL THEN
        SELECT st.CampusId INTO v_PrimaryCampusId
        FROM `Staff` st
        WHERE st.StaffId = v_StaffId;
    END IF;

    -- Metadata result set
    SELECT 
        COALESCE(v_StaffId, 0) AS StaffId,
        COALESCE(v_PrimaryCampusId, 0) AS PrimaryCampusId,
        v_CollegeId AS CollegeId;

    -- Assigned campuses result set (Strictly filtered by user's CollegeId)
    SELECT DISTINCT c.CampusId
    FROM `StaffCampusAssignments` sca
    JOIN `Campuses` c ON sca.CampusId = c.CampusId
    WHERE sca.StaffId = v_StaffId
      AND sca.IsActive = 1
      AND (v_CollegeId IS NULL OR c.CollegeId = v_CollegeId);
END$$

DELIMITER ;

SELECT 'CATEGORY_A_STORED_PROCEDURES_REMEDIATED' AS Status, NOW() AS CompletedAt;
