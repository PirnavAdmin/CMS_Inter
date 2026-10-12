-- =============================================================================
-- MODULE: REIMBURSEMENT MANAGEMENT
-- SCRIPT: 01_ReimbursementManagement_Complete_Schema_And_SPs.sql
-- PURPOSE: Complete Database Schema and Stored Procedures for Reimbursement Module
-- DATABASE: u819242402_CLM_System (MariaDB 11.x / MySQL 8.x)
-- =============================================================================

USE `u819242402_CLM_System`;

-- =============================================================================
-- SECTION 1: CREATE TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS `reimbursement_claims` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `ClaimNumber` VARCHAR(50) NOT NULL,
    `StaffId` INT NOT NULL,
    `CampusId` INT NOT NULL DEFAULT 1,
    `AcademicYear` VARCHAR(20) NULL,
    `ExpenseCategory` VARCHAR(100) NOT NULL,
    `ExpenseDate` DATE NOT NULL,
    `Amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `ApprovedAmount` DECIMAL(18,2) NULL,
    `PreferredPaymentMethod` VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    `Purpose` TEXT NOT NULL,
    `ReceiptUrl` VARCHAR(500) NULL,
    `AdditionalNotes` VARCHAR(500) NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `AccountRef` VARCHAR(100) NULL,
    `SubmissionDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ReviewedBy` INT NULL,
    `ReviewedAt` DATETIME(6) NULL,
    `ReviewNotes` VARCHAR(500) NULL,
    `PaidBy` INT NULL,
    `PaidAt` DATETIME(6) NULL,
    `PaymentReference` VARCHAR(100) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_Reimbursement_ClaimNumber` (`ClaimNumber`),
    KEY `IX_Reimbursement_StaffId` (`StaffId`),
    KEY `IX_Reimbursement_CampusId` (`CampusId`),
    KEY `IX_Reimbursement_Status` (`Status`),
    KEY `IX_Reimbursement_Category` (`ExpenseCategory`),
    KEY `IX_Reimbursement_ExpenseDate` (`ExpenseDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- =============================================================================
-- SECTION 2: STORED PROCEDURES (100% SP ARCHITECTURE)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sp_Reimbursement_Create
-- Generates formatted ClaimNumber (CLM-YYYY-XXX) and creates a new claim
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_Create`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_Create`(
    IN p_StaffId INT,
    IN p_CampusId INT,
    IN p_AcademicYear VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_ExpenseCategory VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_ExpenseDate DATE,
    IN p_Amount DECIMAL(18,2),
    IN p_PreferredPaymentMethod VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Purpose TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_AdditionalNotes VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_ReceiptUrl VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    DECLARE v_Year INT;
    DECLARE v_NextNum INT;
    DECLARE v_ClaimNumber VARCHAR(50);

    SET v_Year = YEAR(CURDATE());
    SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(ClaimNumber, '-', -1) AS UNSIGNED)), 0) + 1
    INTO v_NextNum
    FROM `reimbursement_claims`
    WHERE `ClaimNumber` LIKE CONCAT('CLM-', v_Year, '-%');

    SET v_ClaimNumber = CONCAT('CLM-', v_Year, '-', LPAD(v_NextNum, 3, '0'));

    INSERT INTO `reimbursement_claims` (
        `ClaimNumber`,
        `StaffId`,
        `CampusId`,
        `AcademicYear`,
        `ExpenseCategory`,
        `ExpenseDate`,
        `Amount`,
        `PreferredPaymentMethod`,
        `Purpose`,
        `AdditionalNotes`,
        `ReceiptUrl`,
        `Status`,
        `SubmissionDate`,
        `CreatedAt`
    ) VALUES (
        v_ClaimNumber,
        p_StaffId,
        IFNULL(p_CampusId, 1),
        p_AcademicYear,
        p_ExpenseCategory,
        p_ExpenseDate,
        p_Amount,
        IFNULL(p_PreferredPaymentMethod, 'Bank Transfer'),
        p_Purpose,
        p_AdditionalNotes,
        p_ReceiptUrl,
        'Pending',
        NOW(),
        NOW()
    );

    SELECT LAST_INSERT_ID() AS `Id`, v_ClaimNumber AS `ClaimNumber`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_Reimbursement_GetAll
-- Returns all reimbursement claims with staff/dept info, filtered by campus, status, category, search
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_GetAll`(
    IN p_CampusId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    SELECT 
        rc.`Id`,
        rc.`ClaimNumber`,
        rc.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`Designation`,
        d.`DepartmentName` AS `Department`,
        s.`Email`,
        rc.`CampusId`,
        rc.`AcademicYear`,
        rc.`ExpenseCategory`,
        rc.`ExpenseDate`,
        rc.`Amount`,
        rc.`ApprovedAmount`,
        rc.`PreferredPaymentMethod`,
        rc.`Purpose`,
        rc.`ReceiptUrl`,
        rc.`AdditionalNotes`,
        rc.`Status`,
        rc.`AccountRef`,
        rc.`SubmissionDate`,
        rc.`ReviewedBy`,
        CONCAT(rev.`FirstName`, ' ', rev.`LastName`) AS `ReviewerName`,
        rc.`ReviewedAt`,
        rc.`ReviewNotes`,
        rc.`PaidBy`,
        CONCAT(pay.`FirstName`, ' ', pay.`LastName`) AS `PayerName`,
        rc.`PaidAt`,
        rc.`PaymentReference`,
        rc.`CreatedAt`,
        rc.`UpdatedAt`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    LEFT JOIN `Staffs` pay ON pay.`Id` = rc.`PaidBy`
    WHERE (rc.`IsDeleted` = 0)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR rc.`CampusId` = p_CampusId)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR rc.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_Category IS NULL OR p_Category = '' OR p_Category = 'All' OR rc.`ExpenseCategory` COLLATE utf8mb4_uca1400_ai_ci = p_Category COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_Search IS NULL OR p_Search = '' OR
           rc.`ClaimNumber` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR
           s.`EmployeeId` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR
           s.`FirstName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR
           s.`LastName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR
           CONCAT(s.`FirstName`, ' ', s.`LastName`) COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR
           rc.`Purpose` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY rc.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_Reimbursement_GetMyClaims
-- Returns all claims submitted by the authenticated Staff member
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetMyClaims`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_GetMyClaims`(
    IN p_StaffId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        rc.`Id`,
        rc.`ClaimNumber`,
        rc.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`Designation`,
        d.`DepartmentName` AS `Department`,
        s.`Email`,
        rc.`CampusId`,
        rc.`AcademicYear`,
        rc.`ExpenseCategory`,
        rc.`ExpenseDate`,
        rc.`Amount`,
        rc.`ApprovedAmount`,
        rc.`PreferredPaymentMethod`,
        rc.`Purpose`,
        rc.`ReceiptUrl`,
        rc.`AdditionalNotes`,
        rc.`Status`,
        rc.`AccountRef`,
        rc.`SubmissionDate`,
        rc.`ReviewedBy`,
        CONCAT(rev.`FirstName`, ' ', rev.`LastName`) AS `ReviewerName`,
        rc.`ReviewedAt`,
        rc.`ReviewNotes`,
        rc.`PaidBy`,
        CONCAT(pay.`FirstName`, ' ', pay.`LastName`) AS `PayerName`,
        rc.`PaidAt`,
        rc.`PaymentReference`,
        rc.`CreatedAt`,
        rc.`UpdatedAt`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    LEFT JOIN `Staffs` pay ON pay.`Id` = rc.`PaidBy`
    WHERE (rc.`IsDeleted` = 0)
      AND (rc.`StaffId` = p_StaffId)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR rc.`CampusId` = p_CampusId)
    ORDER BY rc.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_Reimbursement_GetById
-- Returns full details for a single reimbursement claim (modal / preview)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_GetById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        rc.`Id`,
        rc.`ClaimNumber`,
        rc.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`Designation`,
        d.`DepartmentName` AS `Department`,
        s.`Email`,
        rc.`CampusId`,
        rc.`AcademicYear`,
        rc.`ExpenseCategory`,
        rc.`ExpenseDate`,
        rc.`Amount`,
        rc.`ApprovedAmount`,
        rc.`PreferredPaymentMethod`,
        rc.`Purpose`,
        rc.`ReceiptUrl`,
        rc.`AdditionalNotes`,
        rc.`Status`,
        rc.`AccountRef`,
        rc.`SubmissionDate`,
        rc.`ReviewedBy`,
        CONCAT(rev.`FirstName`, ' ', rev.`LastName`) AS `ReviewerName`,
        rc.`ReviewedAt`,
        rc.`ReviewNotes`,
        rc.`PaidBy`,
        CONCAT(pay.`FirstName`, ' ', pay.`LastName`) AS `PayerName`,
        rc.`PaidAt`,
        rc.`PaymentReference`,
        rc.`CreatedAt`,
        rc.`UpdatedAt`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    LEFT JOIN `Staffs` pay ON pay.`Id` = rc.`PaidBy`
    WHERE (rc.`Id` = p_Id AND rc.`IsDeleted` = 0)
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_Reimbursement_GetSummary
-- Calculates top 4 status KPI cards, 5 financial review cards, and integrated payables pill
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetSummary`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_GetSummary`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        COUNT(*) AS `TotalClaims`,
        COUNT(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci IN ('Pending', 'Under Review') THEN 1 END) AS `PendingClaims`,
        COUNT(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Under Review' THEN 1 END) AS `UnderReviewClaims`,
        COUNT(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Approved' THEN 1 END) AS `ApprovedClaims`,
        COUNT(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Rejected' THEN 1 END) AS `RejectedClaims`,
        COUNT(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Paid' THEN 1 END) AS `PaidClaims`,
        IFNULL(SUM(`Amount`), 0.00) AS `TotalClaimedAmount`,
        IFNULL(SUM(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci IN ('Pending', 'Under Review') THEN `Amount` ELSE 0 END), 0.00) AS `AwaitingReviewAmount`,
        IFNULL(SUM(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Approved' THEN IFNULL(`ApprovedAmount`, `Amount`) ELSE 0 END), 0.00) AS `ApprovedUnpaidAmount`,
        IFNULL(SUM(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Paid' THEN IFNULL(`ApprovedAmount`, `Amount`) ELSE 0 END), 0.00) AS `TotalPaidAmount`,
        IFNULL(SUM(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Rejected' THEN `Amount` ELSE 0 END), 0.00) AS `TotalRejectedAmount`,
        COUNT(CASE WHEN `Status` COLLATE utf8mb4_uca1400_ai_ci = 'Approved' AND `AccountRef` IS NOT NULL AND `AccountRef` != '' THEN 1 END) AS `IntegratedPayablesCount`
    FROM `reimbursement_claims`
    WHERE `IsDeleted` = 0
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR `CampusId` = p_CampusId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_Reimbursement_Verify
-- Approves claim, records approved amount, review notes, and generates ACC-PAY-CLM-YYYY-XXX
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_Verify`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_Verify`(
    IN p_Id INT,
    IN p_ApprovedAmount DECIMAL(18,2),
    IN p_ReviewNotes VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_ReviewedBy INT
)
BEGIN
    DECLARE v_Year INT;
    DECLARE v_NextSeq INT;
    DECLARE v_AccountRef VARCHAR(100);
    DECLARE v_CurrentRef VARCHAR(100);

    SELECT `AccountRef` INTO v_CurrentRef FROM `reimbursement_claims` WHERE `Id` = p_Id;

    IF v_CurrentRef IS NULL OR v_CurrentRef = '' THEN
        SET v_Year = YEAR(CURDATE());
        SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(AccountRef, '-', -1) AS UNSIGNED)), 0) + 1
        INTO v_NextSeq
        FROM `reimbursement_claims`
        WHERE `AccountRef` LIKE CONCAT('ACC-PAY-CLM-', v_Year, '-%');

        SET v_AccountRef = CONCAT('ACC-PAY-CLM-', v_Year, '-', LPAD(v_NextSeq, 3, '0'));
    ELSE
        SET v_AccountRef = v_CurrentRef;
    END IF;

    UPDATE `reimbursement_claims`
    SET `Status` = 'Approved',
        `ApprovedAmount` = IFNULL(p_ApprovedAmount, `Amount`),
        `ReviewNotes` = p_ReviewNotes,
        `ReviewedBy` = p_ReviewedBy,
        `ReviewedAt` = NOW(),
        `AccountRef` = v_AccountRef,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`, v_AccountRef AS `AccountRef`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_Reimbursement_RequestClarification
-- Sets status to 'Under Review' and records clarification notes from reviewer
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_RequestClarification`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_RequestClarification`(
    IN p_Id INT,
    IN p_ClarificationNotes VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_ReviewedBy INT
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `Status` = 'Under Review',
        `ReviewNotes` = p_ClarificationNotes,
        `ReviewedBy` = p_ReviewedBy,
        `ReviewedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_Reimbursement_Reject
-- Marks claim as Rejected with reason
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_Reject`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_Reject`(
    IN p_Id INT,
    IN p_RejectNotes VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_ReviewedBy INT
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `Status` = 'Rejected',
        `ReviewNotes` = p_RejectNotes,
        `ReviewedBy` = p_ReviewedBy,
        `ReviewedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_Reimbursement_MarkPaid
-- Marks claim as Paid with payment reference and payment timestamp
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_MarkPaid`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_MarkPaid`(
    IN p_Id INT,
    IN p_PaymentReference VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_PaidBy INT
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `Status` = 'Paid',
        `PaymentReference` = p_PaymentReference,
        `PaidBy` = p_PaidBy,
        `PaidAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_Reimbursement_UploadProof
-- Updates ReceiptUrl for a claim
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_UploadProof`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_UploadProof`(
    IN p_Id INT,
    IN p_ReceiptUrl VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `ReceiptUrl` = p_ReceiptUrl,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. sp_Reimbursement_GetAccountEntries
-- Returns account payables ledger entries for Approved and Paid claims
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetAccountEntries`;
DELIMITER //
CREATE PROCEDURE `sp_Reimbursement_GetAccountEntries`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        rc.`AccountRef` AS `Id`,
        rc.`AccountRef` AS `AccountEntryId`,
        rc.`ClaimNumber` AS `ClaimId`,
        s.`EmployeeId` AS `FacultyId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `FacultyName`,
        d.`DepartmentName` AS `Department`,
        rc.`ExpenseCategory` AS `Category`,
        IFNULL(rc.`ApprovedAmount`, rc.`Amount`) AS `Amount`,
        'Faculty Expense Reimbursement Payable' AS `EntryType`,
        'Faculty Benefits & Travel Reimbursements' AS `LedgerCategory`,
        DATE_FORMAT(rc.`ReviewedAt`, '%Y-%m-%d') AS `ApprovalDate`,
        IFNULL(CONCAT(rev.`FirstName`, ' ', rev.`LastName`), 'Finance Officer') AS `ApprovedBy`,
        CASE 
            WHEN rc.`Status` COLLATE utf8mb4_uca1400_ai_ci = 'Paid' THEN 'Paid / Disbursed'
            ELSE 'Payable (Awaiting Disbursement)'
        END AS `PaymentStatus`,
        DATE_FORMAT(rc.`PaidAt`, '%Y-%m-%d') AS `DisbursedDate`,
        rc.`PreferredPaymentMethod` AS `PaymentMode`,
        rc.`PaymentReference` AS `PaymentRef`,
        rc.`ReviewNotes` AS `Remarks`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    WHERE rc.`IsDeleted` = 0
      AND rc.`AccountRef` IS NOT NULL 
      AND rc.`AccountRef` != ''
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR rc.`CampusId` = p_CampusId)
    ORDER BY rc.`ReviewedAt` DESC;
END //
DELIMITER ;
