-- =============================================================================
-- MODULE: PAYROLL & SALARY MANAGEMENT
-- SCRIPT: 16_PayrollManagement_Complete_Schema_And_SPs.sql
-- PURPOSE: Complete Database Schema and Stored Procedures for Payroll Module
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- =============================================================================
-- SECTION 1: CREATE TABLES
-- =============================================================================

-- 1. Salary Structures Table
CREATE TABLE IF NOT EXISTS `payroll_salary_structures` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StructureName` VARCHAR(150) NOT NULL,
    `StaffType` VARCHAR(50) NOT NULL DEFAULT 'Teaching',
    `DepartmentId` INT NULL,
    `DesignationId` INT NULL,
    `BasicPay` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `HRA` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `DA` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `ConveyanceAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `MedicalAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `OtherAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `PF` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `ProfessionalTax` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `TDS` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `ESI` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `InsuranceOtherDeduction` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_PayrollSalaryStructures_StaffType` (`StaffType`),
    KEY `IX_PayrollSalaryStructures_Status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Staff Salary Assignments Table
CREATE TABLE IF NOT EXISTS `payroll_staff_salaries` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StaffId` INT NOT NULL,
    `SalaryStructureId` INT NOT NULL,
    `EffectiveFrom` DATE NOT NULL,
    `EffectiveTo` DATE NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_PayrollStaffSalaries_StaffId` (`StaffId`),
    KEY `IX_PayrollStaffSalaries_StructureId` (`SalaryStructureId`),
    KEY `IX_PayrollStaffSalaries_Status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Monthly Payslips Table
CREATE TABLE IF NOT EXISTS `payroll_payslips` (
    `PayslipId` INT NOT NULL AUTO_INCREMENT,
    `StaffId` INT NOT NULL,
    `SalaryStructureId` INT NOT NULL,
    `PayrollMonth` INT NOT NULL,
    `PayrollYear` INT NOT NULL,
    `BasicPay` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `HRA` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `DA` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `ConveyanceAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `MedicalAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `OtherAllowance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `PF` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `ProfessionalTax` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `TDS` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `ESI` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `InsuranceOtherDeduction` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `GrossSalary` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `TotalDeductions` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `NetSalary` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `PayslipStatus` VARCHAR(50) NOT NULL DEFAULT 'Generated',
    `GeneratedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `PaidAt` DATETIME(6) NULL,
    PRIMARY KEY (`PayslipId`),
    UNIQUE KEY `UX_PayrollPayslips_Staff_Period` (`StaffId`, `PayrollMonth`, `PayrollYear`),
    KEY `IX_PayrollPayslips_Period` (`PayrollYear`, `PayrollMonth`),
    KEY `IX_PayrollPayslips_Status` (`PayslipStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Salary Revisions Table
CREATE TABLE IF NOT EXISTS `payroll_salary_revisions` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StaffId` INT NOT NULL,
    `CurrentSalaryStructureId` INT NOT NULL,
    `ProposedSalaryStructureId` INT NOT NULL,
    `EffectiveFrom` DATE NOT NULL,
    `Reason` VARCHAR(500) NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `RequestedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ApprovedBy` INT NULL,
    `ApprovedAt` DATETIME(6) NULL,
    `RejectionReason` VARCHAR(500) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_PayrollSalaryRevisions_StaffId` (`StaffId`),
    KEY `IX_PayrollSalaryRevisions_Status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Bonuses Table
CREATE TABLE IF NOT EXISTS `payroll_bonuses` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StaffId` INT NOT NULL,
    `BonusType` VARCHAR(100) NOT NULL,
    `Amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `BonusMonth` INT NOT NULL,
    `BonusYear` INT NOT NULL,
    `Reason` VARCHAR(500) NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `RequestedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ApprovedBy` INT NULL,
    `ApprovedAt` DATETIME(6) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_PayrollBonuses_StaffId` (`StaffId`),
    KEY `IX_PayrollBonuses_Status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Advances & Staff Loans Table
CREATE TABLE IF NOT EXISTS `payroll_advances` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StaffId` INT NOT NULL,
    `AdvanceType` VARCHAR(100) NOT NULL,
    `Amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `Reason` VARCHAR(500) NULL,
    `RepaymentMonths` INT NOT NULL DEFAULT 1,
    `MonthlyDeduction` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `StartMonth` INT NOT NULL,
    `StartYear` INT NOT NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `RequestedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ApprovedBy` INT NULL,
    `ApprovedAt` DATETIME(6) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_PayrollAdvances_StaffId` (`StaffId`),
    KEY `IX_PayrollAdvances_Status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Advance Repayments Table
CREATE TABLE IF NOT EXISTS `payroll_advance_repayments` (
    `RepaymentId` INT NOT NULL AUTO_INCREMENT,
    `AdvanceId` INT NOT NULL,
    `PayslipId` INT NULL,
    `StaffId` INT NOT NULL,
    `DeductionAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `DeductionMonth` INT NOT NULL,
    `DeductionYear` INT NOT NULL,
    `RemainingBalance` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`RepaymentId`),
    KEY `IX_PayrollAdvanceRepayments_AdvanceId` (`AdvanceId`),
    KEY `IX_PayrollAdvanceRepayments_PayslipId` (`PayslipId`),
    KEY `IX_PayrollAdvanceRepayments_StaffId` (`StaffId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================================================
-- SECTION 2: STORED PROCEDURES (100% STORED PROCEDURES)
-- =============================================================================

DELIMITER //

-- -----------------------------------------------------------------------------
-- 1. SALARY STRUCTURES PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_Create`//
CREATE PROCEDURE `sp_PayrollSalaryStructure_Create`
(
    IN p_StructureName VARCHAR(150),
    IN p_StaffType VARCHAR(50),
    IN p_DepartmentId INT,
    IN p_DesignationId INT,
    IN p_BasicPay DECIMAL(18,2),
    IN p_HRA DECIMAL(18,2),
    IN p_DA DECIMAL(18,2),
    IN p_ConveyanceAllowance DECIMAL(18,2),
    IN p_MedicalAllowance DECIMAL(18,2),
    IN p_OtherAllowance DECIMAL(18,2),
    IN p_PF DECIMAL(18,2),
    IN p_ProfessionalTax DECIMAL(18,2),
    IN p_TDS DECIMAL(18,2),
    IN p_ESI DECIMAL(18,2),
    IN p_InsuranceOtherDeduction DECIMAL(18,2),
    IN p_Status VARCHAR(50)
)
BEGIN
    INSERT INTO `payroll_salary_structures` (
        `StructureName`, `StaffType`, `DepartmentId`, `DesignationId`,
        `BasicPay`, `HRA`, `DA`, `ConveyanceAllowance`, `MedicalAllowance`, `OtherAllowance`,
        `PF`, `ProfessionalTax`, `TDS`, `ESI`, `InsuranceOtherDeduction`,
        `Status`, `CreatedAt`
    ) VALUES (
        p_StructureName, IFNULL(p_StaffType, 'Teaching'), p_DepartmentId, p_DesignationId,
        IFNULL(p_BasicPay, 0.00), IFNULL(p_HRA, 0.00), IFNULL(p_DA, 0.00),
        IFNULL(p_ConveyanceAllowance, 0.00), IFNULL(p_MedicalAllowance, 0.00), IFNULL(p_OtherAllowance, 0.00),
        IFNULL(p_PF, 0.00), IFNULL(p_ProfessionalTax, 0.00), IFNULL(p_TDS, 0.00),
        IFNULL(p_ESI, 0.00), IFNULL(p_InsuranceOtherDeduction, 0.00),
        IFNULL(p_Status, 'Active'), NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_GetAll`//
CREATE PROCEDURE `sp_PayrollSalaryStructure_GetAll`
(
    IN p_StaffType VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        pss.`Id`,
        pss.`StructureName`,
        pss.`StaffType`,
        pss.`DepartmentId`,
        d.`DepartmentName`,
        pss.`DesignationId`,
        des.`Name` AS `DesignationName`,
        pss.`BasicPay`,
        pss.`HRA`,
        pss.`DA`,
        pss.`ConveyanceAllowance`,
        pss.`MedicalAllowance`,
        pss.`OtherAllowance`,
        pss.`PF`,
        pss.`ProfessionalTax`,
        pss.`TDS`,
        pss.`ESI`,
        pss.`InsuranceOtherDeduction`,
        (pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) AS `GrossSalary`,
        (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`) AS `TotalDeductions`,
        ((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`)) AS `NetSalary`,
        (SELECT COUNT(*) FROM `payroll_staff_salaries` psa WHERE psa.`SalaryStructureId` = pss.`Id` AND psa.`Status` = 'Active') AS `AssignedStaff`,
        pss.`Status`
    FROM `payroll_salary_structures` pss
    LEFT JOIN `Departments` d ON d.`DepartmentId` = pss.`DepartmentId`
    LEFT JOIN `Designations` des ON (des.`Id` = pss.`DesignationId`)
    WHERE (p_StaffType IS NULL OR p_StaffType = '' OR pss.`StaffType` = p_StaffType)
      AND (p_Search IS NULL OR p_Search = '' OR pss.`StructureName` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY pss.`Id` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_GetById`//
CREATE PROCEDURE `sp_PayrollSalaryStructure_GetById`
(
    IN p_Id INT
)
BEGIN
    SELECT 
        pss.`Id`,
        pss.`StructureName`,
        pss.`StaffType`,
        pss.`DepartmentId`,
        d.`DepartmentName`,
        pss.`DesignationId`,
        des.`Name` AS `DesignationName`,
        pss.`BasicPay`,
        pss.`HRA`,
        pss.`DA`,
        pss.`ConveyanceAllowance`,
        pss.`MedicalAllowance`,
        pss.`OtherAllowance`,
        pss.`PF`,
        pss.`ProfessionalTax`,
        pss.`TDS`,
        pss.`ESI`,
        pss.`InsuranceOtherDeduction`,
        (pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) AS `GrossSalary`,
        (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`) AS `TotalDeductions`,
        ((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`)) AS `NetSalary`,
        (SELECT COUNT(*) FROM `payroll_staff_salaries` psa WHERE psa.`SalaryStructureId` = pss.`Id` AND psa.`Status` = 'Active') AS `AssignedStaff`,
        pss.`Status`
    FROM `payroll_salary_structures` pss
    LEFT JOIN `Departments` d ON d.`DepartmentId` = pss.`DepartmentId`
    LEFT JOIN `Designations` des ON (des.`Id` = pss.`DesignationId`)
    WHERE pss.`Id` = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_Update`//
CREATE PROCEDURE `sp_PayrollSalaryStructure_Update`
(
    IN p_Id INT,
    IN p_StructureName VARCHAR(150),
    IN p_StaffType VARCHAR(50),
    IN p_DepartmentId INT,
    IN p_DesignationId INT,
    IN p_BasicPay DECIMAL(18,2),
    IN p_HRA DECIMAL(18,2),
    IN p_DA DECIMAL(18,2),
    IN p_ConveyanceAllowance DECIMAL(18,2),
    IN p_MedicalAllowance DECIMAL(18,2),
    IN p_OtherAllowance DECIMAL(18,2),
    IN p_PF DECIMAL(18,2),
    IN p_ProfessionalTax DECIMAL(18,2),
    IN p_TDS DECIMAL(18,2),
    IN p_ESI DECIMAL(18,2),
    IN p_InsuranceOtherDeduction DECIMAL(18,2),
    IN p_Status VARCHAR(50)
)
BEGIN
    UPDATE `payroll_salary_structures`
    SET `StructureName` = p_StructureName,
        `StaffType` = IFNULL(p_StaffType, `StaffType`),
        `DepartmentId` = p_DepartmentId,
        `DesignationId` = p_DesignationId,
        `BasicPay` = IFNULL(p_BasicPay, `BasicPay`),
        `HRA` = IFNULL(p_HRA, `HRA`),
        `DA` = IFNULL(p_DA, `DA`),
        `ConveyanceAllowance` = IFNULL(p_ConveyanceAllowance, `ConveyanceAllowance`),
        `MedicalAllowance` = IFNULL(p_MedicalAllowance, `MedicalAllowance`),
        `OtherAllowance` = IFNULL(p_OtherAllowance, `OtherAllowance`),
        `PF` = IFNULL(p_PF, `PF`),
        `ProfessionalTax` = IFNULL(p_ProfessionalTax, `ProfessionalTax`),
        `TDS` = IFNULL(p_TDS, `TDS`),
        `ESI` = IFNULL(p_ESI, `ESI`),
        `InsuranceOtherDeduction` = IFNULL(p_InsuranceOtherDeduction, `InsuranceOtherDeduction`),
        `Status` = IFNULL(p_Status, `Status`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_Delete`//
CREATE PROCEDURE `sp_PayrollSalaryStructure_Delete`
(
    IN p_Id INT
)
BEGIN
    DELETE FROM `payroll_salary_structures` WHERE `Id` = p_Id;
    SELECT ROW_COUNT() AS AffectedRows;
END //

-- -----------------------------------------------------------------------------
-- 2. EMPLOYEE & SALARY ASSIGNMENT PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_PayrollEmployee_GetAll`//
CREATE PROCEDURE `sp_PayrollEmployee_GetAll`
(
    IN p_StaffType VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        s.`Id` AS `StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        d.`DepartmentName`,
        s.`DesignationId`,
        s.`Designation`,
        IFNULL(s.`FacultyType`, s.`StaffType`) AS `EmploymentType`,
        s.`JoiningDate`,
        s.`Status`,
        psa.`Id` AS `AssignmentId`,
        psa.`SalaryStructureId`,
        pss.`StructureName`,
        pss.`BasicPay`,
        (pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) AS `GrossSalary`,
        (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`) AS `TotalDeductions`,
        ((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`)) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_staff_salaries` psa ON psa.`StaffId` = s.`Id` AND psa.`Status` = 'Active'
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` = p_StaffType)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           CONCAT(s.`FirstName`, ' ', s.`LastName`) LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY s.`Id` ASC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetAll`//
CREATE PROCEDURE `sp_PayrollStaffSalary_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50)
)
BEGIN
    SELECT 
        `Id`,
        `StaffId`,
        `SalaryStructureId`,
        `EffectiveFrom`,
        `EffectiveTo`,
        `Status`,
        `CreatedAt`,
        `UpdatedAt`
    FROM `payroll_staff_salaries`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR `StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR `Status` = p_Status)
    ORDER BY `Id` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetById`//
CREATE PROCEDURE `sp_PayrollStaffSalary_GetById`
(
    IN p_Id INT
)
BEGIN
    SELECT 
        `Id`,
        `StaffId`,
        `SalaryStructureId`,
        `EffectiveFrom`,
        `EffectiveTo`,
        `Status`,
        `CreatedAt`,
        `UpdatedAt`
    FROM `payroll_staff_salaries`
    WHERE `Id` = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Assign`//
CREATE PROCEDURE `sp_PayrollStaffSalary_Assign`
(
    IN p_StaffId INT,
    IN p_SalaryStructureId INT,
    IN p_EffectiveFrom DATE
)
BEGIN
    -- Deactivate previous active assignment
    UPDATE `payroll_staff_salaries`
    SET `Status` = 'Inactive',
        `EffectiveTo` = p_EffectiveFrom,
        `UpdatedAt` = NOW()
    WHERE `StaffId` = p_StaffId AND `Status` = 'Active';

    -- Insert new active assignment
    INSERT INTO `payroll_staff_salaries` (
        `StaffId`, `SalaryStructureId`, `EffectiveFrom`, `Status`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_SalaryStructureId, p_EffectiveFrom, 'Active', NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Update`//
CREATE PROCEDURE `sp_PayrollStaffSalary_Update`
(
    IN p_Id INT,
    IN p_SalaryStructureId INT,
    IN p_EffectiveFrom DATE
)
BEGIN
    UPDATE `payroll_staff_salaries`
    SET `SalaryStructureId` = p_SalaryStructureId,
        `EffectiveFrom` = p_EffectiveFrom,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Delete`//
CREATE PROCEDURE `sp_PayrollStaffSalary_Delete`
(
    IN p_Id INT
)
BEGIN
    DELETE FROM `payroll_staff_salaries` WHERE `Id` = p_Id;
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_UpdateStatus`//
CREATE PROCEDURE `sp_PayrollStaffSalary_UpdateStatus`
(
    IN p_Id INT,
    IN p_Status VARCHAR(50)
)
BEGIN
    UPDATE `payroll_staff_salaries`
    SET `Status` = p_Status,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- -----------------------------------------------------------------------------
-- 3. PAYSLIP GENERATION & HISTORY PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_Generate`//
CREATE PROCEDURE `sp_PayrollPayslip_Generate`
(
    IN p_StaffId INT,
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT
)
BEGIN
    DECLARE v_StructureId INT;
    DECLARE v_BasicPay DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_HRA DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_DA DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Conveyance DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Medical DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Other DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_PF DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_PT DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_TDS DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_ESI DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Insurance DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Gross DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Deductions DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Net DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_PayslipId INT;

    -- Fetch active salary structure for staff
    SELECT 
        pss.`Id`, pss.`BasicPay`, pss.`HRA`, pss.`DA`, 
        pss.`ConveyanceAllowance`, pss.`MedicalAllowance`, pss.`OtherAllowance`,
        pss.`PF`, pss.`ProfessionalTax`, pss.`TDS`, pss.`ESI`, pss.`InsuranceOtherDeduction`
    INTO 
        v_StructureId, v_BasicPay, v_HRA, v_DA, 
        v_Conveyance, v_Medical, v_Other,
        v_PF, v_PT, v_TDS, v_ESI, v_Insurance
    FROM `payroll_staff_salaries` psa
    JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE psa.`StaffId` = p_StaffId AND psa.`Status` = 'Active'
    ORDER BY psa.`Id` DESC
    LIMIT 1;

    IF v_StructureId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff does not have an active salary structure assigned.';
    END IF;

    SET v_Gross = v_BasicPay + v_HRA + v_DA + v_Conveyance + v_Medical + v_Other;
    SET v_Deductions = v_PF + v_PT + v_TDS + v_ESI + v_Insurance;
    SET v_Net = v_Gross - v_Deductions;

    -- Check if payslip already exists for this staff and period
    SELECT `PayslipId` INTO v_PayslipId
    FROM `payroll_payslips`
    WHERE `StaffId` = p_StaffId AND `PayrollMonth` = p_PayrollMonth AND `PayrollYear` = p_PayrollYear
    LIMIT 1;

    IF v_PayslipId IS NOT NULL THEN
        UPDATE `payroll_payslips`
        SET `SalaryStructureId` = v_StructureId,
            `BasicPay` = v_BasicPay, `HRA` = v_HRA, `DA` = v_DA,
            `ConveyanceAllowance` = v_Conveyance, `MedicalAllowance` = v_Medical, `OtherAllowance` = v_Other,
            `PF` = v_PF, `ProfessionalTax` = v_PT, `TDS` = v_TDS, `ESI` = v_ESI, `InsuranceOtherDeduction` = v_Insurance,
            `GrossSalary` = v_Gross, `TotalDeductions` = v_Deductions, `NetSalary` = v_Net,
            `PayslipStatus` = 'Generated', `GeneratedAt` = NOW()
        WHERE `PayslipId` = v_PayslipId;
    ELSE
        INSERT INTO `payroll_payslips` (
            `StaffId`, `SalaryStructureId`, `PayrollMonth`, `PayrollYear`,
            `BasicPay`, `HRA`, `DA`, `ConveyanceAllowance`, `MedicalAllowance`, `OtherAllowance`,
            `PF`, `ProfessionalTax`, `TDS`, `ESI`, `InsuranceOtherDeduction`,
            `GrossSalary`, `TotalDeductions`, `NetSalary`, `PayslipStatus`, `GeneratedAt`
        ) VALUES (
            p_StaffId, v_StructureId, p_PayrollMonth, p_PayrollYear,
            v_BasicPay, v_HRA, v_DA, v_Conveyance, v_Medical, v_Other,
            v_PF, v_PT, v_TDS, v_ESI, v_Insurance,
            v_Gross, v_Deductions, v_Net, 'Generated', NOW()
        );
        SET v_PayslipId = LAST_INSERT_ID();
    END IF;

    SELECT v_PayslipId AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_UpdateStatus`//
CREATE PROCEDURE `sp_PayrollPayslip_UpdateStatus`
(
    IN p_Id INT,
    IN p_Status VARCHAR(50)
)
BEGIN
    UPDATE `payroll_payslips`
    SET `PayslipStatus` = p_Status,
        `PaidAt` = IF(p_Status = 'Paid', NOW(), `PaidAt`)
    WHERE `PayslipId` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetEmailDetails`//
CREATE PROCEDURE `sp_PayrollPayslip_GetEmailDetails`
(
    IN p_PayslipId INT
)
BEGIN
    SELECT 
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`Email`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`GrossSalary`,
        pp.`TotalDeductions`,
        pp.`NetSalary`,
        pp.`PayslipStatus`
    FROM `payroll_payslips` pp
    JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    WHERE pp.`PayslipId` = p_PayslipId;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetHistory`//
CREATE PROCEDURE `sp_PayrollPayslip_GetHistory`
(
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT,
    IN p_StaffType VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        d.`DepartmentName`,
        s.`DesignationId`,
        s.`Designation`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`SalaryStructureId`,
        pss.`StructureName`,
        pp.`BasicPay`,
        pp.`HRA`,
        pp.`DA`,
        pp.`ConveyanceAllowance`,
        pp.`MedicalAllowance`,
        pp.`OtherAllowance`,
        pp.`PF`,
        pp.`ProfessionalTax`,
        pp.`TDS`,
        pp.`ESI`,
        pp.`InsuranceOtherDeduction`,
        pp.`GrossSalary`,
        pp.`TotalDeductions`,
        pp.`NetSalary`,
        pp.`PayslipStatus`,
        pp.`GeneratedAt`
    FROM `payroll_payslips` pp
    JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = pp.`SalaryStructureId`
    WHERE (p_PayrollMonth IS NULL OR p_PayrollMonth = 0 OR pp.`PayrollMonth` = p_PayrollMonth)
      AND (p_PayrollYear IS NULL OR p_PayrollYear = 0 OR pp.`PayrollYear` = p_PayrollYear)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` = p_StaffType)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           CONCAT(s.`FirstName`, ' ', s.`LastName`) LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY pp.`PayslipId` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetById`//
CREATE PROCEDURE `sp_PayrollPayslip_GetById`
(
    IN p_PayslipId INT
)
BEGIN
    SELECT 
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        d.`DepartmentName`,
        s.`DesignationId`,
        s.`Designation`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`SalaryStructureId`,
        pss.`StructureName`,
        pp.`BasicPay`,
        pp.`HRA`,
        pp.`DA`,
        pp.`ConveyanceAllowance`,
        pp.`MedicalAllowance`,
        pp.`OtherAllowance`,
        pp.`PF`,
        pp.`ProfessionalTax`,
        pp.`TDS`,
        pp.`ESI`,
        pp.`InsuranceOtherDeduction`,
        pp.`GrossSalary`,
        pp.`TotalDeductions`,
        pp.`NetSalary`,
        pp.`PayslipStatus`,
        pp.`GeneratedAt`
    FROM `payroll_payslips` pp
    JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = pp.`SalaryStructureId`
    WHERE pp.`PayslipId` = p_PayslipId;
END //

-- -----------------------------------------------------------------------------
-- 4. SALARY REVISIONS PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_Create`//
CREATE PROCEDURE `sp_PayrollSalaryRevision_Create`
(
    IN p_StaffId INT,
    IN p_CurrentSalaryStructureId INT,
    IN p_ProposedSalaryStructureId INT,
    IN p_EffectiveFrom DATE,
    IN p_Reason VARCHAR(500)
)
BEGIN
    INSERT INTO `payroll_salary_revisions` (
        `StaffId`, `CurrentSalaryStructureId`, `ProposedSalaryStructureId`,
        `EffectiveFrom`, `Reason`, `Status`, `RequestedAt`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_CurrentSalaryStructureId, p_ProposedSalaryStructureId,
        p_EffectiveFrom, p_Reason, 'Pending', NOW(), NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_GetAll`//
CREATE PROCEDURE `sp_PayrollSalaryRevision_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50)
)
BEGIN
    SELECT 
        psr.`Id`,
        psr.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        psr.`CurrentSalaryStructureId`,
        psr.`ProposedSalaryStructureId`,
        psr.`EffectiveFrom`,
        psr.`Reason`,
        psr.`Status`,
        psr.`RequestedAt`,
        psr.`ApprovedBy`,
        psr.`ApprovedAt`,
        psr.`RejectionReason`,
        psr.`CreatedAt`,
        psr.`UpdatedAt`
    FROM `payroll_salary_revisions` psr
    JOIN `Staffs` s ON s.`Id` = psr.`StaffId`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR psr.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR psr.`Status` = p_Status)
    ORDER BY psr.`Id` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_Approve`//
CREATE PROCEDURE `sp_PayrollSalaryRevision_Approve`
(
    IN p_RevisionId INT,
    IN p_ApprovedBy INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_ProposedStructureId INT;
    DECLARE v_EffectiveFrom DATE;

    SELECT `StaffId`, `ProposedSalaryStructureId`, `EffectiveFrom`
    INTO v_StaffId, v_ProposedStructureId, v_EffectiveFrom
    FROM `payroll_salary_revisions`
    WHERE `Id` = p_RevisionId AND `Status` = 'Pending';

    IF v_StaffId IS NOT NULL THEN
        -- Mark revision approved
        UPDATE `payroll_salary_revisions`
        SET `Status` = 'Approved',
            `ApprovedBy` = p_ApprovedBy,
            `ApprovedAt` = NOW(),
            `UpdatedAt` = NOW()
        WHERE `Id` = p_RevisionId;

        -- Deactivate old salary assignment
        UPDATE `payroll_staff_salaries`
        SET `Status` = 'Inactive',
            `EffectiveTo` = v_EffectiveFrom,
            `UpdatedAt` = NOW()
        WHERE `StaffId` = v_StaffId AND `Status` = 'Active';

        -- Assign new proposed structure
        INSERT INTO `payroll_staff_salaries` (
            `StaffId`, `SalaryStructureId`, `EffectiveFrom`, `Status`, `CreatedAt`
        ) VALUES (
            v_StaffId, v_ProposedStructureId, v_EffectiveFrom, 'Active', NOW()
        );

        SELECT 1 AS Result;
    ELSE
        SELECT 0 AS Result;
    END IF;
END //

-- -----------------------------------------------------------------------------
-- 5. BONUSES PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_PayrollBonus_Create`//
CREATE PROCEDURE `sp_PayrollBonus_Create`
(
    IN p_StaffId INT,
    IN p_BonusType VARCHAR(100),
    IN p_Amount DECIMAL(18,2),
    IN p_BonusMonth INT,
    IN p_BonusYear INT,
    IN p_Reason VARCHAR(500)
)
BEGIN
    INSERT INTO `payroll_bonuses` (
        `StaffId`, `BonusType`, `Amount`, `BonusMonth`, `BonusYear`,
        `Reason`, `Status`, `RequestedAt`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_BonusType, p_Amount, p_BonusMonth, p_BonusYear,
        p_Reason, 'Pending', NOW(), NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollBonus_GetAll`//
CREATE PROCEDURE `sp_PayrollBonus_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50)
)
BEGIN
    SELECT 
        pb.`Id`,
        pb.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        pb.`BonusType`,
        pb.`Amount`,
        pb.`BonusMonth`,
        pb.`BonusYear`,
        pb.`Reason`,
        pb.`Status`,
        pb.`RequestedAt`,
        pb.`ApprovedBy`,
        pb.`ApprovedAt`,
        pb.`CreatedAt`,
        pb.`UpdatedAt`
    FROM `payroll_bonuses` pb
    JOIN `Staffs` s ON s.`Id` = pb.`StaffId`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR pb.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR pb.`Status` = p_Status)
    ORDER BY pb.`Id` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollBonus_GetById`//
CREATE PROCEDURE `sp_PayrollBonus_GetById`
(
    IN p_Id INT
)
BEGIN
    SELECT 
        pb.`Id`,
        pb.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        pb.`BonusType`,
        pb.`Amount`,
        pb.`BonusMonth`,
        pb.`BonusYear`,
        pb.`Reason`,
        pb.`Status`,
        pb.`RequestedAt`,
        pb.`ApprovedBy`,
        pb.`ApprovedAt`,
        pb.`CreatedAt`,
        pb.`UpdatedAt`
    FROM `payroll_bonuses` pb
    JOIN `Staffs` s ON s.`Id` = pb.`StaffId`
    WHERE pb.`Id` = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollBonus_Approve`//
CREATE PROCEDURE `sp_PayrollBonus_Approve`
(
    IN p_BonusId INT,
    IN p_ApprovedBy INT
)
BEGIN
    UPDATE `payroll_bonuses`
    SET `Status` = 'Approved',
        `ApprovedBy` = p_ApprovedBy,
        `ApprovedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_BonusId AND `Status` = 'Pending';

    SELECT ROW_COUNT() AS Result;
END //

-- -----------------------------------------------------------------------------
-- 6. ADVANCES & LOANS PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_Create`//
CREATE PROCEDURE `sp_PayrollAdvance_Create`
(
    IN p_StaffId INT,
    IN p_AdvanceType VARCHAR(100),
    IN p_Amount DECIMAL(18,2),
    IN p_Reason VARCHAR(500),
    IN p_RepaymentMonths INT,
    IN p_StartMonth INT,
    IN p_StartYear INT
)
BEGIN
    DECLARE v_MonthlyDeduction DECIMAL(18,2);
    SET v_MonthlyDeduction = ROUND(p_Amount / IFNULL(NULLIF(p_RepaymentMonths, 0), 1), 2);

    INSERT INTO `payroll_advances` (
        `StaffId`, `AdvanceType`, `Amount`, `Reason`,
        `RepaymentMonths`, `MonthlyDeduction`, `StartMonth`, `StartYear`,
        `Status`, `RequestedAt`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_AdvanceType, p_Amount, p_Reason,
        p_RepaymentMonths, v_MonthlyDeduction, p_StartMonth, p_StartYear,
        'Pending', NOW(), NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetAll`//
CREATE PROCEDURE `sp_PayrollAdvance_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50)
)
BEGIN
    SELECT 
        pa.`Id`,
        pa.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        pa.`AdvanceType`,
        pa.`Amount`,
        pa.`Reason`,
        pa.`RepaymentMonths`,
        pa.`MonthlyDeduction`,
        pa.`StartMonth`,
        pa.`StartYear`,
        pa.`Status`,
        pa.`RequestedAt`,
        pa.`ApprovedBy`,
        pa.`ApprovedAt`,
        pa.`CreatedAt`,
        pa.`UpdatedAt`
    FROM `payroll_advances` pa
    JOIN `Staffs` s ON s.`Id` = pa.`StaffId`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR pa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR pa.`Status` = p_Status)
    ORDER BY pa.`Id` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetById`//
CREATE PROCEDURE `sp_PayrollAdvance_GetById`
(
    IN p_Id INT
)
BEGIN
    SELECT 
        pa.`Id`,
        pa.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        pa.`AdvanceType`,
        pa.`Amount`,
        pa.`Reason`,
        pa.`RepaymentMonths`,
        pa.`MonthlyDeduction`,
        pa.`StartMonth`,
        pa.`StartYear`,
        pa.`Status`,
        pa.`RequestedAt`,
        pa.`ApprovedBy`,
        pa.`ApprovedAt`,
        pa.`CreatedAt`,
        pa.`UpdatedAt`
    FROM `payroll_advances` pa
    JOIN `Staffs` s ON s.`Id` = pa.`StaffId`
    WHERE pa.`Id` = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_Approve`//
CREATE PROCEDURE `sp_PayrollAdvance_Approve`
(
    IN p_AdvanceId INT,
    IN p_ApprovedBy INT
)
BEGIN
    UPDATE `payroll_advances`
    SET `Status` = 'Approved',
        `ApprovedBy` = p_ApprovedBy,
        `ApprovedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_AdvanceId AND `Status` = 'Pending';

    SELECT ROW_COUNT() AS Result;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetBalance`//
CREATE PROCEDURE `sp_PayrollAdvance_GetBalance`
(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        pa.`Id` AS `AdvanceId`,
        pa.`StaffId`,
        pa.`AdvanceType`,
        pa.`Status`,
        pa.`Amount` AS `TotalAmount`,
        pa.`MonthlyDeduction`,
        pa.`RepaymentMonths`,
        IFNULL(SUM(par.`DeductionAmount`), 0.00) AS `PaidAmount`,
        pa.`Amount` AS `ScheduledAmount`,
        (pa.`Amount` - IFNULL(SUM(par.`DeductionAmount`), 0.00)) AS `RemainingBalance`
    FROM `payroll_advances` pa
    LEFT JOIN `payroll_advance_repayments` par ON par.`AdvanceId` = pa.`Id`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR pa.`StaffId` = p_StaffId)
      AND pa.`Status` IN ('Approved', 'Active')
    GROUP BY pa.`Id`, pa.`StaffId`, pa.`AdvanceType`, pa.`Status`, pa.`Amount`, pa.`MonthlyDeduction`, pa.`RepaymentMonths`
    ORDER BY pa.`Id` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetRepaymentHistory`//
CREATE PROCEDURE `sp_PayrollAdvance_GetRepaymentHistory`
(
    IN p_StaffId INT,
    IN p_AdvanceId INT
)
BEGIN
    SELECT 
        par.`RepaymentId`,
        par.`AdvanceId`,
        par.`PayslipId`,
        par.`StaffId`,
        par.`DeductionAmount`,
        par.`DeductionMonth`,
        par.`DeductionYear`,
        par.`RemainingBalance`,
        par.`CreatedAt`
    FROM `payroll_advance_repayments` par
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR par.`StaffId` = p_StaffId)
      AND (p_AdvanceId IS NULL OR p_AdvanceId = 0 OR par.`AdvanceId` = p_AdvanceId)
    ORDER BY par.`RepaymentId` DESC;
END //

-- -----------------------------------------------------------------------------
-- 7. PAYROLL SUMMARIES & ANALYTICS PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_Payroll_GetStaffSummary`//
CREATE PROCEDURE `sp_Payroll_GetStaffSummary`
(
    IN p_StaffId INT,
    IN p_PayrollYear INT
)
BEGIN
    SELECT 
        p_StaffId AS `StaffId`,
        p_PayrollYear AS `PayrollYear`,
        COUNT(pp.`PayslipId`) AS `TotalPayslips`,
        IFNULL(SUM(pp.`GrossSalary`), 0.00) AS `TotalGrossSalary`,
        IFNULL(SUM(pp.`TotalDeductions`), 0.00) AS `TotalDeductions`,
        0.00 AS `TotalAdvanceDeductions`,
        IFNULL(SUM(pp.`NetSalary`), 0.00) AS `TotalNetSalary`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'Paid' THEN 1 END) AS `PaidPayslips`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'Pending' OR pp.`PayslipStatus` = 'Generated' THEN 1 END) AS `PendingPayslips`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'On Hold' THEN 1 END) AS `OnHoldPayslips`
    FROM `payroll_payslips` pp
    WHERE pp.`StaffId` = p_StaffId AND pp.`PayrollYear` = p_PayrollYear;
END //

DROP PROCEDURE IF EXISTS `sp_Payroll_GetMonthlySummary`//
CREATE PROCEDURE `sp_Payroll_GetMonthlySummary`
(
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT
)
BEGIN
    SELECT 
        p_PayrollMonth AS `PayrollMonth`,
        p_PayrollYear AS `PayrollYear`,
        COUNT(pp.`PayslipId`) AS `TotalPayslips`,
        COUNT(DISTINCT pp.`StaffId`) AS `TotalEmployees`,
        IFNULL(SUM(pp.`GrossSalary`), 0.00) AS `TotalGrossSalary`,
        IFNULL(SUM(pp.`TotalDeductions`), 0.00) AS `TotalDeductions`,
        0.00 AS `TotalAdvanceDeductions`,
        IFNULL(SUM(pp.`NetSalary`), 0.00) AS `TotalNetSalary`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'Paid' THEN 1 END) AS `PaidPayslips`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'Pending' OR pp.`PayslipStatus` = 'Generated' THEN 1 END) AS `PendingPayslips`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'On Hold' THEN 1 END) AS `OnHoldPayslips`
    FROM `payroll_payslips` pp
    WHERE pp.`PayrollMonth` = p_PayrollMonth AND pp.`PayrollYear` = p_PayrollYear;
END //

DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetByPayslip`//
CREATE PROCEDURE `sp_PayrollAdvance_GetByPayslip`
(
    IN p_PayslipId INT
)
BEGIN
    SELECT 
        par.`RepaymentId`,
        par.`AdvanceId`,
        pa.`AdvanceType`,
        par.`DeductionAmount`,
        par.`RemainingBalance`
    FROM `payroll_advance_repayments` par
    JOIN `payroll_advances` pa ON pa.`Id` = par.`AdvanceId`
    WHERE par.`PayslipId` = p_PayslipId;
END //

DELIMITER ;

-- =============================================================================
-- END OF SCRIPT: 16_PayrollManagement_Complete_Schema_And_SPs.sql
-- =============================================================================
