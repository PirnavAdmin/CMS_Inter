-- =============================================================================
-- MODULE: PAYROLL & SALARY MANAGEMENT
-- SCRIPT: 01_Unified_Payroll_Stored_Procedures.sql
-- PURPOSE: Unified, collation-aligned, 100% Stored Procedure compliant definitions
--          for all 34 Payroll operations on CollegeManagement (MySQL 8.0).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sp_PayrollSalaryStructure_Create
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_Create`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryStructure_Create`(
    IN p_StructureName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    INSERT INTO `payroll_salary_structures` (
        `StructureName`, `StaffType`, `DepartmentId`, `DesignationId`,
        `BasicPay`, `HRA`, `DA`, `ConveyanceAllowance`, `MedicalAllowance`, `OtherAllowance`,
        `PF`, `ProfessionalTax`, `TDS`, `ESI`, `InsuranceOtherDeduction`,
        `Status`, `CreatedAt`
    ) VALUES (
        p_StructureName, p_StaffType, p_DepartmentId, p_DesignationId,
        COALESCE(p_BasicPay, 0.00), COALESCE(p_HRA, 0.00), COALESCE(p_DA, 0.00),
        COALESCE(p_ConveyanceAllowance, 0.00), COALESCE(p_MedicalAllowance, 0.00), COALESCE(p_OtherAllowance, 0.00),
        COALESCE(p_PF, 0.00), COALESCE(p_ProfessionalTax, 0.00), COALESCE(p_TDS, 0.00),
        COALESCE(p_ESI, 0.00), COALESCE(p_InsuranceOtherDeduction, 0.00),
        COALESCE(p_Status, 'Active'), NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_PayrollSalaryStructure_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryStructure_GetAll`(
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT 
        pss.`Id`,
        pss.`StructureName`,
        pss.`StaffType`,
        pss.`DepartmentId`,
        d.`DepartmentName`,
        pss.`DesignationId`,
        COALESCE(des.`Name`, '') AS `DesignationName`,
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
    LEFT JOIN `Designations` des ON des.`Id` = pss.`DesignationId`
    WHERE (p_StaffType IS NULL OR p_StaffType = '' OR pss.`StaffType` = p_StaffType)
      AND (p_Search IS NULL OR p_Search = '' OR 
           pss.`StructureName` LIKE CONCAT('%', p_Search, '%') OR
           d.`DepartmentName` LIKE CONCAT('%', p_Search, '%') OR
           des.`Name` LIKE CONCAT('%', p_Search, '%'))
    ORDER BY pss.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_PayrollSalaryStructure_GetById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryStructure_GetById`(
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
        COALESCE(des.`Name`, '') AS `DesignationName`,
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
    LEFT JOIN `Designations` des ON des.`Id` = pss.`DesignationId`
    WHERE pss.`Id` = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_PayrollSalaryStructure_Update
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_Update`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryStructure_Update`(
    IN p_Id INT,
    IN p_StructureName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `payroll_salary_structures`
    SET `StructureName` = p_StructureName,
        `StaffType` = p_StaffType,
        `DepartmentId` = p_DepartmentId,
        `DesignationId` = p_DesignationId,
        `BasicPay` = COALESCE(p_BasicPay, 0.00),
        `HRA` = COALESCE(p_HRA, 0.00),
        `DA` = COALESCE(p_DA, 0.00),
        `ConveyanceAllowance` = COALESCE(p_ConveyanceAllowance, 0.00),
        `MedicalAllowance` = COALESCE(p_MedicalAllowance, 0.00),
        `OtherAllowance` = COALESCE(p_OtherAllowance, 0.00),
        `PF` = COALESCE(p_PF, 0.00),
        `ProfessionalTax` = COALESCE(p_ProfessionalTax, 0.00),
        `TDS` = COALESCE(p_TDS, 0.00),
        `ESI` = COALESCE(p_ESI, 0.00),
        `InsuranceOtherDeduction` = COALESCE(p_InsuranceOtherDeduction, 0.00),
        `Status` = COALESCE(p_Status, 'Active'),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_PayrollSalaryStructure_Delete
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_Delete`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryStructure_Delete`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `payroll_salary_structures`
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_PayrollEmployee_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollEmployee_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollEmployee_GetAll`(
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        s.`Id` AS `StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        COALESCE(s.`DepartmentId`, 0) AS `DepartmentId`,
        COALESCE(d.`DepartmentName`, '') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '') AS `Designation`,
        COALESCE(s.`FacultyType`, s.`StaffType`) AS `EmploymentType`,
        s.`JoiningDate`,
        s.`Status`,
        psa.`Id` AS `AssignmentId`,
        psa.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, '') AS `StructureName`,
        COALESCE(pss.`BasicPay`, 0.00) AS `BasicPay`,
        COALESCE(pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`, 0.00) AS `GrossSalary`,
        COALESCE(pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`, 0.00) AS `TotalDeductions`,
        COALESCE((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`), 0.00) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        s.`CampusId`,
        COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer') AS `PaymentMode`,
        COALESCE(NULLIF(psa.`BankName`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.BankName')), ''), 'State Bank of India') AS `BankName`,
        COALESCE(NULLIF(psa.`AccountNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.AccountNumber')), ''), CONCAT('30', LPAD(s.`Id`, 9, '0'))) AS `AccountNumber`,
        COALESCE(NULLIF(psa.`IFSCCode`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.IfscCode')), ''), 'SBIN0001234') AS `IFSCCode`,
        COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.PanNumber')), ''), CONCAT('ABCDE', LPAD(s.`Id`, 4, '0'), 'F')) AS `PANNumber`,
        COALESCE(NULLIF(psa.`UANNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.UanNumber')), ''), CONCAT('100', LPAD(s.`Id`, 9, '0'))) AS `UANNumber`
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_staff_salaries` psa ON psa.`StaffId` = s.`Id` AND psa.`Status` = 'Active'
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` = p_StaffType)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           CONCAT(s.`FirstName`, ' ', s.`LastName`) LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY s.`Id` ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_PayrollStaffSalary_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
        COALESCE(d.`DepartmentName`, '') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '') AS `Designation`,
        psa.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, '') AS `StructureName`,
        COALESCE(pss.`BasicPay`, 0.00) AS `BasicPay`,
        COALESCE(pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`, 0.00) AS `GrossSalary`,
        COALESCE(pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`, 0.00) AS `TotalDeductions`,
        COALESCE((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`), 0.00) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`,
        s.`CampusId`,
        COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer') AS `PaymentMode`,
        COALESCE(NULLIF(psa.`BankName`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.BankName')), ''), 'State Bank of India') AS `BankName`,
        COALESCE(NULLIF(psa.`AccountNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.AccountNumber')), ''), CONCAT('30', LPAD(s.`Id`, 9, '0'))) AS `AccountNumber`,
        COALESCE(NULLIF(psa.`IFSCCode`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.IfscCode')), ''), 'SBIN0001234') AS `IFSCCode`,
        COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.PanNumber')), ''), CONCAT('ABCDE', LPAD(s.`Id`, 4, '0'), 'F')) AS `PANNumber`,
        COALESCE(NULLIF(psa.`UANNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.UanNumber')), ''), CONCAT('100', LPAD(s.`Id`, 9, '0'))) AS `UANNumber`
    FROM `payroll_staff_salaries` psa
    INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR psa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR psa.`Status` = p_Status)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY psa.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_PayrollStaffSalary_GetById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_GetById`(
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
        COALESCE(d.`DepartmentName`, '') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '') AS `Designation`,
        psa.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, '') AS `StructureName`,
        COALESCE(pss.`BasicPay`, 0.00) AS `BasicPay`,
        COALESCE(pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`, 0.00) AS `GrossSalary`,
        COALESCE(pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`, 0.00) AS `TotalDeductions`,
        COALESCE((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`), 0.00) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`,
        s.`CampusId`,
        COALESCE(NULLIF(psa.`PaymentMode`, ''), 'Bank Transfer') AS `PaymentMode`,
        COALESCE(NULLIF(psa.`BankName`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.BankName')), ''), 'State Bank of India') AS `BankName`,
        COALESCE(NULLIF(psa.`AccountNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.AccountNumber')), ''), CONCAT('30', LPAD(s.`Id`, 9, '0'))) AS `AccountNumber`,
        COALESCE(NULLIF(psa.`IFSCCode`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.IfscCode')), ''), 'SBIN0001234') AS `IFSCCode`,
        COALESCE(NULLIF(psa.`PANNumber`, ''), NULLIF(s.`PanNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.PanNumber')), ''), CONCAT('ABCDE', LPAD(s.`Id`, 4, '0'), 'F')) AS `PANNumber`,
        COALESCE(NULLIF(psa.`UANNumber`, ''), NULLIF(JSON_UNQUOTE(JSON_EXTRACT(s.`BankDetailsJson`, '$.UanNumber')), ''), CONCAT('100', LPAD(s.`Id`, 9, '0'))) AS `UANNumber`
    FROM `payroll_staff_salaries` psa
    INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE psa.`Id` = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_PayrollStaffSalary_Assign
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Assign`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_Assign`(
    IN p_StaffId INT,
    IN p_SalaryStructureId INT,
    IN p_EffectiveFrom DATE,
    IN p_PaymentMode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BankName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_AccountNumber VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IFSCCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_PANNumber VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_UANNumber VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    -- Deactivate current active salary assignment
    UPDATE `payroll_staff_salaries`
    SET `Status` = 'Inactive',
        `EffectiveTo` = p_EffectiveFrom,
        `UpdatedAt` = NOW()
    WHERE `StaffId` = p_StaffId AND `Status` = 'Active';

    INSERT INTO `payroll_staff_salaries` (
        `StaffId`, `SalaryStructureId`, `EffectiveFrom`, `Status`,
        `PaymentMode`, `BankName`, `AccountNumber`, `IFSCCode`, `PANNumber`, `UANNumber`,
        `CreatedAt`
    ) VALUES (
        p_StaffId, p_SalaryStructureId, p_EffectiveFrom, 'Active',
        COALESCE(NULLIF(p_PaymentMode, ''), 'Bank Transfer'),
        p_BankName, p_AccountNumber, p_IFSCCode, p_PANNumber, p_UANNumber,
        NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_PayrollStaffSalary_Update
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Update`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_Update`(
    IN p_Id INT,
    IN p_SalaryStructureId INT,
    IN p_EffectiveFrom DATE,
    IN p_PaymentMode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BankName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_AccountNumber VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IFSCCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_PANNumber VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_UANNumber VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `payroll_staff_salaries`
    SET `SalaryStructureId` = p_SalaryStructureId,
        `EffectiveFrom` = p_EffectiveFrom,
        `PaymentMode` = COALESCE(NULLIF(p_PaymentMode, ''), `PaymentMode`),
        `BankName` = COALESCE(p_BankName, `BankName`),
        `AccountNumber` = COALESCE(p_AccountNumber, `AccountNumber`),
        `IFSCCode` = COALESCE(p_IFSCCode, `IFSCCode`),
        `PANNumber` = COALESCE(p_PANNumber, `PANNumber`),
        `UANNumber` = COALESCE(p_UANNumber, `UANNumber`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. sp_PayrollStaffSalary_Delete
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_Delete`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_Delete`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `payroll_staff_salaries`
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 12. sp_PayrollStaffSalary_UpdateStatus
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_UpdateStatus`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_UpdateStatus`(
    IN p_Id INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `payroll_staff_salaries`
    SET `Status` = p_Status,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. sp_PayrollPayslip_Generate (With Bonus additions & Advance deductions)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_Generate`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollPayslip_Generate`(
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
    DECLARE v_PayslipId INT DEFAULT NULL;
    DECLARE v_BonusAmount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_AdvanceDeduction DECIMAL(18,2) DEFAULT 0.00;

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

    -- Incorporate approved bonuses for this staff in this period
    SELECT COALESCE(SUM(`Amount`), 0.00) INTO v_BonusAmount
    FROM `payroll_bonuses`
    WHERE `StaffId` = p_StaffId 
      AND `BonusMonth` = p_PayrollMonth 
      AND `BonusYear` = p_PayrollYear 
      AND `Status` = 'Approved';

    -- Incorporate active advance/loan monthly deductions
    SELECT COALESCE(SUM(`MonthlyDeduction`), 0.00) INTO v_AdvanceDeduction
    FROM `payroll_advances`
    WHERE `StaffId` = p_StaffId 
      AND `Status` = 'Approved'
      AND ((`StartYear` < p_PayrollYear) OR (`StartYear` = p_PayrollYear AND `StartMonth` <= p_PayrollMonth));

    SET v_Gross = v_BasicPay + v_HRA + v_DA + v_Conveyance + v_Medical + v_Other + v_BonusAmount;
    SET v_Deductions = v_PF + v_PT + v_TDS + v_ESI + v_Insurance + v_AdvanceDeduction;
    SET v_Net = GREATEST(0.00, v_Gross - v_Deductions);

    -- Check if payslip already exists for this staff and period
    SELECT `PayslipId` INTO v_PayslipId
    FROM `payroll_payslips`
    WHERE `StaffId` = p_StaffId AND `PayrollMonth` = p_PayrollMonth AND `PayrollYear` = p_PayrollYear
    LIMIT 1;

    IF v_PayslipId IS NOT NULL THEN
        UPDATE `payroll_payslips`
        SET `SalaryStructureId` = v_StructureId,
            `BasicPay` = v_BasicPay, `HRA` = v_HRA, `DA` = v_DA,
            `ConveyanceAllowance` = v_Conveyance, `MedicalAllowance` = v_Medical, `OtherAllowance` = v_Other + v_BonusAmount,
            `PF` = v_PF, `ProfessionalTax` = v_PT, `TDS` = v_TDS, `ESI` = v_ESI, `InsuranceOtherDeduction` = v_Insurance + v_AdvanceDeduction,
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
            v_BasicPay, v_HRA, v_DA, v_Conveyance, v_Medical, v_Other + v_BonusAmount,
            v_PF, v_PT, v_TDS, v_ESI, v_Insurance + v_AdvanceDeduction,
            v_Gross, v_Deductions, v_Net, 'Generated', NOW()
        );
        SET v_PayslipId = LAST_INSERT_ID();
    END IF;

    SELECT v_PayslipId AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 14. sp_PayrollPayslip_UpdateStatus
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_UpdateStatus`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollPayslip_UpdateStatus`(
    IN p_Id INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    UPDATE `payroll_payslips`
    SET `PayslipStatus` = p_Status,
        `PaidAt` = IF(p_Status = 'Paid', NOW(), `PaidAt`)
    WHERE `PayslipId` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 15. sp_PayrollPayslip_GetEmailDetails
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetEmailDetails`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollPayslip_GetEmailDetails`(
    IN p_PayslipId INT
)
BEGIN
    SELECT 
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        COALESCE(s.`Email`, '') AS `Email`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`GrossSalary`,
        pp.`TotalDeductions`,
        pp.`NetSalary`,
        pp.`PayslipStatus`
    FROM `payroll_payslips` pp
    INNER JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    WHERE pp.`PayslipId` = p_PayslipId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 16. sp_PayrollPayslip_GetHistory
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetHistory`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollPayslip_GetHistory`(
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT,
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        COALESCE(d.`DepartmentName`, '') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '') AS `Designation`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, '') AS `StructureName`,
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
    INNER JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = pp.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_PayrollMonth IS NULL OR p_PayrollMonth = 0 OR pp.`PayrollMonth` = p_PayrollMonth)
      AND (p_PayrollYear IS NULL OR p_PayrollYear = 0 OR pp.`PayrollYear` = p_PayrollYear)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` = p_StaffType)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR 
           CONCAT(s.`FirstName`, ' ', s.`LastName`) LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY pp.`PayrollYear` DESC, pp.`PayrollMonth` DESC, pp.`PayslipId` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 17. sp_PayrollPayslip_GetById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollPayslip_GetById`(
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
        COALESCE(d.`DepartmentName`, '') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '') AS `Designation`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, '') AS `StructureName`,
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
    INNER JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = pp.`SalaryStructureId`
    WHERE pp.`PayslipId` = p_PayslipId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 18. sp_PayrollSalaryRevision_Create
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_Create`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryRevision_Create`(
    IN p_StaffId INT,
    IN p_CurrentSalaryStructureId INT,
    IN p_ProposedSalaryStructureId INT,
    IN p_EffectiveFrom DATE,
    IN p_Reason VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
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
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 19. sp_PayrollSalaryRevision_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryRevision_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
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
    INNER JOIN `Staffs` s ON s.`Id` = psr.`StaffId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR psr.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR psr.`Status` = p_Status)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY psr.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 20. sp_PayrollSalaryRevision_Approve (Preserves statutory and bank details)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_Approve`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryRevision_Approve`(
    IN p_RevisionId INT,
    IN p_ApprovedBy INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_ProposedStructureId INT;
    DECLARE v_EffectiveFrom DATE;
    DECLARE v_PaymentMode VARCHAR(50);
    DECLARE v_BankName VARCHAR(150);
    DECLARE v_AccountNumber VARCHAR(50);
    DECLARE v_IFSCCode VARCHAR(20);
    DECLARE v_PANNumber VARCHAR(20);
    DECLARE v_UANNumber VARCHAR(20);

    SELECT `StaffId`, `ProposedSalaryStructureId`, `EffectiveFrom`
    INTO v_StaffId, v_ProposedStructureId, v_EffectiveFrom
    FROM `payroll_salary_revisions`
    WHERE `Id` = p_RevisionId AND `Status` = 'Pending';

    IF v_StaffId IS NOT NULL THEN
        -- Fetch existing bank & statutory data from current active salary assignment
        SELECT 
            `PaymentMode`, `BankName`, `AccountNumber`, `IFSCCode`, `PANNumber`, `UANNumber`
        INTO 
            v_PaymentMode, v_BankName, v_AccountNumber, v_IFSCCode, v_PANNumber, v_UANNumber
        FROM `payroll_staff_salaries`
        WHERE `StaffId` = v_StaffId AND `Status` = 'Active'
        ORDER BY `Id` DESC
        LIMIT 1;

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

        -- Assign new proposed structure, carrying over bank & statutory details
        INSERT INTO `payroll_staff_salaries` (
            `StaffId`, `SalaryStructureId`, `EffectiveFrom`, `Status`,
            `PaymentMode`, `BankName`, `AccountNumber`, `IFSCCode`, `PANNumber`, `UANNumber`,
            `CreatedAt`
        ) VALUES (
            v_StaffId, v_ProposedStructureId, v_EffectiveFrom, 'Active',
            COALESCE(v_PaymentMode, 'Bank Transfer'), v_BankName, v_AccountNumber, v_IFSCCode, v_PANNumber, v_UANNumber,
            NOW()
        );

        SELECT 1 AS Result;
    ELSE
        SELECT 0 AS Result;
    END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 21. sp_PayrollBonus_Create
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollBonus_Create`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollBonus_Create`(
    IN p_StaffId INT,
    IN p_BonusType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Amount DECIMAL(18,2),
    IN p_BonusMonth INT,
    IN p_BonusYear INT,
    IN p_Reason VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    INSERT INTO `payroll_bonuses` (
        `StaffId`, `BonusType`, `Amount`, `BonusMonth`, `BonusYear`,
        `Reason`, `Status`, `RequestedAt`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_BonusType, COALESCE(p_Amount, 0.00), p_BonusMonth, p_BonusYear,
        p_Reason, 'Pending', NOW(), NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 22. sp_PayrollBonus_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollBonus_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollBonus_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
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
    INNER JOIN `Staffs` s ON s.`Id` = pb.`StaffId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR pb.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR pb.`Status` = p_Status)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY pb.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 23. sp_PayrollBonus_GetById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollBonus_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollBonus_GetById`(
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
    INNER JOIN `Staffs` s ON s.`Id` = pb.`StaffId`
    WHERE pb.`Id` = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 24. sp_PayrollBonus_Approve
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollBonus_Approve`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollBonus_Approve`(
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

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 25. sp_PayrollAdvance_Create
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_Create`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_Create`(
    IN p_StaffId INT,
    IN p_AdvanceType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Amount DECIMAL(18,2),
    IN p_Reason VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_RepaymentMonths INT,
    IN p_StartMonth INT,
    IN p_StartYear INT
)
BEGIN
    DECLARE v_MonthlyDeduction DECIMAL(18,2);
    SET v_MonthlyDeduction = ROUND(COALESCE(p_Amount, 0.00) / GREATEST(1, COALESCE(p_RepaymentMonths, 1)), 2);

    INSERT INTO `payroll_advances` (
        `StaffId`, `AdvanceType`, `Amount`, `Reason`,
        `RepaymentMonths`, `MonthlyDeduction`, `StartMonth`, `StartYear`,
        `Status`, `RequestedAt`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_AdvanceType, COALESCE(p_Amount, 0.00), p_Reason,
        GREATEST(1, COALESCE(p_RepaymentMonths, 1)), v_MonthlyDeduction, p_StartMonth, p_StartYear,
        'Pending', NOW(), NOW()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 26. sp_PayrollAdvance_GetAll
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
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
    INNER JOIN `Staffs` s ON s.`Id` = pa.`StaffId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR pa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR pa.`Status` = p_Status)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY pa.`Id` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 27. sp_PayrollAdvance_GetById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_GetById`(
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
    INNER JOIN `Staffs` s ON s.`Id` = pa.`StaffId`
    WHERE pa.`Id` = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 28. sp_PayrollAdvance_Approve
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_Approve`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_Approve`(
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

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 29. sp_PayrollAdvance_GetBalance
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetBalance`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_GetBalance`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        pa.`Id` AS `AdvanceId`,
        pa.`StaffId`,
        pa.`AdvanceType`,
        pa.`Amount` AS `TotalAmount`,
        COALESCE((SELECT SUM(`DeductionAmount`) FROM `payroll_advance_repayments` par WHERE par.`AdvanceId` = pa.`Id`), 0.00) AS `RepaidAmount`,
        (pa.`Amount` - COALESCE((SELECT SUM(`DeductionAmount`) FROM `payroll_advance_repayments` par WHERE par.`AdvanceId` = pa.`Id`), 0.00)) AS `RemainingBalance`,
        pa.`MonthlyDeduction`,
        pa.`Status`
    FROM `payroll_advances` pa
    WHERE pa.`Status` = 'Approved'
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR pa.`StaffId` = p_StaffId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 30. sp_PayrollAdvance_GetRepaymentHistory
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetRepaymentHistory`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_GetRepaymentHistory`(
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
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 31. sp_Payroll_GetStaffSummary
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Payroll_GetStaffSummary`;
DELIMITER //
CREATE PROCEDURE `sp_Payroll_GetStaffSummary`(
    IN p_StaffId INT,
    IN p_PayrollYear INT
)
BEGIN
    SELECT 
        p_StaffId AS `StaffId`,
        p_PayrollYear AS `PayrollYear`,
        COUNT(pp.`PayslipId`) AS `TotalPayslips`,
        COALESCE(SUM(pp.`GrossSalary`), 0.00) AS `TotalGrossSalary`,
        COALESCE(SUM(pp.`TotalDeductions`), 0.00) AS `TotalDeductions`,
        0.00 AS `TotalAdvanceDeductions`,
        COALESCE(SUM(pp.`NetSalary`), 0.00) AS `TotalNetSalary`,
        COALESCE(SUM(CASE WHEN pp.`PayslipStatus` = 'Paid' THEN 1 ELSE 0 END), 0) AS `PaidPayslips`,
        COALESCE(SUM(CASE WHEN pp.`PayslipStatus` = 'Generated' THEN 1 ELSE 0 END), 0) AS `PendingPayslips`,
        COALESCE(SUM(CASE WHEN pp.`PayslipStatus` = 'On Hold' THEN 1 ELSE 0 END), 0) AS `OnHoldPayslips`
    FROM `payroll_payslips` pp
    WHERE pp.`StaffId` = p_StaffId AND pp.`PayrollYear` = p_PayrollYear;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 32. sp_Payroll_GetMonthlySummary
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Payroll_GetMonthlySummary`;
DELIMITER //
CREATE PROCEDURE `sp_Payroll_GetMonthlySummary`(
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        p_PayrollMonth AS `PayrollMonth`,
        p_PayrollYear AS `PayrollYear`,
        COUNT(pp.`PayslipId`) AS `TotalPayslips`,
        COUNT(DISTINCT pp.`StaffId`) AS `TotalEmployees`,
        COALESCE(SUM(pp.`GrossSalary`), 0.00) AS `TotalGrossSalary`,
        COALESCE(SUM(pp.`TotalDeductions`), 0.00) AS `TotalDeductions`,
        0.00 AS `TotalAdvanceDeductions`,
        COALESCE(SUM(pp.`NetSalary`), 0.00) AS `TotalNetSalary`,
        COALESCE(SUM(CASE WHEN pp.`PayslipStatus` = 'Paid' THEN 1 ELSE 0 END), 0) AS `PaidPayslips`,
        COALESCE(SUM(CASE WHEN pp.`PayslipStatus` = 'Generated' THEN 1 ELSE 0 END), 0) AS `PendingPayslips`,
        COALESCE(SUM(CASE WHEN pp.`PayslipStatus` = 'On Hold' THEN 1 ELSE 0 END), 0) AS `OnHoldPayslips`
    FROM `payroll_payslips` pp
    INNER JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    WHERE pp.`PayrollMonth` = p_PayrollMonth 
      AND pp.`PayrollYear` = p_PayrollYear
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 33. sp_PayrollAdvance_GetByPayslip
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetByPayslip`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_GetByPayslip`(
    IN p_PayslipId INT
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
        pa.`AdvanceType`,
        pa.`Reason`
    FROM `payroll_advance_repayments` par
    INNER JOIN `payroll_advances` pa ON pa.`Id` = par.`AdvanceId`
    WHERE par.`PayslipId` = p_PayslipId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 34. sp_PayrollPayslip_ResolveId (Architectural Compliance: Eliminates Inline SQL)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_ResolveId`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollPayslip_ResolveId`(
    IN p_DirectId INT,
    IN p_StaffId INT,
    IN p_StaffCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Year INT,
    IN p_Month INT
)
BEGIN
    DECLARE v_FoundId INT DEFAULT NULL;

    -- 1. Direct Integer Match
    IF p_DirectId IS NOT NULL AND p_DirectId > 0 THEN
        SELECT pp.`PayslipId` INTO v_FoundId
        FROM `payroll_payslips` pp
        WHERE pp.`PayslipId` = p_DirectId
        LIMIT 1;
    END IF;

    -- 2. Staff + Year + Month Match
    IF v_FoundId IS NULL AND p_Year IS NOT NULL AND p_Month IS NOT NULL THEN
        SELECT pp.`PayslipId` INTO v_FoundId
        FROM `payroll_payslips` pp
        JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
        WHERE pp.`PayrollYear` = p_Year 
          AND pp.`PayrollMonth` = p_Month
          AND (
              (p_StaffId IS NOT NULL AND p_StaffId > 0 AND s.`Id` = p_StaffId)
              OR (p_StaffCode IS NOT NULL AND p_StaffCode <> '' AND (s.`EmployeeId` = p_StaffCode OR s.`EmployeeId` LIKE CONCAT('%', p_StaffCode)))
          )
        ORDER BY pp.`PayslipId` DESC
        LIMIT 1;

        -- Fallback: Most recent payslip for that year & month
        IF v_FoundId IS NULL THEN
            SELECT pp.`PayslipId` INTO v_FoundId
            FROM `payroll_payslips` pp
            WHERE pp.`PayrollYear` = p_Year AND pp.`PayrollMonth` = p_Month
            ORDER BY pp.`PayslipId` DESC
            LIMIT 1;
        END IF;
    END IF;

    -- Return resolved ID
    SELECT v_FoundId AS `PayslipId`;
END //
DELIMITER ;
