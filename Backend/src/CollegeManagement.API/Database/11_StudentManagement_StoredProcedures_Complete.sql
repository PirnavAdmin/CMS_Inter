-- =============================================================================
-- SCRIPT: 11_StudentManagement_StoredProcedures_Complete.sql
-- PURPOSE: Complete MySQL Stored Procedures for Student Management Module
-- MODULES: Student Core, Student Admissions, Student Import, Promotions, Section & Roll Allocation
-- TARGET DATABASE: MySQL 8.0+ Instance (CMSDB / u819242402_CLM_System)
-- =============================================================================

SET SQL_SAFE_UPDATES = 0;

DELIMITER //

-- =============================================================================
-- SECTION 1: STUDENT CORE & PROFILE
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_UpdateStudentPhotoPath`//
CREATE PROCEDURE `sp_UpdateStudentPhotoPath`
(
    IN p_StudentId INT,
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    UPDATE `Students`
    SET `Photo` = p_PhotoPath,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateStudentDocumentPath`//
CREATE PROCEDURE `sp_UpdateStudentDocumentPath`
(
    IN p_StudentId INT,
    IN p_DocumentColumn VARCHAR(100),
    IN p_DocumentPath VARCHAR(500)
)
BEGIN
    CASE LOWER(TRIM(p_DocumentColumn))
        WHEN 'birthcertificate' THEN
            UPDATE `Students` SET `BirthCertificate` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'transfercertificate' THEN
            UPDATE `Students` SET `TransferCertificate` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'studycertificate' THEN
            UPDATE `Students` SET `StudyCertificate` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'aadhaardocument' THEN
            UPDATE `Students` SET `AadhaarDocument` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'communitycertificate' THEN
            UPDATE `Students` SET `CommunityCertificate` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'incomecertificate' THEN
            UPDATE `Students` SET `IncomeCertificate` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'castecertificate' THEN
            UPDATE `Students` SET `CasteCertificate` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'tenthcertificate' THEN
            UPDATE `Students` SET `TenthCertificate` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        WHEN 'marksmemo' THEN
            UPDATE `Students` SET `MarksMemo` = p_DocumentPath, `UpdatedAt` = CURRENT_TIMESTAMP(6) WHERE `StudentId` = p_StudentId;
        ELSE
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid document column name specified.';
    END CASE;

    SELECT ROW_COUNT() AS AffectedRows;
END //

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
    IN p_Pincode VARCHAR(10),
    IN p_BloodGroup VARCHAR(10),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(50),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_FatherMobile VARCHAR(20),
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150)
)
BEGIN
    UPDATE `Students`
    SET
        `MobileNumber` = p_MobileNumber,
        `Email` = p_Email,
        `Address` = p_Address,
        `City` = p_City,
        `District` = p_District,
        `State` = p_State,
        `Pincode` = p_Pincode,
        `BloodGroup` = p_BloodGroup,
        `AadhaarNumber` = p_AadhaarNumber,
        `Nationality` = p_Nationality,
        `Religion` = p_Religion,
        `PreviousSchool` = p_PreviousSchool,
        `PreviousHallTicketNumber` = p_PreviousHallTicketNumber,
        `PreviousBoard` = p_PreviousBoard,
        `PreviousYearOfPassing` = p_PreviousYearOfPassing,
        `PreviousPercentage` = p_PreviousPercentage,
        `FatherMobile` = p_FatherMobile,
        `FatherEmail` = p_FatherEmail,
        `MotherMobile` = p_MotherMobile,
        `MotherEmail` = p_MotherEmail,
        `GuardianMobile` = p_GuardianMobile,
        `GuardianEmail` = p_GuardianEmail,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;

    -- Sync Email to Central Users table if student has an account
    IF p_Email IS NOT NULL AND TRIM(p_Email) <> '' THEN
        UPDATE `Users`
        SET `Email` = TRIM(p_Email),
            `UpdatedAt` = CURRENT_TIMESTAMP(6)
        WHERE `StudentId` = p_StudentId;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- SECTION 2: STUDENT ADMISSIONS
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

DROP PROCEDURE IF EXISTS `sp_CreateAdmission`//
CREATE PROCEDURE `sp_CreateAdmission`
(
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
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
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150),
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
    IN p_TransportRequired VARCHAR(20),
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelBlock VARCHAR(100),
    IN p_HostelRoom VARCHAR(50),
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    DECLARE v_AdmissionId INT;

    INSERT INTO `StudentAdmissions`
    (
        AdmissionDate, AdmissionType, AdmissionQuota, BoardId, AcademicYearId,
        AcademicLevelId, GroupId, ProgramId, FirstName, LastName,
        Gender, DateOfBirth, BloodGroup, StudentEmail, StudentMobileNumber,
        StudentPhoto, AadhaarNumber, Nationality, Religion, Category,
        FatherName, FatherOccupation, FatherMobile, FatherEmail,
        MotherName, MotherOccupation, MotherMobile, MotherEmail,
        GuardianName, GuardianMobile, GuardianEmail, AnnualIncome,
        FeeStructureId, PaymentPlan, ScholarshipStatus, HouseDoorNumber,
        StreetVillage, City, District, State, Pincode,
        PreviousSchool, PreviousBoard, PreviousPercentage, PreviousYearOfPassing,
        Medium, SecondLanguage, StudentType, TransportRequired, BusRoute,
        PickupPoint, HostelBlock, HostelRoom, HostelBed, HallTicketNumber,
        Status, IsVerified, IsApproved, IsRejected, IsActive, CreatedAt
    )
    VALUES
    (
        p_AdmissionDate, p_AdmissionType, p_AdmissionQuota, p_BoardId, p_AcademicYearId,
        p_AcademicLevelId, p_GroupId, p_ProgramId, p_FirstName, p_LastName,
        p_Gender, p_DateOfBirth, p_BloodGroup, p_StudentEmail, p_StudentMobileNumber,
        p_StudentPhoto, p_AadhaarNumber, p_Nationality, p_Religion, p_Category,
        p_FatherName, p_FatherOccupation, p_FatherMobile, p_FatherEmail,
        p_MotherName, p_MotherOccupation, p_MotherMobile, p_MotherEmail,
        p_GuardianName, p_GuardianMobile, p_GuardianEmail, p_AnnualIncome,
        p_FeeStructureId, p_PaymentPlan, p_ScholarshipStatus, p_HouseDoorNumber,
        p_StreetVillage, p_City, p_District, p_State, p_Pincode,
        p_PreviousSchool, p_PreviousBoard, p_PreviousPercentage, p_PreviousYearOfPassing,
        p_Medium, p_SecondLanguage, p_StudentType, p_TransportRequired, p_BusRoute,
        p_PickupPoint, p_HostelBlock, p_HostelRoom, p_HostelBed, p_HallTicketNumber,
        'Submitted', 0, 0, 0, 1, CURRENT_TIMESTAMP(6)
    );

    SET v_AdmissionId = LAST_INSERT_ID();

    SELECT 
        sa.AdmissionId, sa.AdmissionNo, sa.AdmissionDate, sa.AdmissionType, sa.AdmissionQuota,
        sa.BoardId, b.BoardName, sa.AcademicYearId, ay.AcademicYearName,
        sa.AcademicLevelId, al.LevelName AS AcademicLevelName,
        sa.GroupId, g.GroupName, sa.ProgramId, p.ProgramName,
        sa.FirstName, sa.LastName, sa.Gender, sa.DateOfBirth, sa.BloodGroup,
        sa.StudentEmail, sa.StudentMobileNumber, sa.StudentPhoto,
        sa.AadhaarNumber, sa.Nationality, sa.Religion, sa.Category,
        sa.FatherName, sa.FatherOccupation, sa.FatherMobile, sa.FatherEmail,
        sa.MotherName, sa.MotherOccupation, sa.MotherMobile, sa.MotherEmail,
        sa.GuardianName, sa.GuardianMobile, sa.GuardianEmail, sa.AnnualIncome,
        sa.FeeStructureId, sa.PaymentPlan, sa.ScholarshipStatus,
        sa.HouseDoorNumber, sa.StreetVillage, sa.City, sa.District, sa.State, sa.Pincode,
        sa.PreviousSchool, sa.PreviousBoard, sa.PreviousPercentage, sa.PreviousYearOfPassing,
        sa.Medium, sa.SecondLanguage, sa.StudentType, sa.TransportRequired, sa.BusRoute,
        sa.PickupPoint, sa.HostelBlock, sa.HostelRoom, sa.HostelBed, sa.HallTicketNumber,
        sa.Status, sa.IsVerified, sa.IsApproved, sa.IsRejected, sa.IsActive, sa.CreatedAt, sa.UpdatedAt
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
    WHERE sa.AdmissionId = v_AdmissionId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateStudentAdmission`//
CREATE PROCEDURE `sp_UpdateStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
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
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150),
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
    IN p_TransportRequired VARCHAR(20),
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelBlock VARCHAR(100),
    IN p_HostelRoom VARCHAR(50),
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET
        AdmissionDate = p_AdmissionDate,
        AdmissionType = p_AdmissionType,
        AdmissionQuota = p_AdmissionQuota,
        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        GroupId = p_GroupId,
        ProgramId = p_ProgramId,
        FirstName = p_FirstName,
        LastName = p_LastName,
        Gender = p_Gender,
        DateOfBirth = p_DateOfBirth,
        BloodGroup = p_BloodGroup,
        StudentEmail = p_StudentEmail,
        StudentMobileNumber = p_StudentMobileNumber,
        StudentPhoto = COALESCE(p_StudentPhoto, StudentPhoto),
        AadhaarNumber = p_AadhaarNumber,
        Nationality = p_Nationality,
        Religion = p_Religion,
        Category = p_Category,
        FatherName = p_FatherName,
        FatherOccupation = p_FatherOccupation,
        FatherMobile = p_FatherMobile,
        FatherEmail = p_FatherEmail,
        MotherName = p_MotherName,
        MotherOccupation = p_MotherOccupation,
        MotherMobile = p_MotherMobile,
        MotherEmail = p_MotherEmail,
        GuardianName = p_GuardianName,
        GuardianMobile = p_GuardianMobile,
        GuardianEmail = p_GuardianEmail,
        AnnualIncome = p_AnnualIncome,
        FeeStructureId = p_FeeStructureId,
        PaymentPlan = p_PaymentPlan,
        ScholarshipStatus = p_ScholarshipStatus,
        HouseDoorNumber = p_HouseDoorNumber,
        StreetVillage = p_StreetVillage,
        City = p_City,
        District = p_District,
        State = p_State,
        Pincode = p_Pincode,
        PreviousSchool = p_PreviousSchool,
        PreviousBoard = p_PreviousBoard,
        PreviousPercentage = p_PreviousPercentage,
        PreviousYearOfPassing = p_PreviousYearOfPassing,
        Medium = p_Medium,
        SecondLanguage = p_SecondLanguage,
        StudentType = COALESCE(p_StudentType, StudentType),
        TransportRequired = COALESCE(p_TransportRequired, TransportRequired),
        BusRoute = COALESCE(p_BusRoute, BusRoute),
        PickupPoint = COALESCE(p_PickupPoint, PickupPoint),
        HostelBlock = COALESCE(p_HostelBlock, HostelBlock),
        HostelRoom = COALESCE(p_HostelRoom, HostelRoom),
        HostelBed = COALESCE(p_HostelBed, HostelBed),
        HallTicketNumber = COALESCE(p_HallTicketNumber, HallTicketNumber),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE AdmissionId = p_AdmissionId;

    SELECT 
        sa.AdmissionId, sa.AdmissionNo, sa.AdmissionDate, sa.AdmissionType, sa.AdmissionQuota,
        sa.BoardId, b.BoardName, sa.AcademicYearId, ay.AcademicYearName,
        sa.AcademicLevelId, al.LevelName AS AcademicLevelName,
        sa.GroupId, g.GroupName, sa.ProgramId, p.ProgramName,
        sa.FirstName, sa.LastName, sa.Gender, sa.DateOfBirth, sa.BloodGroup,
        sa.StudentEmail, sa.StudentMobileNumber, sa.StudentPhoto,
        sa.AadhaarNumber, sa.Nationality, sa.Religion, sa.Category,
        sa.FatherName, sa.FatherOccupation, sa.FatherMobile, sa.FatherEmail,
        sa.MotherName, sa.MotherOccupation, sa.MotherMobile, sa.MotherEmail,
        sa.GuardianName, sa.GuardianMobile, sa.GuardianEmail, sa.AnnualIncome,
        sa.FeeStructureId, sa.PaymentPlan, sa.ScholarshipStatus,
        sa.HouseDoorNumber, sa.StreetVillage, sa.City, sa.District, sa.State, sa.Pincode,
        sa.PreviousSchool, sa.PreviousBoard, sa.PreviousPercentage, sa.PreviousYearOfPassing,
        sa.Medium, sa.SecondLanguage, sa.StudentType, sa.TransportRequired, sa.BusRoute,
        sa.PickupPoint, sa.HostelBlock, sa.HostelRoom, sa.HostelBed, sa.HallTicketNumber,
        sa.Status, sa.IsVerified, sa.IsApproved, sa.IsRejected, sa.IsActive, sa.CreatedAt, sa.UpdatedAt
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
    WHERE sa.AdmissionId = p_AdmissionId;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteStudentAdmission`//
CREATE PROCEDURE `sp_DeleteStudentAdmission`
(
    IN p_AdmissionId INT
)
BEGIN
    DELETE FROM `StudentAdmissions`
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- SECTION 3: STUDENT IMPORT & TEMPLATE LOOKUPS
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetStudentImportTemplateLookups`//
CREATE PROCEDURE `sp_GetStudentImportTemplateLookups`()
BEGIN
    -- 1. Boards
    SELECT BoardCode AS Code, BoardName AS Name 
    FROM Boards 
    WHERE IsActive = 1 
    ORDER BY BoardCode;

    -- 2. Academic Years
    SELECT AcademicYearName 
    FROM AcademicYears 
    WHERE IsActive = 1 
    ORDER BY AcademicYearName DESC;

    -- 3. Academic Levels
    SELECT LevelCode AS Code, LevelName AS Name 
    FROM AcademicLevels 
    WHERE IsActive = 1 
    ORDER BY LevelCode;

    -- 4. Groups
    SELECT g.GroupCode AS Code, g.GroupName AS Name, b.BoardCode, al.LevelCode
    FROM `Groups` g
    JOIN Boards b ON g.BoardId = b.BoardId
    JOIN AcademicLevels al ON g.AcademicLevelId = al.AcademicLevelId
    WHERE g.IsActive = 1
    ORDER BY g.GroupCode;

    -- 5. Programs
    SELECT p.ProgramName, g.GroupCode
    FROM GroupPrograms gp
    JOIN `Groups` g ON gp.GroupId = g.GroupId
    JOIN Programs p ON gp.ProgramId = p.ProgramId
    WHERE p.IsActive = 1 AND g.IsActive = 1
    ORDER BY g.GroupCode, p.ProgramName;

    -- 6. Sections
    SELECT s.SectionName, g.GroupCode, IFNULL(p.ProgramName, '') AS ProgramName, IFNULL(ay.AcademicYearName, '') AS YearName, al.LevelCode, b.BoardCode
    FROM Sections s
    JOIN `Groups` g ON s.GroupId = g.GroupId
    JOIN Boards b ON s.BoardId = b.BoardId
    JOIN AcademicLevels al ON s.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN Programs p ON s.ProgramId = p.ProgramId
    LEFT JOIN AcademicYears ay ON s.AcademicYearId = ay.AcademicYearId
    WHERE s.IsActive = 1
    ORDER BY b.BoardCode, ay.AcademicYearName, al.LevelCode, g.GroupCode, s.SectionName;
END //

DROP PROCEDURE IF EXISTS `sp_GetStudentImportMasterDataCache`//
CREATE PROCEDURE `sp_GetStudentImportMasterDataCache`()
BEGIN
    -- 1. Boards
    SELECT BoardId, BoardCode, BoardName FROM Boards WHERE IsActive = 1;

    -- 2. Academic Years
    SELECT AcademicYearId, BoardId, AcademicYearName FROM AcademicYears WHERE IsActive = 1;

    -- 3. Academic Levels
    SELECT AcademicLevelId, LevelCode, LevelName FROM AcademicLevels WHERE IsActive = 1;

    -- 4. Groups
    SELECT GroupId, BoardId, AcademicYearId, AcademicLevelId, GroupCode, GroupName FROM `Groups` WHERE IsActive = 1;

    -- 5. GroupPrograms
    SELECT gp.GroupId, p.ProgramId, p.ProgramName
    FROM GroupPrograms gp
    JOIN Programs p ON gp.ProgramId = p.ProgramId
    JOIN `Groups` g ON gp.GroupId = g.GroupId
    WHERE p.IsActive = 1 AND g.IsActive = 1;

    -- 6. Sections
    SELECT SectionId, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId, SectionName FROM Sections WHERE IsActive = 1;
END //

DROP PROCEDURE IF EXISTS `sp_CheckExistingAdmissionNumbers`//
CREATE PROCEDURE `sp_CheckExistingAdmissionNumbers`
(
    IN p_AdmissionNosJson JSON
)
BEGIN
    SELECT s.AdmissionNo
    FROM `Students` s
    JOIN JSON_TABLE(p_AdmissionNosJson, '$[*]' COLUMNS (AdmissionNo VARCHAR(50) PATH '$')) jt
      ON LOWER(TRIM(s.AdmissionNo)) = LOWER(TRIM(jt.AdmissionNo));
END //

DROP PROCEDURE IF EXISTS `sp_ImportSingleStudent`//
CREATE PROCEDURE `sp_ImportSingleStudent`
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
    IN p_Pincode VARCHAR(10),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(50),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_ScholarshipAmount DECIMAL(18,2),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_FeeAmount DECIMAL(18,2),
    IN p_FeePaid DECIMAL(18,2),
    IN p_FeeStatus VARCHAR(50),
    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(10),
    IN p_CGPA DECIMAL(4,2),
    IN p_Rank INT,
    IN p_Remarks VARCHAR(500),
    IN p_PasswordHash VARCHAR(500),
    IN p_IsFirstLogin TINYINT(1)
)
BEGIN
    INSERT INTO `Students`
    (
        AdmissionId, AdmissionNo, RollNo, AdmissionDate, AdmissionType, AdmissionQuota,
        Medium, SecondLanguage, StudentName, Photo, Gender, DateOfBirth, BloodGroup,
        Email, MobileNumber, AadhaarNumber, Nationality, Religion, Category,
        Address, City, District, State, Pincode,
        BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId, SectionId,
        PreviousSchool, PreviousHallTicketNumber, PreviousBoard, PreviousYearOfPassing, PreviousPercentage,
        StudentCategory, ScholarshipStatus, ScholarshipAmount,
        FatherName, FatherOccupation, FatherMobile, FatherEmail,
        MotherName, MotherOccupation, MotherMobile, MotherEmail,
        GuardianName, GuardianMobile, GuardianEmail, AnnualIncome,
        FeeAmount, FeePaid, FeeStatus, AttendancePercentage, PerformanceGrade,
        CGPA, `Rank`, Remarks, PasswordHash, IsFirstLogin, Status, IsActive, CreatedAt
    )
    VALUES
    (
        NULL, p_AdmissionNo, p_RollNo, p_AdmissionDate, p_AdmissionType, p_AdmissionQuota,
        p_Medium, p_SecondLanguage, p_StudentName, p_Photo, p_Gender, p_DateOfBirth, p_BloodGroup,
        p_Email, p_MobileNumber, p_AadhaarNumber, p_Nationality, p_Religion, p_Category,
        p_Address, p_City, p_District, p_State, p_Pincode,
        p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_ProgramId, p_SectionId,
        p_PreviousSchool, p_PreviousHallTicketNumber, p_PreviousBoard, p_PreviousYearOfPassing, p_PreviousPercentage,
        p_StudentCategory, p_ScholarshipStatus, p_ScholarshipAmount,
        p_FatherName, p_FatherOccupation, p_FatherMobile, p_FatherEmail,
        p_MotherName, p_MotherOccupation, p_MotherMobile, p_MotherEmail,
        p_GuardianName, p_GuardianMobile, p_GuardianEmail, p_AnnualIncome,
        p_FeeAmount, p_FeePaid, p_FeeStatus, p_AttendancePercentage, p_PerformanceGrade,
        p_CGPA, p_Rank, p_Remarks, p_PasswordHash, p_IsFirstLogin, 'Active', 1, CURRENT_TIMESTAMP(6)
    );

    SELECT LAST_INSERT_ID() AS StudentId;
END //

DROP PROCEDURE IF EXISTS `sp_GetStudentCredentialsForExport`//
CREATE PROCEDURE `sp_GetStudentCredentialsForExport`
(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_AdmissionNo VARCHAR(50)
)
BEGIN
    SELECT 
        s.StudentId, s.AdmissionNo, s.RollNo, s.StudentName, s.DateOfBirth, s.Gender,
        s.MobileNumber, s.Email, b.BoardCode, ay.AcademicYearName, al.LevelCode,
        g.GroupCode, IFNULL(p.ProgramName, '') AS ProgramName, IFNULL(sec.SectionName, '') AS SectionName
    FROM `Students` s
    JOIN `Boards` b ON s.BoardId = b.BoardId
    JOIN `AcademicYears` ay ON s.AcademicYearId = ay.AcademicYearId
    JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
    JOIN `Groups` g ON s.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON s.ProgramId = p.ProgramId
    LEFT JOIN `Sections` sec ON s.SectionId = sec.SectionId
    WHERE s.IsActive = 1
      AND (s.AdmissionId IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId)
      AND (p_AdmissionNo IS NULL OR s.AdmissionNo = p_AdmissionNo)
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- SECTION 4: STUDENT PROMOTIONS
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetEligiblePromotionStudents`//
CREATE PROCEDURE `sp_GetEligiblePromotionStudents`
(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_Section VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevel VARCHAR(50),
    IN p_TargetGroupId INT,
    IN p_TargetSection VARCHAR(50),
    IN p_TargetMedium VARCHAR(50),
    IN p_Search VARCHAR(100),
    IN p_EligibilityStatus VARCHAR(50)
)
BEGIN
    SELECT
        s.StudentId,
        COALESCE(NULLIF(s.AdmissionNo, ''), NULLIF(s.RollNo, ''), CAST(s.StudentId AS CHAR)) AS StudentCode,
        s.StudentName,
        s.AcademicYearId,
        ay.AcademicYearName AS AcademicYear,
        s.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        s.GroupId,
        g.GroupName,
        s.ProgramId,
        p.ProgramName,
        COALESCE(sec.SectionName, '') AS Section,
        s.Medium,
        p_TargetAcademicYearId AS TargetAcademicYearId,
        tay.AcademicYearName AS TargetAcademicYear,
        p_TargetAcademicLevel AS TargetAcademicLevel,
        p_TargetGroupId AS TargetGroupId,
        tg.GroupName AS TargetGroupName,
        NULL AS TargetProgramId,
        NULL AS TargetProgramName,
        p_TargetSection AS TargetSection,
        p_TargetMedium AS TargetMedium,
        COALESCE(s.AttendancePercentage, 0) AS AttendancePercentage,
        'Not Checked' AS ResultStatus,
        '' AS FailedSubjects,
        0 AS Backlogs,
        'Eligible' AS EligibilityStatus,
        'Eligible for normal progression.' AS EligibilityReason
    FROM `Students` s
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `AcademicYears` tay ON tay.AcademicYearId = p_TargetAcademicYearId
    LEFT JOIN `Groups` tg ON tg.GroupId = p_TargetGroupId
    WHERE s.IsActive = 1
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (
          p_AcademicLevel IS NULL
          OR TRIM(p_AcademicLevel) = ''
          OR al.LevelName = TRIM(p_AcademicLevel)
          OR (TRIM(p_AcademicLevel) IN ('1st PUC', 'Intermediate 1st Year') AND s.AcademicLevelId IN (1, 5))
          OR (TRIM(p_AcademicLevel) IN ('2nd PUC', 'Intermediate 2nd Year') AND s.AcademicLevelId IN (2, 6))
      )
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId OR (p_GroupId IN (34, 37) AND s.GroupId IN (34, 37)))
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR s.ProgramId = p_ProgramId)
      AND (p_Section IS NULL OR TRIM(p_Section) = '' OR sec.SectionName = TRIM(p_Section))
      AND (p_Medium IS NULL OR TRIM(p_Medium) = '' OR s.Medium = TRIM(p_Medium))
      AND (
          p_Search IS NULL
          OR TRIM(p_Search) = ''
          OR s.StudentName LIKE CONCAT('%', p_Search, '%')
          OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
          OR s.RollNo LIKE CONCAT('%', p_Search, '%')
          OR CAST(s.StudentId AS CHAR) LIKE CONCAT('%', p_Search, '%')
      )
      AND (p_EligibilityStatus IS NULL OR TRIM(p_EligibilityStatus) = '' OR 'Eligible' = TRIM(p_EligibilityStatus))
      AND NOT EXISTS
      (
          SELECT 1
          FROM `PromotionHistories` ph
          WHERE ph.StudentId = s.StudentId
            AND ph.IsRolledBack = 0
            AND (p_TargetAcademicYearId IS NULL OR ph.ToAcademicYearId = p_TargetAcademicYearId)
      )
    ORDER BY s.StudentName;
END //

DROP PROCEDURE IF EXISTS `sp_GetPromotionHistory`//
CREATE PROCEDURE `sp_GetPromotionHistory`
(
    IN p_AcademicYearId INT,
    IN p_TargetAcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_TargetAcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(50),
    IN p_StudentId INT,
    IN p_Search VARCHAR(100),
    IN p_PromotionStatus VARCHAR(50),
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT
        ph.Id AS PromotionId,
        NULL AS PromotionBatchId,
        ph.StudentId,
        COALESCE(NULLIF(s.AdmissionNo, ''), NULLIF(s.RollNo, ''), CAST(s.StudentId AS CHAR)) AS StudentCode,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        s.StudentName,
        fay.AcademicYearName AS SourceAcademicYear,
        s.BoardId AS SourceBoardId,
        COALESCE(fb.BoardName, '') AS SourceBoard,
        ph.FromAcademicLevel AS SourceAcademicLevel,
        ph.FromGroupId AS SourceGroupId,
        fg.GroupName AS SourceGroup,
        ph.FromSection AS SourceSection,
        s.Medium AS SourceMedium,
        tay.AcademicYearName AS TargetAcademicYear,
        s.BoardId AS TargetBoardId,
        COALESCE(tb.BoardName, '') AS TargetBoard,
        ph.ToAcademicLevel AS TargetAcademicLevel,
        ph.ToGroupId AS TargetGroupId,
        tg.GroupName AS TargetGroup,
        ph.ToSection AS TargetSection,
        s.Medium AS TargetMedium,
        ph.Status AS PromotionStatus,
        ph.PromotionDate,
        ph.PromotedBy,
        ph.IsRolledBack AS RollbackStatus,
        ph.RollbackDate AS RollbackDate,
        ph.RollbackRemarks AS RollbackReason
    FROM `PromotionHistories` ph
    INNER JOIN `Students` s ON s.StudentId = ph.StudentId
    LEFT JOIN `AcademicYears` fay ON fay.AcademicYearId = ph.FromAcademicYearId
    LEFT JOIN `AcademicYears` tay ON tay.AcademicYearId = ph.ToAcademicYearId
    LEFT JOIN `Boards` fb ON fb.BoardId = s.BoardId
    LEFT JOIN `Boards` tb ON tb.BoardId = s.BoardId
    LEFT JOIN `Groups` fg ON fg.GroupId = ph.FromGroupId
    LEFT JOIN `Groups` tg ON tg.GroupId = ph.ToGroupId
    WHERE (p_AcademicYearId IS NULL OR ph.FromAcademicYearId = p_AcademicYearId)
      AND (p_TargetAcademicYearId IS NULL OR ph.ToAcademicYearId = p_TargetAcademicYearId)
      AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' OR ph.FromAcademicLevel = TRIM(p_AcademicLevel))
      AND (p_TargetAcademicLevel IS NULL OR TRIM(p_TargetAcademicLevel) = '' OR ph.ToAcademicLevel = TRIM(p_TargetAcademicLevel))
      AND (p_GroupId IS NULL OR ph.FromGroupId = p_GroupId)
      AND (p_Section IS NULL OR TRIM(p_Section) = '' OR ph.FromSection = TRIM(p_Section))
      AND (p_StudentId IS NULL OR ph.StudentId = p_StudentId)
      AND (
          p_Search IS NULL
          OR TRIM(p_Search) = ''
          OR s.StudentName LIKE CONCAT('%', p_Search, '%')
          OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
          OR s.RollNo LIKE CONCAT('%', p_Search, '%')
      )
      AND (
          p_PromotionStatus IS NULL
          OR TRIM(p_PromotionStatus) = ''
          OR ph.Status = TRIM(p_PromotionStatus)
          OR (TRIM(p_PromotionStatus) = 'RolledBack' AND ph.IsRolledBack = 1)
      )
      AND (p_FromDate IS NULL OR ph.PromotionDate >= p_FromDate)
      AND (p_ToDate IS NULL OR ph.PromotionDate < DATE_ADD(p_ToDate, INTERVAL 1 DAY))
    ORDER BY ph.Id DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetPromotionReport`//
CREATE PROCEDURE `sp_GetPromotionReport`
(
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT
        COALESCE(ph.FromAcademicYearId, 0) AS AcademicYearId,
        COALESCE(ay.AcademicYearName, 'Unknown') AS AcademicYearName,
        COUNT(ph.Id) AS TotalStudents,
        SUM(CASE WHEN ph.IsRolledBack = 0 THEN 1 ELSE 0 END) AS PromotedCount,
        SUM(CASE WHEN ph.IsRolledBack = 1 THEN 1 ELSE 0 END) AS FailedCount,
        SUM(CASE WHEN ph.IsRolledBack = 1 THEN 1 ELSE 0 END) AS RetainedCount,
        ROUND(
            (SUM(CASE WHEN ph.IsRolledBack = 0 THEN 1 ELSE 0 END) / NULLIF(COUNT(ph.Id), 0)) * 100,
            2
        ) AS PromotionPercentage,
        COALESCE(ph.FromGroupId, 0) AS GroupId,
        COALESCE(g.GroupName, 'General') AS GroupName
    FROM `PromotionHistories` ph
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = ph.FromAcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = ph.FromGroupId
    WHERE (p_AcademicYearId IS NULL OR ph.FromAcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR ph.FromGroupId = p_GroupId)
      AND (p_FromDate IS NULL OR ph.PromotionDate >= p_FromDate)
      AND (p_ToDate IS NULL OR ph.PromotionDate < DATE_ADD(p_ToDate, INTERVAL 1 DAY))
    GROUP BY
        ph.FromAcademicYearId,
        ay.AcademicYearName,
        ph.FromGroupId,
        g.GroupName
    ORDER BY
        AcademicYearName,
        GroupName;
END //

DROP PROCEDURE IF EXISTS `sp_AllocateStudentGroup`//
CREATE PROCEDURE `sp_AllocateStudentGroup`
(
    IN p_StudentIdsJson JSON,
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevelId INT,
    IN p_TargetGroupId INT
)
BEGIN
    UPDATE `Students`
    SET `AcademicYearId` = p_TargetAcademicYearId,
        `AcademicLevelId` = COALESCE(p_TargetAcademicLevelId, AcademicLevelId),
        `GroupId` = p_TargetGroupId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt)
      AND `IsActive` = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_AllocateStudentProgram`//
CREATE PROCEDURE `sp_AllocateStudentProgram`
(
    IN p_StudentIdsJson JSON,
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevelId INT,
    IN p_TargetGroupId INT,
    IN p_TargetProgramId INT
)
BEGIN
    UPDATE `Students`
    SET `AcademicYearId` = CASE WHEN p_TargetAcademicYearId > 0 THEN p_TargetAcademicYearId ELSE AcademicYearId END,
        `AcademicLevelId` = COALESCE(p_TargetAcademicLevelId, AcademicLevelId),
        `GroupId` = CASE WHEN p_TargetGroupId > 0 THEN p_TargetGroupId ELSE GroupId END,
        `ProgramId` = p_TargetProgramId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt)
      AND `IsActive` = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_AllocateStudentSection`//
CREATE PROCEDURE `sp_AllocateStudentSection`
(
    IN p_StudentIdsJson JSON,
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevelId INT,
    IN p_TargetGroupId INT,
    IN p_TargetSectionId INT
)
BEGIN
    UPDATE `Students`
    SET `AcademicYearId` = p_TargetAcademicYearId,
        `AcademicLevelId` = COALESCE(p_TargetAcademicLevelId, AcademicLevelId),
        `GroupId` = p_TargetGroupId,
        `SectionId` = COALESCE(p_TargetSectionId, SectionId),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt)
      AND `IsActive` = 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_PromoteSingleStudent`//
CREATE PROCEDURE `sp_PromoteSingleStudent`
(
    IN p_StudentId INT,
    IN p_PromotionBatchId VARCHAR(50),
    IN p_FromBoardId INT,
    IN p_ToBoardId INT,
    IN p_FromAcademicYearId INT,
    IN p_ToAcademicYearId INT,
    IN p_FromClassId INT,
    IN p_ToClassId INT,
    IN p_FromSectionId INT,
    IN p_ToSectionId INT,
    IN p_FromGroupId INT,
    IN p_ToGroupId INT,
    IN p_FromAcademicLevel VARCHAR(50),
    IN p_ToAcademicLevel VARCHAR(50),
    IN p_FromSection VARCHAR(50),
    IN p_ToSection VARCHAR(50),
    IN p_PromotedBy VARCHAR(100),
    IN p_TargetMedium VARCHAR(50)
)
BEGIN
    INSERT INTO `PromotionHistories`
    (
        StudentId, PromotionBatchId, FromBoardId, ToBoardId,
        FromAcademicYearId, ToAcademicYearId, FromClassId, ToClassId,
        FromSectionId, ToSectionId, FromGroupId, ToGroupId,
        FromAcademicLevel, ToAcademicLevel, FromSection, ToSection,
        Status, PromotionDate, PromotedBy, IsRolledBack, CreatedAt
    )
    VALUES
    (
        p_StudentId, p_PromotionBatchId, p_FromBoardId, p_ToBoardId,
        p_FromAcademicYearId, p_ToAcademicYearId, p_FromClassId, p_ToClassId,
        p_FromSectionId, p_ToSectionId, p_FromGroupId, p_ToGroupId,
        p_FromAcademicLevel, p_ToAcademicLevel, p_FromSection, p_ToSection,
        'Promoted', CURRENT_TIMESTAMP(6), p_PromotedBy, 0, CURRENT_TIMESTAMP(6)
    );

    UPDATE `Students`
    SET `AcademicYearId` = p_ToAcademicYearId,
        `BoardId` = COALESCE(p_ToBoardId, BoardId),
        `AcademicLevelId` = COALESCE(p_ToClassId, AcademicLevelId),
        `GroupId` = p_ToGroupId,
        `SectionId` = COALESCE(p_ToSectionId, SectionId),
        `Medium` = COALESCE(p_TargetMedium, Medium),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;
END //

DROP PROCEDURE IF EXISTS `sp_RollbackPromotionRecord`//
CREATE PROCEDURE `sp_RollbackPromotionRecord`
(
    IN p_PromotionId INT,
    IN p_RollbackBy VARCHAR(100),
    IN p_Reason VARCHAR(500)
)
BEGIN
    DECLARE v_StudentId INT;
    DECLARE v_FromAcademicYearId INT;
    DECLARE v_FromClassId INT;
    DECLARE v_FromGroupId INT;
    DECLARE v_FromSectionId INT;

    SELECT 
        ph.StudentId, ph.FromAcademicYearId, ph.FromClassId, ph.FromGroupId, ph.FromSectionId
    INTO
        v_StudentId, v_FromAcademicYearId, v_FromClassId, v_FromGroupId, v_FromSectionId
    FROM `PromotionHistories` ph
    WHERE ph.Id = p_PromotionId;

    IF v_StudentId IS NOT NULL THEN
        UPDATE `Students`
        SET `AcademicYearId` = v_FromAcademicYearId,
            `AcademicLevelId` = COALESCE(NULLIF(v_FromClassId, 0), AcademicLevelId),
            `GroupId` = v_FromGroupId,
            `SectionId` = COALESCE(NULLIF(v_FromSectionId, 0), SectionId),
            `UpdatedAt` = CURRENT_TIMESTAMP(6)
        WHERE `StudentId` = v_StudentId;

        UPDATE `PromotionHistories`
        SET `IsRollback` = 1,
            `IsRolledBack` = 1,
            `Status` = 'RolledBack',
            `RollbackDate` = CURRENT_TIMESTAMP(6),
            `RollbackBy` = p_RollbackBy,
            `RollbackRemarks` = p_Reason
        WHERE `Id` = p_PromotionId;
    END IF;
END //

-- =============================================================================
-- SECTION 5: SECTION & ROLL NUMBER ALLOCATION
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetStudentsAndSectionsForAllocation`//
CREATE PROCEDURE `sp_GetStudentsAndSectionsForAllocation`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    -- 1. Students in admission order
    SELECT
        s.StudentId,
        s.AdmissionNo,
        s.StudentName,
        s.AdmissionDate,
        s.SectionId
    FROM `Students` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
    ORDER BY
        s.AdmissionDate ASC,
        s.StudentId ASC;

    -- 2. Active Sections
    SELECT
        s.SectionId,
        s.SectionName,
        s.MaximumStrength,
        s.IsActive
    FROM `Sections` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND s.IsActive = 1
    ORDER BY
        s.SectionName ASC;
END //

DROP PROCEDURE IF EXISTS `sp_ConfirmStudentSectionAllocation`//
CREATE PROCEDURE `sp_ConfirmStudentSectionAllocation`
(
    IN p_StudentId INT,
    IN p_SectionId INT
)
BEGIN
    UPDATE `Students`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId
      AND `SectionId` IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_GetAllocatedStudentsForRollNumbering`//
CREATE PROCEDURE `sp_GetAllocatedStudentsForRollNumbering`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    SELECT
        s.StudentId,
        s.AdmissionNo,
        s.StudentName,
        s.SectionId,
        sec.SectionName,
        s.RollNo
    FROM `Students` s
    INNER JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND s.SectionId IS NOT NULL
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
    ORDER BY
        sec.SectionName ASC,
        s.StudentName ASC,
        s.StudentId ASC;
END //

DROP PROCEDURE IF EXISTS `sp_ConfirmStudentRollNumberAllocation`//
CREATE PROCEDURE `sp_ConfirmStudentRollNumberAllocation`
(
    IN p_StudentId INT,
    IN p_RollNo VARCHAR(50)
)
BEGIN
    UPDATE `Students`
    SET `RollNo` = p_RollNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId
      AND (`RollNo` IS NULL OR TRIM(`RollNo`) = '');

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateStudentSectionRollAllocation`//
CREATE PROCEDURE `sp_UpdateStudentSectionRollAllocation`
(
    IN p_StudentId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_RollNo VARCHAR(50)
)
BEGIN
    UPDATE `Students`
    SET `GroupId` = p_GroupId,
        `ProgramId` = p_ProgramId,
        `SectionId` = p_SectionId,
        `RollNo` = p_RollNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_GetMaxRollNumber`//
CREATE PROCEDURE `sp_GetMaxRollNumber`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT
)
BEGIN
    SELECT RollNo
    FROM `Students`
    WHERE AcademicYearId = p_AcademicYearId
      AND AcademicLevelId = p_AcademicLevelId
      AND GroupId = p_GroupId
      AND RollNo IS NOT NULL
      AND TRIM(RollNo) <> '';
END //

DELIMITER ;

