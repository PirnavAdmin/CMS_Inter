-- =============================================================================
-- MODULE: PAYROLL & SALARY MANAGEMENT
-- SCRIPT: 19_Add_Campus_Filtering_To_Payroll_SPs.sql
-- PURPOSE: Add campus isolation/filtering (p_CampusId INT) to all Payroll stored procedures:
--          1. sp_PayrollEmployee_GetAll
--          2. sp_PayrollStaffSalary_GetAll
--          3. sp_PayrollPayslip_GetHistory
--          4. sp_PayrollSalaryRevision_GetAll
--          5. sp_PayrollBonus_GetAll
--          6. sp_PayrollAdvance_GetAll
--          7. sp_Payroll_GetMonthlySummary
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- 1. sp_PayrollEmployee_GetAll
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
        s.`CampusId`
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

-- 2. sp_PayrollStaffSalary_GetAll
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
        s.`CampusId`
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

-- 3. sp_PayrollPayslip_GetHistory
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetHistory`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollPayslip_GetHistory`(
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT,
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
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
        pp.`GeneratedAt`,
        s.`CampusId`
    FROM `payroll_payslips` pp
    JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = pp.`SalaryStructureId`
    WHERE (p_PayrollMonth IS NULL OR p_PayrollMonth = 0 OR pp.`PayrollMonth` = p_PayrollMonth)
      AND (p_PayrollYear IS NULL OR p_PayrollYear = 0 OR pp.`PayrollYear` = p_PayrollYear)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` COLLATE utf8mb4_uca1400_ai_ci = p_StaffType COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_Search IS NULL OR p_Search = '' OR 
           s.`EmployeeId` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`FirstName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           s.`LastName` COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci OR 
           CONCAT(s.`FirstName`, ' ', s.`LastName`) COLLATE utf8mb4_uca1400_ai_ci LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY pp.`PayslipId` DESC;
END //
DELIMITER ;

-- 4. sp_PayrollSalaryRevision_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollSalaryRevision_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollSalaryRevision_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
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
        psr.`UpdatedAt`,
        s.`CampusId`
    FROM `payroll_salary_revisions` psr
    JOIN `Staffs` s ON s.`Id` = psr.`StaffId`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR psr.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR psr.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY psr.`Id` DESC;
END //
DELIMITER ;

-- 5. sp_PayrollBonus_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollBonus_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollBonus_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
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
        pb.`UpdatedAt`,
        s.`CampusId`
    FROM `payroll_bonuses` pb
    JOIN `Staffs` s ON s.`Id` = pb.`StaffId`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR pb.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR pb.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY pb.`Id` DESC;
END //
DELIMITER ;

-- 6. sp_PayrollAdvance_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollAdvance_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollAdvance_GetAll`(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
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
        pa.`UpdatedAt`,
        s.`CampusId`
    FROM `payroll_advances` pa
    JOIN `Staffs` s ON s.`Id` = pa.`StaffId`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR pa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR pa.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
    ORDER BY pa.`Id` DESC;
END //
DELIMITER ;

-- 7. sp_Payroll_GetMonthlySummary
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
        IFNULL(SUM(pp.`GrossSalary`), 0.00) AS `TotalGrossSalary`,
        IFNULL(SUM(pp.`TotalDeductions`), 0.00) AS `TotalDeductions`,
        0.00 AS `TotalAdvanceDeductions`,
        IFNULL(SUM(pp.`NetSalary`), 0.00) AS `TotalNetSalary`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'Paid' THEN 1 END) AS `PaidPayslips`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'Pending' OR pp.`PayslipStatus` = 'Generated' THEN 1 END) AS `PendingPayslips`,
        COUNT(CASE WHEN pp.`PayslipStatus` = 'On Hold' THEN 1 END) AS `OnHoldPayslips`
    FROM `payroll_payslips` pp
    JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    WHERE pp.`PayrollMonth` = p_PayrollMonth 
      AND pp.`PayrollYear` = p_PayrollYear
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId);
END //
DELIMITER ;
