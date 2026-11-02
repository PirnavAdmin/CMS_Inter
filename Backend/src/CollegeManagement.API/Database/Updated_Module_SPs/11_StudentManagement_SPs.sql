-- =============================================================================
-- SCRIPT: 11_StudentManagement_SPs.sql
-- PURPOSE: Canonical MySQL Stored Procedures for Student Management Module
-- ARCHITECTURE: 100% Stored Procedures, 0% Inline SQL, Dapper CommandType.StoredProcedure
-- DATABASE: Shared CollegeManagement MySQL Database
-- SAFETY: Idempotent (DROP PROCEDURE IF EXISTS -> CREATE PROCEDURE).
--         Only touches Student & Academic entities. Does NOT alter Staff tables.
-- =============================================================================

DELIMITER //

-- =============================================================================
-- 1. GET STUDENTS PAGED (CANONICAL SERVER-SIDE PAGINATION & FILTERING)
-- Result Set 1: TotalCount (INT)
-- Result Set 2: Paged Student Rows (StudentListItemDto)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentsPaged`//
CREATE PROCEDURE `sp_GetStudentsPaged`
(
    IN p_Search VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_Status VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_PageSize INT;
    DECLARE v_Search VARCHAR(110);

    SET v_PageSize = IFNULL(p_PageSize, 10);
    IF v_PageSize < 1 THEN SET v_PageSize = 10; END IF;
    IF v_PageSize > 500 THEN SET v_PageSize = 500; END IF;

    IF p_PageNumber IS NULL OR p_PageNumber < 1 THEN
        SET v_Offset = 0;
    ELSE
        SET v_Offset = (p_PageNumber - 1) * v_PageSize;
    END IF;

    SET v_Search = NULL;
    IF p_Search IS NOT NULL AND TRIM(p_Search) != '' THEN
        SET v_Search = CONCAT('%', TRIM(p_Search), '%');
    END IF;

    -- Result Set 1: Total Count
    SELECT COUNT(1) AS TotalCount
    FROM `Students` s
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId <= 0 OR s.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR s.SectionId = p_SectionId)
      AND (p_Status IS NULL OR TRIM(p_Status) = '' OR s.Status = TRIM(p_Status))
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (v_Search IS NULL OR (
          s.StudentName LIKE v_Search OR
          s.AdmissionNo LIKE v_Search OR
          s.RollNo LIKE v_Search OR
          s.MobileNumber LIKE v_Search OR
          s.Email LIKE v_Search
      ));

    -- Result Set 2: Paged Student Items
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId <= 0 OR s.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR s.SectionId = p_SectionId)
      AND (p_Status IS NULL OR TRIM(p_Status) = '' OR s.Status = TRIM(p_Status))
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (v_Search IS NULL OR (
          s.StudentName LIKE v_Search OR
          s.AdmissionNo LIKE v_Search OR
          s.RollNo LIKE v_Search OR
          s.MobileNumber LIKE v_Search OR
          s.Email LIKE v_Search
      ))
    ORDER BY s.StudentName ASC, s.StudentId DESC
    LIMIT v_PageSize OFFSET v_Offset;
END //

-- =============================================================================
-- 2. GET ALL STUDENTS (BACKWARD COMPATIBILITY & EXPORT)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAllStudents`//
CREATE PROCEDURE `sp_GetAllStudents`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    ORDER BY s.StudentName ASC, s.StudentId DESC;
END //

-- =============================================================================
-- 3. GET STUDENT BY ID (CANONICAL PROJECTION FOR STUDENTRESPONSE)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentById`//
CREATE PROCEDURE `sp_GetStudentById`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionId,
        s.AdmissionNo,
        s.RollNo,
        s.AdmissionDate,
        s.AdmissionType,
        s.AdmissionQuota,
        s.Medium,
        s.SecondLanguage,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Nationality,
        s.Religion,
        s.Category,
        COALESCE(s.BoardId, 0) AS BoardId,
        b.BoardName,
        COALESCE(s.AcademicYearId, 0) AS AcademicYearId,
        ay.AcademicYearName,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.CampusId,
        c.CampusName,
        s.FeeStructureId,
        s.PaymentPlan,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.PreviousBoard,
        s.PreviousYearOfPassing,
        s.PreviousPercentage,
        s.StudentCategory,
        s.ScholarshipStatus,
        s.ScholarshipAmount,
        s.FatherName,
        s.FatherOccupation,
        s.FatherMobile,
        s.MotherName,
        s.MotherOccupation,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,
        s.ParentGuardianEmail,
        s.AnnualIncome,
        s.BirthCertificate,
        s.TransferCertificate,
        s.StudyCertificate,
        s.AadhaarDocument,
        s.CommunityCertificate,
        s.IncomeCertificate,
        s.CasteCertificate,
        s.TenthCertificate,
        s.MarksMemo,
        COALESCE(s.FeeAmount, 0) AS FeeAmount,
        COALESCE(s.FeePaid, 0) AS FeePaid,
        s.FeeStatus,
        COALESCE(s.AttendancePercentage, 0) AS AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Status,
        s.IsFirstLogin,
        s.LastLogin,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt,
        s.Remarks,
        s.StudentType,
        s.TransportRequired,
        s.BusType,
        s.RouteId,
        s.BusRoute,
        s.PickupPointId,
        s.PickupPoint,
        s.HostelId,
        s.HostelBlock,
        s.RoomId,
        s.HostelRoom,
        s.BedId,
        s.HostelBed,
        s.HallTicketNumber
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 4. CREATE STUDENT (ATOMIC INSERT WITH LOOKUPS AND USER CREATION)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CreateStudent`//
CREATE PROCEDURE `sp_CreateStudent`
(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RollNo VARCHAR(50),
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(100),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_ScholarshipAmount DECIMAL(18,2),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_FeeAmount DECIMAL(10,2),
    IN p_FeePaid DECIMAL(10,2),
    IN p_FeeStatus VARCHAR(30),
    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(20),
    IN p_CGPA DECIMAL(5,2),
    IN p_Rank INT,
    IN p_Remarks VARCHAR(1000),
    IN p_PasswordHash VARCHAR(255),
    IN p_IsFirstLogin TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_StudentType VARCHAR(30),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(50),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StudentId INT;
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(100);
    DECLARE v_HostelBed VARCHAR(100);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);
    DECLARE v_StudentRoleId INT DEFAULT 5;
    DECLARE v_ParentRoleId INT DEFAULT 6;
    DECLARE v_ExistingParentUserId INT;

    SET v_HostelBlock = p_HostelBlock;
    SET v_HostelRoom = p_HostelRoom;
    SET v_HostelBed = p_HostelBed;
    SET v_BusRoute = p_BusRoute;
    SET v_PickupPoint = p_PickupPoint;

    -- Lookup residential names if missing but IDs provided
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    -- Lookup transport names if missing but IDs provided
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    -- Insert student record
    INSERT INTO `Students`
    (
        AdmissionNo, RollNo, AdmissionDate, AdmissionType, AdmissionQuota,
        Medium, SecondLanguage, StudentName, Photo, Gender,
        DateOfBirth, BloodGroup, Email, MobileNumber, AadhaarNumber,
        Nationality, Religion, Category, Address, City,
        District, State, Pincode, BoardId, AcademicYearId,
        AcademicLevelId, GroupId, ProgramId, SectionId,
        PreviousSchool, PreviousHallTicketNumber, PreviousBoard,
        PreviousYearOfPassing, PreviousPercentage, StudentCategory,
        ScholarshipStatus, ScholarshipAmount, FatherName, FatherOccupation,
        FatherMobile, MotherName, MotherOccupation, MotherMobile,
        GuardianName, GuardianMobile, ParentGuardianEmail, AnnualIncome,
        FeeAmount, FeePaid, FeeStatus, AttendancePercentage,
        PerformanceGrade, CGPA, `Rank`, Remarks, PasswordHash,
        IsFirstLogin, IsActive, Status, StudentType,
        TransportRequired, BusType, RouteId, BusRoute,
        PickupPointId, PickupPoint, HostelId, HostelBlock,
        RoomId, HostelRoom, BedId, HostelBed, HallTicketNumber,
        CampusId, CreatedAt, UpdatedAt
    )
    VALUES
    (
        p_AdmissionNo, p_RollNo, COALESCE(p_AdmissionDate, NOW()), p_AdmissionType, p_AdmissionQuota,
        p_Medium, p_SecondLanguage, p_StudentName, p_Photo, p_Gender,
        p_DateOfBirth, p_BloodGroup, p_Email, p_MobileNumber, p_AadhaarNumber,
        p_Nationality, p_Religion, p_Category, p_Address, p_City,
        p_District, p_State, p_Pincode, p_BoardId, p_AcademicYearId,
        p_AcademicLevelId, p_GroupId, p_ProgramId, p_SectionId,
        p_PreviousSchool, p_PreviousHallTicketNumber, p_PreviousBoard,
        p_PreviousYearOfPassing, p_PreviousPercentage, p_StudentCategory,
        p_ScholarshipStatus, p_ScholarshipAmount, p_FatherName, p_FatherOccupation,
        p_FatherMobile, p_MotherName, p_MotherOccupation, p_MotherMobile,
        p_GuardianName, p_GuardianMobile, p_ParentGuardianEmail, p_AnnualIncome,
        COALESCE(p_FeeAmount, 0), COALESCE(p_FeePaid, 0), COALESCE(p_FeeStatus, 'Pending'),
        COALESCE(p_AttendancePercentage, 0), p_PerformanceGrade, p_CGPA, p_Rank,
        p_Remarks, COALESCE(p_PasswordHash, ''), COALESCE(p_IsFirstLogin, 1),
        COALESCE(p_IsActive, 1), 'Active', p_StudentType,
        p_TransportRequired, p_BusType, p_RouteId, v_BusRoute,
        p_PickupPointId, v_PickupPoint, p_HostelId, v_HostelBlock,
        p_RoomId, v_HostelRoom, p_BedId, v_HostelBed, p_HallTicketNumber,
        COALESCE(p_CampusId, 1), NOW(), NOW()
    );

    SET v_StudentId = LAST_INSERT_ID();

    -- Resolve roles from Roles table if available
    SELECT RoleId INTO v_StudentRoleId FROM `Roles` WHERE RoleName = 'Student' LIMIT 1;
    SELECT RoleId INTO v_ParentRoleId FROM `Roles` WHERE RoleName = 'Parent' LIMIT 1;

    -- Provision Student User login account if student email exists
    IF p_Email IS NOT NULL AND TRIM(p_Email) != '' THEN
        INSERT INTO `Users`
        (
            FullName, Email, PasswordHash, PhoneNumber, RoleId,
            StudentId, StaffId, AdminId, IsFirstLogin, IsActive,
            CreatedAt, UpdatedAt
        )
        VALUES
        (
            p_StudentName, TRIM(p_Email), COALESCE(p_PasswordHash, ''), COALESCE(p_MobileNumber, ''),
            COALESCE(v_StudentRoleId, 5), v_StudentId, NULL, NULL,
            COALESCE(p_IsFirstLogin, 1), 1, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE 
            StudentId = v_StudentId,
            FullName = VALUES(FullName),
            PhoneNumber = VALUES(PhoneNumber),
            UpdatedAt = NOW();
    END IF;

    -- Provision Parent account & mapping if Parent Email exists
    IF p_ParentGuardianEmail IS NOT NULL AND TRIM(p_ParentGuardianEmail) != '' THEN
        SELECT UserId INTO v_ExistingParentUserId FROM `Users` WHERE LOWER(Email) = LOWER(TRIM(p_ParentGuardianEmail)) LIMIT 1;

        IF v_ExistingParentUserId IS NULL THEN
            INSERT INTO `Users`
            (
                FullName, Email, PasswordHash, PhoneNumber, RoleId,
                StudentId, StaffId, AdminId, IsFirstLogin, IsActive,
                CreatedAt, UpdatedAt
            )
            VALUES
            (
                COALESCE(NULLIF(TRIM(p_FatherName), ''), NULLIF(TRIM(p_MotherName), ''), NULLIF(TRIM(p_GuardianName), ''), 'Parent / Guardian'),
                LOWER(TRIM(p_ParentGuardianEmail)),
                COALESCE(p_PasswordHash, ''),
                COALESCE(NULLIF(TRIM(p_FatherMobile), ''), NULLIF(TRIM(p_MotherMobile), ''), NULLIF(TRIM(p_GuardianMobile), ''), ''),
                COALESCE(v_ParentRoleId, 6),
                NULL, NULL, NULL, 1, 1, NOW(), NOW()
            );
            SET v_ExistingParentUserId = LAST_INSERT_ID();
        END IF;

        IF v_ExistingParentUserId IS NOT NULL THEN
            INSERT INTO `ParentStudentMappings` (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
            VALUES (v_ExistingParentUserId, v_StudentId, 'Parent', 1, NOW())
            ON DUPLICATE KEY UPDATE ParentUserId = VALUES(ParentUserId);
        END IF;
    END IF;

    -- Return full created projection
    CALL sp_GetStudentById(v_StudentId);
END //

-- =============================================================================
-- 5. UPDATE STUDENT (ATOMIC UPDATE WITH USER, ADMISSION & PARENT SYNC)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudent`//
CREATE PROCEDURE `sp_UpdateStudent`
(
    IN p_StudentId INT,
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_RollNo VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(100),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150),
    IN p_StudentType VARCHAR(30),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(50),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(100);
    DECLARE v_HostelBed VARCHAR(100);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);
    DECLARE v_TargetAdmissionId INT;
    DECLARE v_ParentUserId INT;
    DECLARE v_ParentRoleId INT DEFAULT 6;

    SET v_HostelBlock = p_HostelBlock;
    SET v_HostelRoom = p_HostelRoom;
    SET v_HostelBed = p_HostelBed;
    SET v_BusRoute = p_BusRoute;
    SET v_PickupPoint = p_PickupPoint;

    -- Lookup residential names if missing
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    -- Lookup transport names if missing
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    -- Update Students table
    UPDATE `Students`
    SET 
        AdmissionNo = COALESCE(p_AdmissionNo, AdmissionNo),
        RollNo = COALESCE(p_RollNo, RollNo),
        AdmissionDate = COALESCE(p_AdmissionDate, AdmissionDate),
        AdmissionType = COALESCE(p_AdmissionType, AdmissionType),
        AdmissionQuota = COALESCE(p_AdmissionQuota, AdmissionQuota),
        Medium = COALESCE(p_Medium, Medium),
        SecondLanguage = COALESCE(p_SecondLanguage, SecondLanguage),
        StudentName = COALESCE(p_StudentName, StudentName),
        Photo = COALESCE(p_Photo, Photo),
        Gender = COALESCE(p_Gender, Gender),
        DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        Email = COALESCE(p_Email, Email),
        MobileNumber = COALESCE(p_MobileNumber, MobileNumber),
        AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
        Nationality = COALESCE(p_Nationality, Nationality),
        Religion = COALESCE(p_Religion, Religion),
        Category = COALESCE(p_Category, Category),
        Address = COALESCE(p_Address, Address),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        BoardId = COALESCE(p_BoardId, BoardId),
        AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
        AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
        GroupId = COALESCE(p_GroupId, GroupId),
        ProgramId = COALESCE(p_ProgramId, ProgramId),
        SectionId = COALESCE(p_SectionId, SectionId),
        PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
        PreviousHallTicketNumber = COALESCE(p_PreviousHallTicketNumber, PreviousHallTicketNumber),
        PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
        PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
        PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
        FatherName = COALESCE(p_FatherName, FatherName),
        FatherOccupation = COALESCE(p_FatherOccupation, FatherOccupation),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherName = COALESCE(p_MotherName, MotherName),
        MotherOccupation = COALESCE(p_MotherOccupation, MotherOccupation),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianName = COALESCE(p_GuardianName, GuardianName),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        StudentType = COALESCE(p_StudentType, StudentType),
        TransportRequired = COALESCE(p_TransportRequired, TransportRequired),
        BusType = COALESCE(p_BusType, BusType),
        RouteId = COALESCE(p_RouteId, RouteId),
        BusRoute = COALESCE(v_BusRoute, BusRoute),
        PickupPointId = COALESCE(p_PickupPointId, PickupPointId),
        PickupPoint = COALESCE(v_PickupPoint, PickupPoint),
        HostelId = COALESCE(p_HostelId, HostelId),
        HostelBlock = COALESCE(v_HostelBlock, HostelBlock),
        RoomId = COALESCE(p_RoomId, RoomId),
        HostelRoom = COALESCE(v_HostelRoom, HostelRoom),
        BedId = COALESCE(p_BedId, BedId),
        HostelBed = COALESCE(v_HostelBed, HostelBed),
        HallTicketNumber = COALESCE(p_HallTicketNumber, HallTicketNumber),
        CampusId = COALESCE(p_CampusId, CampusId),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync Users record for student
    UPDATE `Users`
    SET 
        FullName = COALESCE(p_StudentName, FullName),
        Email = COALESCE(p_Email, Email),
        PhoneNumber = COALESCE(p_MobileNumber, PhoneNumber),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync linked StudentAdmissions record if exists
    SET v_TargetAdmissionId = p_AdmissionId;
    IF v_TargetAdmissionId IS NULL OR v_TargetAdmissionId <= 0 THEN
        SELECT AdmissionId INTO v_TargetAdmissionId FROM `Students` WHERE StudentId = p_StudentId LIMIT 1;
    END IF;

    IF v_TargetAdmissionId IS NOT NULL AND v_TargetAdmissionId > 0 THEN
        UPDATE `StudentAdmissions`
        SET 
            StudentPhoto = COALESCE(p_Photo, StudentPhoto),
            Gender = COALESCE(p_Gender, Gender),
            DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
            BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
            StudentEmail = COALESCE(p_Email, StudentEmail),
            StudentMobileNumber = COALESCE(p_MobileNumber, StudentMobileNumber),
            AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
            Nationality = COALESCE(p_Nationality, Nationality),
            Religion = COALESCE(p_Religion, Religion),
            Category = COALESCE(p_Category, Category),
            StreetVillage = COALESCE(p_Address, StreetVillage),
            City = COALESCE(p_City, City),
            District = COALESCE(p_District, District),
            State = COALESCE(p_State, State),
            Pincode = COALESCE(p_Pincode, Pincode),
            BoardId = COALESCE(p_BoardId, BoardId),
            AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
            AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
            GroupId = COALESCE(p_GroupId, GroupId),
            ProgramId = COALESCE(p_ProgramId, ProgramId),
            Medium = COALESCE(p_Medium, Medium),
            SecondLanguage = COALESCE(p_SecondLanguage, SecondLanguage),
            PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
            PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
            PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
            PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
            FatherName = COALESCE(p_FatherName, FatherName),
            FatherOccupation = COALESCE(p_FatherOccupation, FatherOccupation),
            FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
            MotherName = COALESCE(p_MotherName, MotherName),
            MotherOccupation = COALESCE(p_MotherOccupation, MotherOccupation),
            MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
            GuardianName = COALESCE(p_GuardianName, GuardianName),
            GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
            ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
            StudentType = COALESCE(p_StudentType, StudentType),
            TransportRequired = COALESCE(p_TransportRequired, TransportRequired),
            BusType = COALESCE(p_BusType, BusType),
            RouteId = COALESCE(p_RouteId, RouteId),
            BusRoute = COALESCE(v_BusRoute, BusRoute),
            PickupPointId = COALESCE(p_PickupPointId, PickupPointId),
            PickupPoint = COALESCE(v_PickupPoint, PickupPoint),
            HostelId = COALESCE(p_HostelId, HostelId),
            HostelBlock = COALESCE(v_HostelBlock, HostelBlock),
            RoomId = COALESCE(p_RoomId, RoomId),
            HostelRoom = COALESCE(v_HostelRoom, HostelRoom),
            BedId = COALESCE(p_BedId, BedId),
            HostelBed = COALESCE(v_HostelBed, HostelBed),
            HallTicketNumber = COALESCE(p_HallTicketNumber, HallTicketNumber),
            CampusId = COALESCE(p_CampusId, CampusId),
            UpdatedAt = NOW()
        WHERE AdmissionId = v_TargetAdmissionId;
    END IF;

    -- Sync Parent User Mapping if Parent Email provided
    IF p_ParentGuardianEmail IS NOT NULL AND TRIM(p_ParentGuardianEmail) != '' THEN
        SELECT RoleId INTO v_ParentRoleId FROM `Roles` WHERE RoleName = 'Parent' LIMIT 1;
        SELECT UserId INTO v_ParentUserId FROM `Users` WHERE LOWER(Email) = LOWER(TRIM(p_ParentGuardianEmail)) LIMIT 1;

        IF v_ParentUserId IS NULL THEN
            INSERT INTO `Users`
            (
                FullName, Email, PasswordHash, PhoneNumber, RoleId,
                StudentId, StaffId, AdminId, IsFirstLogin, IsActive,
                CreatedAt, UpdatedAt
            )
            VALUES
            (
                COALESCE(NULLIF(TRIM(p_FatherName), ''), NULLIF(TRIM(p_MotherName), ''), NULLIF(TRIM(p_GuardianName), ''), 'Parent / Guardian'),
                LOWER(TRIM(p_ParentGuardianEmail)),
                '',
                COALESCE(NULLIF(TRIM(p_FatherMobile), ''), NULLIF(TRIM(p_MotherMobile), ''), NULLIF(TRIM(p_GuardianMobile), ''), ''),
                COALESCE(v_ParentRoleId, 6),
                NULL, NULL, NULL, 1, 1, NOW(), NOW()
            );
            SET v_ParentUserId = LAST_INSERT_ID();
        END IF;

        IF v_ParentUserId IS NOT NULL THEN
            INSERT INTO `ParentStudentMappings` (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
            VALUES (v_ParentUserId, p_StudentId, 'Parent', 1, NOW())
            ON DUPLICATE KEY UPDATE ParentUserId = VALUES(ParentUserId);
        END IF;
    END IF;

    -- Return full updated projection
    CALL sp_GetStudentById(p_StudentId);
END //

-- =============================================================================
-- 6. DELETE STUDENT (SOFT DELETE & USER DEACTIVATION)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_DeleteStudent`//
CREATE PROCEDURE `sp_DeleteStudent`
(
    IN p_StudentId INT
)
BEGIN
    UPDATE `Students`
    SET IsActive = 0, Status = 'Inactive', UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsActive = 0, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Result;
END //

-- =============================================================================
-- 7. GET STUDENT PROFILE (ADMIN)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentProfile`//
CREATE PROCEDURE `sp_GetStudentProfile`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.FatherName,
        s.FatherMobile,
        s.MotherName,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,
        s.ParentGuardianEmail,
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        sec.SectionName,
        s.Medium,
        s.SecondLanguage,
        s.Status,
        s.StudentType,
        s.TransportRequired,
        s.BusType,
        s.RouteId,
        s.BusRoute,
        s.PickupPointId,
        s.PickupPoint,
        s.HostelId,
        s.HostelBlock,
        s.RoomId,
        s.HostelRoom,
        s.BedId,
        s.HostelBed,
        s.HallTicketNumber
    FROM `Students` s
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 8. UPDATE STUDENT PROFILE (ADMIN)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentProfile`//
CREATE PROCEDURE `sp_UpdateStudentProfile`
(
    IN p_StudentId INT,
    IN p_Photo VARCHAR(500),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150)
)
BEGIN
    UPDATE `Students`
    SET 
        Photo = COALESCE(p_Photo, Photo),
        Email = COALESCE(p_Email, Email),
        MobileNumber = COALESCE(p_MobileNumber, MobileNumber),
        Address = COALESCE(p_Address, Address),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        FatherName = COALESCE(p_FatherName, FatherName),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherName = COALESCE(p_MotherName, MotherName),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianName = COALESCE(p_GuardianName, GuardianName),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync to Users for student
    UPDATE `Users`
    SET 
        Email = COALESCE(p_Email, Email),
        PhoneNumber = COALESCE(p_MobileNumber, PhoneNumber),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Return updated profile
    CALL sp_GetStudentProfile(p_StudentId);
END //

-- =============================================================================
-- 9. GET STUDENT SELF PROFILE (PORTAL)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentSelfProfile`//
CREATE PROCEDURE `sp_GetStudentSelfProfile`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.AadhaarNumber,
        s.Nationality,
        s.Religion,
        s.CampusId,
        c.CampusName,
        s.AdmissionNo,
        s.AdmissionDate,
        s.RollNo,
        COALESCE(s.BoardId, 0) AS BoardId,
        b.BoardName,
        COALESCE(s.AcademicYearId, 0) AS AcademicYearId,
        ay.AcademicYearName,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        s.ProgramId,
        p.ProgramName,
        s.SectionId,
        sec.SectionName,
        s.MobileNumber,
        s.Email,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.FatherName,
        s.FatherMobile,
        s.MotherName,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,
        s.ParentGuardianEmail,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.PreviousBoard,
        s.PreviousYearOfPassing,
        s.PreviousPercentage,
        s.Photo,
        s.BirthCertificate,
        s.TransferCertificate,
        s.StudyCertificate,
        s.AadhaarDocument,
        s.CommunityCertificate,
        s.IncomeCertificate,
        s.CasteCertificate,
        s.TenthCertificate,
        s.MarksMemo,
        s.IsFirstLogin,
        s.Status,
        s.IsActive,
        s.StudentType,
        s.TransportRequired,
        s.BusType,
        s.RouteId,
        s.BusRoute,
        s.PickupPointId,
        s.PickupPoint,
        s.HostelId,
        s.HostelBlock,
        s.RoomId,
        s.HostelRoom,
        s.BedId,
        s.HostelBed,
        s.HallTicketNumber
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 10. UPDATE STUDENT SELF PROFILE (PORTAL)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentSelfProfile`//
CREATE PROCEDURE `sp_UpdateStudentSelfProfile`
(
    IN p_StudentId INT,
    IN p_MobileNumber VARCHAR(20),
    IN p_Email VARCHAR(150),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_BloodGroup VARCHAR(10),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(100),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150)
)
BEGIN
    UPDATE `Students`
    SET 
        MobileNumber = COALESCE(p_MobileNumber, MobileNumber),
        Email = COALESCE(p_Email, Email),
        Address = COALESCE(p_Address, Address),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
        Nationality = COALESCE(p_Nationality, Nationality),
        Religion = COALESCE(p_Religion, Religion),
        PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
        PreviousHallTicketNumber = COALESCE(p_PreviousHallTicketNumber, PreviousHallTicketNumber),
        PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
        PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
        PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Update linked user account
    UPDATE `Users`
    SET 
        Email = COALESCE(p_Email, Email),
        PhoneNumber = COALESCE(p_MobileNumber, PhoneNumber),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 11. CHANGE STUDENT SECTION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ChangeStudentSection`//
CREATE PROCEDURE `sp_ChangeStudentSection`
(
    IN p_StudentId INT,
    IN p_SectionId INT,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET SectionId = p_SectionId,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 12. CHANGE STUDENT GROUP
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ChangeStudentGroup`//
CREATE PROCEDURE `sp_ChangeStudentGroup`
(
    IN p_StudentId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET GroupId = p_GroupId,
        ProgramId = p_ProgramId,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 13. TRANSFER STUDENT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_TransferStudent`//
CREATE PROCEDURE `sp_TransferStudent`
(
    IN p_StudentId INT,
    IN p_TransferReason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET Status = 'Transferred',
        Remarks = CONCAT(COALESCE(Remarks, ''), ' | Reason: ', COALESCE(p_TransferReason, ''), ' | ', COALESCE(p_Remarks, '')),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 14. SUSPEND STUDENT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuspendStudent`//
CREATE PROCEDURE `sp_SuspendStudent`
(
    IN p_StudentId INT,
    IN p_Reason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET Status = 'Suspended',
        IsActive = 0,
        Remarks = CONCAT(COALESCE(Remarks, ''), ' | Suspended: ', COALESCE(p_Reason, ''), ' | ', COALESCE(p_Remarks, '')),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsActive = 0, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 15. ACTIVATE STUDENT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ActivateStudent`//
CREATE PROCEDURE `sp_ActivateStudent`
(
    IN p_StudentId INT
)
BEGIN
    UPDATE `Students`
    SET Status = 'Active',
        IsActive = 1,
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsActive = 1, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 16. RESET STUDENT LOGIN
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ResetStudentLogin`//
CREATE PROCEDURE `sp_ResetStudentLogin`
(
    IN p_StudentId INT
)
BEGIN
    UPDATE `Students`
    SET IsFirstLogin = 1, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsFirstLogin = 1, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 17. GET STUDENT DASHBOARD
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentDashboard`//
CREATE PROCEDURE `sp_GetStudentDashboard`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        sec.SectionName,
        ay.AcademicYearName,
        s.Medium,
        s.SecondLanguage,
        COALESCE(s.AttendancePercentage, 0) AS AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        COALESCE(s.FeeAmount, 0) AS FeeAmount,
        COALESCE(s.FeePaid, 0) AS FeePaid,
        s.FeeStatus,
        s.Status
    FROM `Students` s
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 18. GET PARENT CHILDREN (PARENT PORTAL)
-- =============================================================================
-- 18. GET PARENT CHILDREN (PARENT PORTAL)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetParentChildren`//
CREATE PROCEDURE `sp_GetParentChildren`
(
    IN p_ParentUserId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.RollNo,
        s.AdmissionNo,
        al.LevelName AS ClassName,
        sec.SectionName,
        s.Photo AS PhotoUrl,
        s.Status,
        s.CampusId,
        s.GroupId,
        s.SectionId,
        s.AcademicYearId,
        s.DateOfBirth,
        s.Gender,
        s.FatherName,
        s.MotherName,
        s.ParentGuardianEmail
    FROM `ParentStudentMappings` psm
    INNER JOIN `Students` s ON s.StudentId = psm.StudentId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE psm.ParentUserId = p_ParentUserId;
END //

-- =============================================================================
-- 18b. CHECK PARENT STUDENT MAPPING (AUTHORIZATION)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CheckParentStudentMapping`//
CREATE PROCEDURE `sp_CheckParentStudentMapping`
(
    IN p_ParentUserId INT,
    IN p_StudentId INT
)
BEGIN
    SELECT COUNT(1) 
    FROM `ParentStudentMappings` 
    WHERE `ParentUserId` = p_ParentUserId AND `StudentId` = p_StudentId;
END //

-- =============================================================================
-- 18c. GET PARENT STUDENT MAPPING RECORD
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetParentStudentMapping`//
CREATE PROCEDURE `sp_GetParentStudentMapping`
(
    IN p_ParentUserId INT,
    IN p_StudentId INT
)
BEGIN
    SELECT Id, ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt
    FROM `ParentStudentMappings`
    WHERE `ParentUserId` = p_ParentUserId AND `StudentId` = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 18d. ADD OR UPDATE PARENT STUDENT MAPPING RECORD
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_AddOrUpdateParentStudentMapping`//
CREATE PROCEDURE `sp_AddOrUpdateParentStudentMapping`
(
    IN p_ParentUserId INT,
    IN p_StudentId INT,
    IN p_RelationshipType VARCHAR(50),
    IN p_IsPrimaryContact TINYINT(1)
)
BEGIN
    INSERT INTO `ParentStudentMappings` 
        (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
    VALUES 
        (p_ParentUserId, p_StudentId, COALESCE(NULLIF(TRIM(p_RelationshipType), ''), 'Parent'), COALESCE(p_IsPrimaryContact, 1), CURRENT_TIMESTAMP(6))
    ON DUPLICATE KEY UPDATE 
        RelationshipType = VALUES(RelationshipType), 
        IsPrimaryContact = VALUES(IsPrimaryContact);
END //

-- =============================================================================
-- 18e. GET STUDENTS BY PARENT USER ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentsByParentUserId`//
CREATE PROCEDURE `sp_GetStudentsByParentUserId`
(
    IN p_ParentUserId INT
)
BEGIN
    SELECT psm.Id, psm.ParentUserId, psm.StudentId, psm.RelationshipType, psm.IsPrimaryContact, psm.CreatedAt,
           s.StudentId, s.StudentName, s.AdmissionNo, s.RollNo, s.Photo, s.Gender, s.Status, s.IsActive,
           s.CampusId, s.BoardId, s.AcademicYearId, s.AcademicLevelId, s.GroupId, s.ProgramId, s.SectionId
    FROM `ParentStudentMappings` psm
    INNER JOIN `Students` s ON s.StudentId = psm.StudentId
    WHERE psm.ParentUserId = p_ParentUserId
    ORDER BY psm.CreatedAt ASC;
END //

-- =============================================================================
-- 18f. GET PARENT USER IDS FOR STUDENTS
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetParentUserIdsForStudents`//
CREATE PROCEDURE `sp_GetParentUserIdsForStudents`
(
    IN p_StudentIds TEXT
)
BEGIN
    SELECT DISTINCT psm.ParentUserId
    FROM `ParentStudentMappings` psm
    INNER JOIN `Users` u ON u.UserId = psm.ParentUserId AND u.IsActive = 1
    WHERE FIND_IN_SET(psm.StudentId, p_StudentIds) > 0;
END //

-- =============================================================================
-- 19. SEARCH STUDENTS (FILTERED UNPAGED LIST)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SearchStudents`//
CREATE PROCEDURE `sp_SearchStudents`
(
    IN p_Search VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_IsActive BOOLEAN,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_Search VARCHAR(110);
    SET v_Search = NULL;
    IF p_Search IS NOT NULL AND TRIM(p_Search) != '' THEN
        SET v_Search = CONCAT('%', TRIM(p_Search), '%');
    END IF;

    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR s.SectionId = p_SectionId)
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (v_Search IS NULL OR (
          s.StudentName LIKE v_Search OR
          s.AdmissionNo LIKE v_Search OR
          s.RollNo LIKE v_Search OR
          s.MobileNumber LIKE v_Search OR
          s.Email LIKE v_Search
      ))
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 20. GET STUDENTS BY GROUP ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentsByGroupId`//
CREATE PROCEDURE `sp_GetStudentsByGroupId`
(
    IN p_GroupId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.GroupId = p_GroupId
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 21. GET STUDENTS BY SECTION ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentsBySectionId`//
CREATE PROCEDURE `sp_GetStudentsBySectionId`
(
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.SectionId = p_SectionId
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 22. GET ACTIVE STUDENTS
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetActiveStudents`//
CREATE PROCEDURE `sp_GetActiveStudents`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.IsActive = 1
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 23. CHECK STUDENT EMAIL
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CheckStudentEmail`//
CREATE PROCEDURE `sp_CheckStudentEmail`
(
    IN p_Email VARCHAR(150),
    IN p_ExcludeStudentId INT
)
BEGIN
    SELECT COUNT(1) AS `Count`
    FROM `Students`
    WHERE LOWER(Email) = LOWER(TRIM(p_Email))
      AND (p_ExcludeStudentId IS NULL OR StudentId != p_ExcludeStudentId);
END //

-- =============================================================================
-- 24. CHECK STUDENT MOBILE
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CheckStudentMobile`//
CREATE PROCEDURE `sp_CheckStudentMobile`
(
    IN p_MobileNumber VARCHAR(20),
    IN p_ExcludeStudentId INT
)
BEGIN
    SELECT COUNT(1) AS `Count`
    FROM `Students`
    WHERE MobileNumber = TRIM(p_MobileNumber)
      AND (p_ExcludeStudentId IS NULL OR StudentId != p_ExcludeStudentId);
END //

-- =============================================================================
-- 25. UPDATE STUDENT PHOTO PATH
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentPhotoPath`//
CREATE PROCEDURE `sp_UpdateStudentPhotoPath`
(
    IN p_StudentId INT,
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    DECLARE v_AdmissionId INT;

    UPDATE `Students`
    SET Photo = p_PhotoPath, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync to linked StudentAdmissions
    SELECT AdmissionId INTO v_AdmissionId FROM `Students` WHERE StudentId = p_StudentId LIMIT 1;
    IF v_AdmissionId IS NOT NULL AND v_AdmissionId > 0 THEN
        UPDATE `StudentAdmissions`
        SET StudentPhoto = p_PhotoPath, UpdatedAt = NOW()
        WHERE AdmissionId = v_AdmissionId;
    END IF;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 26. UPDATE STUDENT DOCUMENT PATH
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentDocumentPath`//
CREATE PROCEDURE `sp_UpdateStudentDocumentPath`
(
    IN p_StudentId INT,
    IN p_DocumentColumn VARCHAR(50),
    IN p_DocumentPath VARCHAR(500)
)
BEGIN
    IF p_DocumentColumn = 'BirthCertificate' THEN
        UPDATE `Students` SET BirthCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'TransferCertificate' THEN
        UPDATE `Students` SET TransferCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'StudyCertificate' THEN
        UPDATE `Students` SET StudyCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'AadhaarDocument' THEN
        UPDATE `Students` SET AadhaarDocument = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'CommunityCertificate' THEN
        UPDATE `Students` SET CommunityCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'IncomeCertificate' THEN
        UPDATE `Students` SET IncomeCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'CasteCertificate' THEN
        UPDATE `Students` SET CasteCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'TenthCertificate' THEN
        UPDATE `Students` SET TenthCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'MarksMemo' THEN
        UPDATE `Students` SET MarksMemo = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    END IF;

    SELECT 1 AS RowsAffected;
END //

DELIMITER ;
