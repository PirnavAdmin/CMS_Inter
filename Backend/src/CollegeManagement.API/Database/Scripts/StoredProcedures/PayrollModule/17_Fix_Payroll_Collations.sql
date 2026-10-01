-- =============================================================================
-- MODULE: PAYROLL & SALARY MANAGEMENT - COLLATION COMPATIBILITY FIX
-- SCRIPT: 17_Fix_Payroll_Collations.sql
-- PURPOSE: Resolves "Illegal mix of collations (utf8mb4_0900_ai_ci) and (utf8mb4_uca1400_ai_ci)"
-- DATABASE: u819242402_CLM_System (MariaDB 11.x on Hostinger)
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- STEP 1: CONVERT ALL 7 PAYROLL TABLES TO utf8mb4_uca1400_ai_ci
-- -----------------------------------------------------------------------------
ALTER TABLE `payroll_salary_structures` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE `payroll_staff_salaries` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE `payroll_payslips` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE `payroll_salary_revisions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE `payroll_bonuses` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE `payroll_advances` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE `payroll_advance_repayments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

DELIMITER //

-- -----------------------------------------------------------------------------
-- STEP 2: RE-CREATE STORED PROCEDURES WITH COLLATION-SAFE PARAMETERS & CHECKS
-- -----------------------------------------------------------------------------

-- 1. sp_PayrollSalaryStructure_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryStructure_GetAll`//
CREATE PROCEDURE `sp_PayrollSalaryStructure_GetAll`
(
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
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
        (SELECT COUNT(*) FROM `payroll_staff_salaries` psa WHERE psa.`SalaryStructureId` = pss.`Id` AND psa.`Status` COLLATE utf8mb4_uca1400_ai_ci = 'Active') AS `AssignedStaff`,
        pss.`Status`
    FROM `payroll_salary_structures` pss
    LEFT JOIN `Departments` d ON d.`DepartmentId` = pss.`DepartmentId`
    LEFT JOIN `Designations` des ON (des.`Id` = pss.`DesignationId`)
    WHERE (p_StaffType IS NULL OR p_StaffType = '' OR pss.`StaffType` COLLATE utf8mb4_uca1400_ai_ci = p_StaffType COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_Search IS NULL OR p_Search = '' OR pss.`StructureName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY pss.`Id` DESC;
END //

-- 2. sp_PayrollEmployee_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollEmployee_GetAll`//
CREATE PROCEDURE `sp_PayrollEmployee_GetAll`
(
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
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
    LEFT JOIN `payroll_staff_salaries` psa ON psa.`StaffId` = s.`Id` AND psa.`Status` COLLATE utf8mb4_uca1400_ai_ci = 'Active'
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` COLLATE utf8mb4_uca1400_ai_ci = p_StaffType COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`FirstName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`LastName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR
           CONCAT(s.`FirstName`, ' ', s.`LastName`) COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY s.`Id` ASC;
END //

-- 3. sp_PayrollStaffSalary_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetAll`//
CREATE PROCEDURE `sp_PayrollStaffSalary_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
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
      AND (p_Status IS NULL OR p_Status = '' OR `Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY `Id` DESC;
END //

-- 4. sp_PayrollStaffSalary_UpdateStatus
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_UpdateStatus`//
CREATE PROCEDURE `sp_PayrollStaffSalary_UpdateStatus`
(
    IN p_Id INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    UPDATE `payroll_staff_salaries`
    SET `Status` = p_Status,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 5. sp_PayrollPayslip_GetHistory
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetHistory`//
CREATE PROCEDURE `sp_PayrollPayslip_GetHistory`
(
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT,
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
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
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` COLLATE utf8mb4_uca1400_ai_ci = p_StaffType COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`FirstName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`LastName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR
           CONCAT(s.`FirstName`, ' ', s.`LastName`) COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY pp.`PayslipId` DESC;
END //

-- 6. sp_PayrollPayslip_UpdateStatus
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_UpdateStatus`//
CREATE PROCEDURE `sp_PayrollPayslip_UpdateStatus`
(
    IN p_PayslipId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    UPDATE `payroll_payslips`
    SET `PayslipStatus` = p_Status,
        `UpdatedAt` = NOW()
    WHERE `PayslipId` = p_PayslipId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 7. sp_PayrollSalaryRevision_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_GetAll`//
CREATE PROCEDURE `sp_PayrollSalaryRevision_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
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
      AND (p_Status IS NULL OR p_Status = '' OR psr.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY psr.`Id` DESC;
END //

-- 8. sp_PayrollBonus_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollBonus_GetAll`//
CREATE PROCEDURE `sp_PayrollBonus_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
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
      AND (p_Status IS NULL OR p_Status = '' OR pb.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY pb.`Id` DESC;
END //

-- 9. sp_PayrollAdvance_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetAll`//
CREATE PROCEDURE `sp_PayrollAdvance_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
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
      AND (p_Status IS NULL OR p_Status = '' OR pa.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY pa.`Id` DESC;
END //

DELIMITER ;

-- =============================================================================
-- END OF SCRIPT: 17_Fix_Payroll_Collations.sql
-- =============================================================================
