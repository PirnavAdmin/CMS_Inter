-- =============================================================================
-- MODULE 10: STUDENT ADMISSION STORED PROCEDURES
-- Canonical Stored Procedures for CMS_Inter Student Admission Module
-- Architecture: 100% Stored Procedures, 0% Inline SQL, Dapper Compliant
-- Verified against live CollegeManagement MySQL schema
-- =============================================================================

-- Ensure support table for Admission Optional Fee Selections exists
CREATE TABLE IF NOT EXISTS `AdmissionFeeSelections` (
    `AdmissionFeeSelectionId` INT NOT NULL AUTO_INCREMENT,
    `AdmissionId` INT NOT NULL,
    `FeeStructureComponentId` INT NOT NULL,
    `IsSelected` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`AdmissionFeeSelectionId`),
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
        stu.SectionId,
        sec.SectionName,
        stu.RollNo,
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
    LEFT JOIN (
        SELECT s1.AdmissionId, s1.SectionId, s1.RollNo
        FROM `Students` s1
        INNER JOIN (
            SELECT AdmissionId, MAX(StudentId) AS MaxStudentId
            FROM `Students`
            WHERE IsActive = 1
            GROUP BY AdmissionId
        ) latest ON latest.MaxStudentId = s1.StudentId
    ) stu ON stu.AdmissionId = sa.AdmissionId
    LEFT JOIN `Sections` sec ON stu.SectionId = sec.SectionId
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
        stu.SectionId,
        sec.SectionName,
        stu.RollNo,
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
    LEFT JOIN (
        SELECT s1.AdmissionId, s1.SectionId, s1.RollNo
        FROM `Students` s1
        WHERE s1.AdmissionId = p_AdmissionId AND s1.IsActive = 1
        ORDER BY s1.StudentId DESC
        LIMIT 1
    ) stu ON stu.AdmissionId = sa.AdmissionId
    LEFT JOIN `Sections` sec ON stu.SectionId = sec.SectionId
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
-- 2B. GET STUDENT DOMAIN RECORD BY ADMISSION ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentByAdmissionId`//
CREATE PROCEDURE `sp_GetStudentByAdmissionId`
(
    IN p_AdmissionId INT
)
BEGIN
    SELECT s.*
    FROM `Students` s
    WHERE s.AdmissionId = p_AdmissionId
    ORDER BY s.StudentId DESC
    LIMIT 1;
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
    SET v_AdmissionNo = NULLIF(TRIM(p_AdmissionNo), '');

    IF (p_IsReferral = 0 OR p_IsReferral IS NULL) AND v_AdmissionNo IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Admission number could not be allocated.';
    END IF;

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
        p_AdmissionDate, v_AdmissionNo, p_AdmissionType, p_AdmissionQuota, p_CampusId, p_SourceCampusId, COALESCE(p_IsReferral, 0), p_AdmittedById,
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
    WHERE `AdmissionId` = p_AdmissionId
      AND `IsActive` = 1
      AND `IsRejected` = 0;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 6. APPROVE STUDENT ADMISSION & DOMAIN STUDENT / FEE / ALLOCATION UPSERT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ApproveStudentAdmission`//
CREATE PROCEDURE `sp_ApproveStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_PasswordHash VARCHAR(500)
)
proc_label: BEGIN
    DECLARE v_AdmissionExists INT DEFAULT 0;
    DECLARE v_FeeStructureId INT;
    DECLARE v_PaymentPlan VARCHAR(50);
    DECLARE v_HallTicketNumber VARCHAR(50);
    DECLARE v_StudentType VARCHAR(30);
    DECLARE v_TransportRequired TINYINT(1);
    DECLARE v_BusType VARCHAR(20);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);
    DECLARE v_HostelBlock VARCHAR(50);
    DECLARE v_HostelRoom VARCHAR(50);
    DECLARE v_HostelBed VARCHAR(50);
    DECLARE v_HostelId INT;
    DECLARE v_RoomId INT;
    DECLARE v_BedId INT;
    DECLARE v_RouteId INT;
    DECLARE v_PickupPointId INT;
    DECLARE v_CampusId INT;

    DECLARE v_StudentId INT;
    DECLARE v_StudentFeeId INT;
    DECLARE v_FeePaymentPlanId INT;
    DECLARE v_TotalAmount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_InstallmentAmount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_LastInstallmentAmount DECIMAL(18,2) DEFAULT 0.00;

    SELECT 
        COUNT(1), 
        MAX(FeeStructureId), 
        MAX(PaymentPlan), 
        MAX(HallTicketNumber),
        MAX(StudentType),
        MAX(TransportRequired),
        MAX(BusType),
        MAX(BusRoute),
        MAX(PickupPoint),
        MAX(HostelBlock),
        MAX(HostelRoom),
        MAX(HostelBed),
        MAX(HostelId),
        MAX(RoomId),
        MAX(BedId),
        MAX(RouteId),
        MAX(PickupPointId),
        MAX(CampusId)
    INTO 
        v_AdmissionExists, 
        v_FeeStructureId, 
        v_PaymentPlan, 
        v_HallTicketNumber,
        v_StudentType,
        v_TransportRequired,
        v_BusType,
        v_BusRoute,
        v_PickupPoint,
        v_HostelBlock,
        v_HostelRoom,
        v_HostelBed,
        v_HostelId,
        v_RoomId,
        v_BedId,
        v_RouteId,
        v_PickupPointId,
        v_CampusId
    FROM `StudentAdmissions`
    WHERE `AdmissionId` = p_AdmissionId
      AND `IsActive` = 1;

    IF v_AdmissionExists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission record not found or inactive.';
    END IF;

    IF v_FeeStructureId IS NULL OR NOT EXISTS (SELECT 1 FROM `FeeStructures` WHERE `FeeStructureId` = v_FeeStructureId AND `IsActive` = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid and active Fee Structure must be selected prior to admission approval.';
    END IF;

    IF v_PaymentPlan IS NULL OR TRIM(v_PaymentPlan) = '' THEN
        SET v_PaymentPlan = 'Schedule Payment';
    END IF;

    SELECT `StudentId` INTO v_StudentId
    FROM `Students`
    WHERE `AdmissionId` = p_AdmissionId
    LIMIT 1;

    IF v_StudentId IS NULL THEN
        INSERT INTO `Students`
        (
            AdmissionId,
            AdmissionNo,
            RollNo,
            AdmissionDate,
            AdmissionType,
            AdmissionQuota,
            Medium,
            SecondLanguage,
            StudentName,
            Photo,
            Gender,
            DateOfBirth,
            BloodGroup,
            Email,
            MobileNumber,
            AadhaarNumber,
            Nationality,
            Religion,
            Category,
            Address,
            City,
            District,
            State,
            Pincode,
            BoardId,
            AcademicYearId,
            AcademicLevelId,
            GroupId,
            ProgramId,
            FeeStructureId,
            PaymentPlan,
            SectionId,
            PreviousSchool,
            PreviousBoard,
            PreviousYearOfPassing,
            PreviousPercentage,
            PreviousHallTicketNumber,
            ScholarshipStatus,
            FatherName,
            FatherOccupation,
            FatherMobile,
            FatherEmail,
            MotherName,
            MotherOccupation,
            MotherMobile,
            MotherEmail,
            GuardianName,
            GuardianMobile,
            ParentGuardianEmail,
            AnnualIncome,
            Remarks,
            PasswordHash,
            IsFirstLogin,
            Status,
            IsActive,
            CreatedAt,
            AdmittedById,
            StudentType,
            TransportRequired,
            BusType,
            RouteId,
            BusRoute,
            PickupPointId,
            PickupPoint,
            HostelId,
            HostelBlock,
            RoomId,
            HostelRoom,
            BedId,
            HostelBed,
            HallTicketNumber,
            CampusId
        )
        SELECT
            sa.AdmissionId,
            sa.AdmissionNo,
            NULL,
            sa.AdmissionDate,
            sa.AdmissionType,
            sa.AdmissionQuota,
            sa.Medium,
            sa.SecondLanguage,
            CONCAT_WS(' ', NULLIF(TRIM(sa.FirstName), ''), NULLIF(TRIM(sa.LastName), '')),
            sa.StudentPhoto,
            sa.Gender,
            sa.DateOfBirth,
            sa.BloodGroup,
            sa.StudentEmail,
            sa.StudentMobileNumber,
            CASE
                WHEN sa.AadhaarNumber IS NULL OR TRIM(sa.AadhaarNumber) = '' OR LOWER(TRIM(sa.AadhaarNumber)) = 'string'
                THEN NULL
                ELSE TRIM(sa.AadhaarNumber)
            END,
            sa.Nationality,
            sa.Religion,
            sa.Category,
            CONCAT_WS(', ', NULLIF(TRIM(sa.HouseDoorNumber), ''), NULLIF(TRIM(sa.StreetVillage), ''), NULLIF(TRIM(sa.City), ''), NULLIF(TRIM(sa.District), ''), NULLIF(TRIM(sa.State), ''), NULLIF(TRIM(sa.Pincode), '')),
            sa.City,
            sa.District,
            sa.State,
            sa.Pincode,
            sa.BoardId,
            sa.AcademicYearId,
            sa.AcademicLevelId,
            sa.GroupId,
            sa.ProgramId,
            sa.FeeStructureId,
            v_PaymentPlan,
            NULL,
            sa.PreviousSchool,
            sa.PreviousBoard,
            sa.PreviousYearOfPassing,
            sa.PreviousPercentage,
            sa.HallTicketNumber,
            sa.ScholarshipStatus,
            sa.FatherName,
            sa.FatherOccupation,
            sa.FatherMobile,
            sa.FatherEmail,
            sa.MotherName,
            sa.MotherOccupation,
            sa.MotherMobile,
            sa.MotherEmail,
            sa.GuardianName,
            sa.GuardianMobile,
            sa.ParentGuardianEmail,
            sa.AnnualIncome,
            sa.Remarks,
            COALESCE(NULLIF(p_PasswordHash, ''), ''),
            1,
            'Active',
            1,
            CURRENT_TIMESTAMP(6),
            sa.AdmittedById,
            sa.StudentType,
            sa.TransportRequired,
            sa.BusType,
            sa.RouteId,
            sa.BusRoute,
            sa.PickupPointId,
            sa.PickupPoint,
            sa.HostelId,
            sa.HostelBlock,
            sa.RoomId,
            sa.HostelRoom,
            sa.BedId,
            sa.HostelBed,
            sa.HallTicketNumber,
            sa.CampusId
        FROM `StudentAdmissions` sa
        WHERE sa.AdmissionId = p_AdmissionId;

        SET v_StudentId = LAST_INSERT_ID();
    ELSE
        UPDATE `Students` sa_target
        JOIN `StudentAdmissions` sa_src ON sa_src.AdmissionId = p_AdmissionId
        SET
            sa_target.FeeStructureId = v_FeeStructureId,
            sa_target.PaymentPlan = v_PaymentPlan,
            sa_target.PreviousHallTicketNumber = COALESCE(v_HallTicketNumber, sa_target.PreviousHallTicketNumber),
            sa_target.StudentType = COALESCE(sa_src.StudentType, sa_target.StudentType),
            sa_target.TransportRequired = COALESCE(sa_src.TransportRequired, sa_target.TransportRequired),
            sa_target.BusType = COALESCE(sa_src.BusType, sa_target.BusType),
            sa_target.RouteId = COALESCE(sa_src.RouteId, sa_target.RouteId),
            sa_target.BusRoute = COALESCE(sa_src.BusRoute, sa_target.BusRoute),
            sa_target.PickupPointId = COALESCE(sa_src.PickupPointId, sa_target.PickupPointId),
            sa_target.PickupPoint = COALESCE(sa_src.PickupPoint, sa_target.PickupPoint),
            sa_target.HostelId = COALESCE(sa_src.HostelId, sa_target.HostelId),
            sa_target.HostelBlock = COALESCE(sa_src.HostelBlock, sa_target.HostelBlock),
            sa_target.RoomId = COALESCE(sa_src.RoomId, sa_target.RoomId),
            sa_target.HostelRoom = COALESCE(sa_src.HostelRoom, sa_target.HostelRoom),
            sa_target.BedId = COALESCE(sa_src.BedId, sa_target.BedId),
            sa_target.HostelBed = COALESCE(sa_src.HostelBed, sa_target.HostelBed),
            sa_target.HallTicketNumber = COALESCE(sa_src.HallTicketNumber, sa_target.HallTicketNumber),
            sa_target.PasswordHash = CASE WHEN p_PasswordHash IS NOT NULL AND TRIM(p_PasswordHash) <> '' THEN p_PasswordHash ELSE sa_target.PasswordHash END,
            sa_target.UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE sa_target.StudentId = v_StudentId;
    END IF;

    UPDATE `StudentAdmissions`
    SET
        IsApproved = 1,
        IsVerified = 1,
        Status = 'Approved',
        IsRejected = 0,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE AdmissionId = p_AdmissionId;

    -- HOSTEL ALLOCATION ON APPROVAL
    IF v_BedId IS NOT NULL AND v_HostelId IS NOT NULL AND v_RoomId IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM `hostel_student_allocations` WHERE `StudentId` = v_StudentId AND `Status` = 'Active') THEN
            INSERT INTO `hostel_student_allocations` (StudentId, HostelId, RoomId, BedId, JoiningDate, Status, CreatedAt)
            VALUES (v_StudentId, v_HostelId, v_RoomId, v_BedId, CURRENT_DATE, 'Active', CURRENT_TIMESTAMP);
            UPDATE `hostel_beds` SET `BedStatus` = 'Occupied' WHERE `BedId` = v_BedId;
        END IF;
    END IF;

    -- TRANSPORT ALLOCATION ON APPROVAL
    IF v_TransportRequired = 1 AND v_RouteId IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM `StudentTransportAssignments` WHERE `StudentId` = v_StudentId AND `IsActive` = 1) THEN
            INSERT INTO `StudentTransportAssignments` (StudentId, RouteId, PickupPointId, TransportType, StartDate, IsActive, CreatedAt)
            VALUES (v_StudentId, v_RouteId, v_PickupPointId, 'TwoWay', CURRENT_DATE, 1, CURRENT_TIMESTAMP(6));
        END IF;
    END IF;

    -- FEE SETUP & PAYMENT PLAN ON APPROVAL
    SELECT COALESCE(SUM(fsc.Amount), 0.00)
    INTO v_TotalAmount
    FROM `FeeStructureComponents` fsc
    WHERE fsc.FeeStructureId = v_FeeStructureId
      AND fsc.IsActive = 1
      AND (fsc.IsMandatory = 1 OR EXISTS (
          SELECT 1 FROM `AdmissionFeeSelections` afs
          WHERE afs.AdmissionId = p_AdmissionId
            AND afs.FeeStructureComponentId = fsc.FeeStructureComponentId
            AND afs.IsSelected = 1
      ));

    SELECT `StudentFeeId` INTO v_StudentFeeId
    FROM `StudentFees`
    WHERE `StudentId` = v_StudentId AND `FeeStructureId` = v_FeeStructureId
    LIMIT 1;

    IF v_StudentFeeId IS NULL THEN
        INSERT INTO `StudentFees` (StudentId, FeeStructureId, PaymentPlan, TotalAmount, ConcessionAmount, PayableAmount, PaidAmount, BalanceAmount, Status)
        VALUES (v_StudentId, v_FeeStructureId, v_PaymentPlan, v_TotalAmount, 0.00, v_TotalAmount, 0.00, v_TotalAmount, 'Pending');
        SET v_StudentFeeId = LAST_INSERT_ID();
    ELSE
        UPDATE `StudentFees` SET `PaymentPlan` = v_PaymentPlan, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentFeeId` = v_StudentFeeId;
    END IF;

    INSERT INTO `StudentFeeComponents` (StudentFeeId, FeeStructureComponentId, Amount, ConcessionAmount, PayableAmount, PaidAmount, BalanceAmount, DueDate, Status)
    SELECT v_StudentFeeId, fsc.FeeStructureComponentId, fsc.Amount, 0.00, fsc.Amount, 0.00, fsc.Amount, fsc.DueDate, 'Pending'
    FROM `FeeStructureComponents` fsc
    WHERE fsc.FeeStructureId = v_FeeStructureId
      AND fsc.IsActive = 1
      AND (fsc.IsMandatory = 1 OR EXISTS (
          SELECT 1 FROM `AdmissionFeeSelections` afs
          WHERE afs.AdmissionId = p_AdmissionId AND afs.FeeStructureComponentId = fsc.FeeStructureComponentId AND afs.IsSelected = 1
      ))
      AND NOT EXISTS (
          SELECT 1 FROM `StudentFeeComponents` sfc
          WHERE sfc.StudentFeeId = v_StudentFeeId AND sfc.FeeStructureComponentId = fsc.FeeStructureComponentId
      );

    SELECT `FeePaymentPlanId` INTO v_FeePaymentPlanId
    FROM `FeePaymentPlans`
    WHERE `StudentFeeId` = v_StudentFeeId AND `IsActive` = 1
    LIMIT 1;

    IF v_FeePaymentPlanId IS NULL THEN
        IF v_PaymentPlan = 'Schedule Payment' THEN
            INSERT INTO `FeePaymentPlans` (StudentFeeId, PlanName, TotalAmount, NumberOfInstallments, IsActive)
            VALUES (v_StudentFeeId, 'Schedule Payment', v_TotalAmount, 4, 1);
        ELSE
            INSERT INTO `FeePaymentPlans` (StudentFeeId, PlanName, TotalAmount, NumberOfInstallments, IsActive)
            VALUES (v_StudentFeeId, 'Full Payment', v_TotalAmount, 1, 1);
        END IF;
        SET v_FeePaymentPlanId = LAST_INSERT_ID();
    END IF;

    IF v_PaymentPlan = 'Schedule Payment' THEN
        SET v_InstallmentAmount = ROUND(v_TotalAmount / 4, 2);
        SET v_LastInstallmentAmount = v_TotalAmount - (v_InstallmentAmount * 3);

        INSERT INTO `FeeInstallments` (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 1, v_InstallmentAmount, 0.00, v_InstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `FeeInstallments` WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 1);

        INSERT INTO `FeeInstallments` (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 2, v_InstallmentAmount, 0.00, v_InstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `FeeInstallments` WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 2);

        INSERT INTO `FeeInstallments` (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 3, v_InstallmentAmount, 0.00, v_InstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `FeeInstallments` WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 3);

        INSERT INTO `FeeInstallments` (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 4, v_LastInstallmentAmount, 0.00, v_LastInstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 4 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `FeeInstallments` WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 4);
    ELSE
        INSERT INTO `FeeInstallments` (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 1, v_TotalAmount, 0.00, v_TotalAmount, CURRENT_TIMESTAMP, 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `FeeInstallments` WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 1);
    END IF;

    SELECT 1 AS Result;
END //

-- =============================================================================
-- 7. REJECT STUDENT ADMISSION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_RejectStudentAdmission`//
CREATE PROCEDURE `sp_RejectStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_RejectionReason VARCHAR(1000),
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
    WHERE `AdmissionId` = p_AdmissionId
      AND `IsActive` = 1;

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
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        c.CampusName,
        sc.CampusName AS SourceCampusName,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
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
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        c.CampusName,
        sc.CampusName AS SourceCampusName,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
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
    UPDATE `Students`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId
      AND (`IsActive` = 1 OR `IsActive` IS NULL);

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
    UPDATE `Students`
    SET `RollNo` = p_RollNo,
        `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId
      AND (`IsActive` = 1 OR `IsActive` IS NULL);

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
    DECLARE v_FeeStructureId INT DEFAULT NULL;
    DECLARE v_SelectedCount INT DEFAULT 0;

    SELECT `FeeStructureId`
    INTO v_FeeStructureId
    FROM `StudentAdmissions`
    WHERE `AdmissionId` = p_AdmissionId
      AND `IsActive` = 1
    LIMIT 1;

    IF v_FeeStructureId IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Admission not found or fee structure not assigned';
    END IF;

    DELETE afs
    FROM `AdmissionFeeSelections` afs
    INNER JOIN `FeeStructureComponents` fsc
        ON fsc.FeeStructureComponentId = afs.FeeStructureComponentId
    WHERE afs.AdmissionId = p_AdmissionId
      AND (fsc.FeeStructureId != v_FeeStructureId OR fsc.IsMandatory = 0);

    IF p_SelectedComponentIds IS NOT NULL AND JSON_LENGTH(p_SelectedComponentIds) > 0 THEN
        INSERT INTO `AdmissionFeeSelections` (AdmissionId, FeeStructureComponentId, IsSelected, CreatedAt)
        SELECT DISTINCT
            p_AdmissionId,
            jt.ComponentId,
            1,
            CURRENT_TIMESTAMP(6)
        FROM JSON_TABLE(
            p_SelectedComponentIds,
            '$[*]' COLUMNS (ComponentId INT PATH '

    SELECT COUNT(*)
    INTO v_SelectedCount
    FROM `AdmissionFeeSelections` afs
    INNER JOIN `FeeStructureComponents` fsc
        ON fsc.FeeStructureComponentId = afs.FeeStructureComponentId
    WHERE afs.AdmissionId = p_AdmissionId
      AND fsc.FeeStructureId = v_FeeStructureId
      AND afs.IsSelected = 1;

    SELECT v_SelectedCount AS SelectedOptionalFees;
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
        SET
            s.StudentName = CONCAT_WS(' ', NULLIF(TRIM(sa.FirstName), ''), NULLIF(TRIM(sa.LastName), '')),
            s.Photo = COALESCE(sa.StudentPhoto, s.Photo),
            s.Gender = COALESCE(sa.Gender, s.Gender),
            s.DateOfBirth = COALESCE(sa.DateOfBirth, s.DateOfBirth),
            s.BloodGroup = COALESCE(sa.BloodGroup, s.BloodGroup),
            s.Email = COALESCE(sa.StudentEmail, s.Email),
            s.MobileNumber = COALESCE(sa.StudentMobileNumber, s.MobileNumber),
            s.AadhaarNumber = COALESCE(sa.AadhaarNumber, s.AadhaarNumber),
            s.Nationality = COALESCE(sa.Nationality, s.Nationality),
            s.Religion = COALESCE(sa.Religion, s.Religion),
            s.Category = COALESCE(sa.Category, s.Category),
            s.Address = CONCAT_WS(', ', NULLIF(TRIM(sa.HouseDoorNumber), ''), NULLIF(TRIM(sa.StreetVillage), ''), NULLIF(TRIM(sa.City), ''), NULLIF(TRIM(sa.District), ''), NULLIF(TRIM(sa.State), ''), NULLIF(TRIM(sa.Pincode), '')),
            s.City = COALESCE(sa.City, s.City),
            s.District = COALESCE(sa.District, s.District),
            s.State = COALESCE(sa.State, s.State),
            s.Pincode = COALESCE(sa.Pincode, s.Pincode),
            s.BoardId = COALESCE(sa.BoardId, s.BoardId),
            s.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId),
            s.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId),
            s.GroupId = COALESCE(sa.GroupId, s.GroupId),
            s.ProgramId = COALESCE(sa.ProgramId, s.ProgramId),
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
            s.FatherEmail = COALESCE(sa.FatherEmail, s.FatherEmail),
            s.MotherName = COALESCE(sa.MotherName, s.MotherName),
            s.MotherOccupation = COALESCE(sa.MotherOccupation, s.MotherOccupation),
            s.MotherMobile = COALESCE(sa.MotherMobile, s.MotherMobile),
            s.MotherEmail = COALESCE(sa.MotherEmail, s.MotherEmail),
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
            u.FullName = CONCAT_WS(' ', NULLIF(TRIM(sa.FirstName), ''), NULLIF(TRIM(sa.LastName), '')),
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
)
        ) jt
        INNER JOIN `FeeStructureComponents` fsc
            ON fsc.FeeStructureComponentId = jt.ComponentId
        WHERE fsc.FeeStructureId = v_FeeStructureId
          AND fsc.IsActive = 1
          AND fsc.IsMandatory = 0
        ON DUPLICATE KEY UPDATE
            IsSelected = 1,
            UpdatedAt = CURRENT_TIMESTAMP(6);
    END IF;

    SELECT COUNT(*)
    INTO v_SelectedCount
    FROM `AdmissionFeeSelections` afs
    INNER JOIN `FeeStructureComponents` fsc
        ON fsc.FeeStructureComponentId = afs.FeeStructureComponentId
    WHERE afs.AdmissionId = p_AdmissionId
      AND fsc.FeeStructureId = v_FeeStructureId
      AND afs.IsSelected = 1;

    SELECT v_SelectedCount AS SelectedOptionalFees;
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
        SET
            s.StudentName = CONCAT_WS(' ', NULLIF(TRIM(sa.FirstName), ''), NULLIF(TRIM(sa.LastName), '')),
            s.Photo = COALESCE(sa.StudentPhoto, s.Photo),
            s.Gender = COALESCE(sa.Gender, s.Gender),
            s.DateOfBirth = COALESCE(sa.DateOfBirth, s.DateOfBirth),
            s.BloodGroup = COALESCE(sa.BloodGroup, s.BloodGroup),
            s.Email = COALESCE(sa.StudentEmail, s.Email),
            s.MobileNumber = COALESCE(sa.StudentMobileNumber, s.MobileNumber),
            s.AadhaarNumber = COALESCE(sa.AadhaarNumber, s.AadhaarNumber),
            s.Nationality = COALESCE(sa.Nationality, s.Nationality),
            s.Religion = COALESCE(sa.Religion, s.Religion),
            s.Category = COALESCE(sa.Category, s.Category),
            s.Address = CONCAT_WS(', ', NULLIF(TRIM(sa.HouseDoorNumber), ''), NULLIF(TRIM(sa.StreetVillage), ''), NULLIF(TRIM(sa.City), ''), NULLIF(TRIM(sa.District), ''), NULLIF(TRIM(sa.State), ''), NULLIF(TRIM(sa.Pincode), '')),
            s.City = COALESCE(sa.City, s.City),
            s.District = COALESCE(sa.District, s.District),
            s.State = COALESCE(sa.State, s.State),
            s.Pincode = COALESCE(sa.Pincode, s.Pincode),
            s.BoardId = COALESCE(sa.BoardId, s.BoardId),
            s.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId),
            s.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId),
            s.GroupId = COALESCE(sa.GroupId, s.GroupId),
            s.ProgramId = COALESCE(sa.ProgramId, s.ProgramId),
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
            s.FatherEmail = COALESCE(sa.FatherEmail, s.FatherEmail),
            s.MotherName = COALESCE(sa.MotherName, s.MotherName),
            s.MotherOccupation = COALESCE(sa.MotherOccupation, s.MotherOccupation),
            s.MotherMobile = COALESCE(sa.MotherMobile, s.MotherMobile),
            s.MotherEmail = COALESCE(sa.MotherEmail, s.MotherEmail),
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
            u.FullName = CONCAT_WS(' ', NULLIF(TRIM(sa.FirstName), ''), NULLIF(TRIM(sa.LastName), '')),
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


-- =============================================================================
-- Migration 017: Student Admission Persistent Idempotency & Sequence Sync
-- Creates StudentAdmissionIdempotencyRecords table and hardened stored procedures
-- =============================================================================

CREATE TABLE IF NOT EXISTS `StudentAdmissionIdempotencyRecords` (
    `Id` BIGINT NOT NULL AUTO_INCREMENT,
    `IdempotencyKey` VARCHAR(128) NOT NULL,
    `CampusId` INT NULL,
    `CreatedByUserId` INT NULL,
    `RequestHash` CHAR(64) NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    `AdmissionId` INT NULL,
    `AdmissionNo` VARCHAR(50) NULL,
    `HttpStatusCode` INT NULL,
    `ResponseJson` LONGTEXT NULL,
    `ErrorMessage` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `ExpiresAt` DATETIME(6) NOT NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_AdmissionIdempotency_Key` (`IdempotencyKey`),
    KEY `IX_AdmissionIdempotency_AdmissionId` (`AdmissionId`),
    KEY `IX_AdmissionIdempotency_CreatedAt` (`CreatedAt`),
    KEY `IX_AdmissionIdempotency_Hash_Created` (`RequestHash`, `CreatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

-- =============================================================================
-- 1. TRY BEGIN / RECLAIM ADMISSION IDEMPOTENCY LOCK
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_TryBeginAdmissionIdempotency`//
CREATE PROCEDURE `sp_TryBeginAdmissionIdempotency`
(
    IN p_IdempotencyKey VARCHAR(128),
    IN p_CampusId INT,
    IN p_CreatedByUserId INT,
    IN p_RequestHash CHAR(64),
    IN p_ExpiresAt DATETIME(6)
)
BEGIN
    DECLARE v_Inserted INT DEFAULT 0;
    DECLARE v_Reclaimed INT DEFAULT 0;

    INSERT IGNORE INTO `StudentAdmissionIdempotencyRecords`
    (
        `IdempotencyKey`,
        `CampusId`,
        `CreatedByUserId`,
        `RequestHash`,
        `Status`,
        `CreatedAt`,
        `UpdatedAt`,
        `ExpiresAt`
    )
    VALUES
    (
        TRIM(p_IdempotencyKey),
        p_CampusId,
        p_CreatedByUserId,
        p_RequestHash,
        'IN_PROGRESS',
        UTC_TIMESTAMP(6),
        UTC_TIMESTAMP(6),
        p_ExpiresAt
    );

    SET v_Inserted = ROW_COUNT();

    IF v_Inserted = 0 THEN
        -- Reclaim only if same payload hash previously failed with transient 5xx or abandoned in-progress (> 5 min)
        UPDATE `StudentAdmissionIdempotencyRecords`
        SET `Status` = 'IN_PROGRESS',
            `ErrorMessage` = NULL,
            `HttpStatusCode` = NULL,
            `UpdatedAt` = UTC_TIMESTAMP(6),
            `ExpiresAt` = p_ExpiresAt
        WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
          AND `RequestHash` = p_RequestHash
          AND `AdmissionId` IS NULL
          AND (
              (`Status` = 'FAILED' AND COALESCE(`HttpStatusCode`, 500) >= 500)
              OR (`Status` = 'IN_PROGRESS' AND `UpdatedAt` < DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 5 MINUTE))
          );

        SET v_Reclaimed = ROW_COUNT();
    END IF;

    SELECT
        IF(v_Inserted = 1 OR v_Reclaimed = 1, 1, 0) AS LockAcquired,
        `Id`,
        `IdempotencyKey`,
        `CampusId`,
        `CreatedByUserId`,
        `RequestHash`,
        `Status`,
        `AdmissionId`,
        `AdmissionNo`,
        `HttpStatusCode`,
        `ResponseJson`,
        `ErrorMessage`,
        `CreatedAt`,
        `UpdatedAt`,
        `ExpiresAt`
    FROM `StudentAdmissionIdempotencyRecords`
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
    LIMIT 1;
END //

-- =============================================================================
-- 2. COMPLETE ADMISSION IDEMPOTENCY RECORD (RUNS INSIDE ADMISSION TX)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CompleteAdmissionIdempotency`//
CREATE PROCEDURE `sp_CompleteAdmissionIdempotency`
(
    IN p_IdempotencyKey VARCHAR(128),
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_HttpStatusCode INT,
    IN p_ResponseJson LONGTEXT
)
BEGIN
    UPDATE `StudentAdmissionIdempotencyRecords`
    SET `Status` = 'COMPLETED',
        `AdmissionId` = p_AdmissionId,
        `AdmissionNo` = NULLIF(TRIM(p_AdmissionNo), ''),
        `HttpStatusCode` = COALESCE(p_HttpStatusCode, 201),
        `ResponseJson` = p_ResponseJson,
        `ErrorMessage` = NULL,
        `UpdatedAt` = UTC_TIMESTAMP(6)
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey);

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 3. FAIL ADMISSION IDEMPOTENCY RECORD (RUNS AFTER TX ROLLBACK)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_FailAdmissionIdempotency`//
CREATE PROCEDURE `sp_FailAdmissionIdempotency`
(
    IN p_IdempotencyKey VARCHAR(128),
    IN p_HttpStatusCode INT,
    IN p_ErrorMessage VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissionIdempotencyRecords`
    SET `Status` = 'FAILED',
        `AdmissionId` = NULL,
        `AdmissionNo` = NULL,
        `HttpStatusCode` = COALESCE(p_HttpStatusCode, 500),
        `ResponseJson` = NULL,
        `ErrorMessage` = LEFT(p_ErrorMessage, 1000),
        `UpdatedAt` = UTC_TIMESTAMP(6)
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
      AND `Status` != 'COMPLETED';

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 4. GET ADMISSION IDEMPOTENCY / RECOVERY RECORD
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAdmissionIdempotencyRecord`//
CREATE PROCEDURE `sp_GetAdmissionIdempotencyRecord`
(
    IN p_IdempotencyKey VARCHAR(128)
)
BEGIN
    SELECT
        `Id`,
        `IdempotencyKey`,
        `CampusId`,
        `CreatedByUserId`,
        `RequestHash`,
        `Status`,
        `AdmissionId`,
        `AdmissionNo`,
        `HttpStatusCode`,
        `ResponseJson`,
        `ErrorMessage`,
        `CreatedAt`,
        `UpdatedAt`,
        `ExpiresAt`
    FROM `StudentAdmissionIdempotencyRecords`
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
    LIMIT 1;
END //

DELIMITER ;
