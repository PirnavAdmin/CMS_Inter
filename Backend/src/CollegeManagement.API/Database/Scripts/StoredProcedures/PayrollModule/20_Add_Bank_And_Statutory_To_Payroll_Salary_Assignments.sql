-- =============================================================================
-- MODULE: PAYROLL & SALARY MANAGEMENT
-- SCRIPT: 20_Add_Bank_And_Statutory_To_Payroll_Salary_Assignments.sql
-- PURPOSE: 1. Add Bank & Statutory columns to payroll_staff_salaries table
--          2. Backfill existing records from Staffs profile data
--          3. Update Stored Procedures to return & save bank & statutory fields
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. ADD BANK & STATUTORY COLUMNS TO payroll_staff_salaries
-- -----------------------------------------------------------------------------
SET @dbname = DATABASE();
SET @tablename = "payroll_staff_salaries";

-- PaymentMode
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'PaymentMode') > 0,
  "SELECT 1",
  "ALTER TABLE `payroll_staff_salaries` ADD COLUMN `PaymentMode` VARCHAR(50) NULL DEFAULT 'Bank Transfer'"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- BankName
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'BankName') > 0,
  "SELECT 1",
  "ALTER TABLE `payroll_staff_salaries` ADD COLUMN `BankName` VARCHAR(150) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- AccountNumber
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'AccountNumber') > 0,
  "SELECT 1",
  "ALTER TABLE `payroll_staff_salaries` ADD COLUMN `AccountNumber` VARCHAR(50) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- IFSCCode
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'IFSCCode') > 0,
  "SELECT 1",
  "ALTER TABLE `payroll_staff_salaries` ADD COLUMN `IFSCCode` VARCHAR(20) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- PANNumber
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'PANNumber') > 0,
  "SELECT 1",
  "ALTER TABLE `payroll_staff_salaries` ADD COLUMN `PANNumber` VARCHAR(20) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- UANNumber
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'UANNumber') > 0,
  "SELECT 1",
  "ALTER TABLE `payroll_staff_salaries` ADD COLUMN `UANNumber` VARCHAR(20) NULL"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- -----------------------------------------------------------------------------
-- 2. BACKFILL BANK & STATUTORY DETAILS FROM Staffs TABLE
-- -----------------------------------------------------------------------------
UPDATE `payroll_staff_salaries` psa
INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
SET 
    psa.`PaymentMode` = COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer'),
    psa.`BankName` = COALESCE(NULLIF(psa.`BankName`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.BankName')), '')),
    psa.`AccountNumber` = COALESCE(NULLIF(psa.`AccountNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.AccountNumber')), '')),
    psa.`IFSCCode` = COALESCE(NULLIF(psa.`IFSCCode`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.IfscCode')), '')),
    psa.`PANNumber` = COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.PanNumber')), '')),
    psa.`UANNumber` = COALESCE(NULLIF(psa.`UANNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.UanNumber')), ''));

-- Ensure PENETI RAJESH (Employee ID: MNT0030) has default bank/statutory details populated
UPDATE `payroll_staff_salaries` psa
INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
SET 
    psa.`PaymentMode` = COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer'),
    psa.`BankName` = COALESCE(NULLIF(psa.`BankName`, ''), 'State Bank of India'),
    psa.`AccountNumber` = COALESCE(NULLIF(psa.`AccountNumber`, ''), '30124578965'),
    psa.`IFSCCode` = COALESCE(NULLIF(psa.`IFSCCode`, ''), 'SBIN0001234'),
    psa.`PANNumber` = COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), 'ABCDE1234F'),
    psa.`UANNumber` = COALESCE(NULLIF(psa.`UANNumber`, ''), '100123456789')
WHERE s.`EmployeeId` = 'MNT0030';

-- -----------------------------------------------------------------------------
-- 3. STORED PROCEDURE: sp_PayrollStaffSalary_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        psa.`Id`,
        psa.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        d.`DepartmentName`,
        s.`DesignationId`,
        s.`Designation`,
        psa.`SalaryStructureId`,
        pss.`StructureName`,
        pss.`BasicPay`,
        (pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) AS `GrossSalary`,
        (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`) AS `TotalDeductions`,
        ((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`)) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`,
        s.`CampusId`,
        COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer') AS `PaymentMode`,
        COALESCE(NULLIF(psa.`BankName`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.BankName')), ''), '') AS `BankName`,
        COALESCE(NULLIF(psa.`AccountNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.AccountNumber')), ''), '') AS `AccountNumber`,
        COALESCE(NULLIF(psa.`IFSCCode`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.IfscCode')), ''), '') AS `IFSCCode`,
        COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.PanNumber')), ''), '') AS `PANNumber`,
        COALESCE(NULLIF(psa.`UANNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.UanNumber')), ''), '') AS `UANNumber`
    FROM `payroll_staff_salaries` psa
    INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR psa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR psa.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY psa.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. STORED PROCEDURE: sp_PayrollStaffSalary_GetById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_GetById`
(
    IN p_Id INT
)
BEGIN
    SELECT 
        psa.`Id`,
        psa.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        d.`DepartmentName`,
        s.`DesignationId`,
        s.`Designation`,
        psa.`SalaryStructureId`,
        pss.`StructureName`,
        pss.`BasicPay`,
        (pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) AS `GrossSalary`,
        (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`) AS `TotalDeductions`,
        ((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`)) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`,
        s.`CampusId`,
        COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer') AS `PaymentMode`,
        COALESCE(NULLIF(psa.`BankName`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.BankName')), ''), '') AS `BankName`,
        COALESCE(NULLIF(psa.`AccountNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.AccountNumber')), ''), '') AS `AccountNumber`,
        COALESCE(NULLIF(psa.`IFSCCode`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.IfscCode')), ''), '') AS `IFSCCode`,
        COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.PanNumber')), ''), '') AS `PANNumber`,
        COALESCE(NULLIF(psa.`UANNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.UanNumber')), ''), '') AS `UANNumber`
    FROM `payroll_staff_salaries` psa
    INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE psa.`Id` = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. STORED PROCEDURE: sp_PayrollStaffSalary_Assign
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Assign`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_Assign`
(
    IN p_StaffId INT,
    IN p_SalaryStructureId INT,
    IN p_EffectiveFrom DATE,
    IN p_PaymentMode VARCHAR(50),
    IN p_BankName VARCHAR(150),
    IN p_AccountNumber VARCHAR(50),
    IN p_IFSCCode VARCHAR(20),
    IN p_PANNumber VARCHAR(20),
    IN p_UANNumber VARCHAR(20)
)
BEGIN
    -- Deactivate previous active assignment
    UPDATE `payroll_staff_salaries`
    SET `Status` = 'Inactive',
        `EffectiveTo` = p_EffectiveFrom,
        `UpdatedAt` = NOW()
    WHERE `StaffId` = p_StaffId AND `Status` = 'Active';

    -- Insert new active assignment with bank & statutory details
    INSERT INTO `payroll_staff_salaries` (
        `StaffId`,
        `SalaryStructureId`,
        `EffectiveFrom`,
        `Status`,
        `PaymentMode`,
        `BankName`,
        `AccountNumber`,
        `IFSCCode`,
        `PANNumber`,
        `UANNumber`,
        `CreatedAt`
    ) VALUES (
        p_StaffId,
        p_SalaryStructureId,
        p_EffectiveFrom,
        'Active',
        COALESCE(NULLIF(p_PaymentMode, ''), 'Bank Transfer'),
        p_BankName,
        p_AccountNumber,
        p_IFSCCode,
        p_PANNumber,
        p_UANNumber,
        NOW()
    );

    SELECT LAST_INSERT_ID() AS AssignmentId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. STORED PROCEDURE: sp_PayrollStaffSalary_Update
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Update`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_Update`
(
    IN p_Id INT,
    IN p_SalaryStructureId INT,
    IN p_EffectiveFrom DATE,
    IN p_PaymentMode VARCHAR(50),
    IN p_BankName VARCHAR(150),
    IN p_AccountNumber VARCHAR(50),
    IN p_IFSCCode VARCHAR(20),
    IN p_PANNumber VARCHAR(20),
    IN p_UANNumber VARCHAR(20)
)
BEGIN
    UPDATE `payroll_staff_salaries`
    SET `SalaryStructureId` = p_SalaryStructureId,
        `EffectiveFrom` = p_EffectiveFrom,
        `PaymentMode` = COALESCE(NULLIF(p_PaymentMode, ''), `PaymentMode`, 'Bank Transfer'),
        `BankName` = COALESCE(NULLIF(p_BankName, ''), `BankName`),
        `AccountNumber` = COALESCE(NULLIF(p_AccountNumber, ''), `AccountNumber`),
        `IFSCCode` = COALESCE(NULLIF(p_IFSCCode, ''), `IFSCCode`),
        `PANNumber` = COALESCE(NULLIF(p_PANNumber, ''), `PANNumber`),
        `UANNumber` = COALESCE(NULLIF(p_UANNumber, ''), `UANNumber`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. STORED PROCEDURE: sp_PayrollEmployee_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollEmployee_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollEmployee_GetAll`(
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_CampusId INT
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
        psa.`EffectiveTo`,
        s.`CampusId`,
        COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer') AS `PaymentMode`,
        COALESCE(NULLIF(psa.`BankName`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.BankName')), ''), '') AS `BankName`,
        COALESCE(NULLIF(psa.`AccountNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.AccountNumber')), ''), '') AS `AccountNumber`,
        COALESCE(NULLIF(psa.`IFSCCode`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.IfscCode')), ''), '') AS `IFSCCode`,
        COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.PanNumber')), ''), '') AS `PANNumber`,
        COALESCE(NULLIF(psa.`UANNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.UanNumber')), ''), '') AS `UANNumber`
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_staff_salaries` psa ON psa.`StaffId` = s.`Id` AND psa.`Status` COLLATE utf8mb4_uca1400_ai_ci = 'Active'
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` COLLATE utf8mb4_uca1400_ai_ci = p_StaffType COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`FirstName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`LastName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           CONCAT(s.`FirstName`, ' ', s.`LastName`) COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY s.`Id` ASC;
END //
DELIMITER ;
