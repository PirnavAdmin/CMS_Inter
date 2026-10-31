-- =============================================================================
-- MODULE 10: STUDENT ADMISSION STORED PROCEDURES
-- Canonical Stored Procedures for CMS_Inter Student Admission Module
-- Architecture: 100% Stored Procedures, 0% Inline SQL, Dapper Compliant
-- =============================================================================

-- Ensure support table for Admission Optional Fee Selections exists
CREATE TABLE IF NOT EXISTS `AdmissionFeeSelections` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `AdmissionId` INT NOT NULL,
    `FeeStructureComponentId` INT NOT NULL,
    `IsSelected` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_AdmissionFeeSelections_AdmissionId` (`AdmissionId`),
    KEY `IX_AdmissionFeeSelections_ComponentId` (`FeeStructureComponentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

-- =============================================================================
-- 1. GET ALL STUDENT ADMISSIONS
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAllStudentAdmissions`//
CREATE PROCEDURE `sp_GetAllStudentAdmissions`
(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        sa.AdmissionId,
        sa.AdmissionNo,
        sa.AdmissionDate,
        sa.AdmissionType,
        sa.AdmissionQuota,
        sa.CampusId,
        c.CampusName,
        sa.SourceCampusId,
        sc.CampusName AS SourceCampusName,
        sa.IsReferral,
        sa.AdmittedById,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName,
        sa.BoardId,
        b.BoardName,
        sa.AcademicYearId,
        ay.AcademicYearName,
        sa.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        sa.GroupId,
        g.GroupName,
        sa.ProgramId,
        p.ProgramName,
        sa.FirstName,
        sa.LastName,
        sa.Gender,
        sa.DateOfBirth,
        sa.BloodGroup,
        sa.StudentEmail,
        sa.StudentMobileNumber,
        sa.StudentPhoto,
        sa.AadhaarNumber,
        sa.Nationality,
        sa.Religion,
        sa.Category,
        sa.FatherName,
        sa.FatherOccupation,
        sa.FatherMobile,
        sa.MotherName,
        sa.MotherOccupation,
        sa.MotherMobile,
        sa.GuardianName,
        sa.GuardianMobile,
        sa.ParentGuardianEmail,
        sa.AnnualIncome,
        sa.HouseDoorNumber,
        sa.StreetVillage,
        sa.City,
        sa.District,
        sa.State,
        sa.Pincode,
        sa.PreviousSchool,
        sa.PreviousBoard,
        sa.PreviousPercentage,
        sa.PreviousYearOfPassing,
        sa.Medium,
        sa.SecondLanguage,
        sa.Status,
        sa.IsVerified,
        sa.IsApproved,
        sa.IsRejected,
        sa.RejectionReason,
        sa.Remarks,
        sa.IsActive,
        sa.CreatedAt,
        sa.UpdatedAt,
        sa.SectionId,
        sec.SectionName,
        sa.RollNo,
        sa.StudentType,
        sa.TransportRequired,
        sa.BusType,
        sa.RouteId,
        COALESCE(sa.BusRoute, tr.RouteName) AS BusRoute,
        sa.PickupPointId,
        COALESCE(sa.PickupPoint, pp.StopName, pp.PickupPointName) AS PickupPoint,
        sa.HostelId,
        COALESCE(sa.HostelBlock, hb.HostelName) AS HostelBlock,
        sa.RoomId,
        COALESCE(sa.HostelRoom, rm.RoomNumber) AS HostelRoom,
        sa.BedId,
        COALESCE(sa.HostelBed, bed.BedNumber) AS HostelBed,
        sa.HallTicketNumber,
        hb.HostelName AS FetchedHostelBlock,
        rm.RoomNumber AS FetchedHostelRoom,
        bed.BedNumber AS FetchedHostelBed,
        tr.RouteName AS FetchedBusRoute,
        COALESCE(pp.StopName, pp.PickupPointName) AS FetchedPickupPoint,
        sa.FeeStructureId,
        fs.StructureName AS FeeStructureName,
        sa.PaymentPlan,
        sa.ScholarshipStatus
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Sections` sec ON sa.SectionId = sec.SectionId
    LEFT JOIN `FeeStructures` fs ON sa.FeeStructureId = fs.FeeStructureId
    LEFT JOIN `hostel_blocks` hb ON sa.HostelId = hb.HostelId
    LEFT JOIN `room_masters` rm ON sa.RoomId = rm.RoomId
    LEFT JOIN `hostel_beds` bed ON sa.BedId = bed.BedId
    LEFT JOIN `TransportRoutes` tr ON sa.RouteId = tr.RouteId
    LEFT JOIN `PickupPoints` pp ON sa.PickupPointId = pp.PickupPointId
    WHERE sa.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
    ORDER BY sa.AdmissionId DESC;
END //

-- =============================================================================
-- 2. GET STUDENT ADMISSION BY ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentAdmissionById`//
CREATE PROCEDURE `sp_GetStudentAdmissionById`
(
    IN p_AdmissionId INT
)
BEGIN
    SELECT 
        sa.AdmissionId,
        sa.AdmissionNo,
        sa.AdmissionDate,
        sa.AdmissionType,
        sa.AdmissionQuota,
        sa.CampusId,
        c.CampusName,
        sa.SourceCampusId,
        sc.CampusName AS SourceCampusName,
        sa.IsReferral,
        sa.AdmittedById,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName,
        sa.BoardId,
        b.BoardName,
        sa.AcademicYearId,
        ay.AcademicYearName,
        sa.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        sa.GroupId,
        g.GroupName,
        sa.ProgramId,
        p.ProgramName,
        sa.FirstName,
        sa.LastName,
        sa.Gender,
        sa.DateOfBirth,
        sa.BloodGroup,
        sa.StudentEmail,
        sa.StudentMobileNumber,
        sa.StudentPhoto,
        sa.AadhaarNumber,
        sa.Nationality,
        sa.Religion,
        sa.Category,
        sa.FatherName,
        sa.FatherOccupation,
        sa.FatherMobile,
        sa.MotherName,
        sa.MotherOccupation,
        sa.MotherMobile,
        sa.GuardianName,
        sa.GuardianMobile,
        sa.ParentGuardianEmail,
        sa.AnnualIncome,
        sa.HouseDoorNumber,
        sa.StreetVillage,
        sa.City,
        sa.District,
        sa.State,
        sa.Pincode,
        sa.PreviousSchool,
        sa.PreviousBoard,
        sa.PreviousPercentage,
        sa.PreviousYearOfPassing,
        sa.Medium,
        sa.SecondLanguage,
        sa.Status,
        sa.IsVerified,
        sa.IsApproved,
        sa.IsRejected,
        sa.RejectionReason,
        sa.Remarks,
        sa.IsActive,
        sa.CreatedAt,
        sa.UpdatedAt,
        sa.SectionId,
        sec.SectionName,
        sa.RollNo,
        sa.StudentType,
        sa.TransportRequired,
        sa.BusType,
        sa.RouteId,
        COALESCE(sa.BusRoute, tr.RouteName) AS BusRoute,
        sa.PickupPointId,
        COALESCE(sa.PickupPoint, pp.StopName, pp.PickupPointName) AS PickupPoint,
        sa.HostelId,
        COALESCE(sa.HostelBlock, hb.HostelName) AS HostelBlock,
        sa.RoomId,
        COALESCE(sa.HostelRoom, rm.RoomNumber) AS HostelRoom,
        sa.BedId,
        COALESCE(sa.HostelBed, bed.BedNumber) AS HostelBed,
        sa.HallTicketNumber,
        hb.HostelName AS FetchedHostelBlock,
        rm.RoomNumber AS FetchedHostelRoom,
        bed.BedNumber AS FetchedHostelBed,
        tr.RouteName AS FetchedBusRoute,
        COALESCE(pp.StopName, pp.PickupPointName) AS FetchedPickupPoint,
        sa.FeeStructureId,
        fs.StructureName AS FeeStructureName,
        sa.PaymentPlan,
        sa.ScholarshipStatus
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Sections` sec ON sa.SectionId = sec.SectionId
    LEFT JOIN `FeeStructures` fs ON sa.FeeStructureId = fs.FeeStructureId
    LEFT JOIN `hostel_blocks` hb ON sa.HostelId = hb.HostelId
    LEFT JOIN `room_masters` rm ON sa.RoomId = rm.RoomId
    LEFT JOIN `hostel_beds` bed ON sa.BedId = bed.BedId
    LEFT JOIN `TransportRoutes` tr ON sa.RouteId = tr.RouteId
    LEFT JOIN `PickupPoints` pp ON sa.PickupPointId = pp.PickupPointId
    WHERE sa.AdmissionId = p_AdmissionId
      AND sa.IsActive = 1
    LIMIT 1;

    -- Return Selected Fee Component IDs as second result set
    SELECT FeeStructureComponentId 
    FROM `AdmissionFeeSelections` 
    WHERE `AdmissionId` = p_AdmissionId AND `IsSelected` = 1;
END //

-- =============================================================================
-- 3. CREATE STUDENT ADMISSION (ATOMIC INSERTION)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CreateAdmission`//
DROP PROCEDURE IF EXISTS `sp_CreateStudentAdmission`//
CREATE PROCEDURE `sp_CreateStudentAdmission`
(
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionNo VARCHAR(50),
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_CampusId INT,
    IN p_SourceCampusId INT,
    IN p_IsReferral TINYINT(1),
    IN p_AdmittedById INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentEmail VARCHAR(150),
    IN p_StudentMobileNumber VARCHAR(20),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
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
    IN p_FeeStructureId INT,
    IN p_PaymentPlan VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_HouseDoorNumber VARCHAR(100),
    IN p_StreetVillage VARCHAR(200),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_PreviousYearOfPassing INT,
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentType VARCHAR(50),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(100),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    DECLARE v_AdmissionId INT;
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(50);
    DECLARE v_HostelBed VARCHAR(50);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);
    DECLARE v_AdmissionNo VARCHAR(50);
    DECLARE v_InitialStatus VARCHAR(50);

    -- Resolve descriptive names from foreign keys if text was omitted
    SET v_HostelBlock = p_HostelBlock;
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;

    SET v_HostelRoom = p_HostelRoom;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;

    SET v_HostelBed = p_HostelBed;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    SET v_BusRoute = p_BusRoute;
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    SET v_PickupPoint = p_PickupPoint;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    SET v_InitialStatus = 'Pending';
    SET v_AdmissionNo = TRIM(p_AdmissionNo);

    INSERT INTO `StudentAdmissions`
    (
        AdmissionDate, AdmissionNo, AdmissionType, AdmissionQuota, CampusId, SourceCampusId, IsReferral, AdmittedById,
        BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId, FirstName, LastName,
        Gender, DateOfBirth, BloodGroup, StudentEmail, StudentMobileNumber,
        StudentPhoto, AadhaarNumber, Nationality, Religion, Category,
        FatherName, FatherOccupation, FatherMobile,
        MotherName, MotherOccupation, MotherMobile,
        GuardianName, GuardianMobile, ParentGuardianEmail, AnnualIncome,
        FeeStructureId, PaymentPlan, ScholarshipStatus, HouseDoorNumber,
        StreetVillage, City, District, State, Pincode,
        PreviousSchool, PreviousBoard, PreviousPercentage, PreviousYearOfPassing,
        Medium, SecondLanguage, StudentType, TransportRequired, BusType, RouteId, BusRoute,
        PickupPointId, PickupPoint, HostelId, HostelBlock, RoomId, HostelRoom, BedId, HostelBed, HallTicketNumber,
        Status, IsVerified, IsApproved, IsRejected, IsActive, CreatedAt
    )
    VALUES
    (
        p_AdmissionDate, v_AdmissionNo, p_AdmissionType, p_AdmissionQuota, p_CampusId, p_SourceCampusId, p_IsReferral, p_AdmittedById,
        p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_ProgramId, p_FirstName, p_LastName,
        p_Gender, p_DateOfBirth, p_BloodGroup, p_StudentEmail, p_StudentMobileNumber,
        p_StudentPhoto, p_AadhaarNumber, p_Nationality, p_Religion, p_Category,
        p_FatherName, p_FatherOccupation, p_FatherMobile,
        p_MotherName, p_MotherOccupation, p_MotherMobile,
        p_GuardianName, p_GuardianMobile, p_ParentGuardianEmail, p_AnnualIncome,
        p_FeeStructureId, p_PaymentPlan, p_ScholarshipStatus, p_HouseDoorNumber,
        p_StreetVillage, p_City, p_District, p_State, p_Pincode,
        p_PreviousSchool, p_PreviousBoard, p_PreviousPercentage, p_PreviousYearOfPassing,
        p_Medium, p_SecondLanguage, p_StudentType, p_TransportRequired, p_BusType, p_RouteId, v_BusRoute,
        p_PickupPointId, v_PickupPoint, p_HostelId, v_HostelBlock, p_RoomId, v_HostelRoom, p_BedId, v_HostelBed, p_HallTicketNumber,
        v_InitialStatus, 0, 0, 0, 1, CURRENT_TIMESTAMP(6)
    );

    SET v_AdmissionId = LAST_INSERT_ID();

    -- Fallback default admission number if non-referral and empty
    IF (v_AdmissionNo IS NULL OR v_AdmissionNo = '') AND (p_IsReferral = 0 OR p_IsReferral IS NULL) THEN
        SET v_AdmissionNo = CONCAT('ADM-', LPAD(v_AdmissionId, 4, '0'));
        UPDATE `StudentAdmissions` SET `AdmissionNo` = v_AdmissionNo WHERE `AdmissionId` = v_AdmissionId;
    END IF;

    -- Return full created projection
    CALL sp_GetStudentAdmissionById(v_AdmissionId);
END //

-- Backward compatibility alias
CREATE PROCEDURE `sp_CreateAdmission`
(
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionNo VARCHAR(50),
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_CampusId INT,
    IN p_SourceCampusId INT,
    IN p_IsReferral TINYINT(1),
    IN p_AdmittedById INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentEmail VARCHAR(150),
    IN p_StudentMobileNumber VARCHAR(20),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
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
    IN p_FeeStructureId INT,
    IN p_PaymentPlan VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_HouseDoorNumber VARCHAR(100),
    IN p_StreetVillage VARCHAR(200),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_PreviousYearOfPassing INT,
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentType VARCHAR(50),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(100),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    CALL sp_CreateStudentAdmission(
        p_AdmissionDate, p_AdmissionNo, p_AdmissionType, p_AdmissionQuota, p_CampusId, p_SourceCampusId, p_IsReferral, p_AdmittedById,
        p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_ProgramId, p_FirstName, p_LastName,
        p_Gender, p_DateOfBirth, p_BloodGroup, p_StudentEmail, p_StudentMobileNumber,
        p_StudentPhoto, p_AadhaarNumber, p_Nationality, p_Religion, p_Category,
        p_FatherName, p_FatherOccupation, p_FatherMobile,
        p_MotherName, p_MotherOccupation, p_MotherMobile,
        p_GuardianName, p_GuardianMobile, p_ParentGuardianEmail, p_AnnualIncome,
        p_FeeStructureId, p_PaymentPlan, p_ScholarshipStatus, p_HouseDoorNumber,
        p_StreetVillage, p_City, p_District, p_State, p_Pincode,
        p_PreviousSchool, p_PreviousBoard, p_PreviousPercentage, p_PreviousYearOfPassing,
        p_Medium, p_SecondLanguage, p_StudentType, p_TransportRequired, p_BusType, p_RouteId, p_BusRoute,
        p_PickupPointId, p_PickupPoint, p_HostelId, p_HostelBlock, p_RoomId, p_HostelRoom, p_BedId, p_HostelBed, p_HallTicketNumber
    );
END //

-- =============================================================================
-- 4. UPDATE STUDENT ADMISSION (ATOMIC UPDATE)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentAdmission`//
CREATE PROCEDURE `sp_UpdateStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentEmail VARCHAR(150),
    IN p_StudentMobileNumber VARCHAR(20),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
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
    IN p_FeeStructureId INT,
    IN p_PaymentPlan VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_HouseDoorNumber VARCHAR(100),
    IN p_StreetVillage VARCHAR(200),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_PreviousYearOfPassing INT,
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentType VARCHAR(50),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(100),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(50);
    DECLARE v_HostelBed VARCHAR(50);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);

    -- Resolve names from IDs if text was omitted
    SET v_HostelBlock = p_HostelBlock;
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;

    SET v_HostelRoom = p_HostelRoom;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;

    SET v_HostelBed = p_HostelBed;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    SET v_BusRoute = p_BusRoute;
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    SET v_PickupPoint = p_PickupPoint;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    UPDATE `StudentAdmissions`
    SET 
        AdmissionDate = COALESCE(p_AdmissionDate, AdmissionDate),
        AdmissionType = COALESCE(p_AdmissionType, AdmissionType),
        AdmissionQuota = COALESCE(p_AdmissionQuota, AdmissionQuota),
        CampusId = COALESCE(p_CampusId, CampusId),
        BoardId = COALESCE(p_BoardId, BoardId),
        AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
        AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
        GroupId = COALESCE(p_GroupId, GroupId),
        ProgramId = COALESCE(p_ProgramId, ProgramId),
        FirstName = COALESCE(p_FirstName, FirstName),
        LastName = COALESCE(p_LastName, LastName),
        Gender = COALESCE(p_Gender, Gender),
        DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        StudentEmail = COALESCE(p_StudentEmail, StudentEmail),
        StudentMobileNumber = COALESCE(p_StudentMobileNumber, StudentMobileNumber),
        StudentPhoto = COALESCE(p_StudentPhoto, StudentPhoto),
        AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
        Nationality = COALESCE(p_Nationality, Nationality),
        Religion = COALESCE(p_Religion, Religion),
        Category = COALESCE(p_Category, Category),
        FatherName = COALESCE(p_FatherName, FatherName),
        FatherOccupation = COALESCE(p_FatherOccupation, FatherOccupation),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherName = COALESCE(p_MotherName, MotherName),
        MotherOccupation = COALESCE(p_MotherOccupation, MotherOccupation),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianName = COALESCE(p_GuardianName, GuardianName),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        AnnualIncome = COALESCE(p_AnnualIncome, AnnualIncome),
        FeeStructureId = COALESCE(p_FeeStructureId, FeeStructureId),
        PaymentPlan = COALESCE(p_PaymentPlan, PaymentPlan),
        ScholarshipStatus = COALESCE(p_ScholarshipStatus, ScholarshipStatus),
        HouseDoorNumber = COALESCE(p_HouseDoorNumber, HouseDoorNumber),
        StreetVillage = COALESCE(p_StreetVillage, StreetVillage),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
        PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
        PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
        PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
        Medium = COALESCE(p_Medium, Medium),
        SecondLanguage = COALESCE(p_SecondLanguage, SecondLanguage),
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
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE AdmissionId = p_AdmissionId;

    -- Return updated projection
    CALL sp_GetStudentAdmissionById(p_AdmissionId);
END //

-- =============================================================================
-- 5. VERIFY STUDENT ADMISSION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_VerifyStudentAdmission`//
CREATE PROCEDURE `sp_VerifyStudentAdmission`
(
    IN p_AdmissionId INT
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `IsVerified` = 1,
        `Status` = 'Verified',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 6. APPROVE STUDENT ADMISSION & DOMAIN STUDENT UPSERT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ApproveStudentAdmission`//
CREATE PROCEDURE `sp_ApproveStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_PasswordHash VARCHAR(500)
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM `StudentAdmissions`
        WHERE `AdmissionId` = p_AdmissionId AND `IsActive` = 1 AND `IsRejected` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission record not found or rejected';
    END IF;

    -- Check if student domain record already exists
    SELECT `StudentId` INTO v_StudentId
    FROM `Students`
    WHERE `AdmissionId` = p_AdmissionId
    ORDER BY `StudentId` DESC
    LIMIT 1;

    IF v_StudentId IS NULL THEN
        INSERT INTO `Students`
        (
            AdmissionId, BoardId, SectionId,
            AdmissionNo, RollNo, StudentName, Photo,
            Gender, DateOfBirth, BloodGroup, Email, MobileNumber, AadhaarNumber, Address,
            City, District, State, Pincode,
            Board, AcademicYearId, AcademicLevel, GroupId, Section, AdmissionDate,
            AdmissionType, Medium, PreviousSchool, PreviousBoard, PreviousPercentage, PreviousYearOfPassing,
            SecondLanguage, StudentType, TransportRequired, BusType, RouteId, BusRoute,
            PickupPointId, PickupPoint, HostelId, HostelBlock, RoomId, HostelRoom, BedId, HostelBed,
            HallTicketNumber, PreviousHallTicketNumber, Category, ScholarshipStatus,
            FatherName, FatherOccupation, FatherMobile,
            MotherName, MotherOccupation, MotherMobile,
            GuardianName, GuardianMobile, ParentGuardianEmail, AnnualIncome,
            CampusId, FeeStructureId, PaymentPlan,
            FeeAmount, FeePaid, ScholarshipAmount, FeeStatus,
            AttendancePercentage, PerformanceGrade, CGPA, `Rank`, Remarks,
            PasswordHash, IsFirstLogin, IsActive, CreatedAt
        )
        SELECT
            sa.AdmissionId, sa.BoardId, sa.SectionId,
            sa.AdmissionNo,
            COALESCE(sa.RollNo, CONCAT('R', LPAD(sa.AdmissionId, 5, '0'))),
            CONCAT(TRIM(sa.FirstName), ' ', COALESCE(TRIM(sa.LastName), '')),
            sa.StudentPhoto,
            sa.Gender, DATE(sa.DateOfBirth), sa.BloodGroup,
            COALESCE(NULLIF(sa.StudentEmail, ''), NULLIF(sa.ParentGuardianEmail, ''), CONCAT(sa.AdmissionNo, '@student.local')),
            sa.StudentMobileNumber, sa.AadhaarNumber,
            CONCAT_WS(', ', NULLIF(sa.HouseDoorNumber, ''), NULLIF(sa.StreetVillage, '')),
            sa.City, sa.District, sa.State, sa.Pincode,
            COALESCE(b.BoardName, ''), sa.AcademicYearId, COALESCE(al.LevelName, ''), sa.GroupId, COALESCE(sec.SectionName, ''), DATE(sa.AdmissionDate),
            sa.AdmissionType, sa.Medium, sa.PreviousSchool, sa.PreviousBoard, sa.PreviousPercentage, sa.PreviousYearOfPassing,
            sa.SecondLanguage, sa.StudentType, sa.TransportRequired, sa.BusType, sa.RouteId, sa.BusRoute,
            sa.PickupPointId, sa.PickupPoint, sa.HostelId, sa.HostelBlock, sa.RoomId, sa.HostelRoom, sa.BedId, sa.HostelBed,
            sa.HallTicketNumber, sa.HallTicketNumber, sa.Category, sa.ScholarshipStatus,
            sa.FatherName, sa.FatherOccupation, sa.FatherMobile,
            sa.MotherName, sa.MotherOccupation, sa.MotherMobile,
            sa.GuardianName, sa.GuardianMobile, sa.ParentGuardianEmail, sa.AnnualIncome,
            sa.CampusId, sa.FeeStructureId, sa.PaymentPlan,
            0, 0, 0, 'Pending',
            0, NULL, NULL, NULL, sa.Remarks,
            COALESCE(p_PasswordHash, ''), 1, 1, CURRENT_TIMESTAMP(6)
        FROM `StudentAdmissions` sa
        LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
        LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = sa.AcademicLevelId
        LEFT JOIN `Sections` sec ON sec.SectionId = sa.SectionId
        WHERE sa.AdmissionId = p_AdmissionId;

        SET v_StudentId = LAST_INSERT_ID();
    END IF;

    UPDATE `StudentAdmissions`
    SET `IsApproved` = 1,
        `IsRejected` = 0,
        `Status` = 'Approved',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT 1 AS Success;
END //

-- =============================================================================
-- 7. REJECT STUDENT ADMISSION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_RejectStudentAdmission`//
CREATE PROCEDURE `sp_RejectStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_RejectionReason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `IsRejected` = 1,
        `IsApproved` = 0,
        `Status` = 'Rejected',
        `RejectionReason` = p_RejectionReason,
        `Remarks` = p_Remarks,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 8. DELETE / SOFT DELETE STUDENT ADMISSION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_DeleteStudentAdmission`//
CREATE PROCEDURE `sp_DeleteStudentAdmission`
(
    IN p_AdmissionId INT
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `IsActive` = 0,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 9. INTER-CAMPUS REFERRAL PROCEDURES
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetOutgoingAdmissionRequests`//
CREATE PROCEDURE `sp_GetOutgoingAdmissionRequests`
(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        sa.*,
        b.BoardName,
        ay.AcademicYearName,
        g.GroupName,
        c.CampusName,
        sc.CampusName AS SourceCampusName,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    WHERE sa.IsActive = 1
      AND sa.SourceCampusId = p_CampusId
      AND sa.CampusId != p_CampusId
    ORDER BY sa.AdmissionId DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetIncomingAdmissionRequests`//
CREATE PROCEDURE `sp_GetIncomingAdmissionRequests`
(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        sa.*,
        b.BoardName,
        ay.AcademicYearName,
        g.GroupName,
        c.CampusName,
        sc.CampusName AS SourceCampusName,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    WHERE sa.IsActive = 1
      AND sa.CampusId = p_CampusId
      AND sa.SourceCampusId IS NOT NULL
      AND sa.SourceCampusId != p_CampusId
    ORDER BY sa.AdmissionId DESC;
END //

DROP PROCEDURE IF EXISTS `sp_ApproveAdmissionRequest`//
CREATE PROCEDURE `sp_ApproveAdmissionRequest`
(
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `Status` = 'Request Approved',
        `AdmissionNo` = p_AdmissionNo,
        `Remarks` = p_Remarks,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_RejectAdmissionRequest`//
CREATE PROCEDURE `sp_RejectAdmissionRequest`
(
    IN p_AdmissionId INT,
    IN p_RejectionReason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `Status` = 'Request Rejected',
        `RejectionReason` = p_RejectionReason,
        `IsRejected` = 1,
        `Remarks` = p_Remarks,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 10. SECTION & ROLL NUMBER ALLOCATION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_AllocateStudentAdmissionSection`//
CREATE PROCEDURE `sp_AllocateStudentAdmissionSection`
(
    IN p_AdmissionId INT,
    IN p_SectionId INT
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    UPDATE `Students`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_AllocateStudentAdmissionRollNumber`//
CREATE PROCEDURE `sp_AllocateStudentAdmissionRollNumber`
(
    IN p_AdmissionId INT,
    IN p_SectionId INT,
    IN p_RollNo VARCHAR(30)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `RollNo` = p_RollNo,
        `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    UPDATE `Students`
    SET `RollNo` = p_RollNo,
        `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 11. SAVE ADMISSION FEE SELECTIONS
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SaveAdmissionFeeSelections`//
CREATE PROCEDURE `sp_SaveAdmissionFeeSelections`
(
    IN p_AdmissionId INT,
    IN p_SelectedComponentIds JSON
)
BEGIN
    DELETE FROM `AdmissionFeeSelections` WHERE `AdmissionId` = p_AdmissionId;

    IF p_SelectedComponentIds IS NOT NULL AND JSON_LENGTH(p_SelectedComponentIds) > 0 THEN
        INSERT INTO `AdmissionFeeSelections` (AdmissionId, FeeStructureComponentId, IsSelected, CreatedAt)
        SELECT 
            p_AdmissionId, 
            jt.ComponentId, 
            1, 
            CURRENT_TIMESTAMP(6)
        FROM JSON_TABLE(
            p_SelectedComponentIds,
            '$[*]' COLUMNS (ComponentId INT PATH '$')
        ) jt;
    END IF;

    SELECT COUNT(*) AS SelectedOptionalFees
    FROM `AdmissionFeeSelections`
    WHERE `AdmissionId` = p_AdmissionId AND `IsSelected` = 1;
END //

-- =============================================================================
-- 12. SYNC APPROVED STUDENT FROM ADMISSION UPDATE
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SyncApprovedStudentFromAdmission`//
CREATE PROCEDURE `sp_SyncApprovedStudentFromAdmission`
(
    IN p_AdmissionId INT
)
BEGIN
    DECLARE v_StudentId INT;

    SELECT `StudentId` INTO v_StudentId
    FROM `Students`
    WHERE `AdmissionId` = p_AdmissionId
    ORDER BY `StudentId` DESC
    LIMIT 1;

    IF v_StudentId IS NOT NULL THEN
        UPDATE `Students` s
        JOIN `StudentAdmissions` sa ON s.AdmissionId = sa.AdmissionId
        LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
        LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = sa.AcademicLevelId
        LEFT JOIN `Sections` sec ON sec.SectionId = sa.SectionId
        SET
            s.StudentName = CONCAT(TRIM(sa.FirstName), ' ', COALESCE(TRIM(sa.LastName), '')),
            s.Photo = COALESCE(sa.StudentPhoto, s.Photo),
            s.Gender = COALESCE(sa.Gender, s.Gender),
            s.DateOfBirth = COALESCE(DATE(sa.DateOfBirth), s.DateOfBirth),
            s.BloodGroup = COALESCE(sa.BloodGroup, s.BloodGroup),
            s.Email = COALESCE(sa.StudentEmail, s.Email),
            s.MobileNumber = COALESCE(sa.StudentMobileNumber, s.MobileNumber),
            s.AadhaarNumber = COALESCE(sa.AadhaarNumber, s.AadhaarNumber),
            s.Nationality = COALESCE(sa.Nationality, s.Nationality),
            s.Religion = COALESCE(sa.Religion, s.Religion),
            s.Category = COALESCE(sa.Category, s.Category),
            s.Address = CONCAT_WS(', ', NULLIF(sa.HouseDoorNumber, ''), NULLIF(sa.StreetVillage, '')),
            s.City = COALESCE(sa.City, s.City),
            s.District = COALESCE(sa.District, s.District),
            s.State = COALESCE(sa.State, s.State),
            s.Pincode = COALESCE(sa.Pincode, s.Pincode),
            s.BoardId = COALESCE(sa.BoardId, s.BoardId),
            s.Board = COALESCE(b.BoardName, s.Board),
            s.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId),
            s.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId),
            s.AcademicLevel = COALESCE(al.LevelName, s.AcademicLevel),
            s.GroupId = COALESCE(sa.GroupId, s.GroupId),
            s.ProgramId = COALESCE(sa.ProgramId, s.ProgramId),
            s.SectionId = COALESCE(sa.SectionId, s.SectionId),
            s.Section = COALESCE(sec.SectionName, s.Section),
            s.RollNo = COALESCE(sa.RollNo, s.RollNo),
            s.Medium = COALESCE(sa.Medium, s.Medium),
            s.SecondLanguage = COALESCE(sa.SecondLanguage, s.SecondLanguage),
            s.PreviousSchool = COALESCE(sa.PreviousSchool, s.PreviousSchool),
            s.PreviousBoard = COALESCE(sa.PreviousBoard, s.PreviousBoard),
            s.PreviousYearOfPassing = COALESCE(sa.PreviousYearOfPassing, s.PreviousYearOfPassing),
            s.PreviousPercentage = COALESCE(sa.PreviousPercentage, s.PreviousPercentage),
            s.HallTicketNumber = COALESCE(sa.HallTicketNumber, s.HallTicketNumber),
            s.PreviousHallTicketNumber = COALESCE(sa.HallTicketNumber, s.PreviousHallTicketNumber),
            s.FatherName = COALESCE(sa.FatherName, s.FatherName),
            s.FatherOccupation = COALESCE(sa.FatherOccupation, s.FatherOccupation),
            s.FatherMobile = COALESCE(sa.FatherMobile, s.FatherMobile),
            s.MotherName = COALESCE(sa.MotherName, s.MotherName),
            s.MotherOccupation = COALESCE(sa.MotherOccupation, s.MotherOccupation),
            s.MotherMobile = COALESCE(sa.MotherMobile, s.MotherMobile),
            s.GuardianName = COALESCE(sa.GuardianName, s.GuardianName),
            s.GuardianMobile = COALESCE(sa.GuardianMobile, s.GuardianMobile),
            s.ParentGuardianEmail = COALESCE(sa.ParentGuardianEmail, s.ParentGuardianEmail),
            s.AnnualIncome = COALESCE(sa.AnnualIncome, s.AnnualIncome),
            s.StudentType = COALESCE(sa.StudentType, s.StudentType),
            s.TransportRequired = COALESCE(sa.TransportRequired, s.TransportRequired),
            s.BusType = COALESCE(sa.BusType, s.BusType),
            s.RouteId = COALESCE(sa.RouteId, s.RouteId),
            s.BusRoute = COALESCE(sa.BusRoute, s.BusRoute),
            s.PickupPointId = COALESCE(sa.PickupPointId, s.PickupPointId),
            s.PickupPoint = COALESCE(sa.PickupPoint, s.PickupPoint),
            s.HostelId = COALESCE(sa.HostelId, s.HostelId),
            s.HostelBlock = COALESCE(sa.HostelBlock, s.HostelBlock),
            s.RoomId = COALESCE(sa.RoomId, s.RoomId),
            s.HostelRoom = COALESCE(sa.HostelRoom, s.HostelRoom),
            s.BedId = COALESCE(sa.BedId, s.BedId),
            s.HostelBed = COALESCE(sa.HostelBed, s.HostelBed),
            s.CampusId = COALESCE(sa.CampusId, s.CampusId),
            s.FeeStructureId = COALESCE(sa.FeeStructureId, s.FeeStructureId),
            s.PaymentPlan = COALESCE(sa.PaymentPlan, s.PaymentPlan),
            s.ScholarshipStatus = COALESCE(sa.ScholarshipStatus, s.ScholarshipStatus),
            s.UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE s.StudentId = v_StudentId;

        -- Update Users table for Student Login / Profile
        UPDATE `Users` u
        JOIN `StudentAdmissions` sa ON sa.AdmissionId = p_AdmissionId
        SET 
            u.FullName = CONCAT(TRIM(sa.FirstName), ' ', COALESCE(TRIM(sa.LastName), '')),
            u.Email = COALESCE(NULLIF(sa.StudentEmail, ''), u.Email),
            u.PhoneNumber = COALESCE(NULLIF(sa.StudentMobileNumber, ''), u.PhoneNumber),
            u.UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE u.StudentId = v_StudentId;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 13. UPDATE ADMISSION NUMBER
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateAdmissionNumber`//
CREATE PROCEDURE `sp_UpdateAdmissionNumber`
(
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `AdmissionNo` = p_AdmissionNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DELIMITER ;
