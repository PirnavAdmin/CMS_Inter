-- =============================================================================
-- SCRIPT: AddHostelTransportToStudents.sql
-- PURPOSE: Add Hostel & Transport allocation support to Students table and Stored Procedures
-- MODULE: Student Management
-- =============================================================================

SET SQL_SAFE_UPDATES = 0;

-- 1. ADD MISSING RESIDENTIAL & TRANSPORT COLUMNS TO Students TABLE
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `StudentType` VARCHAR(30) NULL AFTER `Remarks`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `TransportRequired` TINYINT(1) NULL AFTER `StudentType`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `BusType` VARCHAR(20) NULL AFTER `TransportRequired`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `RouteId` INT NULL AFTER `BusType`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `BusRoute` VARCHAR(100) NULL AFTER `RouteId`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `PickupPointId` INT NULL AFTER `BusRoute`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `PickupPoint` VARCHAR(100) NULL AFTER `PickupPointId`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `HostelId` INT NULL AFTER `PickupPoint`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `HostelBlock` VARCHAR(50) NULL AFTER `HostelId`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `RoomId` INT NULL AFTER `HostelBlock`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `HostelRoom` VARCHAR(50) NULL AFTER `RoomId`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `BedId` INT NULL AFTER `HostelRoom`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `HostelBed` VARCHAR(50) NULL AFTER `BedId`;
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `HallTicketNumber` VARCHAR(50) NULL AFTER `HostelBed`;

DELIMITER //

-- 2. sp_ApproveStudentAdmission
DROP PROCEDURE IF EXISTS `sp_ApproveStudentAdmission`//
CREATE PROCEDURE `sp_ApproveStudentAdmission`(
    IN p_AdmissionId INT,
    IN p_PasswordHash VARCHAR(255)
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

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

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
    FROM StudentAdmissions
    WHERE AdmissionId = p_AdmissionId
      AND IsActive = 1;

    IF v_AdmissionExists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission record not found or inactive.';
    END IF;

    IF v_FeeStructureId IS NULL OR NOT EXISTS (SELECT 1 FROM FeeStructures WHERE FeeStructureId = v_FeeStructureId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A valid and active Fee Structure must be selected prior to admission approval.';
    END IF;

    IF v_PaymentPlan IS NULL OR TRIM(v_PaymentPlan) = '' THEN
        SET v_PaymentPlan = 'Schedule Payment';
    END IF;

    SELECT StudentId INTO v_StudentId
    FROM Students
    WHERE AdmissionId = p_AdmissionId
    LIMIT 1;

    IF v_StudentId IS NULL THEN
        INSERT INTO Students
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
            GuardianEmail,
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
            sa.GuardianEmail,
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
        FROM StudentAdmissions sa
        WHERE sa.AdmissionId = p_AdmissionId;

        SET v_StudentId = LAST_INSERT_ID();
    ELSE
        UPDATE Students sa_target
        JOIN StudentAdmissions sa_src ON sa_src.AdmissionId = p_AdmissionId
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

    UPDATE StudentAdmissions
    SET
        IsApproved = 1,
        IsVerified = 1,
        Status = 'Approved',
        IsRejected = 0,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE AdmissionId = p_AdmissionId;

    -- HOSTEL ALLOCATION ON APPROVAL
    IF v_BedId IS NOT NULL AND v_HostelId IS NOT NULL AND v_RoomId IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM hostel_student_allocations WHERE StudentId = v_StudentId AND Status = 'Active') THEN
            INSERT INTO hostel_student_allocations (StudentId, HostelId, RoomId, BedId, JoiningDate, Status, CreatedAt)
            VALUES (v_StudentId, v_HostelId, v_RoomId, v_BedId, CURRENT_DATE, 'Active', CURRENT_TIMESTAMP);
            UPDATE hostel_beds SET BedStatus = 'Occupied' WHERE BedId = v_BedId;
        END IF;
    END IF;

    -- TRANSPORT ALLOCATION ON APPROVAL
    IF v_TransportRequired = 1 AND v_RouteId IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM StudentTransportAssignments WHERE StudentId = v_StudentId AND IsActive = 1) THEN
            INSERT INTO StudentTransportAssignments (StudentId, RouteId, PickupPointId, TransportType, StartDate, IsActive, CreatedAt)
            VALUES (v_StudentId, v_RouteId, v_PickupPointId, 'TwoWay', CURRENT_DATE, 1, CURRENT_TIMESTAMP(6));
        END IF;
    END IF;

    -- FEE SETUP & PAYMENT PLAN ON APPROVAL
    SELECT COALESCE(SUM(fsc.Amount), 0.00)
    INTO v_TotalAmount
    FROM FeeStructureComponents fsc
    WHERE fsc.FeeStructureId = v_FeeStructureId
      AND fsc.IsActive = 1
      AND (fsc.IsMandatory = 1 OR EXISTS (
          SELECT 1 FROM AdmissionFeeSelections afs
          WHERE afs.AdmissionId = p_AdmissionId
            AND afs.FeeStructureComponentId = fsc.FeeStructureComponentId
            AND afs.IsSelected = 1
      ));

    SELECT StudentFeeId INTO v_StudentFeeId
    FROM StudentFees
    WHERE StudentId = v_StudentId AND FeeStructureId = v_FeeStructureId
    LIMIT 1;

    IF v_StudentFeeId IS NULL THEN
        INSERT INTO StudentFees (StudentId, FeeStructureId, PaymentPlan, TotalAmount, ConcessionAmount, PayableAmount, PaidAmount, BalanceAmount, Status)
        VALUES (v_StudentId, v_FeeStructureId, v_PaymentPlan, v_TotalAmount, 0.00, v_TotalAmount, 0.00, v_TotalAmount, 'Pending');
        SET v_StudentFeeId = LAST_INSERT_ID();
    ELSE
        UPDATE StudentFees SET PaymentPlan = v_PaymentPlan, UpdatedAt = CURRENT_TIMESTAMP(6) WHERE StudentFeeId = v_StudentFeeId;
    END IF;

    INSERT INTO StudentFeeComponents (StudentFeeId, FeeStructureComponentId, Amount, ConcessionAmount, PayableAmount, PaidAmount, BalanceAmount, DueDate, Status)
    SELECT v_StudentFeeId, fsc.FeeStructureComponentId, fsc.Amount, 0.00, fsc.Amount, 0.00, fsc.Amount, fsc.DueDate, 'Pending'
    FROM FeeStructureComponents fsc
    WHERE fsc.FeeStructureId = v_FeeStructureId
      AND fsc.IsActive = 1
      AND (fsc.IsMandatory = 1 OR EXISTS (
          SELECT 1 FROM AdmissionFeeSelections afs
          WHERE afs.AdmissionId = p_AdmissionId AND afs.FeeStructureComponentId = fsc.FeeStructureComponentId AND afs.IsSelected = 1
      ))
      AND NOT EXISTS (
          SELECT 1 FROM StudentFeeComponents sfc
          WHERE sfc.StudentFeeId = v_StudentFeeId AND sfc.FeeStructureComponentId = fsc.FeeStructureComponentId
      );

    SELECT FeePaymentPlanId INTO v_FeePaymentPlanId
    FROM FeePaymentPlans
    WHERE StudentFeeId = v_StudentFeeId AND IsActive = 1
    LIMIT 1;

    IF v_FeePaymentPlanId IS NULL THEN
        IF v_PaymentPlan = 'Schedule Payment' THEN
            INSERT INTO FeePaymentPlans (StudentFeeId, PlanName, TotalAmount, NumberOfInstallments, IsActive)
            VALUES (v_StudentFeeId, 'Schedule Payment', v_TotalAmount, 4, 1);
        ELSE
            INSERT INTO FeePaymentPlans (StudentFeeId, PlanName, TotalAmount, NumberOfInstallments, IsActive)
            VALUES (v_StudentFeeId, 'Full Payment', v_TotalAmount, 1, 1);
        END IF;
        SET v_FeePaymentPlanId = LAST_INSERT_ID();
    END IF;

    IF v_PaymentPlan = 'Schedule Payment' THEN
        SET v_InstallmentAmount = ROUND(v_TotalAmount / 4, 2);
        SET v_LastInstallmentAmount = v_TotalAmount - (v_InstallmentAmount * 3);

        INSERT INTO FeeInstallments (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 1, v_InstallmentAmount, 0.00, v_InstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 1 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM FeeInstallments WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 1);

        INSERT INTO FeeInstallments (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 2, v_InstallmentAmount, 0.00, v_InstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 2 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM FeeInstallments WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 2);

        INSERT INTO FeeInstallments (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 3, v_InstallmentAmount, 0.00, v_InstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 3 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM FeeInstallments WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 3);

        INSERT INTO FeeInstallments (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 4, v_LastInstallmentAmount, 0.00, v_LastInstallmentAmount, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 4 MONTH), 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM FeeInstallments WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 4);
    ELSE
        INSERT INTO FeeInstallments (FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status)
        SELECT v_FeePaymentPlanId, 1, v_TotalAmount, 0.00, v_TotalAmount, CURRENT_TIMESTAMP, 'Pending'
        FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM FeeInstallments WHERE FeePaymentPlanId = v_FeePaymentPlanId AND InstallmentNumber = 1);
    END IF;

    COMMIT;
    SELECT 1 AS Result;
END //

-- 3. sp_CreateStudent
DROP PROCEDURE IF EXISTS `sp_CreateStudent`//
CREATE PROCEDURE `sp_CreateStudent`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RollNo VARCHAR(50),
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(50),
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
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150),
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
    IN p_IsFirstLogin BOOLEAN,
    IN p_IsActive BOOLEAN,
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
    DECLARE v_AdmissionId INT DEFAULT NULL;
    DECLARE v_FeeStructureId INT DEFAULT NULL;
    DECLARE v_PaymentPlan VARCHAR(50) DEFAULT NULL;
    DECLARE v_NewStudentId INT;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AdmissionNo is required';
    END IF;

    IF p_StudentName IS NULL OR TRIM(p_StudentName) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'StudentName is required';
    END IF;

    SELECT AdmissionId, FeeStructureId, PaymentPlan
    INTO v_AdmissionId, v_FeeStructureId, v_PaymentPlan
    FROM StudentAdmissions
    WHERE AdmissionNo = p_AdmissionNo
      AND IsActive = 1
      AND IsVerified = 1
      AND IsApproved = 1
      AND IsRejected = 0
    LIMIT 1;

    INSERT INTO Students
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
        PreviousHallTicketNumber,
        PreviousBoard,
        PreviousYearOfPassing,
        PreviousPercentage,
        StudentCategory,
        ScholarshipStatus,
        ScholarshipAmount,
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
        GuardianEmail,
        AnnualIncome,
        FeeAmount,
        FeePaid,
        FeeStatus,
        AttendancePercentage,
        PerformanceGrade,
        CGPA,
        Rank,
        Remarks,
        PasswordHash,
        IsFirstLogin,
        Status,
        IsActive,
        CreatedAt,
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
    VALUES
    (
        v_AdmissionId,
        p_AdmissionNo,
        NULLIF(p_RollNo, ''),
        p_AdmissionDate,
        p_AdmissionType,
        p_AdmissionQuota,
        p_Medium,
        p_SecondLanguage,
        p_StudentName,
        p_Photo,
        p_Gender,
        p_DateOfBirth,
        p_BloodGroup,
        p_Email,
        p_MobileNumber,
        p_AadhaarNumber,
        p_Nationality,
        p_Religion,
        p_Category,
        p_Address,
        p_City,
        p_District,
        p_State,
        p_Pincode,
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevelId,
        p_GroupId,
        p_ProgramId,
        v_FeeStructureId,
        v_PaymentPlan,
        NULLIF(p_SectionId, 0),
        p_PreviousSchool,
        COALESCE(p_HallTicketNumber, p_PreviousHallTicketNumber),
        p_PreviousBoard,
        p_PreviousYearOfPassing,
        p_PreviousPercentage,
        p_StudentCategory,
        p_ScholarshipStatus,
        p_ScholarshipAmount,
        p_FatherName,
        p_FatherOccupation,
        p_FatherMobile,
        p_FatherEmail,
        p_MotherName,
        p_MotherOccupation,
        p_MotherMobile,
        p_MotherEmail,
        p_GuardianName,
        p_GuardianMobile,
        p_GuardianEmail,
        p_AnnualIncome,
        COALESCE(p_FeeAmount, 0),
        COALESCE(p_FeePaid, 0),
        p_FeeStatus,
        COALESCE(p_AttendancePercentage, 0),
        p_PerformanceGrade,
        p_CGPA,
        p_Rank,
        p_Remarks,
        COALESCE(p_PasswordHash, ''),
        COALESCE(p_IsFirstLogin, 1),
        'Active',
        COALESCE(p_IsActive, 1),
        CURRENT_TIMESTAMP(6),
        p_StudentType,
        p_TransportRequired,
        p_BusType,
        p_RouteId,
        p_BusRoute,
        p_PickupPointId,
        p_PickupPoint,
        p_HostelId,
        p_HostelBlock,
        p_RoomId,
        p_HostelRoom,
        p_BedId,
        p_HostelBed,
        p_HallTicketNumber,
        COALESCE(p_CampusId, 1)
    );

    SET v_NewStudentId = LAST_INSERT_ID();
    CALL sp_GetStudentById(v_NewStudentId);
END //

-- 4. sp_UpdateStudent
DROP PROCEDURE IF EXISTS `sp_UpdateStudent`//
CREATE PROCEDURE `sp_UpdateStudent`(
    IN p_StudentId INT,
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_AdmissionDate DATETIME,
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
    IN p_FatherEmail VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_MotherEmail VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_GuardianEmail VARCHAR(150),
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
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(1) INTO v_Exists
    FROM Students
    WHERE StudentId = p_StudentId;

    IF v_Exists = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
    END IF;

    -- Validate foreign key references if supplied
    IF p_BoardId IS NOT NULL AND p_BoardId > 0 AND NOT EXISTS (SELECT 1 FROM Boards WHERE BoardId = p_BoardId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive BoardId';
    END IF;

    IF p_AcademicYearId IS NOT NULL AND p_AcademicYearId > 0 AND NOT EXISTS (SELECT 1 FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive AcademicYearId';
    END IF;

    IF p_AcademicLevelId IS NOT NULL AND p_AcademicLevelId > 0 AND NOT EXISTS (SELECT 1 FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive AcademicLevelId';
    END IF;

    IF p_GroupId IS NOT NULL AND p_GroupId > 0 AND NOT EXISTS (SELECT 1 FROM Groups WHERE GroupId = p_GroupId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive GroupId';
    END IF;

    IF p_ProgramId IS NOT NULL AND p_ProgramId > 0 AND NOT EXISTS (SELECT 1 FROM Programs WHERE ProgramId = p_ProgramId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive ProgramId';
    END IF;

    IF p_SectionId IS NOT NULL AND p_SectionId > 0 AND NOT EXISTS (SELECT 1 FROM Sections WHERE SectionId = p_SectionId AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid or inactive SectionId';
    END IF;

    UPDATE Students
    SET
        AdmissionId = COALESCE(p_AdmissionId, AdmissionId),
        AdmissionNo = COALESCE(NULLIF(TRIM(p_AdmissionNo), ''), AdmissionNo),
        AdmissionDate = COALESCE(p_AdmissionDate, AdmissionDate),
        Medium = COALESCE(p_Medium, Medium),
        SecondLanguage = COALESCE(p_SecondLanguage, SecondLanguage),
        StudentName = COALESCE(NULLIF(TRIM(p_StudentName), ''), StudentName),
        Photo = COALESCE(p_Photo, Photo),
        Gender = COALESCE(p_Gender, Gender),
        DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        Email = COALESCE(p_Email, Email),
        MobileNumber = COALESCE(p_MobileNumber, MobileNumber),
        AadhaarNumber = CASE
            WHEN p_AadhaarNumber IS NULL OR TRIM(p_AadhaarNumber) = '' OR LOWER(TRIM(p_AadhaarNumber)) = 'string'
            THEN AadhaarNumber
            ELSE TRIM(p_AadhaarNumber)
        END,
        Nationality = COALESCE(p_Nationality, Nationality),
        Religion = COALESCE(p_Religion, Religion),
        Category = COALESCE(p_Category, Category),
        Address = COALESCE(p_Address, Address),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        BoardId = CASE WHEN p_BoardId > 0 THEN p_BoardId ELSE BoardId END,
        AcademicYearId = CASE WHEN p_AcademicYearId > 0 THEN p_AcademicYearId ELSE AcademicYearId END,
        AcademicLevelId = CASE WHEN p_AcademicLevelId > 0 THEN p_AcademicLevelId ELSE AcademicLevelId END,
        GroupId = CASE WHEN p_GroupId > 0 THEN p_GroupId ELSE GroupId END,
        ProgramId = CASE WHEN p_ProgramId > 0 THEN p_ProgramId ELSE ProgramId END,
        SectionId = CASE WHEN p_SectionId = 0 THEN NULL WHEN p_SectionId > 0 THEN p_SectionId ELSE SectionId END,
        RollNo = COALESCE(NULLIF(TRIM(p_RollNo), ''), RollNo),
        PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
        PreviousHallTicketNumber = COALESCE(p_HallTicketNumber, p_PreviousHallTicketNumber, PreviousHallTicketNumber),
        PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
        PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
        PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
        FatherName = COALESCE(p_FatherName, FatherName),
        FatherOccupation = COALESCE(p_FatherOccupation, FatherOccupation),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        FatherEmail = COALESCE(p_FatherEmail, FatherEmail),
        MotherName = COALESCE(p_MotherName, MotherName),
        MotherOccupation = COALESCE(p_MotherOccupation, MotherOccupation),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        MotherEmail = COALESCE(p_MotherEmail, MotherEmail),
        GuardianName = COALESCE(p_GuardianName, GuardianName),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        GuardianEmail = COALESCE(p_GuardianEmail, GuardianEmail),
        StudentType = COALESCE(p_StudentType, StudentType),
        TransportRequired = p_TransportRequired,
        BusType = p_BusType,
        RouteId = p_RouteId,
        BusRoute = p_BusRoute,
        PickupPointId = p_PickupPointId,
        PickupPoint = p_PickupPoint,
        HostelId = p_HostelId,
        HostelBlock = p_HostelBlock,
        RoomId = p_RoomId,
        HostelRoom = p_HostelRoom,
        BedId = p_BedId,
        HostelBed = p_HostelBed,
        HallTicketNumber = COALESCE(p_HallTicketNumber, HallTicketNumber),
        CampusId = CASE WHEN p_CampusId > 0 THEN p_CampusId ELSE CampusId END,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    CALL sp_GetStudentById(p_StudentId);
END //

-- 5. sp_GetStudentById
DROP PROCEDURE IF EXISTS `sp_GetStudentById`//
CREATE PROCEDURE `sp_GetStudentById`(IN p_StudentId INT)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
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
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.CampusId,
        c.CampusName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.ProgramId,
        p.ProgramName,
        s.SectionId,
        sec.SectionName,
        s.AdmissionId,
        s.AdmissionDate,
        s.AdmissionType,
        s.AdmissionQuota,
        s.Medium,
        s.SecondLanguage,
        s.FeeStructureId,
        fs.StructureName AS FeeStructureName,
        s.PaymentPlan,
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
        s.FatherEmail,
        s.MotherName,
        s.MotherOccupation,
        s.MotherMobile,
        s.MotherEmail,
        s.GuardianName,
        s.GuardianMobile,
        s.GuardianEmail,
        s.AnnualIncome,
        s.FeeAmount,
        s.FeePaid,
        (COALESCE(s.FeeAmount,0) - COALESCE(s.FeePaid,0)) AS FeeDue,
        s.FeeStatus,
        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.BirthCertificate,
        s.TransferCertificate,
        s.StudyCertificate,
        s.AadhaarDocument,
        s.CommunityCertificate,
        s.IncomeCertificate,
        s.CasteCertificate,
        s.TenthCertificate,
        s.MarksMemo,
        s.Remarks,
        s.IsActive,
        s.Status,
        s.IsFirstLogin,
        s.LastLogin,
        s.CreatedAt,
        s.UpdatedAt,
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
    LEFT JOIN `FeeStructures` fs ON fs.FeeStructureId = s.FeeStructureId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- 6. sp_GetStudentProfile
DROP PROCEDURE IF EXISTS `sp_GetStudentProfile`//
CREATE PROCEDURE `sp_GetStudentProfile`(IN p_StudentId INT)
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
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.CampusId,
        c.CampusName,
        s.BoardId,
        b.BoardName AS BoardName,
        s.AcademicYearId,
        ay.AcademicYearName AS AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName AS GroupName,
        s.ProgramId,
        p.ProgramName AS ProgramName,
        s.SectionId,
        sec.SectionName AS SectionName,
        s.FeeStructureId,
        fs.StructureName AS FeeStructureName,
        s.PaymentPlan,
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
        s.FatherEmail,
        s.MotherName,
        s.MotherOccupation,
        s.MotherMobile,
        s.MotherEmail,
        s.GuardianName,
        s.GuardianMobile,
        s.GuardianEmail,
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
        s.Remarks,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt,
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
    FROM Students s
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN Groups g ON g.GroupId = s.GroupId
    LEFT JOIN Programs p ON p.ProgramId = s.ProgramId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = s.FeeStructureId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- 7. sp_GetAllStudents
DROP PROCEDURE IF EXISTS `sp_GetAllStudents`//
CREATE PROCEDURE `sp_GetAllStudents`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.CampusId,
        c.CampusName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.ProgramId,
        p.ProgramName,
        s.SectionId,
        sec.SectionName,
        s.IsActive,
        s.Status,
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
    ORDER BY s.StudentId DESC;
END //

-- 8. sp_SearchStudents
DROP PROCEDURE IF EXISTS `sp_SearchStudents`//
CREATE PROCEDURE `sp_SearchStudents`(
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
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.Email,
        s.MobileNumber,
        s.CampusId,
        c.CampusName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        s.GroupId,
        g.GroupName,
        s.ProgramId,
        p.ProgramName,
        s.SectionId,
        sec.SectionName,
        s.IsActive,
        s.Status,
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
    WHERE (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.StudentName LIKE CONCAT('%', p_Search, '%') COLLATE utf8mb4_unicode_ci OR 
           s.AdmissionNo LIKE CONCAT('%', p_Search, '%') COLLATE utf8mb4_unicode_ci OR 
           s.RollNo LIKE CONCAT('%', p_Search, '%') COLLATE utf8mb4_unicode_ci OR 
           s.MobileNumber LIKE CONCAT('%', p_Search, '%') COLLATE utf8mb4_unicode_ci OR 
           s.Email LIKE CONCAT('%', p_Search, '%') COLLATE utf8mb4_unicode_ci)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId)
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
    ORDER BY s.StudentName ASC;
END //

DELIMITER ;
